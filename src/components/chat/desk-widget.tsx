"use client"

import { useEffect, useRef, useState } from "react"
import { useTheme } from "next-themes"
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  Headphones,
  Mic,
  MoreHorizontal,
  BookOpen,
  Package,
  Paperclip,
  RefreshCw,
  Square,
  Thermometer,
  ThumbsDown,
  ThumbsUp,
  Wrench,
  X,
} from "lucide-react"
import { BrandMark } from "@/components/brand-mark"
import { CitationRow, LeadCard, RichCards, ToolRows } from "@/components/chat/cards"
import { MarkdownText } from "@/components/markdown-text"
import { BRAND, STARTERS, VISUAL_CLOCK } from "@/lib/brand"
import { deriveCards, followUps, type CardSpec } from "@/lib/cards"
import type { SlotOffer } from "@/lib/slots"
import type { Citation, PublicTenant, ToolTrace } from "@/lib/types"

type Attachment = { id: string; name: string; mime: string; url: string; kind: "image" | "pdf"; dataUrl?: string }

type Bubble = {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: string
  toolCalls?: ToolTrace[]
  citations?: Citation[]
  cards?: CardSpec[]
  slots?: SlotOffer | null
  handoff?: { id: string; kind: string } | null
  attachments?: Attachment[]
  streaming?: boolean
  stopped?: boolean
  lead?: boolean
  local?: boolean
}

type SpeechRec = {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

export type DeskEvent =
  | { type: "urgent"; kind: string; summary: string }
  | { type: "handoff"; name: string; message: string }

const ICONS = {
  thermometer: Thermometer,
  package: Package,
  wrench: Wrench,
  headphones: Headphones,
} as const

export function DeskWidget({
  variant,
  storageKey = "keystone-conversation",
  onEvent,
}: {
  variant: "page" | "frame" | "hero"
  storageKey?: string
  onEvent?: (event: DeskEvent) => void
}) {
  const { resolvedTheme, setTheme } = useTheme()
  const [messages, setMessages] = useState<Bubble[]>([])
  const [draft, setDraft] = useState("")
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [tenant, setTenant] = useState<PublicTenant | null>(null)
  const [streaming, setStreaming] = useState(false)
  const [phase, setPhase] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [files, setFiles] = useState<Attachment[]>([])
  const [mode, setMode] = useState<"demo" | "live">("demo")
  const [human, setHuman] = useState<"connecting" | "joined" | null>(null)
  const [menu, setMenu] = useState(false)
  const [jump, setJump] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [listening, setListening] = useState(false)
  const [status, setStatus] = useState("")
  const [reactions, setReactions] = useState<Record<string, "up" | "down" | undefined>>({})
  const [copied, setCopied] = useState<string | null>(null)
  const [leadOpen, setLeadOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [fixedClock, setFixedClock] = useState(false)
  const [fileCount, setFileCount] = useState(0)
  const threadRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const pinned = useRef(true)
  const abortRef = useRef<AbortController | null>(null)
  const speechRef = useRef<SpeechRec | null>(null)
  const sendRef = useRef<(text: string) => Promise<void>>(async () => {})
  const liveDefault = useRef(false)

  useEffect(() => {
    let cancelled = false
    fetch("/api/health")
      .then((response) => response.json())
      .then((payload: { policy?: string }) => {
        if (cancelled) return
        if (payload.policy === "live") {
          liveDefault.current = true
          setMode("live")
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("visual") === "1") document.documentElement.dataset.visualTest = "1"
    setFixedClock(document.documentElement.dataset.visualTest === "1")
    const stored = window.sessionStorage.getItem(storageKey)
    if (stored) setConversationId(stored)
  }, [storageKey])

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 639px)").matches
    if (variant === "frame") {
      if (mobile) closeRef.current?.focus()
      else inputRef.current?.focus()
    } else if (variant === "page" && !mobile) {
      inputRef.current?.focus()
    }
  }, [variant])

  useEffect(() => {
    const promptEvent = variant === "hero" ? "keystone-ask" : variant === "frame" ? "keystone-frame-ask" : ""
    function onAsk(event: Event) {
      const prompt = (event as CustomEvent<string>).detail
      if (typeof prompt === "string") void sendRef.current(prompt)
    }
    function onMessage(event: MessageEvent) {
      const data = event.data as { source?: string; type?: string; text?: string; theme?: string }
      if (!data || data.source !== "keystone-host") return
      if (data.type === "prompt" && data.text) void sendRef.current(data.text)
      if (data.type === "theme" && (data.theme === "light" || data.theme === "dark" || data.theme === "system")) setTheme(data.theme)
      if (data.type === "close") window.parent.postMessage({ source: "keystone", type: "close" }, "*")
    }
    if (promptEvent) window.addEventListener(promptEvent, onAsk)
    window.addEventListener("message", onMessage)
    if (variant === "frame") window.parent.postMessage({ source: "keystone", type: "ready" }, "*")
    return () => {
      if (promptEvent) window.removeEventListener(promptEvent, onAsk)
      window.removeEventListener("message", onMessage)
    }
  }, [setTheme, variant])

  useEffect(() => {
    const node = threadRef.current
    if (!node || !pinned.current) return
    node.scrollTop = node.scrollHeight
  }, [messages, phase, streaming])

  function clock(iso: string) {
    return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" }).format(
      new Date(fixedClock ? VISUAL_CLOCK : iso),
    )
  }

  function resizeInput() {
    const node = inputRef.current
    if (!node) return
    node.style.height = "auto"
    node.style.height = `${Math.min(node.scrollHeight, 22 * 6 + 16)}px`
  }

  function announce(text: string) {
    setStatus("")
    window.setTimeout(() => setStatus(text), 30)
  }

  async function addFiles(list: File[]) {
    const next: Attachment[] = []
    for (const file of list) {
      if (fileCount + files.length + next.length >= 10) {
        setError("This chat can hold 10 files.")
        break
      }
      if (files.length + next.length >= 3) {
        setError("Attach up to 3 files at a time.")
        break
      }
      const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
      if (!allowed.includes(file.type)) {
        setError("Attach a JPEG, PNG, WebP, or PDF.")
        continue
      }
      if (file.size > 5_000_000) {
        setError("Each file must be 5 MB or smaller.")
        continue
      }
      const url = URL.createObjectURL(file)
      let dataUrl: string | undefined
      if (file.type.startsWith("image/")) {
        dataUrl = await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result))
          reader.readAsDataURL(file)
        })
      }
      next.push({ id: `${file.name}-${file.size}`, name: file.name, mime: file.type, url, kind: file.type === "application/pdf" ? "pdf" : "image", dataUrl })
    }
    if (next.length) setFiles((current) => [...current, ...next])
  }

  function resetChat() {
    if (human && !window.confirm("A specialist is on this chat. Start a new conversation?")) return
    abortRef.current?.abort()
    setMessages([])
    setConversationId(null)
    setTenant(null)
    setHuman(null)
    setMode(liveDefault.current ? "live" : "demo")
    setLeadOpen(false)
    window.sessionStorage.removeItem(storageKey)
    setMenu(false)
  }

  async function send(text: string) {
    const message = text.trim()
    if ((!message && files.length === 0) || streaming) return
    if (message === "__lead__") {
      setLeadOpen(true)
      return
    }
    setError(null)
    setDraft("")
    if (inputRef.current) inputRef.current.style.height = "auto"
    const localFiles = files
    setFiles([])
    setFileCount((count) => count + localFiles.length)
    const spoken = message || `Attached ${localFiles.map((file) => file.name).join(", ")}`
    const userBubble: Bubble = {
      id: `user-${Date.now()}`,
      role: "user",
      content: spoken,
      createdAt: new Date().toISOString(),
      attachments: localFiles,
    }
    setMessages((current) => [...current, userBubble])
    setStreaming(true)
    setPhase("Checking the resident notes…")
    announce("Assistant is replying")
    pinned.current = true
    const assistantId = `desk-${Date.now()}`
    const controller = new AbortController()
    abortRef.current = controller
    const image = localFiles.find((file) => file.dataUrl)
    try {
      const response = await fetch("/api/chat?stream=1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          conversationId,
          message: spoken,
          image: image?.dataUrl ? { name: image.name, mime: image.mime, dataUrl: image.dataUrl } : undefined,
        }),
      })
      if (!response.ok || !response.body) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(payload.error || "The desk couldn't send that.")
      }
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let started = false
      let assembled = ""
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
            label?: string
            conversationId?: string
            reply?: string
            toolCalls?: ToolTrace[]
            citations?: Citation[]
            handoff?: { id: string; kind: string } | null
            tenant?: PublicTenant | null
            source?: "model" | "rules"
            slots?: SlotOffer | null
          }
          if (payload.type === "phase" && payload.label) setPhase(payload.label)
          if (payload.type === "token") {
            assembled += payload.text ?? ""
            if (!started) {
              started = true
              setMessages((current) => [...current, { id: assistantId, role: "assistant", content: payload.text ?? "", createdAt: new Date().toISOString(), streaming: true }])
            } else {
              setMessages((current) => current.map((item) => (item.id === assistantId ? { ...item, content: item.content + (payload.text ?? "") } : item)))
            }
          }
          if (payload.type === "done") {
            if (payload.conversationId) {
              setConversationId(payload.conversationId)
              window.sessionStorage.setItem(storageKey, payload.conversationId)
            }
            if (payload.tenant) setTenant(payload.tenant)
            setMode(payload.source === "rules" ? "demo" : "live")
            const cards = deriveCards({
              userText: spoken,
              toolCalls: payload.toolCalls ?? [],
              handoff: payload.handoff ?? null,
              citations: payload.citations,
            })
            const handoff = payload.handoff ?? null
            if (handoff) {
              setHuman("connecting")
              const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 800
              window.setTimeout(() => setHuman("joined"), delay)
              const urgent = ["flooding", "gas", "fire", "no_heat", "lockout"].includes(handoff.kind)
              if (urgent) onEvent?.({ type: "urgent", kind: handoff.kind, summary: spoken })
              onEvent?.({ type: "handoff", name: tenant ? `${tenant.firstName} ${tenant.lastName}` : "Resident", message: spoken })
              if (variant === "frame") {
                window.parent.postMessage({ source: "keystone", type: urgent ? "urgent" : "handoff", kind: handoff.kind, summary: spoken }, "*")
              }
            }
            setMessages((current) =>
              current.map((item) =>
                item.id === assistantId
                  ? {
                      ...item,
                      content: payload.reply || item.content,
                      toolCalls: payload.toolCalls,
                      citations: payload.citations,
                      cards,
                      slots: payload.slots ?? null,
                      handoff,
                      streaming: false,
                    }
                  : item,
              ),
            )
            if (!started && payload.reply) {
              setMessages((current) => [
                ...current,
                {
                  id: assistantId,
                  role: "assistant",
                  content: payload.reply || "",
                  createdAt: new Date().toISOString(),
                  toolCalls: payload.toolCalls,
                  citations: payload.citations,
                  cards,
                  slots: payload.slots ?? null,
                  handoff,
                },
              ])
            }
          }
        }
      }
      if (!assembled && !started) setError("The desk returned an empty reply.")
    } catch (caught) {
      if (controller.signal.aborted) {
        setMessages((current) => current.map((item) => (item.id === assistantId ? { ...item, streaming: false, stopped: true } : item)))
      } else {
        setMessages((current) => current.filter((item) => item.id !== userBubble.id && item.id !== assistantId))
        setDraft(spoken)
        setFiles(localFiles)
        setError(caught instanceof Error ? caught.message : "The desk couldn't be reached.")
      }
    } finally {
      setStreaming(false)
      setPhase(null)
      announce("Assistant replied")
      inputRef.current?.focus()
    }
  }

  function onScroll() {
    const node = threadRef.current
    if (!node) return
    const distance = node.scrollHeight - node.scrollTop - node.clientHeight
    pinned.current = distance < 80
    setJump(distance >= 80)
  }

  function toggleMic() {
    const BrowserSpeech = (window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec }).SpeechRecognition
      || (window as unknown as { webkitSpeechRecognition?: new () => SpeechRec }).webkitSpeechRecognition
    if (!BrowserSpeech) {
      setToast("Voice input isn't available in this browser. Type instead.")
      window.setTimeout(() => setToast(null), 4000)
      return
    }
    if (listening && speechRef.current) {
      speechRef.current.stop()
      setListening(false)
      return
    }
    const recognition = new BrowserSpeech()
    recognition.lang = "en-US"
    recognition.interimResults = true
    recognition.continuous = false
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
      setDraft(transcript)
      resizeInput()
    }
    recognition.onerror = () => {
      setListening(false)
      setToast("Voice input isn't available in this browser. Type instead.")
      window.setTimeout(() => setToast(null), 4000)
    }
    recognition.onend = () => setListening(false)
    speechRef.current = recognition
    recognition.start()
    setListening(true)
  }

  sendRef.current = send
  const latestAssistant = [...messages].reverse().find((message) => message.role === "assistant")
  const subtitle = human === "joined" ? BRAND.agentSubtitle : human === "connecting" ? "Connecting you to a team member…" : "Online 24/7"
  const title = human === "joined" ? BRAND.agentName : "Keystone desk · Keystone"

  return (
    <section
      id={variant === "frame" ? "keystone-desk" : undefined}
      data-testid="chat-widget"
      className="relative flex h-full min-h-0 flex-col bg-[var(--surface)] text-[var(--foreground)]"
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        void addFiles(Array.from(event.dataTransfer.files))
      }}
    >
      <div className="h-0.5 bg-[var(--accent)]" />
      <header data-testid="chat-header" className="flex h-16 items-center gap-2 border-b border-[var(--border)] px-3">
        <span className="relative grid size-7 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
          <BrandMark className="size-4" />
          <span className="absolute -right-0.5 -bottom-0.5 size-2 rounded-full bg-[var(--success)] ring-2 ring-[var(--surface)]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] leading-5 font-semibold tracking-[-0.01em]">{title}</p>
          <p data-testid="chat-subtitle" className="truncate text-[12px] leading-4 text-[var(--muted-foreground)]">
            <span className="mr-1 inline-block size-1.5 rounded-full bg-[var(--success)] align-middle" aria-hidden="true" />
            {subtitle}
          </p>
        </div>
        <span data-testid="mode-pill" className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[11px] font-medium">
          {mode === "live" ? "Live AI" : "Demo mode"}
        </span>
        <div className="relative">
          <button type="button" data-testid="chat-menu" aria-label="Chat menu" aria-expanded={menu} className="grid size-8 place-items-center rounded-full" onClick={() => setMenu((open) => !open)}>
            <MoreHorizontal className="size-4" strokeWidth={1.75} />
          </button>
          {menu ? (
            <div className="absolute right-0 z-20 mt-1 w-44 rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-1 shadow-[var(--shadow-card)]">
              <button type="button" className="block w-full rounded-lg px-3 py-2 text-left text-[13px]" onClick={resetChat}>New chat</button>
              <button type="button" data-testid="theme-toggle" className="block w-full rounded-lg px-3 py-2 text-left text-[13px]" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
                {resolvedTheme === "dark" ? "Light" : "Dark"}
              </button>
              <button type="button" className="block w-full rounded-lg px-3 py-2 text-left text-[13px]" onClick={() => { setMenu(false); void send("I want to talk to a person") }}>
                Talk to a human
              </button>
            </div>
          ) : null}
        </div>
        {variant === "frame" ? (
          <button
            ref={closeRef}
            type="button"
            aria-label="Close chat"
            className="grid size-8 place-items-center rounded-full"
            onClick={() => window.parent.postMessage({ source: "keystone", type: "close" }, "*")}
          >
            <X className="size-4" strokeWidth={1.75} />
          </button>
        ) : null}
      </header>
      {human ? (
        <p data-testid="handoff-banner" className="border-b border-[var(--info)] bg-[color-mix(in_srgb,var(--info)_12%,transparent)] px-3 py-1.5 text-[12px]">
          {human === "joined" ? `${BRAND.agentName} joined` : "Connecting you to a team member…"}
        </p>
      ) : null}
      <div className="sr-only" role="status" aria-live="polite">{status}</div>
      <div
        ref={threadRef}
        data-testid="chat-messages"
        role="log"
        aria-relevant="additions"
        aria-label="Conversation"
        onScroll={onScroll}
        className="chat-scroll min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-3 [scrollbar-width:none]"
      >
        {messages.length === 0 ? (
          <div data-testid="quick-replies">
            <p className="text-[14.5px] leading-[22px]">{BRAND.greeting}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {STARTERS.map((starter) => {
                const Icon = ICONS[starter.icon]
                return (
                  <button key={starter.label} type="button" data-testid="quick-reply" className="flex min-h-16 items-start gap-2 rounded-[16px] border border-[var(--border)] p-3 text-left text-[13px] leading-4 font-medium hover:bg-[var(--accent-soft)]" onClick={() => void send(starter.prompt)}>
                    <Icon className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
                    {starter.label}
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}
        {messages.map((message, index) => {
          const speaker = message.role === "user" ? "You" : human === "joined" ? BRAND.agentName : BRAND.botName
          const time = clock(message.createdAt)
          const previous = messages[index - 1]
          const showAvatar = message.role === "assistant" && previous?.role !== "assistant"
          const isLatest = message.id === latestAssistant?.id
          const chips = message.role === "assistant" && isLatest && !message.streaming ? followUps(messages[index - 1]?.content ?? "", message.cards ?? [], Boolean(message.handoff)) : []
          const humanBubble = message.role === "assistant" && human === "joined" && !message.streaming
          return (
            <article
              key={message.id}
              data-testid={message.role === "user" ? "message-user" : "message-assistant"}
              aria-label={`${speaker}, ${time}`}
              aria-busy={message.streaming || undefined}
              className={`group relative mt-3 ${message.role === "user" ? "ml-auto max-w-[82%]" : "max-w-full"}`}
            >
              {showAvatar ? (
                <span className="mb-1 grid size-6 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                  <BrandMark className="size-3.5" />
                </span>
              ) : null}
              {message.role === "user" ? (
                <div className="rounded-[18px] rounded-br-[4px] bg-[var(--accent)] px-3 py-2 text-[14.5px] leading-[22px] text-[var(--accent-foreground)]">
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              ) : humanBubble ? (
                <div className="rounded-[18px] bg-[var(--surface-2)] px-3 py-2 text-[14.5px] leading-[22px]">
                  <MarkdownText text={message.content} />
                </div>
              ) : (
                <div>
                  {message.handoff && ["flooding", "gas", "fire", "no_heat", "lockout"].includes(message.handoff.kind) ? (
                    <p role="alert" className="mb-2 rounded-[12px] bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] px-3 py-2 text-[13px] text-[var(--danger)]">
                      Urgent · {message.handoff.kind.replaceAll("_", " ")}. Call (555) 019-2400.
                    </p>
                  ) : null}
                  <MarkdownText text={message.content} streaming={message.streaming} />
                  {message.stopped ? <p className="mt-1 text-[11.5px] text-[var(--muted-foreground)]">Stopped</p> : null}
                </div>
              )}
              {message.attachments?.map((file) =>
                file.kind === "image" ? (
                  // Session-only object URL from the resident's upload.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={file.id} src={file.url} alt="" className="mt-2 h-16 rounded-[12px] border border-[var(--border)] object-cover dark:border-white/15" />
                ) : (
                  <p key={file.id} className="mt-2 text-[12px]">{file.name}</p>
                ),
              )}
              <time className="time-stamp text-[11.5px] text-[var(--muted-foreground)]" dateTime={fixedClock ? VISUAL_CLOCK : message.createdAt}>{time}</time>
              {message.role === "assistant" ? (
                <>
                  <ToolRows calls={message.toolCalls ?? []} />
                  <RichCards cards={message.cards ?? []} slots={message.slots ?? null} active={isLatest && !streaming} onSend={(value) => void send(value)} onLead={() => void send("I want to talk to a person")} />
                  {message.lead ? <LeadCard active={isLatest} onSubmit={(summary) => void send(summary)} /> : null}
                  <CitationRow citations={message.citations ?? []} />
                  {!message.streaming ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Action icon={copied === message.id ? Check : Copy} label="Copy" pressed={false} onClick={() => { void navigator.clipboard?.writeText(message.content); setCopied(message.id); window.setTimeout(() => setCopied(null), 2000) }} />
                      <Action icon={RefreshCw} label="Regenerate" pressed={false} onClick={() => { const prior = [...messages].slice(0, index).reverse().find((item) => item.role === "user"); if (prior) void send(prior.content) }} />
                      <Action icon={ThumbsUp} label="Good reply" pressed={reactions[message.id] === "up"} onClick={() => setReactions((current) => ({ ...current, [message.id]: current[message.id] === "up" ? undefined : "up" }))} />
                      <Action icon={ThumbsDown} label="Bad reply" pressed={reactions[message.id] === "down"} onClick={() => setReactions((current) => ({ ...current, [message.id]: current[message.id] === "down" ? undefined : "down" }))} />
                      {message.citations && message.citations.length > 0 ? (
                        <Action icon={BookOpen} label="Sources" pressed={false} onClick={() => document.querySelector<HTMLButtonElement>("[data-testid='citation-chip']")?.focus()} />
                      ) : null}
                    </div>
                  ) : null}
                  {chips.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2" data-testid="follow-ups">
                      {chips.map((chip) => (
                        <button key={chip.label} type="button" data-testid="follow-up" className="h-9 rounded-full border border-[var(--border)] px-3 text-[13px] font-medium" onClick={() => (chip.prompt === "__lead__" ? setLeadOpen(true) : void send(chip.prompt))}>
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : null}
              {human === "joined" && message.role === "user" && index === messages.map((item) => item.role).lastIndexOf("user") ? (
                <p className="mt-1 text-right text-[11px] text-[var(--muted-foreground)]">Seen</p>
              ) : null}
            </article>
          )
        })}
        {leadOpen ? (
          <div className="mt-3">
            <LeadCard
              active
              onSubmit={(summary) => {
                setLeadOpen(false)
                void send(summary)
              }}
            />
          </div>
        ) : null}
        {phase ? (
          <p data-testid="phase-indicator" className="mt-3 flex items-center gap-2 text-[13px] text-[var(--muted-foreground)]">
            <span className="phase-dots inline-flex gap-1" aria-hidden="true">
              <span className="size-1.5 rounded-full bg-current" />
              <span className="size-1.5 rounded-full bg-current" />
              <span className="size-1.5 rounded-full bg-current" />
            </span>
            {phase}
          </p>
        ) : null}
      </div>
      {jump ? (
        <button type="button" data-testid="jump-to-latest" className="absolute bottom-28 left-1/2 grid size-9 -translate-x-1/2 place-items-center rounded-full border bg-[var(--surface)] shadow" onClick={() => { pinned.current = true; if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight; setJump(false) }} aria-label="Jump to latest">
          <ArrowDown className="size-4" />
        </button>
      ) : null}
      {dragging ? <div className="pointer-events-none absolute inset-3 grid place-items-center rounded-[16px] border border-dashed border-[var(--accent)] bg-[var(--surface)]/90 text-[13px]">Drop to attach</div> : null}
      {error ? <p role="alert" className="px-3 text-[13px] text-[var(--danger)]">{error}</p> : null}
      {toast ? <p role="status" className="mx-3 mb-1 rounded-[12px] bg-[var(--foreground)] px-3 py-2 text-[12px] text-[var(--background)]">{toast}</p> : null}
      <div className="px-3 pb-1">
        <button type="button" data-testid="lead-link" className="text-[12px] text-[var(--accent)] underline" onClick={() => setLeadOpen(true)}>
          Leave contact details for the team
        </button>
      </div>
      <form
        data-testid="composer"
        className="px-3 pb-2"
        onSubmit={(event) => {
          event.preventDefault()
          void send(draft)
        }}
      >
        {files.length > 0 ? (
          <div className="mb-2 flex gap-2">
            {files.map((file) => (
              <span key={file.id} className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px]">
                {file.name}
                <button type="button" aria-label={`Remove ${file.name}`} onClick={() => setFiles((current) => current.filter((item) => item.id !== file.id))}>
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        ) : null}
        <div className="flex items-end gap-2 rounded-[16px] border border-[var(--border)] bg-[var(--surface-2)] p-2 pl-3">
          <label className="sr-only" htmlFor="desk-message">Message the resident desk</label>
          <textarea
            id="desk-message"
            ref={inputRef}
            data-testid="composer-input"
            rows={1}
            value={draft}
            placeholder={listening ? "Listening…" : human === "joined" ? BRAND.humanPlaceholder : BRAND.placeholder}
            className="max-h-[148px] min-h-[44px] flex-1 resize-none bg-transparent py-2 text-[14.5px] leading-[22px] outline-none [scrollbar-width:none]"
            onChange={(event) => {
              setDraft(event.target.value)
              resizeInput()
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                void send(draft)
              }
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault()
                void send(draft)
              }
            }}
          />
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple className="sr-only" onChange={(event) => { void addFiles(Array.from(event.target.files ?? [])); event.target.value = "" }} />
          <button type="button" data-testid="composer-attach" aria-label="Attach a file" className="grid size-8 place-items-center rounded-full" onClick={() => fileRef.current?.click()}>
            <Paperclip className="size-5" strokeWidth={1.75} />
          </button>
          <button type="button" data-testid="composer-mic" aria-label={listening ? "Stop dictation" : "Start dictation"} aria-pressed={listening} className={`grid size-8 place-items-center rounded-full ${listening ? "mic-pulse ring-2 ring-[var(--accent)]" : ""}`} onClick={toggleMic}>
            <Mic className="size-5" strokeWidth={1.75} />
          </button>
          {streaming ? (
            <button type="button" data-testid="composer-stop" aria-label="Stop generating" className="grid size-8 place-items-center rounded-full bg-[var(--accent)] text-[var(--accent-foreground)]" onClick={() => abortRef.current?.abort()}>
              <Square className="size-2.5 fill-current" />
            </button>
          ) : (
            <button type="submit" data-testid="composer-send" aria-label="Send message" disabled={!draft.trim() && files.length === 0} className="grid size-8 place-items-center rounded-full bg-[var(--accent)] text-[var(--accent-foreground)] disabled:opacity-40">
              <ArrowUp className="size-4" strokeWidth={1.75} />
            </button>
          )}
        </div>
      </form>
      <footer className="px-3 pb-3 text-[11px] leading-4 text-[var(--muted-foreground)]">
        <p>AI assistant · Portfolio demo · <a className="underline" href="/privacy">Privacy</a></p>
        <p>{BRAND.disclaimer}</p>
        <p>
          {BRAND.accuracy}{" "}
          <button type="button" className="underline" onClick={() => void send("I want to talk to a person")}>
            Talk to a person
          </button>
        </p>
      </footer>
    </section>
  )
}

function Action({
  icon: Icon,
  label,
  pressed,
  onClick,
}: {
  icon: typeof Copy
  label: string
  pressed: boolean
  onClick: () => void
}) {
  return (
    <button type="button" aria-label={label} title={label} aria-pressed={pressed} className="inline-flex h-7 items-center gap-1 rounded-full px-2 text-[11.5px] text-[var(--muted-foreground)] hover:bg-[var(--muted)]" onClick={onClick}>
      <Icon className="size-3.5" strokeWidth={1.75} />
      <span className="sr-only">{label}</span>
    </button>
  )
}
