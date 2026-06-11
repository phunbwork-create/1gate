import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requirePermission, success, badRequest, notFound, serverError } from "@/lib/api-helpers"
import { updateUserSchema } from "@/schemas/admin.schema"
import { hash } from "bcryptjs"

// ─── PATCH /api/admin/users/[id] ─────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requirePermission("admin.full", "user.update")
  if (result.error) return result.error

  try {
    const { id } = await params
    const body = await req.json()
    const parsed = updateUserSchema.safeParse(body)

    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((e) => e.message).join(", "))
    }

    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) return notFound("Người dùng không tồn tại")

    // Check duplicate email if changing
    if (parsed.data.email && parsed.data.email !== existing.email) {
      const dup = await prisma.user.findUnique({ where: { email: parsed.data.email } })
      if (dup) return badRequest("Email đã tồn tại")
    }

    const { password, roleIds, ...updateFields } = parsed.data

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = { ...updateFields }

    // Hash new password if provided
    if (password) {
      updateData.passwordHash = await hash(password, 12)
    }

    // Update user + roles in transaction
    const user = await prisma.$transaction(async (tx) => {
      // Update roles if provided
      if (roleIds) {
        // Validate roleIds exist
        const roles = await tx.role.findMany({ where: { id: { in: roleIds } } })
        if (roles.length !== roleIds.length) {
          throw new Error("INVALID_ROLES")
        }

        // Delete existing roles, create new ones
        await tx.userRole.deleteMany({ where: { userId: id } })
        await tx.userRole.createMany({
          data: roleIds.map(roleId => ({ userId: id, roleId })),
          skipDuplicates: true,
        })
      }

      return tx.user.update({
        where: { id },
        data: updateData,
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
    })

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _pw, userRoles, ...sanitized } = user
    return success({
      ...sanitized,
      roles: userRoles.map(ur => ur.role).sort((a, b) => b.level - a.level),
    })
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_ROLES") {
      return badRequest("Một hoặc nhiều vai trò không hợp lệ")
    }
    console.error("PATCH /api/admin/users/[id] error:", error)
    return serverError()
  }
}

// ─── DELETE /api/admin/users/[id] ────────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requirePermission("admin.full", "user.delete")
  if (result.error) return result.error

  try {
    const { id } = await params

    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) return notFound("Người dùng không tồn tại")

    // Soft delete: set isActive = false
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    })

    return success({ message: "Đã vô hiệu hóa người dùng" })
  } catch (error) {
    console.error("DELETE /api/admin/users/[id] error:", error)
    return serverError()
  }
}
