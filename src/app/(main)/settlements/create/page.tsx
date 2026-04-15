"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { createSettlementSchema } from "@/schemas/business.schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Loader2, ArrowLeft, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

type FormValues = z.infer<typeof createSettlementSchema>

export default function CreateSettlementPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [advances, setAdvances] = useState<{id: string, code: string, amount: number, purpose: string}[]>([])

  const form = useForm<FormValues>({
    resolver: zodResolver(createSettlementSchema),
    defaultValues: {
      advanceRequestId: "",
      actualAmount: 0,
      invoiceNumber: "",
      invoiceDate: "",
      note: "",
    },
  })

  useEffect(() => {
    fetch("/api/advance-requests?status=Closed")
      .then(r => r.json())
      .then(res => {
        if (res.data && Array.isArray(res.data)) setAdvances(res.data)
      })
  }, [])

  const selectedAdvanceId = form.watch("advanceRequestId")
  const actualAmount = form.watch("actualAmount")
  const selectedAdvance = advances.find(a => a.id === selectedAdvanceId)

  // Calculate return and additional automatically for display
  const originalAmount = selectedAdvance ? Number(selectedAdvance.amount) : 0
  const isReturn = actualAmount < originalAmount
  const isAdditional = actualAmount > originalAmount
  const diff = Math.abs(originalAmount - actualAmount)

  async function onSubmit(data: FormValues) {
    setLoading(true)
    try {
      const res = await fetch("/api/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        toast({ title: "Tạo phiếu quyết toán thành công" })
        router.push("/settlements")
      } else {
        const error = await res.text()
        toast({ title: "Lỗi", description: error, variant: "destructive" })
      }
    } catch (e: any) {
      toast({ title: "Lỗi hệ thống", description: e.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Khai báo Quyết toán</h2>
          <p className="text-muted-foreground">Đối soát hóa đơn và số tiền tạm ứng thực tế.</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Thông tin tạm ứng</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="advanceRequestId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chọn phiếu tạm ứng <span className="text-red-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn phiếu tạm ứng cần quyết toán..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {advances.map(a => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.code} - {a.purpose} ({Number(a.amount).toLocaleString("vi-VN")} đ)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedAdvance && (
                <div className="grid grid-cols-2 gap-4 mt-2 p-4 bg-muted/30 rounded-lg">
                  <div>
                    <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider block">Tiền đã tạm ứng</span>
                    <span className="text-2xl font-bold text-orange-600">
                      {originalAmount.toLocaleString("vi-VN")} ₫
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Báo cáo thực chi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="actualAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số tiền thực tế đã chi (VNĐ) <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        {...field} 
                        onChange={(e) => field.onChange(Number(e.target.value))} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedAdvance && actualAmount > 0 && (
                <div className={`p-4 rounded-lg border ${isReturn ? "bg-emerald-50 border-emerald-200" : isAdditional ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200"}`}>
                  {isReturn ? (
                    <p className="text-emerald-700 font-medium">Bạn cần hoàn trả lại công ty: <strong className="text-lg">{diff.toLocaleString("vi-VN")} ₫</strong></p>
                  ) : isAdditional ? (
                    <p className="text-red-700 font-medium">Công ty cần chi bù cho bạn: <strong className="text-lg">{diff.toLocaleString("vi-VN")} ₫</strong></p>
                  ) : (
                    <p className="text-blue-700 font-medium">Số tiền vừa khớp, không phát sinh hoàn trả.</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="invoiceNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Số hóa đơn (nếu có)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ký hiệu hóa đơn..." {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="invoiceDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ngày hóa đơn</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ghi chú thêm</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Giải trình sự chênh lệch (nếu có)..." {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()}>Hủy</Button>
            <Button type="submit" disabled={loading} className="gap-2 px-8">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Lưu Quyết toán
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
