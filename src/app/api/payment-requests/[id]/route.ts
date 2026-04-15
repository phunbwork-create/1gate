import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import {
  requireRole, success, badRequest, notFound, serverError,
} from "@/lib/api-helpers"
import { updatePaymentRequestSchema } from "@/schemas/business.schema"
import { getApprovalChain } from "@/lib/permissions"

const APPROVAL_CHAIN = getApprovalChain("paymentRequest")

// ─── GET /api/payment-requests/[id] ──────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole(
    "Staff", "Purchasing", "Accountant", "ChiefAccountant", "DeptHead", "Director", "Admin"
  )
  if (result.error) return result.error

  try {
    const { id } = await params

    const req = await prisma.paymentRequest.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        vendor: { select: { id: true, name: true, taxCode: true, bankAccount: true, bankName: true } },
        purchaseRequest: { select: { id: true, code: true } },
        approvalSteps: {
          include: { approver: { select: { id: true, name: true, email: true } } },
          orderBy: { stepOrder: "asc" },
        },
        attachments: true,
      },
    })

    if (!req) return notFound("Đề nghị thanh toán không tồn tại")

    if (result.user.role !== "Admin" && result.user.role !== "ChiefAccountant") {
      if (req.companyId !== result.user.companyId) return notFound("Đề nghị thanh toán không tồn tại")
    }

    // Attach expected approvers for PIC display
    const pendingRoles = APPROVAL_CHAIN.filter((role) => {
      const approved = req.approvalSteps.filter(
        (s) => s.action === "approve" && s.role === role
      )
      return approved.length === 0
    })

    const expectedApprovers = await Promise.all(
      pendingRoles.map(async (role) => {
        const users = await prisma.user.findMany({
          where: { role, companyId: req.companyId, isActive: true },
          select: { name: true, email: true },
        })
        return { role, users }
      })
    )

    return success({ ...req, expectedApprovers })
  } catch (error) {
    console.error("GET /api/payment-requests/[id] error:", error)
    return serverError()
  }
}

// ─── PATCH /api/payment-requests/[id] ────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole(
    "Staff", "Purchasing", "Accountant", "DeptHead", "Admin"
  )
  if (result.error) return result.error

  try {
    const { id } = await params
    const body = await req.json()
    const parsed = updatePaymentRequestSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((e) => e.message).join(", "))
    }

    const existing = await prisma.paymentRequest.findUnique({ where: { id } })
    if (!existing) return notFound("Đề nghị thanh toán không tồn tại")
    if (existing.companyId !== result.user.companyId && result.user.role !== "Admin") {
      return notFound("Đề nghị thanh toán không tồn tại")
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
    const updated = await prisma.paymentRequest.update({
      where: { id },
      data: {
        ...(data.vendorId !== undefined && { vendorId: data.vendorId }),
        ...(data.vendorName && { vendorName: data.vendorName }),
        ...(data.bankAccount !== undefined && { bankAccount: data.bankAccount }),
        ...(data.bankName !== undefined && { bankName: data.bankName }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.description && { description: data.description }),
        ...(data.invoiceScenario && { invoiceScenario: data.invoiceScenario }),
        ...(data.invoiceNumber !== undefined && { invoiceNumber: data.invoiceNumber }),
        ...(data.invoiceDate !== undefined && {
          invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : null,
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
    console.error("PATCH /api/payment-requests/[id] error:", error)
    return serverError()
  }
}
