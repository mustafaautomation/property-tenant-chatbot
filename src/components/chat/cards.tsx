"use client"

import { useId, useState, type FormEvent, type MouseEvent, type ReactNode } from "react"
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Copy, FileText } from "lucide-react"
import { AMENITIES, BUILDINGS, DESK_PHONE, EMERGENCY_PHONE } from "@/lib/catalog"
import type { CardSpec } from "@/lib/cards"
import type { SlotOffer } from "@/lib/slots"
import { BRAND } from "@/lib/brand"

const MOVE_IN = [
  "Lease is signed",
  "Renter's insurance is on file",
  "First month and any pet fee are paid",
  "Walk the unit with the condition form and photograph marks",
  "Test the stove, refrigerator, sinks, and heat or air",
  "Register pets and vehicles the same day",
]

export function RichCards({
  cards,
  slots,
  active,
  onSend,
  onLead,
}: {
  cards: CardSpec[]
  slots: SlotOffer | null
  active: boolean
  onSend: (text: string) => void
  onLead: () => void
}) {
  return (
    <div className="mt-3 space-y-3">
      {cards.map((card, index) => (
        <CardView key={`${card.type}-${index}`} card={card} slots={slots} active={active} onSend={onSend} onLead={onLead} />
      ))}
    </div>
  )
}

function CardView(props: {
  card: CardSpec
  slots: SlotOffer | null
  active: boolean
  onSend: (text: string) => void
  onLead: () => void
}) {
  const { card } = props
  if (card.type === "form") return <TicketForm active={props.active} onSend={props.onSend} />
  if (card.type === "confirm") return <ConfirmCard card={card} onLead={props.onLead} />
  if (card.type === "timeline") return <TimelineCard card={card} />
  if (card.type === "rent") return <RentCard card={card} />
  if (card.type === "booking") return <SlotCard slots={props.slots} active={props.active} onSend={props.onSend} />
  if (card.type === "amenity") return <AmenityCard onSend={props.onSend} active={props.active} />
  if (card.type === "buildings") return <BuildingCarousel />
  if (card.type === "checklist") return <ChecklistCard />
  if (card.type === "emergency") return <EmergencyCard card={card} />
  if (card.type === "handoff") return <HandoffCard card={card} />
  return null
}

function Shell({ children, testId, className = "" }: { children: ReactNode; testId?: string; className?: string }) {
  return (
    <section
      data-testid={testId}
      className={`rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-3 text-[14px] leading-5 shadow-[var(--shadow-card)] dark:border-white/15 ${className}`}
    >
      {children}
    </section>
  )
}

function TicketForm({ active, onSend }: { active: boolean; onSend: (text: string) => void }) {
  const base = useId()
  const [unit, setUnit] = useState("4B")
  const [lastName, setLastName] = useState("Chen")
  const [category, setCategory] = useState<"plumbing" | "hvac" | "electric" | "other">("plumbing")
  const [details, setDetails] = useState("")
  const [entry, setEntry] = useState<"enter" | "call">("call")
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!active || sent) return
    if (!unit.trim() || !lastName.trim() || details.trim().length < 3) {
      setError("Add the unit, last name, and a short description.")
      return
    }
    setError(null)
    const permission = entry === "enter" ? "You can enter if I'm out." : "Call first. I'll be home."
    const noun = category === "electric" ? "electrical" : category === "hvac" ? "HVAC" : category
    onSend(
      `I'm in unit ${unit.trim()}, last name ${lastName.trim()}. ${details.trim()} This is a ${noun} repair. ${permission}`,
    )
    setSent(true)
  }

  if (sent || !active) {
    return (
      <Shell testId="card-form">
        <p className="font-medium">Maintenance request</p>
        <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
          {sent ? `${category} · unit ${unit} · ${lastName}` : "This request was already sent."}
        </p>
      </Shell>
    )
  }

  return (
    <Shell testId="card-form">
      <p className="font-semibold">Maintenance ticket</p>
      <p className="mt-1 text-[12px] text-[var(--muted-foreground)]">Unit, category, and permission to enter. Photos stay in this session.</p>
      <form className="mt-3 space-y-3" onSubmit={submit}>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[12px] font-medium" htmlFor={`${base}-unit`}>
            Unit
            <input id={`${base}-unit`} value={unit} onChange={(event) => setUnit(event.target.value)} className="mt-1 h-10 w-full rounded-[12px] border border-[var(--border)] bg-[var(--surface-2)] px-3" />
          </label>
          <label className="text-[12px] font-medium" htmlFor={`${base}-name`}>
            Last name
            <input id={`${base}-name`} value={lastName} onChange={(event) => setLastName(event.target.value)} className="mt-1 h-10 w-full rounded-[12px] border border-[var(--border)] bg-[var(--surface-2)] px-3" />
          </label>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Category">
          {(["plumbing", "hvac", "electric", "other"] as const).map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
              className={`h-9 rounded-full border px-3 text-[13px] font-medium ${category === item ? "border-transparent bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--border)]"}`}
            >
              {item === "hvac" ? "HVAC" : item}
            </button>
          ))}
        </div>
        <label className="block text-[12px] font-medium" htmlFor={`${base}-details`}>
          What should the tech know?
          <textarea id={`${base}-details`} value={details} onChange={(event) => setDetails(event.target.value)} rows={2} placeholder="Kitchen sink is dripping under the basin." className="mt-1 w-full resize-none rounded-[12px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2" />
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={entry === "enter"} onClick={() => setEntry("enter")} className={`h-9 rounded-full border px-3 text-[13px] ${entry === "enter" ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--border)]"}`}>
            OK to enter
          </button>
          <button type="button" aria-pressed={entry === "call"} onClick={() => setEntry("call")} className={`h-9 rounded-full border px-3 text-[13px] ${entry === "call" ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--border)]"}`}>
            Call first
          </button>
        </div>
        {error ? (
          <p className="flex items-center gap-1 text-[12px] text-[var(--danger)]" role="alert">
            <AlertTriangle className="size-3.5" aria-hidden="true" /> {error}
          </p>
        ) : null}
        <button type="submit" className="inline-flex h-11 min-h-11 items-center rounded-[14px] bg-[var(--accent)] px-4 text-[13px] font-medium text-[var(--accent-foreground)]">
          Open the ticket
        </button>
      </form>
    </Shell>
  )
}

function ConfirmCard({ card, onLead }: { card: Extract<CardSpec, { type: "confirm" }>; onLead: () => void }) {
  const [copied, setCopied] = useState(false)
  return (
    <Shell testId="card-confirm">
      <div className="flex items-start gap-3">
        <span className="grid size-8 place-items-center rounded-full bg-[color-mix(in_srgb,var(--success)_16%,transparent)] text-[var(--success)]">
          <Check className="size-4" aria-hidden="true" />
        </span>
        <div>
          <p className="font-semibold">{card.title}</p>
          <p className="font-mono text-[13px] tabular-nums">{card.id}</p>
        </div>
      </div>
      <dl className="mt-3 space-y-1.5">
        {card.rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-3 text-[13px]">
            <dt className="text-[var(--muted-foreground)]">{row.label}</dt>
            <dd className="text-right">{row.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="inline-flex h-11 items-center gap-1 rounded-[14px] border border-[var(--border)] px-3 text-[13px]"
          onClick={() => {
            void navigator.clipboard?.writeText(card.id)
            setCopied(true)
            window.setTimeout(() => setCopied(false), 2000)
          }}
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {copied ? "Copied" : "Copy code"}
        </button>
        <button type="button" className="inline-flex h-11 items-center rounded-[14px] px-3 text-[13px] underline" onClick={onLead}>
          Talk to a person
        </button>
      </div>
    </Shell>
  )
}

function TimelineCard({ card }: { card: Extract<CardSpec, { type: "timeline" }> }) {
  return (
    <Shell testId="card-timeline">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">Ticket {card.id}</p>
        <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[11.5px] font-medium text-[var(--accent)]">{card.status}</span>
      </div>
      <ol className="mt-3 space-y-3 border-l-2 border-[var(--muted)] pl-3">
        {card.steps.map((step) => (
          <li key={step.title} className="relative">
            <span
              className={`absolute -left-[17px] top-1 size-3 rounded-full border-2 border-[var(--surface)] ${step.state === "upcoming" ? "bg-[var(--muted)]" : step.state === "current" ? "bg-[var(--accent)]" : "bg-[var(--success)]"}`}
              aria-hidden="true"
            />
            <p className="text-[14px] font-medium">{step.title}</p>
            <p className="text-[12px] text-[var(--muted-foreground)]">{step.meta}</p>
          </li>
        ))}
      </ol>
    </Shell>
  )
}

function RentCard({ card }: { card: Extract<CardSpec, { type: "rent" }> }) {
  const rows = [
    ["Monthly rent", card.rent.monthlyRent],
    ["Rent due", card.rent.rentDue],
    ["Late fee", card.rent.lateFee],
  ]
  return (
    <Shell testId="card-quote">
      <p className="font-semibold">Ledger · {card.rent.buildingName} {card.rent.unit}</p>
      <div className="mt-2 space-y-1">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between text-[13px]">
            <span>{label}</span>
            <span className="font-mono tabular-nums">{value}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between border-t border-[var(--border)] pt-2 text-[18px] font-semibold">
        <span>Total</span>
        <span className="font-mono tabular-nums">{card.rent.totalDue}</span>
      </div>
      <p className="mt-2 text-[11.5px] text-[var(--muted-foreground)]">Sample balance for this demo, not a bill.</p>
    </Shell>
  )
}

function SlotCard({ slots, active, onSend }: { slots: SlotOffer | null; active: boolean; onSend: (text: string) => void }) {
  const [picked, setPicked] = useState<string | null>(null)
  if (!slots) return null
  return (
    <Shell testId="card-booking">
      <p className="font-semibold">Open times · {slots.dateLabel}</p>
      <p className="mt-1 text-[12px] text-[var(--muted-foreground)]">Only times the booking system returned</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {slots.times.map((time) => (
          <button
            key={time.start}
            type="button"
            data-testid="slot-chip"
            disabled={!active || Boolean(picked)}
            onClick={() => {
              setPicked(time.label)
              const when = slots.dateLabel.replace(/^.*?,\s*/, "")
              onSend(`Book the ${slots.amenity} on ${when} from ${time.label} to ${endLabel(time.end)}`)
            }}
            className="h-9 rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] font-medium hover:bg-[var(--accent-soft)] disabled:opacity-60"
          >
            {time.label}
          </button>
        ))}
      </div>
      {picked ? <p className="mt-2 text-[12px] text-[var(--muted-foreground)]">Requested {picked}.</p> : null}
    </Shell>
  )
}

function endLabel(hhmm: string) {
  const [hourText, minuteText] = hhmm.split(":")
  const hour = Number(hourText)
  const suffix = hour >= 12 ? "p.m." : "a.m."
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  return `${hour12}:${minuteText} ${suffix}`
}

function AmenityCard({ active, onSend }: { active: boolean; onSend: (text: string) => void }) {
  return (
    <Shell testId="card-carousel">
      <p className="font-semibold">Desk hours</p>
      <p className="mt-1 text-[13px]">Weekdays 9:00 a.m.–6:00 p.m. · Saturday 10:00 a.m.–2:00 p.m.</p>
      <p className="font-mono text-[13px]">{DESK_PHONE}</p>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {AMENITIES.filter((item) => item.bookable).map((item) => (
          <article key={item.id} className="w-[220px] shrink-0 snap-start rounded-[12px] border border-[var(--border)] p-3">
            <p className="font-medium">{item.name}</p>
            <p className="text-[12px] text-[var(--muted-foreground)]">{BUILDINGS.find((building) => building.id === item.buildingId)?.name}</p>
            <p className="mt-1 font-mono text-[12px]">{item.open}–{item.close}</p>
            <button type="button" disabled={!active} className="mt-2 h-9 text-[13px] font-medium text-[var(--accent)] underline" onClick={() => onSend(`Book the ${item.name}`)}>
              See open times
            </button>
          </article>
        ))}
      </div>
    </Shell>
  )
}

function BuildingCarousel() {
  return (
    <Shell testId="card-carousel">
      <p className="font-semibold">Three buildings</p>
      <div className="relative mt-3">
        <div className="flex gap-3 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none]" data-carousel>
          {BUILDINGS.map((building) => (
            <article key={building.id} className="w-[230px] shrink-0 snap-start rounded-[12px] border border-[var(--border)] p-3 dark:border-white/15">
              <p className="text-[11px] tracking-wide text-[var(--muted-foreground)] uppercase">{building.kind}</p>
              <p className="mt-1 font-semibold">{building.name}</p>
              <p className="text-[12px] text-[var(--muted-foreground)]">{building.units} homes · {building.address}</p>
            </article>
          ))}
        </div>
        <button type="button" aria-label="Previous buildings" className="absolute top-6 -left-1 hidden size-7 place-items-center rounded-full border bg-[var(--surface)] md:grid" onClick={(event) => scrollCards(event, -1)}>
          <ChevronLeft className="size-4" />
        </button>
        <button type="button" aria-label="Next buildings" className="absolute top-6 -right-1 hidden size-7 place-items-center rounded-full border bg-[var(--surface)] md:grid" onClick={(event) => scrollCards(event, 1)}>
          <ChevronRight className="size-4" />
        </button>
      </div>
    </Shell>
  )
}

function scrollCards(event: MouseEvent<HTMLButtonElement>, direction: number) {
  const scroller = event.currentTarget.parentElement?.querySelector("[data-carousel]")
  if (scroller instanceof HTMLElement) scroller.scrollBy({ left: direction * 240, behavior: "smooth" })
}

function ChecklistCard() {
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  return (
    <Shell testId="card-checklist">
      <p className="font-semibold">Move-in checklist</p>
      <p className="mt-1 text-[12px] text-[var(--muted-foreground)]">From the resident notes. Check items as you go. This stays in the thread.</p>
      <ul className="mt-3 space-y-2">
        {MOVE_IN.map((item) => (
          <li key={item}>
            <label className="flex items-start gap-2 text-[13px]">
              <input
                type="checkbox"
                className="mt-0.5 size-4"
                checked={Boolean(checked[item])}
                onChange={() => setChecked((current) => ({ ...current, [item]: !current[item] }))}
              />
              <span>{item}</span>
            </label>
          </li>
        ))}
      </ul>
    </Shell>
  )
}

function EmergencyCard({ card }: { card: Extract<CardSpec, { type: "emergency" }> }) {
  const label = card.kind.replaceAll("_", " ")
  return (
    <Shell testId="urgent-banner" className="border-[var(--danger)]">
      <p className="flex items-center gap-2 font-semibold text-[var(--danger)]">
        <AlertTriangle className="size-4" aria-hidden="true" /> Urgent · {label}
      </p>
      <p className="mt-2 text-[13px]">This is not a routine ticket. Call {EMERGENCY_PHONE}. Reference <span className="font-mono">{card.id}</span>.</p>
      <a className="mt-3 inline-flex h-11 items-center rounded-[14px] bg-[var(--danger)] px-4 text-[13px] font-medium text-white" href="tel:5550192400">
        Call on-call
      </a>
    </Shell>
  )
}

function HandoffCard({ card }: { card: Extract<CardSpec, { type: "handoff" }> }) {
  return (
    <Shell>
      <p className="font-semibold">Connecting you with the Keystone desk</p>
      <p className="mt-1 text-[13px]">In this demo, the ticket appears in /admin. A specialist usually replies in a few minutes.</p>
      <p className="mt-2 font-mono text-[13px]">{card.id}</p>
    </Shell>
  )
}

export function LeadCard({ active, onSubmit }: { active: boolean; onSubmit: (summary: string) => void }) {
  const base = useId()
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  if (done) {
    return (
      <Shell testId="card-lead">
        <p className="font-semibold">Details saved for the team</p>
        <p className="mt-1 text-[13px]">{done}</p>
      </Shell>
    )
  }

  return (
    <Shell testId="card-lead">
      <p className="font-semibold">Leave contact details for the team</p>
      <form
        className="mt-3 space-y-2"
        onSubmit={(event) => {
          event.preventDefault()
          if (!active) return
          if (name.trim().length < 2 || phone.trim().length < 7 || !email.includes("@") || !consent) {
            setError("Name, a 555 phone, email, and consent are required.")
            return
          }
          const summary = `We'll use this callback number: ${phone.trim()}. ${name.trim()} · ${email.trim()}.`
          setDone(summary)
          onSubmit(`Please reach ${name.trim()} at ${phone.trim()}, email ${email.trim()}. Consent to be contacted: yes.`)
        }}
      >
        <label className="block text-[12px] font-medium" htmlFor={`${base}-name`}>
          Name
          <input id={`${base}-name`} value={name} onChange={(event) => setName(event.target.value)} placeholder="Maya Chen" className="mt-1 h-10 w-full rounded-[12px] border border-[var(--border)] bg-[var(--surface-2)] px-3" />
        </label>
        <label className="block text-[12px] font-medium" htmlFor={`${base}-phone`}>
          Phone
          <input id={`${base}-phone`} value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="(555) 010-0140" className="mt-1 h-10 w-full rounded-[12px] border border-[var(--border)] bg-[var(--surface-2)] px-3" />
        </label>
        <label className="block text-[12px] font-medium" htmlFor={`${base}-email`}>
          Email
          <input id={`${base}-email`} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="maya.chen@example.com" className="mt-1 h-10 w-full rounded-[12px] border border-[var(--border)] bg-[var(--surface-2)] px-3" />
        </label>
        <label className="flex items-start gap-2 text-[12px]">
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
          The desk may use these demo details to follow up. This is not a real landlord.
        </label>
        {error ? (
          <p role="alert" className="flex items-center gap-1 text-[12px] text-[var(--danger)]">
            <AlertTriangle className="size-3.5" /> {error}
          </p>
        ) : null}
        <button type="submit" className="inline-flex h-11 items-center rounded-[14px] bg-[var(--accent)] px-4 text-[13px] font-medium text-[var(--accent-foreground)]">
          Save for the team
        </button>
      </form>
    </Shell>
  )
}

export function CitationRow({ citations }: { citations: Array<{ slug: string; title: string; excerpt: string }> }) {
  const [open, setOpen] = useState<string | null>(null)
  if (citations.length === 0) return null
  return (
    <div className="mt-3">
      <p className="text-[11.5px] text-[var(--muted-foreground)]">Source:</p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {citations.slice(0, 3).map((citation) => (
          <div key={citation.slug + citation.title} className="relative">
            <button
              type="button"
              data-testid="citation-chip"
              className="inline-flex h-7 items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 text-[11.5px]"
              aria-expanded={open === citation.title}
              onClick={() => setOpen((current) => (current === citation.title ? null : citation.title))}
              onFocus={() => setOpen(citation.title)}
              onBlur={(event) => {
                if (!event.currentTarget.parentElement?.contains(event.relatedTarget)) setOpen(null)
              }}
            >
              {citation.title.split("—")[0]?.trim() || citation.title}
            </button>
            {open === citation.title ? (
              <div data-testid="citation-preview" role="dialog" aria-label={citation.title} className="absolute z-10 mt-1 w-64 rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-card)]">
                <p className="text-[14px] font-semibold">{citation.title}</p>
                <p className="mt-1 line-clamp-3 text-[13px]">{citation.excerpt}</p>
                <a className="mt-2 inline-block text-[13px] text-[var(--accent)] underline" href={`/kb/${citation.slug}`} target="_blank" rel="noreferrer">
                  Open source <span className="sr-only">(opens in a new tab)</span>
                </a>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}

export function ToolRows({ calls }: { calls: Array<{ name: string; output: Record<string, unknown> }> }) {
  if (calls.length === 0) return null
  return (
    <div className="mt-2 space-y-1.5">
      {calls.map((call, index) => (
        <details key={`${call.name}-${index}`} className="rounded-[12px] border border-[var(--border)] px-3 py-2 text-[13px]">
          <summary className="flex cursor-pointer list-none items-center justify-between">
            <span>{call.name.replaceAll("_", " ")}</span>
            <span className="text-[11.5px] text-[var(--muted-foreground)]">{call.output.ok === false ? "Failed" : "Done"}</span>
          </summary>
        </details>
      ))}
    </div>
  )
}

export function brandFooterNote() {
  return BRAND.disclaimer
}

export function FileGlyph() {
  return <FileText className="size-4" aria-hidden="true" />
}
