"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { format } from "date-fns"
import { Role } from "@/types/domain"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { StatusBadge } from "@/components/business/status-badge"
import { ApprovalTimeline } from "@/components/business/approval-timeline"
import { Loader2, ArrowLeft, Send, CheckCircle2, XCircle, Receipt, Printer, Building2 } from "lucide-react"

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
    paymentRequest: { code: string; description: string; vendorName: string; bankAccount?: string; bankName?: string; amount: number } | null
    advanceRequest: { code: string; purpose: string; vendorName: string | null; amount: number } | null
  }[]
  expectedApprovers?: { role: Role; users: { name: string; email: string }[] }[]
}

interface Voucher {
  id: string; code: string; totalAmount: number; note: string | null; executedAt: string
  plan: {
    code: string
    company: { name: string; code: string }
    createdBy: { name: string }
    items: {
      id: string; originalAmount: number; approvedAmount: number | null; status: string
      paymentRequest: { code: string; vendorName: string; bankAccount?: string; bankName?: string; description: string; amount: number } | null
      advanceRequest: { code: string; vendorName: string | null; purpose: string; amount: number } | null
    }[]
  }
}

export default function PaymentPlanDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const { data: session } = useSession()
  const printRef = useRef<HTMLDivElement>(null)

  const [plan, setPlan] = useState<PaymentPlanDetail | null>(null)
  const [voucher, setVoucher] = useState<Voucher | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // Approve dialog
  const [approveOpen, setApproveOpen] = useState(false)
  const [approveAction, setApproveAction] = useState<"approve" | "reject">("approve")
  const [approveComment, setApproveComment] = useState("")
  const [rejectedItemIds, setRejectedItemIds] = useState<string[]>([])

  // Execute dialog
  const [executeOpen, setExecuteOpen] = useState(false)
  const [executeNote, setExecuteNote] = useState("")
  const [executeDate, setExecuteDate] = useState(format(new Date(), "yyyy-MM-dd"))

  const fetchPlan = useCallback(async () => {
    try {
      const res = await fetch(`/api/payment-plans/${id}`)
      const json = await res.json()
      if (res.ok) setPlan(json)
    } finally {
      setLoading(false)
    }
  }, [id])

  const fetchVoucher = useCallback(async () => {
    const res = await fetch(`/api/payment-plans/${id}/voucher`)
    if (res.ok) setVoucher(await res.json())
  }, [id])

  useEffect(() => { fetchPlan() }, [fetchPlan])
  useEffect(() => {
    if (plan?.status === "Executed") fetchVoucher()
  }, [plan?.status, fetchVoucher])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentUser = session?.user as any
  const isOwner = currentUser?.id === plan?.createdBy.id
  const isDraft = plan?.status === "Draft" || plan?.status === "Rejected"
  const canSubmit = isOwner && isDraft
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

  async function handleExecuteConfirm() {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/payment-plans/${id}/execute`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: executeNote || null, executedAt: new Date(executeDate).toISOString() }),
      })
      if (res.ok) { setExecuteOpen(false); await fetchPlan(); await fetchVoucher() }
    } finally { setActionLoading(false) }
  }

  function handlePrint() {
    const content = printRef.current
    if (!content) return
    const w = window.open("", "_blank", "width=900,height=700")
    if (!w) return
    w.document.write(`
      <html><head><title>Phiếu Chi ${voucher?.code}</title>
      <style>
        body { font-family: 'Times New Roman', serif; margin: 40px; color: #111; }
        h1 { text-align:center; font-size:22px; margin-bottom:4px; }
        .subtitle { text-align:center; font-size:14px; color:#555; margin-bottom:24px; }
        .meta { display:flex; justify-content:space-between; margin-bottom:20px; font-size:14px; }
        table { width:100%; border-collapse:collapse; margin-top:16px; font-size:13px; }
        th,td { border:1px solid #ccc; padding:8px 10px; }
        th { background:#f4f4f4; text-align:left; }
        .amount { text-align:right; font-weight:bold; }
        .total { font-weight:bold; font-size:15px; }
        .signatures { display:flex; justify-content:space-around; margin-top:48px; font-size:13px; text-align:center; }
        .sig-box { width:180px; }
        .sig-line { border-top:1px solid #999; margin-top:60px; padding-top:6px; }
        @media print { body { margin:20px; } }
      </style></head><body>
      ${content.innerHTML}
      </body></html>
    `)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print() }, 300)
  }

  const handleToggleRejectItem = (itemId: string, checked: boolean) => {
    if (checked) setRejectedItemIds(prev => [...prev, itemId])
    else setRejectedItemIds(prev => prev.filter(i => i !== itemId))
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>
  if (!plan) return <div className="text-center py-20 text-muted-foreground">Không tìm thấy kế hoạch dòng tiền</div>

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/payment-plans")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">{plan.code}</h2>
              <StatusBadge status={plan.status as never} />
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
                <XCircle className="h-3.5 w-3.5" /> Từ chối
              </Button>
              <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => { setApproveAction("approve"); setApproveComment(""); setApproveOpen(true) }}>
                <CheckCircle2 className="h-3.5 w-3.5" /> Duyệt {rejectedItemIds.length > 0 ? `(Bỏ ${rejectedItemIds.length})` : ""}
              </Button>
            </>
          )}
          {canExecute && (
            <Button size="sm" className="gap-1 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setExecuteOpen(true)} disabled={actionLoading}>
              <Receipt className="h-3.5 w-3.5" /> Ghi nhận chi tiền
            </Button>
          )}
          {voucher && (
            <Button size="sm" variant="outline" className="gap-1" onClick={handlePrint}>
              <Printer className="h-3.5 w-3.5" /> In phiếu chi
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          {/* Danh sách khoản chi */}
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
                      <TableCell className="max-w-[200px] truncate" title={(req as { purpose?: string; description?: string }).purpose || (req as { purpose?: string; description?: string }).description}>
                        {(req as { purpose?: string; description?: string }).purpose || (req as { purpose?: string; description?: string }).description}
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

          {/* Phiếu chi section */}
          {voucher && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-emerald-600" />
                  <h3 className="font-semibold text-emerald-800">Phiếu chi đã được tạo</h3>
                </div>
                <Badge className="bg-emerald-600 text-white">{voucher.code}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Ngày chi:</span>
                  <span className="ml-2 font-medium">{format(new Date(voucher.executedAt), "dd/MM/yyyy")}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Tổng chi:</span>
                  <span className="ml-2 font-bold text-emerald-700">{Number(voucher.totalAmount).toLocaleString("vi-VN")} ₫</span>
                </div>
                {voucher.note && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Ghi chú:</span>
                    <span className="ml-2">{voucher.note}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Cột phải: Timeline */}
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

      {/* Approve dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{approveAction === "approve" ? "Duyệt kế hoạch" : "Từ chối kế hoạch"}</DialogTitle>
            <DialogDescription>
              {approveAction === "approve" && rejectedItemIds.length > 0
                ? `Bạn đang chuẩn bị duyệt nhưng CÓ ${rejectedItemIds.length} khoản bị gạch bỏ.`
                : "Nhập thêm bình luận (nếu có)"}
            </DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Ghi chú / Nhận xét..." value={approveComment}
            onChange={(e) => setApproveComment(e.target.value)} rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)}>Hủy</Button>
            <Button onClick={handleApprove} disabled={actionLoading}
              variant={approveAction === "reject" ? "destructive" : "default"}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Execute dialog */}
      <Dialog open={executeOpen} onOpenChange={setExecuteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-blue-600" /> Ghi nhận chi tiền
            </DialogTitle>
            <DialogDescription>
              Xác nhận đã thực hiện chi tiền cho kế hoạch <strong>{plan.code}</strong>.
              Hệ thống sẽ tạo phiếu chi và đóng các phiếu liên quan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Ngày chi thực tế</Label>
              <Input type="date" value={executeDate} onChange={(e) => setExecuteDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Ghi chú phiếu chi <span className="text-muted-foreground text-xs">(tuỳ chọn)</span></Label>
              <Textarea placeholder="VD: Chuyển khoản đợt 1, ngân hàng Vietcombank..." value={executeNote}
                onChange={(e) => setExecuteNote(e.target.value)} rows={3} />
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <p className="font-medium">Tổng chi: <span className="text-blue-600 font-bold">{Number(plan.totalAmount).toLocaleString("vi-VN")} ₫</span></p>
              <p className="text-muted-foreground text-xs mt-1">Sau khi xác nhận, phiếu chi sẽ được tạo và không thể hoàn tác.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExecuteOpen(false)}>Hủy</Button>
            <Button onClick={handleExecuteConfirm} disabled={actionLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
              Xác nhận chi tiền
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden print content */}
      {voucher && (
        <div ref={printRef} className="hidden">
          <h1>PHIẾU CHI TIỀN</h1>
          <p className="subtitle">{voucher.plan.company.name} ({voucher.plan.company.code})</p>
          <div className="meta">
            <span>Mã phiếu: <strong>{voucher.code}</strong></span>
            <span>Kế hoạch: <strong>{voucher.plan.code}</strong></span>
            <span>Ngày chi: <strong>{format(new Date(voucher.executedAt), "dd/MM/yyyy")}</strong></span>
          </div>
          {voucher.note && <p>Ghi chú: {voucher.note}</p>}
          <table>
            <thead>
              <tr>
                <th>STT</th><th>Mã</th><th>Loại</th><th>Nội dung</th><th>NCC / Ngân hàng</th><th style={{ textAlign: "right" }}>Số tiền (₫)</th>
              </tr>
            </thead>
            <tbody>
              {voucher.plan.items.filter(i => i.status === "Approved").map((item, idx) => {
                const req = item.paymentRequest || item.advanceRequest
                if (!req) return null
                const isPayment = !!item.paymentRequest
                const desc = (req as { description?: string; purpose?: string }).description || (req as { description?: string; purpose?: string }).purpose || ""
                const bank = isPayment ? `${item.paymentRequest?.bankName || ""} ${item.paymentRequest?.bankAccount || ""}`.trim() : ""
                return (
                  <tr key={item.id}>
                    <td>{idx + 1}</td>
                    <td>{req.code}</td>
                    <td>{isPayment ? "Thanh toán" : "Tạm ứng"}</td>
                    <td>{desc}</td>
                    <td>{req.vendorName}{bank ? ` — ${bank}` : ""}</td>
                    <td className="amount">{Number(item.approvedAmount ?? item.originalAmount).toLocaleString("vi-VN")}</td>
                  </tr>
                )
              })}
              <tr className="total">
                <td colSpan={5} style={{ textAlign: "right" }}>TỔNG CỘNG</td>
                <td className="amount">{Number(voucher.totalAmount).toLocaleString("vi-VN")}</td>
              </tr>
            </tbody>
          </table>
          <div className="signatures">
            <div className="sig-box"><p>Kế toán lập phiếu</p><div className="sig-line"><em>{voucher.plan.createdBy.name}</em></div></div>
            <div className="sig-box"><p>Kế toán trưởng</p><div className="sig-line"></div></div>
            <div className="sig-box"><p>Giám đốc duyệt</p><div className="sig-line"></div></div>
          </div>
        </div>
      )}
    </div>
  )
}
