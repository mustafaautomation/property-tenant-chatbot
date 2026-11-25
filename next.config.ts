import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/chat": ["./kb/**/*"],
    "/api/channels/whatsapp": ["./kb/**/*"],
    "/api/channels/messenger": ["./kb/**/*"],
  },
}

export default nextConfig
