import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireRole, success, badRequest, serverError, getPaginationParams, getSearchParam } from "@/lib/api-helpers"
import { createMaterialRequestSchema } from "@/schemas/business.schema"
import { generateCode } from "@/lib/code-generator"
import { checkOverdueSettlements } from "@/lib/settlement-helper"

// ─── GET /api/material-requests ──────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const result = await requireRole("Staff", "DeptHead", "Warehouse", "Admin")
  if (result.error) return result.error

  try {
    const { skip, limit, page } = getPaginationParams(req)
    const { searchParams } = new URL(req.url)
    const search = getSearchParam(req, "search")
    const status = getSearchParam(req, "status")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")

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
        { purpose: { contains: search, mode: "insensitive" } },
      ]
    }
    if (status) where.status = status
    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) where.createdAt.gte = new Date(dateFrom)
      if (dateTo) {
        const end = new Date(dateTo); end.setHours(23, 59, 59, 999)
        where.createdAt.lte = end
      }
    }

    const [requests, total] = await Promise.all([
      prisma.materialRequest.findMany({
        where,
        include: {
          company: { select: { id: true, name: true, code: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          procurementPlan: { select: { id: true, code: true, title: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.materialRequest.count({ where }),
    ])

    return success({
      data: requests,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error("GET /api/material-requests error:", error)
    return serverError()
  }
}

// ─── POST /api/material-requests ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const result = await requireRole("Staff", "DeptHead", "Warehouse", "Admin")
  if (result.error) return result.error

  try {
    const body = await req.json()
    const parsed = createMaterialRequestSchema.safeParse(body)

    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((e) => e.message).join(", "))
    }

    const { items, requiredDate, ...reqData } = parsed.data

    const company = await prisma.company.findUnique({
      where: { id: result.user.companyId },
      select: { code: true },
    })
    if (!company) return badRequest("Công ty không tồn tại")

    // Check penalty (Quyết toán quá hạn)
    const hasOverdue = await checkOverdueSettlements(result.user.id, result.user.companyId, prisma)
    if (hasOverdue) {
      return badRequest("Bị khóa: Bạn đang có nợ quyết toán quá hạn. Vui lòng hoàn tất quyết toán trước khi tạo Đề xuất mới.")
    }

    const code = await generateCode("materialRequest", company.code)

    const request = await prisma.$transaction(async (tx) => {
      const created = await tx.materialRequest.create({
        data: {
          code,
          ...reqData,
          requiredDate: requiredDate ? new Date(requiredDate) : null,
          companyId: result.user.companyId,
          createdById: result.user.id,
          status: "Draft",
        },
      })

      if (items.length > 0) {
        await tx.materialRequestItem.createMany({
          data: items.map((item) => ({
            requestId: created.id,
            materialItemId: item.materialItemId || null,
            itemName: item.itemName,
            unit: item.unit,
            requestedQty: item.requestedQty,
            note: item.note || null,
          })),
        })
      }

      return tx.materialRequest.findUnique({
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
    console.error("POST /api/material-requests error:", error)
    return serverError()
  }
}
