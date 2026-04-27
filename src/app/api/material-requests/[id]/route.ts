import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireRole, success, badRequest, notFound, serverError } from "@/lib/api-helpers"
import { updateMaterialRequestSchema } from "@/schemas/business.schema"

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("Staff", "DeptHead", "Warehouse", "Admin")
  if (result.error) return result.error

  try {
    const { id } = await params
    const request = await prisma.materialRequest.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, name: true, email: true, departmentId: true } },
        procurementPlan: {
          select: {
            id: true, code: true, contractCode: true, title: true, description: true,
            attachments: {
              select: {
                id: true, fileName: true, fileUrl: true,
                fileSize: true, mimeType: true, documentType: true, uploadedAt: true,
              },
              orderBy: { uploadedAt: "desc" as const },
            },
          },
        },
        items: {
          include: { materialItem: { select: { id: true, code: true, name: true } } },
        },
        approvalSteps: {
          include: { approver: { select: { id: true, name: true } } },
          orderBy: { stepOrder: "asc" },
        },
      },
    })

    if (!request) return notFound("Đề nghị không tồn tại")
    if (result.user.role !== "Admin" && request.companyId !== result.user.companyId) {
      return notFound("Đề nghị không tồn tại")
    }

    const deptHeads = await prisma.user.findMany({
      where: { role: "DeptHead", companyId: request.companyId, departmentId: request.createdBy.departmentId },
      select: { name: true, email: true }
    })

    const expectedApprovers = [
      { role: "DeptHead", users: deptHeads }
    ]

    return success({ ...request, expectedApprovers })
  } catch (error) {
    console.error("GET /api/material-requests/[id] error:", error)
    return serverError()
  }
}

// ─── PATCH ───────────────────────────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("Staff", "DeptHead", "Warehouse", "Admin")
  if (result.error) return result.error

  try {
    const { id } = await params
    const existing = await prisma.materialRequest.findUnique({ where: { id } })

    if (!existing) return notFound("Đề nghị không tồn tại")
    if (existing.status !== "Draft" && existing.status !== "Returned") {
      return badRequest("Chỉ được sửa ở trạng thái Nháp hoặc Trả lại")
    }
    if (existing.createdById !== result.user.id && result.user.role !== "Admin") {
      return badRequest("Chỉ người tạo mới được chỉnh sửa")
    }

    const body = await req.json()
    const parsed = updateMaterialRequestSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((e) => e.message).join(", "))
    }

    const { items, requiredDate, ...data } = parsed.data

    const updated = await prisma.$transaction(async (tx) => {
      await tx.materialRequest.update({
        where: { id },
        data: {
          ...data,
          requiredDate: requiredDate ? new Date(requiredDate) : existing.requiredDate,
          status: "Draft", // Reset if returned
          updatedAt: new Date(),
        },
      })

      if (items) {
        await tx.materialRequestItem.deleteMany({ where: { requestId: id } })
        await tx.materialRequestItem.createMany({
          data: items.map((item) => ({
            requestId: id,
            materialItemId: item.materialItemId || null,
            itemName: item.itemName,
            unit: item.unit,
            requestedQty: item.requestedQty,
            note: item.note || null,
          })),
        })
      }

      return tx.materialRequest.findUnique({
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
    console.error("PATCH /api/material-requests/[id] error:", error)
    return serverError()
  }
}

// ─── DELETE (Cancel) ─────────────────────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("Staff", "DeptHead", "Admin")
  if (result.error) return result.error

  try {
    const { id } = await params
    const existing = await prisma.materialRequest.findUnique({ where: { id } })

    if (!existing) return notFound("Đề nghị không tồn tại")
    if (existing.status !== "Draft") return badRequest("Chỉ được hủy ở trạng thái Nháp")
    if (existing.createdById !== result.user.id && result.user.role !== "Admin") {
      return badRequest("Chỉ người tạo mới được hủy")
    }

    await prisma.materialRequest.update({
      where: { id },
      data: { status: "Cancelled" },
    })

    return success({ message: "Đã hủy đề nghị" })
  } catch (error) {
    console.error("DELETE /api/material-requests/[id] error:", error)
    return serverError()
  }
}
