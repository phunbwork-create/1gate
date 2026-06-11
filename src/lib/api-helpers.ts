import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasAnyPermission } from "@/lib/permissions"

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface ApiUser {
  id: string
  name: string
  roles: string[]           // Dynamic role names
  permissions: string[]     // Flattened permission keys
  primaryRole: string       // Highest-level role name
  companyId: string
  departmentId?: string | null
  // Legacy backward compat
  role: string              // = primaryRole
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
  
  const roles = u.roles || (u.role ? [u.role] : [])
  const permissions = u.permissions || []
  const primaryRole = u.primaryRole || u.role || roles[0] || ""

  return {
    id: u.id,
    name: u.name ?? "",
    roles,
    permissions,
    primaryRole,
    companyId: u.companyId,
    departmentId: u.departmentId,
    // Legacy compat
    role: primaryRole,
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
 * Require specific permissions. Returns user or error response.
 * Usage: requirePermission("paymentRequest.create", "paymentRequest.update")
 * User needs ANY of the listed permissions (OR logic).
 */
export async function requirePermission(...perms: string[]): Promise<
  { user: ApiUser; error?: never } | { user?: never; error: NextResponse }
> {
  const result = await requireAuth()
  if (result.error) return result

  if (!hasAnyPermission(result.user.permissions, ...perms)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { user: result.user }
}

/**
 * Require specific role names (backward compat).
 * User needs ANY of the listed roles (OR logic).
 * Admin role always passes.
 */
export async function requireRole(...roleNames: string[]): Promise<
  { user: ApiUser; error?: never } | { user?: never; error: NextResponse }
> {
  const result = await requireAuth()
  if (result.error) return result

  const userRoles = result.user.roles
  
  // Admin always passes
  if (userRoles.includes("Admin")) return { user: result.user }
  
  // Check if user has any of the required roles
  const hasRole = roleNames.some(r => userRoles.includes(r))
  if (!hasRole) {
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

export function forbidden(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 })
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
