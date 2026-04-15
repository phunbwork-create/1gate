"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { format } from "date-fns"
import { Role } from "@/types/domain"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { StatusBadge } from "@/components/business/status-badge"
import { ApprovalTimeline } from "@/components/business/approval-timeline"
import { Loader2, ArrowLeft, Send, CheckCircle2, XCircle, CreditCard, Banknote, Receipt } from "lucide-react"

interface PaymentPlanDetail {
  id: string; code: string; status: string; totalAmount: number; note: string | null; plannedDate: string | null
  createdBy: { id: string; name: string }; createdAt: string; company: { code: string; name: string }
  approvalSteps: {
    id: string; role: Role; stepOrder: number; action: string | null
    comment: string | null; actedAt: string | null
    approver: { id: string; name: string; email: string }
  }[]
  items: {
    id: string; originalAmount: number; approvedAmount: number | null; status: string
    paymentRequest: { code: string; description: string; vendorName: string } | null
    advanceRequest: { code: string; purpose: string; vendorName: string | null } | null
  }[]
  expectedApprovers?: { role: Role; users: { name: string; email: string }[] }[]
}

export default function PaymentPlanDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const { data: session } = useSession()
  const [plan, setPlan] = useState<PaymentPlanDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [approveOpen, setApproveOpen] = useState(false)
  const [approveAction, setApproveAction] = useState<"approve" | "reject">("approve")
  const [approveComment, setApproveComment] = useState("")
  const [rejectedItemIds, setRejectedItemIds] = useState<string[]>([])

  const fetchPlan = useCallback(async () => {
    try {
      const res = await fetch(`/api/payment-plans/${id}`)
      const json = await res.json()
      if (res.ok) setPlan(json)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchPlan() }, [fetchPlan])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentUser = session?.user as any
  const isOwner = currentUser?.id === plan?.createdBy.id
  const isDraft = plan?.status === "Draft" || plan?.status === "Rejected"
  const canSubmit = isOwner && isDraft

  // Approval logic for ChiefAccountant and Director
  const canApprove = plan && ["PendingChiefAccountant", "PendingDirector"].includes(plan.status) &&
    currentUser && !isOwner && ["ChiefAccountant", "Director", "Admin"].includes(currentUser.role)
    
  const isDirector = plan?.status === "PendingDirector" && currentUser?.role === "Director"

  const canExecute = plan && ["Approved", "PartiallyApproved"].includes(plan.status) &&
    currentUser && ["Accountant", "ChiefAccountant", "Admin"].includes(currentUser.role)

  async function handleSubmit() {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/payment-plans/${id}/submit`, { method: "POST" })
      if (res.ok) fetchPlan()
    } finally { setActionLoading(false) }
  }

  async function handleApprove() {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/payment-plans/${id}/approve`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: approveAction, comment: approveComment || null, rejectedItemIds: approveAction === "approve" ? rejectedItemIds : undefined }),
      })
      if (res.ok) { setApproveOpen(false); fetchPlan() }
    } finally { setActionLoading(false) }
  }

  async function handleExecute() {
    if (!confirm("Xác nhận đã chi tiền cho kế hoạch này? Các phiếu sẽ tự động cập nhật về trạng thái Đã thanh toán.")) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/payment-plans/${id}/execute`, { method: "POST" })
      if (res.ok) fetchPlan()
    } finally { setActionLoading(false) }
  }

  const handleToggleRejectItem = (itemId: string, checked: boolean) => {
    if (checked) setRejectedItemIds(prev => [...prev, itemId])
    else setRejectedItemIds(prev => prev.filter(id => id !== itemId))
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>
  if (!plan) return <div className="text-center py-20 text-muted-foreground">Không tìm thấy kế hoạch dòng tiền</div>

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/payment-plans")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">{plan.code}</h2>
              <StatusBadge status={plan.status as any} />
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-2">
              <span>Người lập: <strong className="text-foreground">{plan.createdBy.name}</strong></span>
              <span>Ngày lập: {format(new Date(plan.createdAt), "dd/MM/yyyy")}</span>
              <span>Dự chi: <strong className="text-foreground">{plan.plannedDate ? format(new Date(plan.plannedDate), "dd/MM/yyyy") : "—"}</strong></span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {canSubmit && (
            <Button size="sm" onClick={handleSubmit} disabled={actionLoading} className="gap-1">
              {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} 
              Trình duyệt
            </Button>
          )}
          {canApprove && (
            <>
              <Button variant="destructive" size="sm" className="gap-1"
                onClick={() => { setApproveAction("reject"); setApproveComment(""); setApproveOpen(true) }}>
                <XCircle className="h-3.5 w-3.5" /> Từ chối toàn bộ
              </Button>
              <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => { setApproveAction("approve"); setApproveComment(""); setApproveOpen(true) }}>
                <CheckCircle2 className="h-3.5 w-3.5" /> Duyệt kế hoạch {rejectedItemIds.length > 0 ? `(Bỏ ${rejectedItemIds.length})` : ""}
              </Button>
            </>
          )}
          {canExecute && (
            <Button size="sm" className="gap-1 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleExecute} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Receipt className="h-3.5 w-3.5" />}
              Đã chi tiền (Execute)
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Nội dung DS chờ duyệt */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
            <div className="p-5 border-b flex justify-between items-center bg-muted/20">
              <h3 className="font-semibold text-lg">Danh sách khoản chi đợt này</h3>
              <div className="text-right">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Tổng cộng ({plan.items.length} món)</p>
                <p className="text-2xl font-bold text-destructive">{Number(plan.totalAmount).toLocaleString("vi-VN")} ₫</p>
              </div>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  {isDirector && <TableHead className="w-12 text-center text-red-500">Gạch</TableHead>}
                  <TableHead>Loại</TableHead>
                  <TableHead>Mã tham chiếu</TableHead>
                  <TableHead>Nội dung</TableHead>
                  <TableHead className="text-right">Số tiền</TableHead>
                  {plan.status !== "Draft" && plan.status !== "PendingChiefAccountant" && plan.status !== "PendingDirector" && (
                    <TableHead className="text-center">Tình trạng</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {plan.items.map((item) => {
                  const req = item.paymentRequest || item.advanceRequest
                  if (!req) return null
                  const isPayment = !!item.paymentRequest
                  const isRejectedByDirector = rejectedItemIds.includes(item.id)
                  
                  return (
                    <TableRow key={item.id} className={isRejectedByDirector ? "opacity-50 line-through bg-muted/50" : ""}>
                      {isDirector && (
                        <TableCell className="text-center">
                          <Checkbox checked={isRejectedByDirector} onCheckedChange={(c) => handleToggleRejectItem(item.id, !!c)} />
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge variant="outline" className={isPayment ? "text-blue-600 bg-blue-50" : "text-orange-600 bg-orange-50"}>
                          {isPayment ? "T/Toán" : "T/Ứng"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-muted-foreground">{req.code}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={(req as any).purpose || (req as any).description}>
                        {(req as any).purpose || (req as any).description}
                      </TableCell>
                      <TableCell className="text-right font-medium">{Number(item.originalAmount).toLocaleString("vi-VN")}</TableCell>
                      {plan.status !== "Draft" && plan.status !== "PendingChiefAccountant" && plan.status !== "PendingDirector" && (
                        <TableCell className="text-center">
                          <Badge variant={item.status === "Approved" ? "default" : item.status === "Rejected" ? "destructive" : "secondary"}>
                            {item.status}
                          </Badge>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {plan.note && (
            <div className="bg-card border rounded-xl p-5 shadow-sm">
              <span className="text-sm font-semibold text-muted-foreground mb-2 block uppercase tracking-wider">Ghi chú kế hoạch</span>
              <p className="text-sm leading-relaxed">{plan.note}</p>
            </div>
          )}
        </div>

        {/* Cột phải: Timeline duyệt */}
        <div className="lg:col-span-4">
          <div className="sticky top-6 bg-card border rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/40">
              <h3 className="font-semibold text-sm">Luồng phê duyệt dòng tiền</h3>
            </div>
            <div className="p-2 pb-4">
              <ApprovalTimeline 
                steps={plan.approvalSteps} 
                currentChain={["ChiefAccountant", "Director"]} 
                status={plan.status} 
                expectedApprovers={plan.expectedApprovers} 
              />
            </div>
          </div>
        </div>
      </div>

      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{approveAction === "approve" ? "Duyệt kế hoạch" : "Từ chối kế hoạch"}</DialogTitle>
            <DialogDescription>
              {approveAction === "approve" && rejectedItemIds.length > 0 
                ? `Bạn đang chuẩn bị duyệt Kế hoạch nhưng CÓ ${rejectedItemIds.length} khoản bị gạch bỏ (Từ chối).` 
                : "Nhập thêm bình luận (nếu có)"}
            </DialogDescription>
          </DialogHeader>
          <Textarea 
            placeholder="Ghi chú / Nhận xét..." 
            value={approveComment} 
            onChange={(e) => setApproveComment(e.target.value)} 
            rows={3} 
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)}>Hủy</Button>
            <Button onClick={handleApprove} disabled={actionLoading}
              variant={approveAction === "reject" ? "destructive" : "default"}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
