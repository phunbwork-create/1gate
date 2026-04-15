import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireRole, success, badRequest, notFound, serverError } from "@/lib/api-helpers"
import { cancelSchema } from "@/schemas/business.schema"

// ─── POST /api/payment-requests/[id]/cancel ───────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("Accountant", "ChiefAccountant", "Admin")
  if (result.error) return result.error

  try {
    const { id } = await params
    const body = await req.json()
    const parsed = cancelSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((e) => e.message).join(", "))
    }

    const { reason } = parsed.data

    const request = await prisma.paymentRequest.findUnique({ where: { id } })
    if (!request) return notFound("Đề nghị thanh toán không tồn tại")
    if (result.user.role !== "Admin" && request.companyId !== result.user.companyId) {
      return notFound("Đề nghị thanh toán không tồn tại")
    }
    if (request.status === "Cancelled") {
      return badRequest("Đề nghị đã bị hủy")
    }
    if (request.status === "Closed") {
      return badRequest("Không thể hủy đề nghị đã đóng")
    }

    await prisma.$transaction(async (tx) => {
      await tx.paymentRequest.update({
        where: { id },
        data: { status: "Cancelled" },
      })
      await tx.cancellationRecord.create({
        data: {
          entityType: "PaymentRequest",
          entityId: id,
          cancelledBy: result.user.id,
          reason,
        },
      })
    })

    return success({ message: "Đã hủy đề nghị thanh toán" })
  } catch (error) {
    console.error("POST /api/payment-requests/[id]/cancel error:", error)
    return serverError()
  }
}
