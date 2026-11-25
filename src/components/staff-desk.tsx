"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { TECHNICIANS, buildingById } from "@/lib/catalog"
import { formatWhen, priorityLabel } from "@/lib/format"
import type { Conversation, Handoff, Inspection, NoiseComplaint, Ticket, TicketStatus } from "@/lib/types"

type Board = {
  tickets: Ticket[]
  handoffs: Handoff[]
  conversations: Conversation[]
  complaints: NoiseComplaint[]
  inspections: Inspection[]
}

const COLUMNS: Array<{ id: TicketStatus; label: string }> = [
  { id: "open", label: "Open" },
  { id: "assigned", label: "Assigned" },
  { id: "done", label: "Done" },
]

function tenantLabel(tenantId: string | null) {
  if (tenantId === "ten_chen") return "Maya Chen · Alden 4B"
  if (tenantId === "ten_okonkwo") return "James Okonkwo · Birch 12"
  if (tenantId === "ten_shah") return "Priya Shah · Harbor 308"
  return "Unverified resident"
}

export function StaffDesk() {
  const router = useRouter()
  const [board, setBoard] = useState<Board | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"tickets" | "conversations" | "handoffs">("tickets")
  const [selected, setSelected] = useState<Ticket | null>(null)
  const [activeConversation, setActiveConversation] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const response = await fetch("/api/admin/board", { cache: "no-store" })
      if (response.status === 401) {
        router.refresh()
        return
      }
      if (!response.ok) {
        setError("The board didn't load. Refresh the page.")
        return
      }
      const payload = (await response.json()) as Board
      setBoard(payload)
      setActiveConversation((current) => current ?? payload.conversations[0]?.id ?? null)
    } catch {
      setError("The board didn't load. Check the connection and refresh.")
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  async function patchTicket(id: string, body: { status?: TicketStatus; assignee?: string | null }) {
    const response = await fetch(`/api/admin/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      setError("That ticket didn't update.")
      return
    }
    const updated = (await response.json()) as Ticket
    setSelected((current) => (current?.id === updated.id ? updated : current))
    await load()
  }

  async function acknowledge(id: string) {
    const response = await fetch(`/api/admin/handoffs/${id}`, { method: "POST" })
    if (!response.ok) {
      setError("That page didn't acknowledge.")
      return
    }
    await load()
  }

  async function signOut() {
    await fetch("/api/admin/logout", { method: "POST" })
    router.refresh()
  }

  async function resetDemo() {
    const response = await fetch("/api/admin/reset", { method: "POST" })
    if (!response.ok) {
      setError("The demo data didn't reset.")
      return
    }
    setSelected(null)
    await load()
  }

  const paging = board?.handoffs.filter((handoff) => handoff.status === "paging").length ?? 0

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-wide text-copper uppercase">Keystone staff</p>
          <h1 className="text-3xl">Maintenance board</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void resetDemo()}>
            Restore demo data
          </Button>
          <Button variant="outline" onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Open tickets" value={board?.tickets.filter((ticket) => ticket.status === "open").length ?? "—"} />
        <Stat label="On-call pages" value={paging} warn={paging > 0} />
        <Stat label="Resident chats" value={board?.conversations.length ?? "—"} />
      </div>

      <div className="mt-5 flex gap-2" role="tablist">
        {(
          [
            ["tickets", "Tickets"],
            ["conversations", "Conversations"],
            ["handoffs", "Handoffs"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`rounded-lg px-3 py-2 text-sm ${tab === id ? "bg-primary text-primary-foreground" : "bg-card text-foreground ring-1 ring-border"}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {loading ? <p className="mt-6 text-sm text-muted-foreground">Loading the desk…</p> : null}

      {tab === "tickets" && board ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {COLUMNS.map((column) => {
            const tickets = board.tickets.filter((ticket) => ticket.status === column.id)
            return (
              <section
                key={column.id}
                className="min-h-64 rounded-2xl bg-muted/70 p-3"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault()
                  const id = event.dataTransfer.getData("text/plain")
                  if (!id) return
                  const assignee = column.id === "assigned" ? TECHNICIANS[0] : undefined
                  void patchTicket(id, { status: column.id, assignee: column.id === "open" ? null : assignee })
                }}
              >
                <h2 className="px-1 text-lg">
                  {column.label} <span className="text-sm text-muted-foreground">{tickets.length}</span>
                </h2>
                <div className="mt-2 space-y-2">
                  {tickets.length === 0 ? <p className="px-1 text-sm text-muted-foreground">Nothing in this column.</p> : null}
                  {tickets.map((ticket) => (
                    <article
                      key={ticket.id}
                      draggable
                      onDragStart={(event) => event.dataTransfer.setData("text/plain", ticket.id)}
                      className="cursor-grab rounded-xl bg-card p-3 ring-1 ring-border"
                    >
                      <button type="button" className="w-full text-left" onClick={() => setSelected(ticket)}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{ticket.id}</span>
                          <PriorityBadge priority={ticket.priority} />
                        </div>
                        <p className="mt-1 text-sm">{ticket.description}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {tenantLabel(ticket.tenantId)} · {ticket.category}
                          {ticket.assignee ? ` · ${ticket.assignee}` : ""}
                        </p>
                      </button>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {column.id !== "assigned" ? (
                          <Button size="sm" variant="outline" onClick={() => void patchTicket(ticket.id, { status: "assigned", assignee: TECHNICIANS[0] })}>
                            Assign
                          </Button>
                        ) : null}
                        {column.id !== "done" ? (
                          <Button size="sm" variant="outline" onClick={() => void patchTicket(ticket.id, { status: "done" })}>
                            Done
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => void patchTicket(ticket.id, { status: "open", assignee: null })}>
                            Reopen
                          </Button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      ) : null}

      {tab === "conversations" && board ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-[240px_1fr]">
          <div className="space-y-2">
            {board.conversations.length === 0 ? <p className="text-sm text-muted-foreground">No resident chats yet.</p> : null}
            {board.conversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => setActiveConversation(conversation.id)}
                className={`w-full rounded-xl px-3 py-2 text-left text-sm ring-1 ring-border ${
                  activeConversation === conversation.id ? "bg-primary text-primary-foreground" : "bg-card"
                }`}
              >
                <span className="block font-medium">{tenantLabel(conversation.tenantId)}</span>
                <span className="mt-1 block line-clamp-2 text-xs opacity-80">
                  {conversation.messages.at(-1)?.content ?? "Empty chat"}
                </span>
                {conversation.handoffIds.length > 0 ? <span className="mt-1 block text-xs">Handoff</span> : null}
              </button>
            ))}
          </div>
          <ConversationPane
            conversation={board.conversations.find((conversation) => conversation.id === activeConversation) ?? null}
            complaints={board.complaints}
            inspections={board.inspections}
          />
        </div>
      ) : null}

      {tab === "handoffs" && board ? (
        <div className="mt-4 space-y-3">
          {board.handoffs.length === 0 ? <p className="text-sm text-muted-foreground">No on-call pages.</p> : null}
          {board.handoffs.map((handoff) => (
            <article key={handoff.id} className="rounded-2xl bg-card p-4 ring-1 ring-border">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {handoff.id} · {handoff.kind.replaceAll("_", " ")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {tenantLabel(handoff.tenantId)}
                    {handoff.buildingId ? ` · ${buildingById(handoff.buildingId).name}` : ""} · {formatWhen(handoff.createdAt)}
                  </p>
                </div>
                <Badge variant={handoff.status === "paging" ? "destructive" : "secondary"}>{handoff.status}</Badge>
              </div>
              <p className="mt-2 text-sm">{handoff.summary}</p>
              {handoff.status === "paging" ? (
                <Button className="mt-3" size="sm" onClick={() => void acknowledge(handoff.id)}>
                  Acknowledge
                </Button>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selected.id} · {priorityLabel(selected.priority)}
                </DialogTitle>
                <DialogDescription>{tenantLabel(selected.tenantId)}</DialogDescription>
              </DialogHeader>
              <p className="text-sm">{selected.description}</p>
              <p className="text-sm text-muted-foreground">{selected.rationale}</p>
              <p className="text-sm">ETA: {selected.etaLabel}</p>
              <p className="text-sm">Entry: {selected.entryPermission}</p>
              <label className="block text-sm" htmlFor="assignee">
                Technician
                <select
                  id="assignee"
                  className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-2"
                  value={selected.assignee ?? ""}
                  onChange={(event) => {
                    const assignee = event.target.value || null
                    void patchTicket(selected.id, {
                      assignee,
                      status: assignee ? "assigned" : "open",
                    })
                  }}
                >
                  <option value="">Unassigned</option>
                  {TECHNICIANS.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              {selected.photo ? (
                // Resident-uploaded data URL stored on the ticket.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selected.photo.dataUrl} alt="Photo on the maintenance ticket" className="max-h-64 rounded-lg" />
              ) : (
                <p className="text-sm text-muted-foreground">No photo on this ticket.</p>
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Stat({ label, value, warn = false }: { label: string; value: number | string; warn?: boolean }) {
  return (
    <div className={`rounded-2xl bg-card p-4 ring-1 ${warn ? "ring-copper" : "ring-border"}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-heading text-3xl">{value}</p>
    </div>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const variant = priority === "urgent" ? "destructive" : priority === "low" ? "secondary" : "outline"
  return <Badge variant={variant}>{priority}</Badge>
}

function ConversationPane({
  conversation,
  complaints,
  inspections,
}: {
  conversation: Conversation | null
  complaints: NoiseComplaint[]
  inspections: Inspection[]
}) {
  if (!conversation) return <p className="text-sm text-muted-foreground">Select a chat.</p>
  const mineComplaints = complaints.filter((item) => item.tenantId === conversation.tenantId)
  const mineInspections = inspections.filter((item) => item.tenantId === conversation.tenantId)
  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
      <h2 className="text-xl">{tenantLabel(conversation.tenantId)}</h2>
      <div className="mt-3 max-h-[32rem] space-y-3 overflow-y-auto">
        {conversation.messages.map((message) => (
          <article key={message.id} className="text-sm">
            <p className="text-xs text-muted-foreground">{message.role === "user" ? "Resident" : "Desk"}</p>
            <p className="whitespace-pre-wrap">{message.content}</p>
          </article>
        ))}
      </div>
      {mineComplaints.length > 0 ? (
        <p className="mt-4 text-sm">Noise: {mineComplaints.map((item) => item.id).join(", ")}</p>
      ) : null}
      {mineInspections.length > 0 ? (
        <p className="mt-1 text-sm">
          Move-out: {mineInspections.map((item) => `${item.id} on ${item.date}`).join(", ")}
        </p>
      ) : null}
    </div>
  )
}
