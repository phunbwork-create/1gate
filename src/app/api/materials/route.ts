import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireAuth, success, serverError, getPaginationParams, getSearchParam } from "@/lib/api-helpers"

// ─── GET /api/materials ─────────────────────────────────────────────────────
// Public read-only endpoint for material items (any authenticated user).
// Used by form dropdowns (material requests, purchase requests, etc.)
// This is SEPARATE from /api/admin/materials which requires Admin/Purchasing/Warehouse roles.
export async function GET(req: NextRequest) {
  const result = await requireAuth()
  if (result.error) return result.error

  try {
    const { skip, limit, page } = getPaginationParams(req)
    const search = getSearchParam(req, "search")
    const category = getSearchParam(req, "category")

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      // Scope to the user's company
      companyId: result.user.companyId,
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
      ]
    }
    if (category) where.category = category

    const [materials, total] = await Promise.all([
      prisma.materialItem.findMany({
        where,
        select: {
          id: true,
          code: true,
          name: true,
          unit: true,
          category: true,
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
    console.error("GET /api/materials error:", error)
    return serverError()
  }
}
