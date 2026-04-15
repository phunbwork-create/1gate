"use client"

import { Badge } from "@/components/ui/badge"
import { RequestStatus, PaymentPlanStatus } from "@prisma/client"

const REQUEST_STATUS_CONFIG: Record<RequestStatus, { label: string; className: string }> = {
  Draft: { label: "Nháp", className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  Submitted: { label: "Đã trình", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  PendingApproval: { label: "Chờ duyệt", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  Approved: { label: "Đã duyệt", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  Rejected: { label: "Từ chối", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  Returned: { label: "Trả lại", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  Cancelled: { label: "Đã hủy", className: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400" },
  Closed: { label: "Đóng", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
}

const PLAN_STATUS_CONFIG: Record<PaymentPlanStatus, { label: string; className: string }> = {
  Draft: { label: "Nháp", className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  PendingChiefAccountant: { label: "Chờ KTT", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  PendingDirector: { label: "Chờ GĐ", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  Approved: { label: "Đã duyệt", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  Rejected: { label: "Từ chối", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  PartiallyApproved: { label: "Duyệt 1 phần", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  Executed: { label: "Đã thực hiện", className: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" },
}

export function StatusBadge({ status }: { status: RequestStatus }) {
  const config = REQUEST_STATUS_CONFIG[status] || { label: status, className: "" }
  return (
    <Badge variant="secondary" className={`text-xs font-medium ${config.className}`}>
      {config.label}
    </Badge>
  )
}

export function PlanStatusBadge({ status }: { status: PaymentPlanStatus }) {
  const config = PLAN_STATUS_CONFIG[status] || { label: status, className: "" }
  return (
    <Badge variant="secondary" className={`text-xs font-medium ${config.className}`}>
      {config.label}
    </Badge>
  )
}
