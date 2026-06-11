import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requirePermission, success, badRequest, notFound, serverError } from "@/lib/api-helpers"
import { updateWorkflowSchema } from "@/schemas/admin.schema"

// ─── GET /api/admin/workflows/[id] ───────────────────────────────────────────
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requirePermission("admin.full", "workflow.read")
  if (result.error) return result.error

  try {
    const { id } = await params
    const workflow = await prisma.workflowConfig.findUnique({
      where: { id },
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

    if (!workflow) return notFound("Luồng nghiệp vụ không tồn tại")
    return success(workflow)
  } catch (error) {
    console.error("GET /api/admin/workflows/[id] error:", error)
    return serverError()
  }
}

// ─── PUT /api/admin/workflows/[id] ───────────────────────────────────────────
// Full update: replace steps entirely
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requirePermission("admin.full", "workflow.update")
  if (result.error) return result.error

  try {
    const { id } = await params
    const body = await req.json()
    const parsed = updateWorkflowSchema.safeParse(body)

    if (!parsed.success) {
      return badRequest(parsed.error.issues.map(e => e.message).join(", "))
    }

    const existing = await prisma.workflowConfig.findUnique({ where: { id } })
    if (!existing) return notFound("Luồng nghiệp vụ không tồn tại")

    const { steps, ...configData } = parsed.data

    // Transaction: update config + delete old steps + create new steps
    const workflow = await prisma.$transaction(async (tx) => {
      // Update config fields
      await tx.workflowConfig.update({
        where: { id },
        data: {
          ...configData,
          version: { increment: 1 },
        },
      })

      // If steps provided, replace them entirely
      if (steps && steps.length > 0) {
        await tx.workflowStep.deleteMany({ where: { workflowConfigId: id } })
        await tx.workflowStep.createMany({
          data: steps.map(s => ({
            workflowConfigId: id,
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
        })
      }

      // Return full workflow
      return tx.workflowConfig.findUnique({
        where: { id },
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
    })

    return success(workflow)
  } catch (error) {
    console.error("PUT /api/admin/workflows/[id] error:", error)
    return serverError()
  }
}

// ─── DELETE /api/admin/workflows/[id] ────────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requirePermission("admin.full", "workflow.delete")
  if (result.error) return result.error

  try {
    const { id } = await params
    const existing = await prisma.workflowConfig.findUnique({ where: { id } })
    if (!existing) return notFound("Luồng nghiệp vụ không tồn tại")

    await prisma.workflowConfig.delete({ where: { id } })
    return success({ message: "Đã xóa luồng nghiệp vụ" })
  } catch (error) {
    console.error("DELETE /api/admin/workflows/[id] error:", error)
    return serverError()
  }
}
