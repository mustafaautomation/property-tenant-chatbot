import { NextResponse } from "next/server"
import { deriveCards, phaseLabel } from "@/lib/cards"
import { maskPii } from "@/lib/guardrails"
import { conversationPaused, holdForSpecialist, markPaused } from "@/lib/pause"
import { handleTurn } from "@/lib/policy"
import { defaultDataDir, loadStore } from "@/lib/store"
import { openSlots } from "@/lib/slots"
import type { Photo, TurnResult } from "@/lib/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const hits = new Map<string, number[]>()

function limited(ip: string): boolean {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((stamp) => now - stamp < 10 * 60 * 1000)
  if (recent.length >= 40) return true
  recent.push(now)
  hits.set(ip, recent)
  return false
}

function wordGroups(reply: string): string[] {
  const parts = reply.split(/(\s+)/).filter((part) => part.length > 0)
  if (parts.length === 0) return [reply]
  const words = parts.filter((part) => part.trim()).length
  const size = words > 80 ? 8 : words > 40 ? 5 : 3
  const groups: string[] = []
  let bucket: string[] = []
  let count = 0
  for (const part of parts) {
    bucket.push(part)
    if (part.trim()) count += 1
    if (count >= size) {
      groups.push(bucket.join(""))
      bucket = []
      count = 0
    }
  }
  if (bucket.length) groups.push(bucket.join(""))
  return groups
}

function attachSlots(message: string, result: TurnResult) {
  const booking = result.toolCalls.find((call) => call.name === "book_amenity" && call.output.ok === true)
  if (booking) return null
  if (!/\b(book|reserve)\b/i.test(message)) return null
  const store = loadStore(defaultDataDir())
  return openSlots(new Date(), store.bookings, message)
}

function streamResult(result: TurnResult, slots: ReturnType<typeof attachSlots>) {
  const encoder = new TextEncoder()
  const hints = deriveCards({
    userText: "",
    toolCalls: result.toolCalls,
    handoff: result.handoff,
    citations: result.citations,
  }).map((card) => card.type)
  let cancelled = false
  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) => {
        if (cancelled) return
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
      }
      send({ type: "phase", label: phaseLabel(result.toolCalls), hints })
      const groups = wordGroups(result.reply)
      const gap = Math.min(24, Math.max(8, Math.floor(640 / Math.max(groups.length, 1))))
      for (const text of groups) {
        if (cancelled) return
        send({ type: "token", text })
        if (groups.length > 1) await new Promise((resolve) => setTimeout(resolve, gap))
      }
      if (cancelled) return
      send({
        type: "done",
        conversationId: result.conversationId,
        reply: result.reply,
        toolCalls: result.toolCalls,
        citations: result.citations,
        handoff: result.handoff,
        tenant: result.tenant,
        ticket: result.ticket,
        source: result.source ?? "rules",
        slots,
      })
      controller.close()
    },
    cancel() {
      cancelled = true
    },
  })
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  })
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local"
  if (limited(ip)) {
    return NextResponse.json({ error: "Too many messages. Wait a few minutes and try again." }, { status: 429 })
  }
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Send the message as JSON." }, { status: 400 })
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Send the message as JSON." }, { status: 400 })
  }
  const record = body as { message?: unknown; conversationId?: unknown; image?: unknown }
  const message = typeof record.message === "string" ? record.message.trim() : ""
  if (!message) return NextResponse.json({ error: "Write a message first." }, { status: 400 })
  if (message.length > 2000) {
    return NextResponse.json({ error: "That message is too long. Keep it under 2,000 characters." }, { status: 400 })
  }
  let image: Photo | null = null
  if (record.image && typeof record.image === "object") {
    const raw = record.image as { name?: unknown; mime?: unknown; dataUrl?: unknown }
    const dataUrl = typeof raw.dataUrl === "string" ? raw.dataUrl : ""
    if (!dataUrl.startsWith("data:image/")) {
      return NextResponse.json({ error: "Attach a JPEG, PNG, or WebP photo." }, { status: 400 })
    }
    if (dataUrl.length > 7_000_000) {
      return NextResponse.json({ error: "That photo is too large." }, { status: 400 })
    }
    image = {
      name: typeof raw.name === "string" ? raw.name.slice(0, 120) : "photo",
      mime: typeof raw.mime === "string" ? raw.mime : "image/jpeg",
      dataUrl,
    }
  }
  const conversationId = typeof record.conversationId === "string" ? record.conversationId : undefined
  console.info("resident-chat", maskPii(message))
  const url = new URL(request.url)
  const streaming = url.searchParams.get("stream") === "1"
  try {
    if (conversationPaused(conversationId)) {
      const held = holdForSpecialist({ conversationId: conversationId!, message })
      return streaming ? streamResult(held, null) : NextResponse.json(held)
    }
    const result = await handleTurn({ conversationId, message, image })
    if (result.handoff) markPaused(result.conversationId)
    const slots = attachSlots(message, result)
    return streaming ? streamResult(result, slots) : NextResponse.json({ ...result, slots })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "The desk hit a problem sending that. Try again." }, { status: 500 })
  }
}
