import { NextResponse } from "next/server"
import { requireDesk, setBotPaused } from "@/lib/admin-api"

export const dynamic = "force-dynamic"

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = requireDesk(request)
  if (denied) return denied
  const { id } = await context.params
  const conversation = setBotPaused(id, false)
  if (!conversation) return NextResponse.json({ error: "That chat is not on the board." }, { status: 404 })
  return NextResponse.json({ id: conversation.id, botPaused: false })
}
