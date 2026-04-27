import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireRole, success, badRequest, serverError, getPaginationParams, getSearchParam } from "@/lib/api-helpers"
import { createProcurementPlanSchema } from "@/schemas/business.schema"
import { generateCode } from "@/lib/code-generator"

// ─── GET /api/procurement ────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const result = await requireRole("Staff", "DeptHead", "Director", "Admin")
  if (result.error) return result.error

  try {
    const { skip, limit, page } = getPaginationParams(req)
    const { searchParams } = new URL(req.url)
    const search = getSearchParam(req, "search")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    // ── Permission-based filtering ──────────────────────────────────────
    // Admin  → sees everything (optionally filter by companyId)
    // DeptHead → sees records from users in same company + same department
    // Others → sees only own records
    if (result.user.role === "Admin") {
      const companyId = getSearchParam(req, "companyId")
      if (companyId) where.companyId = companyId
    } else if (result.user.role === "DeptHead" && result.user.departmentId) {
      where.companyId = result.user.companyId
      where.createdBy = { departmentId: result.user.departmentId }
    } else {
      where.companyId = result.user.companyId
      where.createdById = result.user.id
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { contractCode: { contains: search, mode: "insensitive" } },
        { title: { contains: search, mode: "insensitive" } },
      ]
    }
    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) where.createdAt.gte = new Date(dateFrom)
      if (dateTo) {
        const end = new Date(dateTo); end.setHours(23, 59, 59, 999)
        where.createdAt.lte = end
      }
    }

    const [plans, total] = await Promise.all([
      prisma.procurementPlan.findMany({
        where,
        include: {
          company: { select: { id: true, name: true, code: true } },
          createdBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.procurementPlan.count({ where }),
    ])

    return success({
      data: plans,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error("GET /api/procurement error:", error)
    return serverError()
  }
}

// ─── POST /api/procurement ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const result = await requireRole("Staff", "DeptHead", "Director", "Admin")
  if (result.error) return result.error

  try {
    const body = await req.json()
    const parsed = createProcurementPlanSchema.safeParse(body)

    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((e) => e.message).join(", "))
    }

    const {
      items,
      contractType, partnerName, partnerTaxCode, partnerRepresentative,
      signDate, effectiveDate, expiryDate,
      contractValue, vatRate, currency,
      ...planData
    } = parsed.data

    // Serialize contract metadata into description as JSON
    const contractMeta = {
      contractType, partnerName, partnerTaxCode, partnerRepresentative,
      signDate, effectiveDate, expiryDate,
      contractValue, vatRate, currency: currency || "VND",
    }
    const descriptionWithMeta = JSON.stringify({
      note: planData.description || "",
      ...contractMeta,
    })

    // Get company code for code generation
    const company = await prisma.company.findUnique({
      where: { id: result.user.companyId },
      select: { code: true },
    })
    if (!company) return badRequest("Công ty không tồn tại")

    const code = await generateCode("procurement", company.code)

    const plan = await prisma.$transaction(async (tx) => {
      const created = await tx.procurementPlan.create({
        data: {
          code,
          contractCode: parsed.data.contractCode,
          title: planData.title,
          description: descriptionWithMeta,
          companyId: result.user.companyId,
          createdById: result.user.id,
          status: "Draft",
        },
      })

      if (items && items.length > 0) {
        await tx.procurementPlanItem.createMany({
          data: items.map((item) => ({
            planId: created.id,
            materialItemId: item.materialItemId || null,
            itemName: item.itemName,
            unit: item.unit,
            plannedQty: item.plannedQty,
            estimatedPrice: item.estimatedPrice || null,
            note: item.note || null,
          })),
        })
      }

      return tx.procurementPlan.findUnique({
        where: { id: created.id },
        include: {
          company: { select: { id: true, name: true, code: true } },
          createdBy: { select: { id: true, name: true } },
          items: true,
          attachments: true,
        },
      })
    })

    return success(plan, 201)
  } catch (error) {
    console.error("POST /api/procurement error:", error)
    return serverError()
  }
}
