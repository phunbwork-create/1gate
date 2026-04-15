import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireRole, success, badRequest, notFound, serverError } from "@/lib/api-helpers"
import { approvalActionSchema } from "@/schemas/business.schema"
import { calculateCurrentStepIndex } from "@/lib/workflow"
import { notifyWorkflow } from "@/lib/notification"

// Approval chain: DeptHead → Accountant
const APPROVAL_CHAIN = ["DeptHead", "Accountant"] as const

// ─── POST /api/purchase-requests/[id]/approve ────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("DeptHead", "Accountant", "Admin")
  if (result.error) return result.error

  try {
    const { id } = await params
    const body = await req.json()
    const parsed = approvalActionSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((e) => e.message).join(", "))
    }

    const { action, comment } = parsed.data

    const request = await prisma.purchaseRequest.findUnique({
      where: { id },
      include: {
        approvalSteps: { orderBy: { stepOrder: "asc" } },
        createdBy: { select: { id: true, name: true, email: true, telegramChatId: true } },
      },
    })

    if (!request) return notFound("Đề nghị mua hàng không tồn tại")
    if (!["Submitted", "PendingApproval"].includes(request.status)) {
      return badRequest("Đề nghị chưa được trình duyệt")
    }
    if (result.user.role !== "Admin" && request.companyId !== result.user.companyId) {
      return notFound("Đề nghị mua hàng không tồn tại")
    }
    if (request.createdById === result.user.id) {
      return badRequest("Không thể tự duyệt đề nghị do mình tạo")
    }

    const currentStepIndex = calculateCurrentStepIndex(request.approvalSteps)
    const expectedRole = APPROVAL_CHAIN[currentStepIndex]

    if (!expectedRole) return badRequest("Đề nghị đã được duyệt xong")

    if (result.user.role !== expectedRole && result.user.role !== "Admin") {
      return badRequest(`Bước duyệt hiện tại cần vai trò ${expectedRole}`)
    }

    await prisma.$transaction(async (tx) => {
      await tx.approvalStep.create({
        data: {
          purchaseRequestId: id,
          approverId: result.user.id,
          role: result.user.role,
          stepOrder: currentStepIndex + 1,
          action,
          comment: comment || null,
          actedAt: new Date(),
        },
      })

      if (action === "reject") {
        await tx.purchaseRequest.update({
          where: { id },
          data: { status: "Rejected" },
        })
      } else if (action === "return") {
        await tx.purchaseRequest.update({
          where: { id },
          data: { status: "Returned", isLocked: false },
        })
      } else {
        const isLastStep = currentStepIndex + 1 >= APPROVAL_CHAIN.length
        if (isLastStep) {
          await tx.purchaseRequest.update({
            where: { id },
            data: { status: "Approved", approvedAt: new Date() },
          })
        } else {
          await tx.purchaseRequest.update({
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
      entityCode: request.code,
      entityLabel: "Đề nghị Mua hàng",
      action: action as "approved" | "rejected" | "returned",
      actor: actor?.name || result.user.id,
      comment,
      recipients: [request.createdBy],
    })

    const updated = await prisma.purchaseRequest.findUnique({
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
    console.error("POST /api/purchase-requests/[id]/approve error:", error)
    return serverError()
  }
}
