import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireRole, success, badRequest, notFound, serverError } from "@/lib/api-helpers"
import { notifyWorkflow } from "@/lib/notification"

// ─── POST /api/material-requests/[id]/submit ─────────────────────────────────
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("Staff", "DeptHead", "Warehouse", "Admin")
  if (result.error) return result.error

  try {
    const { id } = await params
    const request = await prisma.materialRequest.findUnique({
      where: { id },
      include: { items: true },
    })

    if (!request) return notFound("Đề nghị không tồn tại")
    if (request.status !== "Draft") return badRequest("Chỉ được trình ở trạng thái Nháp")
    if (request.createdById !== result.user.id && result.user.role !== "Admin") {
      return badRequest("Chỉ người tạo mới được trình duyệt")
    }
    if (request.items.length === 0) return badRequest("Đề nghị phải có ít nhất 1 vật tư")

    const updated = await prisma.materialRequest.update({
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

    // Notify DeptHead for approval
    const approvers = await prisma.user.findMany({
      where: { role: "DeptHead", companyId: request.companyId, isActive: true },
      select: { id: true, name: true, email: true, telegramChatId: true },
    })
    await notifyWorkflow({
      entityCode: request.code,
      entityLabel: "Đề nghị Vật tư",
      action: "submitted",
      actor: updated.createdBy.name,
      recipients: approvers,
    })

    return success(updated)
  } catch (error) {
    console.error("POST /api/material-requests/[id]/submit error:", error)
    return serverError()
  }
}
