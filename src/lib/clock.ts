import { TIME_ZONE } from "@/lib/catalog"

export function zonedParts(now: Date) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  })
  const parts = Object.fromEntries(fmt.formatToParts(now).map((part) => [part.type, part.value]))
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    weekday: parts.weekday ?? "",
  }
}

export function isoDate(now: Date): string {
  const parts = zonedParts(now)
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`
}

export function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function weekdayOf(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

export function isWeekend(iso: string): boolean {
  const weekday = weekdayOf(iso)
  return weekday === 0 || weekday === 6
}

/** Business days after `fromIso` up to and including `toIso`. */
export function businessDaysBetween(fromIso: string, toIso: string): number {
  if (toIso < fromIso) return -1
  let count = 0
  let cursor = addDays(fromIso, 1)
  while (cursor <= toIso) {
    if (!isWeekend(cursor)) count += 1
    if (cursor === toIso) break
    cursor = addDays(cursor, 1)
  }
  return count
}

export function compareTime(a: string, b: string): number {
  return a.localeCompare(b)
}
