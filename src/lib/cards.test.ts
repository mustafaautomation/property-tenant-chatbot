import { describe, expect, it } from "vitest"
import { deriveCards, phaseLabel } from "@/lib/cards"
import type { ToolTrace } from "@/lib/types"

const ticket: ToolTrace = {
  name: "create_maintenance_ticket",
  input: { description: "sink" },
  output: {
    ok: true,
    id: "KR-1042",
    category: "plumbing",
    priority: "urgent",
    status: "open",
    etaLabel: "Today, within 4 hours while a technician is on duty.",
    entryPermission: "Call first, and enter if there is no answer.",
    unit: "4B",
    buildingName: "The Alden",
  },
}

describe("deriveCards", () => {
  it("turns a maintenance ticket into a confirmation and a timeline", () => {
    const cards = deriveCards({ userText: "my kitchen sink is leaking", toolCalls: [ticket], handoff: null })
    expect(cards.map((card) => card.type)).toEqual(["confirm", "timeline"])
    expect(cards[0]).toMatchObject({ type: "confirm", id: "KR-1042", title: "Ticket opened" })
    expect(cards[1]).toMatchObject({ type: "timeline", status: "open" })
  })

  it("rejects a ticket payload that is missing the id", () => {
    const broken: ToolTrace = { name: "create_maintenance_ticket", input: {}, output: { ok: true, status: "open" } }
    const cards = deriveCards({ userText: "I need a maintenance ticket", toolCalls: [broken], handoff: null })
    expect(cards.some((card) => card.type === "confirm")).toBe(false)
    expect(cards.some((card) => card.type === "form")).toBe(true)
  })

  it("builds a rent card only from a valid ledger payload", () => {
    const cards = deriveCards({
      userText: "what's my rent balance?",
      toolCalls: [
        {
          name: "get_rent_balance",
          input: {},
          output: {
            ok: true,
            unit: "12",
            buildingName: "Birch Court",
            monthlyRent: "$1,850",
            rentDue: "$1,850",
            lateFee: "$75",
            totalDue: "$1,925",
          },
        },
      ],
      handoff: null,
    })
    expect(cards).toEqual([
      expect.objectContaining({ type: "rent", rent: expect.objectContaining({ totalDue: "$1,925" }) }),
    ])
  })

  it("uses the emergency card for a gas page", () => {
    const cards = deriveCards({
      userText: "I smell gas",
      toolCalls: [],
      handoff: { id: "HO-501", kind: "gas" },
    })
    expect(cards[0]).toEqual({ type: "emergency", id: "HO-501", kind: "gas" })
  })

  it("names the phase from the tool that ran", () => {
    expect(phaseLabel([ticket])).toBe("Opening a maintenance ticket…")
    expect(phaseLabel([])).toBe("Checking the resident notes…")
  })
})
