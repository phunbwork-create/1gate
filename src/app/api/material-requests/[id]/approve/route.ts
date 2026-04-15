import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireRole, success, badRequest, notFound, serverError } from "@/lib/api-helpers"
import { approvalActionSchema } from "@/schemas/business.schema"
import { notifyWorkflow } from "@/lib/notification"

// ─── POST /api/material-requests/[id]/approve ────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("DeptHead", "Admin")
  if (result.error) return result.error

  try {
    const { id } = await params
    const body = await req.json()
    const parsed = approvalActionSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((e) => e.message).join(", "))
    }

    const { action, comment } = parsed.data

    const request = await prisma.materialRequest.findUnique({
      where: { id },
      include: {
        approvalSteps: true,
        createdBy: { select: { id: true, name: true, email: true, telegramChatId: true } },
      },
    })

    if (!request) return notFound("Đề nghị không tồn tại")
    if (!["Submitted", "PendingApproval"].includes(request.status)) {
      return badRequest("Đề nghị chưa được trình duyệt")
    }
    if (result.user.role !== "Admin" && request.companyId !== result.user.companyId) {
      return notFound("Đề nghị không tồn tại")
    }
    if (request.createdById === result.user.id) {
      return badRequest("Không thể tự duyệt đề nghị do mình tạo")
    }

    await prisma.$transaction(async (tx) => {
      await tx.approvalStep.create({
        data: {
          materialRequestId: id,
          approverId: result.user.id,
          role: result.user.role,
          stepOrder: 1,
          action,
          comment: comment || null,
          actedAt: new Date(),
        },
      })

      if (action === "reject") {
        await tx.materialRequest.update({
          where: { id },
          data: { status: "Rejected" },
        })
      } else if (action === "return") {
        await tx.materialRequest.update({
          where: { id },
          data: { status: "Returned", isLocked: false },
        })
      } else {
        await tx.materialRequest.update({
          where: { id },
          data: { status: "Approved", approvedAt: new Date() },
        })
      }
    })

    // Notify creator about the decision
    const actor = await prisma.user.findUnique({
      where: { id: result.user.id },
      select: { name: true },
    })
    await notifyWorkflow({
      entityCode: request.code,
      entityLabel: "Đề nghị Vật tư",
      action: action as "approved" | "rejected" | "returned",
      actor: actor?.name || result.user.id,
      comment,
      recipients: [request.createdBy],
    })

    const updated = await prisma.materialRequest.findUnique({
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
    console.error("POST /api/material-requests/[id]/approve error:", error)
    return serverError()
  }
}
