import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireAuth, success, notFound, serverError } from "@/lib/api-helpers"

// GET /api/payment-plans/[id]/voucher
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth()
  if (result.error) return result.error

  try {
    const { id } = await params

    const plan = await prisma.paymentPlan.findUnique({
      where: { id },
      select: { id: true, companyId: true },
    })
    if (!plan) return notFound("Kế hoạch không tồn tại")
    if (result.user.role !== "Admin" && plan.companyId !== result.user.companyId) {
      return notFound("Kế hoạch không tồn tại")
    }

    const voucher = await prisma.paymentVoucher.findFirst({
      where: { planId: id },
      include: {
        plan: {
          include: {
            company: { select: { name: true, code: true } },
            createdBy: { select: { name: true } },
            items: {
              include: {
                paymentRequest: { select: { code: true, vendorName: true, bankAccount: true, bankName: true, description: true, amount: true } },
                advanceRequest:  { select: { code: true, vendorName: true, purpose: true, amount: true } },
              },
            },
          },
        },
      },
    })

    if (!voucher) return notFound("Phiếu chi chưa được tạo")
    return success(voucher)
  } catch (error) {
    console.error("GET voucher error:", error)
    return serverError()
  }
}
