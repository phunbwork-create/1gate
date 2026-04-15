import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireRole, success, badRequest, serverError, getPaginationParams, getSearchParam } from "@/lib/api-helpers"
import { createUserSchema } from "@/schemas/admin.schema"
import { hash } from "bcryptjs"

// ─── GET /api/admin/users ────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const result = await requireRole("Admin")
  if (result.error) return result.error

  try {
    const { skip, limit, page } = getPaginationParams(req)
    const search = getSearchParam(req, "search")
    const role = getSearchParam(req, "role")
    const companyId = getSearchParam(req, "companyId")
    const active = getSearchParam(req, "active")

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ]
    }
    if (role) where.role = role
    if (companyId) where.companyId = companyId
    if (active !== undefined) where.isActive = active === "true"

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          company: { select: { id: true, name: true, code: true } },
          department: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    // Exclude passwordHash from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const sanitized = users.map(({ passwordHash, ...u }) => u)

    return success({
      data: sanitized,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error("GET /api/admin/users error:", error)
    return serverError()
  }
}

// ─── POST /api/admin/users ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const result = await requireRole("Admin")
  if (result.error) return result.error

  try {
    const body = await req.json()
    const parsed = createUserSchema.safeParse(body)

    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((e) => e.message).join(", "))
    }

    const { password, ...data } = parsed.data

    // Check duplicate email
    const exists = await prisma.user.findUnique({ where: { email: data.email } })
    if (exists) {
      return badRequest("Email đã tồn tại trong hệ thống")
    }

    const passwordHash = await hash(password, 12)

    const user = await prisma.user.create({
      data: {
        ...data,
        passwordHash,
      },
      include: {
        company: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true } },
      },
    })

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _hash, ...sanitized } = user
    return success(sanitized, 201)
  } catch (error) {
    console.error("POST /api/admin/users error:", error)
    return serverError()
  }
}
