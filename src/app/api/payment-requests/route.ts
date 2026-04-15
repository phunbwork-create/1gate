import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import {
  requireRole, success, badRequest, serverError,
  getPaginationParams, getSearchParam,
} from "@/lib/api-helpers"
import { createPaymentRequestSchema } from "@/schemas/business.schema"
import { generateCode } from "@/lib/code-generator"

// ─── GET /api/payment-requests ────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const result = await requireRole(
    "Staff", "Purchasing", "Accountant", "ChiefAccountant", "DeptHead", "Admin"
  )
  if (result.error) return result.error

  try {
    const { skip, limit, page } = getPaginationParams(req)
    const search = getSearchParam(req, "search")
    const status = getSearchParam(req, "status")

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    if (result.user.role !== "Admin" && result.user.role !== "ChiefAccountant") {
      where.companyId = result.user.companyId
    } else {
      const companyId = getSearchParam(req, "companyId")
      if (companyId) where.companyId = companyId
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { vendorName: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }
    if (status) where.status = status

    const [data, total] = await Promise.all([
      prisma.paymentRequest.findMany({
        where,
        include: {
          company: { select: { id: true, name: true, code: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          vendor: { select: { id: true, name: true, taxCode: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.paymentRequest.count({ where }),
    ])

    return success({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error("GET /api/payment-requests error:", error)
    return serverError()
  }
}

// ─── POST /api/payment-requests ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const result = await requireRole(
    "Staff", "Purchasing", "Accountant", "DeptHead", "Admin"
  )
  if (result.error) return result.error

  try {
    const body = await req.json()
    const parsed = createPaymentRequestSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((e) => e.message).join(", "))
    }

    const data = parsed.data

    const company = await prisma.company.findUnique({
      where: { id: result.user.companyId },
      select: { code: true },
    })
    if (!company) return badRequest("Công ty không tồn tại")

    // Invoice duplicate check
    if (data.invoiceScenario === "HasInvoice" && data.invoiceNumber) {
      const vendor = data.vendorId
        ? await prisma.vendor.findUnique({ where: { id: data.vendorId }, select: { taxCode: true } })
        : null

      const duplicate = await prisma.paymentRequest.findFirst({
        where: {
          invoiceNumber: data.invoiceNumber,
          ...(vendor?.taxCode
            ? { vendor: { taxCode: vendor.taxCode } }
            : {}),
          status: { notIn: ["Cancelled", "Rejected"] },
        },
        select: { code: true },
      })

      if (duplicate) {
        return badRequest(`Số hóa đơn ${data.invoiceNumber} đã tồn tại trên phiếu ${duplicate.code}`)
      }
    }

    const code = await generateCode("paymentRequest", company.code)

    const created = await prisma.paymentRequest.create({
      data: {
        code,
        companyId: result.user.companyId,
        createdById: result.user.id,
        purchaseRequestId: data.purchaseRequestId || null,
        vendorId: data.vendorId || null,
        vendorName: data.vendorName,
        bankAccount: data.bankAccount || null,
        bankName: data.bankName || null,
        amount: data.amount,
        description: data.description,
        invoiceScenario: data.invoiceScenario,
        invoiceNumber: data.invoiceNumber || null,
        invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : null,
        status: "Draft",
      },
      include: {
        company: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, name: true } },
        vendor: { select: { id: true, name: true, taxCode: true } },
      },
    })

    return success(created, 201)
  } catch (error) {
    console.error("POST /api/payment-requests error:", error)
    return serverError()
  }
}
