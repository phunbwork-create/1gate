"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { createPaymentRequestSchema } from "@/schemas/business.schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from "@/components/ui/form"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2, ArrowLeft, Save, AlertCircle } from "lucide-react"

type FormValues = z.infer<typeof createPaymentRequestSchema>

const INVOICE_SCENARIOS = [
  { value: "HasInvoice", label: "Đã có hóa đơn (nhập số HĐ ngay)" },
  { value: "InvoiceLater", label: "Chưa có hóa đơn (HĐ nộp sau)" },
  { value: "NoInvoice", label: "Không có hóa đơn (nội bộ)" },
]

export default function NewPaymentRequestPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [duplicateWarning, setDuplicateWarning] = useState("")

  const form = useForm<FormValues>({
    resolver: zodResolver(createPaymentRequestSchema),
    defaultValues: {
      vendorName: "",
      bankAccount: "",
      bankName: "",
      amount: 0,
      description: "",
      invoiceScenario: "HasInvoice",
      invoiceNumber: "",
    },
  })

  const invoiceScenario = form.watch("invoiceScenario")
  const invoiceNumber = form.watch("invoiceNumber")
  const amount = form.watch("amount")

  async function checkDuplicate() {
    if (invoiceScenario !== "HasInvoice" || !invoiceNumber?.trim()) {
      setDuplicateWarning("")
      return
    }
    try {
      const res = await fetch(`/api/payment-requests?search=${invoiceNumber}&limit=1`)
      const json = await res.json()
      if (res.ok && json.data?.length > 0) {
        const match = json.data.find((r: { invoiceNumber: string }) => r.invoiceNumber === invoiceNumber)
        if (match) setDuplicateWarning(`Cảnh báo: Số hóa đơn này đã tồn tại trên phiếu ${match.code}`)
        else setDuplicateWarning("")
      }
    } catch { /* silent */ }
  }

  async function onSubmit(data: FormValues) {
    setLoading(true)
    try {
      const res = await fetch("/api/payment-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (res.ok) {
        toast({ title: "Tạo đề nghị thanh toán thành công", description: `Mã: ${json.code}` })
        router.push(`/payments/${json.id}`)
      } else {
        toast({ title: "Lỗi", description: json.error || "Có lỗi xảy ra", variant: "destructive" })
      }
    } catch {
      toast({ title: "Lỗi hệ thống", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tạo Đề nghị Thanh toán</h2>
          <p className="text-muted-foreground">Khai báo thông tin đề nghị thanh toán cho nhà cung cấp</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

          {/* Nhà cung cấp */}
          <Card>
            <CardHeader>
              <CardTitle>Nhà cung cấp</CardTitle>
              <CardDescription>Thông tin người / đơn vị nhận tiền</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="vendorName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên nhà cung cấp <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Công ty TNHH ABC..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="bankAccount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số tài khoản</FormLabel>
                    <FormControl>
                      <Input placeholder="0123456789" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="bankName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ngân hàng</FormLabel>
                    <FormControl>
                      <Input placeholder="Vietcombank, BIDV..." {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          {/* Thanh toán */}
          <Card>
            <CardHeader>
              <CardTitle>Thông tin thanh toán</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem>
                  <FormLabel>Số tiền (VNĐ) <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0" {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))} />
                  </FormControl>
                  {amount > 5_000_000 && (
                    <FormDescription className="text-amber-600">
                      ⚠ Số tiền &gt; 5 triệu — cần đính kèm Báo giá trước khi trình duyệt
                    </FormDescription>
                  )}
                  {amount > 20_000_000 && (
                    <FormDescription className="text-red-600">
                      ⚠ Số tiền &gt; 20 triệu — cần đính kèm Hợp đồng
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nội dung thanh toán <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Textarea placeholder="Thanh toán tiền mua vật tư theo đơn hàng..." {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {/* Hóa đơn */}
          <Card>
            <CardHeader>
              <CardTitle>Hóa đơn</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="invoiceScenario" render={({ field }) => (
                <FormItem>
                  <FormLabel>Loại hóa đơn</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {INVOICE_SCENARIOS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {invoiceScenario === "HasInvoice" && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="invoiceNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Số hóa đơn <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="0000123" {...field} value={field.value || ""}
                          onBlur={checkDuplicate} />
                      </FormControl>
                      {duplicateWarning && (
                        <p className="text-sm text-amber-600 flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5" /> {duplicateWarning}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="invoiceDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ngày hóa đơn</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()}>Hủy</Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Lưu nháp
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
