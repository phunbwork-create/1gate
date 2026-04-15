import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireRole, success, badRequest, notFound, serverError } from "@/lib/api-helpers"
import { notifyWorkflow } from "@/lib/notification"
import { getApprovalChain } from "@/lib/permissions"

// ─── POST /api/payment-requests/[id]/submit ───────────────────────────────────
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole(
    "Staff", "Purchasing", "Accountant", "DeptHead", "Admin"
  )
  if (result.error) return result.error

  try {
    const { id } = await params

    const req = await prisma.paymentRequest.findUnique({ where: { id } })
    if (!req) return notFound("Đề nghị thanh toán không tồn tại")
    if (req.companyId !== result.user.companyId && result.user.role !== "Admin") {
      return notFound("Đề nghị thanh toán không tồn tại")
    }
    if (req.createdById !== result.user.id && result.user.role !== "Admin") {
      return badRequest("Bạn không có quyền trình duyệt đề nghị này")
    }
    if (!["Draft", "Returned"].includes(req.status)) {
      return badRequest("Chỉ có thể trình duyệt phiếu ở trạng thái Nháp hoặc Trả lại")
    }

    // Business rule: HasInvoice → invoice number required
    if (req.invoiceScenario === "HasInvoice" && !req.invoiceNumber) {
      return badRequest("Đề nghị có hóa đơn phải nhập số hóa đơn trước khi trình duyệt")
    }

    // Business rules: enforce document type by amount threshold (F-05)
    const amount = Number(req.amount)
    if (amount > 20_000_000) {
      const contractCount = await prisma.attachment.count({
        where: { paymentRequestId: id, documentType: "Contract" },
      })
      if (contractCount === 0) {
        return badRequest("Đề nghị > 20 triệu phải đính kèm Hợp đồng (loại: Hợp đồng) trước khi trình duyệt")
      }
    } else if (amount > 5_000_000) {
      const quotationCount = await prisma.attachment.count({
        where: { paymentRequestId: id, documentType: "Quotation" },
      })
      if (quotationCount === 0) {
        return badRequest("Đề nghị > 5 triệu phải đính kèm Báo giá (loại: Báo giá) trước khi trình duyệt")
      }
    }

    await prisma.paymentRequest.update({
      where: { id },
      data: { status: "Submitted", isLocked: true, submittedAt: new Date() },
    })

    // Notify accountants in same company
    const chain = getApprovalChain("paymentRequest")
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
        entityLabel: "Đề nghị Thanh toán",
        action: "submitted",
        actor: submitter?.name || result.user.id,
        recipients: approvers.map((u) => ({ ...u, telegramChatId: u.telegramChatId })),
      })
    }

    const updated = await prisma.paymentRequest.findUnique({
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
    console.error("POST /api/payment-requests/[id]/submit error:", error)
    return serverError()
  }
}
