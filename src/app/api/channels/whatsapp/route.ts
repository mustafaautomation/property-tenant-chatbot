import { NextResponse } from "next/server"
import { answerInbound, readChallenge, verifyToken, whatsappMessages } from "@/lib/channels"
import { maskPii } from "@/lib/guardrails"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams
  const result = readChallenge(query, verifyToken("WHATSAPP_VERIFY_TOKEN"))
  if (!result.ok) return new NextResponse("Forbidden", { status: 403 })
  return new NextResponse(result.challenge, { status: 200 })
}

export async function POST(request: Request) {
  let body: unknown = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const replies = whatsappMessages(body).map((message) => {
    console.info("whatsapp-in", maskPii(message.text))
    return answerInbound(message)
  })
  return NextResponse.json({ ok: true, replies })
}
