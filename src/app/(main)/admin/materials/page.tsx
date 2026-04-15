"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Search, Plus, Loader2, Boxes, Upload, FileSpreadsheet,
  CheckCircle2, AlertCircle, ChevronLeft, ChevronRight,
} from "lucide-react"

interface MaterialItem {
  id: string
  code: string
  name: string
  unit: string
  category: string | null
  description: string | null
  company: { id: string; name: string; code: string }
}

interface Company { id: string; name: string; code: string }
interface Pagination { page: number; limit: number; total: number; totalPages: number }

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<MaterialItem[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterCompany, setFilterCompany] = useState("all")

  // Create dialog
  const [dialogOpen, setDialogOpen] = useState(false)

  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")
  const [formCode, setFormCode] = useState("")
  const [formName, setFormName] = useState("")
  const [formUnit, setFormUnit] = useState("")
  const [formCategory, setFormCategory] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formCompanyId, setFormCompanyId] = useState("")

  // Import dialog
  const [importOpen, setImportOpen] = useState(false)
  const [importCompanyId, setImportCompanyId] = useState("")
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{
    message: string; created: number; updated: number; errors?: string[]
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchMaterials = useCallback(async (page = 1, companyOverride?: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" })
      if (search) params.set("search", search)
      const c = companyOverride ?? filterCompany
      if (c !== "all") params.set("companyId", c)
      const res = await fetch(`/api/admin/materials?${params}`)
      const json = await res.json()
      if (res.ok) { setMaterials(json.data); setPagination(json.pagination) }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [search, filterCompany])

  const fetchCompanies = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/companies?limit=100")
      const json = await res.json()
      if (res.ok) setCompanies(json.data)
    } catch (err) { console.error(err) }
  }, [])

  useEffect(() => { fetchMaterials(); fetchCompanies() }, [fetchMaterials, fetchCompanies])

  function openCreate() {
    setFormCode(""); setFormName(""); setFormUnit(""); setFormCategory("")
    setFormDescription(""); setFormCompanyId(companies[0]?.id || ""); setFormError("")
    setDialogOpen(true)
  }

  async function handleSave() {
    setSaving(true); setFormError("")
    try {
      const body = {
        code: formCode, name: formName, unit: formUnit,
        category: formCategory || null, description: formDescription || null,
        companyId: formCompanyId,
      }
      const res = await fetch("/api/admin/materials", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      })
      if (!res.ok) { const err = await res.json(); setFormError(err.error); return }
      setDialogOpen(false); fetchMaterials(pagination.page)
    } catch { setFormError("Lỗi kết nối") }
    finally { setSaving(false) }
  }

  async function handleImport() {
    const file = fileInputRef.current?.files?.[0]
    if (!file) return
    if (!importCompanyId) { setImportResult({ message: "Vui lòng chọn công ty", created: 0, updated: 0 }); return }

    setImporting(true); setImportResult(null)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("companyId", importCompanyId)

      const res = await fetch("/api/admin/materials/import", { method: "POST", body: formData })
      const json = await res.json()

      if (res.ok) {
        setImportResult(json)
        fetchMaterials(1)
      } else {
        setImportResult({ message: json.error || "Lỗi import", created: 0, updated: 0 })
      }
    } catch { setImportResult({ message: "Lỗi kết nối server", created: 0, updated: 0 }) }
    finally { setImporting(false) }
  }

  // ─── Categories unique


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Boxes className="h-6 w-6 text-primary" /> Danh mục Vật tư
          </h2>
          <p className="text-muted-foreground text-sm mt-1">Tổng: {pagination.total} vật tư</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setImportOpen(true); setImportResult(null); setImportCompanyId(companies[0]?.id || "") }} className="gap-2">
            <Upload className="h-4 w-4" /> Import Excel
          </Button>
          <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Thêm vật tư</Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tìm theo mã, tên..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchMaterials(1)} className="pl-9" />
        </div>
        <Select value={filterCompany} onValueChange={(v) => { setFilterCompany(v); fetchMaterials(1, v) }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Tất cả" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả công ty</SelectItem>
            {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Mã VT</TableHead>
              <TableHead>Tên vật tư</TableHead>
              <TableHead className="w-20">ĐVT</TableHead>
              <TableHead className="hidden md:table-cell">Phân loại</TableHead>
              <TableHead>Công ty</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
            ) : materials.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">Không có dữ liệu</TableCell></TableRow>
            ) : materials.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-mono font-medium text-sm">{m.code}</TableCell>
                <TableCell className="font-medium">{m.name}</TableCell>
                <TableCell className="text-sm">{m.unit}</TableCell>
                <TableCell className="hidden md:table-cell">
                  {m.category ? <Badge variant="secondary" className="text-xs">{m.category}</Badge> : "—"}
                </TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{m.company.code}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Trang {pagination.page}/{pagination.totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => fetchMaterials(pagination.page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => fetchMaterials(pagination.page + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Thêm vật tư mới</DialogTitle>
            <DialogDescription>Tạo mới vật tư trong danh mục</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {formError && <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg">{formError}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Mã VT *</Label><Input value={formCode} onChange={(e) => setFormCode(e.target.value.toUpperCase())} placeholder="VT011" /></div>
              <div className="space-y-2"><Label>ĐVT *</Label><Input value={formUnit} onChange={(e) => setFormUnit(e.target.value)} placeholder="Cái" /></div>
            </div>
            <div className="space-y-2"><Label>Tên vật tư *</Label><Input value={formName} onChange={(e) => setFormName(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Phân loại</Label><Input value={formCategory} onChange={(e) => setFormCategory(e.target.value)} placeholder="Văn phòng phẩm" /></div>
              <div className="space-y-2">
                <Label>Công ty *</Label>
                <Select value={formCompanyId} onValueChange={setFormCompanyId}>
                  <SelectTrigger><SelectValue placeholder="Chọn" /></SelectTrigger>
                  <SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Tạo mới
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-500" /> Import Vật tư từ Excel
            </DialogTitle>
            <DialogDescription>
              File Excel cần có các cột: Mã VT | Tên vật tư | Đơn vị | Phân loại | Mô tả
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Công ty *</Label>
              <Select value={importCompanyId} onValueChange={setImportCompanyId}>
                <SelectTrigger><SelectValue placeholder="Chọn công ty" /></SelectTrigger>
                <SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Chọn file Excel (.xlsx)</Label>
              <Input ref={fileInputRef} type="file" accept=".xlsx,.xls"
                className="cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-sm file:font-medium file:text-primary" />
            </div>

            {importResult && (
              <Card className={importResult.created > 0 || importResult.updated > 0
                ? "border-emerald-200 dark:border-emerald-800"
                : "border-red-200 dark:border-red-800"}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start gap-2">
                    {importResult.created > 0 || importResult.updated > 0
                      ? <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5" />
                      : <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />}
                    <div>
                      <p className="text-sm font-medium">{importResult.message}</p>
                      {importResult.errors && importResult.errors.length > 0 && (
                        <ul className="mt-1 text-xs text-muted-foreground list-disc pl-4">
                          {importResult.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
                        </ul>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Đóng</Button>
            <Button onClick={handleImport} disabled={importing} className="gap-2">
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
