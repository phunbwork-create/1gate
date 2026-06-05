import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireRole, success, badRequest, notFound, serverError } from "@/lib/api-helpers"
import { updateDepartmentSchema } from "@/schemas/admin.schema"

// ─── PATCH /api/admin/departments/[id] ───────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const result = await requireRole("Admin")
  if (result.error) return result.error

  try {
    const { id } = params
    const body = await req.json()
    const parsed = updateDepartmentSchema.safeParse(body)

    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((e) => e.message).join(", "))
    }

    const existing = await prisma.department.findUnique({ where: { id } })
    if (!existing) return notFound("Phòng ban không tồn tại")

    // Check duplicate code within same company if code or companyId changed
    const newCode = parsed.data.code ?? existing.code
    const newCompanyId = parsed.data.companyId ?? existing.companyId

    if (newCode !== existing.code || newCompanyId !== existing.companyId) {
      const dup = await prisma.department.findUnique({
        where: { code_companyId: { code: newCode, companyId: newCompanyId } },
      })
      if (dup && dup.id !== id) return badRequest("Mã phòng ban đã tồn tại trong công ty này")
    }

    const department = await prisma.department.update({
      where: { id },
      data: parsed.data,
      include: {
        company: { select: { id: true, name: true, code: true } },
        _count: { select: { users: true } },
      },
    })

    return success(department)
  } catch (error) {
    console.error("PATCH /api/admin/departments/[id] error:", error)
    return serverError()
  }
}

// ─── DELETE /api/admin/departments/[id] ──────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const result = await requireRole("Admin")
  if (result.error) return result.error

  try {
    const { id } = params

    const existing = await prisma.department.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    })
    if (!existing) return notFound("Phòng ban không tồn tại")

    // Soft-delete: deactivate instead of hard delete if has users
    if (existing._count.users > 0) {
      const department = await prisma.department.update({
        where: { id },
        data: { isActive: false },
        include: {
          company: { select: { id: true, name: true, code: true } },
          _count: { select: { users: true } },
        },
      })
      return success(department)
    }

    await prisma.department.delete({ where: { id } })
    return success({ message: "Đã xóa phòng ban" })
  } catch (error) {
    console.error("DELETE /api/admin/departments/[id] error:", error)
    return serverError()
  }
}
