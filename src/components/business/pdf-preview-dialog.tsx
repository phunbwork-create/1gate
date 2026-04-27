"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ExternalLink, Loader2, AlertCircle, RefreshCw } from "lucide-react"

interface PdfPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fileUrl: string
  fileName: string
}

export function PdfPreviewDialog({
  open, onOpenChange, fileUrl, fileName,
}: PdfPreviewDialogProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Use POST request to fetch PDF data as blob.
  // Why POST? IDM (Internet Download Manager) only intercepts GET requests.
  // Why octet-stream? Even if IDM somehow sees the response, it won't recognize it as PDF.
  // The blob is then given the correct application/pdf MIME on the client side.
  const loadPdf = useCallback(async () => {
    if (!fileUrl) return

    setLoading(true)
    setError(null)
    setBlobUrl(null)

    try {
      const res = await fetch("/api/files/view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: fileUrl }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `HTTP ${res.status}`)
      }

      const arrayBuffer = await res.arrayBuffer()
      const pdfBlob = new Blob([arrayBuffer], { type: "application/pdf" })
      const url = URL.createObjectURL(pdfBlob)
      setBlobUrl(url)
    } catch (err) {
      console.error("Error loading PDF:", err)
      setError(err instanceof Error ? err.message : "Không tải được tài liệu")
    } finally {
      setLoading(false)
    }
  }, [fileUrl])

  // Load PDF when dialog opens
  useEffect(() => {
    if (open && fileUrl) {
      loadPdf()
    }
    // Cleanup blob URL when dialog closes
    return () => {
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      setError(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fileUrl])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between px-4 py-3 border-b shrink-0 bg-background z-10 m-0">
          <DialogTitle className="text-sm font-medium truncate pr-4 leading-none">
            {fileName}
          </DialogTitle>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost" size="sm" className="gap-1.5 text-xs h-8 mr-6"
              onClick={() => {
                // Open the blob URL if available, otherwise direct download
                if (blobUrl) {
                  window.open(blobUrl, "_blank")
                } else {
                  window.open(fileUrl, "_blank")
                }
              }}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Mở tab mới
            </Button>
          </div>
        </DialogHeader>

        {/* Content area */}
        <div className="flex-1 w-full h-full min-h-0 bg-muted/30 relative">
          {/* Loading spinner */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Đang tải tài liệu...</p>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4 p-8 text-center max-w-sm">
                <AlertCircle className="h-10 w-10 text-destructive" />
                <div>
                  <p className="font-medium">Không tải được tài liệu PDF</p>
                  <p className="text-sm text-muted-foreground mt-1">{error}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={loadPdf}>
                    <RefreshCw className="h-3.5 w-3.5" /> Tải lại
                  </Button>
                  <a href={fileUrl} download>
                    <Button variant="secondary" size="sm" className="gap-1.5">
                      Tải file xuống
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* PDF viewer — uses iframe with blob: URL
              blob: URLs are local to the browser and invisible to download managers */}
          {blobUrl && !loading && !error && (
            <iframe
              src={blobUrl}
              title={fileName}
              className="absolute inset-0 w-full h-full border-0"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
