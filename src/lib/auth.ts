import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import prisma from "@/lib/prisma"
import { authConfig } from "@/lib/auth.config"
import { getLegacyPermissionsForRole } from "@/lib/permissions"
import { LEGACY_ROLE_LABELS } from "@/types/domain"

// Approximate level ranking for legacy roles (used only in the legacy fallback
// path below to pick a primary role). Mirrors SYSTEM_ROLES levels in seed-rbac.ts.
const LEGACY_ROLE_LEVELS: Record<string, number> = {
  Admin: 100,
  Director: 90,
  ChiefAccountant: 80,
  DeptHead: 70,
  Accountant: 60,
  Purchasing: 50,
  Warehouse: 40,
  Staff: 10,
}

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
        let roles = user.userRoles.map(ur => ({
          id: ur.role.id,
          name: ur.role.name,
          displayName: ur.role.displayName,
          color: ur.role.color as string | undefined,
          level: ur.role.level,
          isSystem: ur.role.isSystem,
        }))

        // Flatten permissions: unique set of "resource.action" strings
        const permissionSet = new Set<string>()
        for (const ur of user.userRoles) {
          for (const rp of ur.role.permissions) {
            permissionSet.add(`${rp.permission.resource}.${rp.permission.action}`)
          }
        }

        // ─── LEGACY FALLBACK ─────────────────────────────────────────────────
        // If the user has no UserRole rows yet — e.g. the RBAC seed has not run
        // or this user was never migrated — derive roles & permissions from the
        // legacy `user.role` field. Without this, permissions[] is empty and the
        // sidebar renders no menu at all (the bug introduced in 518767f).
        let permissionList = Array.from(permissionSet)
        if (roles.length === 0 && user.role) {
          permissionList = getLegacyPermissionsForRole(user.role)
          roles = [{
            id: `legacy:${user.role}`,
            name: user.role,
            displayName: LEGACY_ROLE_LABELS[user.role] || user.role,
            color: undefined,
            level: LEGACY_ROLE_LEVELS[user.role] ?? 0,
            isSystem: true,
          }]
        }

        // Sort by level desc to get primary role
        const sortedRoles = [...roles].sort((a, b) => b.level - a.level)
        const primaryRole = sortedRoles[0] || { name: "Staff", displayName: "Nhân viên", level: 0, color: undefined }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          // Dynamic RBAC fields
          roles: roles.map(r => r.name),
          rolesData: roles,
          permissions: permissionList,
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
