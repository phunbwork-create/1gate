import { z } from "zod"

// ─── PROCUREMENT PLAN → HỒ SƠ / HỢP ĐỒNG ──────────────────────────────────

const procurementPlanItemSchema = z.object({
  materialItemId: z.string().optional().nullable(),
  itemName: z.string().min(1, "Tên hàng hóa không được trống"),
  unit: z.string().min(1, "Đơn vị tính không được trống"),
  plannedQty: z.number().positive("Số lượng phải > 0"),
  estimatedPrice: z.number().nonnegative("Đơn giá phải >= 0").optional().nullable(),
  note: z.string().optional().nullable(),
})

export const createProcurementPlanSchema = z.object({
  title: z.string().min(2, "Tên hồ sơ phải có ít nhất 2 ký tự"),
  contractCode: z.string().min(1, "Mã hồ sơ / mã hợp đồng không được trống"),
  description: z.string().optional().nullable(),
  // Contract metadata (stored as JSON in description field)
  contractType: z.string().optional().nullable(),      // Loại: Mua vào / Bán ra / Nội bộ
  partnerName: z.string().optional().nullable(),       // Tên đối tác
  partnerTaxCode: z.string().optional().nullable(),    // MST đối tác
  partnerRepresentative: z.string().optional().nullable(), // Người đại diện
  signDate: z.string().optional().nullable(),          // Ngày ký
  effectiveDate: z.string().optional().nullable(),     // Ngày hiệu lực
  expiryDate: z.string().optional().nullable(),        // Ngày hết hạn
  contractValue: z.number().nonnegative().optional().nullable(), // Giá trị trước thuế
  vatRate: z.number().min(0).max(100).optional().nullable(),     // % VAT
  currency: z.string().optional().nullable(),          // VND/USD
  items: z.array(procurementPlanItemSchema).optional().default([]),
})

export const updateProcurementPlanSchema = z.object({
  title: z.string().min(2, "Tiêu đề phải có ít nhất 2 ký tự").optional(),
  description: z.string().optional().nullable(),
  contractType: z.string().optional().nullable(),
  partnerName: z.string().optional().nullable(),
  partnerTaxCode: z.string().optional().nullable(),
  partnerRepresentative: z.string().optional().nullable(),
  signDate: z.string().optional().nullable(),
  effectiveDate: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  contractValue: z.number().nonnegative().optional().nullable(),
  vatRate: z.number().min(0).max(100).optional().nullable(),
  currency: z.string().optional().nullable(),
  items: z.array(procurementPlanItemSchema).optional(),
})

// ─── MATERIAL REQUEST ────────────────────────────────────────────────────────

const materialRequestItemSchema = z.object({
  materialItemId: z.string().optional().nullable(),
  itemName: z.string().min(1, "Tên vật tư không được trống"),
  unit: z.string().min(1, "Đơn vị tính không được trống"),
  requestedQty: z.number().positive("Số lượng phải > 0"),
  note: z.string().optional().nullable(),
})

export const createMaterialRequestSchema = z.object({
  procurementPlanId: z.string().optional().nullable(),
  purpose: z.string().optional().nullable(),
  requiredDate: z.string().optional().nullable(), // ISO string
  items: z.array(materialRequestItemSchema).min(1, "Phải có ít nhất 1 vật tư"),
})

export const updateMaterialRequestSchema = z.object({
  purpose: z.string().optional().nullable(),
  requiredDate: z.string().optional().nullable(),
  items: z.array(materialRequestItemSchema).min(1, "Phải có ít nhất 1 vật tư").optional(),
})

// ─── PURCHASE REQUEST ────────────────────────────────────────────────────────

const purchaseRequestItemSchema = z.object({
  materialItemId: z.string().optional().nullable(),
  itemName: z.string().min(1, "Tên hàng hóa không được trống"),
  unit: z.string().min(1, "Đơn vị tính không được trống"),
  quantity: z.number().positive("Số lượng phải > 0"),
  unitPrice: z.number().nonnegative("Đơn giá phải >= 0").optional().nullable(),
  note: z.string().optional().nullable(),
})

export const createPurchaseRequestSchema = z.object({
  materialRequestId: z.string().min(1, "Vui lòng chọn Đề nghị cấp vật tư"),
  procurementPlanId: z.string().optional().nullable(),
  inventoryCheckId: z.string().optional().nullable(),
  vendorId: z.string().optional().nullable(),
  vendorName: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  items: z.array(purchaseRequestItemSchema).min(1, "Phải có ít nhất 1 hàng hóa"),
})

export const updatePurchaseRequestSchema = z.object({
  vendorId: z.string().optional().nullable(),
  vendorName: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  items: z.array(purchaseRequestItemSchema).min(1, "Phải có ít nhất 1 hàng hóa").optional(),
})

// ─── PAYMENT REQUEST (ĐNTT - F-05) ──────────────────────────────────────────

export const createPaymentRequestSchema = z.object({
  purchaseRequestId: z.string().min(1, "Vui lòng chọn Đề nghị mua hàng"),
  vendorId: z.string().optional().nullable(),
  vendorName: z.string().min(1, "Tên nhà cung cấp không được trống"),
  bankAccount: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  amount: z.number().positive("Số tiền phải > 0"),
  description: z.string().min(1, "Nội dung thanh toán không được trống"),
  invoiceScenario: z.enum(["HasInvoice", "InvoiceLater", "NoInvoice"]),
  invoiceNumber: z.string().optional().nullable(),
  invoiceDate: z.string().optional().nullable(), // ISO string
})

export const updatePaymentRequestSchema = z.object({
  vendorId: z.string().optional().nullable(),
  vendorName: z.string().min(1, "Tên nhà cung cấp không được trống").optional(),
  bankAccount: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  amount: z.number().positive("Số tiền phải > 0").optional(),
  description: z.string().min(1, "Nội dung không được trống").optional(),
  invoiceScenario: z.enum(["HasInvoice", "InvoiceLater", "NoInvoice"]).optional(),
  invoiceNumber: z.string().optional().nullable(),
  invoiceDate: z.string().optional().nullable(),
})

// ─── ADVANCE REQUEST (ĐNTU - F-06) ───────────────────────────────────────────

export const createAdvanceRequestSchema = z.object({
  purchaseRequestId: z.string().min(1, "Vui lòng chọn Đề nghị mua hàng"),
  vendorId: z.string().optional().nullable(),
  vendorName: z.string().optional().nullable(),
  amount: z.number().positive("Số tiền phải > 0"),
  purpose: z.string().min(1, "Mục đích tạm ứng không được trống"),
  expectedReturnDate: z.string().optional().nullable(), // ISO string
})

export const updateAdvanceRequestSchema = z.object({
  vendorId: z.string().optional().nullable(),
  vendorName: z.string().optional().nullable(),
  amount: z.number().positive("Số tiền phải > 0").optional(),
  purpose: z.string().min(1, "Mục đích không được trống").optional(),
  expectedReturnDate: z.string().optional().nullable(),
})

// ─── APPROVAL ────────────────────────────────────────────────────────────────

export const approvalActionSchema = z.object({
  action: z.enum(["approve", "reject", "return"]),
  comment: z.string().optional().nullable(),
}).refine(
  (data) => {
    if (data.action === "reject" || data.action === "return") {
      return data.comment && data.comment.trim().length > 0
    }
    return true
  },
  { message: "Vui lòng nhập lý do khi từ chối hoặc trả lại", path: ["comment"] }
)

// ─── CANCEL ──────────────────────────────────────────────────────────────────

export const cancelSchema = z.object({
  reason: z.string().min(1, "Lý do hủy không được trống"),
})

// ─── PAYMENT PLAN (F-07) ───────────────────────────────────────────────────

export const createPaymentPlanSchema = z.object({
  plannedDate: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  items: z.array(z.object({
    id: z.string(), // ID of Advance or Payment request
    type: z.enum(["Advance", "Payment"]),
    amount: z.number().positive(),
  })).min(1, "Phải chọn ít nhất 1 khoản thanh toán/tạm ứng"),
})

// ─── SETTLEMENT (F-08) ───────────────────────────────────────────────────────

export const createSettlementSchema = z.object({
  sourceType: z.enum(["AdvanceRequest", "PaymentRequest", "PurchaseRequest", "MaterialRequest"]).optional(),
  advanceRequestId: z.string().optional().nullable(),
  paymentRequestId: z.string().optional().nullable(),
  purchaseRequestId: z.string().optional().nullable(),
  materialRequestId: z.string().optional().nullable(),
  advanceRequestIds: z.array(z.string()).optional(), // Giữ lại ID lẻ để tương thích, bổ sung array cho gộp phiếu
  title: z.string().optional().nullable(),
  actualAmount: z.number().positive("Số tiền thực tế phải > 0").optional().nullable(),
  invoiceNumber: z.string().optional().nullable(),
  invoiceDate: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
})

export const updateSettlementSchema = z.object({
  title: z.string().optional().nullable(),
  actualAmount: z.number().positive("Số tiền thực tế phải > 0").optional().nullable(),
  invoiceNumber: z.string().optional().nullable(),
  invoiceDate: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
})
