"use client"

import { useState, useEffect, useCallback } from "react"
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
  Search, Plus, MoreHorizontal, Pencil, Trash2, Loader2, Store, ChevronLeft, ChevronRight,
} from "lucide-react"

interface Vendor {
  id: string
  name: string
  taxCode: string | null
  bankAccount: string | null
  bankName: string | null
  phone: string | null
  email: string | null
  address: string | null
  isActive: boolean
  company: { id: string; name: string; code: string }
}

interface Company { id: string; name: string; code: string }
interface Pagination { page: number; limit: number; total: number; totalPages: number }

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterCompany, setFilterCompany] = useState("all")

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Vendor | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")

  const [formName, setFormName] = useState("")
  const [formTaxCode, setFormTaxCode] = useState("")
  const [formBankAccount, setFormBankAccount] = useState("")
  const [formBankName, setFormBankName] = useState("")
  const [formPhone, setFormPhone] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [formAddress, setFormAddress] = useState("")
  const [formCompanyId, setFormCompanyId] = useState("")

  const fetchVendors = useCallback(async (page = 1, companyOverride?: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" })
      if (search) params.set("search", search)
      const c = companyOverride ?? filterCompany
      if (c !== "all") params.set("companyId", c)
      const res = await fetch(`/api/admin/vendors?${params}`)
      const json = await res.json()
      if (res.ok) { setVendors(json.data); setPagination(json.pagination) }
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

  useEffect(() => { fetchVendors(); fetchCompanies() }, [fetchVendors, fetchCompanies])

  function openCreate() {
    setEditing(null)
    setFormName(""); setFormTaxCode(""); setFormBankAccount(""); setFormBankName("")
    setFormPhone(""); setFormEmail(""); setFormAddress("")
    setFormCompanyId(companies[0]?.id || ""); setFormError("")
    setDialogOpen(true)
  }

  function openEdit(v: Vendor) {
    setEditing(v)
    setFormName(v.name); setFormTaxCode(v.taxCode || ""); setFormBankAccount(v.bankAccount || "")
    setFormBankName(v.bankName || ""); setFormPhone(v.phone || ""); setFormEmail(v.email || "")
    setFormAddress(v.address || ""); setFormCompanyId(v.company.id); setFormError("")
    setDialogOpen(true)
  }

  async function handleSave() {
    setSaving(true); setFormError("")
    try {
      const body = {
        name: formName, taxCode: formTaxCode || null, bankAccount: formBankAccount || null,
        bankName: formBankName || null, phone: formPhone || null, email: formEmail || null,
        address: formAddress || null, companyId: formCompanyId,
      }
      const url = editing ? `/api/admin/vendors/${editing.id}` : "/api/admin/vendors"
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      })
      if (!res.ok) { const err = await res.json(); setFormError(err.error); return }
      setDialogOpen(false); fetchVendors(pagination.page)
    } catch { setFormError("Lỗi kết nối") }
    finally { setSaving(false) }
  }

  async function handleDelete(v: Vendor) {
    if (!confirm(`Vô hiệu hóa NCC "${v.name}"?`)) return
    await fetch(`/api/admin/vendors/${v.id}`, { method: "DELETE" })
    fetchVendors(pagination.page)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Store className="h-6 w-6 text-primary" /> Nhà cung cấp
          </h2>
          <p className="text-muted-foreground text-sm mt-1">Tổng: {pagination.total} NCC</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Thêm NCC</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tìm theo tên, MST..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchVendors(1)} className="pl-9" />
        </div>
        <Select value={filterCompany} onValueChange={(v) => { setFilterCompany(v); fetchVendors(1, v) }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Tất cả công ty" /></SelectTrigger>
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
              <TableHead>Tên NCC</TableHead>
              <TableHead className="hidden md:table-cell">MST</TableHead>
              <TableHead className="hidden lg:table-cell">Ngân hàng</TableHead>
              <TableHead className="hidden lg:table-cell">SĐT</TableHead>
              <TableHead>Công ty</TableHead>
              <TableHead>TT</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
            ) : vendors.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Không có dữ liệu</TableCell></TableRow>
            ) : vendors.map((v) => (
              <TableRow key={v.id} className={!v.isActive ? "opacity-50" : ""}>
                <TableCell className="font-medium max-w-[200px] truncate">{v.name}</TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{v.taxCode || "—"}</TableCell>
                <TableCell className="hidden lg:table-cell text-sm">{v.bankName ? `${v.bankName} - ${v.bankAccount}` : "—"}</TableCell>
                <TableCell className="hidden lg:table-cell text-sm">{v.phone || "—"}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{v.company.code}</Badge></TableCell>
                <TableCell>
                  <Badge variant={v.isActive ? "default" : "outline"} className="text-xs">
                    {v.isActive ? "HĐ" : "KHĐ"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(v)}><Pencil className="mr-2 h-4 w-4" /> Sửa</DropdownMenuItem>
                      {v.isActive && <DropdownMenuItem onClick={() => handleDelete(v)} className="text-red-600"><Trash2 className="mr-2 h-4 w-4" /> Vô hiệu</DropdownMenuItem>}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Trang {pagination.page}/{pagination.totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => fetchVendors(pagination.page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => fetchVendors(pagination.page + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Sửa nhà cung cấp" : "Thêm NCC mới"}</DialogTitle>
            <DialogDescription>Thông tin nhà cung cấp vật tư, dịch vụ</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {formError && <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg">{formError}</div>}
            <div className="space-y-2">
              <Label>Tên NCC *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Công ty TNHH ABC" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>MST</Label><Input value={formTaxCode} onChange={(e) => setFormTaxCode(e.target.value)} /></div>
              <div className="space-y-2">
                <Label>Công ty *</Label>
                <Select value={formCompanyId} onValueChange={setFormCompanyId}>
                  <SelectTrigger><SelectValue placeholder="Chọn" /></SelectTrigger>
                  <SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Tên ngân hàng</Label><Input value={formBankName} onChange={(e) => setFormBankName(e.target.value)} /></div>
              <div className="space-y-2"><Label>Số tài khoản</Label><Input value={formBankAccount} onChange={(e) => setFormBankAccount(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>SĐT</Label><Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} /></div>
              <div className="space-y-2"><Label>Email</Label><Input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>Địa chỉ</Label><Input value={formAddress} onChange={(e) => setFormAddress(e.target.value)} /></div>
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
