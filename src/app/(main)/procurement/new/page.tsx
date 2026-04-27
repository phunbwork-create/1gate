"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Loader2, ArrowLeft, Save, Upload, FileText, X, FileCheck } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// Removed TYPES - loại hồ sơ đã bỏ theo yêu cầu

interface PFile { file: File; documentType: string }

// ── Shared field wrapper (module scope to prevent re-mount on every keystroke) ─
const inputCls = "h-8 text-[13px]"
function F({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-0.5 ${className}`}>
      <Label className="text-[11px] text-muted-foreground leading-none">{label}</Label>
      {children}
    </div>
  )
}

export default function ContractNewPage() {
  const router = useRouter()
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const [f, setF] = useState({
    title: "", contractCode: "", description: "",
    partnerName: "", partnerTaxCode: "", partnerRepresentative: "",
    signDate: "", effectiveDate: "", expiryDate: "",
    contractValue: "", vatRate: "10", currency: "VND",
  })
  const [files, setFiles] = useState<PFile[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const set = useCallback((k: string, v: string) => setF(p => ({ ...p, [k]: v })), [])
  const numVal = Number(f.contractValue) || 0
  const vat = numVal * ((Number(f.vatRate) || 0) / 100)
  const total = numVal + vat

  function addFiles(list: FileList | null) {
    if (!list) return
    setFiles(p => [...p, ...Array.from(list).map(file => ({ file, documentType: "Contract" }))])
    if (fileRef.current) fileRef.current.value = ""
  }

  async function handleSave() {
    if (!f.contractCode.trim()) { setError("Vui lòng nhập mã hồ sơ / mã hợp đồng"); return }
    if (!f.title.trim()) { setError("Vui lòng nhập tên hồ sơ"); return }
    setSaving(true); setError("")
    try {
      const res = await fetch("/api/procurement", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: f.title, contractCode: f.contractCode,
          description: f.description || null,
          partnerName: f.partnerName || null, partnerTaxCode: f.partnerTaxCode || null,
          partnerRepresentative: f.partnerRepresentative || null,
          signDate: f.signDate || null, effectiveDate: f.effectiveDate || null,
          expiryDate: f.expiryDate || null,
          contractValue: numVal || null, vatRate: Number(f.vatRate) || null,
          currency: f.currency,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || "Tạo thất bại"); return }

      // Upload files in parallel (not sequential) to avoid slow loading
      if (files.length > 0) {
        await Promise.all(files.map(pf => {
          const fd = new FormData()
          fd.append("file", pf.file)
          fd.append("entityType", "procurementPlan")
          fd.append("entityId", json.id)
          fd.append("documentType", pf.documentType)
          return fetch("/api/attachments", { method: "POST", body: fd })
        }))
      }

      toast({ title: "Thành công", description: "Đã tạo hồ sơ / hợp đồng." })
      router.push("/procurement")
    } catch { setError("Lỗi kết nối") }
    finally { setSaving(false) }
  }



  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/procurement">
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <FileCheck className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-bold">Tạo Hồ sơ / Hợp đồng</h2>
        </div>
        <div className="flex gap-2">
          <Link href="/procurement"><Button variant="outline" size="sm" className="h-8">Hủy</Button></Link>
          <Button size="sm" className="h-8 gap-1.5" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {saving ? "Đang lưu..." : "Lưu hồ sơ"}
          </Button>
        </div>
      </div>

      {error && <div className="p-2 text-xs text-red-600 bg-red-50 rounded border border-red-200">{error}</div>}

      {/* Single card form */}
      <div className="bg-card border rounded-xl p-4">
        <div className="grid grid-cols-12 gap-x-6 gap-y-3">

          {/* ── Col left: Upload ──────────────────────────────── */}
          <div className="col-span-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">Tài liệu đính kèm</span>
              <Button type="button" variant="outline" size="sm" className="h-6 text-[10px] gap-1 px-2" onClick={() => fileRef.current?.click()}>
                <Upload className="h-2.5 w-2.5" /> Chọn file
              </Button>
            </div>
            <div
              className="border border-dashed rounded-md py-5 text-center hover:border-primary/40 hover:bg-muted/10 transition-colors cursor-pointer"
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files) }}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-5 w-5 mx-auto text-muted-foreground/60 mb-1" />
              <p className="text-[10px] text-muted-foreground">Kéo thả file · PDF, Word, ảnh</p>
            </div>
            <input ref={fileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" multiple onChange={e => addFiles(e.target.files)} />

            {files.length > 0 && (
              <ul className="space-y-1 max-h-[180px] overflow-y-auto">
                {files.map((pf, i) => (
                  <li key={i} className="flex items-center gap-1.5 px-2 py-1.5 rounded border bg-muted/15 text-[11px]">
                    <FileText className="h-3 w-3 text-red-500 flex-shrink-0" />
                    <span className="flex-1 truncate">{pf.file.name}</span>
                    <Select value={pf.documentType} onValueChange={v => setFiles(p => p.map((x, j) => j === i ? { ...x, documentType: v } : x))}>
                      <SelectTrigger className="w-[90px] h-5 text-[10px] border-0 bg-muted/30 px-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Contract">Hợp đồng</SelectItem>
                        <SelectItem value="Quotation">Báo giá</SelectItem>
                        <SelectItem value="AcceptanceCert">BBNT</SelectItem>
                        <SelectItem value="Invoice">Hóa đơn</SelectItem>
                        <SelectItem value="Other">Khác</SelectItem>
                      </SelectContent>
                    </Select>
                    <button className="text-red-400 hover:text-red-600" onClick={() => setFiles(p => p.filter((_, j) => j !== i))}>
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ── Col right: Info ───────────────────────────────── */}
          <div className="col-span-8 space-y-3">
            {/* Row 1: Mã + Tên */}
            <div className="grid grid-cols-3 gap-2">
              <F label="Mã hồ sơ / Mã HĐ *">
                <Input className={inputCls} value={f.contractCode} onChange={e => set("contractCode", e.target.value)} placeholder="VD: HĐ-2026-001" />
              </F>
              <F label="Tên hồ sơ / hợp đồng *" className="col-span-2">
                <Input className={inputCls} value={f.title} onChange={e => set("title", e.target.value)} placeholder="VD: HĐ cung cấp VPP Q1/2026" />
              </F>
            </div>

            {/* Row 2: Ghi chú (textarea) */}
            <F label="Ghi chú">
              <Textarea className="text-[13px] min-h-[72px]" value={f.description} onChange={e => set("description", e.target.value)} placeholder="Tóm tắt nội dung..." rows={3} />
            </F>

            {/* Row 3: Đối tác */}
            <div className="grid grid-cols-3 gap-2">
              <F label="Đối tác"><Input className={inputCls} value={f.partnerName} onChange={e => set("partnerName", e.target.value)} placeholder="Công ty ABC" /></F>
              <F label="MST"><Input className={inputCls} value={f.partnerTaxCode} onChange={e => set("partnerTaxCode", e.target.value)} placeholder="0100000000" /></F>
              <F label="Người đại diện"><Input className={inputCls} value={f.partnerRepresentative} onChange={e => set("partnerRepresentative", e.target.value)} placeholder="Nguyễn Văn A" /></F>
            </div>

            {/* Row 4: Thời hạn */}
            <div className="grid grid-cols-3 gap-2">
              <F label="Ngày ký"><Input className={inputCls} type="date" value={f.signDate} onChange={e => set("signDate", e.target.value)} /></F>
              <F label="Hiệu lực"><Input className={inputCls} type="date" value={f.effectiveDate} onChange={e => set("effectiveDate", e.target.value)} /></F>
              <F label="Hết hạn"><Input className={inputCls} type="date" value={f.expiryDate} onChange={e => set("expiryDate", e.target.value)} /></F>
            </div>

            {/* Row 5: Giá trị */}
            <div className="grid grid-cols-4 gap-2">
              <F label="Giá trị trước thuế"><Input className={inputCls} type="number" min={0} value={f.contractValue} onChange={e => set("contractValue", e.target.value)} placeholder="0" /></F>
              <F label="VAT %"><Input className={inputCls} type="number" min={0} max={100} value={f.vatRate} onChange={e => set("vatRate", e.target.value)} /></F>
              <F label="Tiền tệ">
                <Select value={f.currency} onValueChange={v => set("currency", v)}>
                  <SelectTrigger className="h-8 text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="VND">VND</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent>
                </Select>
              </F>
              <F label="Tổng sau thuế">
                <div className="h-8 flex items-center px-2 rounded-md border bg-orange-50 dark:bg-orange-950/20 text-[13px] font-bold text-orange-600">
                  {total.toLocaleString("vi-VN")} {f.currency}
                </div>
              </F>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
