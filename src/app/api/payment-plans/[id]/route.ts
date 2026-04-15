import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireAuth, success, notFound, serverError } from "@/lib/api-helpers"
import { Role } from "@prisma/client"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth()
  if (result.error) return result.error

  try {
    const { id } = await params

    const reqDetail = await prisma.paymentPlan.findUnique({
      where: { id },
      include: {
        company: { select: { code: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        items: {
          include: {
            advanceRequest: { select: { code: true, purpose: true, vendorName: true } },
            paymentRequest: { select: { code: true, description: true, vendorName: true } }
          }
        },
        approvalSteps: {
          orderBy: { stepOrder: "asc" },
          include: {
            approver: { select: { id: true, name: true, email: true } },
          },
        },
      },
    })

    if (!reqDetail) return notFound("Kế hoạch thanh toán không tồn tại")
    if (result.user.role !== "Admin" && reqDetail.companyId !== result.user.companyId) {
      return notFound("Kế hoạch thanh toán không tồn tại")
    }

    // Determine expected approvers
    let expectedApprovers: { role: Role; users: { name: string; email: string }[] }[] = []
    if (reqDetail.status === "PendingChiefAccountant" || reqDetail.status === "PendingDirector" || reqDetail.status === "Draft") {
      const CHAIN: Role[] = ["ChiefAccountant", "Director"]
      
      const promises = CHAIN.map(async (role) => {
        const users = await prisma.user.findMany({
          where: { role, companyId: reqDetail.companyId, isActive: true },
          select: { name: true, email: true }
        })
        return { role, users }
      })
      
      expectedApprovers = await Promise.all(promises)
    }

    return success({
      ...reqDetail,
      expectedApprovers
    })
  } catch (error) {
    console.error(error)
    return serverError()
  }
}
