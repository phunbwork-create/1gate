"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  FileText, FileImage, FileSpreadsheet, File, Upload, Trash2, Loader2, ExternalLink,
} from "lucide-react"

// ─── DOCUMENT TYPE CONFIG ────────────────────────────────────────────────────

export const DOCUMENT_TYPE_META: Record<string, { label: string; color: string }> = {
  Invoice:        { label: "Hóa đơn",              color: "text-blue-600 bg-blue-50 border-blue-200" },
  Quotation:      { label: "Báo giá",               color: "text-amber-600 bg-amber-50 border-amber-200" },
  Contract:       { label: "Hợp đồng",              color: "text-purple-600 bg-purple-50 border-purple-200" },
  AcceptanceCert: { label: "Biên bản nghiệm thu",   color: "text-green-600 bg-green-50 border-green-200" },
  InventoryCheck: { label: "Phiếu tồn kho",         color: "text-orange-600 bg-orange-50 border-orange-200" },
  Other:          { label: "Khác",                  color: "text-slate-600 bg-slate-50 border-slate-200" },
}

export type DocumentTypeValue = keyof typeof DOCUMENT_TYPE_META

export interface DocumentTypeOption {
  value: DocumentTypeValue
  label: string
  required?: boolean   // hiển thị "(bắt buộc)" bên cạnh label
}

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface AttachmentItem {
  id: string
  fileName: string
  fileUrl: string
  fileSize: number | null
  mimeType: string | null
  documentType: string
  uploadedAt: string
}

export type AttachmentEntityType =
  | "paymentRequest"
  | "advanceRequest"
  | "paymentPlan"
  | "settlement"
  | "procurementPlan"
  | "materialRequest"
  | "purchaseRequest"

interface AttachmentPanelProps {
  entityType: AttachmentEntityType
  entityId: string
  attachments: AttachmentItem[]
  /** Which document types are allowed for this entity. Defines the dropdown options. */
  allowedTypes: DocumentTypeOption[]
  /** If false, hides upload + delete controls (read-only mode). */
  canUpload?: boolean
  onChanged: () => void
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function formatBytes(bytes: number | null): string {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileIcon({ mimeType }: { mimeType: string | null }) {
  if (!mimeType) return <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
  if (mimeType === "application/pdf")
    return <FileText className="h-4 w-4 text-red-500 flex-shrink-0" />
  if (mimeType.startsWith("image/"))
    return <FileImage className="h-4 w-4 text-blue-500 flex-shrink-0" />
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
    return <FileSpreadsheet className="h-4 w-4 text-green-600 flex-shrink-0" />
  return <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
}

function DocTypeBadge({ type }: { type: string }) {
  const meta = DOCUMENT_TYPE_META[type] || DOCUMENT_TYPE_META["Other"]
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${meta.color}`}>
      {meta.label}
    </span>
  )
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export function AttachmentPanel({
  entityType, entityId, attachments, allowedTypes, canUpload = false, onChanged,
}: AttachmentPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<DocumentTypeValue>(
    allowedTypes[0]?.value || "Other"
  )
  const [error, setError] = useState("")

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError("")
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("entityType", entityType)
      formData.append("entityId", entityId)
      formData.append("documentType", selectedType)

      const res = await fetch("/api/attachments", { method: "POST", body: formData })
      const json = await res.json()

      if (res.ok) {
        onChanged()
      } else {
        setError(json.error || "Upload thất bại")
      }
    } catch {
      setError("Lỗi kết nối, vui lòng thử lại")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Xóa tệp đính kèm này?")) return

    setDeletingId(id)
    try {
      const res = await fetch(`/api/attachments/${id}`, { method: "DELETE" })
      if (res.ok) {
        onChanged()
      } else {
        const json = await res.json()
        setError(json.error || "Xóa thất bại")
      }
    } catch {
      setError("Lỗi kết nối, vui lòng thử lại")
    } finally {
      setDeletingId(null)
    }
  }

  // Group by documentType for display
  const grouped = allowedTypes.map((opt) => ({
    ...opt,
    files: attachments.filter((a) => a.documentType === opt.value),
  }))

  // Files with unrecognized type still shown under "Khác"
  const ungroupedFiles = attachments.filter(
    (a) => !allowedTypes.find((o) => o.value === a.documentType)
  )

  const hasAnyFile = attachments.length > 0

  return (
    <div className="space-y-4">
      {/* Grouped file list */}
      {!hasAnyFile ? (
        <p className="text-sm text-muted-foreground italic py-2">Chưa có tệp đính kèm</p>
      ) : (
        <div className="space-y-3">
          {grouped.map((group) => (
            group.files.length > 0 && (
              <div key={group.value}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  {group.label}
                  {group.required && (
                    <span className="text-destructive ml-1">(bắt buộc)</span>
                  )}
                </p>
                <ul className="space-y-1.5">
                  {group.files.map((att) => (
                    <li key={att.id}
                      className="flex items-center gap-3 p-2.5 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                      <FileIcon mimeType={att.mimeType} />
                      <div className="flex-1 min-w-0">
                        <a
                          href={att.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium truncate flex items-center gap-1 hover:underline"
                        >
                          {att.fileName}
                          <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        </a>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatBytes(att.fileSize)}
                          {att.fileSize ? " · " : ""}
                          {new Date(att.uploadedAt).toLocaleDateString("vi-VN")}
                        </p>
                      </div>
                      {canUpload && (
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                          onClick={() => handleDelete(att.id)}
                          disabled={deletingId === att.id}
                        >
                          {deletingId === att.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Trash2 className="h-3.5 w-3.5" />}
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )
          ))}

          {/* Ungrouped files (shouldn't happen normally) */}
          {ungroupedFiles.map((att) => (
            <li key={att.id}
              className="flex items-center gap-3 p-2.5 rounded-lg border bg-muted/20">
              <FileIcon mimeType={att.mimeType} />
              <div className="flex-1 min-w-0">
                <a href={att.fileUrl} target="_blank" rel="noopener noreferrer"
                  className="text-sm font-medium truncate flex items-center gap-1 hover:underline">
                  {att.fileName}
                  <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                </a>
                <div className="flex items-center gap-2 mt-0.5">
                  <DocTypeBadge type={att.documentType} />
                  <span className="text-xs text-muted-foreground">{formatBytes(att.fileSize)}</span>
                </div>
              </div>
            </li>
          ))}
        </div>
      )}

      {/* Error */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Upload controls */}
      {canUpload && (
        <div className="space-y-2 pt-1">
          <div className="flex gap-2">
            <Select
              value={selectedType}
              onValueChange={(v) => setSelectedType(v as DocumentTypeValue)}
            >
              <SelectTrigger className="flex-1 h-9 text-sm">
                <SelectValue placeholder="Loại chứng từ" />
              </SelectTrigger>
              <SelectContent>
                {allowedTypes.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                    {opt.required && <span className="text-destructive ml-1">*</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 h-9 px-3 flex-shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Upload className="h-4 w-4" />}
              {uploading ? "Đang tải..." : "Chọn file"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            PDF, ảnh, Word, Excel · Tối đa 10MB/file
          </p>
        </div>
      )}
    </div>
  )
}
