import { NextResponse } from "next/server"
import { requireDesk, restoreDemo } from "@/lib/admin-api"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const denied = requireDesk(request)
  if (denied) return denied
  restoreDemo()
  return NextResponse.json({ ok: true })
}
