/**
 * Domain type aliases — safe to import in client components.
 * Do NOT import @prisma/client in "use client" files; import from here instead.
 */

// ─── DYNAMIC ROLE TYPES ──────────────────────────────────────────────────────

export interface DynamicRole {
  id: string
  name: string
  displayName: string
  color?: string | null
  level: number
  isSystem: boolean
}

export interface UserPermissions {
  roles: DynamicRole[]
  permissions: string[]       // Flattened: ["paymentRequest.create", "dashboard.read", ...]
  primaryRole: DynamicRole    // Role có level cao nhất
}

// Legacy Role type — used during migration, backward compat
export type LegacyRole =
  | "Admin"
  | "Staff"
  | "DeptHead"
  | "Warehouse"
  | "Purchasing"
  | "Accountant"
  | "ChiefAccountant"
  | "Director"

// Alias for backward compat (most code still uses "Role")
export type Role = string

export type RequestStatus =
  | "Draft"
  | "Submitted"
  | "PendingApproval"
  | "Approved"
  | "Rejected"
  | "Returned"
  | "Cancelled"
  | "Closed"

export type CompanyType = "HO" | "CTTV"

export type PaymentPlanStatus =
  | "Draft"
  | "PendingChiefAccountant"
  | "PendingDirector"
  | "Approved"
  | "Rejected"
  | "PartiallyApproved"
  | "Executed"

export type PlanItemStatus = "Pending" | "Approved" | "Reduced" | "Rejected"

export type InvoiceScenario = "HasInvoice" | "InvoiceLater" | "NoInvoice"

export type DocumentType =
  | "Invoice"
  | "Quotation"
  | "Contract"
  | "AcceptanceCert"
  | "InventoryCheck"
  | "Other"

// ─── ROLE DISPLAY HELPERS ────────────────────────────────────────────────────

/** Fallback labels for system roles — used when role.displayName is unavailable */
export const LEGACY_ROLE_LABELS: Record<string, string> = {
  Admin: "Quản trị viên",
  Staff: "Nhân viên",
  DeptHead: "Trưởng phòng",
  Warehouse: "Thủ kho",
  Purchasing: "Mua hàng",
  Accountant: "Kế toán",
  ChiefAccountant: "Kế toán trưởng",
  Director: "Giám đốc",
}

export const LEGACY_ROLE_COLORS: Record<string, string> = {
  Admin: "bg-red-500/10 text-red-400 border-red-500/20",
  Staff: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  DeptHead: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Warehouse: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Purchasing: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Accountant: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  ChiefAccountant: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  Director: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
}
