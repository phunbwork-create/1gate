import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireRole, success, badRequest, notFound, serverError } from "@/lib/api-helpers"
import { approvalActionSchema } from "@/schemas/business.schema"
import { calculateCurrentStepIndex } from "@/lib/workflow"
import { notifyWorkflow } from "@/lib/notification"

// Approval chain: DeptHead → Director
const APPROVAL_CHAIN = ["DeptHead", "Director"] as const

// ─── POST /api/procurement/[id]/approve ──────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("DeptHead", "Director", "Admin")
  if (result.error) return result.error

  try {
    const { id } = await params
    const body = await req.json()
    const parsed = approvalActionSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((e) => e.message).join(", "))
    }

    const { action, comment } = parsed.data

    const plan = await prisma.procurementPlan.findUnique({
      where: { id },
      include: {
        approvalSteps: { orderBy: { stepOrder: "asc" } },
        createdBy: { select: { id: true, name: true, email: true, telegramChatId: true } },
      },
    })

    if (!plan) return notFound("Hồ sơ không tồn tại")
    if (!["Submitted", "PendingApproval"].includes(plan.status)) {
      return badRequest("Hồ sơ chưa được trình duyệt")
    }

    // Company scope
    if (result.user.role !== "Admin" && plan.companyId !== result.user.companyId) {
      return notFound("Hồ sơ không tồn tại")
    }

    // Determine current step in chain: count approvals after the last return/reject
    const currentStepIndex = calculateCurrentStepIndex(plan.approvalSteps)
    const expectedRole = APPROVAL_CHAIN[currentStepIndex]

    if (!expectedRole) return badRequest("Hồ sơ đã được duyệt xong")

    // Check if user has the right role for this step
    if (result.user.role !== expectedRole && result.user.role !== "Admin") {
      return badRequest(`Bước duyệt hiện tại cần vai trò ${expectedRole}`)
    }

    // Prevent self-approval (creator cannot approve own plan)
    if (plan.createdById === result.user.id) {
      return badRequest("Không thể tự duyệt hồ sơ do mình tạo")
    }

    await prisma.$transaction(async (tx) => {
      // Create approval step
      await tx.approvalStep.create({
        data: {
          procurementPlanId: id,
          approverId: result.user.id,
          role: result.user.role,
          stepOrder: currentStepIndex + 1,
          action,
          comment: comment || null,
          actedAt: new Date(),
        },
      })

      if (action === "reject") {
        await tx.procurementPlan.update({
          where: { id },
          data: { status: "Rejected" },
        })
      } else if (action === "return") {
        await tx.procurementPlan.update({
          where: { id },
          data: { status: "Returned", isLocked: false },
        })
      } else {
        // approve
        const isLastStep = currentStepIndex + 1 >= APPROVAL_CHAIN.length
        if (isLastStep) {
          await tx.procurementPlan.update({
            where: { id },
            data: { status: "Approved", approvedAt: new Date() },
          })
        } else {
          await tx.procurementPlan.update({
            where: { id },
            data: { status: "PendingApproval" },
          })
        }
      }
    })

    // Notify creator about the decision
    const actor = await prisma.user.findUnique({
      where: { id: result.user.id },
      select: { name: true },
    })
    await notifyWorkflow({
      entityCode: plan.code,
      entityLabel: "Hồ sơ / Hợp đồng",
      action: action as "approved" | "rejected" | "returned",
      actor: actor?.name || result.user.id,
      comment,
      recipients: [plan.createdBy],
    })

    const updated = await prisma.procurementPlan.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, name: true } },
        approvalSteps: {
          include: { approver: { select: { id: true, name: true } } },
          orderBy: { stepOrder: "asc" },
        },
      },
    })

    return success(updated)
  } catch (error) {
    console.error("POST /api/procurement/[id]/approve error:", error)
    return serverError()
  }
}
