import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { getAuthUser, success, badRequest, serverError } from "@/lib/api-helpers"
import { createSettlementSchema } from "@/schemas/business.schema"

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return badRequest("Unauthorized")

  try {
    const list = await prisma.settlement.findMany({
      where: { createdBy: { companyId: user.companyId } },
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { id: true, name: true } },
        advanceRequest: { select: { code: true, amount: true } },
        paymentRequest: { select: { code: true, amount: true } },
        purchaseRequest: { select: { code: true, totalAmount: true } },
        materialRequest: { select: { code: true } },
      },
    })
    return success(list)
  } catch (error) {
    console.error("GET /api/settlements error:", error)
    return serverError()
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return badRequest("Unauthorized")

  try {
    const body = await req.json()
    const parsed = createSettlementSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((e) => e.message).join(", "))
    }

    const {
      sourceType,
      advanceRequestId, paymentRequestId, purchaseRequestId, materialRequestId,
      advanceRequestIds, 
      title, actualAmount, invoiceNumber, invoiceDate, note,
    } = parsed.data

    // 1. Determine resolvedSourceType
    const validAdvanceIds = advanceRequestIds?.length ? advanceRequestIds : (advanceRequestId ? [advanceRequestId] : [])
    
    const resolvedSourceType = sourceType
      || (validAdvanceIds.length > 0 ? "AdvanceRequest"
        : paymentRequestId ? "PaymentRequest"
          : purchaseRequestId ? "PurchaseRequest"
            : materialRequestId ? "MaterialRequest"
              : "AdvanceRequest")

    // 2. Calculate return/additional for advance requests
    let returnAmount = 0
    let additionalAmount = 0
    let originalAmountTotal = 0

    if (resolvedSourceType === "AdvanceRequest" && validAdvanceIds.length > 0 && actualAmount !== undefined && actualAmount !== null) {
      // Find all selected advance requests
      const advances = await prisma.advanceRequest.findMany({ 
        where: { id: { in: validAdvanceIds }, companyId: user.companyId } 
      })
      
      if (advances.length === 0) return badRequest("Tạm ứng không tồn tại")

      originalAmountTotal = advances.reduce((sum, advance) => sum + Number(advance.amount), 0)
      
      if (actualAmount > originalAmountTotal) {
        additionalAmount = actualAmount - originalAmountTotal
      } else if (actualAmount < originalAmountTotal) {
        returnAmount = originalAmountTotal - actualAmount
      }
    }

    // Code generation
    const today = new Date()
    const prefix = `QT${today.toISOString().slice(2, 4)}${today.toISOString().slice(5, 7)}${today.toISOString().slice(8, 10)}`
    const count = await prisma.settlement.count({
      where: { code: { startsWith: prefix } },
    })
    const code = `${prefix}${(count + 1).toString().padStart(4, "0")}`

    // 3. Build SettlementItems payload
    const settlementItemsData = []
    
    if (validAdvanceIds.length > 0) {
      validAdvanceIds.forEach(id => settlementItemsData.push({ advanceRequestId: id }))
    } else if (paymentRequestId) {
      settlementItemsData.push({ paymentRequestId })
    } else if (purchaseRequestId) {
      settlementItemsData.push({ purchaseRequestId })
    } else if (materialRequestId) {
      settlementItemsData.push({ materialRequestId })
    }

    const newSettlement = await prisma.settlement.create({
      data: {
        code,
        title,
        sourceType: resolvedSourceType,
        createdById: user.id,
        // Legacy 1-1 fields for backward compatibility, optionally we can keep the first index
        advanceRequestId: validAdvanceIds[0] || null,
        paymentRequestId: paymentRequestId || null,
        purchaseRequestId: purchaseRequestId || null,
        materialRequestId: materialRequestId || null,
        
        actualAmount: actualAmount || null,
        returnAmount,
        additionalAmount,
        invoiceNumber,
        invoiceDate: invoiceDate ? new Date(invoiceDate) : null,
        note,
        items: {
          create: settlementItemsData
        }
      },
    })

    return success(newSettlement)
  } catch (error) {
    console.error(error)
    return serverError()
  }
}
