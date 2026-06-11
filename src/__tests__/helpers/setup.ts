/* eslint-disable @typescript-eslint/no-explicit-any */


// ─── MOCK PRISMA ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prismaMock: any = {
  user: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn() },
  company: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn() },
  department: { findMany: jest.fn() },
  vendor: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn() },
  materialItem: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn() },
  procurementPlan: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  procurementPlanItem: { createMany: jest.fn(), deleteMany: jest.fn() },
  materialRequest: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  materialRequestItem: { createMany: jest.fn(), deleteMany: jest.fn() },
  purchaseRequest: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  purchaseRequestItem: { createMany: jest.fn(), deleteMany: jest.fn() },
  inventoryCheck: { findUnique: jest.fn(), create: jest.fn() },
  approvalStep: { create: jest.fn(), findMany: jest.fn() },
  auditLog: { create: jest.fn() },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  $transaction: jest.fn((fn: any): any => fn(prismaMock)),
}

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: prismaMock,
}))

export { prismaMock }

// ─── MOCK AUTH & API HELPERS ──────────────────────────────────────────────────

let mockSessionUser: any = null

jest.mock("@/lib/api-helpers", () => ({
  requireRole: jest.fn(async (...roles: string[]) => {
    if (!mockSessionUser) {
      return { error: new Response("Unauthorized", { status: 401 }) }
    }
    
    const userRoles = mockSessionUser.roles || [mockSessionUser.role]
    if (roles.length > 0 && !roles.some(r => userRoles.includes(r)) && !userRoles.includes("Admin")) {
      return { error: new Response("Forbidden", { status: 403 }) }
    }
    
    return { user: mockSessionUser }
  }),
  requirePermission: jest.fn(async (...perms: string[]) => {
    if (!mockSessionUser) {
      return { error: new Response("Unauthorized", { status: 401 }) }
    }
    
    const userPerms = mockSessionUser.permissions || []
    if (perms.length > 0 && !perms.some(p => userPerms.includes(p)) && !userPerms.includes("admin.full")) {
      return { error: new Response("Forbidden", { status: 403 }) }
    }
    
    return { user: mockSessionUser }
  }),
  requireAuth: jest.fn(async () => {
    if (!mockSessionUser) {
      return { error: new Response("Unauthorized", { status: 401 }) }
    }
    return { user: mockSessionUser }
  }),
  getAuthUser: jest.fn(async () => mockSessionUser),
  success: (data: any, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } }),
  badRequest: (error: string) => new Response(JSON.stringify({ error }), { status: 400, headers: { "Content-Type": "application/json" } }),
  notFound: (error: string) => new Response(JSON.stringify({ error }), { status: 404, headers: { "Content-Type": "application/json" } }),
  serverError: (error = "Internal Server Error") => new Response(JSON.stringify({ error }), { status: 500, headers: { "Content-Type": "application/json" } }),
  forbidden: (error = "Forbidden") => new Response(JSON.stringify({ error }), { status: 403, headers: { "Content-Type": "application/json" } }),
  getPaginationParams: () => ({ skip: 0, limit: 20, page: 1 }),
  getSearchParam: () => null,
}))

/**
 * Set mock session for API testing.
 * Call before each test to simulate different users.
 */
export function setMockSession(opts: {
  id?: string
  role?: string
  roles?: string[]
  permissions?: string[]
  companyId?: string
  departmentId?: string | null
  email?: string
  name?: string
}) {
  const roles = opts.roles || (opts.role ? [opts.role] : ["Staff"])
  const primaryRole = roles[0] || "Staff"
  
  mockSessionUser = {
    id: opts.id || "test-user-id",
    role: primaryRole,
    roles,
    permissions: opts.permissions || (primaryRole === "Admin" ? ["admin.full"] : []),
    primaryRole,
    companyId: opts.companyId || "test-company-id",
    departmentId: opts.departmentId ?? null,
    email: opts.email || "test@1gate.vn",
    name: opts.name || "Test User",
  }
}

export function clearMockSession() {
  mockSessionUser = null
}

// ─── REQUEST HELPERS ─────────────────────────────────────────────────────────

/**
 * Create a mock NextRequest for API testing.
 */
export function createMockRequest(
  url: string,
  options?: {
    method?: string
    body?: Record<string, unknown>
    searchParams?: Record<string, string>
  }
): Request {
  const fullUrl = new URL(url, "http://localhost:3000")
  if (options?.searchParams) {
    Object.entries(options.searchParams).forEach(([k, v]) => {
      fullUrl.searchParams.set(k, v)
    })
  }

  const init: RequestInit = {
    method: options?.method || "GET",
  }

  if (options?.body) {
    init.body = JSON.stringify(options.body)
    init.headers = { "Content-Type": "application/json" }
  }

  return new Request(fullUrl.toString(), init)
}

// ─── RESET ALL ───────────────────────────────────────────────────────────────

export function resetAllMocks() {
  clearMockSession()
  Object.values(prismaMock).forEach((model) => {
    if (typeof model === "object" && model !== null) {
      Object.values(model).forEach((fn) => {
        if (typeof fn === "function" && "mockReset" in fn) {
          (fn as jest.Mock).mockReset()
        }
      })
    }
  })
}

/**
 * Standard beforeEach for API tests
 */
export function setupApiTest() {
  beforeEach(() => {
    resetAllMocks()
  })
}
