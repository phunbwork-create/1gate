"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { priceVisible } from "@/lib/permissions"
import { Role } from "@/types/domain"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { AttachmentPanel, type AttachmentItem } from "@/components/business/attachment-panel"
import {
  Loader2, ArrowLeft, Trash2, FileCheck, EyeOff, Calendar, Building2, User, Hash, Banknote,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// ─── Contract metadata type (stored as JSON in description) ──────────────────
interface ContractMeta {
  note?: string
  contractType?: string
  partnerName?: string
  partnerTaxCode?: string
  partnerRepresentative?: string
  signDate?: string
  effectiveDate?: string
  expiryDate?: string
  contractValue?: number
  vatRate?: number
  currency?: string
}

function parseContractMeta(description: string | null): ContractMeta {
  if (!description) return {}
  try {
    return JSON.parse(description)
  } catch {
    return { note: description }
  }
}

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  purchase: "Hợp đồng Mua vào",
  sale: "Hợp đồng Bán ra",
  internal: "Nội bộ",
  other: "Khác",
}

// Loại tài liệu cho phép upload
const CONTRACT_ALLOWED_TYPES = [
  { value: "Contract" as const, label: "Hợp đồng", required: true },
  { value: "Quotation" as const, label: "Báo giá" },
  { value: "AcceptanceCert" as const, label: "Biên bản nghiệm thu" },
  { value: "Invoice" as const, label: "Hóa đơn" },
  { value: "Other" as const, label: "Tài liệu khác" },
]

// ─── Types ───────────────────────────────────────────────────────────────────
interface PlanDetail {
  id: string; code: string; contractCode?: string | null; title: string; description: string | null
  status: string
  company: { code: string; name: string }
  createdBy: { id: string; name: string; email: string }
  createdById: string
  attachments?: AttachmentItem[]
  createdAt: string
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function ContractDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const { data: session } = useSession()
  const [plan, setPlan] = useState<PlanDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const { toast } = useToast()

  const fetchPlan = useCallback(async () => {
    try {
      const res = await fetch(`/api/procurement/${id}`)
      const json = await res.json()
      if (res.ok) setPlan(json)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { fetchPlan() }, [fetchPlan])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentUser = session?.user as any
  const userRole = (currentUser?.role as Role) || "Staff"
  const showPrice = priceVisible(userRole)
  const isOwner = currentUser?.id === plan?.createdById
  const isDraft = plan?.status === "Draft"
  const canCancel = (isOwner || userRole === "Admin") && isDraft

  async function handleCancel() {
    setCancelling(true)
    try {
      const res = await fetch(`/api/procurement/${id}`, { method: "DELETE" })
      const json = await res.json()
      if (res.ok) {
        toast({ title: "Đã hủy", description: "Hồ sơ đã được hủy thành công." })
        router.push("/procurement")
      } else {
        toast({ title: "Lỗi", description: json.error || "Không thể hủy hồ sơ", variant: "destructive" })
      }
    } catch {
      toast({ title: "Lỗi", description: "Kết nối server thất bại", variant: "destructive" })
    } finally {
      setCancelling(false)
      setCancelOpen(false)
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>
  if (!plan) return <div className="text-center py-20 text-muted-foreground">Không tìm thấy hồ sơ</div>

  const meta = parseContractMeta(plan.description)
  const vatAmount = (meta.contractValue || 0) * ((meta.vatRate || 0) / 100)
  const totalValue = (meta.contractValue || 0) + vatAmount

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="/procurement">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <FileCheck className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-bold tracking-tight">{plan.contractCode || plan.code}</h2>
            </div>
            <p className="text-lg mt-1">{plan.title}</p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              <span>Người tạo: <strong>{plan.createdBy.name}</strong></span>
              <span>Công ty: <Badge variant="outline" className="text-xs">{plan.company.code}</Badge></span>
              <span>Ngày tạo: {(() => { const d = new Date(plan.createdAt); const pad = (n: number) => String(n).padStart(2, "0"); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}` })()}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {canCancel && (
            <Button variant="destructive" size="sm" className="gap-1" onClick={() => setCancelOpen(true)}>
              <Trash2 className="h-3.5 w-3.5" /> Hủy hồ sơ
            </Button>
          )}
        </div>
      </div>

      {/* Content — single column, no workflow */}
      <Accordion type="multiple" defaultValue={["info", "attachments"]} className="w-full space-y-4">

        {/* Thông tin hợp đồng */}
        <AccordionItem value="info" className="bg-card border rounded-xl shadow-sm overflow-hidden px-4">
          <AccordionTrigger className="hover:no-underline py-4 font-semibold">
            Thông tin hồ sơ / hợp đồng
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-5 border-t space-y-5">
            {/* Ghi chú */}
            {meta.note && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Ghi chú</span>
                <p className="text-sm whitespace-pre-wrap">{meta.note}</p>
              </div>
            )}



            <Separator />

            {/* Bên ký kết */}
            {(meta.partnerName || meta.partnerTaxCode || meta.partnerRepresentative) && (
              <>
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5" /> Bên ký kết
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  {meta.partnerName && (
                    <div>
                      <span className="text-muted-foreground block text-xs">Tên đối tác</span>
                      <span className="font-medium">{meta.partnerName}</span>
                    </div>
                  )}
                  {meta.partnerTaxCode && (
                    <div>
                      <span className="text-muted-foreground block text-xs">Mã số thuế</span>
                      <span className="font-mono">{meta.partnerTaxCode}</span>
                    </div>
                  )}
                  {meta.partnerRepresentative && (
                    <div>
                      <span className="text-muted-foreground block text-xs">Người đại diện</span>
                      <span className="flex items-center gap-1"><User className="h-3 w-3" /> {meta.partnerRepresentative}</span>
                    </div>
                  )}
                </div>
                <Separator />
              </>
            )}

            {/* Thời hạn */}
            {(meta.signDate || meta.effectiveDate || meta.expiryDate) && (
              <>
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" /> Thời hạn
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  {meta.signDate && (
                    <div>
                      <span className="text-muted-foreground block text-xs">Ngày ký</span>
                      <span>{new Date(meta.signDate).toLocaleDateString("vi-VN")}</span>
                    </div>
                  )}
                  {meta.effectiveDate && (
                    <div>
                      <span className="text-muted-foreground block text-xs">Ngày hiệu lực</span>
                      <span>{new Date(meta.effectiveDate).toLocaleDateString("vi-VN")}</span>
                    </div>
                  )}
                  {meta.expiryDate && (
                    <div>
                      <span className="text-muted-foreground block text-xs">Ngày hết hạn</span>
                      <span>{new Date(meta.expiryDate).toLocaleDateString("vi-VN")}</span>
                    </div>
                  )}
                </div>
                <Separator />
              </>
            )}

            {/* Giá trị */}
            {meta.contractValue != null && meta.contractValue > 0 && (
              <>
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Banknote className="h-3.5 w-3.5" /> Giá trị hợp đồng
                </h4>
                {!showPrice ? (
                  <div className="flex items-center gap-2 py-3 text-amber-700 dark:text-amber-400 text-sm">
                    <EyeOff className="h-4 w-4 flex-shrink-0" />
                    <span>Thông tin giá trị đã được ẩn. Bạn không có quyền xem dữ liệu tài chính.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground block text-xs">Trước thuế</span>
                      <span className="font-medium">{meta.contractValue.toLocaleString("vi-VN")} {meta.currency || "VND"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">VAT ({meta.vatRate || 0}%)</span>
                      <span className="font-medium">{vatAmount.toLocaleString("vi-VN")} {meta.currency || "VND"}</span>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-muted-foreground block text-xs">Tổng giá trị sau thuế</span>
                      <span className="font-bold text-orange-600 text-base">{totalValue.toLocaleString("vi-VN")} {meta.currency || "VND"}</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Tài liệu đính kèm */}
        <AccordionItem value="attachments" className="bg-card border rounded-xl shadow-sm overflow-hidden px-4">
          <AccordionTrigger className="hover:no-underline py-4 font-semibold">
            Tài liệu đính kèm
            {plan.attachments && plan.attachments.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 text-[10px] px-1.5">
                {plan.attachments.length}
              </Badge>
            )}
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-4 border-t">
            {!showPrice ? (
              <div className="flex items-center gap-2 py-4 text-amber-700 dark:text-amber-400 text-sm">
                <EyeOff className="h-4 w-4 flex-shrink-0" />
                <span>Bạn không có quyền xem/tải file hồ sơ gốc do chính sách bảo mật thông tin giá.</span>
              </div>
            ) : (
              <AttachmentPanel
                entityType="procurementPlan"
                entityId={plan.id}
                attachments={plan.attachments || []}
                allowedTypes={CONTRACT_ALLOWED_TYPES}
                canUpload={isOwner && isDraft}
                onChanged={fetchPlan}
              />
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Cancel Dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Hủy hồ sơ</DialogTitle>
            <DialogDescription>{plan.code} — {plan.title}</DialogDescription>
          </DialogHeader>
          <p className="text-sm py-2">
            Bạn có chắc chắn muốn hủy hồ sơ này? Thao tác này không thể hoàn tác.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Đóng</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
              {cancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xác nhận hủy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
