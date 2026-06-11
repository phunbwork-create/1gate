/**
 * Dynamic Workflow Engine
 * 
 * Đọc WorkflowConfig + WorkflowStep từ DB,
 * evaluate điều kiện, và xác định luồng phê duyệt tại runtime.
 */

import prisma from "@/lib/prisma"

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface WorkflowStepInfo {
  id: string
  stepOrder: number
  name: string
  type: string
  actorRoleId: string
  actorRoleName: string
  icon: string | null
  description: string | null
  conditionType: string
  conditionParam: string | null
  conditionOp: string | null
  conditionValue: string | null
  isTriggered: boolean    // Whether this step should be activated
}
export type { MinimalConfigStep } from "./workflow-utils"

// ─── WORKFLOW LOADING ────────────────────────────────────────────────────────

/**
 * Get the active workflow configuration for an entity type + company
 */
export async function getWorkflowConfig(entityType: string, companyId: string) {
  return prisma.workflowConfig.findUnique({
    where: { entityType_companyId: { entityType, companyId } },
    include: {
      steps: {
        include: {
          actorRole: { select: { id: true, name: true, displayName: true, color: true } },
        },
        orderBy: { stepOrder: "asc" },
      },
    },
  })
}

/**
 * Get active workflow steps for an entity type, evaluating conditions.
 * Returns steps with isTriggered flag.
 * 
 * @param entityType - "paymentRequest", "advanceRequest", etc.
 * @param companyId - Company ID
 * @param contextData - Runtime context for condition evaluation (amount, inventory, etc.)
 */
export async function getActiveWorkflow(
  entityType: string,
  companyId: string,
  contextData: Record<string, unknown> = {},
): Promise<WorkflowStepInfo[]> {
  const config = await getWorkflowConfig(entityType, companyId)

  if (!config || !config.isActive || config.steps.length === 0) {
    return []
  }

  return config.steps.map((step) => ({
    id: step.id,
    stepOrder: step.stepOrder,
    name: step.name,
    type: step.type,
    actorRoleId: step.actorRoleId,
    actorRoleName: step.actorRole.name,
    icon: step.icon,
    description: step.description,
    conditionType: step.conditionType,
    conditionParam: step.conditionParam,
    conditionOp: step.conditionOp,
    conditionValue: step.conditionValue,
    isTriggered: evaluateCondition(step, contextData),
  }))
}

/**
 * Get only the approval steps (type = "approve") that are triggered.
 * Returns role names in order — this replaces getApprovalChain().
 */
export async function getApprovalChain(
  entityType: string,
  companyId: string,
  contextData: Record<string, unknown> = {},
): Promise<{ roleId: string; roleName: string; stepName: string }[]> {
  const steps = await getActiveWorkflow(entityType, companyId, contextData)

  return steps
    .filter((s) => s.type === "approve" && s.isTriggered)
    .map((s) => ({
      roleId: s.actorRoleId,
      roleName: s.actorRoleName,
      stepName: s.name,
    }))
}

// ─── CONDITION EVALUATION ────────────────────────────────────────────────────

/**
 * Evaluate a workflow step's condition against runtime context data.
 */
function evaluateCondition(
  step: { conditionType: string; conditionParam: string | null; conditionOp: string | null; conditionValue: string | null },
  contextData: Record<string, unknown>,
): boolean {
  if (step.conditionType === "always") return true
  if (step.conditionType !== "condition") return true

  if (!step.conditionParam || !step.conditionOp || step.conditionValue === null) {
    return true // Invalid condition = always triggered
  }

  const paramValue = contextData[step.conditionParam]
  const conditionValue = step.conditionValue

  // Numeric comparison
  if (step.conditionParam === "amount" || !isNaN(Number(conditionValue))) {
    const numParam = Number(paramValue) || 0
    const numCond = Number(conditionValue) || 0

    switch (step.conditionOp) {
      case ">=": return numParam >= numCond
      case ">":  return numParam > numCond
      case "<=": return numParam <= numCond
      case "<":  return numParam < numCond
      case "==": return numParam === numCond
      case "!=": return numParam !== numCond
      default:   return true
    }
  }

  // String comparison
  const strParam = String(paramValue || "")
  const strCond = String(conditionValue)

  switch (step.conditionOp) {
    case "==": return strParam === strCond
    case "!=": return strParam !== strCond
    default:   return true
  }
}
export { calculateCurrentStepIndex } from "./workflow-utils"
