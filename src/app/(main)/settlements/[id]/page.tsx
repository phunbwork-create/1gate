"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { StatusBadge } from "@/components/business/status-badge"
import { Separator } from "@/components/ui/separator"
import { Loader2, ArrowLeft, Send, CheckCircle2, XCircle, RotateCcw } from "lucide-react"

interface SettlementDetail {
  id: string; code: string; status: string; 
  actualAmount: number; returnAmount: number; additionalAmount: number
  invoiceNumber: string | null; invoiceDate: string | null; note: string | null
  createdAt: string
  createdBy: { id: string; name: string }
  advanceRequest: { code: string; amount: number; vendorName: string | null; company: { code: string } }
}

export default function SettlementDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const { data: session } = useSession()
  const [req, setReq] = useState<SettlementDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchReq = useCallback(async () => {
    try {
      const res = await fetch(`/api/settlements/${id}`)
      const json = await res.json()
      if (res.ok) setReq(json)
    } finally { setLoading(false) }
  }, [id])

  useEffect(() => { fetchReq() }, [fetchReq])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentUser = session?.user as any
  const isOwner = currentUser?.id === req?.createdBy.id
  const isDraft = req?.status === "Draft" || req?.status === "Returned"
  const canSubmit = isOwner && isDraft

  const canApprove = req && req.status === "Submitted" &&
    currentUser && !isOwner && ["Accountant", "ChiefAccountant", "Admin"].includes(currentUser.role)

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

  const isReturn = req.returnAmount > 0
  const isAdditional = req.additionalAmount > 0

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/settlements")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">{req.code}</h2>
              <StatusBadge status={req.status as any} />
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-2">
              <span>Người lập: <strong className="text-foreground">{req.createdBy.name}</strong></span>
              <span>Lập lúc: {format(new Date(req.createdAt), "dd/MM/yyyy HH:mm")}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tạm ứng gốc</CardTitle>
            <CardDescription>Tham chiếu phiếu tạm ứng đã chi tiền</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-sm text-muted-foreground block mb-1">Mã tham chiếu:</span>
              <p className="font-medium text-blue-600">{req.advanceRequest.code}</p>
            </div>
            <div>
              <span className="text-sm font-semibold text-muted-foreground block mb-1 uppercase tracking-wider">Tiền đã cấp</span>
              <p className="text-2xl font-bold text-orange-600">{Number(req.advanceRequest.amount).toLocaleString("vi-VN")} ₫</p>
            </div>
            {req.advanceRequest.vendorName && (
              <div>
                <span className="text-sm text-muted-foreground block mb-1">Cấp cho:</span>
                <p>{req.advanceRequest.vendorName}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Thực tế chi</CardTitle>
            <CardDescription>Báo cáo sử dụng thực tế</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-sm font-semibold text-muted-foreground block mb-1 uppercase tracking-wider">Thực tế sử dụng</span>
              <p className="text-2xl font-bold">{Number(req.actualAmount).toLocaleString("vi-VN")} ₫</p>
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
            
            {!isReturn && !isAdditional && (
               <div><p className="text-blue-600 font-medium">Khớp vừa đủ, không phát sinh dòng tiền phụ.</p></div>
            )}
          </CardContent>
        </Card>

        {req.invoiceNumber && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Chứng từ / Hóa đơn</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground block mb-1">Số hóa đơn:</span>
                  <p className="font-medium">{req.invoiceNumber}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground block mb-1">Ngày hóa đơn:</span>
                  <p>{req.invoiceDate ? format(new Date(req.invoiceDate), "dd/MM/yyyy") : "—"}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                 <span className="text-sm text-muted-foreground block mb-1">Ghi chú giải trình:</span>
                 <p className="whitespace-pre-wrap">{req.note || "Không có giải trình thêm."}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
