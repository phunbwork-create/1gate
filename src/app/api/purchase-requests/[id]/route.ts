import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireRole, success, badRequest, notFound, serverError } from "@/lib/api-helpers"
import { updatePurchaseRequestSchema } from "@/schemas/business.schema"

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("Warehouse", "Purchasing", "Accountant", "DeptHead", "Admin")
  if (result.error) return result.error

  try {
    const { id } = await params
    const request = await prisma.purchaseRequest.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, name: true, email: true, departmentId: true } },
        procurementPlan: { select: { id: true, code: true, title: true } },
        items: {
          include: { materialItem: { select: { id: true, code: true, name: true } } },
        },
        approvalSteps: {
          include: { approver: { select: { id: true, name: true } } },
          orderBy: { stepOrder: "asc" },
        },
      },
    })

    if (!request) return notFound("Đề nghị mua hàng không tồn tại")
    if (result.user.role !== "Admin" && request.companyId !== result.user.companyId) {
      return notFound("Đề nghị mua hàng không tồn tại")
    }

    const deptHeads = await prisma.user.findMany({
      where: { role: "DeptHead", companyId: request.companyId, departmentId: request.createdBy.departmentId },
      select: { name: true, email: true }
    })

    const accountants = await prisma.user.findMany({
      where: { role: "Accountant", companyId: request.companyId },
      select: { name: true, email: true }
    })

    const expectedApprovers = [
      { role: "DeptHead", users: deptHeads },
      { role: "Accountant", users: accountants }
    ]

    return success({ ...request, expectedApprovers })
  } catch (error) {
    console.error("GET /api/purchase-requests/[id] error:", error)
    return serverError()
  }
}

// ─── PATCH ───────────────────────────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("Warehouse", "Purchasing", "DeptHead", "Admin")
  if (result.error) return result.error

  try {
    const { id } = await params
    const existing = await prisma.purchaseRequest.findUnique({ where: { id } })

    if (!existing) return notFound("Đề nghị mua hàng không tồn tại")
    if (existing.status !== "Draft" && existing.status !== "Returned") {
      return badRequest("Chỉ được sửa ở trạng thái Nháp hoặc Trả lại")
    }
    if (existing.createdById !== result.user.id && result.user.role !== "Admin") {
      return badRequest("Chỉ người tạo mới được chỉnh sửa")
    }

    const body = await req.json()
    const parsed = updatePurchaseRequestSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((e) => e.message).join(", "))
    }

    const { items, ...data } = parsed.data

    const updated = await prisma.$transaction(async (tx) => {
      let newTotalAmount: number | null = null

      if (items) {
        await tx.purchaseRequestItem.deleteMany({ where: { purchaseRequestId: id } })
        await tx.purchaseRequestItem.createMany({
          data: items.map((item) => ({
            purchaseRequestId: id,
            materialItemId: item.materialItemId || null,
            itemName: item.itemName,
            unit: item.unit,
            quantity: item.quantity,
            unitPrice: item.unitPrice || null,
            totalPrice: item.unitPrice ? item.unitPrice * item.quantity : null,
            note: item.note || null,
          })),
        })
        newTotalAmount = items.reduce((sum, i) => sum + (i.unitPrice || 0) * i.quantity, 0)
      }

      await tx.purchaseRequest.update({
        where: { id },
        data: {
          ...data,
          ...(newTotalAmount !== null ? { totalAmount: newTotalAmount } : {}),
          status: "Draft",
          updatedAt: new Date(),
        },
      })

      return tx.purchaseRequest.findUnique({
        where: { id },
        include: {
          company: { select: { id: true, name: true, code: true } },
          createdBy: { select: { id: true, name: true } },
          items: true,
        },
      })
    })

    return success(updated)
  } catch (error) {
    console.error("PATCH /api/purchase-requests/[id] error:", error)
    return serverError()
  }
}

// ─── DELETE (Cancel) ─────────────────────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("Warehouse", "Purchasing", "DeptHead", "Admin")
  if (result.error) return result.error

  try {
    const { id } = await params
    const existing = await prisma.purchaseRequest.findUnique({ where: { id } })

    if (!existing) return notFound("Đề nghị mua hàng không tồn tại")
    if (existing.status !== "Draft") return badRequest("Chỉ được hủy ở trạng thái Nháp")
    if (existing.createdById !== result.user.id && result.user.role !== "Admin") {
      return badRequest("Chỉ người tạo mới được hủy")
    }

    await prisma.purchaseRequest.update({
      where: { id },
      data: { status: "Cancelled" },
    })

    return success({ message: "Đã hủy đề nghị mua hàng" })
  } catch (error) {
    console.error("DELETE /api/purchase-requests/[id] error:", error)
    return serverError()
  }
}
