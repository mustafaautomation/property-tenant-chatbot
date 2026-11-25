"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"
import { BrandMark } from "@/components/brand-mark"

export function SiteHeader() {
  const { resolvedTheme, setTheme } = useTheme()
  const [scrolled, setScrolled] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header className={`sticky top-0 z-40 h-16 border-b border-transparent ${scrolled ? "border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_86%,transparent)] backdrop-blur" : ""}`}>
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <span className="grid size-9 place-items-center rounded-full bg-[var(--clay)] text-[var(--clay-foreground)]">
            <BrandMark className="size-5" strokeWidth={2} />
          </span>
          <span className="truncate text-[15px] font-semibold">Keystone Residences</span>
        </Link>
        <nav className="flex items-center gap-1 text-[13px] sm:gap-2 sm:text-sm">
          <Link href="/#how" className="hidden rounded-lg px-2 py-2 sm:inline">How it works</Link>
          <Link href="/chat" className="rounded-lg px-2 py-2">Live chat</Link>
          <Link href="/admin" className="rounded-lg px-2 py-2">Admin</Link>
          <Link href="/embed-demo" className="hidden rounded-lg px-2 py-2 md:inline">Embed</Link>
          <button
            type="button"
            aria-label="Switch color theme"
            className="grid size-9 place-items-center rounded-full"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          >
            {mounted && resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          <button
            type="button"
            className="inline-flex h-9 items-center rounded-full bg-[var(--accent)] px-3 text-[13px] font-medium text-[var(--accent-foreground)]"
            onClick={() => {
              const hero = document.querySelector<HTMLTextAreaElement>("[data-testid='landing-hero-chat'] textarea")
              if (hero) {
                document.getElementById("live-desk")?.scrollIntoView({ behavior: "smooth", block: "center" })
                hero.focus()
                return
              }
              window.location.href = "/chat"
            }}
          >
            Open the desk
          </button>
        </nav>
      </div>
    </header>
  )
}
