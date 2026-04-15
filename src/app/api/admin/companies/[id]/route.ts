import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireRole, success, badRequest, notFound, serverError } from "@/lib/api-helpers"
import { updateCompanySchema } from "@/schemas/admin.schema"

// ─── PATCH /api/admin/companies/[id] ─────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const result = await requireRole("Admin")
  if (result.error) return result.error

  try {
    const { id } = params
    const body = await req.json()
    const parsed = updateCompanySchema.safeParse(body)

    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((e) => e.message).join(", "))
    }

    const existing = await prisma.company.findUnique({ where: { id } })
    if (!existing) return notFound("Công ty không tồn tại")

    if (parsed.data.code && parsed.data.code !== existing.code) {
      const dup = await prisma.company.findUnique({ where: { code: parsed.data.code } })
      if (dup) return badRequest("Mã công ty đã tồn tại")
    }

    const company = await prisma.company.update({
      where: { id },
      data: parsed.data,
      include: { _count: { select: { users: true, departments: true } } },
    })

    return success(company)
  } catch (error) {
    console.error("PATCH /api/admin/companies/[id] error:", error)
    return serverError()
  }
}
