import { calculateCurrentStepIndex } from "@/lib/workflow"

describe("Workflow Logic - calculateCurrentStepIndex", () => {
  it("should return 0 when there are no steps", () => {
    expect(calculateCurrentStepIndex([])).toBe(0)
  })

  it("should increment index for consecutive approvals", () => {
    const steps = [
      { action: "approve" },
      { action: "approve" }
    ]
    expect(calculateCurrentStepIndex(steps)).toBe(2)
  })

  it("should ignore actions that are null (pending state)", () => {
    const steps = [
      { action: "approve" },
      { action: null }
    ]
    expect(calculateCurrentStepIndex(steps)).toBe(1)
  })

  it("should ignore comments or other custom actions not affecting index increment", () => {
    const steps = [
      { action: "approve" },
      { action: "comment" },
      { action: "approve" }
    ]
    // The previous loop only increments for 'approve', 
    // comment is ignored in index increment natively.
    expect(calculateCurrentStepIndex(steps)).toBe(2)
  })

  describe("Handling Cycles (Returns and Rejects)", () => {
    it("should reset to 0 effectively if the last action was return", () => {
      const steps = [
        { action: "approve" },
        { action: "return" }
      ]
      expect(calculateCurrentStepIndex(steps)).toBe(0)
    })

    it("should count approvals that happen AFTER a return cycle", () => {
      const steps = [
        { action: "approve" }, // 1st cycle, approved by DeptHead
        { action: "return" },  // 1st cycle, returned by Director
        // Document gets re-submitted by draft owner...
        { action: "approve" }  // 2nd cycle, approved by DeptHead again
      ]
      // It should only count approvals after the last return/reject.
      expect(calculateCurrentStepIndex(steps)).toBe(1)
    })

    it("should handle multiple return cycles", () => {
      const steps = [
        { action: "approve" },
        { action: "return" },
        { action: "approve" },
        { action: "approve" },
        { action: "reject" },
        { action: "approve" },
        { action: "approve" },
      ]
      // Should cut at the last 'reject' and count everything after -> 2 approves.
      expect(calculateCurrentStepIndex(steps)).toBe(2)
    })
  })
})
