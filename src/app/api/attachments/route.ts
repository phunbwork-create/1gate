import { NextRequest } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { randomUUID } from "crypto"
import prisma from "@/lib/prisma"
import { requireAuth, success, badRequest, serverError } from "@/lib/api-helpers"

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const MAX_SIZE = 10 * 1024 * 1024 // 10MB

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
}

const VALID_DOCUMENT_TYPES = [
  "Invoice", "Quotation", "Contract", "AcceptanceCert", "InventoryCheck", "Other",
] as const

type EntityType =
  | "paymentRequest"
  | "advanceRequest"
  | "paymentPlan"
  | "settlement"
  | "procurementPlan"
  | "materialRequest"
  | "purchaseRequest"

const ENTITY_FIELD_MAP: Record<EntityType, string> = {
  paymentRequest: "paymentRequestId",
  advanceRequest: "advanceRequestId",
  paymentPlan: "paymentPlanId",
  settlement: "settlementId",
  procurementPlan: "procurementPlanId",
  materialRequest: "materialRequestId",
  purchaseRequest: "purchaseRequestId",
}

// ─── STORAGE ADAPTERS ────────────────────────────────────────────────────────

/**
 * Upload to Vercel Blob (production) or local filesystem (development).
 * Returns the public URL of the stored file.
 */
async function storeFile(
  buffer: Buffer,
  fileName: string,
  entityType: string,
  entityId: string,
  mimeType: string
): Promise<string> {
  const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN

  if (useBlob) {
    // Vercel Blob — lazy import so local dev doesn't require the token
    const { put } = await import("@vercel/blob")
    const pathname = `uploads/${entityType}/${entityId}/${fileName}`
    const blob = await put(pathname, buffer, {
      access: "public",
      contentType: mimeType,
    })
    return blob.url
  }

  // Local filesystem fallback (development only)
  const uploadDir = join(process.cwd(), "public", "uploads", entityType, entityId)
  await mkdir(uploadDir, { recursive: true })
  await writeFile(join(uploadDir, fileName), buffer)
  return `/uploads/${entityType}/${entityId}/${fileName}`
}

// ─── POST /api/attachments ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const result = await requireAuth()
  if (result.error) return result.error

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const entityType = formData.get("entityType") as string | null
    const entityId = formData.get("entityId") as string | null
    const documentType = (formData.get("documentType") as string | null) || "Other"

    if (!file || !entityType || !entityId) {
      return badRequest("Thiếu thông tin: file, entityType, entityId")
    }
    if (!(entityType in ENTITY_FIELD_MAP)) {
      return badRequest("entityType không hợp lệ")
    }
    if (!VALID_DOCUMENT_TYPES.includes(documentType as (typeof VALID_DOCUMENT_TYPES)[number])) {
      return badRequest("documentType không hợp lệ")
    }
    if (file.size > MAX_SIZE) {
      return badRequest("File quá lớn, tối đa 10MB")
    }
    if (!ALLOWED_TYPES[file.type]) {
      return badRequest("Định dạng file không được hỗ trợ. Chấp nhận: PDF, ảnh, Word, Excel")
    }

    const uuid = randomUUID()
    const safeOriginalName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const fileName = `${uuid}-${safeOriginalName}`

    const buffer = Buffer.from(await file.arrayBuffer())
    const fileUrl = await storeFile(buffer, fileName, entityType, entityId, file.type)

    const relField = ENTITY_FIELD_MAP[entityType as EntityType]
    const attachment = await prisma.attachment.create({
      data: {
        fileName: file.name,
        fileUrl,
        fileSize: file.size,
        mimeType: file.type,
        documentType: documentType as (typeof VALID_DOCUMENT_TYPES)[number],
        [relField]: entityId,
      },
    })

    return success(attachment, 201)
  } catch (error) {
    console.error("POST /api/attachments error:", error)
    return serverError()
  }
}
