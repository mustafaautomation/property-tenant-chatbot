import { AMENITIES } from "@/lib/catalog"
import { addDays, compareTime, isoDate, zonedParts } from "@/lib/clock"
import { formatTime } from "@/lib/format"
import type { Booking } from "@/lib/types"

export type SlotOffer = {
  amenity: string
  amenityId: string
  dateIso: string
  dateLabel: string
  times: Array<{ start: string; end: string; label: string }>
}

function minutes(hhmm: string) {
  const [hour, minute] = hhmm.split(":").map(Number)
  return hour * 60 + minute
}

function addMinutes(hhmm: string, amount: number) {
  const total = minutes(hhmm) + amount
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`
}

function dayLabel(iso: string) {
  const [year, month, day] = iso.split("-").map(Number)
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)))
}

export function openSlots(
  now: Date,
  bookings: Array<Pick<Booking, "amenityId" | "date" | "start" | "end" | "status">>,
  hint = "",
): SlotOffer | null {
  const normalized = hint.toLowerCase()
  const amenity =
    AMENITIES.find((item) => item.bookable && normalized.includes(item.name)) ??
    AMENITIES.find((item) => item.id === "rooftop-lounge")
  if (!amenity) return null
  const today = isoDate(now)
  const parts = zonedParts(now)
  const nowMinutes = parts.hour * 60 + parts.minute
  for (let offset = 0; offset < 7; offset += 1) {
    const date = addDays(today, offset)
    const times: SlotOffer["times"] = []
    let cursor = amenity.open
    while (compareTime(addMinutes(cursor, 120), amenity.close) <= 0 && compareTime(addMinutes(cursor, 120), "22:00") <= 0) {
      const end = addMinutes(cursor, 120)
      const past = date === today && minutes(cursor) <= nowMinutes
      const taken = bookings.some((booking) => {
        if (booking.amenityId !== amenity.id || booking.date !== date || booking.status !== "booked") return false
        return minutes(cursor) < minutes(booking.end) && minutes(end) > minutes(booking.start)
      })
      if (!past && !taken) times.push({ start: cursor, end, label: formatTime(cursor) })
      cursor = end
      if (times.length === 4) break
    }
    if (times.length > 0) {
      return { amenity: amenity.name, amenityId: amenity.id, dateIso: date, dateLabel: dayLabel(date), times }
    }
  }
  return null
}
