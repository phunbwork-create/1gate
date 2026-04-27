import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireAuth, success, notFound, badRequest, serverError } from "@/lib/api-helpers"
import { updateSettlementSchema } from "@/schemas/business.schema"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth()
  if (result.error) return result.error

  try {
    const { id } = await params

    const reqDetail = await prisma.settlement.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, departmentId: true } },
        advanceRequest: {
          select: { code: true, amount: true, vendorName: true, purpose: true, company: { select: { code: true } } }
        },
        paymentRequest: {
          select: { code: true, amount: true, vendorName: true, description: true, company: { select: { code: true } } }
        },
        purchaseRequest: {
          select: { code: true, totalAmount: true, vendorName: true, note: true, company: { select: { code: true } } }
        },
        materialRequest: {
          select: { code: true, purpose: true, company: { select: { code: true } } }
        },
        attachments: { orderBy: { uploadedAt: "desc" } },
      },
    })

    if (!reqDetail) return notFound("Phiếu quyết toán không tồn tại")

    return success(reqDetail)
  } catch (error) {
    console.error(error)
    return serverError()
  }
}

// PATCH: Update title, note, actualAmount of a settlement (owner only, Draft/Returned)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth()
  if (result.error) return result.error

  try {
    const { id } = await params
    const body = await req.json()
    const parsed = updateSettlementSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((e) => e.message).join(", "))
    }

    const existing = await prisma.settlement.findUnique({ where: { id } })
    if (!existing) return notFound("Phiếu quyết toán không tồn tại")
    if (existing.createdById !== result.user.id) return badRequest("Chỉ người tạo mới có thể chỉnh sửa")
    if (!["Draft", "Returned"].includes(existing.status)) return badRequest("Chỉ có thể sửa phiếu nháp hoặc bị trả lại")

    const { title, actualAmount, invoiceNumber, invoiceDate, note } = parsed.data

    // Recalculate return/additional if actualAmount changed AND it's an AdvanceRequest
    let returnAmount = Number(existing.returnAmount)
    let additionalAmount = Number(existing.additionalAmount)

    if (actualAmount !== undefined && actualAmount !== null && existing.sourceType === "AdvanceRequest" && existing.advanceRequestId) {
      const advance = await prisma.advanceRequest.findUnique({ where: { id: existing.advanceRequestId } })
      if (advance) {
        const originalAmount = Number(advance.amount)
        returnAmount = 0
        additionalAmount = 0
        if (actualAmount > originalAmount) {
          additionalAmount = actualAmount - originalAmount
        } else if (actualAmount < originalAmount) {
          returnAmount = originalAmount - actualAmount
        }
      }
    }

    const updated = await prisma.settlement.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(actualAmount !== undefined && { actualAmount, returnAmount, additionalAmount }),
        ...(invoiceNumber !== undefined && { invoiceNumber }),
        ...(invoiceDate !== undefined && { invoiceDate: invoiceDate ? new Date(invoiceDate) : null }),
        ...(note !== undefined && { note }),
      },
    })

    return success(updated)
  } catch (error) {
    console.error(error)
    return serverError()
  }
}
