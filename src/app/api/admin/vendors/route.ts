import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireRole, success, badRequest, serverError, getPaginationParams, getSearchParam } from "@/lib/api-helpers"
import { createVendorSchema } from "@/schemas/admin.schema"

// ─── GET /api/admin/vendors ──────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const result = await requireRole("Admin", "Purchasing", "Accountant", "ChiefAccountant")
  if (result.error) return result.error

  try {
    const { skip, limit, page } = getPaginationParams(req)
    const search = getSearchParam(req, "search")
    const companyId = getSearchParam(req, "companyId")

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { taxCode: { contains: search, mode: "insensitive" } },
      ]
    }
    if (companyId) where.companyId = companyId

    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        include: {
          company: { select: { id: true, name: true, code: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.vendor.count({ where }),
    ])

    return success({
      data: vendors,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error("GET /api/admin/vendors error:", error)
    return serverError()
  }
}

// ─── POST /api/admin/vendors ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const result = await requireRole("Admin", "Purchasing")
  if (result.error) return result.error

  try {
    const body = await req.json()
    const parsed = createVendorSchema.safeParse(body)

    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((e) => e.message).join(", "))
    }

    const vendor = await prisma.vendor.create({
      data: parsed.data,
      include: {
        company: { select: { id: true, name: true, code: true } },
      },
    })

    return success(vendor, 201)
  } catch (error) {
    console.error("POST /api/admin/vendors error:", error)
    return serverError()
  }
}
