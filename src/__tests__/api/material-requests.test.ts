import { NextRequest } from "next/server"
import { GET, POST } from "@/app/api/material-requests/route"
import { prismaMock, setMockSession, createMockRequest, setupApiTest } from "../helpers/setup"

setupApiTest()

describe("Material Request API", () => {
  describe("GET /api/material-requests", () => {
    it("returns 403 if unauthorized", async () => {
      // Role not allowed
      setMockSession({ role: "Accountant" })
      const req = createMockRequest("/api/material-requests") as NextRequest
      const res = await GET(req)
      expect(res.status).toBe(403)
    })

    it("fetches list for authorized roles", async () => {
      setMockSession({ role: "Warehouse", companyId: "c1" })
      prismaMock.materialRequest.findMany.mockResolvedValue([])
      prismaMock.materialRequest.count.mockResolvedValue(0)

      const req = createMockRequest("/api/material-requests") as NextRequest
      const res = await GET(req)
      expect(res.status).toBe(200)
    })
  })

  describe("POST /api/material-requests", () => {
    it("creates successfully", async () => {
      setMockSession({ role: "DeptHead", companyId: "c1" })
      prismaMock.company.findUnique.mockResolvedValue({ code: "HO" })
      prismaMock.materialRequest.findMany.mockResolvedValue([])
      prismaMock.$transaction.mockResolvedValue({ id: "mr1" })

      const req = createMockRequest("/api/material-requests", {
        method: "POST",
        body: {
          purpose: "Test",
          items: [{ itemName: "Pen", unit: "box", requestedQty: 10 }],
        },
      }) as NextRequest

      const res = await POST(req)
      expect(res.status).toBe(201)
    })
  })
})
