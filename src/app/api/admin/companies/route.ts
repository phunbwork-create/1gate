import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireRole, success, badRequest, serverError, getPaginationParams, getSearchParam } from "@/lib/api-helpers"
import { createCompanySchema } from "@/schemas/admin.schema"

// ─── GET /api/admin/companies ────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const result = await requireRole("Admin")
  if (result.error) return result.error

  try {
    const { skip, limit, page } = getPaginationParams(req)
    const search = getSearchParam(req, "search")

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
      ]
    }

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        include: {
          _count: { select: { users: true, departments: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.company.count({ where }),
    ])

    return success({
      data: companies,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error("GET /api/admin/companies error:", error)
    return serverError()
  }
}

// ─── POST /api/admin/companies ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const result = await requireRole("Admin")
  if (result.error) return result.error

  try {
    const body = await req.json()
    const parsed = createCompanySchema.safeParse(body)

    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((e) => e.message).join(", "))
    }

    // Check duplicate code
    const exists = await prisma.company.findUnique({ where: { code: parsed.data.code } })
    if (exists) return badRequest("Mã công ty đã tồn tại")

    const company = await prisma.company.create({
      data: parsed.data,
      include: { _count: { select: { users: true, departments: true } } },
    })

    return success(company, 201)
  } catch (error) {
    console.error("POST /api/admin/companies error:", error)
    return serverError()
  }
}
