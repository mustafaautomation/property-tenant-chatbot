import { NextResponse } from "next/server"
import { answerInbound, messengerMessages, readChallenge, verifyToken } from "@/lib/channels"
import { maskPii } from "@/lib/guardrails"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams
  const result = readChallenge(query, verifyToken("MESSENGER_VERIFY_TOKEN"))
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
  const replies = messengerMessages(body).map((message) => {
    console.info("messenger-in", maskPii(message.text))
    return answerInbound(message)
  })
  return NextResponse.json({ ok: true, replies })
}
