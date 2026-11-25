import { describe, expect, it } from "vitest"
import { businessDaysBetween, weekdayOf } from "@/lib/clock"
import { extractIdentity, parseDate, parseTimeRange } from "@/lib/parse"

const now = new Date("2026-11-25T16:00:00.000Z")

describe("identity and scheduling parsers", () => {
  it("reads unit and last name", () => {
    expect(extractIdentity("Hi, I'm in unit 4B, last name Chen")).toEqual({ unit: "4B", lastName: "Chen" })
    expect(extractIdentity("This is Priya Shah, apartment 308").unit).toBe("308")
    expect(extractIdentity("This is Priya Shah, apartment 308").lastName).toBe("Shah")
  })

  it("reads a 2-hour evening slot and tomorrow", () => {
    expect(parseTimeRange("Book the rooftop lounge tomorrow from 6pm to 8pm.")).toEqual({
      start: "18:00",
      end: "20:00",
    })
    expect(parseDate("tomorrow from 6pm", now)).toBe("2026-11-26")
    expect(parseDate("December 15", now)).toBe("2026-12-15")
  })

  it("counts business days and knows December 15 2026 is a Tuesday", () => {
    expect(weekdayOf("2026-12-15")).toBe(2)
    expect(businessDaysBetween("2026-11-25", "2026-12-15")).toBeGreaterThanOrEqual(2)
  })
})
