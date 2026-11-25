import { NextResponse } from "next/server"
import { acknowledgeHandoff, requireDesk } from "@/lib/admin-api"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = requireDesk(request)
  if (denied) return denied
  const { id } = await context.params
  const handoff = acknowledgeHandoff(id)
  if (!handoff) return NextResponse.json({ error: "That page is not on the desk." }, { status: 404 })
  return NextResponse.json(handoff)
}
