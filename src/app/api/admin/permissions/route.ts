import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requirePermission, success, serverError } from "@/lib/api-helpers"

// ─── GET /api/admin/permissions ──────────────────────────────────────────────
// Lists all available permissions, grouped
export async function GET(req: NextRequest) {
  const result = await requirePermission("admin.full", "role.read")
  if (result.error) return result.error

  try {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ group: "asc" }, { resource: "asc" }, { action: "asc" }],
    })

    return success({ data: permissions })
  } catch (error) {
    console.error("GET /api/admin/permissions error:", error)
    return serverError()
  }
}
