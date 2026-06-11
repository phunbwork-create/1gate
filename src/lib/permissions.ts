/**
 * Dynamic RBAC Permission Engine
 * 
 * Thay thế hệ thống phân quyền hard-coded bằng dynamic permissions
 * đọc từ JWT session (roles[] + permissions[]).
 */

// ─── PERMISSION CHECK FUNCTIONS ──────────────────────────────────────────────

/**
 * Check if user has a specific permission (resource.action)
 */
export function hasPermission(userPermissions: string[], resource: string, action: string = "read"): boolean {
  // Admin full access
  if (userPermissions.includes("admin.full")) return true
  
  const key = `${resource}.${action}`
  return userPermissions.includes(key)
}

/**
 * Check if user has ANY of the specified permissions
 */
export function hasAnyPermission(userPermissions: string[], ...perms: string[]): boolean {
  if (userPermissions.includes("admin.full")) return true
  return perms.some(p => userPermissions.includes(p))
}

/**
 * Check if user has ALL of the specified permissions
 */
export function hasAllPermissions(userPermissions: string[], ...perms: string[]): boolean {
  if (userPermissions.includes("admin.full")) return true
  return perms.every(p => userPermissions.includes(p))
}

/**
 * Check if user can access admin panel
 */
export function canAccessAdmin(userPermissions: string[]): boolean {
  return userPermissions.includes("admin.full") || userPermissions.includes("admin.access")
}

/**
 * Check if a role can see prices (backward compat helper)
 * Any role with paymentRequest.read or purchaseRequest.read can see prices
 */
export function priceVisible(userPermissions: string[]): boolean {
  return hasAnyPermission(
    userPermissions,
    "paymentRequest.read",
    "purchaseRequest.read",
    "paymentPlan.read",
    "advanceRequest.read",
  )
}

// ─── SIDEBAR MENU CONFIG ─────────────────────────────────────────────────────

export type Resource =
  | "user"
  | "company"
  | "department"
  | "role"
  | "workflow"
  | "vendor"
  | "materialItem"
  | "procurementPlan"
  | "materialRequest"
  | "inventoryCheck"
  | "purchaseRequest"
  | "paymentRequest"
  | "advanceRequest"
  | "paymentPlan"
  | "paymentVoucher"
  | "settlement"
  | "dashboard"
  | "admin"
  | "notification"
  | "auditLog"

export type Action = "create" | "read" | "update" | "delete" | "approve" | "submit" | "cancel"

export interface MenuItem {
  title: string
  href: string
  icon: string
  resource: Resource
  badge?: string
}

export const MENU_ITEMS: MenuItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: "LayoutDashboard", resource: "dashboard" },
  { title: "Hồ sơ / Hợp đồng", href: "/procurement", icon: "FileCheck", resource: "procurementPlan" },
  { title: "ĐN Cấp Vật tư", href: "/materials", icon: "Package", resource: "materialRequest" },
  { title: "ĐN Mua hàng", href: "/purchases", icon: "ShoppingCart", resource: "purchaseRequest" },
  { title: "ĐN Thanh toán", href: "/payments", icon: "CreditCard", resource: "paymentRequest" },
  { title: "ĐN Tạm ứng", href: "/advances", icon: "Banknote", resource: "advanceRequest" },
  { title: "KH Chi", href: "/payment-plans", icon: "Calendar", resource: "paymentPlan" },
  { title: "Quyết toán", href: "/settlements", icon: "FileCheck", resource: "settlement" },
]

export const ADMIN_MENU_ITEMS: MenuItem[] = [
  { title: "Người dùng", href: "/admin/users", icon: "Users", resource: "user" },
  { title: "Vai trò & Quyền", href: "/admin/roles", icon: "Shield", resource: "role" },
  { title: "Công ty", href: "/admin/companies", icon: "Building2", resource: "company" },
  { title: "Phòng ban", href: "/admin/departments", icon: "Building", resource: "department" },
  { title: "Nhà cung cấp", href: "/admin/vendors", icon: "Store", resource: "vendor" },
  { title: "Vật tư", href: "/admin/materials", icon: "Boxes", resource: "materialItem" },
  { title: "Luồng nghiệp vụ", href: "/admin/workflows", icon: "Workflow", resource: "workflow" },
]

/**
 * Get filtered menu based on user permissions
 */
export function getMenuForPermissions(permissions: string[]): { main: MenuItem[]; admin: MenuItem[] } {
  return {
    main: MENU_ITEMS.filter((item) => hasPermission(permissions, item.resource, "read")),
    admin: ADMIN_MENU_ITEMS.filter((item) => hasPermission(permissions, item.resource, "read")),
  }
}

// ─── BACKWARD COMPAT ─────────────────────────────────────────────────────────

/** @deprecated Use getMenuForPermissions instead */
export function getMenuForRole(role: string): { main: MenuItem[]; admin: MenuItem[] } {
  // Legacy fallback: if called with old role name, simulate permissions
  const legacyPerms = getLegacyPermissionsForRole(role)
  return getMenuForPermissions(legacyPerms)
}

/** Convert legacy role name to approximate permission list */
function getLegacyPermissionsForRole(role: string): string[] {
  const LEGACY_MAP: Record<string, string[]> = {
    Admin: ["admin.full"],
    Director: ["dashboard.read", "procurementPlan.read", "advanceRequest.read", "paymentPlan.read", "auditLog.read", "notification.read"],
    ChiefAccountant: ["dashboard.read", "vendor.read", "paymentRequest.read", "advanceRequest.read", "paymentPlan.read", "paymentVoucher.read", "settlement.read", "auditLog.read", "notification.read"],
    DeptHead: ["dashboard.read", "procurementPlan.read", "materialRequest.read", "purchaseRequest.read", "paymentRequest.read", "advanceRequest.read", "settlement.read", "notification.read"],
    Accountant: ["dashboard.read", "vendor.read", "purchaseRequest.read", "paymentRequest.read", "paymentVoucher.read", "settlement.read", "notification.read"],
    Purchasing: ["dashboard.read", "vendor.read", "materialItem.read", "purchaseRequest.read", "paymentRequest.read", "notification.read"],
    Warehouse: ["dashboard.read", "materialItem.read", "materialRequest.read", "inventoryCheck.read", "purchaseRequest.read", "notification.read"],
    Staff: ["dashboard.read", "procurementPlan.read", "materialRequest.read", "paymentRequest.read", "advanceRequest.read", "settlement.read", "notification.read"],
  }
  return LEGACY_MAP[role] || ["dashboard.read"]
}

// ─── SESSION HELPER TYPES ────────────────────────────────────────────────────

export interface UserSession {
  id: string
  roles: string[]         // Role names
  permissions: string[]   // Flattened permission keys
  companyId: string
  departmentId?: string | null
  primaryRole?: string    // Highest-level role name
}

/**
 * Check if user can access a resource (backward compat)
 */
export function canAccess(user: UserSession, resource: Resource): boolean {
  return hasPermission(user.permissions, resource, "read")
}

// ─── LEGACY BACKWARD COMPAT ─────────────────────────────────────────────────

/**
 * @deprecated Legacy synchronous approval chain. Use workflow.ts getApprovalChain() instead.
 * Kept for backward compat during migration period.
 */
export function getApprovalChain(entityType: string, amount?: number): string[] {
  const LEGACY_CHAINS: Record<string, string[]> = {
    paymentRequest: amount && amount >= 5000000
      ? ["Accountant", "DeptHead", "ChiefAccountant", "Director"]
      : amount && amount >= 1000000
        ? ["Accountant", "DeptHead", "ChiefAccountant"]
        : ["Accountant", "DeptHead"],
    advanceRequest: amount && amount >= 5000000
      ? ["DeptHead", "ChiefAccountant", "Director"]
      : amount && amount >= 1000000
        ? ["DeptHead", "ChiefAccountant"]
        : ["DeptHead"],
    procurementPlan: ["DeptHead", "Director"],
    materialRequest: ["DeptHead"],
    purchaseRequest: ["DeptHead", "Accountant"],
    settlement: ["DeptHead", "Accountant"],
  }
  return LEGACY_CHAINS[entityType] || ["DeptHead"]
}
