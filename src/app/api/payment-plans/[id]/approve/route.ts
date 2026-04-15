import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireRole, success, badRequest, notFound, serverError } from "@/lib/api-helpers"
import { notifyWorkflow } from "@/lib/notification"

// Custom schema for payment plan approval which includes item level actions
import { z } from "zod"

const planApprovalSchema = z.object({
  action: z.enum(["approve", "reject"]),
  comment: z.string().optional().nullable(),
  rejectedItemIds: z.array(z.string()).optional(), // specific items rejected by director
})

const APPROVAL_CHAIN = ["ChiefAccountant", "Director"] as const

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("ChiefAccountant", "Director", "Admin")
  if (result.error) return result.error

  try {
    const { id } = await params
    const body = await req.json()
    const parsed = planApprovalSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((e) => e.message).join(", "))
    }

    const { action, comment, rejectedItemIds } = parsed.data

    const plan = await prisma.paymentPlan.findUnique({
      where: { id },
      include: { 
        approvalSteps: { orderBy: { stepOrder: "asc" } },
        items: true,
        createdBy: { select: { id: true, name: true, email: true, telegramChatId: true } },
      },
    })

    if (!plan) return notFound("Kế hoạch thanh toán không tồn tại")
    
    if (!["PendingChiefAccountant", "PendingDirector"].includes(plan.status)) {
      return badRequest("Kế hoạch chưa trong trạng thái chờ duyệt")
    }
    if (result.user.role !== "Admin" && plan.companyId !== result.user.companyId) {
      return notFound("Kế hoạch thanh toán không tồn tại")
    }

    const currentStepIndex = plan.status === "PendingChiefAccountant" ? 0 : 1
    const expectedRole = APPROVAL_CHAIN[currentStepIndex]

    if (result.user.role !== expectedRole && result.user.role !== "Admin") {
      return badRequest(`Bước duyệt hiện tại cần vai trò ${expectedRole}`)
    }

    await prisma.$transaction(async (tx) => {
      // Create approval step
      await tx.approvalStep.create({
        data: {
          paymentPlanId: id,
          approverId: result.user.id,
          role: expectedRole,
          stepOrder: plan.approvalSteps.length + 1,
          action,
          comment: comment || null,
          actedAt: new Date(),
        },
      })

      if (action === "reject") {
        await tx.paymentPlan.update({
          where: { id },
          data: { status: "Rejected" },
        })
        
        // Mark all items as rejected
        await tx.paymentPlanItem.updateMany({
          where: { planId: id },
          data: { status: "Rejected" }
        })
      } else if (action === "approve") {
        const isDirector = expectedRole === "Director"
        
        if (isDirector) {
          // Director approval implies partial or full approval based on items
          let hasApprovedItems = false
          let hasRejectedItems = false

          for (const item of plan.items) {
            const isRejected = rejectedItemIds?.includes(item.id)
            await tx.paymentPlanItem.update({
              where: { id: item.id },
              data: { 
                status: isRejected ? "Rejected" : "Approved",
                directorAction: isRejected ? "Reject" : "Approve"
              }
            })
            if (isRejected) hasRejectedItems = true; else hasApprovedItems = true;
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let finalStatus: any = "Approved"
          if (!hasApprovedItems) finalStatus = "Rejected"
          else if (hasRejectedItems) finalStatus = "PartiallyApproved"

          await tx.paymentPlan.update({
            where: { id },
            data: {
              status: finalStatus,
              directorApprovedAt: new Date(),
            },
          })
        } else {
          // Chief Accountant approves → forward to Director
          await tx.paymentPlan.update({
            where: { id },
            data: {
              status: "PendingDirector",
              chiefApprovedAt: new Date(),
            },
          })
        }
      }
    })

    // Notify creator and next approver
    const actor = await prisma.user.findUnique({
      where: { id: result.user.id },
      select: { name: true },
    })

    // Notify creator about the decision
    await notifyWorkflow({
      entityCode: plan.code,
      entityLabel: "Kế hoạch Thanh toán",
      action: action as "approved" | "rejected",
      actor: actor?.name || result.user.id,
      comment,
      recipients: [plan.createdBy],
    })

    // If ChiefAccountant approved, also notify Director
    if (action === "approve" && expectedRole === "ChiefAccountant") {
      const directors = await prisma.user.findMany({
        where: { role: "Director", companyId: plan.companyId, isActive: true },
        select: { id: true, name: true, email: true, telegramChatId: true },
      })
      await notifyWorkflow({
        entityCode: plan.code,
        entityLabel: "Kế hoạch Thanh toán",
        action: "submitted",
        actor: actor?.name || result.user.id,
        comment: "Kế Toán Trưởng đã duyệt, chuyển Giám Đốc phê duyệt.",
        recipients: directors,
      })
    }

    return success({ message: "Duyệt thành công" })
  } catch (error) {
    console.error(error)
    return serverError()
  }
}
