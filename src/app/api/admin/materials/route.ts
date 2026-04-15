import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireRole, success, badRequest, serverError, getPaginationParams, getSearchParam } from "@/lib/api-helpers"
import { createMaterialItemSchema } from "@/schemas/admin.schema"

// ─── GET /api/admin/materials ────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const result = await requireRole("Admin", "Purchasing", "Warehouse")
  if (result.error) return result.error

  try {
    const { skip, limit, page } = getPaginationParams(req)
    const search = getSearchParam(req, "search")
    const category = getSearchParam(req, "category")
    const companyId = getSearchParam(req, "companyId")

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
      ]
    }
    if (category) where.category = category
    if (companyId) where.companyId = companyId

    const [materials, total] = await Promise.all([
      prisma.materialItem.findMany({
        where,
        include: {
          company: { select: { id: true, name: true, code: true } },
        },
        orderBy: { code: "asc" },
        skip,
        take: limit,
      }),
      prisma.materialItem.count({ where }),
    ])

    return success({
      data: materials,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error("GET /api/admin/materials error:", error)
    return serverError()
  }
}

// ─── POST /api/admin/materials ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const result = await requireRole("Admin", "Purchasing")
  if (result.error) return result.error

  try {
    const body = await req.json()
    const parsed = createMaterialItemSchema.safeParse(body)

    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((e) => e.message).join(", "))
    }

    const material = await prisma.materialItem.create({
      data: parsed.data,
      include: {
        company: { select: { id: true, name: true, code: true } },
      },
    })

    return success(material, 201)
  } catch (error) {
    console.error("POST /api/admin/materials error:", error)
    return serverError()
  }
}
