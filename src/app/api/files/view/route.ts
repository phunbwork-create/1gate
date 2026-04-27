import { NextRequest, NextResponse } from "next/server"
import { readFile, stat } from "fs/promises"
import { join } from "path"

// ─── MIME MAP ────────────────────────────────────────────────────────────────

const MIME_MAP: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}

function getMimeType(fileName: string): string {
  const ext = fileName.slice(fileName.lastIndexOf(".")).toLowerCase()
  return MIME_MAP[ext] || "application/octet-stream"
}

// ─── Shared file-serving logic ───────────────────────────────────────────────

async function serveFile(fileUrl: string, asOctetStream = false) {
  // Security: only allow files from /uploads/ directory
  if (!fileUrl.startsWith("/uploads/")) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 })
  }

  // Prevent path traversal
  const normalizedPath = fileUrl.replace(/\.\./g, "")
  const filePath = join(process.cwd(), "public", normalizedPath)

  try {
    const fileStat = await stat(filePath)
    if (!fileStat.isFile()) {
      return NextResponse.json({ error: "Not a file" }, { status: 404 })
    }

    const buffer = await readFile(filePath)
    const fileName = normalizedPath.split("/").pop() || "file"
    const mimeType = asOctetStream ? "application/octet-stream" : getMimeType(fileName)

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 })
  }
}

// ─── GET /api/files/view?url=/uploads/... ────────────────────────────────────
// Serve file with Content-Disposition: inline so browser renders instead of downloading

export async function GET(req: NextRequest) {
  const fileUrl = req.nextUrl.searchParams.get("url")
  if (!fileUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 })
  }
  return serveFile(fileUrl)
}

// ─── POST /api/files/view ────────────────────────────────────────────────────
// Same as GET but uses POST to bypass download managers (IDM, etc.)
// that intercept GET requests matching .pdf/.doc/.xls URLs.
// Returns application/octet-stream so IDM won't sniff the MIME type either.

export async function POST(req: NextRequest) {
  const body = await req.json()
  const fileUrl = body?.url
  if (!fileUrl || typeof fileUrl !== "string") {
    return NextResponse.json({ error: "Missing url in body" }, { status: 400 })
  }
  // Return as octet-stream so download managers cannot sniff the type
  return serveFile(fileUrl, true)
}
