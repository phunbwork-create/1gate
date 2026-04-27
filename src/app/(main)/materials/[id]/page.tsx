"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { RequestStatus, Role } from "@/types/domain"
import { useSession } from "next-auth/react"
import { priceVisible } from "@/lib/permissions"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { StatusBadge } from "@/components/business/status-badge"
import { ApprovalTimeline } from "@/components/business/approval-timeline"
import { PdfPreviewDialog } from "@/components/business/pdf-preview-dialog"
import {
  Loader2, ArrowLeft, Send, CheckCircle2, XCircle, RotateCcw,
  FileCheck, Building2, Calendar, Banknote, EyeOff, Eye,
  FileText, FileImage, FileSpreadsheet, File, ExternalLink,
} from "lucide-react"

// ─── Contract metadata type (mirrors procurement detail) ─────────────────────
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
  try { return JSON.parse(description) } catch { return { note: description } }
}

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  purchase: "Hợp đồng Mua vào", sale: "Hợp đồng Bán ra",
  internal: "Nội bộ", other: "Khác",
}

// ─── File helpers ────────────────────────────────────────────────────────────
function formatBytes(bytes: number | null): string {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileIcon({ mimeType }: { mimeType: string | null }) {
  if (!mimeType) return <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
  if (mimeType === "application/pdf")
    return <FileText className="h-4 w-4 text-red-500 flex-shrink-0" />
  if (mimeType.startsWith("image/"))
    return <FileImage className="h-4 w-4 text-blue-500 flex-shrink-0" />
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
    return <FileSpreadsheet className="h-4 w-4 text-green-600 flex-shrink-0" />
  return <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface ProcurementAttachment {
  id: string; fileName: string; fileUrl: string
  fileSize: number | null; mimeType: string | null
  documentType: string; uploadedAt: string
}

interface LinkedProcurement {
  id: string; code: string; contractCode?: string | null
  title: string; description: string | null
  attachments: ProcurementAttachment[]
}

interface MReqDetail {
  id: string; code: string; purpose: string | null; status: RequestStatus
  requiredDate: string | null; createdById: string
  company: { code: string; name: string }
  createdBy: { id: string; name: string; email: string }
  procurementPlan: LinkedProcurement | null
  items: {
    id: string; itemName: string; unit: string; requestedQty: number; note: string | null
    materialItem: { code: string; name: string } | null
  }[]
  approvalSteps: {
    id: string; role: Role; stepOrder: number; action: string | null
    comment: string | null; actedAt: string | null
    approver: { id: string; name: string }
  }[]
  expectedApprovers?: { role: Role; users: { name: string; email: string }[] }[]
  createdAt: string
}

export default function MaterialRequestDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const { data: session } = useSession()
  const [req, setReq] = useState<MReqDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [approveOpen, setApproveOpen] = useState(false)
  const [approveAction, setApproveAction] = useState<"approve" | "reject" | "return">("approve")
  const [approveComment, setApproveComment] = useState("")
  const [pdfPreview, setPdfPreview] = useState<{ url: string; name: string } | null>(null)

  const fetchReq = useCallback(async () => {
    try {
      const res = await fetch(`/api/material-requests/${id}`)
      const json = await res.json()
      if (res.ok) setReq(json)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { fetchReq() }, [fetchReq])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentUser = session?.user as any
  const userRole = (currentUser?.role as Role) || "Staff"
  const showPrice = priceVisible(userRole)
  const isOwner = currentUser?.id === req?.createdById
  const isDraft = req?.status === "Draft"
  const canSubmit = isOwner && isDraft
  const canApprove = req && ["Submitted", "PendingApproval"].includes(req.status) &&
    currentUser && !isOwner && ["DeptHead", "Admin"].includes(currentUser.role)

  async function handleSubmit() {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/material-requests/${id}/submit`, { method: "POST" })
      if (res.ok) fetchReq()
    } catch (e) { console.error(e) }
    finally { setActionLoading(false) }
  }

  async function handleApprove() {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/material-requests/${id}/approve`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: approveAction, comment: approveComment || null }),
      })
      if (res.ok) { setApproveOpen(false); fetchReq() }
    } catch (e) { console.error(e) }
    finally { setActionLoading(false) }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>
  if (!req) return <div className="text-center py-20 text-muted-foreground">Không tìm thấy đề nghị</div>

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/materials")}>
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
              {req.procurementPlan && (
                <span>KH: <Badge variant="secondary" className="text-xs">{req.procurementPlan.code}</Badge></span>
              )}
            </div>
            {req.purpose && <p className="text-sm mt-2">{req.purpose}</p>}
          </div>
        </div>

        <div className="flex gap-2">
          {canSubmit && (
            <Button size="sm" onClick={handleSubmit} disabled={actionLoading} className="gap-1">
              {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Trình duyệt
            </Button>
          )}
          {canApprove && (
            <>
              <Button variant="outline" size="sm" className="gap-1 text-orange-600"
                onClick={() => { setApproveAction("return"); setApproveComment(""); setApproveOpen(true) }}>
                <RotateCcw className="h-3.5 w-3.5" /> Trả lại
              </Button>
              <Button variant="destructive" size="sm" className="gap-1"
                onClick={() => { setApproveAction("reject"); setApproveComment(""); setApproveOpen(true) }}>
                <XCircle className="h-3.5 w-3.5" /> Từ chối
              </Button>
              <Button size="sm" className="gap-1"
                onClick={() => { setApproveAction("approve"); setApproveComment(""); setApproveOpen(true) }}>
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
              <ApprovalTimeline steps={req.approvalSteps} currentChain={["DeptHead"]} status={req.status} expectedApprovers={req.expectedApprovers} />
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          <Accordion type="multiple" defaultValue={["general", "contract", "items"]} className="w-full space-y-4">
            <AccordionItem value="general" className="bg-card border rounded-xl shadow-sm overflow-hidden px-4">
              <AccordionTrigger className="hover:no-underline py-4 font-semibold">
                Thông tin chung
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4 border-t text-sm">
                {req.purpose ? (
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Mục đích / Ghi chú:</span>
                    <p className="whitespace-pre-wrap">{req.purpose}</p>
                  </div>
                ) : (
                  <span className="text-muted-foreground italic">Không có mô tả bổ sung</span>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* ── Hồ sơ / Hợp đồng liên kết ── */}
            {req.procurementPlan && (() => {
              const pp = req.procurementPlan
              const meta = parseContractMeta(pp.description)
              const vatAmount = (meta.contractValue || 0) * ((meta.vatRate || 0) / 100)
              const totalValue = (meta.contractValue || 0) + vatAmount
              const pdfFiles = pp.attachments.filter((a) => a.mimeType === "application/pdf")
              const otherFiles = pp.attachments.filter((a) => a.mimeType !== "application/pdf")

              return (
                <AccordionItem value="contract" className="bg-card border rounded-xl shadow-sm overflow-hidden px-4">
                  <AccordionTrigger className="hover:no-underline py-4 font-semibold">
                    <span className="flex items-center gap-2">
                      <FileCheck className="h-4 w-4 text-primary" />
                      Hồ sơ / Hợp đồng liên kết
                      <Badge variant="secondary" className="text-[10px] px-1.5 h-5">
                        {pp.contractCode || pp.code}
                      </Badge>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-5 border-t space-y-5">

                    {/* Link to full contract detail */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{pp.title}</p>
                        {meta.contractType && (
                          <span className="text-xs text-muted-foreground">
                            {CONTRACT_TYPE_LABELS[meta.contractType] || meta.contractType}
                          </span>
                        )}
                      </div>
                      <Link href={`/procurement/${pp.id}`}>
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                          <ExternalLink className="h-3 w-3" />
                          Xem chi tiết hồ sơ
                        </Button>
                      </Link>
                    </div>

                    {/* Ghi chú */}
                    {meta.note && (
                      <>
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground uppercase tracking-wide">Ghi chú</span>
                          <p className="text-sm whitespace-pre-wrap">{meta.note}</p>
                        </div>
                        <Separator />
                      </>
                    )}

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
                              <span>{meta.partnerRepresentative}</span>
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

                    {/* Giá trị hợp đồng */}
                    {meta.contractValue != null && meta.contractValue > 0 && (
                      <>
                        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                          <Banknote className="h-3.5 w-3.5" /> Giá trị hợp đồng
                        </h4>
                        {!showPrice ? (
                          <div className="flex items-center gap-2 py-2 text-amber-700 dark:text-amber-400 text-sm">
                            <EyeOff className="h-4 w-4 flex-shrink-0" />
                            <span>Thông tin giá trị đã được ẩn.</span>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground block text-xs">Trước thuế</span>
                              <span className="font-medium">{meta.contractValue.toLocaleString("vi-VN")} {meta.currency || "VND"}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block text-xs">VAT ({meta.vatRate || 0}%)</span>
                              <span className="font-medium">{vatAmount.toLocaleString("vi-VN")} {meta.currency || "VND"}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block text-xs">Tổng sau thuế</span>
                              <span className="font-bold text-orange-600">{totalValue.toLocaleString("vi-VN")} {meta.currency || "VND"}</span>
                            </div>
                          </div>
                        )}
                        <Separator />
                      </>
                    )}

                    {/* Tài liệu đính kèm hồ sơ */}
                    {pp.attachments.length > 0 && (
                      <>
                        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5" /> Tài liệu hồ sơ
                          <Badge variant="secondary" className="text-[10px] px-1.5 h-5">
                            {pp.attachments.length}
                          </Badge>
                        </h4>
                        <ul className="space-y-1.5">
                          {[...pdfFiles, ...otherFiles].map((att) => {
                            const isPdf = att.mimeType === "application/pdf"
                            return (
                              <li key={att.id}
                                className="flex items-center gap-3 p-2.5 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                                <FileIcon mimeType={att.mimeType} />
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm font-medium truncate block">{att.fileName}</span>
                                  <p className="text-xs text-muted-foreground">
                                    {formatBytes(att.fileSize)}
                                    {att.fileSize ? " · " : ""}
                                    {new Date(att.uploadedAt).toLocaleDateString("vi-VN")}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {isPdf && (
                                    <Button
                                      variant="ghost" size="sm"
                                      className="gap-1 text-xs h-7 px-2 text-primary hover:text-primary"
                                      onClick={() => setPdfPreview({ url: att.fileUrl, name: att.fileName })}
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                      Xem
                                    </Button>
                                  )}
                                  <a href={att.fileUrl} target="_blank" rel="noopener noreferrer">
                                    <Button variant="ghost" size="icon" className="h-7 w-7">
                                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                                    </Button>
                                  </a>
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      </>
                    )}

                    {pp.attachments.length === 0 && (
                      <p className="text-sm text-muted-foreground italic">Hồ sơ chưa có tài liệu đính kèm</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              )
            })()}

            <AccordionItem value="items" className="bg-card border rounded-xl shadow-sm overflow-hidden px-4">
              <AccordionTrigger className="hover:no-underline py-4 font-semibold">
                Chi tiết phiếu yêu cầu
              </AccordionTrigger>
              <AccordionContent className="pt-4 border-t p-0">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="w-10">#</TableHead>
                        <TableHead className="w-24">Mã VT</TableHead>
                        <TableHead>Tên vật tư</TableHead>
                        <TableHead className="w-20">ĐVT</TableHead>
                        <TableHead className="w-24 text-right">SL yêu cầu</TableHead>
                        <TableHead className="hidden md:table-cell">Ghi chú</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {req.items.map((item, idx) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-sm text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="font-mono text-xs">{item.materialItem?.code || "—"}</TableCell>
                          <TableCell className="font-medium">{item.itemName}</TableCell>
                          <TableCell>{item.unit}</TableCell>
                          <TableCell className="text-right">{Number(item.requestedQty).toLocaleString("vi-VN")}</TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{item.note || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </AccordionContent>
            </AccordionItem>
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
          <Textarea placeholder="Nhận xét..." value={approveComment} onChange={(e) => setApproveComment(e.target.value)} rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)}>Hủy</Button>
            <Button onClick={handleApprove} disabled={actionLoading}
              variant={approveAction === "reject" ? "destructive" : "default"}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF Preview Dialog */}
      <PdfPreviewDialog
        open={!!pdfPreview}
        onOpenChange={(open) => { if (!open) setPdfPreview(null) }}
        fileUrl={pdfPreview?.url || ""}
        fileName={pdfPreview?.name || ""}
      />
    </div>
  )
}
