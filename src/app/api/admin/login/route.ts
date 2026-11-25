import { NextResponse } from "next/server"
import { passwordMatches, sessionCookie } from "@/lib/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  let password = ""
  try {
    const body = (await request.json()) as { password?: unknown }
    password = typeof body.password === "string" ? body.password : ""
  } catch {
    password = ""
  }
  if (!passwordMatches(password)) {
    return NextResponse.json({ error: "That password does not open the desk." }, { status: 401 })
  }
  const response = NextResponse.json({ ok: true })
  response.headers.set("Set-Cookie", sessionCookie())
  return response
}
