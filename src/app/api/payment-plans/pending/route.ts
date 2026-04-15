import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireRole, success, badRequest, serverError } from "@/lib/api-helpers"

export async function GET(req: NextRequest) {
  const result = await requireRole("Accountant", "ChiefAccountant", "Director", "Admin")
  if (result.error) return result.error

  try {
    const user = result.user

    // Fetch approved Payment Requests (F-05) not linked to any active payment plan
    const paymentReqs = await prisma.paymentRequest.findMany({
      where: {
        companyId: user.companyId,
        status: "Approved",
        paymentPlanItems: {
          none: {
            OR: [
              { status: "Pending" },
              { status: "Approved" },
              { plan: { status: { not: "Rejected" } } }
            ]
          }
        }
      },
      include: {
        createdBy: { select: { name: true } },
      }
    })

    // Fetch approved Advance Requests (F-06) not linked to any active payment plan
    const advanceReqs = await prisma.advanceRequest.findMany({
      where: {
        companyId: user.companyId,
        status: "Approved",
        paymentPlanItems: {
          none: {
            OR: [
              { status: "Pending" },
              { status: "Approved" },
              { plan: { status: { not: "Rejected" } } }
            ]
          }
        }
      },
      include: {
        createdBy: { select: { name: true } },
      }
    })

    const unifiedList = [
      ...paymentReqs.map(pr => ({
        id: pr.id,
        code: pr.code,
        type: "Payment",
        amount: Number(pr.amount),
        purpose: pr.description,
        vendorName: pr.vendorName,
        createdAt: pr.createdAt,
        createdBy: pr.createdBy.name,
      })),
      ...advanceReqs.map(ar => ({
        id: ar.id,
        code: ar.code,
        type: "Advance",
        amount: Number(ar.amount),
        purpose: ar.purpose,
        vendorName: ar.vendorName,
        createdAt: ar.createdAt,
        createdBy: ar.createdBy.name,
      }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return success(unifiedList)
  } catch (error) {
    console.error(error)
    return serverError()
  }
}
