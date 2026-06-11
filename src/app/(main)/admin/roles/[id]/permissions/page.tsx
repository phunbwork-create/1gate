"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ArrowLeft, Save, Loader2, Shield, CheckCheck, XCircle,
} from "lucide-react"

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface Permission {
  id: string
  resource: string
  action: string
  displayName: string
  assigned: boolean
}

interface PermissionGroups {
  [groupName: string]: Permission[]
}

const ACTION_ORDER = ["create", "read", "update", "delete", "approve", "submit", "cancel", "full", "access"]

const ACTION_LABELS: Record<string, string> = {
  create: "Tạo",
  read: "Xem",
  update: "Sửa",
  delete: "Xóa",
  approve: "Duyệt",
  submit: "Trình",
  cancel: "Hủy",
  full: "Toàn quyền",
  access: "Truy cập",
}

// ─── PAGE ────────────────────────────────────────────────────────────────────

export default function RolePermissionsPage() {
  const params = useParams()
  const router = useRouter()
  const roleId = params.id as string

  const [roleName, setRoleName] = useState("")
  const [groups, setGroups] = useState<PermissionGroups>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  // ─── FETCH ──────────────────────────────────────────────────────────────

  const fetchPermissions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/roles/${roleId}/permissions`)
      const json = await res.json()
      if (res.ok) {
        setRoleName(json.roleName)
        setGroups(json.groups)
      }
    } catch (err) {
      console.error("fetchPermissions:", err)
    } finally {
      setLoading(false)
    }
  }, [roleId])

  useEffect(() => {
    fetchPermissions()
  }, [fetchPermissions])

  // ─── TOGGLE HANDLERS ────────────────────────────────────────────────────

  function togglePermission(groupName: string, permId: string) {
    setGroups(prev => {
      const updated = { ...prev }
      updated[groupName] = updated[groupName].map(p =>
        p.id === permId ? { ...p, assigned: !p.assigned } : p
      )
      return updated
    })
    setDirty(true)
  }

  function toggleGroup(groupName: string, assigned: boolean) {
    setGroups(prev => {
      const updated = { ...prev }
      updated[groupName] = updated[groupName].map(p => ({ ...p, assigned }))
      return updated
    })
    setDirty(true)
  }

  function toggleAll(assigned: boolean) {
    setGroups(prev => {
      const updated: PermissionGroups = {}
      for (const [group, perms] of Object.entries(prev)) {
        updated[group] = perms.map(p => ({ ...p, assigned }))
      }
      return updated
    })
    setDirty(true)
  }

  // ─── SAVE ───────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true)
    try {
      const permissionIds = Object.values(groups)
        .flat()
        .filter(p => p.assigned)
        .map(p => p.id)

      const res = await fetch(`/api/admin/roles/${roleId}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissionIds }),
      })

      if (res.ok) {
        setDirty(false)
      } else {
        const err = await res.json()
        alert(err.error || "Lỗi lưu quyền")
      }
    } catch {
      alert("Lỗi kết nối server")
    } finally {
      setSaving(false)
    }
  }

  // ─── STATS ──────────────────────────────────────────────────────────────

  const allPerms = Object.values(groups).flat()
  const assignedCount = allPerms.filter(p => p.assigned).length
  const totalCount = allPerms.length

  // ─── GROUP RESOURCES ────────────────────────────────────────────────────

  function getResourcesForGroup(perms: Permission[]) {
    const resources: Record<string, Permission[]> = {}
    for (const p of perms) {
      if (!resources[p.resource]) resources[p.resource] = []
      resources[p.resource].push(p)
    }
    return resources
  }

  // ─── RENDER ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/admin/roles")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Ma trận Quyền — {roleName}
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              {assignedCount}/{totalCount} quyền đã gán
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => toggleAll(true)} className="gap-1.5">
            <CheckCheck className="h-3.5 w-3.5" /> Chọn tất cả
          </Button>
          <Button variant="outline" size="sm" onClick={() => toggleAll(false)} className="gap-1.5">
            <XCircle className="h-3.5 w-3.5" /> Bỏ tất cả
          </Button>
          <Button onClick={handleSave} disabled={saving || !dirty} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            <Save className="h-4 w-4" />
            Lưu thay đổi
          </Button>
        </div>
      </div>

      {/* Permission matrix */}
      {Object.entries(groups).map(([groupName, perms]) => {
        const resources = getResourcesForGroup(perms)
        const groupAssigned = perms.filter(p => p.assigned).length
        const allGroupChecked = groupAssigned === perms.length

        return (
          <div key={groupName} className="rounded-xl border bg-card overflow-hidden">
            {/* Group header */}
            <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b">
              <div className="flex items-center gap-2.5">
                <Checkbox
                  checked={allGroupChecked}
                  onCheckedChange={(checked) => toggleGroup(groupName, !!checked)}
                />
                <h3 className="font-semibold text-sm">{groupName}</h3>
                <Badge variant="secondary" className="text-xs">
                  {groupAssigned}/{perms.length}
                </Badge>
              </div>
            </div>

            {/* Matrix table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/10">
                    <th className="text-left font-medium py-2 px-4 w-[200px]">Resource</th>
                    {ACTION_ORDER.map(action => {
                      // Only show columns that have at least one permission in this group
                      const hasAction = perms.some(p => p.action === action)
                      if (!hasAction) return null
                      return (
                        <th key={action} className="text-center font-medium py-2 px-3 min-w-[60px]">
                          {ACTION_LABELS[action] || action}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(resources).map(([resource, resPerms]) => (
                    <tr key={resource} className="border-b last:border-0 hover:bg-muted/5 transition-colors">
                      <td className="py-2.5 px-4 font-medium text-muted-foreground">
                        {resPerms[0]?.displayName?.split(" ").slice(1).join(" ") || resource}
                      </td>
                      {ACTION_ORDER.map(action => {
                        const hasAction = perms.some(p => p.action === action)
                        if (!hasAction) return null

                        const perm = resPerms.find(p => p.action === action)
                        if (!perm) {
                          return <td key={action} className="text-center py-2.5 px-3">
                            <span className="text-muted-foreground/20">—</span>
                          </td>
                        }

                        return (
                          <td key={action} className="text-center py-2.5 px-3">
                            <Checkbox
                              checked={perm.assigned}
                              onCheckedChange={() => togglePermission(groupName, perm.id)}
                            />
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}

      {/* Sticky save bar */}
      {dirty && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t px-6 py-3 flex items-center justify-between z-50">
          <p className="text-sm text-muted-foreground">
            Có thay đổi chưa lưu — {assignedCount} quyền đã chọn
          </p>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            <Save className="h-4 w-4" />
            Lưu thay đổi
          </Button>
        </div>
      )}
    </div>
  )
}
