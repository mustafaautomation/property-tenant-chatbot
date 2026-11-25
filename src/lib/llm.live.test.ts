import fs from "fs"
import os from "os"
import path from "path"
import { describe, expect, it } from "vitest"
import { handleTurn } from "@/lib/policy"

const live = Boolean(process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY) && process.env.KEYSTONE_POLICY !== "rules"

describe.skipIf(!live)("live model smoke", () => {
  it("answers from the notes and completes a ledger lookup", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "keystone-live-"))
    const notes = await handleTurn({
      message: "What are quiet hours on Sunday?",
      dataDir: dir,
      now: new Date("2026-11-25T16:00:00.000Z"),
    })
    expect(notes.source).toBe("model")
    expect(notes.provider).toMatch(/groq|gemini/)
    expect(notes.model).toBeTruthy()
    expect(notes.citations.length).toBeGreaterThan(0)
    expect(notes.reply).toMatch(/9:00/)
    expect(notes.reply).not.toMatch(/stopped early/i)
    expect(notes.toolCalls.map((call) => call.name)).toContain("search_kb")

    const ledger = await handleTurn({
      conversationId: notes.conversationId,
      message: "I'm in unit 4B, last name Chen. What's my rent balance?",
      dataDir: dir,
      now: new Date("2026-11-25T16:00:00.000Z"),
    })
    expect(ledger.source).toBe("model")
    const names = ledger.toolCalls.map((call) => call.name)
    expect(names).toEqual(expect.arrayContaining(["verify_tenant", "get_rent_balance"]))
    expect(ledger.reply.length).toBeGreaterThan(20)
    expect(ledger.reply).not.toMatch(/stopped early/i)
  }, 90_000)
})
