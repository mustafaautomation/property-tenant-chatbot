"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { X } from "lucide-react"
import { BrandMark } from "@/components/brand-mark"
import { DeskWidget, type DeskEvent } from "@/components/chat/desk-widget"
import { BRAND } from "@/lib/brand"

const TEASER = "Heater acting up? I can open a ticket today."

export function FloatingWidget({ onEvent }: { onEvent?: (event: DeskEvent) => void }) {
  const [open, setOpen] = useState(false)
  const [pills, setPills] = useState(false)
  const [teaser, setTeaser] = useState(false)
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

  useEffect(() => {
    const visual = document.documentElement.dataset.visualTest === "1"
    const pillsDelay = visual || reduced ? 0 : 1200
    const teaserDelay = visual || reduced ? 0 : 4000
    const dismissed = window.sessionStorage.getItem("keystone-nudges-dismissed")
    const teaserOff = window.localStorage.getItem("keystone-teaser-dismissed")
    const pillTimer = window.setTimeout(() => {
      if (!dismissed) setPills(true)
    }, pillsDelay)
    const teaserTimer = window.setTimeout(() => {
      if (!teaserOff) setTeaser(true)
    }, teaserDelay)
    return () => {
      window.clearTimeout(pillTimer)
      window.clearTimeout(teaserTimer)
    }
  }, [reduced])

  useEffect(() => {
    function onClose(event: MessageEvent) {
      if (event.data?.source === "keystone" && event.data?.type === "close") setOpen(false)
    }
    window.addEventListener("message", onClose)
    return () => window.removeEventListener("message", onClose)
  }, [])

  function launch(prompt?: string) {
    setOpen(true)
    setPills(false)
    setTeaser(false)
    if (prompt) window.setTimeout(() => window.dispatchEvent(new CustomEvent("keystone-frame-ask", { detail: prompt })), 350)
  }

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[2147483000] flex flex-col items-end gap-3 sm:right-6 sm:bottom-6">
      <AnimatePresence>
        {pills && !open ? (
          <motion.div
            key="pills"
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="pointer-events-auto flex flex-col items-end gap-2"
          >
            <button
              type="button"
              aria-label="Dismiss suggestions"
              className="grid size-6 place-items-center rounded-full border bg-[var(--surface)]"
              onClick={() => {
                setPills(false)
                window.sessionStorage.setItem("keystone-nudges-dismissed", "1")
              }}
            >
              <X className="size-3" />
            </button>
            {BRAND.nudges.map((label) => (
              <button
                key={label}
                type="button"
                data-testid="launcher-nudge"
                className="h-9 rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] px-3.5 text-[13px] font-medium shadow-[var(--shadow-card)] backdrop-blur"
                onClick={() => launch(label === "Report a repair" ? "I need a maintenance ticket" : "When is rent due?")}
              >
                {label}
              </button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
      <div className="flex items-end gap-2">
        {teaser && !open ? (
          <div data-testid="launcher-teaser" className="pointer-events-auto mb-2 max-w-[240px] rounded-[16px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[13px] shadow-[var(--shadow-card)]">
            <button
              type="button"
              aria-label="Dismiss teaser"
              className="float-right ml-2 grid size-6 place-items-center"
              onClick={() => {
                setTeaser(false)
                window.localStorage.setItem("keystone-teaser-dismissed", "1")
              }}
            >
              <X className="size-3" />
            </button>
            <button type="button" className="text-left" onClick={() => launch("My heater isn't working")}>
              {TEASER}
            </button>
          </div>
        ) : null}
        <button
          type="button"
          data-testid="chat-launcher"
          aria-label={open ? "Close chat" : `Open chat with ${BRAND.botName}`}
          aria-expanded={open}
          aria-controls="keystone-floating-panel"
          className="pointer-events-auto grid size-14 place-items-center rounded-full bg-[var(--clay)] text-[var(--clay-foreground)] shadow-[var(--shadow-launcher)] ring-1 ring-white/30 transition-transform hover:scale-105 active:scale-95 sm:size-[60px]"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="size-[22px]" strokeWidth={2} /> : <BrandMark className="size-[22px]" strokeWidth={2} />}
        </button>
      </div>
      <AnimatePresence>
        {open ? (
          <motion.div
            id="keystone-floating-panel"
            key="panel"
            data-testid="floating-panel"
            role="dialog"
            aria-label="Keystone resident desk"
            initial={reduced ? false : { opacity: 0, y: 18, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? undefined : { opacity: 0, y: 10 }}
            className="chat-widget-shell pointer-events-auto fixed inset-0 z-[2147483000] h-dvh w-dvw sm:inset-auto sm:right-6 sm:bottom-[100px] sm:h-[min(680px,calc(100dvh-124px))] sm:w-[400px]"
          >
            <DeskWidget variant="frame" storageKey="keystone-fab" onEvent={onEvent} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
