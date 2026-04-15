import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireRole, success, serverError, getSearchParam } from "@/lib/api-helpers"

// ─── GET /api/admin/departments ──────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const result = await requireRole("Admin")
  if (result.error) return result.error

  try {
    const companyId = getSearchParam(req, "companyId")

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}
    if (companyId) where.companyId = companyId

    const departments = await prisma.department.findMany({
      where,
      include: {
        company: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ company: { code: "asc" } }, { name: "asc" }],
    })

    return success({ data: departments })
  } catch (error) {
    console.error("GET /api/admin/departments error:", error)
    return serverError()
  }
}
