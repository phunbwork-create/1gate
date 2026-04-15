import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { Role } from "@prisma/client"

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface ApiUser {
  id: string
  name: string
  role: Role
  companyId: string
  departmentId?: string | null
}

// ─── AUTH GUARD ──────────────────────────────────────────────────────────────

/**
 * Get authenticated user from session. Returns null if not authenticated.
 */
export async function getAuthUser(): Promise<ApiUser | null> {
  const session = await auth()
  if (!session?.user) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const u = session.user as any
  return {
    id: u.id,
    name: u.name ?? "",
    role: u.role as Role,
    companyId: u.companyId,
    departmentId: u.departmentId,
  }
}

/**
 * Require authentication. Returns user or error response.
 */
export async function requireAuth(): Promise<
  { user: ApiUser; error?: never } | { user?: never; error: NextResponse }
> {
  const user = await getAuthUser()
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }
  return { user }
}

/**
 * Require specific roles. Returns user or error response.
 */
export async function requireRole(...roles: Role[]): Promise<
  { user: ApiUser; error?: never } | { user?: never; error: NextResponse }
> {
  const result = await requireAuth()
  if (result.error) return result

  if (!roles.includes(result.user.role) && result.user.role !== "Admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { user: result.user }
}

// ─── RESPONSE HELPERS ────────────────────────────────────────────────────────

export function success<T>(data: T, status = 200) {
  return NextResponse.json(data, { status })
}

export function created<T>(data: T) {
  return NextResponse.json(data, { status: 201 })
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

export function notFound(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 })
}

export function serverError(message = "Internal server error") {
  return NextResponse.json({ error: message }, { status: 500 })
}

// ─── QUERY HELPERS ───────────────────────────────────────────────────────────

export function getPaginationParams(req: NextRequest) {
  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"))
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")))
  const skip = (page - 1) * limit
  return { page, limit, skip }
}

export function getSearchParam(req: NextRequest, key: string): string | undefined {
  const val = new URL(req.url).searchParams.get(key)
  return val || undefined
}
