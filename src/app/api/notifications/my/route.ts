import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { getAuthUser, success, serverError } from "@/lib/api-helpers"

export async function GET(_req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return serverError("Unauthorized")

  try {
    const list = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    })

    return success(list)
  } catch (error) {
    console.error("GET /api/notifications/my error:", error)
    return serverError()
  }
}
