import { z } from "zod"
import { AMENITIES, EMERGENCY_PHONE, TENANTS, amenityById, buildingById, findTenant, tenantById } from "@/lib/catalog"
import { addDays, businessDaysBetween, compareTime, isoDate, isWeekend, zonedParts } from "@/lib/clock"
import { formatMoney, formatSlot } from "@/lib/format"
import { searchKb } from "@/lib/kb"
import type { Conversation, HandoffKind, Photo, Priority, Store, TicketCategory } from "@/lib/types"
import { detectEmergency, entryPermissionFrom, etaFor, higherPriority, triageMaintenance } from "@/lib/triage"

export type ToolContext = {
  store: Store
  conversation: Conversation
  now: Date
  image?: Photo | null
}

const CATEGORIES = new Set<TicketCategory>([
  "plumbing",
  "electrical",
  "hvac",
  "appliance",
  "pest",
  "locksmith",
  "general",
])

const PRIORITIES = new Set<Priority>(["urgent", "high", "normal", "low"])

function requireTenant(ctx: ToolContext) {
  if (!ctx.conversation.tenantId) {
    return { ok: false as const, error: "verification_required", message: "Verify with unit and last name first." }
  }
  const tenant = tenantById(ctx.conversation.tenantId)
  if (!tenant) return { ok: false as const, error: "verification_required", message: "Verify with unit and last name first." }
  return { ok: true as const, tenant }
}

function minutes(value: string): number {
  const [hour, minute] = value.split(":").map(Number)
  return hour * 60 + minute
}

const handoffKinds = ["flooding", "gas", "fire", "no_heat", "lockout", "resident_request", "frustration", "low_confidence", "sensitive"] as const

const toolSchemas: Record<string, z.ZodTypeAny> = {
  verify_tenant: z
    .object({
      unit: z.string().min(1),
      last_name: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
    })
    .refine((value) => Boolean(value.last_name || value.lastName), { message: "Last name is required." }),
  search_kb: z.object({
    query: z.string().min(1),
    buildingId: z.string().nullable().optional(),
  }),
  create_maintenance_ticket: z.object({
    description: z.string().min(1),
    category: z.string().optional(),
    priority: z.string().optional(),
    entry_permission: z.string().optional(),
    entryPermission: z.string().optional(),
  }),
  get_ticket_status: z.object({
    ticket_id: z.string().optional(),
    ticketId: z.string().optional(),
  }),
  list_my_tickets: z.object({}).passthrough(),
  get_rent_balance: z.object({}).passthrough(),
  book_amenity: z.object({
    amenity: z.string().optional(),
    amenity_id: z.string().optional(),
    amenityId: z.string().optional(),
    date: z.string().min(1),
    start: z.string().min(1),
    end: z.string().min(1),
  }),
  report_noise_complaint: z.object({
    description: z.string().min(1),
    location: z.string().optional(),
    when_heard: z.string().optional(),
    whenHeard: z.string().optional(),
  }),
  schedule_move_out_inspection: z
    .object({
      preferred_date: z.string().optional(),
      preferredDate: z.string().optional(),
      notes: z.string().optional(),
    })
    .refine((value) => Boolean(value.preferred_date || value.preferredDate), { message: "A date is required." }),
  page_on_call: z.object({
    kind: z.enum(handoffKinds),
    summary: z.string().optional(),
  }),
}

export function executeTool(
  name: string,
  input: Record<string, unknown>,
  ctx: ToolContext,
): Record<string, unknown> {
  const schema = toolSchemas[name]
  if (!schema) return { ok: false, error: "unknown_tool", message: `Unknown tool ${name}.` }
  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "invalid_input", message: parsed.error.issues[0]?.message ?? "Invalid tool input." }
  }
  input = parsed.data as Record<string, unknown>
  switch (name) {
    case "verify_tenant":
      return verifyTenant(input, ctx)
    case "search_kb":
      return searchKnowledge(input, ctx)
    case "create_maintenance_ticket":
      return createTicket(input, ctx)
    case "get_ticket_status":
      return ticketStatus(input, ctx)
    case "list_my_tickets":
      return listTickets(ctx)
    case "get_rent_balance":
      return rentBalance(ctx)
    case "book_amenity":
      return bookAmenity(input, ctx)
    case "report_noise_complaint":
      return noiseComplaint(input, ctx)
    case "schedule_move_out_inspection":
      return scheduleInspection(input, ctx)
    case "page_on_call":
      return pageOnCall(input, ctx)
    default:
      return { ok: false, error: "unknown_tool", message: `Unknown tool ${name}.` }
  }
}

export function toolNames(): string[] {
  return Object.keys(toolSchemas)
}

function verifyTenant(input: Record<string, unknown>, ctx: ToolContext) {
  const unit = String(input.unit ?? "").trim()
  const lastName = String(input.last_name ?? input.lastName ?? "").trim()
  if (!unit || !lastName) {
    return { ok: false, error: "missing_fields", message: "Unit and last name are both required." }
  }
  const tenant = findTenant(unit, lastName)
  if (!tenant) {
    return { ok: false, error: "not_found", message: "That unit and last name do not match a current lease." }
  }
  ctx.conversation.tenantId = tenant.id
  const building = buildingById(tenant.buildingId)
  return {
    ok: true,
    tenantId: tenant.id,
    firstName: tenant.firstName,
    lastName: tenant.lastName,
    unit: tenant.unit,
    buildingId: tenant.buildingId,
    buildingName: building.name,
  }
}

function searchKnowledge(input: Record<string, unknown>, ctx: ToolContext) {
  const query = String(input.query ?? "").trim()
  const tenant = ctx.conversation.tenantId ? tenantById(ctx.conversation.tenantId) : null
  const requested = typeof input.buildingId === "string" ? input.buildingId : tenant?.buildingId
  const buildingId = requested === "alden" || requested === "birch" || requested === "harbor" ? requested : null
  const matches = searchKb(query, { buildingId })
  return {
    ok: true,
    matches: matches.map((match) => ({
      slug: match.slug,
      title: match.title,
      heading: match.heading,
      excerpt: match.text.slice(0, 700),
      score: Number(match.score.toFixed(3)),
    })),
  }
}

function createTicket(input: Record<string, unknown>, ctx: ToolContext) {
  const gate = requireTenant(ctx)
  if (!gate.ok) return gate
  const description = String(input.description ?? "").trim()
  if (!description) return { ok: false, error: "missing_description", message: "A description is required." }
  if (detectEmergency(description)) {
    return {
      ok: false,
      error: "emergency_handoff_required",
      message: `This description is an emergency. Page on-call and give ${EMERGENCY_PHONE}. Do not open a routine ticket.`,
    }
  }
  const triaged = triageMaintenance(description)
  const requestedPriority = PRIORITIES.has(input.priority as Priority) ? (input.priority as Priority) : triaged.priority
  const priority = higherPriority(triaged.priority, requestedPriority)
  const category = CATEGORIES.has(input.category as TicketCategory) ? triaged.category : triaged.category
  const entryPermission = String(input.entry_permission ?? input.entryPermission ?? entryPermissionFrom(description))
  const id = `KR-${ctx.store.seq.ticket}`
  ctx.store.seq.ticket += 1
  const nowIso = ctx.now.toISOString()
  const ticket = {
    id,
    tenantId: gate.tenant.id,
    category,
    priority,
    status: "open" as const,
    description,
    entryPermission,
    assignee: null,
    etaLabel: etaFor(priority),
    rationale: triaged.rationale,
    photo: ctx.image ?? null,
    createdAt: nowIso,
    updatedAt: nowIso,
  }
  ctx.store.tickets.unshift(ticket)
  ctx.conversation.lastTicketId = id
  return {
    ok: true,
    id,
    category,
    priority,
    status: ticket.status,
    etaLabel: ticket.etaLabel,
    rationale: ticket.rationale,
    entryPermission,
    photoAttached: Boolean(ctx.image),
    unit: gate.tenant.unit,
    buildingName: buildingById(gate.tenant.buildingId).name,
  }
}

function ticketStatus(input: Record<string, unknown>, ctx: ToolContext) {
  const gate = requireTenant(ctx)
  if (!gate.ok) return gate
  const requested = String(input.ticket_id ?? input.ticketId ?? ctx.conversation.lastTicketId ?? "").trim()
  if (!requested) return { ok: false, error: "no_ticket", message: "There is no ticket on this chat yet." }
  const ticket = ctx.store.tickets.find(
    (item) => item.id.toLowerCase() === requested.toLowerCase() && item.tenantId === gate.tenant.id,
  )
  if (!ticket) return { ok: false, error: "not_found", message: "That ticket is not on this lease." }
  return {
    ok: true,
    id: ticket.id,
    status: ticket.status,
    priority: ticket.priority,
    category: ticket.category,
    etaLabel: ticket.etaLabel,
    assignee: ticket.assignee,
    description: ticket.description,
  }
}

function listTickets(ctx: ToolContext) {
  const gate = requireTenant(ctx)
  if (!gate.ok) return gate
  const tickets = ctx.store.tickets.filter((ticket) => ticket.tenantId === gate.tenant.id)
  return {
    ok: true,
    tickets: tickets.map((ticket) => ({
      id: ticket.id,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      etaLabel: ticket.etaLabel,
      description: ticket.description,
    })),
  }
}

function rentBalance(ctx: ToolContext) {
  const gate = requireTenant(ctx)
  if (!gate.ok) return gate
  const tenant = gate.tenant
  const total = tenant.balanceCents + tenant.lateFeeCents
  return {
    ok: true,
    unit: tenant.unit,
    buildingName: buildingById(tenant.buildingId).name,
    monthlyRent: formatMoney(tenant.monthlyRentCents),
    rentDue: formatMoney(tenant.balanceCents),
    lateFee: formatMoney(tenant.lateFeeCents),
    totalDue: formatMoney(total),
    balanceCents: tenant.balanceCents,
    lateFeeCents: tenant.lateFeeCents,
    leaseEnd: tenant.leaseEnd,
  }
}

function bookAmenity(input: Record<string, unknown>, ctx: ToolContext) {
  const gate = requireTenant(ctx)
  if (!gate.ok) return gate
  const amenity =
    amenityById(String(input.amenity_id ?? input.amenityId ?? "")) ??
    AMENITIES.find((item) => item.name === String(input.amenity ?? "").toLowerCase()) ??
    null
  if (!amenity) return { ok: false, error: "unknown_amenity", message: "Name the room you want to book." }
  const building = buildingById(gate.tenant.buildingId)
  if (amenity.buildingId !== gate.tenant.buildingId) {
    const home = buildingById(amenity.buildingId)
    return {
      ok: false,
      error: "wrong_building",
      message: `The ${amenity.name} is at ${home.name}. Your lease is at ${building.name}.`,
    }
  }
  if (!amenity.bookable) {
    return { ok: false, error: "not_bookable", message: `The ${amenity.name} is first come, first served and is not reserved.` }
  }
  const date = String(input.date ?? "")
  const start = String(input.start ?? "")
  const end = String(input.end ?? "")
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) {
    return { ok: false, error: "bad_slot", message: "A date and a 2-hour start and end are required." }
  }
  if (minutes(end) - minutes(start) !== 120) {
    return { ok: false, error: "slot_length", message: "Reservations are 2-hour slots." }
  }
  const today = isoDate(ctx.now)
  const horizon = addDays(today, 7)
  if (date < today || date > horizon) {
    return { ok: false, error: "horizon", message: "Bookings open 7 days ahead, and the date has to be today or later." }
  }
  if (date === today) {
    const parts = zonedParts(ctx.now)
    const nowMinutes = parts.hour * 60 + parts.minute
    if (minutes(start) <= nowMinutes) {
      return { ok: false, error: "past_slot", message: "That slot has already started." }
    }
  }
  if (compareTime(start, amenity.open) < 0 || compareTime(end, amenity.close) > 0) {
    return {
      ok: false,
      error: "closed",
      message: `The ${amenity.name} can be booked from ${amenity.open} to ${amenity.close}.`,
    }
  }
  if (compareTime(end, "22:00") > 0) {
    return { ok: false, error: "quiet_hours", message: "Slots have to end by 10:00 p.m., when quiet hours start." }
  }
  const upcoming = ctx.store.bookings.filter(
    (booking) => booking.tenantId === gate.tenant.id && booking.status === "booked" && booking.date >= today,
  )
  if (upcoming.length >= 1) {
    return {
      ok: false,
      error: "one_active",
      message: `You already have ${upcoming[0].id} on the books. A household may hold one upcoming reservation.`,
    }
  }
  const clash = ctx.store.bookings.find((booking) => {
    if (booking.amenityId !== amenity.id || booking.date !== date || booking.status !== "booked") return false
    return minutes(start) < minutes(booking.end) && minutes(end) > minutes(booking.start)
  })
  if (clash) {
    return { ok: false, error: "taken", message: `That slot is already held (${clash.id}).` }
  }
  const id = `AM-${ctx.store.seq.booking}`
  ctx.store.seq.booking += 1
  ctx.store.bookings.push({
    id,
    tenantId: gate.tenant.id,
    amenityId: amenity.id,
    date,
    start,
    end,
    status: "booked",
    createdAt: ctx.now.toISOString(),
  })
  return {
    ok: true,
    id,
    amenity: amenity.name,
    buildingName: building.name,
    when: formatSlot(date, start, end),
    note: amenity.note,
  }
}

function noiseComplaint(input: Record<string, unknown>, ctx: ToolContext) {
  const gate = requireTenant(ctx)
  if (!gate.ok) return gate
  const description = String(input.description ?? "").trim()
  if (!description) return { ok: false, error: "missing_description", message: "Say what you heard." }
  const id = `NC-${ctx.store.seq.complaint}`
  ctx.store.seq.complaint += 1
  ctx.store.complaints.push({
    id,
    tenantId: gate.tenant.id,
    location: String(input.location ?? "Not specified"),
    description,
    whenHeard: String(input.when_heard ?? input.whenHeard ?? "Not specified"),
    createdAt: ctx.now.toISOString(),
  })
  return { ok: true, id, location: String(input.location ?? "Not specified") }
}

function scheduleInspection(input: Record<string, unknown>, ctx: ToolContext) {
  const gate = requireTenant(ctx)
  if (!gate.ok) return gate
  const date = String(input.preferred_date ?? input.preferredDate ?? "")
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, error: "bad_date", message: "Give a preferred date." }
  }
  const today = isoDate(ctx.now)
  if (isWeekend(date)) {
    return { ok: false, error: "weekend", message: "Move-out inspections are weekdays only." }
  }
  const notice = businessDaysBetween(today, date)
  if (notice < 2) {
    return { ok: false, error: "notice", message: "Schedule the inspection at least 2 business days ahead." }
  }
  const existing = ctx.store.inspections.find((item) => item.tenantId === gate.tenant.id)
  if (existing) {
    return { ok: false, error: "already_scheduled", message: `Inspection ${existing.id} is already set for ${existing.date}.` }
  }
  const id = `MI-${ctx.store.seq.inspection}`
  ctx.store.seq.inspection += 1
  const notes = String(input.notes ?? "").trim()
  ctx.store.inspections.push({
    id,
    tenantId: gate.tenant.id,
    date,
    notes,
    status: "scheduled",
    createdAt: ctx.now.toISOString(),
  })
  return { ok: true, id, date, unit: gate.tenant.unit, buildingName: buildingById(gate.tenant.buildingId).name }
}

function pageOnCall(input: Record<string, unknown>, ctx: ToolContext) {
  const kind = String(input.kind ?? "")
  const allowed = new Set<string>(handoffKinds)
  if (!allowed.has(kind)) return { ok: false, error: "bad_kind", message: "Unknown handoff kind." }
  const tenant = ctx.conversation.tenantId ? tenantById(ctx.conversation.tenantId) : null
  const id = `HO-${ctx.store.seq.handoff}`
  ctx.store.seq.handoff += 1
  ctx.store.handoffs.unshift({
    id,
    conversationId: ctx.conversation.id,
    tenantId: tenant?.id ?? null,
    kind: kind as HandoffKind,
    summary: String(input.summary ?? "").slice(0, 500),
    status: "paging",
    unit: tenant?.unit ?? null,
    buildingId: tenant?.buildingId ?? null,
    photo: ctx.image ?? null,
    createdAt: ctx.now.toISOString(),
    acknowledgedAt: null,
  })
  ctx.conversation.handoffIds.push(id)
  return {
    ok: true,
    id,
    kind,
    phone: EMERGENCY_PHONE,
    unit: tenant?.unit ?? null,
    buildingName: tenant ? buildingById(tenant.buildingId).name : null,
  }
}

export function publicTenant(tenantId: string | null) {
  if (!tenantId) return null
  const tenant = TENANTS.find((item) => item.id === tenantId)
  if (!tenant) return null
  return {
    id: tenant.id,
    firstName: tenant.firstName,
    lastName: tenant.lastName,
    unit: tenant.unit,
    buildingId: tenant.buildingId,
    buildingName: buildingById(tenant.buildingId).name,
  }
}
