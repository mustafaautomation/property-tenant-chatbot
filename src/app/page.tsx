import Link from "next/link"
import { BUILDINGS, DESK_PHONE, EMERGENCY_PHONE } from "@/lib/catalog"
import { SiteHeader } from "@/components/site-header"

const steps = [
  {
    title: "Verify the lease",
    copy: "Unit and last name. The desk will not open another household's ledger.",
  },
  {
    title: "Answer from the notes",
    copy: "Late fees, pets, parking, quiet hours, trash, and renewals are quoted from the resident notes.",
  },
  {
    title: "Triage the repair",
    copy: "A leaking sink becomes a ticket with a priority and an ETA. Flooding, gas, fire, no heat, and lockouts page on-call instead.",
  },
]

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main id="content">
        <section className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <p className="text-sm font-medium tracking-wide text-copper uppercase">Portfolio demo · fictional company</p>
            <h1 className="mt-3 max-w-xl text-4xl leading-tight text-balance sm:text-5xl">
              The resident desk for three buildings in Cedarhaven.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-muted-foreground">
              Keystone Residences keeps the lease, the ledger, and the on-call line in one chat. Ask about rent, book the rooftop, or tell the desk the kitchen sink is leaking.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/chat"
                className="inline-flex h-11 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Message the desk
              </Link>
              <Link
                href="/admin"
                className="inline-flex h-11 items-center rounded-lg border border-border bg-card px-4 text-sm font-medium hover:bg-muted"
              >
                Open the staff board
              </Link>
            </div>
          </div>
          <aside className="rounded-2xl border border-copper/40 bg-card p-5 shadow-sm">
            <p className="text-xs font-medium tracking-wide text-copper uppercase">On-call, day and night</p>
            <p className="mt-2 font-heading text-3xl text-foreground">
              <a href="tel:5550192400">{EMERGENCY_PHONE}</a>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Flooding, gas, fire, no heat when it is cold, and lockouts. Call this before you wait on a routine ticket. Desk line {DESK_PHONE}, weekdays 9:00 a.m. to 6:00 p.m.
            </p>
          </aside>
        </section>

        <section className="mx-auto grid max-w-6xl gap-4 px-4 sm:px-6 md:grid-cols-3">
          {BUILDINGS.map((building) => (
            <article key={building.id} className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs text-muted-foreground">{building.kind}</p>
              <h2 className="mt-1 text-2xl">{building.name}</h2>
              <p className="mt-2 text-sm text-foreground">{building.address}</p>
              <p className="mt-2 text-sm text-muted-foreground">{building.blurb}</p>
              <p className="mt-4 text-sm">{building.units} homes</p>
            </article>
          ))}
        </section>

        <section className="mx-auto mt-12 max-w-6xl px-4 sm:px-6">
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
            <p className="text-xs tracking-wide text-copper uppercase">Under the hood</p>
            <h2 className="mt-2 text-3xl">How a message moves</h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              The website, the embeddable widget, WhatsApp, and Messenger all call one desk. With no API key it follows a deterministic policy. With a free Groq or Gemini key, that same tool list is offered to the model, and emergencies still bypass it.
            </p>
            <div className="mt-6 grid gap-3 text-sm md:grid-cols-4">
              {[
                ["Channels", "Web chat, widget iframe, WhatsApp, Messenger"],
                ["Desk", "Guardrails, then Groq or the offline policy"],
                ["Notes and tools", "BM25 plus a local hash embedding, zod-checked tools"],
                ["Staff board", "Tickets, transcripts, and on-call handoffs"],
              ].map(([title, copy]) => (
                <div key={title} className="rounded-xl bg-muted p-4">
                  <p className="font-medium">{title}</p>
                  <p className="mt-1 text-muted-foreground">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto mt-12 grid max-w-6xl gap-4 px-4 sm:px-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <article key={step.title} className="rounded-2xl bg-primary px-5 py-6 text-primary-foreground">
              <p className="text-xs tracking-wide text-brass uppercase">0{index + 1}</p>
              <h2 className="mt-2 text-2xl">{step.title}</h2>
              <p className="mt-2 text-sm text-primary-foreground/85">{step.copy}</p>
            </article>
          ))}
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid gap-6 rounded-2xl border border-border bg-card p-6 sm:p-8 md:grid-cols-2">
            <div>
              <h2 className="text-3xl">Try the seeded lease</h2>
              <p className="mt-2 text-muted-foreground">
                Tell the chat the unit and last name. The staff board password is printed on the sign-in card.
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                Nothing here is a real landlord, a real resident, or a real emergency service. Phone numbers use the 555 exchange.
              </p>
            </div>
            <ul className="space-y-3 text-sm">
              <li className="rounded-xl bg-muted px-4 py-3">
                <span className="font-medium">Maya Chen</span> · The Alden, unit 4B. Ledger is clear.
              </li>
              <li className="rounded-xl bg-muted px-4 py-3">
                <span className="font-medium">James Okonkwo</span> · Birch Court, unit 12. November rent is still open.
              </li>
              <li className="rounded-xl bg-muted px-4 py-3">
                <span className="font-medium">Priya Shah</span> · Harbor Lofts, unit 308. Renewal window is open.
              </li>
            </ul>
          </div>
        </section>
      </main>
    </>
  )
}
