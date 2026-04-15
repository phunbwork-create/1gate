"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { RequestStatus } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { StatusBadge } from "@/components/business/status-badge"
import { Search, Plus, Loader2, PackageOpen, ChevronLeft, ChevronRight, Eye } from "lucide-react"

interface MReq {
  id: string; code: string; purpose: string | null; status: RequestStatus
  company: { code: string }; createdBy: { name: string }
  procurementPlan: { code: string } | null; createdAt: string
  _count: { items: number }
}

interface Pagination { page: number; limit: number; total: number; totalPages: number }

const STATUS_OPTIONS = [
  { value: "all", label: "Tất cả" }, { value: "Draft", label: "Nháp" },
  { value: "Submitted", label: "Đã trình" }, { value: "Approved", label: "Đã duyệt" },
  { value: "Rejected", label: "Từ chối" },
]

export default function MaterialRequestsPage() {
  const router = useRouter()
  const [requests, setRequests] = useState<MReq[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")

  const fetchRequests = useCallback(async (page = 1, statusOverride?: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" })
      if (search) params.set("search", search)
      const s = statusOverride ?? filterStatus
      if (s !== "all") params.set("status", s)
      const res = await fetch(`/api/material-requests?${params}`)
      const json = await res.json()
      if (res.ok) { setRequests(json.data); setPagination(json.pagination) }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [search, filterStatus])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <PackageOpen className="h-6 w-6 text-primary" /> Đề nghị Cấp vật tư
          </h2>
          <p className="text-muted-foreground text-sm mt-1">Tổng: {pagination.total} đề nghị</p>
        </div>
        <Button onClick={() => router.push("/materials/new")} className="gap-2">
          <Plus className="h-4 w-4" /> Tạo ĐN mới
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tìm theo mã..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchRequests(1)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); fetchRequests(1, v) }}>
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
              <TableHead>Mục đích</TableHead>
              <TableHead className="w-24">Trạng thái</TableHead>
              <TableHead className="hidden md:table-cell w-28">KH liên kết</TableHead>
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
              <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/materials/${r.id}`)}>
                <TableCell className="font-mono font-medium text-sm">{r.code}</TableCell>
                <TableCell className="max-w-[300px] truncate">{r.purpose || "—"}</TableCell>
                <TableCell><StatusBadge status={r.status} /></TableCell>
                <TableCell className="hidden md:table-cell">
                  {r.procurementPlan ? <Badge variant="outline" className="text-xs">{r.procurementPlan.code}</Badge> : "—"}
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{r.createdBy.name}</TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                  {new Date(r.createdAt).toLocaleDateString("vi-VN")}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Trang {pagination.page}/{pagination.totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => fetchRequests(pagination.page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => fetchRequests(pagination.page + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </div>
  )
}
