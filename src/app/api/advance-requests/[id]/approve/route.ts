import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireRole, success, badRequest, notFound, serverError } from "@/lib/api-helpers"
import { approvalActionSchema } from "@/schemas/business.schema"
import { calculateCurrentStepIndex } from "@/lib/workflow"
import { getApprovalChain } from "@/lib/permissions"
import { notifyWorkflow } from "@/lib/notification"

// ─── POST /api/advance-requests/[id]/approve ─────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("DeptHead", "ChiefAccountant", "Director", "Admin")
  if (result.error) return result.error

  try {
    const { id } = await params
    const body = await req.json()
    const parsed = approvalActionSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((e) => e.message).join(", "))
    }

    const { action, comment } = parsed.data

    const request = await prisma.advanceRequest.findUnique({
      where: { id },
      include: {
        approvalSteps: { orderBy: { stepOrder: "asc" } },
        createdBy: { select: { id: true, name: true, email: true, telegramChatId: true } },
      },
    })

    if (!request) return notFound("Đề nghị tạm ứng không tồn tại")
    if (!["Submitted", "PendingApproval"].includes(request.status)) {
      return badRequest("Đề nghị chưa được trình duyệt")
    }
    if (result.user.role !== "Admin" && request.companyId !== result.user.companyId) {
      return notFound("Đề nghị tạm ứng không tồn tại")
    }
    if (request.createdById === result.user.id) {
      return badRequest("Không thể tự duyệt đề nghị do mình tạo")
    }

    // Dynamic approval chain based on amount
    const amount = Number(request.amount)
    const APPROVAL_CHAIN = getApprovalChain("advanceRequest", amount)

    const currentStepIndex = calculateCurrentStepIndex(request.approvalSteps)
    const expectedRole = APPROVAL_CHAIN[currentStepIndex]

    if (!expectedRole) return badRequest("Đề nghị đã được duyệt xong")
    if (result.user.role !== expectedRole && result.user.role !== "Admin") {
      return badRequest(`Bước duyệt hiện tại cần vai trò ${expectedRole}`)
    }

    await prisma.$transaction(async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
      await tx.approvalStep.create({
        data: {
          advanceRequestId: id,
          approverId: result.user.id,
          role: result.user.role,
          stepOrder: currentStepIndex + 1,
          action,
          comment: comment || null,
          actedAt: new Date(),
        },
      })

      if (action === "reject") {
        await tx.advanceRequest.update({
          where: { id },
          data: { status: "Rejected" },
        })
      } else if (action === "return") {
        await tx.advanceRequest.update({
          where: { id },
          data: { status: "Returned", isLocked: false },
        })
      } else {
        const isLastStep = currentStepIndex + 1 >= APPROVAL_CHAIN.length
        if (isLastStep) {
          await tx.advanceRequest.update({
            where: { id },
            data: { status: "Approved", approvedAt: new Date() },
          })
        } else {
          await tx.advanceRequest.update({
            where: { id },
            data: { status: "PendingApproval" },
          })
        }
      }
    })

    // Notify creator
    const actor = await prisma.user.findUnique({
      where: { id: result.user.id },
      select: { name: true },
    })
    await notifyWorkflow({
      entityCode: request.code,
      entityLabel: "Đề nghị Tạm ứng",
      action: action as "approved" | "rejected" | "returned",
      actor: actor?.name || result.user.id,
      comment,
      recipients: [{
        id: request.createdBy.id,
        name: request.createdBy.name,
        email: request.createdBy.email,
        telegramChatId: request.createdBy.telegramChatId,
      }],
    })

    const updated = await prisma.advanceRequest.findUnique({
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
    console.error("POST /api/advance-requests/[id]/approve error:", error)
    return serverError()
  }
}
