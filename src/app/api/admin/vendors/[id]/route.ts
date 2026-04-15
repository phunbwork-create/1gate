import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireRole, success, badRequest, notFound, serverError } from "@/lib/api-helpers"
import { updateVendorSchema } from "@/schemas/admin.schema"

// ─── PATCH /api/admin/vendors/[id] ───────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const result = await requireRole("Admin", "Purchasing")
  if (result.error) return result.error

  try {
    const { id } = params
    const body = await req.json()
    const parsed = updateVendorSchema.safeParse(body)

    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((e) => e.message).join(", "))
    }

    const existing = await prisma.vendor.findUnique({ where: { id } })
    if (!existing) return notFound("Nhà cung cấp không tồn tại")

    const vendor = await prisma.vendor.update({
      where: { id },
      data: parsed.data,
      include: { company: { select: { id: true, name: true, code: true } } },
    })

    return success(vendor)
  } catch (error) {
    console.error("PATCH /api/admin/vendors/[id] error:", error)
    return serverError()
  }
}

// ─── DELETE /api/admin/vendors/[id] ──────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const result = await requireRole("Admin")
  if (result.error) return result.error

  try {
    const { id } = params
    const existing = await prisma.vendor.findUnique({ where: { id } })
    if (!existing) return notFound("Nhà cung cấp không tồn tại")

    await prisma.vendor.update({
      where: { id },
      data: { isActive: false },
    })

    return success({ message: "Đã vô hiệu hóa NCC" })
  } catch (error) {
    console.error("DELETE /api/admin/vendors/[id] error:", error)
    return serverError()
  }
}
