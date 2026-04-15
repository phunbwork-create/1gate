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
import {
  Loader2, ArrowLeft, Send, CheckCircle2, XCircle, RotateCcw, Pencil,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface PlanDetail {
  id: string; code: string; title: string; description: string | null
  status: RequestStatus
  company: { code: string; name: string }
  createdBy: { id: string; name: string; email: string }
  createdById: string
  items: {
    id: string; itemName: string; unit: string; plannedQty: number
    estimatedPrice: number | null; note: string | null
    materialItem: { code: string; name: string } | null
  }[]
  approvalSteps: {
    id: string; role: Role; stepOrder: number; action: string | null
    comment: string | null; actedAt: string | null
    approver: { id: string; name: string }
  }[]
  expectedApprovers?: { role: Role; users: { name: string; email: string }[] }[]
  createdAt: string; submittedAt: string | null; approvedAt: string | null
}

export default function ProcurementDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const { data: session } = useSession()
  const [plan, setPlan] = useState<PlanDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // Approval dialog
  const [approveOpen, setApproveOpen] = useState(false)
  const [approveAction, setApproveAction] = useState<"approve" | "reject" | "return">("approve")
  const [approveComment, setApproveComment] = useState("")

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
  const isOwner = currentUser?.id === plan?.createdById
  const isDraft = plan?.status === "Draft"
  const canSubmit = isOwner && isDraft
  const canApprove = plan && ["Submitted", "PendingApproval"].includes(plan.status) &&
    currentUser && !isOwner &&
    ["DeptHead", "Director", "Admin"].includes(currentUser.role)

  const { toast } = useToast()

  async function handleApprove() {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/procurement/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: approveAction, comment: approveComment || null }),
      })
      const json = await res.json()
      if (res.ok) { 
        setApproveOpen(false)
        fetchPlan()
        toast({ title: "Thành công", description: "Đã xử lý thông qua kế hoạch." })
      } else {
        toast({ title: "Lỗi", description: json.error || "Không thể duyệt", variant: "destructive" })
      }
    } catch (e) { 
      console.error(e) 
      toast({ title: "Lỗi", description: "Kết nối server thất bại", variant: "destructive" })
    }
    finally { setActionLoading(false) }
  }

  async function handleSubmit() {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/procurement/${id}/submit`, { method: "POST" })
      const json = await res.json()
      if (res.ok) {
        fetchPlan()
        toast({ title: "Thành công", description: "Đã trình kế hoạch thành công." })
      } else {
        toast({ title: "Lỗi", description: json.error || "Không thể trình duyệt", variant: "destructive" })
      }
    } catch (e) { console.error(e) }
    finally { setActionLoading(false) }
  }

  const totalEstimate = plan?.items.reduce((s, i) => s + (Number(i.estimatedPrice) || 0) * Number(i.plannedQty), 0) || 0

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>
  if (!plan) return <div className="text-center py-20 text-muted-foreground">Không tìm thấy kế hoạch</div>

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/procurement")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">{plan.code}</h2>
              <StatusBadge status={plan.status} />
            </div>
            <p className="text-lg mt-1">{plan.title}</p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              <span>Người tạo: <strong>{plan.createdBy.name}</strong></span>
              <span>Công ty: <Badge variant="outline" className="text-xs">{plan.company.code}</Badge></span>
              <span>Ngày tạo: {new Date(plan.createdAt).toLocaleDateString("vi-VN")}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {isDraft && isOwner && (
            <Button variant="outline" size="sm" onClick={() => router.push(`/procurement/new`)} className="gap-1">
              <Pencil className="h-3.5 w-3.5" /> Sửa
            </Button>
          )}
          {canSubmit && (
            <Button size="sm" onClick={handleSubmit} disabled={actionLoading} className="gap-1">
              {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Trình duyệt
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
        {/* Left column: Workflow */}
        <div className="lg:col-span-4">
          <div className="sticky top-6 bg-card border rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/40">
              <h3 className="font-semibold">Workflow</h3>
            </div>
            <div className="p-2 pb-4">
              <ApprovalTimeline steps={plan.approvalSteps} currentChain={["DeptHead", "Director"]} status={plan.status} expectedApprovers={plan.expectedApprovers} />
            </div>
          </div>
        </div>

        {/* Right column: Form Details */}
        <div className="lg:col-span-8">
          <Accordion type="multiple" defaultValue={["general", "items"]} className="w-full space-y-4">
            <AccordionItem value="general" className="bg-card border rounded-xl shadow-sm overflow-hidden px-4">
              <AccordionTrigger className="hover:no-underline py-4 font-semibold">
                Thông tin chung
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4 border-t text-sm">
                {plan.description ? (
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Mô tả / Ghi chú:</span>
                    <p className="whitespace-pre-wrap">{plan.description}</p>
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
                        <TableHead className="w-24 text-right">SL</TableHead>
                        <TableHead className="w-32 text-right">Đơn giá</TableHead>
                        <TableHead className="w-32 text-right">Thành tiền</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plan.items.map((item, idx) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-sm text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="font-mono text-xs">{item.materialItem?.code || "—"}</TableCell>
                          <TableCell className="font-medium">{item.itemName}</TableCell>
                          <TableCell className="text-sm">{item.unit}</TableCell>
                          <TableCell className="text-right">{Number(item.plannedQty).toLocaleString("vi-VN")}</TableCell>
                          <TableCell className="text-right">{item.estimatedPrice ? Number(item.estimatedPrice).toLocaleString("vi-VN") : "—"}</TableCell>
                          <TableCell className="text-right font-medium">
                            {((Number(item.estimatedPrice) || 0) * Number(item.plannedQty)).toLocaleString("vi-VN")}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/30 font-semibold">
                        <TableCell colSpan={6} className="text-right">Tổng dự toán:</TableCell>
                        <TableCell className="text-right text-orange-600">{totalEstimate.toLocaleString("vi-VN")} đ</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      {/* Approval Dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {approveAction === "approve" ? "Duyệt kế hoạch" :
               approveAction === "reject" ? "Từ chối kế hoạch" : "Trả lại kế hoạch"}
            </DialogTitle>
            <DialogDescription>{plan.code} — {plan.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Textarea placeholder="Nhận xét (không bắt buộc)..."
              value={approveComment} onChange={(e) => setApproveComment(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)}>Hủy</Button>
            <Button onClick={handleApprove} disabled={actionLoading}
              variant={approveAction === "reject" ? "destructive" : "default"}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
