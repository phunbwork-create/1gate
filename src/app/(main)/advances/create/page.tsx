"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { createAdvanceRequestSchema } from "@/schemas/business.schema"
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
import { Loader2, ArrowLeft, Save, Copy } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

type FormValues = z.infer<typeof createAdvanceRequestSchema>

export default function CreateAdvancePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  // Workflows References
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [purchaseRequests, setPurchaseRequests] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedPR, setSelectedPR] = useState<any>(null)

  useEffect(() => {
    async function fetchPRs() {
      try {
        const res = await fetch("/api/purchase-requests?status=Approved&limit=100")
        if (res.ok) {
          const json = await res.json()
          setPurchaseRequests(json.data)
        }
      } catch (e) { console.error(e) }
    }
    fetchPRs()
  }, [])

  const form = useForm<FormValues>({
    resolver: zodResolver(createAdvanceRequestSchema),
    defaultValues: {
      purchaseRequestId: "",
      amount: 0,
      purpose: "",
      expectedReturnDate: "",
      vendorName: "",
    },
  })

  async function handleSelectPR(prId: string) {
    form.setValue("purchaseRequestId", prId)
    if (!prId) {
      setSelectedPR(null)
      return
    }
    try {
      const res = await fetch(`/api/purchase-requests/${prId}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedPR(data)
      }
    } catch(e) { console.error(e) }
  }

  function handleCopyFromPR() {
    if (!selectedPR) return
    if (selectedPR.vendorName) {
      form.setValue("vendorName", selectedPR.vendorName)
    }
    if (selectedPR.totalAmount) {
      form.setValue("amount", Number(selectedPR.totalAmount))
    }
    form.setValue("purpose", `Tạm ứng cho Đề nghị mua hàng ${selectedPR.code}`)
  }

  async function onSubmit(data: FormValues) {
    setLoading(true)
    try {
      const res = await fetch("/api/advance-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        toast({ title: "Tạo tạm ứng thành công" })
        router.push("/advances")
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
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tạo đề nghị tạm ứng mới</h2>
          <p className="text-muted-foreground">Khai báo thông tin xin ứng tiền (công tác phí, mua sắm,...)</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

          {/* Workflow */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-primary text-base">Chuỗi cung ứng (Bắt buộc)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="purchaseRequestId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Đề nghị mua hàng đã được duyệt <span className="text-destructive">*</span></FormLabel>
                  <div className="flex gap-2">
                    <Select onValueChange={handleSelectPR} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="flex-1"><SelectValue placeholder="Chọn ĐN Mua hàng" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {purchaseRequests.map((pr) => (
                          <SelectItem key={pr.id} value={pr.id}>{pr.code} {pr.vendorName ? `(${pr.vendorName})` : ""}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedPR && (
                      <Button type="button" variant="outline" className="gap-2 shrink-0" onClick={handleCopyFromPR}>
                        <Copy className="h-4 w-4" /> Copy dữ liệu
                      </Button>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )} />

              {selectedPR && (
                <div className="bg-background rounded-lg border p-3 text-sm grid grid-cols-2 gap-2 text-muted-foreground">
                  <div><span className="font-medium text-foreground">Mã ĐN Mua hàng:</span> {selectedPR.code}</div>
                  <div><span className="font-medium text-foreground">Số tiền ĐN:</span> {selectedPR.totalAmount ? Number(selectedPR.totalAmount).toLocaleString("vi-VN") : "0"} ₫</div>
                  {selectedPR.materialRequest && (
                    <div className="col-span-2"><span className="font-medium text-foreground">ĐN Cấp vật tư gốc:</span> {selectedPR.materialRequest.code} {selectedPR.materialRequest.purpose ? `(${selectedPR.materialRequest.purpose})` : ""}</div>
                  )}
                  {selectedPR.procurementPlan && (
                    <div className="col-span-2"><span className="font-medium text-foreground">Hồ sơ/HĐ liên kết:</span> {selectedPR.procurementPlan.code} - {selectedPR.procurementPlan.title}</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Thông tin cơ bản</CardTitle>
              <CardDescription>Mục đích và số tiền cần ứng.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="purpose"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mục đích tạm ứng <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Textarea placeholder="Vd: Tạm ứng công tác phí Hà Nội - HCM..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Số tiền đề nghị (VNĐ) <span className="text-red-500">*</span></FormLabel>
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
                <FormField
                  control={form.control}
                  name="expectedReturnDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ngày dự kiến hoàn ứng</FormLabel>
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
                name="vendorName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nhà cung cấp / Đối tượng thụ hưởng</FormLabel>
                    <FormControl>
                      <Input placeholder="Tên cá nhân/công ty nhận tiền..." {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
