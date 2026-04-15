import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { getAuthUser, requireRole, success, badRequest, notFound, serverError } from "@/lib/api-helpers"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("Accountant", "ChiefAccountant", "Admin")
  if (result.error) return result.error

  try {
    const { id } = await params
    const user = result.user

    const plan = await prisma.paymentPlan.findUnique({
      where: { id },
      include: { items: true }
    })

    if (!plan) return notFound("Kế hoạch không tồn tại")
    
    if (plan.status !== "Approved" && plan.status !== "PartiallyApproved") {
      return badRequest("Chỉ có thể thực hiện (chi tiền) các kế hoạch đã được duyệt")
    }

    if (user.role !== "Admin" && plan.companyId !== user.companyId) {
      return notFound("Kế hoạch không tồn tại")
    }

    const updated = await prisma.$transaction(async (tx) => {
      const executed = await tx.paymentPlan.update({
        where: { id },
        data: { status: "Executed" },
      })

      // Update related original requests to Closed
      for (const item of plan.items) {
        if (item.status === "Approved") {
          if (item.paymentRequestId) {
            await tx.paymentRequest.update({
              where: { id: item.paymentRequestId },
              data: { status: "Closed" }
            })
          }
          if (item.advanceRequestId) {
            await tx.paymentRequest.update({
              where: { id: item.advanceRequestId },
              data: { status: "Closed" }
            }).catch(() => {
              return tx.advanceRequest.update({
                where: { id: item.advanceRequestId! },
                data: { status: "Closed" }
              })
            })
          }
        }
      }

      return executed
    })

    return success(updated)
  } catch (error) {
    console.error(error)
    return serverError()
  }
}
