"use client"

import { Box, Check, CheckCircle2, CircleDashed, Clock, FileCheck, RotateCcw, User, UserCircle, X, XCircle } from "lucide-react"
import { Role } from "@prisma/client"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { calculateCurrentStepIndex } from "@/lib/workflow"

interface ApprovalStep {
  id: string
  role: Role
  stepOrder: number
  action: string | null
  comment: string | null
  actedAt: string | null
  approver: { id: string; name: string }
}

interface ExpectedApprover {
  role: Role
  users: { name: string; email: string }[]
}

const ROLE_LABELS: Record<Role, string> = {
  Admin: "Quản trị viên",
  Staff: "Nhân viên",
  DeptHead: "Trưởng phòng",
  Warehouse: "Thủ kho",
  Purchasing: "Mua sắm",
  Accountant: "Kế toán",
  ChiefAccountant: "Khế toán trưởng",
  Director: "Giám đốc",
}

function getAvatarColors(action: string | null) {
  if (action === "approve") return "bg-emerald-100 text-emerald-600 border-emerald-200 dark:bg-emerald-950 dark:border-emerald-900"
  if (action === "reject") return "bg-red-100 text-red-600 border-red-200 dark:bg-red-950 dark:border-red-900"
  if (action === "return") return "bg-orange-100 text-orange-600 border-orange-200 dark:bg-orange-950 dark:border-orange-900"
  return "bg-muted text-muted-foreground border-border"
}

function getActionLabel(action: string | null) {
  switch (action) {
    case "approve": return "Đã duyệt"
    case "reject": return "Từ chối"
    case "return": return "Trả lại"
    default: return "Đang chờ"
  }
}

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()
}

export function ApprovalTimeline({ 
  steps, 
  currentChain, 
  status,
  expectedApprovers
}: { 
  steps: ApprovalStep[]
  currentChain?: Role[]
  status?: string
  expectedApprovers?: ExpectedApprover[]
}) {
  if (steps.length === 0 && !currentChain) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center">
        Chưa có bước duyệt nào
      </div>
    )
  }

  // Calculate pending steps
  let pendingRoles: Role[] = []
  if (currentChain && (status === "Submitted" || status === "PendingApproval" || status === "Draft")) {
    const currentStepIndex = calculateCurrentStepIndex(steps)
    pendingRoles = currentChain.slice(currentStepIndex)
  }

  return (
    <div className="space-y-0 px-2 pt-2">
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1 && pendingRoles.length === 0
        const isApproved = step.action === "approve"
        
        return (
          <div key={step.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <Avatar className={`h-11 w-11 border-2 ${getAvatarColors(step.action)}`}>
                <AvatarFallback className="font-semibold bg-transparent text-current">
                  {getInitials(step.approver.name)}
                </AvatarFallback>
              </Avatar>
              <div className="absolute mt-7 ml-7 bg-background rounded-full border shadow-sm">
                {step.action === "approve" ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> :
                 step.action === "reject" ? <XCircle className="h-4 w-4 text-red-500" /> :
                 step.action === "return" ? <RotateCcw className="h-4 w-4 text-orange-500" /> :
                 <Clock className="h-4 w-4 text-muted-foreground" />}
              </div>
              
              {!isLast && (
                <div className={`w-0.5 h-full min-h-[32px] my-2 ${isApproved ? 'bg-emerald-500/50' : 'bg-border'}`} />
              )}
            </div>

            <div className="pb-6 pt-1 flex-1">
              <div className="bg-muted/30 border border-border/50 rounded-xl p-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-sm">{ROLE_LABELS[step.role]}</div>
                  <div className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    step.action === 'approve' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' :
                    step.action === 'reject' ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400' :
                    step.action === 'return' ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400' : 'bg-muted'
                  }`}>
                    {getActionLabel(step.action)}
                  </div>
                </div>
                
                <div className="text-sm font-medium mt-1.5 flex flex-col gap-0.5">
                  <span className="text-foreground">PIC: {step.approver.name}</span>
                </div>
                
                {step.actedAt && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                    <Clock className="h-3 w-3" />
                    {new Date(step.actedAt).toLocaleString("vi-VN")}
                  </div>
                )}
                
                {step.comment && (
                  <div className="mt-3 text-sm bg-background border rounded-md p-2 relative">
                    <div className="absolute left-4 -top-1.5 w-3 h-3 rotate-45 border-l border-t bg-background"></div>
                    <p className="text-muted-foreground italic relative z-10">&ldquo;{step.comment}&rdquo;</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}

      {pendingRoles.map((role, idx) => {
        const isLast = idx === pendingRoles.length - 1
        const approversForRole = expectedApprovers?.find((ea) => ea.role === role)?.users || []
        
        return (
          <div key={`pending-${idx}`} className="flex gap-4 opacity-75">
            <div className="flex flex-col items-center">
              <Avatar className="h-11 w-11 border-2 border-dashed border-muted-foreground/30 bg-muted text-muted-foreground">
                <AvatarFallback className="bg-transparent text-current">
                  <User className="h-5 w-5 opacity-50" />
                </AvatarFallback>
              </Avatar>
              <div className="absolute mt-7 ml-7 bg-background rounded-full border shadow-sm">
                <CircleDashed className="h-4 w-4 text-orange-500 animate-spin-slow" />
              </div>
              
              {!isLast && (
                <div className="w-0.5 h-full min-h-[32px] my-2 bg-border border-dashed" />
              )}
            </div>

            <div className="pb-6 pt-1 flex-1">
              <div className="bg-card border border-orange-200/50 dark:border-orange-900/50 rounded-xl p-3 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-orange-400"></div>
                <div className="flex items-start justify-between gap-2 pl-2">
                  <div className="font-semibold text-sm">{ROLE_LABELS[role]}</div>
                  <div className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400">
                    Đang chờ xử lý
                  </div>
                </div>
                
                <div className="mt-2.5 pl-2">
                  {approversForRole.length > 0 ? (
                    approversForRole.map((user, i) => (
                      <div key={i} className="flex flex-col mt-1 first:mt-0">
                        <span className="text-sm font-medium text-foreground">PIC: {user.name}</span>
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground italic">Chưa xác định PIC</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

