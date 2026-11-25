import { randomUUID } from "crypto"
import { defaultDataDir, withStore } from "@/lib/store"
import type { TurnResult } from "@/lib/types"

export function conversationPaused(conversationId: string | undefined, dir = defaultDataDir()): boolean {
  if (!conversationId) return false
  let paused = false
  withStore(dir, (store) => {
    paused = Boolean(store.conversations.find((item) => item.id === conversationId)?.botPaused)
  })
  return paused
}

export function markPaused(conversationId: string, dir = defaultDataDir()) {
  withStore(dir, (store) => {
    const conversation = store.conversations.find((item) => item.id === conversationId)
    if (conversation) conversation.botPaused = true
  })
}

export function holdForSpecialist(input: {
  conversationId: string
  message: string
  dir?: string
  now?: Date
}): TurnResult {
  const now = input.now ?? new Date()
  const dir = input.dir ?? defaultDataDir()
  return withStore(dir, (store) => {
    const conversation = store.conversations.find((item) => item.id === input.conversationId)
    if (!conversation) {
      return {
        conversationId: input.conversationId,
        reply: "Amina Rahman has this chat. The desk can resume the assistant from the staff board.",
        toolCalls: [],
        citations: [],
        handoff: null,
        tenant: null,
        ticket: null,
        messages: [],
        source: "rules" as const,
      }
    }
    const reply = "Amina Rahman has this chat. Your note is on the staff board. The desk can resume the assistant from /admin."
    conversation.messages.push({
      id: randomUUID(),
      role: "user",
      content: input.message,
      createdAt: now.toISOString(),
    })
    conversation.messages.push({
      id: randomUUID(),
      role: "assistant",
      content: reply,
      createdAt: now.toISOString(),
      handoffId: conversation.handoffIds.at(-1) ?? null,
    })
    conversation.updatedAt = now.toISOString()
    return {
      conversationId: conversation.id,
      reply,
      toolCalls: [],
      citations: [],
      handoff: null,
      tenant: null,
      ticket: null,
      messages: conversation.messages,
      source: "rules" as const,
    }
  })
}
