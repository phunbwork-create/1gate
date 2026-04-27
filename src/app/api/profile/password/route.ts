import { NextRequest } from "next/server"
import { compare, hash } from "bcryptjs"
import prisma from "@/lib/prisma"
import { requireAuth, success, badRequest, serverError } from "@/lib/api-helpers"

// POST /api/profile/password — đổi mật khẩu
export async function POST(req: NextRequest) {
  const result = await requireAuth()
  if (result.error) return result.error
  try {
    const { currentPassword, newPassword } = await req.json()

    if (!currentPassword || !newPassword) {
      return badRequest("Vui lòng nhập đầy đủ mật khẩu cũ và mới")
    }
    if (newPassword.length < 6) {
      return badRequest("Mật khẩu mới phải có ít nhất 6 ký tự")
    }

    const user = await prisma.user.findUnique({
      where: { id: result.user.id },
      select: { passwordHash: true },
    })
    if (!user) return badRequest("Không tìm thấy người dùng")

    const valid = await compare(currentPassword, user.passwordHash)
    if (!valid) return badRequest("Mật khẩu hiện tại không chính xác")

    const newHash = await hash(newPassword, 12)
    await prisma.user.update({
      where: { id: result.user.id },
      data: { passwordHash: newHash },
    })

    return success({ message: "Đổi mật khẩu thành công" })
  } catch (e) {
    console.error(e)
    return serverError()
  }
}
