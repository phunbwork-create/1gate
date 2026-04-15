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
interface PlanOption { id: string; code: string; title: string }

interface ReqItem {
  materialItemId: string | null
  itemName: string; unit: string; requestedQty: number; note: string
}

const emptyItem = (): ReqItem => ({
  materialItemId: null, itemName: "", unit: "", requestedQty: 1, note: "",
})

export default function MaterialRequestNewPage() {
  const router = useRouter()
  const [purpose, setPurpose] = useState("")
  const [requiredDate, setRequiredDate] = useState("")
  const [procurementPlanId, setProcurementPlanId] = useState("")
  const [items, setItems] = useState<ReqItem[]>([emptyItem()])
  const [materials, setMaterials] = useState<MaterialOption[]>([])
  const [plans, setPlans] = useState<PlanOption[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const fetchData = useCallback(async () => {
    try {
      const [matRes, planRes] = await Promise.all([
        fetch("/api/admin/materials?limit=100"),
        fetch("/api/procurement?status=Approved&limit=100"),
      ])
      const matJson = await matRes.json()
      const planJson = await planRes.json()
      if (matRes.ok) setMaterials(matJson.data)
      if (planRes.ok) setPlans(planJson.data)
    } catch (e) { console.error(e) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  function updateItem(idx: number, field: keyof ReqItem, value: string | number | null) {
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
        purpose: purpose || null,
        requiredDate: requiredDate || null,
        procurementPlanId: (procurementPlanId && procurementPlanId !== "none") ? procurementPlanId : null,
        items: items.filter((i) => i.itemName.trim()).map((i) => ({
          materialItemId: i.materialItemId,
          itemName: i.itemName, unit: i.unit,
          requestedQty: Number(i.requestedQty), note: i.note || null,
        })),
      }

      const res = await fetch("/api/material-requests", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error); return }

      if (submit && json.id) {
        await fetch(`/api/material-requests/${json.id}/submit`, { method: "POST" })
      }
      router.push(`/materials/${json.id}`)
    } catch { setError("Lỗi kết nối") }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-2xl font-bold tracking-tight">Tạo Đề nghị Cấp vật tư</h2>
      </div>

      {error && <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Mục đích sử dụng</Label>
          <Textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={1} placeholder="VD: Cấp VPP cho phòng kế toán" />
        </div>
        <div className="space-y-2">
          <Label>Ngày cần</Label>
          <Input type="date" value={requiredDate} onChange={(e) => setRequiredDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>KH Mua sắm liên kết</Label>
          <Select value={procurementPlanId || "none"} onValueChange={setProcurementPlanId}>
            <SelectTrigger><SelectValue placeholder="Chọn KH" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Không liên kết —</SelectItem>
              {plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.code} — {p.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Danh sách vật tư</Label>
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
                <TableHead>Tên vật tư</TableHead>
                <TableHead className="w-20">ĐVT</TableHead>
                <TableHead className="w-24">SL</TableHead>
                <TableHead className="w-40">Ghi chú</TableHead>
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
                  <TableCell><Input className="h-8 text-sm text-right" type="number" min={1} value={item.requestedQty} onChange={(e) => updateItem(idx, "requestedQty", Number(e.target.value))} /></TableCell>
                  <TableCell><Input className="h-8 text-sm" value={item.note} onChange={(e) => updateItem(idx, "note", e.target.value)} /></TableCell>
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
