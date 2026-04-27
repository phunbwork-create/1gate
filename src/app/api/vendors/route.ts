import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireAuth, success, serverError, getPaginationParams, getSearchParam } from "@/lib/api-helpers"

// ─── GET /api/vendors ───────────────────────────────────────────────────────
// Public read-only endpoint for vendors (any authenticated user).
// Used by form dropdowns (purchase requests, payment requests, etc.)
// This is SEPARATE from /api/admin/vendors which requires Admin/Purchasing/Accountant roles.
export async function GET(req: NextRequest) {
  const result = await requireAuth()
  if (result.error) return result.error

  try {
    const { skip, limit, page } = getPaginationParams(req)
    const search = getSearchParam(req, "search")

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      companyId: result.user.companyId,
      isActive: true,
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { taxCode: { contains: search, mode: "insensitive" } },
      ]
    }

    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        select: {
          id: true,
          name: true,
          taxCode: true,
          bankAccount: true,
          bankName: true,
        },
        orderBy: { name: "asc" },
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
    console.error("GET /api/vendors error:", error)
    return serverError()
  }
}
