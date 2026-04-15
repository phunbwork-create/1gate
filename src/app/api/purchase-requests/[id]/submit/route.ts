import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireRole, success, badRequest, notFound, serverError } from "@/lib/api-helpers"
import { notifyWorkflow } from "@/lib/notification"
import { getApprovalChain } from "@/lib/permissions"

// ─── POST /api/purchase-requests/[id]/submit ─────────────────────────────────
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("Warehouse", "Purchasing", "DeptHead", "Admin")
  if (result.error) return result.error

  try {
    const { id } = await params
    const request = await prisma.purchaseRequest.findUnique({
      where: { id },
      include: { items: true },
    })

    if (!request) return notFound("Đề nghị mua hàng không tồn tại")
    if (request.status !== "Draft") return badRequest("Chỉ được trình ở trạng thái Nháp")
    if (request.createdById !== result.user.id && result.user.role !== "Admin") {
      return badRequest("Chỉ người tạo mới được trình duyệt")
    }
    if (request.items.length === 0) return badRequest("Đề nghị phải có ít nhất 1 hàng hóa")

    const updated = await prisma.purchaseRequest.update({
      where: { id },
      data: {
        status: "Submitted",
        isLocked: true,
        submittedAt: new Date(),
      },
      include: {
        company: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, name: true } },
      },
    })

    // Notify first approver in chain (DeptHead)
    const chain = getApprovalChain("purchaseRequest")
    const firstRole = chain[0]
    if (firstRole) {
      const approvers = await prisma.user.findMany({
        where: { role: firstRole, companyId: request.companyId, isActive: true },
        select: { id: true, name: true, email: true, telegramChatId: true },
      })
      await notifyWorkflow({
        entityCode: request.code,
        entityLabel: "Đề nghị Mua hàng",
        action: "submitted",
        actor: updated.createdBy.name,
        recipients: approvers,
      })
    }

    return success(updated)
  } catch (error) {
    console.error("POST /api/purchase-requests/[id]/submit error:", error)
    return serverError()
  }
}
