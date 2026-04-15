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
      },
    })

    if (!plan) return notFound("Kế hoạch không tồn tại")

    // Company scope check
    if (result.user.role !== "Admin" && plan.companyId !== result.user.companyId) {
      return notFound("Kế hoạch không tồn tại")
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

    if (!existing) return notFound("Kế hoạch không tồn tại")
    if (existing.status !== "Draft") return badRequest("Chỉ được sửa kế hoạch ở trạng thái Nháp")
    if (existing.createdById !== result.user.id && result.user.role !== "Admin") {
      return badRequest("Chỉ người tạo mới được chỉnh sửa")
    }

    const body = await req.json()
    const parsed = updateProcurementPlanSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((e) => e.message).join(", "))
    }

    const { items, ...planData } = parsed.data

    const updated = await prisma.$transaction(async (tx) => {
      await tx.procurementPlan.update({
        where: { id },
        data: { ...planData, updatedAt: new Date() },
      })

      if (items) {
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

    if (!existing) return notFound("Kế hoạch không tồn tại")
    if (existing.status !== "Draft") return badRequest("Chỉ được hủy kế hoạch ở trạng thái Nháp")
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

    return success({ message: "Đã hủy kế hoạch" })
  } catch (error) {
    console.error("DELETE /api/procurement/[id] error:", error)
    return serverError()
  }
}
