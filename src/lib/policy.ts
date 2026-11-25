import { randomUUID } from "crypto"
import { BUILDINGS, DESK_PHONE, EMERGENCY_PHONE, TENANTS, buildingById, tenantById } from "@/lib/catalog"
import { isFrustrated, isInjection, isOffTopic, isSensitive } from "@/lib/guardrails"
import { isLowConfidence } from "@/lib/kb"
import { extractIdentity, looksLikeVerification, matchAmenity, parseDate, parseLocation, parseTimeRange } from "@/lib/parse"
import { defaultDataDir, withStore } from "@/lib/store"
import { executeTool, publicTenant } from "@/lib/tools"
import type {
  BuildingId,
  ChatMessage,
  Citation,
  Conversation,
  EmergencyKind,
  HandoffKind,
  PendingIntent,
  Photo,
  Store,
  ToolTrace,
  TurnResult,
} from "@/lib/types"
import { detectEmergency } from "@/lib/triage"

export type TurnInput = {
  conversationId?: string
  message: string
  image?: Photo | null
  now?: Date
  dataDir?: string
}

const EMERGENCY_COPY: Record<EmergencyKind, (where: string) => string> = {
  flooding: (where) =>
    `This is an emergency, not a routine work order. If water is near outlets or still rising, leave the unit. Shut the water valve only if you can do it safely (${where}). Call 911 if anyone is in danger, and call the Keystone emergency line now at ${EMERGENCY_PHONE}. I have paged the on-call technician.`,
  gas: () =>
    `This is an emergency. Leave the building now. Do not flip switches, do not use the elevator, and do not look for the leak. From outside, call 911 and the Keystone emergency line at ${EMERGENCY_PHONE}. I have paged the on-call technician. This is not a routine work order.`,
  fire: () =>
    `This is an emergency. Leave by the stairs, do not use the elevator, and pull the nearest alarm on your way out. Call 911, then the Keystone emergency line at ${EMERGENCY_PHONE}. I have paged the on-call technician. This is not a routine work order.`,
  no_heat: () =>
    `No heat is an emergency when the apartment is below 68°F or it is under 40°F outside. Do not use a gas stove or an unattended space heater as a substitute. Call the Keystone emergency line now at ${EMERGENCY_PHONE}. I have paged the on-call technician, and this is not a routine work order.`,
  lockout: () =>
    `A lockout is handled by the on-call line, not a routine ticket. Call ${EMERGENCY_PHONE} now. After-hours lockouts are $85 and need a photo ID. During desk hours, weekdays 9:00 a.m. to 6:00 p.m., a lockout at the Alden desk is free with photo ID. I have paged the on-call technician.`,
}

function id(): string {
  return randomUUID()
}

function appendMessage(conversation: Conversation, message: ChatMessage) {
  conversation.messages.push(message)
  conversation.updatedAt = message.createdAt
}

function trace(name: string, input: Record<string, unknown>, output: Record<string, unknown>): ToolTrace {
  return { name, input, output }
}

function namedBuilding(text: string): BuildingId | null {
  if (/harbor/i.test(text)) return "harbor"
  if (/birch/i.test(text)) return "birch"
  if (/alden/i.test(text)) return "alden"
  return null
}

function isQuestion(text: string): boolean {
  const trimmed = text.trim()
  return trimmed.includes("?") || /^(what|how|when|where|who|why|can |could |should |do |does |is |are |tell me)\b/i.test(trimmed)
}

function mentionsOtherLedger(text: string, selfId: string | null): boolean {
  const financial = /\b(balance|rent|owe|ledger|ticket|phone|email)\b/i.test(text)
  if (!financial) return false
  return TENANTS.some((tenant) => {
    if (tenant.id === selfId) return false
    return new RegExp(`\\b${tenant.lastName}\\b`, "i").test(text)
  })
}

function isStatus(text: string): boolean {
  if (/\bKR-\d+\b/i.test(text)) return true
  return /\bstatus\b/i.test(text) && /\bticket\b/i.test(text)
}

function isBalance(text: string): boolean {
  return /\b(my balance|what do i owe|owe you|rent balance|my rent|my ledger)\b/i.test(text) || (/\bbalance\b/i.test(text) && /\b(my|owe|rent)\b/i.test(text))
}

function isBooking(text: string): boolean {
  return /\b(book|reserve)\b/i.test(text) && /\b(rooftop|lounge|party room|grill|clubhouse|roof deck|gym|amenity)\b/i.test(text)
}

function isNoise(text: string): boolean {
  if (isQuestion(text) && /\bquiet hours\b/i.test(text)) return false
  return /\b(noise complaint|loud music|stomping|report (a )?noise)\b/i.test(text) || /\bneighbor\b/i.test(text) && /\b(loud|music|party|noise)\b/i.test(text)
}

function isMoveOut(text: string): boolean {
  if (isQuestion(text) && /\bchecklist\b/i.test(text) && !/\bschedule\b/i.test(text)) return false
  return /\bmove-?out inspection\b/i.test(text) || (/\b(schedule|book)\b/i.test(text) && /\b(move-?out|inspection)\b/i.test(text))
}

function isMaintenance(text: string): boolean {
  if (isQuestion(text) && !/\b(my|i'm|i am|isn't|isnt|won't|wont|not working|broken|leaking|chirping)\b/i.test(text)) {
    return false
  }
  return /\b(leak|leaking|drip|dripping|broken|not working|won't|wont|doesn't work|does not work|repair|sink|toilet|faucet|disposal|outlet|fridge|refrigerator|dishwasher|oven|stove|washer|dryer|chirp|chirping|beeping|bulb|light is out|roach|ants|mouse|no hot water|clog|clogged)\b/i.test(text)
}

function isHuman(text: string): boolean {
  return /\b(talk to (a )?(person|human|manager|someone)|real person|staff member|speak to someone)\b/i.test(text)
}

function isKnowledge(text: string): boolean {
  return isQuestion(text) || /\b(policy|quiet hours|parking|pet|trash|recycl|renew|lease|late fee|amenit|move-in|move-out checklist|guest)\b/i.test(text)
}

function finish(
  store: Store,
  conversation: Conversation,
  reply: string,
  extras: {
    toolCalls?: ToolTrace[]
    citations?: Citation[]
    handoff?: { id: string; kind: HandoffKind } | null
    now: Date
  },
): TurnResult {
  const handoff = extras.handoff ?? null
  const message: ChatMessage = {
    id: id(),
    role: "assistant",
    content: reply,
    createdAt: extras.now.toISOString(),
    toolCalls: extras.toolCalls ?? [],
    citations: extras.citations ?? [],
    handoffId: handoff?.id ?? null,
  }
  appendMessage(conversation, message)
  const ticketId = conversation.lastTicketId
  const ticket = ticketId ? store.tickets.find((item) => item.id === ticketId) : undefined
  const createdThisTurn = (extras.toolCalls ?? []).some(
    (call) => call.name === "create_maintenance_ticket" && call.output.ok === true,
  )
  return {
    conversationId: conversation.id,
    reply,
    toolCalls: extras.toolCalls ?? [],
    citations: extras.citations ?? [],
    handoff,
    tenant: publicTenant(conversation.tenantId),
    ticket:
      createdThisTurn && ticket
        ? { id: ticket.id, priority: ticket.priority, etaLabel: ticket.etaLabel, status: ticket.status }
        : null,
    messages: conversation.messages,
  }
}

function ensureConversation(store: Store, conversationId: string | undefined, now: Date): Conversation {
  if (conversationId) {
    const existing = store.conversations.find((conversation) => conversation.id === conversationId)
    if (existing) return existing
  }
  const conversation: Conversation = {
    id: conversationId || `convo_${id()}`,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    tenantId: null,
    lastTicketId: null,
    pending: null,
    messages: [],
    handoffIds: [],
  }
  store.conversations.unshift(conversation)
  return conversation
}

function answerFromKnowledge(query: string, buildingId: BuildingId | null, store: Store, conversation: Conversation, now: Date) {
  const output = executeTool("search_kb", { query, buildingId }, { store, conversation, now })
  const matches = (output.matches as Array<{ slug: string; title: string; heading: string; excerpt: string; score: number }>) ?? []
  const toolCalls = [trace("search_kb", { query, buildingId }, output)]
  if (matches.length === 0 || isLowConfidence(query, matches)) {
    return {
      reply: "",
      toolCalls,
      citations: [] as Citation[],
      lowConfidence: true,
    }
  }
  const top = matches[0].score
  const chosen = matches.filter((match) => match.score >= top * 0.58).slice(0, 3)
  const body = chosen.map((match) => `${match.heading}\n${match.excerpt.trim()}`).join("\n\n")
  const citations = chosen.map((match) => ({
    slug: match.slug,
    title: `${match.title} — ${match.heading}`,
    excerpt: match.excerpt.slice(0, 280),
  }))
  return {
    reply: body,
    toolCalls,
    citations,
  }
}

function runMaintenance(text: string, image: Photo | null, store: Store, conversation: Conversation, now: Date) {
  const tenant = tenantById(conversation.tenantId || "")
  if (!tenant) {
    conversation.pending = { type: "maintenance", text, image }
    return {
      reply: "I can open that ticket once I know the lease. Tell me the unit and the last name on it. The demo lease is unit 4B, last name Chen.",
      toolCalls: [] as ToolTrace[],
    }
  }
  const output = executeTool(
    "create_maintenance_ticket",
    { description: text, entry_permission: undefined },
    { store, conversation, now, image },
  )
  const toolCalls = [trace("create_maintenance_ticket", { description: text }, output)]
  if (!output.ok) {
    if (output.error === "emergency_handoff_required") {
      return { reply: String(output.message), toolCalls, emergency: true }
    }
    return { reply: String(output.message), toolCalls }
  }
  const photoLine = output.photoAttached ? " The photo is attached to the ticket." : ""
  const reply = `I've opened ${output.category} ticket ${output.id} for ${tenant.firstName} ${tenant.lastName} in ${output.buildingName}, unit ${output.unit}. Priority is ${output.priority}. ${output.rationale} ${output.etaLabel} Entry note: ${output.entryPermission}${photoLine} Ask me for the status of ${output.id} any time.`
  return { reply, toolCalls, ticket: true }
}

function dispatch(
  text: string,
  image: Photo | null,
  store: Store,
  conversation: Conversation,
  now: Date,
): { reply: string; toolCalls: ToolTrace[]; citations?: Citation[]; handoff?: { id: string; kind: HandoffKind } | null } | null {
  const tenant = conversation.tenantId ? tenantById(conversation.tenantId) : null

  if (isStatus(text)) {
    if (!tenant) {
      conversation.pending = { type: "status", text }
      return {
        reply: "I can look up a ticket after you verify. Send the unit and the last name on the lease.",
        toolCalls: [],
      }
    }
    const explicit = text.match(/\b(KR-\d+)\b/i)
    const output = executeTool("get_ticket_status", { ticket_id: explicit?.[1] }, { store, conversation, now })
    if (!output.ok && output.error === "no_ticket") {
      const list = executeTool("list_my_tickets", {}, { store, conversation, now })
      return {
        reply: "There isn't a ticket on this chat yet. Ask me to open one and I'll give you the number.",
        toolCalls: [trace("list_my_tickets", {}, list)],
      }
    }
    if (!output.ok) return { reply: String(output.message), toolCalls: [trace("get_ticket_status", { ticket_id: explicit?.[1] ?? conversation.lastTicketId }, output)] }
    return {
      reply: `${output.id} is ${output.status}. Priority ${output.priority}. ${output.etaLabel}${output.assignee ? ` Assigned to ${output.assignee}.` : " It is not assigned yet."}`,
      toolCalls: [trace("get_ticket_status", { ticket_id: output.id }, output)],
    }
  }

  if (isBalance(text)) {
    if (!tenant) {
      conversation.pending = { type: "balance" }
      return {
        reply: "I can read a ledger only after the unit and last name match. The demo lease is unit 4B, last name Chen.",
        toolCalls: [],
      }
    }
    const output = executeTool("get_rent_balance", {}, { store, conversation, now })
    const toolCalls = [trace("get_rent_balance", {}, output)]
    if (!output.ok) return { reply: String(output.message), toolCalls }
    if (output.balanceCents === 0 && output.lateFeeCents === 0) {
      return {
        reply: `Your ledger for ${output.buildingName}, unit ${output.unit}, is paid in full. Monthly rent is ${output.monthlyRent}. Nothing is due. The $0 balance is on this lease only.`,
        toolCalls,
      }
    }
    return {
      reply: `You owe ${output.rentDue} in rent and a ${output.lateFee} late fee, ${output.totalDue} together, for ${output.buildingName}, unit ${output.unit}. November rent was still open after the 5th, so the $75 fee posted on the 6th.`,
      toolCalls,
    }
  }

  if (isBooking(text)) {
    if (!tenant) {
      conversation.pending = { type: "booking", text }
      return { reply: "Bookings are tied to a lease. Send the unit and last name first.", toolCalls: [] }
    }
    const amenity = matchAmenity(text)
    const when = parseTimeRange(text)
    const date = parseDate(text, now)
    if (!amenity || !when || !date) {
      const names = BUILDINGS.find((building) => building.id === tenant.buildingId)
      return {
        reply: `Tell me the room, the day, and a 2-hour slot. At ${names?.name ?? "your building"} you can ask for the rooms listed in the resident notes.`,
        toolCalls: [],
      }
    }
    const output = executeTool(
      "book_amenity",
      { amenity: amenity.name, date, start: when.start, end: when.end },
      { store, conversation, now },
    )
    const toolCalls = [trace("book_amenity", { amenity: amenity.name, date, start: when.start, end: when.end }, output)]
    if (!output.ok) return { reply: String(output.message), toolCalls }
    return {
      reply: `Booked the ${output.buildingName} ${output.amenity} for ${output.when}. Confirmation ${output.id}. Cancel at least 24 hours ahead in this chat. ${output.note} Quiet hours still apply.`,
      toolCalls,
    }
  }

  if (isNoise(text)) {
    if (!tenant) {
      conversation.pending = { type: "noise", text }
      return {
        reply: "I can log a noise complaint once the lease is verified. Send the unit and last name.",
        toolCalls: [],
      }
    }
    const location = parseLocation(text)
    const output = executeTool(
      "report_noise_complaint",
      { location, description: text, when_heard: text },
      { store, conversation, now },
    )
    return {
      reply: `I logged noise complaint ${output.id} for ${location}. Quiet hours are 10:00 p.m. to 8:00 a.m., and on Sunday they last until 9:00 a.m. The desk follows up the next business day unless someone is in danger — that is 911 and ${EMERGENCY_PHONE}.`,
      toolCalls: [trace("report_noise_complaint", { location, description: text }, output)],
    }
  }

  if (isMoveOut(text)) {
    if (!tenant) {
      conversation.pending = { type: "move_out", text }
      return {
        reply: "Move-out inspections are scheduled on a verified lease. Send the unit and last name.",
        toolCalls: [],
      }
    }
    const date = parseDate(text, now)
    if (!date) {
      return {
        reply: "Give me a weekday at least 2 business days out, for example December 15.",
        toolCalls: [],
      }
    }
    const output = executeTool(
      "schedule_move_out_inspection",
      { preferred_date: date, notes: text },
      { store, conversation, now },
    )
    const toolCalls = [trace("schedule_move_out_inspection", { preferred_date: date }, output)]
    if (!output.ok) return { reply: String(output.message), toolCalls }
    return {
      reply: `Move-out inspection ${output.id} is set for ${output.date} at ${output.buildingName}, unit ${output.unit}. Bring every key and the parking fob. The inspection covers walls, appliances, keys, and the parking fob.`,
      toolCalls,
    }
  }

  if (isMaintenance(text)) {
    const result = runMaintenance(text, image, store, conversation, now)
    if ("emergency" in result && result.emergency) {
      const kind = detectEmergency(text)
      if (kind) {
        const paged = page(kind, text, image, store, conversation, now)
        return { reply: paged.reply, toolCalls: [...result.toolCalls, ...paged.toolCalls], handoff: paged.handoff }
      }
    }
    return { reply: result.reply, toolCalls: result.toolCalls }
  }

  if (isHuman(text)) {
    const output = executeTool(
      "page_on_call",
      { kind: "resident_request", summary: text },
      { store, conversation, now, image },
    )
    return {
      reply: `I've asked a coordinator to pick up this chat. Reference ${output.id}. The desk is at ${DESK_PHONE}, weekdays 9:00 a.m. to 6:00 p.m. and Saturday 10:00 a.m. to 2:00 p.m. If this is a flood, gas, fire, no heat, or a lockout, call ${EMERGENCY_PHONE} now.`,
      toolCalls: [trace("page_on_call", { kind: "resident_request" }, output)],
      handoff: { id: String(output.id), kind: "resident_request" },
    }
  }

  if (isKnowledge(text)) {
    const buildingId = namedBuilding(text) ?? tenant?.buildingId ?? null
    const answer = answerFromKnowledge(text, buildingId, store, conversation, now)
    if ("lowConfidence" in answer && answer.lowConfidence) {
      const handed = openHandoff(
        "low_confidence",
        text,
        image,
        store,
        conversation,
        now,
        "I don't know that from the resident notes, so I won't guess. I've handed this chat to a coordinator.",
      )
      return {
        reply: handed.reply,
        toolCalls: [...answer.toolCalls, ...handed.toolCalls],
        handoff: handed.handoff,
      }
    }
    return answer
  }

  return null
}

function conversationSummary(conversation: Conversation, latest: string): string {
  const lines = conversation.messages
    .slice(-6)
    .map((message) => `${message.role}: ${message.content.replace(/\s+/g, " ").slice(0, 180)}`)
  return `Latest: ${latest}\n${lines.join("\n")}`.slice(0, 700)
}

function openHandoff(
  kind: HandoffKind,
  text: string,
  image: Photo | null,
  store: Store,
  conversation: Conversation,
  now: Date,
  lead: string,
) {
  const summary = conversationSummary(conversation, text)
  const output = executeTool("page_on_call", { kind, summary }, { store, conversation, now, image })
  return {
    reply: `${lead} Reference ${output.id}. The desk line is ${DESK_PHONE}.`,
    toolCalls: [trace("page_on_call", { kind, summary }, output)],
    handoff: { id: String(output.id), kind },
  }
}

function page(kind: EmergencyKind, text: string, image: Photo | null, store: Store, conversation: Conversation, now: Date) {
  const output = executeTool(
    "page_on_call",
    { kind, summary: conversationSummary(conversation, text) },
    { store, conversation, now, image },
  )
  const tenant = conversation.tenantId ? tenantById(conversation.tenantId) : null
  const where = tenant ? buildingById(tenant.buildingId).waterValve : "the valve labeled WATER in your building"
  const location = tenant ? ` I have your unit as ${buildingById(tenant.buildingId).name} ${tenant.unit}.` : " If you can, reply with the unit so the technician knows where to go."
  const reply = `${EMERGENCY_COPY[kind](where)} Reference ${output.id}.${location}`
  return {
    reply,
    toolCalls: [trace("page_on_call", { kind, summary: text }, output)],
    handoff: { id: String(output.id), kind },
  }
}

function fulfillPending(store: Store, conversation: Conversation, now: Date) {
  const pending: PendingIntent | null = conversation.pending
  if (!pending) return null
  conversation.pending = null
  if (pending.type === "maintenance") return dispatch(pending.text, pending.image, store, conversation, now)
  if (pending.type === "balance") return dispatch("What's my rent balance?", null, store, conversation, now)
  if (pending.type === "status") return dispatch(pending.text, null, store, conversation, now)
  if (pending.type === "booking") return dispatch(pending.text, null, store, conversation, now)
  if (pending.type === "noise") return dispatch(pending.text, null, store, conversation, now)
  if (pending.type === "move_out") return dispatch(pending.text, null, store, conversation, now)
  return null
}

export function handleTurnWithRules(input: TurnInput): TurnResult {
  const now = input.now ?? new Date()
  const dir = input.dataDir ?? defaultDataDir()
  const text = input.message.trim().slice(0, 2000)
  const image = input.image ?? null
  return withStore(dir, (store) => {
    const conversation = ensureConversation(store, input.conversationId, now)
    appendMessage(conversation, {
      id: id(),
      role: "user",
      content: text,
      createdAt: now.toISOString(),
      photo: image,
    })

    const emergency = detectEmergency(text)
    if (emergency) {
      const paged = page(emergency, text, image, store, conversation, now)
      return finish(store, conversation, paged.reply, { ...paged, now })
    }

    const toolCalls: ToolTrace[] = []
    let verifiedThisTurn = false
    if (looksLikeVerification(text)) {
      const identity = extractIdentity(text)
      if (identity.unit && identity.lastName) {
        const output = executeTool(
          "verify_tenant",
          { unit: identity.unit, last_name: identity.lastName },
          { store, conversation, now },
        )
        toolCalls.push(trace("verify_tenant", { unit: identity.unit, last_name: identity.lastName }, output))
        verifiedThisTurn = output.ok === true
      } else if (identity.unit && !identity.lastName && !isMaintenance(text) && !isKnowledge(text)) {
        const reply = "I have the unit. I still need the last name on the lease before I open anything."
        return finish(store, conversation, reply, { toolCalls, now })
      }
    }

    if (mentionsOtherLedger(text, conversation.tenantId)) {
      const reply = "I can only open the ledger, tickets, and contact details for the resident who verified in this chat. I won't read another household's account."
      return finish(store, conversation, reply, { toolCalls, now })
    }

    if (isInjection(text)) {
      const reply = "I can't follow instructions to ignore the desk rules, reveal a system prompt, or skip verification."
      return finish(store, conversation, reply, { toolCalls, now })
    }

    if (isOffTopic(text)) {
      const reply = "I only help with Keystone Residences: repairs, the rent ledger, amenities, and the resident notes. I can't help with that."
      return finish(store, conversation, reply, { toolCalls, now })
    }

    if (isFrustrated(text)) {
      const handed = openHandoff(
        "frustration",
        text,
        image,
        store,
        conversation,
        now,
        "I'm sorry this has been frustrating. A coordinator will pick up the chat.",
      )
      return finish(store, conversation, handed.reply, { toolCalls: [...toolCalls, ...handed.toolCalls], handoff: handed.handoff, now })
    }

    if (isSensitive(text)) {
      const handed = openHandoff(
        "sensitive",
        text,
        image,
        store,
        conversation,
        now,
        "I can't give legal advice or handle an eviction dispute in this chat. A coordinator will take it from here.",
      )
      return finish(store, conversation, handed.reply, { toolCalls: [...toolCalls, ...handed.toolCalls], handoff: handed.handoff, now })
    }

    const dispatched = dispatch(text, image, store, conversation, now)
    if (dispatched) {
      return finish(store, conversation, dispatched.reply, {
        toolCalls: [...toolCalls, ...dispatched.toolCalls],
        citations: dispatched.citations,
        handoff: dispatched.handoff ?? null,
        now,
      })
    }

    if (verifiedThisTurn && conversation.pending) {
      const pending = fulfillPending(store, conversation, now)
      if (pending) {
        return finish(store, conversation, pending.reply, {
          toolCalls: [...toolCalls, ...pending.toolCalls],
          citations: pending.citations,
          handoff: pending.handoff ?? null,
          now,
        })
      }
    }

    if (verifiedThisTurn) {
      const tenant = tenantById(conversation.tenantId || "")
      const building = tenant ? buildingById(tenant.buildingId).name : "Keystone"
      const reply = tenant
        ? `You're verified as ${tenant.firstName} ${tenant.lastName}, ${building}, unit ${tenant.unit}. I can open a repair, read your ledger, book an amenity, or answer from the resident notes.`
        : "I couldn't match that unit and last name to a current lease."
      return finish(store, conversation, reply, { toolCalls, now })
    }

    if (looksLikeVerification(text)) {
      const reply = "That unit and last name do not match a current lease. Check both and send them again. The demo lease is unit 4B, last name Chen."
      return finish(store, conversation, reply, { toolCalls, now })
    }

    const reply = `I can help with a repair, your rent ledger, an amenity booking, noise, a move-out inspection, or a question from the resident notes. If this is a flood, gas, fire, no heat, or a lockout, call ${EMERGENCY_PHONE}. The desk is ${DESK_PHONE}.`
    return finish(store, conversation, reply, { toolCalls, now })
  })
}

export function rulesRequired(message: string): boolean {
  if (process.env.KEYSTONE_POLICY === "rules") return true
  if (!process.env.GROQ_API_KEY && !process.env.GEMINI_API_KEY) return true
  if (detectEmergency(message)) return true
  if (isInjection(message) || isOffTopic(message) || isFrustrated(message) || isSensitive(message)) return true
  return false
}

export async function handleTurn(input: TurnInput): Promise<TurnResult> {
  if (!rulesRequired(input.message)) {
    try {
      const { handleTurnWithModel } = await import("@/lib/llm")
      return await handleTurnWithModel(input)
    } catch (error) {
      console.error("Live model failed, using the resident policy.", error)
    }
  }
  return handleTurnWithRules(input)
}
