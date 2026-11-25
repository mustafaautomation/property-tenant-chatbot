"use client"

import { useState } from "react"
import { DeskWidget, type DeskEvent } from "@/components/chat/desk-widget"
import { SiteHeader } from "@/components/site-header"
import { EMERGENCY_PHONE } from "@/lib/catalog"

export default function ChatPage() {
  const [toast, setToast] = useState<string | null>(null)
  return (
    <div className="flex h-dvh flex-col">
      <SiteHeader />
      <main id="content" className="mx-auto flex min-h-0 w-full max-w-[440px] flex-1 px-3 py-3">
        <div className="chat-widget-shell min-h-0 flex-1">
          <DeskWidget
            variant="page"
            onEvent={(event: DeskEvent) => {
              setToast(event.type === "urgent" ? `URGENT SMS sent to on-call · ${EMERGENCY_PHONE}` : `New human support request · ${event.name}`)
            }}
          />
        </div>
      </main>
      {toast ? (
        <div data-testid="ops-toast" className="fixed top-20 right-4 z-50 max-w-xs rounded-[16px] border bg-[var(--surface)] p-3 text-sm shadow-[var(--shadow-card)]">
          {toast}
        </div>
      ) : null}
    </div>
  )
}
