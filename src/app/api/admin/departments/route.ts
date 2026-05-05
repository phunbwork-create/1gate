import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireRole, success, badRequest, serverError, getSearchParam } from "@/lib/api-helpers"
import { z } from "zod"

const createDepartmentSchema = z.object({
  name: z.string().min(2, "Tên phòng ban phải có ít nhất 2 ký tự"),
  code: z.string().min(1, "Mã phòng ban không được trống").max(10),
  companyId: z.string().min(1, "Vui lòng chọn công ty"),
})

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

// ─── POST /api/admin/departments ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const result = await requireRole("Admin")
  if (result.error) return result.error

  try {
    const body = await req.json()
    const parsed = createDepartmentSchema.safeParse(body)

    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((e) => e.message).join(", "))
    }

    // Check duplicate code within same company
    const exists = await prisma.department.findUnique({
      where: { code_companyId: { code: parsed.data.code, companyId: parsed.data.companyId } },
    })
    if (exists) return badRequest("Mã phòng ban đã tồn tại trong công ty này")

    const department = await prisma.department.create({
      data: parsed.data,
      include: {
        company: { select: { id: true, name: true, code: true } },
      },
    })

    return success(department, 201)
  } catch (error) {
    console.error("POST /api/admin/departments error:", error)
    return serverError()
  }
}
