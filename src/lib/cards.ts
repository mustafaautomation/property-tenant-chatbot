import { z } from "zod"
import type { Citation, ToolTrace } from "@/lib/types"

const ticketCreated = z.object({
  ok: z.literal(true),
  id: z.string(),
  category: z.string(),
  priority: z.string(),
  status: z.string(),
  etaLabel: z.string(),
  rationale: z.string().optional(),
  entryPermission: z.string().optional(),
  unit: z.string().optional(),
  buildingName: z.string().optional(),
  description: z.string().optional(),
})

const ticketStatus = z.object({
  ok: z.literal(true),
  id: z.string(),
  status: z.string(),
  priority: z.string(),
  category: z.string(),
  etaLabel: z.string(),
  assignee: z.string().nullable().optional(),
  description: z.string().optional(),
})

const rentSchema = z.object({
  ok: z.literal(true),
  unit: z.string(),
  buildingName: z.string(),
  monthlyRent: z.string(),
  rentDue: z.string(),
  lateFee: z.string(),
  totalDue: z.string(),
})

const bookingSchema = z.object({
  ok: z.literal(true),
  id: z.string(),
  amenity: z.string(),
  buildingName: z.string(),
  when: z.string(),
  note: z.string().optional(),
})

export type TicketCard = z.infer<typeof ticketCreated>
export type RentCard = z.infer<typeof rentSchema>
export type BookingCard = z.infer<typeof bookingSchema>

export type CardSpec =
  | { type: "form"; description: string }
  | { type: "confirm"; id: string; title: string; rows: Array<{ label: string; value: string }>; calendar?: string }
  | { type: "timeline"; id: string; status: string; eta: string; category: string; steps: TimelineStep[] }
  | { type: "rent"; rent: RentCard }
  | { type: "amenity" }
  | { type: "buildings" }
  | { type: "booking" }
  | { type: "checklist" }
  | { type: "emergency"; id: string; kind: string }
  | { type: "handoff"; id: string }

export type TimelineStep = { title: string; meta: string; state: "done" | "current" | "upcoming" }

const EMERGENCIES = new Set(["flooding", "gas", "fire", "no_heat", "lockout"])

export function phaseLabel(toolCalls: ToolTrace[]): string {
  const names = new Set(toolCalls.map((call) => call.name))
  if (names.has("page_on_call")) return "Paging the on-call desk…"
  if (names.has("create_maintenance_ticket")) return "Opening a maintenance ticket…"
  if (names.has("get_ticket_status") || names.has("list_my_tickets")) return "Checking the ticket…"
  if (names.has("get_rent_balance")) return "Reading the ledger…"
  if (names.has("book_amenity") || names.has("schedule_move_out_inspection")) return "Checking the calendar…"
  if (names.has("verify_tenant")) return "Checking the lease…"
  if (names.has("report_noise_complaint")) return "Logging the noise note…"
  if (names.has("search_kb")) return "Looking in the resident notes…"
  return "Checking the resident notes…"
}

export function toolLabel(name: string): string {
  const labels: Record<string, string> = {
    verify_tenant: "Lease check",
    search_kb: "Resident notes",
    create_maintenance_ticket: "Maintenance ticket",
    get_ticket_status: "Ticket status",
    list_my_tickets: "Ticket list",
    get_rent_balance: "Rent ledger",
    book_amenity: "Amenity calendar",
    report_noise_complaint: "Noise log",
    schedule_move_out_inspection: "Move-out inspection",
    page_on_call: "On-call page",
  }
  return labels[name] ?? name.replaceAll("_", " ")
}

function wantsForm(text: string): boolean {
  return /\b(maintenance ticket|report a repair|need a repair|open a (repair|ticket))\b/i.test(text)
}

function wantsRent(text: string): boolean {
  return /\b(balance|what do i owe|rent due|my rent|ledger)\b/i.test(text)
}

function wantsAmenity(text: string): boolean {
  return /\b(amenit|rooftop|party room|office hours|desk hours|gym|clubhouse|roof deck|courtyard grill)\b/i.test(text)
}

function wantsBuildings(text: string): boolean {
  return /\b(which buildings|unit types|the alden|birch court|harbor lofts|three buildings)\b/i.test(text)
}

function wantsBooking(text: string): boolean {
  return /\b(book|reserve)\b/i.test(text) && /\b(rooftop|lounge|party room|grill|clubhouse|roof deck|gym|amenity)\b/i.test(text)
}

function timelineFor(status: string, eta: string): TimelineStep[] {
  const normalized = status.toLowerCase()
  const scheduled = normalized === "assigned" || normalized === "scheduled"
  const done = normalized === "done"
  return [
    { title: "Open", meta: done || scheduled ? "Received" : "Just opened", state: done || scheduled ? "done" : "current" },
    { title: "Scheduled", meta: scheduled ? eta : done ? "Visit completed" : eta, state: done ? "done" : scheduled ? "current" : "upcoming" },
    { title: "Done", meta: done ? "Closed on the board" : "Waiting on the visit", state: done ? "current" : "upcoming" },
  ]
}

export function deriveCards(input: {
  userText: string
  toolCalls: ToolTrace[]
  handoff: { id: string; kind: string } | null
  citations?: Citation[]
}): CardSpec[] {
  const cards: CardSpec[] = []
  const text = input.userText
  const created = input.toolCalls.find((call) => call.name === "create_maintenance_ticket")
  const createdTicket = created ? ticketCreated.safeParse(created.output) : null
  const statusCall = input.toolCalls.find((call) => call.name === "get_ticket_status")
  const statusTicket = statusCall ? ticketStatus.safeParse(statusCall.output) : null
  const rentCall = input.toolCalls.find((call) => call.name === "get_rent_balance")
  const rent = rentCall ? rentSchema.safeParse(rentCall.output) : null
  const bookCall = input.toolCalls.find((call) => call.name === "book_amenity")
  const booking = bookCall ? bookingSchema.safeParse(bookCall.output) : null

  if (input.handoff && EMERGENCIES.has(input.handoff.kind)) {
    cards.push({ type: "emergency", id: input.handoff.id, kind: input.handoff.kind })
  } else if (input.handoff) {
    cards.push({ type: "handoff", id: input.handoff.id })
  }

  if (createdTicket?.success) {
    const ticket = createdTicket.data
    cards.push({
      type: "confirm",
      id: ticket.id,
      title: "Ticket opened",
      rows: [
        { label: "Ticket", value: ticket.id },
        { label: "Where", value: [ticket.buildingName, ticket.unit ? `unit ${ticket.unit}` : ""].filter(Boolean).join(", ") },
        { label: "Category", value: ticket.category },
        { label: "Priority", value: ticket.priority },
        { label: "ETA", value: ticket.etaLabel },
        { label: "Entry", value: ticket.entryPermission || "Call first" },
      ].filter((row) => row.value),
    })
    cards.push({
      type: "timeline",
      id: ticket.id,
      status: ticket.status,
      eta: ticket.etaLabel,
      category: ticket.category,
      steps: timelineFor(ticket.status, ticket.etaLabel),
    })
  } else if (statusTicket?.success) {
    const ticket = statusTicket.data
    cards.push({
      type: "timeline",
      id: ticket.id,
      status: ticket.status,
      eta: ticket.etaLabel,
      category: ticket.category,
      steps: timelineFor(ticket.status, ticket.etaLabel),
    })
  } else if (wantsForm(text) && !input.handoff) {
    cards.push({ type: "form", description: text })
  }

  if (rent?.success) cards.push({ type: "rent", rent: rent.data })
  else if (wantsRent(text) && !input.handoff && !createdTicket?.success) {
    /* Ledger cards render only from a real tool result. */
  }

  if (booking?.success) {
    cards.push({
      type: "confirm",
      id: booking.data.id,
      title: "You're booked",
      calendar: booking.data.when,
      rows: [
        { label: "Code", value: booking.data.id },
        { label: "Where", value: `${booking.data.buildingName} ${booking.data.amenity}` },
        { label: "When", value: booking.data.when },
      ],
    })
  } else if (wantsBooking(text) && !input.handoff) {
    cards.push({ type: "booking" })
  } else if (wantsAmenity(text) && !input.handoff && !createdTicket?.success) {
    cards.push({ type: "amenity" })
  }

  if (/\bmove-?in\b/i.test(text) && cards.length < 2) cards.push({ type: "checklist" })

  if (wantsBuildings(text) && cards.length === 0) cards.push({ type: "buildings" })

  return cards
}

export function followUps(userText: string, cards: CardSpec[], handoff: boolean): Array<{ label: string; prompt: string }> {
  if (handoff) {
    return [
      { label: "Leave my details", prompt: "__lead__" },
      { label: "Desk phone number", prompt: "What is the desk phone number?" },
    ]
  }
  if (cards.some((card) => card.type === "confirm" || card.type === "timeline")) {
    return [
      { label: "Check ticket status", prompt: "What's the status of that ticket?" },
      { label: "Talk to the office", prompt: "I want to talk to a person" },
    ]
  }
  if (cards.some((card) => card.type === "rent")) {
    return [
      { label: "Open a repair", prompt: "I need a maintenance ticket" },
      { label: "Package policy", prompt: "What's the package policy?" },
    ]
  }
  if (cards.some((card) => card.type === "booking")) {
    return [
      { label: "I'm unit 4B, Chen", prompt: "I'm in unit 4B, last name Chen" },
      { label: "Talk to the office", prompt: "I want to talk to a person" },
    ]
  }
  if (/\b(quiet|package|pet|parking|trash|rent)\b/i.test(userText)) {
    return [
      { label: "When is rent due?", prompt: "When is rent due?" },
      { label: "Book the rooftop", prompt: "Book the rooftop lounge" },
      { label: "Talk to the office", prompt: "I want to talk to a person" },
    ]
  }
  if (/\bchen\b|verified|unit 4b/i.test(userText)) {
    return [
      { label: "My sink is leaking", prompt: "my kitchen sink is leaking" },
      { label: "My rent balance", prompt: "What's my rent balance?" },
      { label: "Book the rooftop", prompt: "Book the rooftop lounge" },
    ]
  }
  return [
    { label: "Package policy", prompt: "What's the package policy?" },
    { label: "Report a repair", prompt: "I need a maintenance ticket" },
    { label: "Talk to the office", prompt: "I want to talk to a person" },
  ]
}

export function citationSchemaOk(citation: Citation): boolean {
  return z.object({ slug: z.string().min(1), title: z.string().min(1), excerpt: z.string() }).safeParse(citation).success
}
