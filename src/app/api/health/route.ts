import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "property-tenant-chatbot",
    policy:
      (process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY) && process.env.KEYSTONE_POLICY !== "rules"
        ? "live"
        : "rules",
  })
}
