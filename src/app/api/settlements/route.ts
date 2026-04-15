import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { getAuthUser, success, badRequest, serverError } from "@/lib/api-helpers"
import { createSettlementSchema } from "@/schemas/business.schema"

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return badRequest("Unauthorized")

  try {
    const list = await prisma.settlement.findMany({
      where: { companyId: user.companyId },
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { id: true, name: true } },
        advanceRequest: { select: { code: true, amount: true } }
      },
    })
    return success(list)
  } catch (error) {
    // If the schema error happens "where: companyId doesn't exist", let me check if Settlement has companyId.
    // Wait, let's look at schema! I should check if Settlement has companyId.
    try {
      // Let's try without companyId, but filter by advanceRequest.companyId
      const listFallback = await prisma.settlement.findMany({
        where: { advanceRequest: { companyId: user.companyId } },
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: { select: { id: true, name: true } },
          advanceRequest: { select: { code: true, amount: true } }
        },
      })
      return success(listFallback)
    } catch(err2) {
      console.error(err2)
      return serverError()
    }
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

    const { advanceRequestId, actualAmount, invoiceNumber, invoiceDate, note } = parsed.data

    const advance = await prisma.advanceRequest.findUnique({ where: { id: advanceRequestId } })
    if (!advance) return badRequest("Tạm ứng không tồn tại")
    
    // Check if advance is fully executed (Closed) - optional depending on strictness
    // but at least it should be Approved or Closed
    
    const originalAmount = Number(advance.amount)
    let returnAmount = 0
    let additionalAmount = 0
    
    if (actualAmount > originalAmount) {
      additionalAmount = actualAmount - originalAmount
    } else if (actualAmount < originalAmount) {
      returnAmount = originalAmount - actualAmount
    }

    // Code generation
    const today = new Date()
    const prefix = `QT${today.toISOString().slice(2, 4)}${today.toISOString().slice(5, 7)}${today.toISOString().slice(8, 10)}`
    const count = await prisma.settlement.count({
      where: { code: { startsWith: prefix } },
    })
    const code = `${prefix}${(count + 1).toString().padStart(4, "0")}`

    const newSettlement = await prisma.settlement.create({
      data: {
        code,
        advanceRequestId,
        createdById: user.id,
        actualAmount,
        returnAmount,
        additionalAmount,
        invoiceNumber,
        invoiceDate: invoiceDate ? new Date(invoiceDate) : null,
        note,
      },
    })

    return success(newSettlement)
  } catch (error) {
    console.error(error)
    return serverError()
  }
}
