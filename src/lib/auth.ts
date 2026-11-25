import { createHmac, timingSafeEqual } from "crypto"

export const DESK_COOKIE = "keystone_desk"
export const DESK_PASSWORD = process.env.DESK_PASSWORD || "keystone-demo"

function secret(): string {
  return process.env.DESK_SECRET || "keystone-demo-secret"
}

export function deskToken(): string {
  return createHmac("sha256", secret()).update("keystone-desk").digest("hex")
}

export function passwordMatches(password: string): boolean {
  const left = Buffer.from(password)
  const right = Buffer.from(DESK_PASSWORD)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export function sessionCookie(): string {
  return `${DESK_COOKIE}=${deskToken()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`
}

export function clearCookie(): string {
  return `${DESK_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
}

export function requestHasDeskSession(request: Request): boolean {
  const header = request.headers.get("cookie") ?? ""
  const parts = header.split(";").map((part) => part.trim())
  const row = parts.find((part) => part.startsWith(`${DESK_COOKIE}=`))
  if (!row) return false
  const value = row.slice(DESK_COOKIE.length + 1)
  const expected = deskToken()
  const left = Buffer.from(value)
  const right = Buffer.from(expected)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}
