import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import {
  requireRole, success, badRequest, serverError,
  getPaginationParams, getSearchParam,
} from "@/lib/api-helpers"
import { createAdvanceRequestSchema } from "@/schemas/business.schema"
import { generateCode } from "@/lib/code-generator"

// ─── GET /api/advance-requests ────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const result = await requireRole(
    "Staff", "DeptHead", "ChiefAccountant", "Director", "Admin"
  )
  if (result.error) return result.error

  try {
    const { skip, limit, page } = getPaginationParams(req)
    const search = getSearchParam(req, "search")
    const status = getSearchParam(req, "status")

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    // HO roles (ChiefAccountant, Director, Admin) see all companies
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
