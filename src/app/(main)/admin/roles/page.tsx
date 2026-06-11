"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Search, Plus, MoreHorizontal, Pencil, Trash2, Shield, Loader2, Users, KeyRound, Lock,
} from "lucide-react"

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface RoleData {
  id: string
  name: string
  displayName: string
  description: string | null
  color: string | null
  level: number
  isSystem: boolean
  isActive: boolean
  permissionCount: number
  userCount: number
}

// ─── PAGE ────────────────────────────────────────────────────────────────────

export default function RolesPage() {
  const [roles, setRoles] = useState<RoleData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<RoleData | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formName, setFormName] = useState("")
  const [formDisplayName, setFormDisplayName] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formColor, setFormColor] = useState("#3b82f6")
  const [formLevel, setFormLevel] = useState(0)
  const [formError, setFormError] = useState("")

  // ─── FETCH DATA ──────────────────────────────────────────────────────────

  const fetchRoles = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: "100" })
      if (search) params.set("search", search)
      const res = await fetch(`/api/admin/roles?${params}`)
      const json = await res.json()
      if (res.ok) {
        setRoles(json.data)
      }
    } catch (err) {
      console.error("fetchRoles:", err)
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    fetchRoles()
  }, [fetchRoles])

  // ─── DIALOG HANDLERS ────────────────────────────────────────────────────

  function openCreate() {
    setEditingRole(null)
    setFormName("")
    setFormDisplayName("")
    setFormDescription("")
    setFormColor("#3b82f6")
    setFormLevel(0)
    setFormError("")
    setDialogOpen(true)
  }

  function openEdit(role: RoleData) {
    setEditingRole(role)
    setFormName(role.name)
    setFormDisplayName(role.displayName)
    setFormDescription(role.description || "")
    setFormColor(role.color || "#3b82f6")
    setFormLevel(role.level)
    setFormError("")
    setDialogOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    setFormError("")

    try {
      const body = {
        name: formName,
        displayName: formDisplayName,
        description: formDescription || null,
        color: formColor,
        level: formLevel,
      }

      if (editingRole) {
        const res = await fetch(`/api/admin/roles/${editingRole.id}`, {
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
        const res = await fetch("/api/admin/roles", {
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
      fetchRoles()
    } catch {
      setFormError("Lỗi kết nối server")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(role: RoleData) {
    if (!confirm(`Xóa vai trò "${role.displayName}"? Hành động này không thể hoàn tác.`)) return

    try {
      const res = await fetch(`/api/admin/roles/${role.id}`, { method: "DELETE" })
      if (res.ok) {
        fetchRoles()
      } else {
        const err = await res.json()
        alert(err.error || "Không thể xóa")
      }
    } catch (err) {
      console.error("delete role:", err)
    }
  }

  // ─── PRESET COLORS ──────────────────────────────────────────────────────

  const PRESET_COLORS = [
    "#ef4444", "#f59e0b", "#eab308", "#22c55e", "#10b981",
    "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#ec4899",
    "#64748b", "#0ea5e9",
  ]

  // ─── RENDER ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Quản lý Vai trò & Quyền
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Tạo vai trò, gán quyền truy cập cho từng vai trò
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Thêm vai trò
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Tìm theo tên vai trò..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchRoles()}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vai trò</TableHead>
              <TableHead>Mô tả</TableHead>
              <TableHead className="text-center">Cấp độ</TableHead>
              <TableHead className="text-center">Quyền</TableHead>
              <TableHead className="text-center">Người dùng</TableHead>
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
            ) : roles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  Không tìm thấy vai trò nào
                </TableCell>
              </TableRow>
            ) : (
              roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-offset-2 ring-offset-background"
                        style={{ backgroundColor: role.color || "#64748b", boxShadow: `0 0 8px ${role.color || "#64748b"}40` }}
                      />
                      <div>
                        <div className="font-medium flex items-center gap-1.5">
                          {role.displayName}
                          {role.isSystem && (
                            <Lock className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">{role.name}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {role.description || "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-xs">{role.level}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Link href={`/admin/roles/${role.id}/permissions`}>
                      <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-primary/10 transition-colors gap-1">
                        <KeyRound className="h-3 w-3" />
                        {role.permissionCount}
                      </Badge>
                    </Link>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Users className="h-3 w-3" />
                      {role.userCount}
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
                        <DropdownMenuItem onClick={() => openEdit(role)}>
                          <Pencil className="mr-2 h-4 w-4" /> Chỉnh sửa
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/roles/${role.id}/permissions`}>
                            <KeyRound className="mr-2 h-4 w-4" /> Quản lý quyền
                          </Link>
                        </DropdownMenuItem>
                        {!role.isSystem && (
                          <DropdownMenuItem
                            onClick={() => handleDelete(role)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Xóa vai trò
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRole ? "Chỉnh sửa vai trò" : "Thêm vai trò mới"}</DialogTitle>
            <DialogDescription>
              {editingRole ? "Cập nhật thông tin vai trò" : "Tạo vai trò mới trong hệ thống"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {formError && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg">{formError}</div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="form-name">Tên hệ thống (mã) *</Label>
                <Input
                  id="form-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="VD: CustomRole1"
                  disabled={editingRole?.isSystem && editingRole?.name === "Admin"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="form-display">Tên hiển thị *</Label>
                <Input
                  id="form-display"
                  value={formDisplayName}
                  onChange={(e) => setFormDisplayName(e.target.value)}
                  placeholder="VD: Quản lý dự án"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="form-desc">Mô tả</Label>
              <Input
                id="form-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Mô tả vai trò..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Màu sắc</Label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormColor(c)}
                      className={`w-6 h-6 rounded-full transition-all ${formColor === c ? "ring-2 ring-offset-2 ring-primary scale-110" : "hover:scale-110"}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="form-level">Cấp độ (priority)</Label>
                <Input
                  id="form-level"
                  type="number"
                  min={0}
                  max={999}
                  value={formLevel}
                  onChange={(e) => setFormLevel(parseInt(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">Số cao hơn = quyền ưu tiên cao hơn</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingRole ? "Cập nhật" : "Tạo mới"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
