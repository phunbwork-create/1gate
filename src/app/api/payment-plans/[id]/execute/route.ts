import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireRole, success, badRequest, notFound, serverError } from "@/lib/api-helpers"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("Accountant", "ChiefAccountant", "Admin")
  if (result.error) return result.error

  try {
    const { id } = await params
    const user = result.user
    const body = await req.json().catch(() => ({}))
    const note: string | null = body.note || null
    const executedAt: Date = body.executedAt ? new Date(body.executedAt) : new Date()

    const plan = await prisma.paymentPlan.findUnique({
      where: { id },
      include: { items: true },
    })

    if (!plan) return notFound("Kế hoạch không tồn tại")
    if (plan.status !== "Approved" && plan.status !== "PartiallyApproved") {
      return badRequest("Chỉ có thể thực hiện (chi tiền) các kế hoạch đã được duyệt")
    }
    if (user.role !== "Admin" && plan.companyId !== user.companyId) {
      return notFound("Kế hoạch không tồn tại")
    }

    // Generate voucher code: PC-YYYYMMDD-XXXX
    const dateStr = executedAt.toISOString().slice(0, 10).replace(/-/g, "")
    const count = await prisma.paymentVoucher.count()
    const voucherCode = `PC-${dateStr}-${String(count + 1).padStart(4, "0")}`

    const approvedItems = plan.items.filter((i) => i.status === "Approved")
    const totalAmount = approvedItems.reduce(
      (sum, i) => sum + Number(i.approvedAmount ?? i.originalAmount),
      0
    )

    const voucher = await prisma.$transaction(async (tx) => {
      await tx.paymentPlan.update({
        where: { id },
        data: { status: "Executed" },
      })

      const v = await tx.paymentVoucher.create({
        data: {
          code: voucherCode,
          planId: id,
          executedById: user.id,
          totalAmount,
          note,
          executedAt,
        },
      })

      for (const item of approvedItems) {
        if (item.paymentRequestId) {
          await tx.paymentRequest.update({
            where: { id: item.paymentRequestId },
            data: { status: "Closed" },
          })
        }
        if (item.advanceRequestId) {
          await tx.advanceRequest.update({
            where: { id: item.advanceRequestId },
            data: { status: "Closed" },
          })
        }
      }

      return v
    })

    return success(voucher)
  } catch (error) {
    console.error("execute error:", error)
    return serverError()
  }
}
