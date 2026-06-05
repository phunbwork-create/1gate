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
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Search, Plus, MoreHorizontal, Pencil, Trash2, Loader2, Building, Users,
} from "lucide-react"

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface Department {
  id: string
  name: string
  code: string
  companyId: string
  isActive: boolean
  createdAt: string
  company: { id: string; name: string; code: string }
  _count: { users: number }
}

interface Company {
  id: string
  name: string
  code: string
}

// ─── PAGE ────────────────────────────────────────────────────────────────────

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterCompany, setFilterCompany] = useState<string>("all")

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Department | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")

  // Form state
  const [formName, setFormName] = useState("")
  const [formCode, setFormCode] = useState("")
  const [formCompanyId, setFormCompanyId] = useState("")
  const [formActive, setFormActive] = useState(true)

  // ─── FETCH DATA ──────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterCompany !== "all") params.set("companyId", filterCompany)
      if (search) params.set("search", search)

      const res = await fetch(`/api/admin/departments?${params}`)
      const json = await res.json()
      if (res.ok) setDepartments(json.data)
    } catch (err) {
      console.error("fetchDepartments:", err)
    } finally {
      setLoading(false)
    }
  }, [search, filterCompany])

  const fetchCompanies = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/companies?limit=100")
      const json = await res.json()
      if (res.ok) setCompanies(json.data)
    } catch (err) {
      console.error("fetchCompanies:", err)
    }
  }, [])

  useEffect(() => {
    fetchData()
    fetchCompanies()
  }, [fetchData, fetchCompanies])

  // ─── DIALOG HANDLERS ────────────────────────────────────────────────────

  function openCreate() {
    setEditing(null)
    setFormName("")
    setFormCode("")
    setFormCompanyId(companies[0]?.id || "")
    setFormActive(true)
    setFormError("")
    setDialogOpen(true)
  }

  function openEdit(dept: Department) {
    setEditing(dept)
    setFormName(dept.name)
    setFormCode(dept.code)
    setFormCompanyId(dept.companyId)
    setFormActive(dept.isActive)
    setFormError("")
    setDialogOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    setFormError("")

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body: Record<string, any> = {
        name: formName,
        code: formCode,
        companyId: formCompanyId,
      }

      if (editing) {
        body.isActive = formActive
        const res = await fetch(`/api/admin/departments/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const err = await res.json()
          setFormError(err.error || "Lỗi cập nhật")
          return
        }
      } else {
        const res = await fetch("/api/admin/departments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const err = await res.json()
          setFormError(err.error || "Lỗi tạo mới")
          return
        }
      }

      setDialogOpen(false)
      fetchData()
    } catch {
      setFormError("Lỗi kết nối server")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(dept: Department) {
    const msg = dept._count.users > 0
      ? `Phòng ban "${dept.name}" đang có ${dept._count.users} nhân viên. Hệ thống sẽ vô hiệu hóa thay vì xóa. Tiếp tục?`
      : `Xóa phòng ban "${dept.name}"? Hành động này không thể hoàn tác.`

    if (!confirm(msg)) return

    try {
      const res = await fetch(`/api/admin/departments/${dept.id}`, { method: "DELETE" })
      if (res.ok) fetchData()
    } catch (err) {
      console.error("delete department:", err)
    }
  }

  // ─── COMPUTED ───────────────────────────────────────────────────────────

  const activeCount = departments.filter((d) => d.isActive).length
  const totalUsers = departments.reduce((sum, d) => sum + d._count.users, 0)

  // ─── RENDER ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building className="h-6 w-6 text-primary" /> Quản lý Phòng ban
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {activeCount} phòng ban hoạt động · {totalUsers} nhân viên
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Thêm phòng ban
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên, mã phòng ban..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchData()}
            className="pl-9"
          />
        </div>
        <Select value={filterCompany} onValueChange={(v) => setFilterCompany(v)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Tất cả công ty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả công ty</SelectItem>
            {companies.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã</TableHead>
              <TableHead>Tên phòng ban</TableHead>
              <TableHead>Công ty</TableHead>
              <TableHead className="text-center">Nhân viên</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : departments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  Không có dữ liệu phòng ban
                </TableCell>
              </TableRow>
            ) : (
              departments.map((dept) => (
                <TableRow key={dept.id} className={!dept.isActive ? "opacity-50" : ""}>
                  <TableCell className="font-mono font-medium">{dept.code}</TableCell>
                  <TableCell className="font-medium">{dept.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {dept.company.code}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      {dept._count.users}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={dept.isActive ? "default" : "secondary"} className="text-xs">
                      {dept.isActive ? "Hoạt động" : "Vô hiệu"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(dept)}>
                          <Pencil className="mr-2 h-4 w-4" /> Chỉnh sửa
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(dept)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {dept._count.users > 0 ? "Vô hiệu hóa" : "Xóa"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Chỉnh sửa phòng ban" : "Thêm phòng ban mới"}</DialogTitle>
            <DialogDescription>
              {editing ? "Cập nhật thông tin phòng ban" : "Tạo phòng ban mới trong hệ thống"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {formError && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg">{formError}</div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dept-code">Mã phòng ban *</Label>
                <Input
                  id="dept-code"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  placeholder="KT"
                  disabled={!!editing}
                />
              </div>
              <div className="space-y-2">
                <Label>Công ty *</Label>
                <Select
                  value={formCompanyId}
                  onValueChange={setFormCompanyId}
                  disabled={!!editing}
                >
                  <SelectTrigger><SelectValue placeholder="Chọn công ty" /></SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dept-name">Tên phòng ban *</Label>
              <Input
                id="dept-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Phòng Kế toán"
              />
            </div>

            {editing && (
              <div className="flex items-center gap-3">
                <Switch id="dept-active" checked={formActive} onCheckedChange={setFormActive} />
                <Label htmlFor="dept-active">Phòng ban hoạt động</Label>
              </div>
            )}
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
