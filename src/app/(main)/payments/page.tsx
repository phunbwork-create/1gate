"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { RequestStatus } from "@/types/domain"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/business/status-badge"
import { CreditCard, Plus, Search, Loader2, ChevronLeft, ChevronRight, Eye } from "lucide-react"

interface PayReq {
  id: string; code: string; vendorName: string; description: string
  amount: number; status: RequestStatus; invoiceScenario: string
  company: { code: string }; createdBy: { name: string }; createdAt: string
}

interface Pagination { page: number; limit: number; total: number; totalPages: number }

const STATUS_OPTIONS = [
  { value: "all", label: "Tất cả" }, { value: "Draft", label: "Nháp" },
  { value: "Submitted", label: "Đã trình" }, { value: "PendingApproval", label: "Chờ duyệt" },
  { value: "Approved", label: "Đã duyệt" }, { value: "Rejected", label: "Từ chối" },
  { value: "Returned", label: "Trả lại" }, { value: "Cancelled", label: "Đã hủy" },
]

const SCENARIO_LABELS: Record<string, { label: string; color: string }> = {
  HasInvoice: { label: "Có HĐ", color: "bg-green-500/10 text-green-600 border-green-500/20" },
  InvoiceLater: { label: "HĐ sau", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  NoInvoice: { label: "Không HĐ", color: "bg-slate-500/10 text-slate-600 border-slate-500/20" },
}

export default function PaymentsPage() {
  const router = useRouter()
  const [data, setData] = useState<PayReq[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")

  const fetchData = useCallback(async (page = 1, statusOverride?: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" })
      if (search) params.set("search", search)
      const s = statusOverride ?? filterStatus
      if (s !== "all") params.set("status", s)
      const res = await fetch(`/api/payment-requests?${params}`)
      const json = await res.json()
      if (res.ok) { setData(json.data); setPagination(json.pagination) }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [search, filterStatus])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-primary" /> Đề nghị Thanh toán
          </h2>
          <p className="text-muted-foreground text-sm mt-1">Tổng: {pagination.total} đề nghị</p>
        </div>
        <Button onClick={() => router.push("/payments/new")} className="gap-2">
          <Plus className="h-4 w-4" /> Tạo ĐN mới
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tìm theo mã, NCC, nội dung..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchData(1)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); fetchData(1, v) }}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-36">Mã ĐN</TableHead>
              <TableHead>NCC / Nội dung</TableHead>
              <TableHead className="w-24">Hóa đơn</TableHead>
              <TableHead className="w-24">Trạng thái</TableHead>
              <TableHead className="hidden md:table-cell w-32 text-right">Số tiền</TableHead>
              <TableHead className="hidden md:table-cell">Người tạo</TableHead>
              <TableHead className="hidden lg:table-cell">Ngày tạo</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-12">
                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
              </TableCell></TableRow>
            ) : data.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                Không có dữ liệu
              </TableCell></TableRow>
            ) : data.map((r) => {
              const scenario = SCENARIO_LABELS[r.invoiceScenario]
              return (
                <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/payments/${r.id}`)}>
                  <TableCell className="font-mono font-medium text-sm">{r.code}</TableCell>
                  <TableCell>
                    <div className="font-medium truncate max-w-[180px]">{r.vendorName}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[180px]">{r.description}</div>
                  </TableCell>
                  <TableCell>
                    {scenario && (
                      <Badge variant="outline" className={`text-xs ${scenario.color}`}>
                        {scenario.label}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="hidden md:table-cell text-right font-medium text-orange-600">
                    {Number(r.amount).toLocaleString("vi-VN")} đ
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{r.createdBy.name}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {new Date(r.createdAt).toLocaleDateString("vi-VN")}
                  </TableCell>
                  <TableCell><Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Trang {pagination.page}/{pagination.totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={pagination.page <= 1}
              onClick={() => fetchData(pagination.page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchData(pagination.page + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </div>
  )
}
