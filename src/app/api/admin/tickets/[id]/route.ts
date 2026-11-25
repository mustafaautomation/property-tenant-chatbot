import { NextResponse } from "next/server"
import { requireDesk, updateTicket } from "@/lib/admin-api"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = requireDesk(request)
  if (denied) return denied
  const { id } = await context.params
  let body: { status?: unknown; assignee?: unknown } = {}
  try {
    body = (await request.json()) as { status?: unknown; assignee?: unknown }
  } catch {
    body = {}
  }
  const ticket = updateTicket(id, body)
  if (!ticket) return NextResponse.json({ error: "That ticket is not on the board." }, { status: 404 })
  return NextResponse.json(ticket)
}
