import { describe, expect, it } from "vitest"
import { detectEmergency, triageMaintenance } from "@/lib/triage"

describe("emergency triage", () => {
  it("treats a pouring ceiling as flooding", () => {
    expect(detectEmergency("My apartment is flooding, water is pouring from the ceiling.")).toBe("flooding")
  })

  it("does not treat a sink leak as flooding", () => {
    expect(detectEmergency("my kitchen sink is leaking")).toBeNull()
  })

  it("does not treat a procedure question as a page", () => {
    expect(detectEmergency("What should I do if there is a fire in the building?")).toBeNull()
  })

  it("does not treat a chirping detector as a fire", () => {
    expect(detectEmergency("The smoke detector is chirping.")).toBeNull()
  })

  it("marks an active sink leak urgent", () => {
    expect(triageMaintenance("my kitchen sink is leaking").priority).toBe("urgent")
  })

  it("marks a drip high and a chirp normal", () => {
    expect(triageMaintenance("The bathroom faucet is dripping.").priority).toBe("high")
    expect(triageMaintenance("The smoke detector is chirping.").priority).toBe("normal")
  })
})
