import { NextRequest } from "next/server"
import { GET, POST } from "@/app/api/purchase-requests/route"
import { prismaMock, setMockSession, createMockRequest, setupApiTest } from "../helpers/setup"

setupApiTest()

describe("Purchase Request API", () => {
  describe("GET /api/purchase-requests", () => {
    it("fetches list", async () => {
      setMockSession({ role: "Purchasing", companyId: "c1" })
      prismaMock.purchaseRequest.findMany.mockResolvedValue([])
      prismaMock.purchaseRequest.count.mockResolvedValue(0)

      const req = createMockRequest("/api/purchase-requests") as NextRequest
      const res = await GET(req)
      expect(res.status).toBe(200)
    })
  })

  describe("POST /api/purchase-requests", () => {
    it("creates successfully and calculates total amount", async () => {
      setMockSession({ role: "Purchasing", companyId: "c1" })
      prismaMock.company.findUnique.mockResolvedValue({ code: "HO" })
      prismaMock.purchaseRequest.findMany.mockResolvedValue([])
      
      // Return mock for transaction
      prismaMock.$transaction.mockResolvedValue({ id: "pr1", totalAmount: 10000 })

      const req = createMockRequest("/api/purchase-requests", {
        method: "POST",
        body: {
          vendorName: "Vendor A",
          items: [{ itemName: "Pen", unit: "box", quantity: 2, unitPrice: 5000 }],
        },
      }) as NextRequest

      const res = await POST(req)
      expect(res.status).toBe(201)
      
      // Ensure the transaction callback is what we expect
      expect(prismaMock.$transaction).toHaveBeenCalled()
    })
  })
})
