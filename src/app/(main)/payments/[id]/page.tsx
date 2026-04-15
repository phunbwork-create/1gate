"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { RequestStatus, Role } from "@prisma/client"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion"
import { StatusBadge } from "@/components/business/status-badge"
import { ApprovalTimeline } from "@/components/business/approval-timeline"
import { AttachmentPanel, type AttachmentItem, type DocumentTypeOption } from "@/components/business/attachment-panel"
import {
  Loader2, ArrowLeft, Send, CheckCircle2, XCircle, RotateCcw, AlertCircle,
} from "lucide-react"

// Approval chain for ĐNTT: Accountant only
const PAYMENT_CHAIN: Role[] = ["Accountant"]

interface PaymentReqDetail {
  id: string; code: string; vendorName: string; status: RequestStatus; createdById: string
  amount: number; description: string; invoiceScenario: string; isLocked: boolean
  invoiceNumber: string | null; invoiceDate: string | null
  bankAccount: string | null; bankName: string | null
  company: { code: string; name: string }
  createdBy: { id: string; name: string }
  vendor: { id: string; name: string; taxCode: string | null } | null
  purchaseRequest: { id: string; code: string } | null
  attachments: AttachmentItem[]
  approvalSteps: {
    id: string; role: Role; stepOrder: number; action: string | null
    comment: string | null; actedAt: string | null
    approver: { id: string; name: string; email: string }
  }[]
  expectedApprovers?: { role: Role; users: { name: string; email: string }[] }[]
  createdAt: string
}

const SCENARIO_LABELS: Record<string, string> = {
  HasInvoice: "Đã có hóa đơn",
  InvoiceLater: "Hóa đơn nộp sau",
  NoInvoice: "Không có hóa đơn",
}

export default function PaymentRequestDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const { data: session } = useSession()
  const [req, setReq] = useState<PaymentReqDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [approveOpen, setApproveOpen] = useState(false)
  const [approveAction, setApproveAction] = useState<"approve" | "reject" | "return">("approve")
  const [approveComment, setApproveComment] = useState("")
  const [commentError, setCommentError] = useState("")
  const [apiError, setApiError] = useState("")

  const fetchReq = useCallback(async () => {
    try {
      const res = await fetch(`/api/payment-requests/${id}`)
      const json = await res.json()
      if (res.ok) setReq(json)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { fetchReq() }, [fetchReq])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentUser = session?.user as any
  const isOwner = currentUser?.id === req?.createdById
  const isDraftOrReturned = req?.status === "Draft" || req?.status === "Returned"
  const canSubmit = isOwner && isDraftOrReturned
  const canApprove = req && ["Submitted", "PendingApproval"].includes(req.status) &&
    currentUser && !isOwner &&
    ["Accountant", "Admin"].includes(currentUser.role)

  function openApproveDialog(action: "approve" | "reject" | "return") {
    setApproveAction(action)
    setApproveComment("")
    setCommentError("")
    setApiError("")
    setApproveOpen(true)
  }

  async function handleSubmit() {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/payment-requests/${id}/submit`, { method: "POST" })
      const json = await res.json()
      if (res.ok) fetchReq()
      else setApiError(json.error || "Có lỗi xảy ra")
    } catch (e) { console.error(e) }
    finally { setActionLoading(false) }
  }

  async function handleApprove() {
    // Issue #3: comment bắt buộc khi từ chối / trả lại
    if ((approveAction === "reject" || approveAction === "return") && !approveComment.trim()) {
      setCommentError("Vui lòng nhập lý do khi từ chối hoặc trả lại")
      return
    }
    setCommentError("")
    setActionLoading(true)
    try {
      const res = await fetch(`/api/payment-requests/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: approveAction, comment: approveComment || null }),
      })
      const json = await res.json()
      if (res.ok) { setApproveOpen(false); fetchReq() }
      else setApiError(json.error || "Có lỗi xảy ra")
    } catch (e) { console.error(e) }
    finally { setActionLoading(false) }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>
  if (!req) return <div className="text-center py-20 text-muted-foreground">Không tìm thấy đề nghị thanh toán</div>

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/payments")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">{req.code}</h2>
              <StatusBadge status={req.status} />
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              <span>NCC: <strong>{req.vendorName}</strong></span>
              <span>Người tạo: <strong>{req.createdBy.name}</strong></span>
              <span><Badge variant="outline" className="text-xs">{req.company.code}</Badge></span>
            </div>
            {apiError && (
              <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                <AlertCircle className="h-3.5 w-3.5" /> {apiError}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {canSubmit && (
            <Button size="sm" onClick={handleSubmit} disabled={actionLoading} className="gap-1">
              {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              {req.status === "Returned" ? "Trình lại" : "Trình duyệt"}
            </Button>
          )}
          {canApprove && (
            <>
              <Button variant="outline" size="sm" className="gap-1 text-orange-600"
                onClick={() => openApproveDialog("return")}>
                <RotateCcw className="h-3.5 w-3.5" /> Trả lại
              </Button>
              <Button variant="destructive" size="sm" className="gap-1"
                onClick={() => openApproveDialog("reject")}>
                <XCircle className="h-3.5 w-3.5" /> Từ chối
              </Button>
              <Button size="sm" className="gap-1"
                onClick={() => openApproveDialog("approve")}>
                <CheckCircle2 className="h-3.5 w-3.5" /> Duyệt
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4">
          <div className="sticky top-6 bg-card border rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/40">
              <h3 className="font-semibold">Workflow</h3>
            </div>
            <div className="p-2 pb-4">
              <ApprovalTimeline
                steps={req.approvalSteps}
                currentChain={PAYMENT_CHAIN}
                status={req.status}
                expectedApprovers={req.expectedApprovers}
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          <Accordion type="multiple" defaultValue={["payment", "invoice", "attachments"]} className="w-full space-y-4">

            {/* Thông tin thanh toán */}
            <AccordionItem value="payment" className="bg-card border rounded-xl shadow-sm overflow-hidden px-4">
              <AccordionTrigger className="hover:no-underline py-4 font-semibold">
                Thông tin Thanh toán
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4 border-t text-sm">
                <div className="space-y-4">
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold block mb-1">
                      SỐ TIỀN
                    </span>
                    <span className="text-2xl font-bold text-orange-600">
                      {Number(req.amount).toLocaleString("vi-VN")} ₫
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground block mb-0.5">Nhà cung cấp</span>
                      <strong>{req.vendorName}</strong>
                    </div>
                    {req.bankAccount && (
                      <div>
                        <span className="text-muted-foreground block mb-0.5">Tài khoản ngân hàng</span>
                        <strong className="font-mono">{req.bankAccount}</strong>
                        {req.bankName && <span className="text-muted-foreground"> — {req.bankName}</span>}
                      </div>
                    )}
                  </div>

                  <div>
                    <span className="text-muted-foreground mb-1 block">Nội dung thanh toán:</span>
                    <p className="whitespace-pre-wrap p-3 bg-muted/20 border rounded-md leading-relaxed">
                      {req.description}
                    </p>
                  </div>

                  {req.purchaseRequest && (
                    <div>
                      <span className="text-muted-foreground mb-0.5 block">Liên kết ĐNMH:</span>
                      <Badge variant="outline" className="font-mono">
                        {req.purchaseRequest.code}
                      </Badge>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Hóa đơn */}
            <AccordionItem value="invoice" className="bg-card border rounded-xl shadow-sm overflow-hidden px-4">
              <AccordionTrigger className="hover:no-underline py-4 font-semibold">
                Hóa đơn
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4 border-t text-sm">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Loại:</span>
                    <Badge variant="outline">
                      {SCENARIO_LABELS[req.invoiceScenario] || req.invoiceScenario}
                    </Badge>
                  </div>
                  {req.invoiceNumber && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-muted-foreground block mb-0.5">Số hóa đơn</span>
                        <strong className="font-mono">{req.invoiceNumber}</strong>
                      </div>
                      {req.invoiceDate && (
                        <div>
                          <span className="text-muted-foreground block mb-0.5">Ngày hóa đơn</span>
                          <strong>{new Date(req.invoiceDate).toLocaleDateString("vi-VN")}</strong>
                        </div>
                      )}
                    </div>
                  )}
                  {!req.invoiceNumber && (
                    <p className="text-muted-foreground italic">Chưa có số hóa đơn</p>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Chứng từ đính kèm */}
            {(() => {
              const amount = Number(req.amount)
              const needsContract = amount > 20_000_000
              const needsQuotation = amount > 5_000_000

              // Build allowed types for F-05, with required flags based on amount
              const paymentDocTypes: DocumentTypeOption[] = [
                { value: "Invoice",        label: "Hóa đơn" },
                { value: "Quotation",      label: "Báo giá",             required: needsQuotation && !needsContract },
                { value: "Contract",       label: "Hợp đồng",            required: needsContract },
                { value: "AcceptanceCert", label: "Biên bản nghiệm thu" },
                { value: "Other",          label: "Khác" },
              ]

              const missingRequired = needsContract
                ? !req.attachments.some((a) => a.documentType === "Contract")
                : needsQuotation
                  ? !req.attachments.some((a) => a.documentType === "Quotation")
                  : false

              return (
                <AccordionItem value="attachments" className="bg-card border rounded-xl shadow-sm overflow-hidden px-4">
                  <AccordionTrigger className="hover:no-underline py-4 font-semibold">
                    <span className="flex items-center gap-2">
                      Chứng từ đính kèm
                      {req.attachments.length > 0 && (
                        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                          {req.attachments.length}
                        </span>
                      )}
                      {missingRequired && (
                        <span className="text-xs text-destructive font-normal flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {needsContract ? "Cần Hợp đồng" : "Cần Báo giá"}
                        </span>
                      )}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-4 border-t">
                    {needsContract && (
                      <p className="text-xs text-red-600 mb-3 flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Số tiền &gt; 20 triệu — bắt buộc đính kèm <strong>Hợp đồng</strong> trước khi trình duyệt
                      </p>
                    )}
                    {needsQuotation && !needsContract && (
                      <p className="text-xs text-amber-600 mb-3 flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Số tiền &gt; 5 triệu — bắt buộc đính kèm <strong>Báo giá</strong> trước khi trình duyệt
                      </p>
                    )}
                    <AttachmentPanel
                      entityType="paymentRequest"
                      entityId={req.id}
                      attachments={req.attachments}
                      allowedTypes={paymentDocTypes}
                      canUpload={!req.isLocked && isOwner}
                      onChanged={fetchReq}
                    />
                  </AccordionContent>
                </AccordionItem>
              )
            })()}

          </Accordion>
        </div>
      </div>

      {/* Approval Dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {approveAction === "approve" ? "Duyệt đề nghị" :
               approveAction === "reject" ? "Từ chối" : "Trả lại"}
            </DialogTitle>
            <DialogDescription>{req.code} — {Number(req.amount).toLocaleString("vi-VN")} ₫</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Textarea
              placeholder={
                approveAction === "approve"
                  ? "Nhận xét (không bắt buộc)..."
                  : "Nhập lý do từ chối / trả lại... (bắt buộc)"
              }
              value={approveComment}
              onChange={(e) => { setApproveComment(e.target.value); setCommentError("") }}
              rows={3}
              className={commentError ? "border-destructive" : ""}
            />
            {commentError && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" /> {commentError}
              </p>
            )}
            {apiError && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" /> {apiError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)}>Hủy</Button>
            <Button
              onClick={handleApprove}
              disabled={actionLoading}
              variant={approveAction === "reject" ? "destructive" : "default"}
            >
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
