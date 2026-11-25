import { handleTurnWithRules, type TurnInput } from "@/lib/policy"

export const DEFAULT_VERIFY_TOKEN = "keystone-demo-verify"

export type InboundMessage = {
  channel: "whatsapp" | "messenger"
  from: string
  messageId: string
  text: string
}

export function verifyToken(name: "WHATSAPP_VERIFY_TOKEN" | "MESSENGER_VERIFY_TOKEN"): string {
  return process.env[name] || DEFAULT_VERIFY_TOKEN
}

export function readChallenge(query: URLSearchParams, expected: string): { ok: true; challenge: string } | { ok: false } {
  const mode = query.get("hub.mode")
  const token = query.get("hub.verify_token")
  const challenge = query.get("hub.challenge") ?? ""
  if (mode === "subscribe" && token === expected && challenge) return { ok: true, challenge }
  return { ok: false }
}

export function whatsappMessages(body: unknown): InboundMessage[] {
  if (!body || typeof body !== "object") return []
  const entries = (body as { entry?: unknown }).entry
  if (!Array.isArray(entries)) return []
  const messages: InboundMessage[] = []
  for (const entry of entries) {
    const changes = (entry as { changes?: unknown }).changes
    if (!Array.isArray(changes)) continue
    for (const change of changes) {
      const value = (change as { value?: { messages?: unknown } }).value
      const rows = value?.messages
      if (!Array.isArray(rows)) continue
      for (const row of rows) {
        const text = (row as { text?: { body?: unknown }; from?: unknown; id?: unknown }).text?.body
        if (typeof text !== "string" || !text.trim()) continue
        messages.push({
          channel: "whatsapp",
          from: String((row as { from?: unknown }).from ?? ""),
          messageId: String((row as { id?: unknown }).id ?? ""),
          text: text.trim(),
        })
      }
    }
  }
  return messages
}

export function messengerMessages(body: unknown): InboundMessage[] {
  if (!body || typeof body !== "object") return []
  const entries = (body as { entry?: unknown }).entry
  if (!Array.isArray(entries)) return []
  const messages: InboundMessage[] = []
  for (const entry of entries) {
    const messaging = (entry as { messaging?: unknown }).messaging
    if (!Array.isArray(messaging)) continue
    for (const event of messaging) {
      const text = (event as { message?: { text?: unknown; mid?: unknown }; sender?: { id?: unknown } }).message?.text
      if (typeof text !== "string" || !text.trim()) continue
      const message = (event as { message?: { mid?: unknown }; sender?: { id?: unknown } }).message
      messages.push({
        channel: "messenger",
        from: String((event as { sender?: { id?: unknown } }).sender?.id ?? ""),
        messageId: String(message?.mid ?? ""),
        text: text.trim(),
      })
    }
  }
  return messages
}

export function answerInbound(message: InboundMessage, options?: Pick<TurnInput, "dataDir" | "now">) {
  const result = handleTurnWithRules({
    conversationId: `${message.channel}:${message.from}`,
    message: message.text,
    now: options?.now,
    dataDir: options?.dataDir,
  })
  return {
    to: message.from,
    messageId: message.messageId,
    reply: result.reply,
    handoff: result.handoff,
  }
}
