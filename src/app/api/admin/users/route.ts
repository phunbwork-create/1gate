import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requirePermission, success, badRequest, serverError, getPaginationParams, getSearchParam } from "@/lib/api-helpers"
import { createUserSchema } from "@/schemas/admin.schema"
import { hash } from "bcryptjs"

// ─── GET /api/admin/users ────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const result = await requirePermission("admin.full", "user.read")
  if (result.error) return result.error

  try {
    const { skip, limit, page } = getPaginationParams(req)
    const search = getSearchParam(req, "search")
    const role = getSearchParam(req, "role")
    const companyId = getSearchParam(req, "companyId")
    const active = getSearchParam(req, "active")

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ]
    }
    if (role) {
      where.userRoles = { some: { role: { name: role } } }
    }
    if (companyId) where.companyId = companyId
    if (active !== undefined) where.isActive = active === "true"

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          company: { select: { id: true, name: true, code: true } },
          department: { select: { id: true, name: true } },
          userRoles: {
            include: {
              role: { select: { id: true, name: true, displayName: true, color: true, level: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    // Exclude passwordHash, format roles
    const sanitized = users.map(({ passwordHash, userRoles, ...u }) => ({
      ...u,
      roles: userRoles
        .map(ur => ur.role)
        .sort((a, b) => b.level - a.level),
      // Legacy compat: primary role
      role: userRoles.sort((a, b) => b.role.level - a.role.level)[0]?.role?.name || null,
    }))

    return success({
      data: sanitized,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error("GET /api/admin/users error:", error)
    return serverError()
  }
}

// ─── POST /api/admin/users ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const result = await requirePermission("admin.full", "user.create")
  if (result.error) return result.error

  try {
    const body = await req.json()
    const parsed = createUserSchema.safeParse(body)

    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((e) => e.message).join(", "))
    }

    const { password, roleIds, ...data } = parsed.data

    // Check duplicate email
    const exists = await prisma.user.findUnique({ where: { email: data.email } })
    if (exists) {
      return badRequest("Email đã tồn tại trong hệ thống")
    }

    // Validate roleIds exist
    const roles = await prisma.role.findMany({
      where: { id: { in: roleIds } },
      select: { id: true, name: true, displayName: true, color: true, level: true },
    })
    if (roles.length !== roleIds.length) {
      return badRequest("Một hoặc nhiều vai trò không hợp lệ")
    }

    const passwordHash = await hash(password, 12)

    const user = await prisma.user.create({
      data: {
        ...data,
        passwordHash,
        userRoles: {
          create: roleIds.map(roleId => ({ roleId })),
        },
      },
      include: {
        company: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true } },
        userRoles: {
          include: {
            role: { select: { id: true, name: true, displayName: true, color: true, level: true } },
          },
        },
      },
    })

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _hash, userRoles, ...sanitized } = user
    return success({
      ...sanitized,
      roles: userRoles.map(ur => ur.role).sort((a, b) => b.level - a.level),
    }, 201)
  } catch (error) {
    console.error("POST /api/admin/users error:", error)
    return serverError()
  }
}
