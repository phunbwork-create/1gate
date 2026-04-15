import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireRole, success, badRequest, notFound, serverError } from "@/lib/api-helpers"
import { notifyWorkflow } from "@/lib/notification"
import { getApprovalChain } from "@/lib/permissions"

// ─── POST /api/procurement/[id]/submit ───────────────────────────────────────
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("Staff", "DeptHead", "Director", "Admin")
  if (result.error) return result.error

  try {
    const { id } = await params
    const plan = await prisma.procurementPlan.findUnique({
      where: { id },
      include: { items: true },
    })

    if (!plan) return notFound("Kế hoạch không tồn tại")
    if (plan.status !== "Draft") return badRequest("Chỉ được trình kế hoạch ở trạng thái Nháp")
    if (plan.createdById !== result.user.id && result.user.role !== "Admin") {
      return badRequest("Chỉ người tạo mới được trình duyệt")
    }
    if (plan.items.length === 0) return badRequest("Kế hoạch phải có ít nhất 1 hàng hóa")

    const updated = await prisma.procurementPlan.update({
      where: { id },
      data: {
        status: "Submitted",
        isLocked: true,
        submittedAt: new Date(),
      },
      include: {
        company: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, name: true } },
      },
    })

    // Notify first approver in chain (DeptHead)
    const chain = getApprovalChain("procurementPlan")
    const firstRole = chain[0]
    if (firstRole) {
      const approvers = await prisma.user.findMany({
        where: { role: firstRole, companyId: plan.companyId, isActive: true },
        select: { id: true, name: true, email: true, telegramChatId: true },
      })
      await notifyWorkflow({
        entityCode: plan.code,
        entityLabel: "Kế hoạch Mua sắm",
        action: "submitted",
        actor: updated.createdBy.name,
        recipients: approvers,
      })
    }

    return success(updated)
  } catch (error) {
    console.error("POST /api/procurement/[id]/submit error:", error)
    return serverError()
  }
}
