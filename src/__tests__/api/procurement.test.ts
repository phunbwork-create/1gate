import { NextRequest } from "next/server"
import { GET, POST } from "@/app/api/procurement/route"
import { prismaMock, setMockSession, createMockRequest, setupApiTest } from "../helpers/setup"

setupApiTest()

describe("Procurement API", () => {
  describe("GET /api/procurement", () => {
    it("returns 401 if unauthorized", async () => {
      const req = createMockRequest("/api/procurement") as NextRequest
      const res = await GET(req)
      expect(res.status).toBe(403) // requireRole returns 403 or 401
    })

    it("returns plans for company if user is Staff", async () => {
      setMockSession({ role: "Staff", companyId: "c1" })
      prismaMock.procurementPlan.findMany.mockResolvedValue([])
      prismaMock.procurementPlan.count.mockResolvedValue(0)

      const req = createMockRequest("/api/procurement") as NextRequest
      const res = await GET(req)
      expect(res.status).toBe(200)

      expect(prismaMock.procurementPlan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ companyId: "c1" }),
        })
      )
    })
  })

  describe("POST /api/procurement", () => {
    it("creates procurement plan successfully", async () => {
      setMockSession({ role: "Staff", companyId: "c1", id: "u1" })
      prismaMock.company.findUnique.mockResolvedValue({ code: "HO" })
      prismaMock.procurementPlan.findMany.mockResolvedValue([]) // code generator
      prismaMock.$transaction.mockResolvedValue({ id: "p1" })

      const req = createMockRequest("/api/procurement", {
        method: "POST",
        body: {
          title: "Test Plan",
          items: [{ itemName: "Pen", unit: "box", plannedQty: 10 }],
        },
      }) as NextRequest

      const res = await POST(req)
      expect(res.status).toBe(201)
      expect(prismaMock.company.findUnique).toHaveBeenCalled()
    })

    it("rejects invalid payload", async () => {
      setMockSession({ role: "Staff", companyId: "c1" })
      const req = createMockRequest("/api/procurement", {
        method: "POST",
        body: { title: "Test Plan", items: [] }, // missing items
      }) as NextRequest

      const res = await POST(req)
      expect(res.status).toBe(400)
    })
  })
})
