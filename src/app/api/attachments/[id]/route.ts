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

    // Delete physical file from disk (fail silently if already gone)
    if (attachment.fileUrl) {
      try {
        const filePath = join(process.cwd(), "public", attachment.fileUrl)
        await unlink(filePath)
      } catch {
        // File may already be deleted from disk — continue to remove DB record
        console.warn(`[Attachments] File not found on disk: ${attachment.fileUrl}`)
      }
    }

    await prisma.attachment.delete({ where: { id } })

    return success({ deleted: true })
  } catch (error) {
    console.error("DELETE /api/attachments/[id] error:", error)
    return serverError()
  }
}
