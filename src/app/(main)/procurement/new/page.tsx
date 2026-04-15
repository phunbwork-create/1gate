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

interface MaterialOption {
  id: string; code: string; name: string; unit: string
}

interface PlanItem {
  materialItemId: string | null
  itemName: string; unit: string; plannedQty: number
  estimatedPrice: number | null; note: string
}

const emptyItem = (): PlanItem => ({
  materialItemId: null, itemName: "", unit: "", plannedQty: 1, estimatedPrice: null, note: "",
})

export default function ProcurementNewPage() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [items, setItems] = useState<PlanItem[]>([emptyItem()])
  const [materials, setMaterials] = useState<MaterialOption[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const fetchMaterials = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/materials?limit=100")
      const json = await res.json()
      if (res.ok) setMaterials(json.data)
    } catch (e) { console.error(e) }
  }, [])

  useEffect(() => { fetchMaterials() }, [fetchMaterials])

  function updateItem(idx: number, field: keyof PlanItem, value: string | number | null) {
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

  async function handleSave(submit = false) {
    setSaving(true); setError("")
    try {
      const body = {
        title,
        description: description || null,
        items: items.filter((i) => i.itemName.trim()).map((i) => ({
          materialItemId: i.materialItemId,
          itemName: i.itemName,
          unit: i.unit,
          plannedQty: Number(i.plannedQty),
          estimatedPrice: i.estimatedPrice ? Number(i.estimatedPrice) : null,
          note: i.note || null,
        })),
      }

      const res = await fetch("/api/procurement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error); return }

      if (submit && json.id) {
        await fetch(`/api/procurement/${json.id}/submit`, { method: "POST" })
      }

      router.push(`/procurement/${json.id}`)
    } catch { setError("Lỗi kết nối") }
    finally { setSaving(false) }
  }

  const totalEstimate = items.reduce((s, i) => s + (Number(i.estimatedPrice) || 0) * Number(i.plannedQty), 0)

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-2xl font-bold tracking-tight">Tạo Kế hoạch Mua sắm</h2>
      </div>

      {error && <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tiêu đề KH *</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: KH mua VPP Q1/2026" />
        </div>
        <div className="space-y-2">
          <Label>Mô tả</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mô tả kế hoạch..." rows={1} />
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
                <TableHead className="w-48">Vật tư</TableHead>
                <TableHead>Tên hàng hóa</TableHead>
                <TableHead className="w-20">ĐVT</TableHead>
                <TableHead className="w-24">SL</TableHead>
                <TableHead className="w-32">Đơn giá (dự kiến)</TableHead>
                <TableHead className="w-32">Thành tiền</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="text-sm text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell>
                    <Select value={item.materialItemId || "manual"} onValueChange={(v) => v !== "manual" && selectMaterial(idx, v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Chọn VT" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">— Nhập tay —</SelectItem>
                        {materials.map((m) => <SelectItem key={m.id} value={m.id}>{m.code} - {m.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input className="h-8 text-sm" value={item.itemName}
                      onChange={(e) => updateItem(idx, "itemName", e.target.value)} />
                  </TableCell>
                  <TableCell>
                    <Input className="h-8 text-sm" value={item.unit}
                      onChange={(e) => updateItem(idx, "unit", e.target.value)} />
                  </TableCell>
                  <TableCell>
                    <Input className="h-8 text-sm text-right" type="number" min={1} value={item.plannedQty}
                      onChange={(e) => updateItem(idx, "plannedQty", Number(e.target.value))} />
                  </TableCell>
                  <TableCell>
                    <Input className="h-8 text-sm text-right" type="number" min={0}
                      value={item.estimatedPrice ?? ""}
                      onChange={(e) => updateItem(idx, "estimatedPrice", e.target.value ? Number(e.target.value) : null)} />
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {((Number(item.estimatedPrice) || 0) * Number(item.plannedQty)).toLocaleString("vi-VN")}
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
          Tổng dự toán: <span className="font-bold text-lg">{totalEstimate.toLocaleString("vi-VN")} đ</span>
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={() => router.back()}>Hủy</Button>
        <Button variant="secondary" onClick={() => handleSave(false)} disabled={saving} className="gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          <Save className="h-4 w-4" /> Lưu nháp
        </Button>
        <Button onClick={() => handleSave(true)} disabled={saving} className="gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          <Send className="h-4 w-4" /> Lưu & Trình duyệt
        </Button>
      </div>
    </div>
  )
}
