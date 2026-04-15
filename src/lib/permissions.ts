import { Role } from "@prisma/client"

// ─── ROLE HIERARCHY ──────────────────────────────────────────────────────────

const ROLE_HIERARCHY: Record<Role, number> = {
  Staff: 1,
  Warehouse: 2,
  Purchasing: 3,
  Accountant: 4,
  DeptHead: 5,
  ChiefAccountant: 6,
  Director: 7,
  Admin: 8,
}

// ─── RESOURCES & ACTIONS ─────────────────────────────────────────────────────

export type Resource =
  | "user"
  | "company"
  | "department"
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

// ─── PERMISSION MATRIX ──────────────────────────────────────────────────────

// Which roles can access each resource (for menu visibility & route protection)
const RESOURCE_ACCESS: Record<Resource, Role[]> = {
  dashboard: [
    "Admin", "Staff", "DeptHead", "Warehouse", "Purchasing",
    "Accountant", "ChiefAccountant", "Director",
  ],
  admin: ["Admin"],
  user: ["Admin"],
  company: ["Admin"],
  department: ["Admin"],
  vendor: ["Admin", "Purchasing", "Accountant", "ChiefAccountant"],
  materialItem: ["Admin", "Warehouse", "Purchasing"],
  procurementPlan: ["Staff", "DeptHead", "Director", "Admin"],
  materialRequest: ["Staff", "DeptHead", "Warehouse", "Admin"],
  inventoryCheck: ["Warehouse", "Admin"],
  purchaseRequest: ["Warehouse", "Purchasing", "Accountant", "DeptHead", "Admin"],
  paymentRequest: ["Staff", "Purchasing", "Accountant", "ChiefAccountant", "DeptHead", "Admin"],
  advanceRequest: ["Staff", "DeptHead", "ChiefAccountant", "Director", "Admin"],
  paymentPlan: ["ChiefAccountant", "Director", "Admin"],
  paymentVoucher: ["Accountant", "ChiefAccountant", "Admin"],
  settlement: ["Staff", "Accountant", "ChiefAccountant", "Admin"],
  notification: [
    "Admin", "Staff", "DeptHead", "Warehouse", "Purchasing",
    "Accountant", "ChiefAccountant", "Director",
  ],
  auditLog: ["Admin", "ChiefAccountant", "Director"],
}

// ─── CORE FUNCTIONS ──────────────────────────────────────────────────────────

export interface UserSession {
  id: string
  role: Role
  companyId: string
  departmentId?: string | null
}

/**
 * Check if a user can access a resource
 */
export function canAccess(user: UserSession, resource: Resource): boolean {
  // Admin can do everything
  if (user.role === "Admin") return true

  const allowedRoles = RESOURCE_ACCESS[resource]
  if (!allowedRoles) return false

  return allowedRoles.includes(user.role)
}

/**
 * Check if a role can see prices
 * Warehouse and Staff below cannot see prices
 */
export function priceVisible(role: Role): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY["Purchasing"]
}

/**
 * Check if a user has a role at or above a minimum level
 */
export function hasMinRole(userRole: Role, minRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole]
}

/**
 * Get the approval chain for a given entity type and amount
 */
export function getApprovalChain(
  entityType: "procurementPlan" | "materialRequest" | "purchaseRequest" | "paymentRequest" | "advanceRequest" | "paymentPlan",
  amount?: number
): Role[] {
  switch (entityType) {
    case "procurementPlan":
      return ["DeptHead", "Director"]

    case "materialRequest":
      return ["DeptHead"]

    case "purchaseRequest":
      return ["DeptHead", "Accountant"]

    case "paymentRequest":
      return ["Accountant"]

    case "advanceRequest":
      if (!amount) return ["DeptHead"]
      if (amount < 1_000_000) return ["DeptHead"]
      if (amount <= 5_000_000) return ["DeptHead", "ChiefAccountant"]
      return ["DeptHead", "ChiefAccountant", "Director"]

    case "paymentPlan":
      return ["ChiefAccountant", "Director"]

    default:
      return []
  }
}

/**
 * Validate that creator is not the same as approver (anti-conflict)
 */
export function validateNoSelfApproval(creatorId: string, approverId: string): boolean {
  return creatorId !== approverId
}

// ─── SIDEBAR MENU CONFIG ─────────────────────────────────────────────────────

export interface MenuItem {
  title: string
  href: string
  icon: string
  resource: Resource
  badge?: string
}

export const MENU_ITEMS: MenuItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: "LayoutDashboard", resource: "dashboard" },
  { title: "KH Mua sắm", href: "/procurement", icon: "ClipboardList", resource: "procurementPlan" },
  { title: "ĐN Cấp Vật tư", href: "/materials", icon: "Package", resource: "materialRequest" },
  { title: "ĐN Mua hàng", href: "/purchases", icon: "ShoppingCart", resource: "purchaseRequest" },
  { title: "ĐN Thanh toán", href: "/payments", icon: "CreditCard", resource: "paymentRequest" },
  { title: "ĐN Tạm ứng", href: "/advances", icon: "Banknote", resource: "advanceRequest" },
  { title: "KH Chi", href: "/payment-plans", icon: "Calendar", resource: "paymentPlan" },
  { title: "Quyết toán", href: "/settlements", icon: "FileCheck", resource: "settlement" },
]

export const ADMIN_MENU_ITEMS: MenuItem[] = [
  { title: "Người dùng", href: "/admin/users", icon: "Users", resource: "user" },
  { title: "Công ty", href: "/admin/companies", icon: "Building2", resource: "company" },
  { title: "Nhà cung cấp", href: "/admin/vendors", icon: "Store", resource: "vendor" },
  { title: "Vật tư", href: "/admin/materials", icon: "Boxes", resource: "materialItem" },
]

/**
 * Get filtered menu based on user role
 */
export function getMenuForRole(role: Role): { main: MenuItem[]; admin: MenuItem[] } {
  const user: UserSession = { id: "", role, companyId: "" }

  return {
    main: MENU_ITEMS.filter((item) => canAccess(user, item.resource)),
    admin: ADMIN_MENU_ITEMS.filter((item) => canAccess(user, item.resource)),
  }
}
