"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { RequestStatus } from "@/types/domain"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { StatusBadge } from "@/components/business/status-badge"
import { Search, Plus, Loader2, ShoppingCart, ChevronLeft, ChevronRight, Eye, SlidersHorizontal, X } from "lucide-react"
import { useAppSWR } from "@/lib/swr"

interface PReq {
  id: string; code: string; vendorName: string | null; status: RequestStatus
  totalAmount: number | null
  company: { code: string }; createdBy: { name: string }; createdAt: string
  _count: { items: number }
}

interface Pagination { page: number; limit: number; total: number; totalPages: number }

const STATUS_OPTIONS = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "Draft", label: "Nháp" },
  { value: "Submitted", label: "Đã trình" },
  { value: "PendingApproval", label: "Chờ duyệt" },
  { value: "Approved", label: "Đã duyệt" },
  { value: "Rejected", label: "Từ chối" },
  { value: "Closed", label: "Đã đóng" },
]

export default function PurchaseRequestsPage() {
  const router = useRouter()
  const [filterOpen, setFilterOpen] = useState(false)
  const [page, setPage] = useState(1)

  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [amountMin, setAmountMin] = useState("")
  const [amountMax, setAmountMax] = useState("")

  const activeFilters = [filterStatus !== "all", dateFrom, dateTo, amountMin, amountMax].filter(Boolean).length

  const swrKey = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: "20" })
    if (search) params.set("search", search)
    if (filterStatus !== "all") params.set("status", filterStatus)
    if (dateFrom) params.set("dateFrom", dateFrom)
    if (dateTo) params.set("dateTo", dateTo)
    if (amountMin) params.set("amountMin", amountMin)
    if (amountMax) params.set("amountMax", amountMax)
    return `/api/purchase-requests?${params}`
  }, [page, search, filterStatus, dateFrom, dateTo, amountMin, amountMax])

  const { data: response, isLoading: loading } = useAppSWR(swrKey)
  const requests: PReq[] = response?.data ?? []
  const pagination: Pagination = response?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 }

  function clearFilters() {
    setFilterStatus("all"); setDateFrom(""); setDateTo(""); setAmountMin(""); setAmountMax("")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-primary" /> Đề nghị Mua hàng
          </h2>
          <p className="text-muted-foreground text-sm mt-1">Tổng: {pagination.total} đề nghị</p>
        </div>
        <Button onClick={() => router.push("/purchases/new")} className="gap-2">
          <Plus className="h-4 w-4" /> Tạo ĐN mới
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tìm theo mã, NCC..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setPage(1)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v)}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Collapsible open={filterOpen} onOpenChange={setFilterOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" /> Lọc nâng cao
              {activeFilters > 0 && <Badge className="h-5 w-5 p-0 flex items-center justify-center text-[10px]">{activeFilters}</Badge>}
            </Button>
          </CollapsibleTrigger>
        </Collapsible>
        {activeFilters > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
            <X className="h-3.5 w-3.5" /> Xóa bộ lọc
          </Button>
        )}
      </div>

      <Collapsible open={filterOpen}>
        <CollapsibleContent>
          <div className="rounded-lg border bg-muted/30 p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Từ ngày</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Đến ngày</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Số tiền từ (₫)</Label>
              <Input type="number" placeholder="0" value={amountMin} onChange={e => setAmountMin(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Số tiền đến (₫)</Label>
              <Input type="number" placeholder="không giới hạn" value={amountMax} onChange={e => setAmountMax(e.target.value)} />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-36">Mã ĐN</TableHead>
              <TableHead>NCC</TableHead>
              <TableHead className="w-24">Trạng thái</TableHead>
              <TableHead className="hidden md:table-cell w-32 text-right">Tổng tiền</TableHead>
              <TableHead className="hidden md:table-cell">Người tạo</TableHead>
              <TableHead className="hidden lg:table-cell">Ngày tạo</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
            ) : requests.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Không có dữ liệu</TableCell></TableRow>
            ) : requests.map((r) => (
              <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/purchases/${r.id}`)}>
                <TableCell className="font-mono font-medium text-sm">{r.code}</TableCell>
                <TableCell className="max-w-[200px] truncate">{r.vendorName || "—"}</TableCell>
                <TableCell><StatusBadge status={r.status} /></TableCell>
                <TableCell className="hidden md:table-cell text-right font-medium">
                  {r.totalAmount ? Number(r.totalAmount).toLocaleString("vi-VN") + " đ" : "—"}
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{r.createdBy.name}</TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                  {new Date(r.createdAt).toLocaleDateString("vi-VN")}
                </TableCell>
                <TableCell><Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Trang {pagination.page}/{pagination.totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => setPage(pagination.page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => setPage(pagination.page + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </div>
  )
}
