"use client"

import { useRef, useState, useEffect } from "react"
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
import { Loader2, ArrowLeft, Save, AlertCircle, Upload, X, FileText, Copy } from "lucide-react"

type FormValues = z.infer<typeof createPaymentRequestSchema>

const INVOICE_SCENARIOS = [
  { value: "HasInvoice", label: "Đã có hóa đơn (nhập số HĐ ngay)" },
  { value: "InvoiceLater", label: "Chưa có hóa đơn (HĐ nộp sau)" },
  { value: "NoInvoice", label: "Không có hóa đơn (nội bộ)" },
]

function FileUploadField({
  label,
  required,
  files,
  onChange,
  accept = ".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx",
}: {
  label: string
  required?: boolean
  files: File[]
  onChange: (files: File[]) => void
  accept?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const newFiles = Array.from(e.target.files || [])
    onChange([...files, ...newFiles])
    if (inputRef.current) inputRef.current.value = ""
  }

  function removeFile(index: number) {
    onChange(files.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        <span className="text-sm font-medium">{label}</span>
        {required && <span className="text-destructive text-sm">*</span>}
      </div>
      <div
        className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" multiple accept={accept} className="hidden" onChange={handleFiles} />
        <div className="flex flex-col items-center gap-1 text-muted-foreground">
          <Upload className="h-5 w-5" />
          <span className="text-xs">Bấm để chọn file hoặc kéo thả vào đây</span>
          <span className="text-xs opacity-70">PDF, Word, Excel, JPG, PNG</span>
        </div>
      </div>
      {files.length > 0 && (
        <ul className="space-y-1">
          {files.map((f, i) => (
            <li key={i} className="flex items-center gap-2 text-sm bg-muted/50 rounded px-3 py-1.5">
              <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="flex-1 truncate">{f.name}</span>
              <span className="text-xs text-muted-foreground shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
              <button type="button" onClick={(e) => { e.stopPropagation(); removeFile(i) }}
                className="text-muted-foreground hover:text-destructive transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function NewPaymentRequestPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [duplicateWarning, setDuplicateWarning] = useState("")
  const [quoteFiles, setQuoteFiles] = useState<File[]>([])
  const [contractFiles, setContractFiles] = useState<File[]>([])

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
    resolver: zodResolver(createPaymentRequestSchema),
    defaultValues: {
      purchaseRequestId: "",
      vendorName: "",
      bankAccount: "",
      bankName: "",
      amount: 0,
      description: "",
      invoiceScenario: "HasInvoice",
      invoiceNumber: "",
    },
  })

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const watchPRId = form.watch("purchaseRequestId")
  const invoiceScenario = form.watch("invoiceScenario")
  const invoiceNumber = form.watch("invoiceNumber")
  const amount = form.watch("amount")

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
    form.setValue("description", `Thanh toán Đề nghị mua hàng ${selectedPR.code}`)
  }

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
                    <Input
                      type="number"
                      placeholder="0"
                      {...field}
                      onChange={(e) => {
                        const raw = e.target.value
                        // Xóa số 0 đầu: parse sang number rồi gán lại
                        const parsed = raw === "" ? 0 : Number(raw)
                        field.onChange(parsed)
                        // Gán lại value hiển thị để xóa leading zero
                        e.target.value = raw === "" ? "" : String(parsed)
                      }}
                    />
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

              {/* Upload Báo giá — hiển thị khi > 5 triệu */}
              {amount > 5_000_000 && (
                <FileUploadField
                  label="Đính kèm Báo giá"
                  required
                  files={quoteFiles}
                  onChange={setQuoteFiles}
                />
              )}

              {/* Upload Hợp đồng — hiển thị khi > 20 triệu */}
              {amount > 20_000_000 && (
                <FileUploadField
                  label="Đính kèm Hợp đồng"
                  required
                  files={contractFiles}
                  onChange={setContractFiles}
                />
              )}

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
