import { NextResponse } from "next/server"
import { maskPii } from "@/lib/guardrails"
import { handleTurn } from "@/lib/policy"
import type { Photo } from "@/lib/types"

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
    if (dataUrl.length > 1_800_000) {
      return NextResponse.json({ error: "That photo is too large." }, { status: 400 })
    }
    image = {
      name: typeof raw.name === "string" ? raw.name.slice(0, 120) : "photo",
      mime: typeof raw.mime === "string" ? raw.mime : "image/jpeg",
      dataUrl,
    }
  }
  const turn = {
    conversationId: typeof record.conversationId === "string" ? record.conversationId : undefined,
    message,
    image,
  }
  console.info("resident-chat", maskPii(message))
  try {
    const result = await handleTurn(turn)
    const url = new URL(request.url)
    if (url.searchParams.get("stream") === "1") {
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          const parts = result.reply.split(/(\s+)/)
          for (const part of parts) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "token", text: part })}\n\n`))
          }
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "done",
                conversationId: result.conversationId,
                reply: result.reply,
                toolCalls: result.toolCalls,
                citations: result.citations,
                handoff: result.handoff,
                tenant: result.tenant,
                ticket: result.ticket,
              })}\n\n`,
            ),
          )
          controller.close()
        },
      })
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        },
      })
    }
    return NextResponse.json(result)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "The desk hit a problem sending that. Try again." }, { status: 500 })
  }
}
