"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { RequestStatus, Role } from "@/types/domain"
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
import { Loader2, ArrowLeft, Send, CheckCircle2, XCircle, RotateCcw, AlertCircle } from "lucide-react"

interface AdvanceReqDetail {
  id: string; code: string; vendorName: string | null; status: RequestStatus
  amount: number; purpose: string; expectedReturnDate: string | null; createdById: string
  isLocked: boolean
  company: { code: string; name: string }
  createdBy: { id: string; name: string }
  approvalChain?: Role[]
  attachments: AttachmentItem[]
  approvalSteps: {
    id: string; role: Role; stepOrder: number; action: string | null
    comment: string | null; actedAt: string | null
    approver: { id: string; name: string; email: string }
  }[]
  expectedApprovers?: { role: Role; users: { name: string; email: string }[] }[]
  createdAt: string
}

export default function AdvanceRequestDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const { data: session } = useSession()
  const [req, setReq] = useState<AdvanceReqDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [approveOpen, setApproveOpen] = useState(false)
  const [approveAction, setApproveAction] = useState<"approve" | "reject" | "return">("approve")
  const [approveComment, setApproveComment] = useState("")
  const [commentError, setCommentError] = useState("")
  const [apiError, setApiError] = useState("")

  const fetchReq = useCallback(async () => {
    try {
      const res = await fetch(`/api/advance-requests/${id}`)
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
    ["DeptHead", "ChiefAccountant", "Director", "Admin"].includes(currentUser.role)

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
      const res = await fetch(`/api/advance-requests/${id}/submit`, { method: "POST" })
      if (res.ok) fetchReq()
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
      const res = await fetch(`/api/advance-requests/${id}/approve`, {
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
  if (!req) return <div className="text-center py-20 text-muted-foreground">Không tìm thấy đề nghị tạm ứng</div>

  // Dùng approvalChain từ API (dynamic theo số tiền), fallback về max chain
  const displayChain = req.approvalChain || ["DeptHead", "ChiefAccountant", "Director"]

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/advances")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">{req.code}</h2>
              <StatusBadge status={req.status} />
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              <span>Người tạo: <strong>{req.createdBy.name}</strong></span>
              <span>Công ty: <Badge variant="outline" className="text-xs">{req.company.code}</Badge></span>
              <span>{new Date(req.createdAt).toLocaleDateString("vi-VN")}</span>
            </div>
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
                currentChain={displayChain}
                status={req.status}
                expectedApprovers={req.expectedApprovers}
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          <Accordion type="multiple" defaultValue={["general", "attachments"]} className="w-full space-y-4">
            <AccordionItem value="general" className="bg-card border rounded-xl shadow-sm overflow-hidden px-4">
              <AccordionTrigger className="hover:no-underline py-4 font-semibold">
                Thông tin Tạm ứng
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4 border-t text-sm">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold block mb-1">
                        SỐ TIỀN
                      </span>
                      <span className="text-xl font-bold text-orange-600">
                        {Number(req.amount).toLocaleString("vi-VN")} ₫
                      </span>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold block mb-1">
                        HOÀN ỨNG DỰ KIẾN
                      </span>
                      <span className="text-base font-medium">
                        {req.expectedReturnDate
                          ? new Date(req.expectedReturnDate).toLocaleDateString("vi-VN")
                          : "—"}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground mb-1 block">Mục đích tạm ứng:</span>
                    <p className="whitespace-pre-wrap p-3 bg-muted/20 border rounded-md leading-relaxed">
                      {req.purpose}
                    </p>
                  </div>
                  {req.vendorName && (
                    <div>
                      <span className="text-muted-foreground mb-1 block">Đối tượng thụ hưởng:</span>
                      <p className="font-medium">{req.vendorName}</p>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Chứng từ đính kèm */}
            {(() => {
              const advanceDocTypes: DocumentTypeOption[] = [
                { value: "Other",          label: "Chứng từ chi phí" },
                { value: "Invoice",        label: "Hóa đơn tạm ứng" },
                { value: "AcceptanceCert", label: "Biên bản nghiệm thu" },
              ]
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
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-4 border-t">
                    <AttachmentPanel
                      entityType="advanceRequest"
                      entityId={req.id}
                      attachments={req.attachments}
                      allowedTypes={advanceDocTypes}
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

      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {approveAction === "approve" ? "Duyệt đề nghị" :
               approveAction === "reject" ? "Từ chối" : "Trả lại"}
            </DialogTitle>
            <DialogDescription>{req.code}</DialogDescription>
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
