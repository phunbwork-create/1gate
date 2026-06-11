import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requirePermission, success, badRequest, serverError, getSearchParam } from "@/lib/api-helpers"
import { createWorkflowSchema } from "@/schemas/admin.schema"

// ─── GET /api/admin/workflows ────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const result = await requirePermission("admin.full", "workflow.read")
  if (result.error) return result.error

  try {
    const companyId = getSearchParam(req, "companyId")
    const entityType = getSearchParam(req, "entityType")

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}
    if (companyId) where.companyId = companyId
    if (entityType) where.entityType = entityType

    const workflows = await prisma.workflowConfig.findMany({
      where,
      include: {
        company: { select: { id: true, name: true, code: true } },
        steps: {
          include: {
            actorRole: { select: { id: true, name: true, displayName: true, color: true } },
          },
          orderBy: { stepOrder: "asc" },
        },
      },
      orderBy: [{ companyId: "asc" }, { entityType: "asc" }],
    })

    return success({ data: workflows })
  } catch (error) {
    console.error("GET /api/admin/workflows error:", error)
    return serverError()
  }
}

// ─── POST /api/admin/workflows ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const result = await requirePermission("admin.full", "workflow.create")
  if (result.error) return result.error

  try {
    const body = await req.json()
    const parsed = createWorkflowSchema.safeParse(body)

    if (!parsed.success) {
      return badRequest(parsed.error.issues.map(e => e.message).join(", "))
    }

    // Check if workflow already exists for this entity type + company
    const existing = await prisma.workflowConfig.findUnique({
      where: { entityType_companyId: { entityType: parsed.data.entityType, companyId: parsed.data.companyId } },
    })
    if (existing) {
      return badRequest(`Luồng cho loại "${parsed.data.entityType}" đã tồn tại cho công ty này. Hãy chỉnh sửa thay vì tạo mới.`)
    }

    const { steps, ...configData } = parsed.data

    const workflow = await prisma.workflowConfig.create({
      data: {
        ...configData,
        steps: {
          create: steps.map(s => ({
            stepOrder: s.stepOrder,
            name: s.name,
            type: s.type,
            actorRoleId: s.actorRoleId,
            icon: s.icon,
            description: s.description,
            conditionType: s.conditionType,
            conditionParam: s.conditionParam,
            conditionOp: s.conditionOp,
            conditionValue: s.conditionValue,
          })),
        },
      },
      include: {
        company: { select: { id: true, name: true, code: true } },
        steps: {
          include: {
            actorRole: { select: { id: true, name: true, displayName: true, color: true } },
          },
          orderBy: { stepOrder: "asc" },
        },
      },
    })

    return success(workflow, 201)
  } catch (error) {
    console.error("POST /api/admin/workflows error:", error)
    return serverError()
  }
}
