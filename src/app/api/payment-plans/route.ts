import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { getAuthUser, success, badRequest, serverError } from "@/lib/api-helpers"
import { createPaymentPlanSchema } from "@/schemas/business.schema"

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return badRequest("Unauthorized")

  try {
    const list = await prisma.paymentPlan.findMany({
      where: { companyId: user.companyId },
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    })
    return success(list)
  } catch (error) {
    console.error(error)
    return serverError()
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return badRequest("Unauthorized")

  // Normally only Accountant/ChiefAccountant can create, but allowing logic handled by UI
  if (!["Accountant", "ChiefAccountant", "Admin"].includes(user.role)) {
    return badRequest("Chỉ kế toán trưởng hoặc kế toán viên mới được lập kế hoạch dòng tiền")
  }

  try {
    const body = await req.json()
    const parsed = createPaymentPlanSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((e) => e.message).join(", "))
    }

    const { plannedDate, items, note } = parsed.data
    const totalAmount = items.reduce((acc, item) => acc + item.amount, 0)

    // Code generation
    const today = new Date()
    const prefix = `KHTT${today.toISOString().slice(2, 4)}${today.toISOString().slice(5, 7)}${today.toISOString().slice(8, 10)}`
    const count = await prisma.paymentPlan.count({
      where: { code: { startsWith: prefix } },
    })
    const code = `${prefix}${(count + 1).toString().padStart(4, "0")}`

    const plan = await prisma.$transaction(async (tx) => {
      // Create payment plan
      const newPlan = await tx.paymentPlan.create({
        data: {
          code,
          companyId: user.companyId,
          createdById: user.id,
          plannedDate: plannedDate ? new Date(plannedDate) : null,
          totalAmount,
          note,
          status: "Draft", // Always create draft first then submit later, or submit immediately? Let's just create.
        },
      })

      // Link items
      const itemData = items.map((i) => ({
        planId: newPlan.id,
        paymentRequestId: i.type === "Payment" ? i.id : null,
        advanceRequestId: i.type === "Advance" ? i.id : null,
        originalAmount: i.amount,
        status: "Pending" as const
      }))

      await tx.paymentPlanItem.createMany({ data: itemData })

      return newPlan
    })

    return success(plan)
  } catch (error) {
    console.error(error)
    return serverError()
  }
}
