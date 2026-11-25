export type BuildingId = "alden" | "birch" | "harbor"

export type Priority = "urgent" | "high" | "normal" | "low"

export type TicketStatus = "open" | "assigned" | "done"

export type TicketCategory =
  | "plumbing"
  | "electrical"
  | "hvac"
  | "appliance"
  | "pest"
  | "locksmith"
  | "general"

export type EmergencyKind = "flooding" | "gas" | "fire" | "no_heat" | "lockout"

export type HandoffKind = EmergencyKind | "resident_request" | "frustration" | "low_confidence" | "sensitive"

export type HandoffStatus = "paging" | "acknowledged"

export type Pet = {
  type: "cat" | "dog"
  name: string
  weightLb?: number
}

export type Tenant = {
  id: string
  firstName: string
  lastName: string
  unit: string
  buildingId: BuildingId
  email: string
  phone: string
  leaseStart: string
  leaseEnd: string
  monthlyRentCents: number
  balanceCents: number
  lateFeeCents: number
  pets: Pet[]
  parking: string
}

export type Photo = {
  name: string
  mime: string
  dataUrl: string
}

export type Ticket = {
  id: string
  tenantId: string
  category: TicketCategory
  priority: Priority
  status: TicketStatus
  description: string
  entryPermission: string
  assignee: string | null
  etaLabel: string
  rationale: string
  photo: Photo | null
  createdAt: string
  updatedAt: string
}

export type Handoff = {
  id: string
  conversationId: string
  tenantId: string | null
  kind: HandoffKind
  summary: string
  status: HandoffStatus
  unit: string | null
  buildingId: BuildingId | null
  photo: Photo | null
  createdAt: string
  acknowledgedAt: string | null
}

export type Booking = {
  id: string
  tenantId: string
  amenityId: string
  date: string
  start: string
  end: string
  status: "booked" | "cancelled"
  createdAt: string
}

export type Inspection = {
  id: string
  tenantId: string
  date: string
  notes: string
  status: "scheduled"
  createdAt: string
}

export type NoiseComplaint = {
  id: string
  tenantId: string
  location: string
  description: string
  whenHeard: string
  createdAt: string
}

export type Citation = {
  slug: string
  title: string
  excerpt: string
}

export type ToolTrace = {
  name: string
  input: Record<string, unknown>
  output: Record<string, unknown>
}

export type ChatRole = "user" | "assistant"

export type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  createdAt: string
  toolCalls?: ToolTrace[]
  citations?: Citation[]
  handoffId?: string | null
  photo?: Photo | null
}

export type PendingIntent =
  | { type: "maintenance"; text: string; image: Photo | null }
  | { type: "balance" }
  | { type: "status"; text: string }
  | { type: "booking"; text: string }
  | { type: "noise"; text: string }
  | { type: "move_out"; text: string }

export type Conversation = {
  id: string
  createdAt: string
  updatedAt: string
  tenantId: string | null
  lastTicketId: string | null
  pending: PendingIntent | null
  messages: ChatMessage[]
  handoffIds: string[]
  botPaused?: boolean
}

export type Store = {
  seq: {
    ticket: number
    handoff: number
    booking: number
    inspection: number
    complaint: number
  }
  tickets: Ticket[]
  handoffs: Handoff[]
  bookings: Booking[]
  inspections: Inspection[]
  complaints: NoiseComplaint[]
  conversations: Conversation[]
}

export type PublicTenant = {
  id: string
  firstName: string
  lastName: string
  unit: string
  buildingId: BuildingId
  buildingName: string
}

export type TurnResult = {
  conversationId: string
  reply: string
  toolCalls: ToolTrace[]
  citations: Citation[]
  handoff: { id: string; kind: HandoffKind } | null
  tenant: PublicTenant | null
  ticket: { id: string; priority: Priority; etaLabel: string; status: TicketStatus } | null
  messages: ChatMessage[]
  source?: "model" | "rules"
  provider?: string
  model?: string
}
