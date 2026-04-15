"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { createPaymentPlanSchema } from "@/schemas/business.schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Loader2, ArrowLeft, Save, Banknote, CreditCard } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface PendingReq {
  id: string
  code: string
  type: "Payment" | "Advance"
  amount: number
  purpose: string
  vendorName: string | null
  createdAt: string
  createdBy: string
}

type FormValues = z.infer<typeof createPaymentPlanSchema>

export default function CreatePaymentPlanPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [pendingReqs, setPendingReqs] = useState<PendingReq[]>([])

  const form = useForm<FormValues>({
    resolver: zodResolver(createPaymentPlanSchema),
    defaultValues: {
      plannedDate: "",
      note: "",
      items: [],
    },
  })

  // Watch items to calculate total amount
  const selectedItems = form.watch("items")
  const totalAmount = selectedItems.reduce((acc, curr) => acc + curr.amount, 0)

  const fetchPending = useCallback(async () => {
    try {
      const res = await fetch("/api/payment-plans/pending")
      const json = await res.json()
      if (res.ok) setPendingReqs(json)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPending()
  }, [fetchPending])

  const handleToggleItem = (req: PendingReq, checked: boolean) => {
    const currentItems = form.getValues("items")
    if (checked) {
      form.setValue("items", [...currentItems, { id: req.id, type: req.type, amount: req.amount }], { shouldValidate: true })
    } else {
      form.setValue("items", currentItems.filter((i) => i.id !== req.id), { shouldValidate: true })
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      form.setValue("items", pendingReqs.map(r => ({ id: r.id, type: r.type, amount: r.amount })), { shouldValidate: true })
    } else {
      form.setValue("items", [], { shouldValidate: true })
    }
  }

  async function onSubmit(data: FormValues) {
    setSubmitLoading(true)
    try {
      const res = await fetch("/api/payment-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        toast({ title: "Tạo kế hoạch thanh toán thành công" })
        router.push("/payment-plans")
      } else {
        const error = await res.text()
        toast({ title: "Lỗi", description: error, variant: "destructive" })
      }
    } catch (e: any) {
      toast({ title: "Lỗi hệ thống", description: e.message, variant: "destructive" })
    } finally {
      setSubmitLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Lập Kế hoạch Dòng tiền</h2>
          <p className="text-muted-foreground">Gom các khoản đề nghị thanh toán / tạm ứng đã được duyệt.</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle>Thông tin đợt chi</CardTitle>
              <CardDescription>Thời gian dự kiến và ghi chú chung cho kế hoạch</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="plannedDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ngày dự kiến chi trả</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ghi chú chung</FormLabel>
                    <FormControl>
                      <Input placeholder="Vd: Chi phí hành chính tuần 2 tháng 11..." {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle>Danh sách chờ chi</CardTitle>
                <CardDescription>Chọn các khoản cần đưa vào kế hoạch</CardDescription>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider mb-1">
                  Đã chọn ({selectedItems.length})
                </p>
                <p className="text-2xl font-bold tracking-tight text-destructive">
                  {totalAmount.toLocaleString("vi-VN")} ₫
                </p>
              </div>
            </CardHeader>
            
            <FormField
              control={form.control}
              name="items"
              render={() => (
                <FormItem>
                  <FormControl>
                    <div className="border-b bg-card">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="w-12 text-center">
                              <Checkbox 
                                checked={selectedItems.length === pendingReqs.length && pendingReqs.length > 0} 
                                onCheckedChange={handleSelectAll} 
                              />
                            </TableHead>
                            <TableHead>Loại</TableHead>
                            <TableHead>Mã phiếu</TableHead>
                            <TableHead>Nội dung</TableHead>
                            <TableHead>Người lập</TableHead>
                            <TableHead className="text-right">Số tiền (VNĐ)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {loading ? (
                            <TableRow>
                              <TableCell colSpan={6} className="h-24 text-center">
                                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                              </TableCell>
                            </TableRow>
                          ) : pendingReqs.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                Không có khoản chi/tạm ứng nào đang chờ.
                              </TableCell>
                            </TableRow>
                          ) : (
                            pendingReqs.map((req) => {
                              const isChecked = selectedItems.some((i) => i.id === req.id)
                              return (
                                <TableRow key={req.id} className={isChecked ? "bg-primary/5" : ""}>
                                  <TableCell className="text-center">
                                    <Checkbox 
                                      checked={isChecked} 
                                      onCheckedChange={(c) => handleToggleItem(req, !!c)} 
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      {req.type === "Payment" ? (
                                        <CreditCard className="h-4 w-4 text-blue-500" />
                                      ) : (
                                        <Banknote className="h-4 w-4 text-orange-500" />
                                      )}
                                      <span className="text-sm font-medium">
                                        {req.type === "Payment" ? "Thanh toán" : "Tạm ứng"}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="font-medium text-muted-foreground">{req.code}</TableCell>
                                  <TableCell className="max-w-[200px] truncate">{req.purpose}</TableCell>
                                  <TableCell>{req.createdBy}</TableCell>
                                  <TableCell className="text-right font-medium">
                                    {Number(req.amount).toLocaleString("vi-VN")}
                                  </TableCell>
                                </TableRow>
                              )
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </FormControl>
                  <div className="pt-2 px-6"><FormMessage /></div>
                </FormItem>
              )}
            />
          </Card>

          <div className="flex justify-end gap-3 sticky bottom-4 bg-background/80 backdrop-blur pb-4 pt-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>Hủy</Button>
            <Button type="submit" disabled={submitLoading || selectedItems.length === 0} className="gap-2 px-8">
              {submitLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Tạo Kế hoạch
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
