/**
 * Domain type aliases — mirrors Prisma enums but safe to import in client components.
 * Do NOT import @prisma/client in "use client" files; import from here instead.
 */

export type Role =
  | "Admin"
  | "Staff"
  | "DeptHead"
  | "Warehouse"
  | "Purchasing"
  | "Accountant"
  | "ChiefAccountant"
  | "Director"

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
