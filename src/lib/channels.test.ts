import fs from "fs"
import os from "os"
import path from "path"
import { describe, expect, it } from "vitest"
import { answerInbound, messengerMessages, readChallenge, whatsappMessages } from "@/lib/channels"

const whatsappPayload = {
  object: "whatsapp_business_account",
  entry: [
    {
      changes: [
        {
          value: {
            messages: [
              {
                from: "15551212000",
                id: "wamid.1",
                type: "text",
                text: { body: "What are quiet hours on Sunday?" },
              },
            ],
          },
        },
      ],
    },
  ],
}

const messengerPayload = {
  object: "page",
  entry: [
    {
      messaging: [
        {
          sender: { id: "PSID-42" },
          message: { mid: "m_1", text: "When is rent late, and what does the fee cost?" },
        },
      ],
    },
  ],
}

describe("channel adapters", () => {
  it("accepts the webhook verify handshake", () => {
    const query = new URLSearchParams({
      "hub.mode": "subscribe",
      "hub.verify_token": "keystone-demo-verify",
      "hub.challenge": "abc123",
    })
    expect(readChallenge(query, "keystone-demo-verify")).toEqual({ ok: true, challenge: "abc123" })
    expect(readChallenge(query, "other").ok).toBe(false)
  })

  it("maps a WhatsApp text message onto the resident desk", () => {
    const [message] = whatsappMessages(whatsappPayload)
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "keystone-wa-"))
    const reply = answerInbound(message, { dataDir: dir, now: new Date("2026-11-25T16:00:00.000Z") })
    expect(reply.to).toBe("15551212000")
    expect(reply.reply).toMatch(/9:00 a\.m\./)
  })

  it("maps a Messenger text message onto the resident desk", () => {
    const [message] = messengerMessages(messengerPayload)
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "keystone-ms-"))
    const reply = answerInbound(message, { dataDir: dir, now: new Date("2026-11-25T16:00:00.000Z") })
    expect(message.channel).toBe("messenger")
    expect(reply.reply).toMatch(/\$75/)
  })
})
