"use client"

import { useState, useEffect, useCallback } from "react"
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

interface SettlementItem {
  id: string
  code: string
  advanceRequest: { code: string; amount: number }
  createdBy: { name: string }
  createdAt: string
  status: string
}

export default function SettlementsListPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [items, setItems] = useState<SettlementItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/settlements")
      const json = await res.json()
      if (res.ok) setItems(json)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const filtered = items.filter(r => 
    r.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.advanceRequest.code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Quyết toán tạm ứng</h2>
          <p className="text-muted-foreground">Khai báo hoàn trả hoặc chi bù cho các khoản tạm ứng.</p>
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
          placeholder="Tìm theo mã QT hoặc mã TƯ..." 
          className="pl-9"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-24">Mã QT</TableHead>
              <TableHead>Mã Tạm ứng</TableHead>
              <TableHead>Người lập</TableHead>
              <TableHead className="text-right">Tiền Tạm ứng</TableHead>
              <TableHead>Ngày lập</TableHead>
              <TableHead>Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center space-y-1">
                    <FileText className="h-8 w-8 opacity-20" />
                    <p>Không có dữ liệu</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((req) => (
                <TableRow 
                  key={req.id} 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => router.push(`/settlements/${req.id}`)}
                >
                  <TableCell className="font-medium text-blue-600">{req.code}</TableCell>
                  <TableCell className="text-muted-foreground">{req.advanceRequest.code}</TableCell>
                  <TableCell>{req.createdBy.name}</TableCell>
                  <TableCell className="text-right font-medium text-orange-600">
                    {Number(req.advanceRequest.amount).toLocaleString("vi-VN")} đ
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(req.createdAt), "dd/MM/yyyy HH:mm")}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={req.status as any} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
