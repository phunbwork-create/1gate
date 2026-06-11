import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import prisma from "@/lib/prisma"
import { authConfig } from "@/lib/auth.config"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = credentials.email as string
        const password = credentials.password as string

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            company: { select: { id: true, name: true, code: true, type: true } },
            department: { select: { id: true, name: true } },
            // Dynamic RBAC: load user's roles and their permissions
            userRoles: {
              where: { role: { isActive: true } },
              include: {
                role: {
                  include: {
                    permissions: {
                      include: {
                        permission: {
                          select: { resource: true, action: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        })

        if (!user || !user.isActive) {
          return null
        }

        const isPasswordValid = await compare(password, user.passwordHash)
        if (!isPasswordValid) {
          return null
        }

        // Build dynamic roles & permissions from UserRole → Role → Permission
        const roles = user.userRoles.map(ur => ({
          id: ur.role.id,
          name: ur.role.name,
          displayName: ur.role.displayName,
          color: ur.role.color,
          level: ur.role.level,
          isSystem: ur.role.isSystem,
        }))

        // Sort by level desc to get primary role
        const sortedRoles = [...roles].sort((a, b) => b.level - a.level)
        const primaryRole = sortedRoles[0] || { name: "Staff", displayName: "Nhân viên", level: 0 }

        // Flatten permissions: unique set of "resource.action" strings
        const permissionSet = new Set<string>()
        for (const ur of user.userRoles) {
          for (const rp of ur.role.permissions) {
            permissionSet.add(`${rp.permission.resource}.${rp.permission.action}`)
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          // Dynamic RBAC fields
          roles: roles.map(r => r.name),
          rolesData: roles,
          permissions: Array.from(permissionSet),
          primaryRole: primaryRole.name,
          primaryRoleDisplay: primaryRole.displayName,
          primaryRoleColor: primaryRole.color || undefined,
          // Company/department info
          companyId: user.companyId,
          companyName: user.company.name,
          companyCode: user.company.code,
          companyType: user.company.type,
          departmentId: user.departmentId,
          departmentName: user.department?.name,
          // Legacy compat
          role: primaryRole.name,
        } as any
      },
    }),
  ],
  // callbacks inherited from authConfig (jwt + session + authorized)
})
