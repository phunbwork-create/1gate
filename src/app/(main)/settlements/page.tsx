"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { StatusBadge } from "@/components/business/status-badge"
import { Separator } from "@/components/ui/separator"
import { Loader2, Plus, Search, FileText } from "lucide-react"
import { useAppSWR } from "@/lib/swr"

// Source type badge colors
const SOURCE_BADGE: Record<string, { label: string; color: string }> = {
  AdvanceRequest:  { label: "Tạm ứng",   color: "bg-orange-100 text-orange-700 border-orange-200" },
  PaymentRequest:  { label: "Thanh toán", color: "bg-blue-100 text-blue-700 border-blue-200" },
  PurchaseRequest: { label: "Mua hàng",   color: "bg-purple-100 text-purple-700 border-purple-200" },
  MaterialRequest: { label: "Vật tư",     color: "bg-green-100 text-green-700 border-green-200" },
}

interface SettlementItem {
  id: string
  code: string
  title: string | null
  sourceType: string
  advanceRequest: { code: string; amount: number } | null
  paymentRequest: { code: string; amount: number } | null
  purchaseRequest: { code: string; totalAmount: number | null } | null
  materialRequest: { code: string } | null
  createdBy: { name: string }
  createdAt: string
  status: string
}

function getSourceCode(item: SettlementItem): string {
  return item.advanceRequest?.code
    || item.paymentRequest?.code
    || item.purchaseRequest?.code
    || item.materialRequest?.code
    || "—"
}

function getSourceAmount(item: SettlementItem): number | null {
  if (item.advanceRequest) return Number(item.advanceRequest.amount)
  if (item.paymentRequest) return Number(item.paymentRequest.amount)
  if (item.purchaseRequest?.totalAmount) return Number(item.purchaseRequest.totalAmount)
  return null
}

export default function SettlementsListPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [searchTerm, setSearchTerm] = useState("")

  const { data: items, isLoading: loading } = useAppSWR<SettlementItem[]>("/api/settlements")

  const filtered = (items ?? []).filter(r =>
    r.code.toLowerCase().includes(searchTerm.toLowerCase())
    || (r.title || "").toLowerCase().includes(searchTerm.toLowerCase())
    || getSourceCode(r).toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Quyết toán</h2>
          <p className="text-muted-foreground">Quyết toán các đề xuất đã được phê duyệt.</p>
        </div>
        <Button onClick={() => router.push("/settlements/create")} className="gap-2">
          <Plus className="h-4 w-4" />
          Lập quyết toán
        </Button>
      </div>

      <Separator />

      <div className="flex items-center w-full max-w-sm space-x-2">
        <Search className="h-4 w-4 text-muted-foreground absolute ml-3" />
        <Input
          placeholder="Tìm theo mã QT, tiêu đề, mã ĐX..."
          className="pl-9"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-32">Mã QT</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Mã Đề xuất</TableHead>
              <TableHead>Người lập</TableHead>
              <TableHead className="text-right">Số tiền</TableHead>
              <TableHead>Ngày tạo</TableHead>
              <TableHead>Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center space-y-1">
                    <FileText className="h-8 w-8 opacity-20" />
                    <p>Không có dữ liệu</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((req) => {
                const badge = SOURCE_BADGE[req.sourceType] || SOURCE_BADGE.AdvanceRequest
                const amount = getSourceAmount(req)
                return (
                  <TableRow
                    key={req.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => router.push(`/settlements/${req.id}`)}
                  >
                    <TableCell className="font-medium text-blue-600">{req.code}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${badge.color}`}>
                        {badge.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{getSourceCode(req)}</TableCell>
                    <TableCell>{req.createdBy.name}</TableCell>
                    <TableCell className="text-right font-medium text-orange-600">
                      {amount ? `${amount.toLocaleString("vi-VN")} đ` : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(req.createdAt), "dd/MM/yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={req.status as any} />
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
