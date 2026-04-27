"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion"
import { StatusBadge } from "@/components/business/status-badge"
import { AttachmentPanel, DocumentTypeOption } from "@/components/business/attachment-panel"
import { Separator } from "@/components/ui/separator"
import {
  Loader2, ArrowLeft, Send, CheckCircle2, XCircle, RotateCcw, Save, FileText, Link2,
} from "lucide-react"

// ─── Source type config ───────────────────────────────────────────
const SOURCE_BADGE: Record<string, { label: string; color: string }> = {
  AdvanceRequest:  { label: "Tạm ứng",   color: "bg-orange-100 text-orange-700" },
  PaymentRequest:  { label: "Thanh toán", color: "bg-blue-100 text-blue-700" },
  PurchaseRequest: { label: "Mua hàng",   color: "bg-purple-100 text-purple-700" },
  MaterialRequest: { label: "Vật tư",     color: "bg-green-100 text-green-700" },
}

// Allowed document types for settlement attachments
const SETTLEMENT_ALLOWED_TYPES: DocumentTypeOption[] = [
  { value: "Invoice", label: "Hóa đơn" },
  { value: "Quotation", label: "Báo giá" },
  { value: "Contract", label: "Hợp đồng" },
  { value: "AcceptanceCert", label: "Biên bản nghiệm thu" },
  { value: "Other", label: "Khác" },
]

// ─── Types ────────────────────────────────────────────────────────
interface SettlementDetail {
  id: string
  code: string
  title: string | null
  sourceType: string
  status: string
  actualAmount: number | null
  returnAmount: number
  additionalAmount: number
  invoiceNumber: string | null
  invoiceDate: string | null
  note: string | null
  createdAt: string
  createdBy: { id: string; name: string }
  advanceRequest: { code: string; amount: number; vendorName: string | null; purpose: string | null; company: { code: string } } | null
  paymentRequest: { code: string; amount: number; vendorName: string; description: string; company: { code: string } } | null
  purchaseRequest: { code: string; totalAmount: number | null; vendorName: string | null; note: string | null; company: { code: string } } | null
  materialRequest: { code: string; purpose: string | null; company: { code: string } } | null
  attachments: Array<{
    id: string; fileName: string; fileUrl: string; fileSize: number | null
    mimeType: string | null; documentType: string; uploadedAt: string
  }>
}

export default function SettlementDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const { data: session } = useSession()
  const [req, setReq] = useState<SettlementDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Editable fields
  const [title, setTitle] = useState("")
  const [note, setNote] = useState("")

  const fetchReq = useCallback(async () => {
    try {
      const res = await fetch(`/api/settlements/${id}`)
      const json = await res.json()
      if (res.ok) {
        setReq(json)
        setTitle(json.title || "")
        setNote(json.note || "")
      }
    } finally { setLoading(false) }
  }, [id])

  useEffect(() => { fetchReq() }, [fetchReq])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentUser = session?.user as any
  const isOwner = currentUser?.id === req?.createdBy.id
  const isDraft = req?.status === "Draft" || req?.status === "Returned"
  const canSubmit = isOwner && isDraft
  const canEdit = isOwner && isDraft

  const canApprove = req && req.status === "Submitted" &&
    currentUser && !isOwner && ["DeptHead", "Accountant", "ChiefAccountant", "Admin"].includes(currentUser.role)

  // ─── Source info helpers ────────────────────────────────────────
  function getSourceCode(): string {
    return req?.advanceRequest?.code
      || req?.paymentRequest?.code
      || req?.purchaseRequest?.code
      || req?.materialRequest?.code
      || "—"
  }

  function getSourceAmount(): number | null {
    if (req?.advanceRequest) return Number(req.advanceRequest.amount)
    if (req?.paymentRequest) return Number(req.paymentRequest.amount)
    if (req?.purchaseRequest?.totalAmount) return Number(req.purchaseRequest.totalAmount)
    return null
  }

  function getSourceDescription(): string {
    return req?.advanceRequest?.purpose
      || req?.paymentRequest?.description
      || req?.purchaseRequest?.note
      || req?.materialRequest?.purpose
      || ""
  }

  function getSourceVendor(): string | null {
    return req?.advanceRequest?.vendorName
      || req?.paymentRequest?.vendorName
      || req?.purchaseRequest?.vendorName
      || null
  }

  // ─── Actions ────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true)
    try {
      await fetch(`/api/settlements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, note }),
      })
      fetchReq()
    } finally { setSaving(false) }
  }

  async function handleSubmit() {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/settlements/${id}/submit`, { method: "POST" })
      if (res.ok) fetchReq()
    } finally { setActionLoading(false) }
  }

  async function handleApprove(action: "approve" | "reject" | "return") {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/settlements/${id}/approve`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      if (res.ok) fetchReq()
    } finally { setActionLoading(false) }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>
  if (!req) return <div className="text-center py-20 text-muted-foreground">Không tìm thấy phiếu quyết toán</div>

  const badge = SOURCE_BADGE[req.sourceType] || SOURCE_BADGE.AdvanceRequest
  const sourceAmount = getSourceAmount()
  const isAdvance = req.sourceType === "AdvanceRequest"
  const isReturn = Number(req.returnAmount) > 0
  const isAdditional = Number(req.additionalAmount) > 0

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/settlements")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">{req.code}</h2>
              <StatusBadge status={req.status as any} />
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${badge.color}`}>
                {badge.label}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-2">
              <span>Người lập: <strong className="text-foreground">{req.createdBy.name}</strong></span>
              <span>Lập lúc: {format(new Date(req.createdAt), "dd/MM/yyyy HH:mm")}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {canEdit && (
            <Button variant="outline" size="sm" onClick={handleSave} disabled={saving} className="gap-1">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Lưu
            </Button>
          )}
          {canSubmit && (
            <Button size="sm" onClick={handleSubmit} disabled={actionLoading} className="gap-1">
              {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              {req.status === "Returned" ? "Trình duyệt lại" : "Trình duyệt"}
            </Button>
          )}
          {canApprove && (
            <>
              <Button variant="outline" size="sm" className="gap-1 text-orange-600" onClick={() => handleApprove("return")}>
                <RotateCcw className="h-3.5 w-3.5" /> Trả lại
              </Button>
              <Button variant="destructive" size="sm" className="gap-1" onClick={() => handleApprove("reject")}>
                <XCircle className="h-3.5 w-3.5" /> Từ chối
              </Button>
              <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleApprove("approve")}>
                <CheckCircle2 className="h-3.5 w-3.5" /> Duyệt Quyết toán
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Title (editable) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" /> Tiêu đề quyết toán
          </CardTitle>
        </CardHeader>
        <CardContent>
          {canEdit ? (
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Quyết toán công tác phí Đà Nẵng T4/2026"
              className="text-base"
            />
          ) : (
            <p className="text-base font-medium">{req.title || <span className="text-muted-foreground italic">Chưa đặt tiêu đề</span>}</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Source reference */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Link2 className="h-5 w-5" /> Đề xuất gốc
            </CardTitle>
            <CardDescription>Tham chiếu đề xuất đã được phê duyệt</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-sm text-muted-foreground block mb-1">Mã tham chiếu:</span>
              <p className="font-medium text-blue-600">{getSourceCode()}</p>
            </div>
            {sourceAmount !== null && (
              <div>
                <span className="text-sm font-semibold text-muted-foreground block mb-1 uppercase tracking-wider">Số tiền gốc</span>
                <p className="text-2xl font-bold text-orange-600">{sourceAmount.toLocaleString("vi-VN")} ₫</p>
              </div>
            )}
            {getSourceVendor() && (
              <div>
                <span className="text-sm text-muted-foreground block mb-1">Đối tác:</span>
                <p>{getSourceVendor()}</p>
              </div>
            )}
            {getSourceDescription() && (
              <div>
                <span className="text-sm text-muted-foreground block mb-1">Nội dung:</span>
                <p className="text-sm whitespace-pre-wrap">{getSourceDescription()}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial details — only for Advance/Payment */}
        {isAdvance && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Thực tế chi</CardTitle>
              <CardDescription>Báo cáo sử dụng thực tế</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-sm font-semibold text-muted-foreground block mb-1 uppercase tracking-wider">Thực tế sử dụng</span>
                {req.actualAmount !== null ? (
                  <p className="text-2xl font-bold">{Number(req.actualAmount).toLocaleString("vi-VN")} ₫</p>
                ) : (
                  <p className="text-muted-foreground italic">Chưa khai báo</p>
                )}
              </div>

              <Separator />

              {isReturn && (
                <div>
                  <span className="text-sm text-muted-foreground block mb-1">Tiền nhân viên hoàn lại quỹ:</span>
                  <p className="text-xl font-bold text-emerald-600">{Number(req.returnAmount).toLocaleString("vi-VN")} ₫</p>
                </div>
              )}

              {isAdditional && (
                <div>
                  <span className="text-sm text-muted-foreground block mb-1">Tiền quỹ chi bù cho nhân viên:</span>
                  <p className="text-xl font-bold text-red-600">{Number(req.additionalAmount).toLocaleString("vi-VN")} ₫</p>
                </div>
              )}

              {!isReturn && !isAdditional && req.actualAmount !== null && (
                <div><p className="text-blue-600 font-medium">Khớp vừa đủ, không phát sinh dòng tiền phụ.</p></div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Non-advance: simple note card */}
        {!isAdvance && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ghi chú quyết toán</CardTitle>
              <CardDescription>Giải trình hoặc báo cáo kết quả</CardDescription>
            </CardHeader>
            <CardContent>
              {canEdit ? (
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ghi chú quyết toán, báo cáo kết quả sử dụng..."
                  rows={4}
                />
              ) : (
                <p className="whitespace-pre-wrap">{req.note || <span className="text-muted-foreground italic">Không có ghi chú.</span>}</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Attachments */}
      <Accordion type="single" collapsible defaultValue="attachments">
        <AccordionItem value="attachments">
          <AccordionTrigger className="text-lg font-semibold">
            Chứng từ đính kèm
            {req.attachments.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                {req.attachments.length}
              </span>
            )}
          </AccordionTrigger>
          <AccordionContent>
            <AttachmentPanel
              entityType="settlement"
              entityId={req.id}
              attachments={req.attachments}
              allowedTypes={SETTLEMENT_ALLOWED_TYPES}
              canUpload={canEdit}
              onChanged={fetchReq}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
