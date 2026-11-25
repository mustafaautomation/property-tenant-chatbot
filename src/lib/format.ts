import { TIME_ZONE } from "@/lib/catalog"

export function formatMoney(cents: number): string {
  const whole = cents % 100 === 0
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

export function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso))
}

export function formatTime(hhmm: string): string {
  const [hourText, minuteText] = hhmm.split(":")
  const hour = Number(hourText)
  const minute = Number(minuteText)
  const suffix = hour >= 12 ? "p.m." : "a.m."
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  const minutes = minute === 0 ? "00" : String(minute).padStart(2, "0")
  return `${hour12}:${minutes} ${suffix}`
}

export function formatSlot(date: string, start: string, end: string): string {
  const [year, month, day] = date.split("-").map(Number)
  const utc = new Date(Date.UTC(year, month - 1, day, 12))
  const label = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(utc)
  return `${label}, ${formatTime(start)}–${formatTime(end)}`
}

export function priorityLabel(priority: string): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1)
}
