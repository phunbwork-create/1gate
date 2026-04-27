"use client"

import { useState, useMemo, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Search, Plus, Loader2, FileCheck, ChevronLeft, ChevronRight, Eye, SlidersHorizontal, X,
} from "lucide-react"
import { useAppSWR } from "@/lib/swr"

interface Plan {
  id: string
  code: string
  contractCode?: string | null
  title: string
  company: { code: string }
  createdBy: { name: string }
  createdAt: string
}

interface Pagination { page: number; limit: number; total: number; totalPages: number }

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function ProcurementListPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [filterOpen, setFilterOpen] = useState(false)
  const [page, setPage] = useState(1)

  const [search, setSearch] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const activeFilters = [dateFrom, dateTo].filter(Boolean).length

  const swrKey = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: "20" })
    if (search) params.set("search", search)
    if (dateFrom) params.set("dateFrom", dateFrom)
    if (dateTo) params.set("dateTo", dateTo)
    return `/api/procurement?${params}`
  }, [page, search, dateFrom, dateTo])

  const { data: response, isLoading: loading } = useAppSWR(swrKey)
  const plans: Plan[] = response?.data ?? []
  const pagination: Pagination = response?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 }

  function clearFilters() {
    setDateFrom(""); setDateTo("")
  }

  function navigateTo(href: string) {
    startTransition(() => { router.push(href) })
  }

  return (
    <div className="space-y-6">
      {/* Pending overlay for instant click feedback */}
      {isPending && (
        <div className="fixed inset-0 z-50 bg-background/30 backdrop-blur-[1px] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileCheck className="h-6 w-6 text-primary" /> Hồ sơ / Hợp đồng
          </h2>
          <p className="text-muted-foreground text-sm mt-1">Tổng: {pagination.total} hồ sơ</p>
        </div>
        {/* ✅ <Link> for prefetch instead of router.push */}
        <Link href="/procurement/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Tạo Hồ sơ mới
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tìm theo mã, tiêu đề..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setPage(1)} className="pl-9" />
        </div>
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
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-40">Mã Hồ sơ</TableHead>
              <TableHead>Tiêu đề</TableHead>
              <TableHead className="hidden md:table-cell">Người tạo</TableHead>
              <TableHead className="hidden lg:table-cell">Ngày tạo</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
            ) : plans.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">Không có dữ liệu</TableCell></TableRow>
            ) : plans.map((p) => (
              <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigateTo(`/procurement/${p.id}`)}>
                <TableCell>
                  <Link href={`/procurement/${p.id}`} className="font-mono font-medium text-sm text-primary hover:underline" onClick={e => e.stopPropagation()}>
                    {p.contractCode || p.code}
                  </Link>
                </TableCell>
                <TableCell className="font-medium max-w-[300px] truncate">{p.title}</TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{p.createdBy.name}</TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                  {formatDate(p.createdAt)}
                </TableCell>
                <TableCell>
                  <Link href={`/procurement/${p.id}`} onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
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
            <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => setPage(pagination.page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => setPage(pagination.page + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </div>
  )
}
