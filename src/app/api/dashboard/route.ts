import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { getAuthUser, success, serverError } from "@/lib/api-helpers"

export async function GET(_req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return serverError("Unauthorized")

  try {
    const isHoRole = ["ChiefAccountant", "Director", "Admin"].includes(user.role)
    const companyFilter = isHoRole ? {} : { companyId: user.companyId }

    // 1. Pending Approvals Logic
    // For simplicity, we just count things in PendingApproval status where the user is potentially the next approver.
    // In a real world scenario, we'd calculate stepIndex exactly. MVP:
    const paymentReqsPending = await prisma.paymentRequest.count({ 
      where: { ...companyFilter, status: "Submitted" } 
    })
    
    // 2. Financial Overview
    const executedPlans = await prisma.paymentPlan.findMany({
      where: { ...companyFilter, status: "Executed" },
      select: { items: { select: { amount: true } } }
    })
    
    let totalSpent = 0
    executedPlans.forEach(plan => {
      plan.items.forEach(item => totalSpent += Number(item.amount || 0))
    })

    const pendingAdvances = await prisma.advanceRequest.aggregate({
      where: { ...companyFilter, status: { in: ["Approved"] } },
      _sum: { amount: true }
    })
    const totalAdvanceDebt = Number(pendingAdvances._sum.amount || 0)

    // 3. Procurement Activity
    const recentProcurements = await prisma.procurementPlan.findMany({
      where: { ...companyFilter },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { code: true, title: true, status: true, createdAt: true, createdBy: { select: { name: true } } }
    })

    // 4. Monthly Spend Chart (Mock data distribution for the last 6 months based on totalSpent)
    const chartData = [
      { name: "T10", spend: Math.floor(totalSpent * 0.1) },
      { name: "T11", spend: Math.floor(totalSpent * 0.15) },
      { name: "T12", spend: Math.floor(totalSpent * 0.2) },
      { name: "T1", spend: Math.floor(totalSpent * 0.25) },
      { name: "T2", spend: Math.floor(totalSpent * 0.1) },
      { name: "T3", spend: Math.floor(totalSpent * 0.2) },
    ]

    return success({
      stats: {
        pendingApprovals: paymentReqsPending, // placeholder metric
        totalSpent,
        totalAdvanceDebt,
      },
      recentProcurements,
      chartData
    })
  } catch (error) {
    console.error("GET /api/dashboard error:", error)
    return serverError()
  }
}
