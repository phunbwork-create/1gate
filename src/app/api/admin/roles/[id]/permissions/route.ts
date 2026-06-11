import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requirePermission, success, badRequest, notFound, serverError } from "@/lib/api-helpers"
import { assignPermissionsSchema } from "@/schemas/admin.schema"

// ─── GET /api/admin/roles/[id]/permissions ───────────────────────────────────
// Returns all permissions grouped, with which ones are assigned to this role
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requirePermission("admin.full", "role.read")
  if (result.error) return result.error

  try {
    const { id } = await params

    const [role, allPermissions] = await Promise.all([
      prisma.role.findUnique({
        where: { id },
        include: {
          permissions: { select: { permissionId: true } },
        },
      }),
      prisma.permission.findMany({
        orderBy: [{ group: "asc" }, { resource: "asc" }, { action: "asc" }],
      }),
    ])

    if (!role) return notFound("Vai trò không tồn tại")

    const assignedIds = new Set(role.permissions.map(p => p.permissionId))

    // Group permissions by group name
    const groups: Record<string, { resource: string; displayName: string; action: string; id: string; assigned: boolean }[]> = {}

    for (const perm of allPermissions) {
      const group = perm.group || "Khác"
      if (!groups[group]) groups[group] = []
      groups[group].push({
        id: perm.id,
        resource: perm.resource,
        action: perm.action,
        displayName: perm.displayName,
        assigned: assignedIds.has(perm.id),
      })
    }

    return success({
      roleId: id,
      roleName: role.name,
      groups,
    })
  } catch (error) {
    console.error("GET /api/admin/roles/[id]/permissions error:", error)
    return serverError()
  }
}

// ─── PUT /api/admin/roles/[id]/permissions ───────────────────────────────────
// Replaces all permissions for a role
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requirePermission("admin.full", "role.update")
  if (result.error) return result.error

  try {
    const { id } = await params
    const body = await req.json()
    const parsed = assignPermissionsSchema.safeParse(body)

    if (!parsed.success) {
      return badRequest(parsed.error.issues.map(e => e.message).join(", "))
    }

    const role = await prisma.role.findUnique({ where: { id } })
    if (!role) return notFound("Vai trò không tồn tại")

    // Admin role always keeps admin.full
    if (role.name === "Admin" && role.isSystem) {
      const adminFullPerm = await prisma.permission.findUnique({
        where: { resource_action: { resource: "admin", action: "full" } },
      })
      if (adminFullPerm && !parsed.data.permissionIds.includes(adminFullPerm.id)) {
        parsed.data.permissionIds.push(adminFullPerm.id)
      }
    }

    // Transaction: delete all existing, then create new
    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId: id } }),
      prisma.rolePermission.createMany({
        data: parsed.data.permissionIds.map(permissionId => ({
          roleId: id,
          permissionId,
        })),
        skipDuplicates: true,
      }),
    ])

    return success({ message: "Đã cập nhật quyền cho vai trò", count: parsed.data.permissionIds.length })
  } catch (error) {
    console.error("PUT /api/admin/roles/[id]/permissions error:", error)
    return serverError()
  }
}
