import { parseSequenceFromCode, buildCode } from "@/lib/code-generator"

describe("code-generator", () => {
  describe("parseSequenceFromCode", () => {
    it("parses sequence from valid code", () => {
      expect(parseSequenceFromCode("KH-HO-2026-001")).toBe(1)
      expect(parseSequenceFromCode("KH-HO-2026-015")).toBe(15)
      expect(parseSequenceFromCode("CVT-CTTV1-2026-100")).toBe(100)
    })

    it("returns 0 for invalid code", () => {
      expect(parseSequenceFromCode("invalid")).toBe(0)
      expect(parseSequenceFromCode("")).toBe(0)
    })
  })

  describe("buildCode", () => {
    it("builds code with zero-padded sequence", () => {
      expect(buildCode("KH", "HO", 2026, 1)).toBe("KH-HO-2026-001")
      expect(buildCode("CVT", "CTTV1", 2026, 15)).toBe("CVT-CTTV1-2026-015")
      expect(buildCode("MH", "HO", 2026, 100)).toBe("MH-HO-2026-100")
    })
  })
})
