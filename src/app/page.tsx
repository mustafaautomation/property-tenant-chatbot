"use client"

import { useState } from "react"
import Link from "next/link"
import { Check, X } from "lucide-react"
import { DeskWidget, type DeskEvent } from "@/components/chat/desk-widget"
import { FloatingWidget } from "@/components/chat/floating-widget"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { METRICS } from "@/lib/brand"
import { EMERGENCY_PHONE } from "@/lib/catalog"

const ASKS = ["What's the package policy?", "When is rent due?", "I need a maintenance ticket", "Book the rooftop lounge"]

export default function HomePage() {
  const [preview, setPreview] = useState<"desktop" | "phone">("desktop")
  const [toasts, setToasts] = useState<Array<{ id: string; title: string; body: string }>>([])

  function pushToast(event: DeskEvent) {
    const id = `${event.type}-${Date.now()}`
    if (event.type === "urgent") {
      setToasts((current) => [
        { id, title: "URGENT SMS sent to on-call", body: `Desk alerted · ${event.kind.replaceAll("_", " ")} · ${EMERGENCY_PHONE}` },
        ...current,
      ].slice(0, 3))
      return
    }
    setToasts((current) => [{ id, title: "New human support request", body: `${event.name}: ${event.message.slice(0, 120)}` }, ...current].slice(0, 3))
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="content" className="flex-1">
        <section className="mx-auto grid max-w-6xl items-start gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-14">
          <div>
            <p className="text-sm font-medium tracking-wide text-[var(--clay)] uppercase">Portfolio demo · fictional company</p>
            <h1 className="font-display mt-3 max-w-xl text-5xl leading-[1.05] text-balance sm:text-6xl">
              The resident desk for <em className="italic">three</em> buildings in Cedarhaven.
            </h1>
            <p className="mt-4 max-w-xl text-[18px] leading-7 text-[var(--muted-foreground)]">
              Keystone Residences keeps the lease, the ledger, and the on-call line in one chat. Ask about rent, book the rooftop, or tell the desk the kitchen sink is leaking.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" className="inline-flex h-11 items-center rounded-full bg-[var(--accent)] px-4 text-sm font-medium text-[var(--accent-foreground)]" onClick={() => document.querySelector<HTMLTextAreaElement>("[data-testid='landing-hero-chat'] textarea")?.focus()}>
                Chat now
              </button>
              <Link href="/embed-demo" className="inline-flex h-11 items-center rounded-full border border-[var(--border)] px-4 text-sm font-medium">
                See the embed
              </Link>
            </div>
            <p className="mt-3 text-sm text-[var(--muted-foreground)]">Fictional buildings. The offline desk runs with no API key.</p>
            <div data-testid="try-asking" className="mt-6 flex flex-wrap gap-2">
              {ASKS.map((prompt) => (
                <button key={prompt} type="button" className="h-9 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] font-medium" onClick={() => window.dispatchEvent(new CustomEvent("keystone-ask", { detail: prompt }))}>
                  Try asking: {prompt}
                </button>
              ))}
            </div>
          </div>
          <div id="live-desk" className="lg:pr-16">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs tracking-wide text-[var(--muted-foreground)] uppercase">Live desk</p>
              <div data-testid="preview-toggle" className="flex rounded-full border border-[var(--border)] p-0.5 text-[12px]">
                <button type="button" aria-pressed={preview === "desktop"} className={`rounded-full px-3 py-1 ${preview === "desktop" ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : ""}`} onClick={() => setPreview("desktop")}>Desktop</button>
                <button type="button" aria-pressed={preview === "phone"} className={`rounded-full px-3 py-1 ${preview === "phone" ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : ""}`} onClick={() => setPreview("phone")}>Phone</button>
              </div>
            </div>
            <div data-testid="landing-hero-chat" className={`chat-widget-shell mx-auto h-[min(640px,calc(100dvh-180px))] min-h-[520px] ${preview === "phone" ? "w-[390px] max-w-full" : "w-full max-w-[400px]"}`}>
              <DeskWidget variant="hero" storageKey="keystone-hero" onEvent={pushToast} />
            </div>
          </div>
        </section>

        <section data-testid="trust-panel" className="mx-auto grid max-w-6xl gap-4 px-4 sm:px-6 md:grid-cols-2">
          <article className="rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="text-sm font-semibold tracking-wide uppercase">What it does</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {["Answers from the 24 resident notes and names the source", "Opens a maintenance ticket with the desk priority and ETA", "Reads a verified ledger and offers real booking times", "Pages on-call for flooding, gas, fire, no heat, and lockouts"].map((item) => (
                <li key={item} className="flex gap-2"><Check className="mt-0.5 size-4 text-[var(--success)]" aria-hidden="true" />{item}</li>
              ))}
            </ul>
          </article>
          <article className="rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="text-sm font-semibold tracking-wide uppercase">What it will not do</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {["Invent fees, balances, or arrival times", "Give legal, medical, or financial advice", "Pretend to be a person", "Open another household's ledger"].map((item) => (
                <li key={item} className="flex justify-between gap-3"><span className="flex gap-2"><X className="mt-0.5 size-4 text-[var(--danger)]" aria-hidden="true" />{item}</span><span className="text-[var(--muted-foreground)]">Never</span></li>
              ))}
            </ul>
          </article>
        </section>

        <section data-testid="metrics-strip" className="mx-auto mt-10 grid max-w-6xl grid-cols-2 gap-4 px-4 sm:px-6 md:grid-cols-4">
          {METRICS.map((metric) => (
            <div key={metric.label} className="rounded-[16px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
              <p className="text-[12px] text-[var(--muted-foreground)]">{metric.label}</p>
              <p className="text-[28px] leading-8 font-semibold">{metric.value}</p>
            </div>
          ))}
        </section>

        <section id="how" className="mx-auto mt-12 max-w-6xl px-4 sm:px-6">
          <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
            <h2 className="font-display text-3xl">How a message moves</h2>
            <div className="mt-6 grid gap-3 text-sm md:grid-cols-4">
              {[
                ["Channel", "Web chat, widget iframe, WhatsApp, Messenger"],
                ["Retrieve", "BM25 plus a local hash embedding over 24 notes"],
                ["Tools", "Zod-checked lease, ticket, ledger, and booking tools"],
                ["Desk", "Staff board, handoff, and resume the assistant"],
              ].map(([title, copy]) => (
                <div key={title} className="rounded-[12px] bg-[var(--muted)] p-4">
                  <p className="font-medium">{title}</p>
                  <p className="mt-1 text-[var(--muted-foreground)]">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto mt-12 max-w-6xl px-4 sm:px-6">
          <h2 className="font-display text-3xl">Embed</h2>
          <pre className="mt-4 overflow-x-auto rounded-[16px] bg-[var(--foreground)] p-4 font-mono text-[13px] text-[var(--background)]">
            <code>{`<script src="https://property-chat.quvantic.com/widget.js" data-origin="https://property-chat.quvantic.com" async></script>`}</code>
          </pre>
        </section>
      </main>
      <div className="pointer-events-none fixed top-20 right-4 z-[2147483001] flex w-[min(320px,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((toast) => (
          <div key={toast.id} data-testid="ops-toast" className="pointer-events-auto rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-3 text-sm shadow-[var(--shadow-card)]">
            <p className="font-semibold">{toast.title}</p>
            <p className="mt-1 text-[var(--muted-foreground)]">{toast.body}</p>
          </div>
        ))}
      </div>
      <FloatingWidget onEvent={pushToast} />
      <SiteFooter />
    </div>
  )
}
