import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { getAuthUser, success, badRequest, serverError } from "@/lib/api-helpers"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser()
  if (!user) return serverError("Unauthorized")

  try {
    const notification = await prisma.notification.findUnique({
      where: { id: params.id },
    })
    
    if (!notification) return badRequest("Not found")
    if (notification.userId !== user.id) return badRequest("Forbidden")

    const updated = await prisma.notification.update({
      where: { id: params.id },
      data: { isRead: true },
    })

    return success(updated)
  } catch (error) {
    console.error("POST /api/notifications/[id]/read error:", error)
    return serverError()
  }
}
