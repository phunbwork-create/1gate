import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireRole, success, badRequest, serverError } from "@/lib/api-helpers"
import ExcelJS from "exceljs"

// ─── POST /api/admin/materials/import ────────────────────────────────────────
export async function POST(req: NextRequest) {
  const result = await requireRole("Admin", "Purchasing")
  if (result.error) return result.error

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const companyId = formData.get("companyId") as string | null

    if (!file) return badRequest("Vui lòng chọn file Excel")
    if (!companyId) return badRequest("Vui lòng chọn công ty")

    // Validate file type
    const ext = file.name.toLowerCase()
    if (!ext.endsWith(".xlsx") && !ext.endsWith(".xls")) {
      return badRequest("Chỉ hỗ trợ file .xlsx hoặc .xls")
    }

    // Read Excel
    const arrayBuffer = await file.arrayBuffer()
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(arrayBuffer as any) // eslint-disable-line @typescript-eslint/no-explicit-any

    const worksheet = workbook.worksheets[0]
    if (!worksheet) return badRequest("File Excel không có sheet nào")

    // Expected columns: Mã VT | Tên vật tư | Đơn vị | Phân loại | Mô tả
    const rows: Array<{
      code: string
      name: string
      unit: string
      category?: string
      description?: string
    }> = []

    const errors: string[] = []

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return // Skip header

      const code = row.getCell(1).text?.trim()
      const name = row.getCell(2).text?.trim()
      const unit = row.getCell(3).text?.trim()
      const category = row.getCell(4).text?.trim() || undefined
      const description = row.getCell(5).text?.trim() || undefined

      if (!code || !name || !unit) {
        errors.push(`Dòng ${rowNumber}: Thiếu mã VT, tên hoặc đơn vị`)
        return
      }

      rows.push({ code, name, unit, category, description })
    })

    if (rows.length === 0) {
      return badRequest("File không có dữ liệu hợp lệ. " + errors.join("; "))
    }

    // Upsert all rows
    let created = 0
    let updated = 0

    for (const item of rows) {
      const existing = await prisma.materialItem.findUnique({
        where: { code_companyId: { code: item.code, companyId } },
      })

      if (existing) {
        await prisma.materialItem.update({
          where: { id: existing.id },
          data: { name: item.name, unit: item.unit, category: item.category, description: item.description },
        })
        updated++
      } else {
        await prisma.materialItem.create({
          data: { ...item, companyId },
        })
        created++
      }
    }

    return success({
      message: `Import thành công: ${created} mới, ${updated} cập nhật`,
      created,
      updated,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error("POST /api/admin/materials/import error:", error)
    return serverError("Lỗi import file: " + (error instanceof Error ? error.message : "Unknown"))
  }
}
