import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireRole, success, badRequest, notFound, serverError } from "@/lib/api-helpers"
import { updateProcurementPlanSchema } from "@/schemas/business.schema"

// ─── GET /api/procurement/[id] ───────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("Staff", "DeptHead", "Director", "Admin")
  if (result.error) return result.error

  try {
    const { id } = await params
    const plan = await prisma.procurementPlan.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, name: true, email: true, departmentId: true } },
        items: {
          include: {
            materialItem: { select: { id: true, code: true, name: true } },
          },
        },
        approvalSteps: {
          include: {
            approver: { select: { id: true, name: true, email: true } },
          },
          orderBy: { stepOrder: "asc" },
        },
        attachments: {
          select: {
            id: true,
            fileName: true,
            fileUrl: true,
            fileSize: true,
            mimeType: true,
            documentType: true,
            uploadedAt: true,
          },
          orderBy: { uploadedAt: "desc" },
        },
      },
    })

    if (!plan) return notFound("Hồ sơ không tồn tại")

    // ── Permission check ──────────────────────────────────────────────
    // Admin  → sees all
    // DeptHead → same company + same department
    // Others → only own records
    if (result.user.role === "Admin") {
      // OK — full access
    } else if (result.user.role === "DeptHead" && result.user.departmentId) {
      if (plan.companyId !== result.user.companyId || plan.createdBy.departmentId !== result.user.departmentId) {
        return notFound("Hồ sơ không tồn tại")
      }
    } else {
      if (plan.createdById !== result.user.id) {
        return notFound("Hồ sơ không tồn tại")
      }
    }

    const deptHeads = await prisma.user.findMany({
      where: { role: "DeptHead", companyId: plan.companyId, departmentId: plan.createdBy.departmentId },
      select: { name: true, email: true }
    })
    
    const directors = await prisma.user.findMany({
      where: { role: "Director", companyId: plan.companyId },
      select: { name: true, email: true }
    })

    const expectedApprovers = [
      { role: "DeptHead", users: deptHeads },
      { role: "Director", users: directors }
    ]

    return success({ ...plan, expectedApprovers })
  } catch (error) {
    console.error("GET /api/procurement/[id] error:", error)
    return serverError()
  }
}

// ─── PATCH /api/procurement/[id] ─────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("Staff", "DeptHead", "Director", "Admin")
  if (result.error) return result.error

  try {
    const { id } = await params
    const existing = await prisma.procurementPlan.findUnique({ where: { id } })

    if (!existing) return notFound("Hồ sơ không tồn tại")

    // DeptHead/Admin có thể sửa metadata ở mọi trạng thái
    // Staff chỉ sửa được ở Draft
    const isPrivileged = result.user.role === "Admin" || result.user.role === "DeptHead"
    if (!isPrivileged) {
      if (existing.status !== "Draft") return badRequest("Chỉ được sửa hồ sơ ở trạng thái Nháp")
      if (existing.createdById !== result.user.id) return badRequest("Chỉ người tạo mới được chỉnh sửa")
    }

    const body = await req.json()
    const parsed = updateProcurementPlanSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((e) => e.message).join(", "))
    }

    const { items, contractCode, contractType, partnerName, partnerTaxCode, partnerRepresentative,
      signDate, effectiveDate, expiryDate, contractValue, vatRate, currency, ...planData } = parsed.data

    // Rebuild description JSON with contract metadata
    let descriptionUpdate: string | undefined
    if (contractType !== undefined || partnerName !== undefined || partnerTaxCode !== undefined ||
        partnerRepresentative !== undefined || signDate !== undefined || effectiveDate !== undefined ||
        expiryDate !== undefined || contractValue !== undefined || vatRate !== undefined ||
        currency !== undefined || planData.description !== undefined) {
      // Parse existing description to preserve existing meta
      let existingMeta: Record<string, unknown> = {}
      if (existing.description) {
        try { existingMeta = JSON.parse(existing.description) } catch { existingMeta = { note: existing.description } }
      }
      const newMeta = {
        ...existingMeta,
        ...(planData.description !== undefined ? { note: planData.description } : {}),
        ...(contractType !== undefined ? { contractType } : {}),
        ...(partnerName !== undefined ? { partnerName } : {}),
        ...(partnerTaxCode !== undefined ? { partnerTaxCode } : {}),
        ...(partnerRepresentative !== undefined ? { partnerRepresentative } : {}),
        ...(signDate !== undefined ? { signDate } : {}),
        ...(effectiveDate !== undefined ? { effectiveDate } : {}),
        ...(expiryDate !== undefined ? { expiryDate } : {}),
        ...(contractValue !== undefined ? { contractValue } : {}),
        ...(vatRate !== undefined ? { vatRate } : {}),
        ...(currency !== undefined ? { currency } : {}),
      }
      descriptionUpdate = JSON.stringify(newMeta)
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.procurementPlan.update({
        where: { id },
        data: {
          ...(planData.title ? { title: planData.title } : {}),
          ...(contractCode !== undefined ? { contractCode } : {}),
          ...(descriptionUpdate !== undefined ? { description: descriptionUpdate } : {}),
          updatedAt: new Date(),
        },
      })

      // Chỉ cho phép thay đổi items khi ở Draft
      if (items && existing.status === "Draft") {
        await tx.procurementPlanItem.deleteMany({ where: { planId: id } })
        await tx.procurementPlanItem.createMany({
          data: items.map((item) => ({
            planId: id,
            materialItemId: item.materialItemId || null,
            itemName: item.itemName,
            unit: item.unit,
            plannedQty: item.plannedQty,
            estimatedPrice: item.estimatedPrice || null,
            note: item.note || null,
          })),
        })
      }

      return tx.procurementPlan.findUnique({
        where: { id },
        include: {
          company: { select: { id: true, name: true, code: true } },
          createdBy: { select: { id: true, name: true } },
          items: true,
        },
      })
    })

    return success(updated)
  } catch (error) {
    console.error("PATCH /api/procurement/[id] error:", error)
    return serverError()
  }
}

// ─── DELETE /api/procurement/[id] ────────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("Staff", "DeptHead", "Director", "Admin")
  if (result.error) return result.error

  try {
    const { id } = await params
    const existing = await prisma.procurementPlan.findUnique({ where: { id } })

    if (!existing) return notFound("Hồ sơ không tồn tại")
    if (existing.status !== "Draft") return badRequest("Chỉ được hủy hồ sơ ở trạng thái Nháp")
    if (existing.createdById !== result.user.id && result.user.role !== "Admin") {
      return badRequest("Chỉ người tạo mới được hủy")
    }

    await prisma.$transaction(async (tx) => {
      await tx.procurementPlanItem.deleteMany({ where: { planId: id } })
      await tx.procurementPlan.update({
        where: { id },
        data: { status: "Cancelled" },
      })
    })

    return success({ message: "Đã hủy hồ sơ" })
  } catch (error) {
    console.error("DELETE /api/procurement/[id] error:", error)
    return serverError()
  }
}
