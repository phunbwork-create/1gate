import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requirePermission, success, badRequest, notFound, serverError } from "@/lib/api-helpers"
import { updateRoleSchema } from "@/schemas/admin.schema"

// ─── GET /api/admin/roles/[id] ───────────────────────────────────────────────
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requirePermission("admin.full", "role.read")
  if (result.error) return result.error

  try {
    const { id } = await params
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: { select: { userRoles: true } },
      },
    })

    if (!role) return notFound("Vai trò không tồn tại")

    return success({
      ...role,
      userCount: role._count.userRoles,
      assignedPermissions: role.permissions.map(rp => rp.permission),
    })
  } catch (error) {
    console.error("GET /api/admin/roles/[id] error:", error)
    return serverError()
  }
}

// ─── PATCH /api/admin/roles/[id] ─────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requirePermission("admin.full", "role.update")
  if (result.error) return result.error

  try {
    const { id } = await params
    const body = await req.json()
    const parsed = updateRoleSchema.safeParse(body)

    if (!parsed.success) {
      return badRequest(parsed.error.issues.map(e => e.message).join(", "))
    }

    const existing = await prisma.role.findUnique({ where: { id } })
    if (!existing) return notFound("Vai trò không tồn tại")

    // Protect system Admin role
    if (existing.isSystem && existing.name === "Admin") {
      // Only allow updating description, color — not name or level
      if (parsed.data.name && parsed.data.name !== existing.name) {
        return badRequest("Không thể đổi tên vai trò Admin hệ thống")
      }
    }

    // Check name uniqueness if changing
    if (parsed.data.name && parsed.data.name !== existing.name) {
      const duplicate = await prisma.role.findUnique({ where: { name: parsed.data.name } })
      if (duplicate) return badRequest("Tên vai trò đã tồn tại")
    }

    const role = await prisma.role.update({
      where: { id },
      data: parsed.data,
      include: {
        _count: { select: { permissions: true, userRoles: true } },
      },
    })

    return success({
      ...role,
      permissionCount: role._count.permissions,
      userCount: role._count.userRoles,
    })
  } catch (error) {
    console.error("PATCH /api/admin/roles/[id] error:", error)
    return serverError()
  }
}

// ─── DELETE /api/admin/roles/[id] ────────────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requirePermission("admin.full", "role.delete")
  if (result.error) return result.error

  try {
    const { id } = await params
    const existing = await prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { userRoles: true } } },
    })

    if (!existing) return notFound("Vai trò không tồn tại")
    if (existing.isSystem) return badRequest("Không thể xóa vai trò hệ thống")
    if (existing._count.userRoles > 0) {
      return badRequest(`Không thể xóa. Hiện có ${existing._count.userRoles} người dùng đang dùng vai trò này`)
    }

    await prisma.role.delete({ where: { id } })
    return success({ message: "Đã xóa vai trò" })
  } catch (error) {
    console.error("DELETE /api/admin/roles/[id] error:", error)
    return serverError()
  }
}
