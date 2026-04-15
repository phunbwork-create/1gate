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
    const search = getSearchParam(req, "search")
    const status = getSearchParam(req, "status")

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    // Company scope: non-Admin only sees own company
    if (result.user.role !== "Admin") {
      where.companyId = result.user.companyId
    } else {
      const companyId = getSearchParam(req, "companyId")
      if (companyId) where.companyId = companyId
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { title: { contains: search, mode: "insensitive" } },
      ]
    }
    if (status) where.status = status

    const [plans, total] = await Promise.all([
      prisma.procurementPlan.findMany({
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

    const { items, ...planData } = parsed.data

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
          ...planData,
          companyId: result.user.companyId,
          createdById: result.user.id,
          status: "Draft",
        },
      })

      if (items.length > 0) {
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
        },
      })
    })

    return success(plan, 201)
  } catch (error) {
    console.error("POST /api/procurement error:", error)
    return serverError()
  }
}
