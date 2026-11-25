"use client"

import { useEffect, useRef, useState } from "react"
import { MarkdownText } from "@/components/markdown-text"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { EMERGENCY_PHONE } from "@/lib/catalog"
import type { Citation, PublicTenant, ToolTrace } from "@/lib/types"

type Bubble = {
  id: string
  role: "user" | "assistant"
  content: string
  toolCalls?: ToolTrace[]
  citations?: Citation[]
  handoff?: boolean
  photo?: string | null
}

const SUGGESTIONS = [
  "I'm in unit 4B, last name Chen",
  "When is rent late, and what does the fee cost?",
  "my kitchen sink is leaking",
  "I smell gas in the kitchen",
]

export function ChatDesk() {
  const [messages, setMessages] = useState<Bubble[]>([])
  const [draft, setDraft] = useState("")
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [tenant, setTenant] = useState<PublicTenant | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [photo, setPhoto] = useState<{ name: string; mime: string; dataUrl: string } | null>(null)
  const threadRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const stored = window.sessionStorage.getItem("keystone-conversation")
    if (stored) setConversationId(stored)
  }, [])

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, pending])

  async function send(text: string) {
    const message = text.trim()
    if (!message || pending) return
    setError(null)
    setDraft("")
    const localPhoto = photo
    setPhoto(null)
    const userBubble: Bubble = {
      id: `local-${Date.now()}`,
      role: "user",
      content: message,
      photo: localPhoto?.dataUrl ?? null,
    }
    setMessages((current) => [...current, userBubble])
    setPending(true)
    const assistantId = `desk-${Date.now()}`
    try {
      const response = await fetch("/api/chat?stream=1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          message,
          image: localPhoto,
        }),
      })
      if (!response.ok || !response.body) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string }
        setError(payload.error || "The desk couldn't send that. Try again.")
        setDraft(message)
        if (localPhoto) setPhoto(localPhoto)
        return
      }
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let started = false
      while (true) {
        const chunk = await reader.read()
        if (chunk.done) break
        buffer += decoder.decode(chunk.value, { stream: true })
        const events = buffer.split("\n\n")
        buffer = events.pop() ?? ""
        for (const event of events) {
          const line = event.split("\n").find((row) => row.startsWith("data: "))
          if (!line) continue
          const payload = JSON.parse(line.slice(6)) as {
            type?: string
            text?: string
            error?: string
            conversationId?: string
            reply?: string
            toolCalls?: ToolTrace[]
            citations?: Citation[]
            handoff?: { id: string } | null
            tenant?: PublicTenant | null
          }
          if (payload.type === "token") {
            if (!started) {
              started = true
              setPending(false)
              setMessages((current) => [
                ...current,
                { id: assistantId, role: "assistant", content: payload.text ?? "" },
              ])
            } else {
              setMessages((current) =>
                current.map((item) =>
                  item.id === assistantId ? { ...item, content: item.content + (payload.text ?? "") } : item,
                ),
              )
            }
          }
          if (payload.type === "done") {
            if (payload.conversationId) {
              setConversationId(payload.conversationId)
              window.sessionStorage.setItem("keystone-conversation", payload.conversationId)
            }
            setTenant(payload.tenant ?? null)
            setMessages((current) =>
              current.map((item) =>
                item.id === assistantId
                  ? {
                      ...item,
                      content: payload.reply || item.content,
                      toolCalls: payload.toolCalls,
                      citations: payload.citations,
                      handoff: Boolean(payload.handoff),
                    }
                  : item,
              ),
            )
          }
        }
      }
    } catch {
      setError("The desk couldn't be reached. Check the connection and send the message again.")
      setDraft(message)
      if (localPhoto) setPhoto(localPhoto)
    } finally {
      setPending(false)
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setError("Attach a photo (JPEG, PNG, or WebP).")
      return
    }
    if (file.size > 1_200_000) {
      setError("That photo is over 1.2 MB. Use a smaller image.")
      return
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error("read failed"))
      reader.readAsDataURL(file)
    })
    setPhoto({ name: file.name, mime: file.type, dataUrl })
    setError(null)
  }

  return (
    <main id="content" className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-3 px-4 py-3 lg:grid lg:grid-cols-[280px_1fr] lg:px-6">
      <aside className="lg:sticky lg:top-4 lg:self-start">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2 lg:hidden">
          <p className="truncate text-sm">
            {tenant ? `${tenant.firstName} ${tenant.lastName} · unit ${tenant.unit}` : "Demo lease: unit 4B, Chen"}
          </p>
          <a className="shrink-0 text-sm font-medium text-copper" href="tel:5550192400">
            {EMERGENCY_PHONE}
          </a>
        </div>
        <div className="hidden space-y-4 lg:block">
        <section className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">This chat</p>
          {tenant ? (
            <div className="mt-2">
              <p className="font-heading text-xl">
                {tenant.firstName} {tenant.lastName}
              </p>
              <p className="text-sm text-muted-foreground">
                {tenant.buildingName} · unit {tenant.unit}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm">
              Not verified yet. The demo lease is <span className="font-medium">unit 4B, last name Chen</span>.
            </p>
          )}
        </section>
        <section className="rounded-2xl border border-copper/40 bg-card p-4">
          <p className="text-xs tracking-wide text-copper uppercase">Emergency line</p>
          <a className="mt-1 block font-heading text-2xl" href="tel:5550192400">
            {EMERGENCY_PHONE}
          </a>
          <p className="mt-1 text-sm text-muted-foreground">Flood, gas, fire, no heat, lockout. The chat pages on-call and still asks you to call.</p>
        </section>
        <div className="hidden flex-col gap-2 lg:flex">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className="rounded-xl border border-border bg-card px-3 py-2 text-left text-sm hover:bg-muted"
              onClick={() => send(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
        </div>
      </aside>

      <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-border bg-card">
        <div ref={threadRef} data-testid="message-list" className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite">
          {messages.length === 0 ? (
            <div className="mx-auto max-w-md py-10 text-center">
              <h1 className="text-3xl">What do you need from the desk?</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Repairs, the ledger, amenity times, and the resident notes. A live model is off unless an API key is configured, so this demo follows the published policy.
              </p>
              <div className="mt-4 flex flex-col gap-2 lg:hidden">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="rounded-xl border border-border px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => send(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {messages.map((message) => (
            <article
              key={message.id}
              className={`max-w-[42rem] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                message.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted text-foreground"
              } ${message.handoff ? "ring-2 ring-copper" : ""}`}
              role={message.handoff ? "alert" : undefined}
            >
              {message.role === "assistant" ? (
                <MarkdownText text={message.content} />
              ) : (
                <p className="whitespace-pre-wrap">{message.content}</p>
              )}
              {message.photo ? (
                // Data URLs from the resident's own upload. next/image does not accept them.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={message.photo} alt="Photo attached to this message" className="mt-3 max-h-48 rounded-lg" />
              ) : null}
              {message.toolCalls && message.toolCalls.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {message.toolCalls.map((call, index) => (
                    <Badge key={`${call.name}-${index}`} variant="outline" className="bg-card text-foreground">
                      {call.name}
                    </Badge>
                  ))}
                </div>
              ) : null}
              {message.citations && message.citations.length > 0 ? (
                <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                  {message.citations.map((citation) => (
                    <li key={citation.title}>Source: {citation.title}</li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
          {pending ? (
            <p className="text-sm text-muted-foreground" role="status">
              <span className="mr-2 inline-flex gap-1" aria-hidden="true">
                <span className="size-1.5 animate-pulse rounded-full bg-current" />
                <span className="size-1.5 animate-pulse rounded-full bg-current [animation-delay:150ms]" />
                <span className="size-1.5 animate-pulse rounded-full bg-current [animation-delay:300ms]" />
              </span>
              Checking the resident notes…
            </p>
          ) : null}
        </div>

        <form
          className="border-t border-border p-3"
          onSubmit={(event) => {
            event.preventDefault()
            void send(draft)
          }}
        >
          {error ? (
            <p className="mb-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {photo ? (
            <p className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              Photo ready: {photo.name}
              <button type="button" className="underline" onClick={() => setPhoto(null)}>
                Remove
              </button>
            </p>
          ) : null}
          <label htmlFor="desk-message" className="sr-only">
            Message the resident desk
          </label>
          <div className="mb-2 flex flex-wrap gap-2" data-testid="quick-replies">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="rounded-full border border-border px-3 py-1 text-left text-xs hover:bg-muted"
                onClick={() => send(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
          <Textarea
            id="desk-message"
            data-testid="chat-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Unit 4B, last name Chen — or describe the repair."
            rows={3}
            className="min-h-20 bg-background"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                void send(draft)
              }
            }}
          />
          <div className="mt-2 flex items-center justify-end gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => void onFile(event.target.files?.[0])}
            />
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
              Add photo
            </Button>
            <Button type="submit" data-testid="chat-send" disabled={pending || !draft.trim()} size="lg">
              Send
            </Button>
          </div>
        </form>
      </section>
    </main>
  )
}
