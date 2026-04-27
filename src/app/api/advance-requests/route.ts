import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import {
  requireRole, success, badRequest, serverError,
  getPaginationParams, getSearchParam,
} from "@/lib/api-helpers"
import { createAdvanceRequestSchema } from "@/schemas/business.schema"
import { generateCode } from "@/lib/code-generator"
import { checkOverdueSettlements } from "@/lib/settlement-helper"

// ─── GET /api/advance-requests ────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const result = await requireRole(
    "Staff", "DeptHead", "ChiefAccountant", "Director", "Admin"
  )
  if (result.error) return result.error

  try {
    const { skip, limit, page } = getPaginationParams(req)
    const { searchParams } = new URL(req.url)
    const search = getSearchParam(req, "search")
    const status = getSearchParam(req, "status")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    const amountMin = searchParams.get("amountMin")
    const amountMax = searchParams.get("amountMax")

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    const isHoRole = ["ChiefAccountant", "Director", "Admin"].includes(result.user.role)
    if (!isHoRole) {
      where.companyId = result.user.companyId
    } else {
      const companyId = getSearchParam(req, "companyId")
      if (companyId) where.companyId = companyId
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { purpose: { contains: search, mode: "insensitive" } },
        { vendorName: { contains: search, mode: "insensitive" } },
      ]
    }
    if (status) where.status = status
    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) where.createdAt.gte = new Date(dateFrom)
      if (dateTo) {
        const end = new Date(dateTo)
        end.setHours(23, 59, 59, 999)
        where.createdAt.lte = end
      }
    }
    if (amountMin || amountMax) {
      where.amount = {}
      if (amountMin) where.amount.gte = Number(amountMin)
      if (amountMax) where.amount.lte = Number(amountMax)
    }

    const [data, total] = await Promise.all([
      prisma.advanceRequest.findMany({
        where,
        include: {
          company: { select: { id: true, name: true, code: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          vendor: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.advanceRequest.count({ where }),
    ])

    return success({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error("GET /api/advance-requests error:", error)
    return serverError()
  }
}


// ─── POST /api/advance-requests ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const result = await requireRole("Staff", "DeptHead", "Admin")
  if (result.error) return result.error

  try {
    const body = await req.json()
    const parsed = createAdvanceRequestSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((e) => e.message).join(", "))
    }

    const data = parsed.data
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

    const code = await generateCode("advanceRequest", company.code)

    const created = await prisma.advanceRequest.create({
      data: {
        code,
        companyId: result.user.companyId,
        createdById: result.user.id,
        vendorId: data.vendorId || null,
        vendorName: data.vendorName || null,
        amount: data.amount,
        purpose: data.purpose,
        expectedReturnDate: data.expectedReturnDate ? new Date(data.expectedReturnDate) : null,
        invoiceScenario: "InvoiceLater",
        status: "Draft",
      },
      include: {
        company: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, name: true } },
        vendor: { select: { id: true, name: true } },
      },
    })

    return success(created, 201)
  } catch (error) {
    console.error("POST /api/advance-requests error:", error)
    return serverError()
  }
}
