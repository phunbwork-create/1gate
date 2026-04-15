"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Loader2, Plus, Trash2, Save, Send, ArrowLeft } from "lucide-react"

interface MaterialOption { id: string; code: string; name: string; unit: string }
interface VendorOption { id: string; name: string; taxCode: string | null }

interface PReqItem {
  materialItemId: string | null
  itemName: string; unit: string; quantity: number
  unitPrice: number | null; note: string
}

const emptyItem = (): PReqItem => ({
  materialItemId: null, itemName: "", unit: "", quantity: 1, unitPrice: null, note: "",
})

export default function PurchaseRequestNewPage() {
  const router = useRouter()
  const [vendorId, setVendorId] = useState("")
  const [vendorName, setVendorName] = useState("")
  const [note, setNote] = useState("")
  const [items, setItems] = useState<PReqItem[]>([emptyItem()])
  const [materials, setMaterials] = useState<MaterialOption[]>([])
  const [vendors, setVendors] = useState<VendorOption[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const fetchData = useCallback(async () => {
    try {
      const [matRes, vendorRes] = await Promise.all([
        fetch("/api/admin/materials?limit=100"),
        fetch("/api/admin/vendors?limit=100"),
      ])
      const matJson = await matRes.json()
      const vendorJson = await vendorRes.json()
      if (matRes.ok) setMaterials(matJson.data)
      if (vendorRes.ok) setVendors(vendorJson.data)
    } catch (e) { console.error(e) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  function selectVendor(vId: string) {
    if (vId === "manual") { setVendorId(""); return }
    const v = vendors.find((x) => x.id === vId)
    if (v) { setVendorId(v.id); setVendorName(v.name) }
  }

  function updateItem(idx: number, field: keyof PReqItem, value: string | number | null) {
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  function selectMaterial(idx: number, materialId: string) {
    const mat = materials.find((m) => m.id === materialId)
    if (mat) {
      setItems((prev) => prev.map((item, i) =>
        i === idx ? { ...item, materialItemId: mat.id, itemName: mat.name, unit: mat.unit } : item
      ))
    }
  }

  function removeItem(idx: number) {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  const totalAmount = items.reduce((s, i) => s + (Number(i.unitPrice) || 0) * Number(i.quantity), 0)

  async function handleSave(submit = false) {
    setSaving(true); setError("")
    try {
      const body = {
        vendorId: vendorId || null, vendorName: vendorName || null, note: note || null,
        items: items.filter((i) => i.itemName.trim()).map((i) => ({
          materialItemId: i.materialItemId,
          itemName: i.itemName, unit: i.unit,
          quantity: Number(i.quantity),
          unitPrice: i.unitPrice ? Number(i.unitPrice) : null,
          note: i.note || null,
        })),
      }

      const res = await fetch("/api/purchase-requests", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error); return }

      if (submit && json.id) {
        await fetch(`/api/purchase-requests/${json.id}/submit`, { method: "POST" })
      }
      router.push(`/purchases/${json.id}`)
    } catch { setError("Lỗi kết nối") }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-2xl font-bold tracking-tight">Tạo Đề nghị Mua hàng</h2>
      </div>

      {error && <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Nhà cung cấp</Label>
          <Select value={vendorId || "manual"} onValueChange={selectVendor}>
            <SelectTrigger><SelectValue placeholder="Chọn NCC" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">— Nhập tay —</SelectItem>
              {vendors.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Tên NCC</Label>
          <Input value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="Nếu không chọn từ danh sách" />
        </div>
        <div className="space-y-2">
          <Label>Ghi chú</Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={1} />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Danh sách hàng hóa</Label>
          <Button variant="outline" size="sm" onClick={() => setItems([...items, emptyItem()])} className="gap-1">
            <Plus className="h-3 w-3" /> Thêm dòng
          </Button>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead className="w-44">Vật tư</TableHead>
                <TableHead>Tên hàng hóa</TableHead>
                <TableHead className="w-20">ĐVT</TableHead>
                <TableHead className="w-20">SL</TableHead>
                <TableHead className="w-28">Đơn giá</TableHead>
                <TableHead className="w-28">Thành tiền</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="text-sm text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell>
                    <Select value={item.materialItemId || "manual"} onValueChange={(v) => v !== "manual" && selectMaterial(idx, v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Chọn" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">— Nhập tay —</SelectItem>
                        {materials.map((m) => <SelectItem key={m.id} value={m.id}>{m.code} - {m.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Input className="h-8 text-sm" value={item.itemName} onChange={(e) => updateItem(idx, "itemName", e.target.value)} /></TableCell>
                  <TableCell><Input className="h-8 text-sm" value={item.unit} onChange={(e) => updateItem(idx, "unit", e.target.value)} /></TableCell>
                  <TableCell><Input className="h-8 text-sm text-right" type="number" min={1} value={item.quantity} onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))} /></TableCell>
                  <TableCell><Input className="h-8 text-sm text-right" type="number" min={0} value={item.unitPrice ?? ""} onChange={(e) => updateItem(idx, "unitPrice", e.target.value ? Number(e.target.value) : null)} /></TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {((Number(item.unitPrice) || 0) * Number(item.quantity)).toLocaleString("vi-VN")}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(idx)} disabled={items.length <= 1}>
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="text-right text-sm">
          Tổng tiền: <span className="font-bold text-lg">{totalAmount.toLocaleString("vi-VN")} đ</span>
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={() => router.back()}>Hủy</Button>
        <Button variant="secondary" onClick={() => handleSave(false)} disabled={saving} className="gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} <Save className="h-4 w-4" /> Lưu nháp
        </Button>
        <Button onClick={() => handleSave(true)} disabled={saving} className="gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} <Send className="h-4 w-4" /> Lưu & Trình
        </Button>
      </div>
    </div>
  )
}
