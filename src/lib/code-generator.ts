import prisma from "@/lib/prisma"

/**
 * Auto-generate sequential document codes.
 * Pattern: {prefix}-{companyCode}-{YYYY}-{NNN}
 * Example: KH-HO-2026-001, CVT-CTTV1-2026-003
 */

const PREFIX_MAP = {
  procurement: "KH",
  materialRequest: "CVT",
  purchaseRequest: "MH",
  inventoryCheck: "KK",
  paymentRequest: "TT",
  advanceRequest: "TU",
  paymentPlan: "KC",
  settlement: "QT",
} as const

type EntityType = keyof typeof PREFIX_MAP

// Map entity types to Prisma model names for querying
const MODEL_MAP: Record<EntityType, string> = {
  procurement: "procurementPlan",
  materialRequest: "materialRequest",
  purchaseRequest: "purchaseRequest",
  inventoryCheck: "inventoryCheck",
  paymentRequest: "paymentRequest",
  advanceRequest: "advanceRequest",
  paymentPlan: "paymentPlan",
  settlement: "settlement",
}

/**
 * Parse the sequential number from a code string.
 * e.g. "KH-HO-2026-003" → 3
 */
export function parseSequenceFromCode(code: string): number {
  const parts = code.split("-")
  const last = parts[parts.length - 1]
  return parseInt(last, 10) || 0
}

/**
 * Generate the next sequential code for an entity type within a company.
 */
export async function generateCode(
  entityType: EntityType,
  companyCode: string
): Promise<string> {
  const prefix = PREFIX_MAP[entityType]
  const year = new Date().getFullYear()
  const pattern = `${prefix}-${companyCode}-${year}-`

  // Find the latest code with this pattern
  const modelName = MODEL_MAP[entityType]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const model = (prisma as any)[modelName]
  const latest = await model.findMany({
    where: {
      code: { startsWith: pattern },
    },
    orderBy: { code: "desc" },
    take: 1,
    select: { code: true },
  })

  let nextSeq = 1
  if (latest.length > 0) {
    nextSeq = parseSequenceFromCode(latest[0].code) + 1
  }

  return `${pattern}${String(nextSeq).padStart(3, "0")}`
}

/**
 * Generate code without DB call (for testing/offline).
 */
export function buildCode(
  prefix: string,
  companyCode: string,
  year: number,
  seq: number
): string {
  return `${prefix}-${companyCode}-${year}-${String(seq).padStart(3, "0")}`
}
