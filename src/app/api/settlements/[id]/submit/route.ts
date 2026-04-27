import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { getAuthUser, success, badRequest, notFound, serverError } from "@/lib/api-helpers"
import { notifyWorkflow } from "@/lib/notification"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return badRequest("Unauthorized")

  try {
    const { id } = await params

    const request = await prisma.settlement.findUnique({
      where: { id },
      include: {
        advanceRequest: { select: { companyId: true } },
        paymentRequest: { select: { companyId: true } },
        purchaseRequest: { select: { companyId: true } },
        materialRequest: { select: { companyId: true } },
      }
    })

    if (!request) return notFound("Phiếu quyết toán không tồn tại")

    if (request.status !== "Draft" && request.status !== "Returned") {
      return badRequest("Chỉ có thể trình duyệt các phiếu nháp hoặc bị trả lại")
    }

    if (request.createdById !== user.id) {
      return badRequest("Chỉ người tạo mới có thể trình duyệt")
    }

    // Resolve companyId from whichever source is linked
    const companyId =
      request.advanceRequest?.companyId
      || request.paymentRequest?.companyId
      || request.purchaseRequest?.companyId
      || request.materialRequest?.companyId
      || user.companyId

    const updated = await prisma.settlement.update({
      where: { id },
      data: { status: "Submitted" },
      include: { createdBy: true }
    })

    // Notify DeptHead (trưởng bộ phận) to approve settlement
    // TODO: Chỉnh sửa người duyệt khi có phản hồi KTT
    const approvers = await prisma.user.findMany({
      where: {
        role: { in: ["DeptHead", "Accountant", "ChiefAccountant"] },
        companyId,
        isActive: true,
      },
    })

    await notifyWorkflow({
      entityCode: updated.code,
      entityLabel: "Phiếu Quyết toán",
      action: "submitted",
      actor: updated.createdBy.name,
      recipients: approvers,
    })

    return success(updated)
  } catch (error) {
    console.error(error)
    return serverError()
  }
}
