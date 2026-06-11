import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requirePermission, success, badRequest, serverError, getPaginationParams, getSearchParam } from "@/lib/api-helpers"
import { createRoleSchema } from "@/schemas/admin.schema"

// ─── GET /api/admin/roles ────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const result = await requirePermission("admin.full", "role.read")
  if (result.error) return result.error

  try {
    const { skip, limit, page } = getPaginationParams(req)
    const search = getSearchParam(req, "search")

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { displayName: { contains: search, mode: "insensitive" } },
      ]
    }

    const [roles, total] = await Promise.all([
      prisma.role.findMany({
        where,
        include: {
          _count: {
            select: {
              permissions: true,
              userRoles: true,
            },
          },
        },
        orderBy: { level: "desc" },
        skip,
        take: limit,
      }),
      prisma.role.count({ where }),
    ])

    return success({
      data: roles.map(r => ({
        ...r,
        permissionCount: r._count.permissions,
        userCount: r._count.userRoles,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error("GET /api/admin/roles error:", error)
    return serverError()
  }
}

// ─── POST /api/admin/roles ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const result = await requirePermission("admin.full", "role.create")
  if (result.error) return result.error

  try {
    const body = await req.json()
    const parsed = createRoleSchema.safeParse(body)

    if (!parsed.success) {
      return badRequest(parsed.error.issues.map(e => e.message).join(", "))
    }

    // Check duplicate name
    const exists = await prisma.role.findUnique({ where: { name: parsed.data.name } })
    if (exists) {
      return badRequest("Tên vai trò đã tồn tại trong hệ thống")
    }

    const role = await prisma.role.create({
      data: {
        ...parsed.data,
        isSystem: false,
      },
      include: {
        _count: { select: { permissions: true, userRoles: true } },
      },
    })

    return success({
      ...role,
      permissionCount: role._count.permissions,
      userCount: role._count.userRoles,
    }, 201)
  } catch (error) {
    console.error("POST /api/admin/roles error:", error)
    return serverError()
  }
}
