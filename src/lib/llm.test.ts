import { afterEach, describe, expect, it } from "vitest"
import { DEFAULT_GEMINI_MODEL, DEFAULT_GROQ_MODEL, postChat, resolveModels } from "@/lib/llm"

describe("model ids", () => {
  const previousGroq = process.env.GROQ_MODEL
  const previousGemini = process.env.GEMINI_MODEL

  afterEach(() => {
    if (previousGroq === undefined) delete process.env.GROQ_MODEL
    else process.env.GROQ_MODEL = previousGroq
    if (previousGemini === undefined) delete process.env.GEMINI_MODEL
    else process.env.GEMINI_MODEL = previousGemini
  })

  it("defaults to the current Groq and Gemini models", () => {
    delete process.env.GROQ_MODEL
    delete process.env.GEMINI_MODEL
    expect(resolveModels()).toEqual({ groq: DEFAULT_GROQ_MODEL, gemini: DEFAULT_GEMINI_MODEL })
    expect(DEFAULT_GROQ_MODEL).toBe("qwen/qwen3.8-27b")
    expect(DEFAULT_GEMINI_MODEL).toBe("gemini-3.5-flash")
  })

  it("reads model ids from the environment", () => {
    process.env.GROQ_MODEL = "groq-from-env"
    process.env.GEMINI_MODEL = "gemini-from-env"
    expect(resolveModels()).toEqual({ groq: "groq-from-env", gemini: "gemini-from-env" })
  })
})

describe("postChat", () => {
  it("retries a 429 once and then returns the assistant message", async () => {
    let calls = 0
    const fetchImpl = (async () => {
      calls += 1
      if (calls === 1) return new Response("busy", { status: 429 })
      return Response.json({ choices: [{ message: { role: "assistant", content: "Quiet hours run until 9:00 a.m. on Sunday." } }] })
    }) as typeof fetch
    const message = await postChat(
      { name: "groq", base: "https://example.test/v1", key: "not-a-real-key", model: DEFAULT_GROQ_MODEL },
      { messages: [{ role: "user", content: "quiet hours" }] },
      fetchImpl,
      0,
    )
    expect(calls).toBe(2)
    expect(message.content).toMatch(/9:00 a\.m\./)
  })

  it("throws after a second 429 so the other provider can take the turn", async () => {
    const fetchImpl = (async () => new Response("busy", { status: 429 })) as typeof fetch
    await expect(
      postChat(
        { name: "groq", base: "https://example.test/v1", key: "not-a-real-key", model: DEFAULT_GROQ_MODEL },
        { messages: [] },
        fetchImpl,
        0,
      ),
    ).rejects.toThrow(/groq failed \(429\)/)
  })
})
