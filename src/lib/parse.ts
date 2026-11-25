import { AMENITIES, TENANTS, type Amenity } from "@/lib/catalog"
import { addDays, isoDate } from "@/lib/clock"

const MONTHS: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
}

export type Identity = {
  unit?: string
  lastName?: string
}

export function looksLikeVerification(text: string): boolean {
  if (/last name/i.test(text)) return true
  if (/(?:i'm|i am|this is|my name is)\b/i.test(text)) return true
  if (/(?:unit|apt|apartment|#)\s*[0-9]/i.test(text) && /\b[A-Za-z]{3,}\b/.test(text)) return true
  return false
}

export function extractIdentity(text: string): Identity {
  const identity: Identity = {}
  const unitMatch = text.match(/(?:unit|apt|apartment|#)\s*([0-9]{1,4}[A-Za-z]?)/i)
  if (unitMatch) identity.unit = unitMatch[1].toUpperCase()
  else {
    const compact = text.match(/\b([0-9]{1,4}[A-Za-z])\b/)
    if (compact) identity.unit = compact[1].toUpperCase()
  }

  const explicit = text.match(/last name\s+(?:is\s+)?([A-Za-z][A-Za-z'-]+)/i)
  if (explicit) {
    identity.lastName = explicit[1]
    return identity
  }

  const intro = text.match(/(?:i'm|i am|this is|my name is)\s+([A-Za-z]+)\s+([A-Za-z]+)/i)
  if (intro) {
    identity.lastName = intro[2]
    return identity
  }

  const found = TENANTS.filter((tenant) => new RegExp(`\\b${tenant.lastName}\\b`, "i").test(text))
  if (found.length === 1) identity.lastName = found[0].lastName
  return identity
}

function to24(hour: number, meridiem: string | undefined): number {
  const marker = meridiem?.toLowerCase().replace(/\./g, "")
  if (!marker) return hour
  if (marker === "pm" && hour < 12) return hour + 12
  if (marker === "am" && hour === 12) return 0
  return hour
}

function hhmm(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}

export function parseTimeRange(text: string): { start: string; end: string } | null {
  const range = text.match(
    /(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?\s*(?:to|-|–|until)\s*(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/i,
  )
  if (range) {
    const secondMeridiem = range[6]
    const firstMeridiem = range[3] || secondMeridiem
    const startHour = to24(Number(range[1]), firstMeridiem)
    const endHour = to24(Number(range[4]), secondMeridiem)
    return {
      start: hhmm(startHour, Number(range[2] ?? "0")),
      end: hhmm(endHour, Number(range[5] ?? "0")),
    }
  }
  const single = text.match(/\b(?:at|from)\s+(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/i)
  if (!single) return null
  const startHour = to24(Number(single[1]), single[3])
  const startMinute = Number(single[2] ?? "0")
  const endHour = Math.min(startHour + 2, 23)
  return { start: hhmm(startHour, startMinute), end: hhmm(endHour, startMinute) }
}

export function parseDate(text: string, now: Date): string | null {
  const today = isoDate(now)
  if (/\btomorrow\b/i.test(text)) return addDays(today, 1)
  if (/\btoday\b/i.test(text)) return today

  const month = text.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june|july|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i,
  )
  if (!month) return null
  const monthNumber = MONTHS[month[1].toLowerCase()]
  const day = Number(month[2])
  const yearFromText = text.match(/\b(20\d{2})\b/)
  let year = yearFromText ? Number(yearFromText[1]) : Number(today.slice(0, 4))
  const iso = `${year}-${String(monthNumber).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  if (!yearFromText && iso < today) {
    year += 1
    return `${year}-${String(monthNumber).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  }
  return iso
}

export function matchAmenity(text: string): Amenity | null {
  const normalized = text.toLowerCase()
  const ordered = [...AMENITIES].sort((a, b) => b.name.length - a.name.length)
  return ordered.find((amenity) => normalized.includes(amenity.name)) ?? null
}

export function parseLocation(text: string): string {
  const unit = text.match(/\b(?:unit|apt|apartment)\s*([0-9]{1,4}[A-Za-z]?)\b/i)
  if (unit) return `Unit ${unit[1].toUpperCase()}`
  const neighbor = text.match(/\b([0-9]{1,4}[A-Za-z]?)\b/)
  if (neighbor && /neighbor|next door|above|below/.test(text.toLowerCase())) {
    return `Near ${neighbor[1].toUpperCase()}`
  }
  return "Not specified"
}
