import { NextResponse } from "next/server"
import { clearCookie } from "@/lib/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.headers.set("Set-Cookie", clearCookie())
  return response
}
