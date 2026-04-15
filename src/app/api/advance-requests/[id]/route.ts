import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import {
  requireRole, success, badRequest, notFound, serverError,
} from "@/lib/api-helpers"
import { updateAdvanceRequestSchema } from "@/schemas/business.schema"
import { getApprovalChain } from "@/lib/permissions"

// ─── GET /api/advance-requests/[id] ──────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole(
    "Staff", "DeptHead", "ChiefAccountant", "Director", "Admin"
  )
  if (result.error) return result.error

  try {
    const { id } = await params

    const req = await prisma.advanceRequest.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        vendor: { select: { id: true, name: true } },
        approvalSteps: {
          include: { approver: { select: { id: true, name: true, email: true } } },
          orderBy: { stepOrder: "asc" },
        },
        attachments: true,
        settlements: { select: { id: true, code: true, status: true } },
      },
    })

    if (!req) return notFound("Đề nghị tạm ứng không tồn tại")

    const isHoRole = ["ChiefAccountant", "Director", "Admin"].includes(result.user.role)
    if (!isHoRole && req.companyId !== result.user.companyId) {
      return notFound("Đề nghị tạm ứng không tồn tại")
    }

    // Dynamic approval chain based on amount
    const amount = Number(req.amount)
    const chain = getApprovalChain("advanceRequest", amount)

    // Expected approvers: roles in chain that haven't approved yet
    const approvedRoles = req.approvalSteps
      .filter((s: { action: string | null }) => s.action === "approve")
      .map((s: { role: string }) => s.role)

    const pendingRoles = chain.filter((r) => !approvedRoles.includes(r))

    const expectedApprovers = await Promise.all(
      pendingRoles.map(async (role) => {
        const users = await prisma.user.findMany({
          where: { role, companyId: req.companyId, isActive: true },
          select: { name: true, email: true },
        })
        return { role, users }
      })
    )

    return success({ ...req, approvalChain: chain, expectedApprovers })
  } catch (error) {
    console.error("GET /api/advance-requests/[id] error:", error)
    return serverError()
  }
}

// ─── PATCH /api/advance-requests/[id] ────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("Staff", "DeptHead", "Admin")
  if (result.error) return result.error

  try {
    const { id } = await params
    const body = await req.json()
    const parsed = updateAdvanceRequestSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((e) => e.message).join(", "))
    }

    const existing = await prisma.advanceRequest.findUnique({ where: { id } })
    if (!existing) return notFound("Đề nghị tạm ứng không tồn tại")
    if (existing.companyId !== result.user.companyId && result.user.role !== "Admin") {
      return notFound("Đề nghị tạm ứng không tồn tại")
    }
    if (existing.createdById !== result.user.id && result.user.role !== "Admin") {
      return badRequest("Bạn không có quyền chỉnh sửa đề nghị này")
    }
    if (existing.isLocked) {
      return badRequest("Đề nghị đang bị khóa, không thể chỉnh sửa")
    }
    if (!["Draft", "Returned"].includes(existing.status)) {
      return badRequest("Chỉ có thể chỉnh sửa phiếu ở trạng thái Nháp hoặc Trả lại")
    }

    const data = parsed.data
    const updated = await prisma.advanceRequest.update({
      where: { id },
      data: {
        ...(data.vendorId !== undefined && { vendorId: data.vendorId }),
        ...(data.vendorName !== undefined && { vendorName: data.vendorName }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.purpose && { purpose: data.purpose }),
        ...(data.expectedReturnDate !== undefined && {
          expectedReturnDate: data.expectedReturnDate ? new Date(data.expectedReturnDate) : null,
        }),
      },
      include: {
        company: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, name: true } },
        vendor: { select: { id: true, name: true } },
      },
    })

    return success(updated)
  } catch (error) {
    console.error("PATCH /api/advance-requests/[id] error:", error)
    return serverError()
  }
}
