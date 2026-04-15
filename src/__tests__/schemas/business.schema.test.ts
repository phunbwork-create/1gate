import {
  createProcurementPlanSchema,
  updateProcurementPlanSchema,
  createMaterialRequestSchema,
  createPurchaseRequestSchema,
  approvalActionSchema,
} from "@/schemas/business.schema"

describe("business.schema", () => {
  // ─── PROCUREMENT PLAN ───────────────────────────────────────────────
  describe("createProcurementPlanSchema", () => {
    it("accepts valid data", () => {
      const result = createProcurementPlanSchema.safeParse({
        title: "KH mua VPP Q1/2026",
        description: "Mua văn phòng phẩm quý 1",
        items: [
          { itemName: "Bút bi", unit: "Hộp", plannedQty: 10, estimatedPrice: 50000 },
        ],
      })
      expect(result.success).toBe(true)
    })

    it("rejects empty title", () => {
      const result = createProcurementPlanSchema.safeParse({
        title: "",
        items: [{ itemName: "Bút bi", unit: "Hộp", plannedQty: 10 }],
      })
      expect(result.success).toBe(false)
    })

    it("rejects zero items", () => {
      const result = createProcurementPlanSchema.safeParse({
        title: "KH test",
        items: [],
      })
      expect(result.success).toBe(false)
    })

    it("rejects negative quantity", () => {
      const result = createProcurementPlanSchema.safeParse({
        title: "KH test",
        items: [{ itemName: "Bút bi", unit: "Hộp", plannedQty: -1 }],
      })
      expect(result.success).toBe(false)
    })
  })

  describe("updateProcurementPlanSchema", () => {
    it("accepts partial update", () => {
      const result = updateProcurementPlanSchema.safeParse({
        title: "Updated title",
      })
      expect(result.success).toBe(true)
    })

    it("accepts items-only update", () => {
      const result = updateProcurementPlanSchema.safeParse({
        items: [{ itemName: "Giấy A4", unit: "Ram", plannedQty: 5 }],
      })
      expect(result.success).toBe(true)
    })
  })

  // ─── MATERIAL REQUEST ──────────────────────────────────────────────
  describe("createMaterialRequestSchema", () => {
    it("accepts valid data", () => {
      const result = createMaterialRequestSchema.safeParse({
        purpose: "Cấp VPP cho phòng kế toán",
        items: [
          { itemName: "Bút bi", unit: "Cái", requestedQty: 20 },
        ],
      })
      expect(result.success).toBe(true)
    })

    it("accepts with procurement plan link", () => {
      const result = createMaterialRequestSchema.safeParse({
        procurementPlanId: "plan-id-123",
        items: [
          { itemName: "Giấy A4", unit: "Ram", requestedQty: 5 },
        ],
      })
      expect(result.success).toBe(true)
    })

    it("rejects no items", () => {
      const result = createMaterialRequestSchema.safeParse({
        purpose: "Test",
        items: [],
      })
      expect(result.success).toBe(false)
    })
  })

  // ─── PURCHASE REQUEST ──────────────────────────────────────────────
  describe("createPurchaseRequestSchema", () => {
    it("accepts valid data with prices", () => {
      const result = createPurchaseRequestSchema.safeParse({
        vendorName: "Công ty ABC",
        items: [
          { itemName: "Máy in", unit: "Cái", quantity: 2, unitPrice: 5000000 },
        ],
      })
      expect(result.success).toBe(true)
    })

    it("accepts without prices", () => {
      const result = createPurchaseRequestSchema.safeParse({
        items: [
          { itemName: "Máy in", unit: "Cái", quantity: 2 },
        ],
      })
      expect(result.success).toBe(true)
    })

    it("rejects zero quantity", () => {
      const result = createPurchaseRequestSchema.safeParse({
        items: [
          { itemName: "Máy in", unit: "Cái", quantity: 0 },
        ],
      })
      expect(result.success).toBe(false)
    })
  })

  // ─── APPROVAL ──────────────────────────────────────────────────────
  describe("approvalActionSchema", () => {
    it("accepts approve action", () => {
      expect(approvalActionSchema.safeParse({ action: "approve" }).success).toBe(true)
    })

    it("accepts reject with comment", () => {
      const result = approvalActionSchema.safeParse({
        action: "reject",
        comment: "Số lượng chưa hợp lý",
      })
      expect(result.success).toBe(true)
    })

    it("accepts return action", () => {
      expect(approvalActionSchema.safeParse({ action: "return" }).success).toBe(true)
    })

    it("rejects invalid action", () => {
      const result = approvalActionSchema.safeParse({ action: "cancel" })
      expect(result.success).toBe(false)
    })
  })
})
