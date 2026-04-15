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

interface PaymentPlanItem {
  id: string
  code: string
  totalAmount: number
  note: string | null
  status: string
  plannedDate: string | null
  createdAt: string
  createdBy: { name: string }
}

export default function PaymentPlansListPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [plans, setPlans] = useState<PaymentPlanItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch("/api/payment-plans")
      const json = await res.json()
      if (res.ok) setPlans(json)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  const filtered = plans.filter(p => 
    p.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.note && p.note.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Kế hoạch Thanh toán</h2>
          <p className="text-muted-foreground">Tổng hợp các khoản chi tiền, tạm ứng chờ duyệt dòng tiền.</p>
        </div>
        <Button onClick={() => router.push("/payment-plans/create")} className="gap-2">
          <Plus className="h-4 w-4" />
          Lập kế hoạch
        </Button>
      </div>

      <Separator />

      <div className="flex items-center w-full max-w-sm space-x-2">
        <Search className="h-4 w-4 text-muted-foreground absolute ml-3" />
        <Input 
          placeholder="Tìm theo mã hoặc ghi chú..." 
          className="pl-9"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-24">Mã KH</TableHead>
              <TableHead>Nội dung</TableHead>
              <TableHead>Người lập</TableHead>
              <TableHead className="text-right">Tổng chi</TableHead>
              <TableHead>Dự kiến chi</TableHead>
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
              filtered.map((plan) => (
                <TableRow 
                  key={plan.id} 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => router.push(`/payment-plans/${plan.id}`)}
                >
                  <TableCell className="font-medium text-blue-600">{plan.code}</TableCell>
                  <TableCell className="max-w-[300px] truncate">{plan.note || "—"}</TableCell>
                  <TableCell>{plan.createdBy.name}</TableCell>
                  <TableCell className="text-right font-medium text-destructive">
                    {Number(plan.totalAmount).toLocaleString("vi-VN")} đ
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {plan.plannedDate ? format(new Date(plan.plannedDate), "dd/MM/yyyy") : "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={plan.status as any} />
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
