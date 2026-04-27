import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { getAuthUser, requireRole, success, badRequest, notFound, serverError } from "@/lib/api-helpers"
import { notifyWorkflow } from "@/lib/notification"
import { approvalActionSchema } from "@/schemas/business.schema"
import { getApprovalChain } from "@/lib/permissions"
import { calculateCurrentStepIndex } from "@/lib/workflow"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("DeptHead", "Accountant", "ChiefAccountant", "Admin")
  if (result.error) return result.error

  try {
    const { id } = await params
    const body = await req.json()
    const parsed = approvalActionSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((e) => e.message).join(", "))
    }

    const { action, comment } = parsed.data

    const request = await prisma.settlement.findUnique({
      where: { id },
      include: {
        approvalSteps: { orderBy: { stepOrder: "asc" } },
        createdBy: { select: { id: true, name: true, email: true, telegramChatId: true } },
      }
    })

    if (!request) return notFound("Phiếu quyết toán không tồn tại")
    if (!["Submitted", "PendingApproval"].includes(request.status)) {
      return badRequest("Phiếu chưa được trình duyệt")
    }

    if (request.createdById === result.user.id) {
      return badRequest("Không thể tự duyệt phiếu do mình tạo")
    }

    const APPROVAL_CHAIN = getApprovalChain("settlement")
    const currentStepIndex = calculateCurrentStepIndex(request.approvalSteps)
    const expectedRole = APPROVAL_CHAIN[currentStepIndex]

    if (!expectedRole) return badRequest("Phiếu đã được duyệt xong")
    if (result.user.role !== expectedRole && result.user.role !== "Admin") {
      return badRequest(`Bước duyệt hiện tại cần vai trò ${expectedRole}`)
    }

    await prisma.$transaction(async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
      await tx.approvalStep.create({
        data: {
          settlementId: id,
          approverId: result.user.id,
          role: result.user.role,
          stepOrder: currentStepIndex + 1,
          action,
          comment: comment || null,
          actedAt: new Date(),
        },
      } as any) // Type assertion if schema is missing settlementId in ApprovalStep, but let's check first

      if (action === "reject") {
        await tx.settlement.update({
          where: { id },
          data: { status: "Rejected" },
        })
      } else if (action === "return") {
        await tx.settlement.update({
          where: { id },
          data: { status: "Returned" }, // Kế toán trả lại nhân sự
        })
      } else {
        const isLastStep = currentStepIndex + 1 >= APPROVAL_CHAIN.length
        if (isLastStep) {
          await tx.settlement.update({
            where: { id },
            data: { status: "Closed", settledAt: new Date() }, // Changed from Approved to Closed based on business rule
          })
        } else {
          await tx.settlement.update({
            where: { id },
            data: { status: "PendingApproval" },
          })
        }
      }
    })

    const actor = await prisma.user.findUnique({ where: { id: result.user.id } })

    const updated = await prisma.settlement.findUnique({
      where: { id },
      include: {
        createdBy: true,
        approvalSteps: {
          include: { approver: { select: { id: true, name: true } } },
          orderBy: { stepOrder: "asc" },
        },
      }
    })

    if (updated) {
      await notifyWorkflow({
        entityCode: updated.code,
        entityLabel: "Phiếu Quyết toán",
        action: action === "approve" ? "approved" : action as any,
        actor: actor?.name || result.user.id,
        comment,
        recipients: [updated.createdBy],
      })
    }

    return success(updated)
  } catch (error) {
    console.error("POST /api/settlements/[id]/approve error:", error)
    return serverError()
  }
}
