import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireRole, success, badRequest, serverError, getPaginationParams, getSearchParam } from "@/lib/api-helpers"
import { createPurchaseRequestSchema } from "@/schemas/business.schema"
import { generateCode } from "@/lib/code-generator"

// ─── GET /api/purchase-requests ──────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const result = await requireRole("Warehouse", "Purchasing", "Accountant", "DeptHead", "Admin")
  if (result.error) return result.error

  try {
    const { skip, limit, page } = getPaginationParams(req)
    const search = getSearchParam(req, "search")
    const status = getSearchParam(req, "status")

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    if (result.user.role !== "Admin") {
      where.companyId = result.user.companyId
    } else {
      const companyId = getSearchParam(req, "companyId")
      if (companyId) where.companyId = companyId
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { vendorName: { contains: search, mode: "insensitive" } },
      ]
    }
    if (status) where.status = status

    const [requests, total] = await Promise.all([
      prisma.purchaseRequest.findMany({
        where,
        include: {
          company: { select: { id: true, name: true, code: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.purchaseRequest.count({ where }),
    ])

    return success({
      data: requests,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error("GET /api/purchase-requests error:", error)
    return serverError()
  }
}

// ─── POST /api/purchase-requests ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const result = await requireRole("Warehouse", "Purchasing", "DeptHead", "Admin")
  if (result.error) return result.error

  try {
    const body = await req.json()
    const parsed = createPurchaseRequestSchema.safeParse(body)

    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((e) => e.message).join(", "))
    }

    const { items, ...reqData } = parsed.data

    const company = await prisma.company.findUnique({
      where: { id: result.user.companyId },
      select: { code: true },
    })
    if (!company) return badRequest("Công ty không tồn tại")

    const code = await generateCode("purchaseRequest", company.code)

    // Calculate total amount
    const totalAmount = items.reduce((sum, item) => {
      const total = (item.unitPrice || 0) * item.quantity
      return sum + total
    }, 0)

    const request = await prisma.$transaction(async (tx) => {
      const created = await tx.purchaseRequest.create({
        data: {
          code,
          ...reqData,
          companyId: result.user.companyId,
          createdById: result.user.id,
          totalAmount,
          status: "Draft",
        },
      })

      if (items.length > 0) {
        await tx.purchaseRequestItem.createMany({
          data: items.map((item) => ({
            purchaseRequestId: created.id,
            materialItemId: item.materialItemId || null,
            itemName: item.itemName,
            unit: item.unit,
            quantity: item.quantity,
            unitPrice: item.unitPrice || null,
            totalPrice: item.unitPrice ? item.unitPrice * item.quantity : null,
            note: item.note || null,
          })),
        })
      }

      return tx.purchaseRequest.findUnique({
        where: { id: created.id },
        include: {
          company: { select: { id: true, name: true, code: true } },
          createdBy: { select: { id: true, name: true } },
          items: true,
        },
      })
    })

    return success(request, 201)
  } catch (error) {
    console.error("POST /api/purchase-requests error:", error)
    return serverError()
  }
}
