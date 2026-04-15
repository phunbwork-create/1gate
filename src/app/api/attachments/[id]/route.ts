import { NextRequest } from "next/server"
import { unlink } from "fs/promises"
import { join } from "path"
import prisma from "@/lib/prisma"
import { requireAuth, success, notFound, serverError } from "@/lib/api-helpers"

// ─── DELETE /api/attachments/[id] ────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth()
  if (result.error) return result.error

  try {
    const { id } = await params

    const attachment = await prisma.attachment.findUnique({ where: { id } })
    if (!attachment) return notFound("Tệp đính kèm không tồn tại")

    // Delete physical file — Vercel Blob or local filesystem
    if (attachment.fileUrl) {
      const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN

      if (useBlob && attachment.fileUrl.startsWith("https://")) {
        // Vercel Blob: delete by URL
        try {
          const { del } = await import("@vercel/blob")
          await del(attachment.fileUrl)
        } catch {
          console.warn("[Attachments] Blob delete failed:", attachment.fileUrl)
        }
      } else if (!attachment.fileUrl.startsWith("https://")) {
        // Local filesystem fallback
        try {
          const filePath = join(process.cwd(), "public", attachment.fileUrl)
          await unlink(filePath)
        } catch {
          console.warn("[Attachments] Local file not found:", attachment.fileUrl)
        }
      }
    }

    await prisma.attachment.delete({ where: { id } })

    return success({ deleted: true })
  } catch (error) {
    console.error("DELETE /api/attachments/[id] error:", error)
    return serverError()
  }
}
