"use client"

import { useState, useEffect, useCallback } from "react"
import { CompanyType } from "@/types/domain"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Search, Plus, MoreHorizontal, Pencil, Loader2, Building2,
} from "lucide-react"

interface Company {
  id: string
  name: string
  code: string
  type: CompanyType
  taxCode: string | null
  address: string | null
  isActive: boolean
  _count: { users: number; departments: number }
}

const TYPE_LABELS: Record<CompanyType, string> = {
  HO: "Hội sở",
  CTTV: "Chi nhánh",
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Company | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")

  const [formName, setFormName] = useState("")
  const [formCode, setFormCode] = useState("")
  const [formType, setFormType] = useState<CompanyType>(CompanyType.CTTV)
  const [formTaxCode, setFormTaxCode] = useState("")
  const [formAddress, setFormAddress] = useState("")

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: "100" })
      if (search) params.set("search", search)
      const res = await fetch(`/api/admin/companies?${params}`)
      const json = await res.json()
      if (res.ok) setCompanies(json.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [search])

  useEffect(() => { fetchData() }, [fetchData])

  function openCreate() {
    setEditing(null)
    setFormName(""); setFormCode(""); setFormType(CompanyType.CTTV)
    setFormTaxCode(""); setFormAddress(""); setFormError("")
    setDialogOpen(true)
  }

  function openEdit(c: Company) {
    setEditing(c)
    setFormName(c.name); setFormCode(c.code); setFormType(c.type)
    setFormTaxCode(c.taxCode || ""); setFormAddress(c.address || ""); setFormError("")
    setDialogOpen(true)
  }

  async function handleSave() {
    setSaving(true); setFormError("")
    try {
      const body = {
        name: formName, code: formCode, type: formType,
        taxCode: formTaxCode || null, address: formAddress || null,
      }
      const url = editing ? `/api/admin/companies/${editing.id}` : "/api/admin/companies"
      const method = editing ? "PATCH" : "POST"
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        setFormError(err.error || "Lỗi lưu dữ liệu"); return
      }
      setDialogOpen(false); fetchData()
    } catch { setFormError("Lỗi kết nối") }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" /> Công ty & Chi nhánh
          </h2>
          <p className="text-muted-foreground text-sm mt-1">{companies.length} đơn vị</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Thêm công ty</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Tìm theo tên, mã..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchData()} className="pl-9" />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã</TableHead>
              <TableHead>Tên công ty</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead className="hidden md:table-cell">MST</TableHead>
              <TableHead className="text-center">NV</TableHead>
              <TableHead className="text-center">Phòng</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              </TableCell></TableRow>
            ) : companies.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Không có dữ liệu</TableCell></TableRow>
            ) : companies.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono font-medium">{c.code}</TableCell>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>
                  <Badge variant={c.type === "HO" ? "default" : "secondary"} className="text-xs">
                    {TYPE_LABELS[c.type]}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{c.taxCode || "—"}</TableCell>
                <TableCell className="text-center text-sm">{c._count.users}</TableCell>
                <TableCell className="text-center text-sm">{c._count.departments}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(c)}><Pencil className="mr-2 h-4 w-4" /> Chỉnh sửa</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Chỉnh sửa công ty" : "Thêm công ty mới"}</DialogTitle>
            <DialogDescription>Thông tin đơn vị trong hệ thống</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {formError && <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg">{formError}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mã công ty *</Label>
                <Input value={formCode} onChange={(e) => setFormCode(e.target.value.toUpperCase())} placeholder="CTTV3" />
              </div>
              <div className="space-y-2">
                <Label>Loại *</Label>
                <Select value={formType} onValueChange={(v) => setFormType(v as CompanyType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HO">Hội sở</SelectItem>
                    <SelectItem value="CTTV">Chi nhánh</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tên công ty *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Chi nhánh Cần Thơ" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mã số thuế</Label>
                <Input value={formTaxCode} onChange={(e) => setFormTaxCode(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Địa chỉ</Label>
                <Input value={formAddress} onChange={(e) => setFormAddress(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Cập nhật" : "Tạo mới"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
