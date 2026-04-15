import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireAuth, success, notFound, serverError } from "@/lib/api-helpers"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth()
  if (result.error) return result.error

  try {
    const { id } = await params

    const reqDetail = await prisma.settlement.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, departmentId: true } },
        advanceRequest: { 
          select: { code: true, amount: true, vendorName: true, company: { select: { code: true } } } 
        },
      },
    })

    if (!reqDetail) return notFound("Phiếu quyết toán không tồn tại")

    return success(reqDetail)
  } catch (error) {
    console.error(error)
    return serverError()
  }
}
