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

    const request = await prisma.paymentPlan.findUnique({
      where: { id }
    })

    if (!request) return notFound("Kế hoạch không tồn tại")
    
    // In actual flow, maybe draft => pending chief accountant
    if (request.status !== "Draft" && request.status !== "Rejected") {
      return badRequest("Chỉ có thể trình duyệt các kế hoạch nháp")
    }

    const updated = await prisma.paymentPlan.update({
      where: { id },
      data: {
        status: "PendingChiefAccountant",
        submittedAt: new Date(),
      },
    })

    // Notify ChiefAccountant for approval
    const approvers = await prisma.user.findMany({
      where: { role: "ChiefAccountant", companyId: request.companyId, isActive: true },
      select: { id: true, name: true, email: true, telegramChatId: true },
    })
    await notifyWorkflow({
      entityCode: updated.code,
      entityLabel: "Kế hoạch Thanh toán",
      action: "submitted",
      actor: user.name,
      recipients: approvers,
    })

    return success(updated)
  } catch (error) {
    console.error(error)
    return serverError()
  }
}
