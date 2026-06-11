"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Workflow, Plus, Trash2, Save, Loader2, GripVertical, ArrowDown,
  PlayCircle, CheckCircle, Search, Cog, Flag, ChevronDown,
} from "lucide-react"

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface RoleOption {
  id: string
  name: string
  displayName: string
  color: string | null
}

interface WorkflowStepData {
  id?: string
  stepOrder: number
  name: string
  type: string
  actorRoleId: string
  icon: string | null
  description: string | null
  conditionType: string
  conditionParam: string | null
  conditionOp: string | null
  conditionValue: string | null
}

interface WorkflowConfigData {
  id: string
  entityType: string
  name: string
  description: string | null
  companyId: string
  isActive: boolean
  version: number
  company: { id: string; name: string; code: string }
  steps: (WorkflowStepData & { actorRole: RoleOption })[]
}

interface CompanyOption {
  id: string
  name: string
  code: string
}

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const ENTITY_TYPES = [
  { value: "paymentRequest",  label: "ĐN Thanh toán" },
  { value: "advanceRequest",  label: "ĐN Tạm ứng" },
  { value: "procurementPlan", label: "KH Mua sắm" },
  { value: "materialRequest", label: "ĐN Vật tư" },
  { value: "purchaseRequest", label: "ĐN Mua hàng" },
  { value: "settlement",      label: "Quyết toán" },
]

const STEP_TYPES = [
  { value: "start",   label: "Khởi tạo",   icon: "📥", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  { value: "approve", label: "Phê duyệt",  icon: "✍️", color: "bg-green-500/10 text-green-400 border-green-500/20" },
  { value: "check",   label: "Kiểm tra",   icon: "🔎", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  { value: "process", label: "Xử lý",      icon: "📦", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  { value: "end",     label: "Kết thúc",   icon: "🏁", color: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
]

const STEP_TYPE_ICONS: Record<string, typeof PlayCircle> = {
  start: PlayCircle,
  approve: CheckCircle,
  check: Search,
  process: Cog,
  end: Flag,
}

const CONDITION_PARAMS = [
  { value: "amount",    label: "Số tiền" },
  { value: "inventory", label: "Tồn kho" },
  { value: "files",     label: "Số file đính kèm" },
]

const CONDITION_OPS = [
  { value: ">=", label: ">=" },
  { value: ">",  label: ">" },
  { value: "<=", label: "<=" },
  { value: "<",  label: "<" },
  { value: "==", label: "=" },
  { value: "!=", label: "≠" },
]

// ─── PAGE ────────────────────────────────────────────────────────────────────

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowConfigData[]>([])
  const [roles, setRoles] = useState<RoleOption[]>([])
  const [companies, setCompanies] = useState<CompanyOption[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [filterCompany, setFilterCompany] = useState<string>("all")
  const [filterEntity, setFilterEntity] = useState<string>("all")

  // Editor state
  const [editing, setEditing] = useState<WorkflowConfigData | null>(null)
  const [editSteps, setEditSteps] = useState<WorkflowStepData[]>([])
  const [editName, setEditName] = useState("")
  const [editDesc, setEditDesc] = useState("")
  const [saving, setSaving] = useState(false)

  // Step editor dialog
  const [stepDialogOpen, setStepDialogOpen] = useState(false)
  const [editingStepIndex, setEditingStepIndex] = useState(-1)
  const [stepForm, setStepForm] = useState<WorkflowStepData>({
    stepOrder: 1, name: "", type: "approve", actorRoleId: "",
    icon: null, description: null, conditionType: "always",
    conditionParam: null, conditionOp: null, conditionValue: null,
  })

  // ─── FETCH ──────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterCompany !== "all") params.set("companyId", filterCompany)
      if (filterEntity !== "all") params.set("entityType", filterEntity)

      const [wfRes, roleRes, compRes] = await Promise.all([
        fetch(`/api/admin/workflows?${params}`),
        fetch("/api/admin/roles?limit=100"),
        fetch("/api/admin/companies?limit=100"),
      ])

      const [wfJson, roleJson, compJson] = await Promise.all([
        wfRes.json(), roleRes.json(), compRes.json(),
      ])

      if (wfRes.ok) setWorkflows(wfJson.data)
      if (roleRes.ok) setRoles(roleJson.data)
      if (compRes.ok) setCompanies(compJson.data)
    } catch (err) {
      console.error("fetchData:", err)
    } finally {
      setLoading(false)
    }
  }, [filterCompany, filterEntity])

  useEffect(() => { fetchData() }, [fetchData])

  // ─── WORKFLOW EDITOR ────────────────────────────────────────────────────

  function openEditor(wf: WorkflowConfigData) {
    setEditing(wf)
    setEditName(wf.name)
    setEditDesc(wf.description || "")
    setEditSteps(wf.steps.map(s => ({
      id: s.id,
      stepOrder: s.stepOrder,
      name: s.name,
      type: s.type,
      actorRoleId: s.actorRoleId,
      icon: s.icon,
      description: s.description,
      conditionType: s.conditionType,
      conditionParam: s.conditionParam,
      conditionOp: s.conditionOp,
      conditionValue: s.conditionValue,
    })))
  }

  function closeEditor() {
    setEditing(null)
    setEditSteps([])
  }

  // ─── STEP MANAGEMENT ───────────────────────────────────────────────────

  function openStepDialog(index: number) {
    if (index >= 0) {
      setEditingStepIndex(index)
      setStepForm({ ...editSteps[index] })
    } else {
      setEditingStepIndex(-1)
      setStepForm({
        stepOrder: editSteps.length + 1,
        name: "",
        type: "approve",
        actorRoleId: roles[0]?.id || "",
        icon: "✍️",
        description: null,
        conditionType: "always",
        conditionParam: null,
        conditionOp: null,
        conditionValue: null,
      })
    }
    setStepDialogOpen(true)
  }

  function saveStep() {
    if (editingStepIndex >= 0) {
      setEditSteps(prev => prev.map((s, i) => i === editingStepIndex ? { ...stepForm } : s))
    } else {
      setEditSteps(prev => [...prev, { ...stepForm, stepOrder: prev.length + 1 }])
    }
    setStepDialogOpen(false)
  }

  function removeStep(index: number) {
    setEditSteps(prev => {
      const updated = prev.filter((_, i) => i !== index)
      return updated.map((s, i) => ({ ...s, stepOrder: i + 1 }))
    })
  }

  function moveStep(index: number, dir: -1 | 1) {
    setEditSteps(prev => {
      const arr = [...prev]
      const newIndex = index + dir
      if (newIndex < 0 || newIndex >= arr.length) return arr;
      [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]]
      return arr.map((s, i) => ({ ...s, stepOrder: i + 1 }))
    })
  }

  // ─── SAVE WORKFLOW ──────────────────────────────────────────────────────

  async function handleSave() {
    if (!editing) return
    setSaving(true)

    try {
      const body = {
        name: editName,
        description: editDesc || null,
        steps: editSteps.map((s, i) => ({
          stepOrder: i + 1,
          name: s.name,
          type: s.type,
          actorRoleId: s.actorRoleId,
          icon: s.icon,
          description: s.description,
          conditionType: s.conditionType,
          conditionParam: s.conditionParam,
          conditionOp: s.conditionOp,
          conditionValue: s.conditionValue,
        })),
      }

      const res = await fetch(`/api/admin/workflows/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        closeEditor()
        fetchData()
      } else {
        const err = await res.json()
        alert(err.error || "Lỗi lưu luồng")
      }
    } catch {
      alert("Lỗi kết nối server")
    } finally {
      setSaving(false)
    }
  }

  // ─── RENDER ──────────────────────────────────────────────────────────────

  const getRoleName = (roleId: string) => roles.find(r => r.id === roleId)?.displayName || roleId

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Workflow className="h-6 w-6 text-primary" />
            Cấu hình Luồng Nghiệp vụ
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Thiết kế luồng phê duyệt động cho từng loại đề xuất, từng công ty
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={filterCompany} onValueChange={(v) => { setFilterCompany(v) }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Tất cả công ty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả công ty</SelectItem>
            {companies.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterEntity} onValueChange={(v) => { setFilterEntity(v) }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Tất cả loại ĐX" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả loại ĐX</SelectItem>
            {ENTITY_TYPES.map(et => (
              <SelectItem key={et.value} value={et.value}>{et.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Workflow list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : editing ? (
        /* ─── WORKFLOW EDITOR ─────────────────────────────────────────── */
        <div className="space-y-6">
          {/* Editor header */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={closeEditor}>← Quay lại</Button>
                <Badge variant="outline" className="text-xs">
                  {ENTITY_TYPES.find(e => e.value === editing.entityType)?.label || editing.entityType}
                </Badge>
                <Badge variant="outline" className="text-xs">{editing.company.code}</Badge>
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              <Save className="h-4 w-4" /> Lưu luồng
            </Button>
          </div>

          {/* Workflow meta */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tên luồng</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Mô tả</Label>
              <Input value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Mô tả luồng..." />
            </div>
          </div>

          {/* Steps visual flow */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Các bước trong luồng ({editSteps.length})</h3>
              <Button size="sm" variant="outline" onClick={() => openStepDialog(-1)} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Thêm bước
              </Button>
            </div>

            <div className="relative py-4">
              {editSteps.map((step, index) => {
                const stepType = STEP_TYPES.find(t => t.value === step.type)
                const StepIcon = STEP_TYPE_ICONS[step.type] || Cog

                return (
                  <div key={index}>
                    {/* Connector arrow */}
                    {index > 0 && (
                      <div className="flex justify-center py-1">
                        <ArrowDown className="h-5 w-5 text-muted-foreground/40" />
                      </div>
                    )}

                    {/* Step card */}
                    <div
                      className={`rounded-xl border-2 p-4 cursor-pointer transition-all hover:shadow-md ${stepType?.color || "border-border"}`}
                      onClick={() => openStepDialog(index)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center gap-1 pt-0.5">
                          <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                          <span className="text-lg">{step.icon || stepType?.icon || "📋"}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className={`text-[10px] ${stepType?.color}`}>
                              <StepIcon className="h-3 w-3 mr-1" />
                              {stepType?.label || step.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">Bước {step.stepOrder}</span>
                          </div>
                          <p className="font-medium text-sm">{step.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Thực hiện: {getRoleName(step.actorRoleId)}
                          </p>
                          {step.conditionType === "condition" && (
                            <Badge variant="secondary" className="mt-1.5 text-[10px] gap-1">
                              ⚡ Khi {step.conditionParam} {step.conditionOp} {step.conditionValue}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7"
                            onClick={(e) => { e.stopPropagation(); moveStep(index, -1) }}
                            disabled={index === 0}
                          >↑</Button>
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7"
                            onClick={(e) => { e.stopPropagation(); moveStep(index, 1) }}
                            disabled={index === editSteps.length - 1}
                          >↓</Button>
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7 text-red-500"
                            onClick={(e) => { e.stopPropagation(); removeStep(index) }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              {editSteps.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Workflow className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Chưa có bước nào. Nhấn &quot;Thêm bước&quot; để bắt đầu.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ─── WORKFLOW LIST ───────────────────────────────────────────── */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workflows.map(wf => (
            <div
              key={wf.id}
              className="rounded-xl border bg-card p-5 cursor-pointer hover:shadow-md transition-all hover:border-primary/30"
              onClick={() => openEditor(wf)}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <Badge variant="outline" className="text-[10px] mb-2">
                    {ENTITY_TYPES.find(e => e.value === wf.entityType)?.label || wf.entityType}
                  </Badge>
                  <h3 className="font-semibold text-sm">{wf.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{wf.company.code} — {wf.company.name}</p>
                </div>
                <Badge variant={wf.isActive ? "default" : "secondary"} className="text-[10px]">
                  {wf.isActive ? "Hoạt động" : "Tạm dừng"}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {wf.steps.slice(0, 5).map((step, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <span className="text-xs">{step.icon || "📋"}</span>
                    {i < Math.min(wf.steps.length - 1, 4) && (
                      <ChevronDown className="h-3 w-3 text-muted-foreground/40 rotate-[-90deg]" />
                    )}
                  </div>
                ))}
                {wf.steps.length > 5 && (
                  <span className="text-[10px] text-muted-foreground">+{wf.steps.length - 5}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">{wf.steps.length} bước · v{wf.version}</p>
            </div>
          ))}

          {workflows.length === 0 && (
            <div className="col-span-full text-center py-20 text-muted-foreground">
              <Workflow className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Chưa có luồng nghiệp vụ nào.</p>
            </div>
          )}
        </div>
      )}

      {/* Step editor dialog */}
      <Dialog open={stepDialogOpen} onOpenChange={setStepDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingStepIndex >= 0 ? "Chỉnh sửa bước" : "Thêm bước mới"}</DialogTitle>
            <DialogDescription>Cấu hình chi tiết bước trong luồng phê duyệt</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tên bước *</Label>
                <Input
                  value={stepForm.name}
                  onChange={e => setStepForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="VD: Trưởng BP phê duyệt"
                />
              </div>
              <div className="space-y-2">
                <Label>Loại bước *</Label>
                <Select value={stepForm.type} onValueChange={v => setStepForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STEP_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.icon} {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vai trò thực hiện *</Label>
                <Select value={stepForm.actorRoleId} onValueChange={v => setStepForm(p => ({ ...p, actorRoleId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Chọn vai trò" /></SelectTrigger>
                  <SelectContent>
                    {roles.map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.displayName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Icon</Label>
                <Input
                  value={stepForm.icon || ""}
                  onChange={e => setStepForm(p => ({ ...p, icon: e.target.value || null }))}
                  placeholder="VD: ✍️ 🔎 📦"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Mô tả</Label>
              <Textarea
                value={stepForm.description || ""}
                onChange={e => setStepForm(p => ({ ...p, description: e.target.value || null }))}
                placeholder="Mô tả chi tiết bước này..."
                rows={2}
              />
            </div>

            {/* Condition */}
            <div className="space-y-3 rounded-lg border p-3 bg-muted/5">
              <Label className="flex items-center gap-2">
                ⚡ Điều kiện kích hoạt
              </Label>
              <Select
                value={stepForm.conditionType}
                onValueChange={v => setStepForm(p => ({ ...p, conditionType: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="always">Luôn thực hiện</SelectItem>
                  <SelectItem value="condition">Có điều kiện</SelectItem>
                </SelectContent>
              </Select>

              {stepForm.conditionType === "condition" && (
                <div className="grid grid-cols-3 gap-2">
                  <Select
                    value={stepForm.conditionParam || ""}
                    onValueChange={v => setStepForm(p => ({ ...p, conditionParam: v }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Tham số" /></SelectTrigger>
                    <SelectContent>
                      {CONDITION_PARAMS.map(cp => (
                        <SelectItem key={cp.value} value={cp.value}>{cp.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={stepForm.conditionOp || ""}
                    onValueChange={v => setStepForm(p => ({ ...p, conditionOp: v }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Phép so" /></SelectTrigger>
                    <SelectContent>
                      {CONDITION_OPS.map(op => (
                        <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={stepForm.conditionValue || ""}
                    onChange={e => setStepForm(p => ({ ...p, conditionValue: e.target.value }))}
                    placeholder="Giá trị"
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStepDialogOpen(false)}>Hủy</Button>
            <Button onClick={saveStep} disabled={!stepForm.name || !stepForm.actorRoleId}>
              {editingStepIndex >= 0 ? "Cập nhật" : "Thêm bước"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
