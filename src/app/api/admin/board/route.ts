import { NextResponse } from "next/server"
import { boardPayload, requireDesk } from "@/lib/admin-api"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const denied = requireDesk(request)
  if (denied) return denied
  return NextResponse.json(boardPayload())
}
