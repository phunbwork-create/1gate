import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireRole, success, badRequest, notFound, serverError } from "@/lib/api-helpers"
import { notifyWorkflow } from "@/lib/notification"
import { getApprovalChain } from "@/lib/permissions"

// ─── POST /api/advance-requests/[id]/submit ───────────────────────────────────
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("Staff", "DeptHead", "Admin")
  if (result.error) return result.error

  try {
    const { id } = await params

    const req = await prisma.advanceRequest.findUnique({ where: { id } })
    if (!req) return notFound("Đề nghị tạm ứng không tồn tại")
    if (req.companyId !== result.user.companyId && result.user.role !== "Admin") {
      return notFound("Đề nghị tạm ứng không tồn tại")
    }
    if (req.createdById !== result.user.id && result.user.role !== "Admin") {
      return badRequest("Bạn không có quyền trình duyệt đề nghị này")
    }
    if (!["Draft", "Returned"].includes(req.status)) {
      return badRequest("Chỉ có thể trình duyệt phiếu ở trạng thái Nháp hoặc Trả lại")
    }

    await prisma.advanceRequest.update({
      where: { id },
      data: { status: "Submitted", isLocked: true, submittedAt: new Date() },
    })

    // Notify first approver in dynamic chain
    const amount = Number(req.amount)
    const chain = getApprovalChain("advanceRequest", amount)
    const firstRole = chain[0]

    if (firstRole) {
      const approvers = await prisma.user.findMany({
        where: { role: firstRole, companyId: req.companyId, isActive: true },
        select: { id: true, name: true, email: true, telegramChatId: true },
      })
      const submitter = await prisma.user.findUnique({
        where: { id: result.user.id },
        select: { name: true },
      })

      await notifyWorkflow({
        entityCode: req.code,
        entityLabel: "Đề nghị Tạm ứng",
        action: "submitted",
        actor: submitter?.name || result.user.id,
        recipients: approvers.map((u: { id: string; name: string; email: string; telegramChatId: string | null }) => ({
          id: u.id, name: u.name, email: u.email, telegramChatId: u.telegramChatId,
        })),
      })
    }

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
    console.error("POST /api/advance-requests/[id]/submit error:", error)
    return serverError()
  }
}
