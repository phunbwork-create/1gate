import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { getAuthUser, requireRole, success, badRequest, notFound, serverError } from "@/lib/api-helpers"
import { notifyWorkflow } from "@/lib/notification"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("Accountant", "ChiefAccountant", "Admin")
  if (result.error) return result.error

  try {
    const { id } = await params
    const body = await req.json()
    const action = body.action as "approve" | "reject" | "return"

    if (!["approve", "reject", "return"].includes(action)) {
      return badRequest("Hành động không hợp lệ")
    }

    const request = await prisma.settlement.findUnique({
      where: { id }
    })

    if (!request) return notFound("Phiếu quyết toán không tồn tại")
    
    if (request.status !== "Submitted") {
      return badRequest("Phiếu chưa được trình duyệt")
    }

    let newStatus = "Approved"
    if (action === "reject") newStatus = "Rejected"
    else if (action === "return") newStatus = "Returned"

    const updated = await prisma.settlement.update({
      where: { id },
      data: {
        status: newStatus as any,
        settledAt: action === "approve" ? new Date() : null,
      },
      include: { createdBy: true }
    })

    const actor = await prisma.user.findUnique({ where: { id: result.user.id } })

    await notifyWorkflow({
      entityCode: updated.code,
      entityLabel: "Phiếu Quyết toán",
      action: action === "approve" ? "approved" : action as any,
      actor: actor?.name || result.user.id,
      recipients: [updated.createdBy],
    })

    return success(updated)
  } catch (error) {
    console.error(error)
    return serverError()
  }
}
