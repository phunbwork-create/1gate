"use client"

import { useState, useEffect, useCallback } from "react"
import { Role } from "@prisma/client"
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Search, Plus, MoreHorizontal, Pencil, UserX, Loader2, Users, ChevronLeft, ChevronRight,
} from "lucide-react"

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface User {
  id: string
  email: string
  name: string
  role: Role
  isActive: boolean
  company: { id: string; name: string; code: string }
  department: { id: string; name: string } | null
  createdAt: string
}

interface Company {
  id: string
  name: string
  code: string
}

interface Department {
  id: string
  name: string
  company: { id: string; name: string; code: string }
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const ROLES = Object.values(Role)

const ROLE_LABELS: Record<Role, string> = {
  Admin: "Quản trị viên",
  Staff: "Nhân viên",
  DeptHead: "Trưởng phòng",
  Warehouse: "Thủ kho",
  Purchasing: "Mua hàng",
  Accountant: "Kế toán",
  ChiefAccountant: "Kế toán trưởng",
  Director: "Giám đốc",
}

const ROLE_COLORS: Record<Role, string> = {
  Admin: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  Staff: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400",
  DeptHead: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  Warehouse: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  Purchasing: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  Accountant: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  ChiefAccountant: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  Director: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
}

// ─── PAGE ────────────────────────────────────────────────────────────────────

export default function UsersPage() {

  const [users, setUsers] = useState<User[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterRole, setFilterRole] = useState<string>("all")
  const [filterCompany, setFilterCompany] = useState<string>("all")

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formName, setFormName] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [formPassword, setFormPassword] = useState("")
  const [formRole, setFormRole] = useState<Role>(Role.Staff)
  const [formCompanyId, setFormCompanyId] = useState("")
  const [formDepartmentId, setFormDepartmentId] = useState("")
  const [formActive, setFormActive] = useState(true)
  const [formError, setFormError] = useState("")

  // ─── FETCH DATA ──────────────────────────────────────────────────────────

  const fetchUsers = useCallback(async (page = 1, overrides?: { role?: string; company?: string }) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" })
      if (search) params.set("search", search)
      const r = overrides?.role ?? filterRole
      const c = overrides?.company ?? filterCompany
      if (r !== "all") params.set("role", r)
      if (c !== "all") params.set("companyId", c)

      const res = await fetch(`/api/admin/users?${params}`)
      const json = await res.json()
      if (res.ok) {
        setUsers(json.data)
        setPagination(json.pagination)
      }
    } catch (err) {
      console.error("fetchUsers:", err)
    } finally {
      setLoading(false)
    }
  }, [search, filterRole, filterCompany])

  const fetchCompanies = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/companies?limit=100")
      const json = await res.json()
      if (res.ok) setCompanies(json.data)
    } catch (err) {
      console.error("fetchCompanies:", err)
    }
  }, [])

  const fetchDepartments = useCallback(async (companyId?: string) => {
    try {
      const params = companyId ? `?companyId=${companyId}` : ""
      const res = await fetch(`/api/admin/departments${params}`)
      const json = await res.json()
      if (res.ok) setDepartments(json.data)
    } catch (err) {
      console.error("fetchDepartments:", err)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
    fetchCompanies()
    fetchDepartments()
  }, [fetchUsers, fetchCompanies, fetchDepartments])

  // ─── DIALOG HANDLERS ────────────────────────────────────────────────────

  function openCreate() {
    setEditingUser(null)
    setFormName("")
    setFormEmail("")
    setFormPassword("")
    setFormRole(Role.Staff)
    setFormCompanyId(companies[0]?.id || "")
    setFormDepartmentId("")
    setFormActive(true)
    setFormError("")
    setDialogOpen(true)
  }

  function openEdit(user: User) {
    setEditingUser(user)
    setFormName(user.name)
    setFormEmail(user.email)
    setFormPassword("")
    setFormRole(user.role)
    setFormCompanyId(user.company.id)
    setFormDepartmentId(user.department?.id || "")
    setFormActive(user.isActive)
    setFormError("")
    fetchDepartments(user.company.id)
    setDialogOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    setFormError("")

    try {
      const body: Record<string, unknown> = {
        name: formName,
        email: formEmail,
        role: formRole,
        companyId: formCompanyId,
        departmentId: (formDepartmentId && formDepartmentId !== "none") ? formDepartmentId : null,
      }

      if (editingUser) {
        // Update
        if (formPassword) body.password = formPassword
        body.isActive = formActive

        const res = await fetch(`/api/admin/users/${editingUser.id}`, {
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
        // Create
        if (!formPassword) {
          setFormError("Vui lòng nhập mật khẩu")
          return
        }
        body.password = formPassword

        const res = await fetch("/api/admin/users", {
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
      fetchUsers(pagination.page)
    } catch {
      setFormError("Lỗi kết nối server")
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate(user: User) {
    if (!confirm(`Vô hiệu hóa tài khoản "${user.name}"?`)) return

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" })
      if (res.ok) fetchUsers(pagination.page)
    } catch (err) {
      console.error("deactivate:", err)
    }
  }

  // ─── FILTERED DEPARTMENTS ────────────────────────────────────────────────

  const filteredDepts = departments.filter((d) => d.company.id === formCompanyId)

  // ─── RENDER ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Quản lý Người dùng
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Tổng: {pagination.total} người dùng
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Thêm người dùng
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchUsers(1)}
            className="pl-9"
          />
        </div>
        <Select value={filterRole} onValueChange={(v) => { setFilterRole(v); fetchUsers(1, { role: v }) }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Tất cả role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả role</SelectItem>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCompany} onValueChange={(v) => { setFilterCompany(v); fetchUsers(1, { company: v }) }}>
          <SelectTrigger className="w-[180px]">
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
              <TableHead>Tên</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="hidden md:table-cell">Công ty</TableHead>
              <TableHead className="hidden lg:table-cell">Phòng ban</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  Không tìm thấy người dùng nào
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id} className={!user.isActive ? "opacity-50" : ""}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={`text-xs ${ROLE_COLORS[user.role]}`}>
                      {ROLE_LABELS[user.role]}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{user.company.code}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {user.department?.name || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? "default" : "outline"} className="text-xs">
                      {user.isActive ? "Hoạt động" : "Vô hiệu"}
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
                        <DropdownMenuItem onClick={() => openEdit(user)}>
                          <Pencil className="mr-2 h-4 w-4" /> Chỉnh sửa
                        </DropdownMenuItem>
                        {user.isActive && (
                          <DropdownMenuItem
                            onClick={() => handleDeactivate(user)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <UserX className="mr-2 h-4 w-4" /> Vô hiệu hóa
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Trang {pagination.page} / {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => fetchUsers(pagination.page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchUsers(pagination.page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Chỉnh sửa người dùng" : "Thêm người dùng mới"}</DialogTitle>
            <DialogDescription>
              {editingUser ? "Cập nhật thông tin tài khoản" : "Tạo tài khoản mới cho hệ thống"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {formError && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg">{formError}</div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="form-name">Họ tên *</Label>
                <Input id="form-name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Nguyễn Văn A" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="form-email">Email *</Label>
                <Input id="form-email" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="email@1gate.vn" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="form-password">
                  Mật khẩu {editingUser ? "(để trống = giữ nguyên)" : "*"}
                </Label>
                <Input id="form-password" type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder="••••••" />
              </div>
              <div className="space-y-2">
                <Label>Vai trò *</Label>
                <Select value={formRole} onValueChange={(v) => setFormRole(v as Role)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Công ty *</Label>
                <Select
                  value={formCompanyId}
                  onValueChange={(v) => { setFormCompanyId(v); setFormDepartmentId(""); fetchDepartments(v) }}
                >
                  <SelectTrigger><SelectValue placeholder="Chọn công ty" /></SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Phòng ban</Label>
                <Select value={formDepartmentId} onValueChange={setFormDepartmentId}>
                  <SelectTrigger><SelectValue placeholder="Chọn phòng ban" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Không chọn —</SelectItem>
                    {filteredDepts.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {editingUser && (
              <div className="flex items-center gap-3">
                <Switch id="form-active" checked={formActive} onCheckedChange={setFormActive} />
                <Label htmlFor="form-active">Tài khoản hoạt động</Label>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingUser ? "Cập nhật" : "Tạo mới"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
