"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { RequestStatus, Role } from "@/types/domain"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { Loader2, ArrowLeft, Send, CheckCircle2, XCircle, RotateCcw } from "lucide-react"

interface PReqDetail {
  id: string; code: string; vendorName: string | null; status: RequestStatus
  totalAmount: number | null; note: string | null; createdById: string
  company: { code: string; name: string }
  createdBy: { id: string; name: string }
  items: {
    id: string; itemName: string; unit: string; quantity: number
    unitPrice: number | null; totalPrice: number | null
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

export default function PurchaseRequestDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const { data: session } = useSession()
  const [req, setReq] = useState<PReqDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [approveOpen, setApproveOpen] = useState(false)
  const [approveAction, setApproveAction] = useState<"approve" | "reject" | "return">("approve")
  const [approveComment, setApproveComment] = useState("")

  const fetchReq = useCallback(async () => {
    try {
      const res = await fetch(`/api/purchase-requests/${id}`)
      const json = await res.json()
      if (res.ok) setReq(json)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { fetchReq() }, [fetchReq])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentUser = session?.user as any
  const isOwner = currentUser?.id === req?.createdById
  const isDraft = req?.status === "Draft"
  const canSubmit = isOwner && isDraft
  const canApprove = req && ["Submitted", "PendingApproval"].includes(req.status) &&
    currentUser && !isOwner && ["DeptHead", "Accountant", "Admin"].includes(currentUser.role)

  async function handleSubmit() {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/purchase-requests/${id}/submit`, { method: "POST" })
      if (res.ok) fetchReq()
    } catch (e) { console.error(e) }
    finally { setActionLoading(false) }
  }

  async function handleApprove() {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/purchase-requests/${id}/approve`, {
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
          <Button variant="ghost" size="icon" onClick={() => router.push("/purchases")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">{req.code}</h2>
              <StatusBadge status={req.status} />
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              <span>NCC: <strong>{req.vendorName || "—"}</strong></span>
              <span>Người tạo: <strong>{req.createdBy.name}</strong></span>
              <span>Công ty: <Badge variant="outline" className="text-xs">{req.company.code}</Badge></span>
            </div>
            {req.note && <p className="text-sm mt-2">{req.note}</p>}
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
              <ApprovalTimeline steps={req.approvalSteps} currentChain={["DeptHead", "Accountant"]} status={req.status} expectedApprovers={req.expectedApprovers} />
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          <Accordion type="multiple" defaultValue={["general", "items"]} className="w-full space-y-4">
            <AccordionItem value="general" className="bg-card border rounded-xl shadow-sm overflow-hidden px-4">
              <AccordionTrigger className="hover:no-underline py-4 font-semibold">
                Thông tin chung
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4 border-t text-sm">
                {req.note ? (
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Mục đích / Ghi chú:</span>
                    <p className="whitespace-pre-wrap">{req.note}</p>
                  </div>
                ) : (
                  <span className="text-muted-foreground italic">Không có mô tả bổ sung</span>
                )}
              </AccordionContent>
            </AccordionItem>

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
                        <TableHead>Tên hàng hóa</TableHead>
                        <TableHead className="w-20">ĐVT</TableHead>
                        <TableHead className="w-20 text-right">SL</TableHead>
                        <TableHead className="w-28 text-right">Đơn giá</TableHead>
                        <TableHead className="w-28 text-right">Thành tiền</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {req.items.map((item, idx) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-sm text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="font-mono text-xs">{item.materialItem?.code || "—"}</TableCell>
                          <TableCell className="font-medium">{item.itemName}</TableCell>
                          <TableCell>{item.unit}</TableCell>
                          <TableCell className="text-right">{Number(item.quantity).toLocaleString("vi-VN")}</TableCell>
                          <TableCell className="text-right">{item.unitPrice ? Number(item.unitPrice).toLocaleString("vi-VN") : "—"}</TableCell>
                          <TableCell className="text-right font-medium">{item.totalPrice ? Number(item.totalPrice).toLocaleString("vi-VN") : "—"}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/30 font-semibold">
                        <TableCell colSpan={6} className="text-right">Tổng cộng:</TableCell>
                        <TableCell className="text-right text-orange-600">{req.totalAmount ? Number(req.totalAmount).toLocaleString("vi-VN") + " đ" : "—"}</TableCell>
                      </TableRow>
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
    </div>
  )
}
