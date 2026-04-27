import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireAuth, success, badRequest, serverError } from "@/lib/api-helpers"

// GET /api/profile — lấy thông tin user hiện tại
export async function GET() {
  const result = await requireAuth()
  if (result.error) return result.error
  try {
    const user = await prisma.user.findUnique({
      where: { id: result.user.id },
      select: {
        id: true, name: true, email: true, role: true, telegramChatId: true,
        company: { select: { name: true, code: true, type: true } },
        department: { select: { name: true } },
        createdAt: true,
      },
    })
    if (!user) return badRequest("Không tìm thấy người dùng")
    return success(user)
  } catch (e) {
    console.error(e)
    return serverError()
  }
}

// PATCH /api/profile — cập nhật telegramChatId
export async function PATCH(req: NextRequest) {
  const result = await requireAuth()
  if (result.error) return result.error
  try {
    const body = await req.json()
    const { telegramChatId } = body
    const updated = await prisma.user.update({
      where: { id: result.user.id },
      data: { telegramChatId: telegramChatId?.trim() || null },
      select: { id: true, telegramChatId: true },
    })
    return success(updated)
  } catch (e) {
    console.error(e)
    return serverError()
  }
}
