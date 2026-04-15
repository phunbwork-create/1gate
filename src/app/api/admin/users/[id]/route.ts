import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireRole, success, badRequest, notFound, serverError } from "@/lib/api-helpers"
import { updateUserSchema } from "@/schemas/admin.schema"
import { hash } from "bcryptjs"

// ─── PATCH /api/admin/users/[id] ─────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const result = await requireRole("Admin")
  if (result.error) return result.error

  try {
    const { id } = params
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = { ...parsed.data }

    // Hash new password if provided
    if (parsed.data.password) {
      updateData.passwordHash = await hash(parsed.data.password, 12)
      delete updateData.password
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        company: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true } },
      },
    })

    const { passwordHash: _pw, ...sanitized } = user; void _pw
    return success(sanitized)
  } catch (error) {
    console.error("PATCH /api/admin/users/[id] error:", error)
    return serverError()
  }
}

// ─── DELETE /api/admin/users/[id] ────────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const result = await requireRole("Admin")
  if (result.error) return result.error

  try {
    const { id } = params

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
