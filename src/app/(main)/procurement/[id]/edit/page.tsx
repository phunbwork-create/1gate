"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Loader2, ArrowLeft, Save, FileCheck } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const inputCls = "h-8 text-[13px]"
function F({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-0.5 ${className}`}>
      <Label className="text-[11px] text-muted-foreground leading-none">{label}</Label>
      {children}
    </div>
  )
}

interface ContractMeta {
  note?: string
  contractType?: string
  partnerName?: string
  partnerTaxCode?: string
  partnerRepresentative?: string
  signDate?: string
  effectiveDate?: string
  expiryDate?: string
  contractValue?: number
  vatRate?: number
  currency?: string
}

function parseContractMeta(description: string | null): ContractMeta {
  if (!description) return {}
  try { return JSON.parse(description) } catch { return { note: description } }
}

export default function ContractEditPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [f, setF] = useState({
    title: "", contractCode: "", description: "",
    partnerName: "", partnerTaxCode: "", partnerRepresentative: "",
    signDate: "", effectiveDate: "", expiryDate: "",
    contractValue: "", vatRate: "10", currency: "VND",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const set = useCallback((k: string, v: string) => setF(p => ({ ...p, [k]: v })), [])

  // Load existing data
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`/api/procurement/${id}`)
        const json = await res.json()
        if (!res.ok) {
          setError(json.error || "Không tìm thấy hồ sơ")
          setLoading(false)
          return
        }
        const meta = parseContractMeta(json.description)
        setF({
          title: json.title || "",
          contractCode: json.contractCode || "",
          description: meta.note || "",
          partnerName: meta.partnerName || "",
          partnerTaxCode: meta.partnerTaxCode || "",
          partnerRepresentative: meta.partnerRepresentative || "",
          signDate: meta.signDate || "",
          effectiveDate: meta.effectiveDate || "",
          expiryDate: meta.expiryDate || "",
          contractValue: meta.contractValue ? String(meta.contractValue) : "",
          vatRate: meta.vatRate != null ? String(meta.vatRate) : "10",
          currency: meta.currency || "VND",
        })
      } catch {
        setError("Lỗi kết nối")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id])

  const numVal = Number(f.contractValue) || 0
  const vat = numVal * ((Number(f.vatRate) || 0) / 100)
  const total = numVal + vat

  async function handleSave() {
    if (!f.contractCode.trim()) { setError("Vui lòng nhập mã hồ sơ / mã hợp đồng"); return }
    if (!f.title.trim()) { setError("Vui lòng nhập tên hồ sơ"); return }
    setSaving(true); setError("")
    try {
      const res = await fetch(`/api/procurement/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
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
      if (!res.ok) { setError(json.error || "Cập nhật thất bại"); return }

      toast({ title: "Thành công", description: "Đã cập nhật hồ sơ / hợp đồng." })
      router.push(`/procurement/${id}`)
    } catch { setError("Lỗi kết nối") }
    finally { setSaving(false) }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href={`/procurement/${id}`}>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <FileCheck className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-bold">Chỉnh sửa Hồ sơ / Hợp đồng</h2>
        </div>
        <div className="flex gap-2">
          <Link href={`/procurement/${id}`}><Button variant="outline" size="sm" className="h-8">Hủy</Button></Link>
          <Button size="sm" className="h-8 gap-1.5" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </div>
      </div>

      {error && <div className="p-2 text-xs text-red-600 bg-red-50 rounded border border-red-200">{error}</div>}

      {/* Form */}
      <div className="bg-card border rounded-xl p-4">
        <div className="grid grid-cols-12 gap-x-6 gap-y-3">
          {/* Col right: Info */}
          <div className="col-span-12 space-y-3">
            {/* Row 1: Mã + Tên */}
            <div className="grid grid-cols-3 gap-2">
              <F label="Mã hồ sơ / Mã HĐ *">
                <Input className={inputCls} value={f.contractCode} onChange={e => set("contractCode", e.target.value)} placeholder="VD: HĐ-2026-001" />
              </F>
              <F label="Tên hồ sơ / hợp đồng *" className="col-span-2">
                <Input className={inputCls} value={f.title} onChange={e => set("title", e.target.value)} placeholder="VD: HĐ cung cấp VPP Q1/2026" />
              </F>
            </div>

            {/* Row 2: Ghi chú */}
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
