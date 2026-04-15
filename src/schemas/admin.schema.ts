import { z } from "zod"
import { Role, CompanyType } from "@prisma/client"

// ─── USER SCHEMAS ────────────────────────────────────────────────────────────

export const createUserSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  name: z.string().min(2, "Tên phải có ít nhất 2 ký tự"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
  role: z.nativeEnum(Role, { error: "Role không hợp lệ" }),
  companyId: z.string().min(1, "Vui lòng chọn công ty"),
  departmentId: z.string().optional().nullable(),
  telegramChatId: z.string().optional().nullable(),
})

export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.nativeEnum(Role).optional(),
  companyId: z.string().optional(),
  departmentId: z.string().optional().nullable(),
  telegramChatId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
})

// ─── COMPANY SCHEMAS ─────────────────────────────────────────────────────────

export const createCompanySchema = z.object({
  name: z.string().min(2, "Tên công ty phải có ít nhất 2 ký tự"),
  code: z.string().min(2, "Mã công ty phải có ít nhất 2 ký tự").max(10),
  type: z.nativeEnum(CompanyType),
  taxCode: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
})

export const updateCompanySchema = createCompanySchema.partial().extend({
  isActive: z.boolean().optional(),
})

// ─── VENDOR SCHEMAS ──────────────────────────────────────────────────────────

export const createVendorSchema = z.object({
  name: z.string().min(2, "Tên NCC phải có ít nhất 2 ký tự"),
  taxCode: z.string().optional().nullable(),
  bankAccount: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  companyId: z.string().min(1, "Vui lòng chọn công ty"),
})

export const updateVendorSchema = createVendorSchema.partial().extend({
  isActive: z.boolean().optional(),
})

// ─── MATERIAL ITEM SCHEMAS ───────────────────────────────────────────────────

export const createMaterialItemSchema = z.object({
  code: z.string().min(1, "Mã vật tư không được trống"),
  name: z.string().min(2, "Tên vật tư phải có ít nhất 2 ký tự"),
  unit: z.string().min(1, "Đơn vị tính không được trống"),
  category: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  companyId: z.string().min(1, "Vui lòng chọn công ty"),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type CreateCompanyInput = z.infer<typeof createCompanySchema>
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>
export type CreateVendorInput = z.infer<typeof createVendorSchema>
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>
export type CreateMaterialItemInput = z.infer<typeof createMaterialItemSchema>
