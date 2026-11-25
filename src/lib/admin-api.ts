import { NextResponse } from "next/server"
import { requestHasDeskSession } from "@/lib/auth"
import { defaultDataDir, loadStore, resetStore, saveStore } from "@/lib/store"
import type { Ticket, TicketStatus } from "@/lib/types"

export function unauthorized() {
  return NextResponse.json({ error: "Sign in to the desk." }, { status: 401 })
}

export function requireDesk(request: Request) {
  if (!requestHasDeskSession(request)) return unauthorized()
  return null
}

export function boardPayload() {
  const store = loadStore(defaultDataDir())
  return {
    tickets: store.tickets,
    handoffs: store.handoffs,
    conversations: store.conversations,
    complaints: store.complaints,
    inspections: store.inspections,
  }
}

const STATUSES = new Set<TicketStatus>(["open", "assigned", "done"])

export function updateTicket(id: string, body: { status?: unknown; assignee?: unknown }) {
  const dir = defaultDataDir()
  const store = loadStore(dir)
  const ticket = store.tickets.find((item) => item.id === id)
  if (!ticket) return null
  if (typeof body.status === "string" && STATUSES.has(body.status as TicketStatus)) {
    ticket.status = body.status as TicketStatus
  }
  if (body.assignee === null) ticket.assignee = null
  if (typeof body.assignee === "string") ticket.assignee = body.assignee.slice(0, 80)
  if (ticket.status === "assigned" && !ticket.assignee) ticket.assignee = "Luis Ortega"
  if (ticket.status === "open") ticket.assignee = null
  ticket.updatedAt = new Date().toISOString()
  saveStore(dir, store)
  return ticket satisfies Ticket
}

export function acknowledgeHandoff(id: string) {
  const dir = defaultDataDir()
  const store = loadStore(dir)
  const handoff = store.handoffs.find((item) => item.id === id)
  if (!handoff) return null
  handoff.status = "acknowledged"
  handoff.acknowledgedAt = new Date().toISOString()
  saveStore(dir, store)
  return handoff
}

export function restoreDemo() {
  return resetStore(defaultDataDir())
}
