"use client"

import Script from "next/script"
import { useTheme } from "next-themes"
import { SiteFooter } from "@/components/site-footer"
import { BRAND } from "@/lib/brand"

export default function EmbedDemoPage() {
  const { resolvedTheme, setTheme } = useTheme()
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--clay)] bg-[var(--accent-soft)] px-4 py-2 text-sm">
        <p>This is how the embed looks on a real site. The banner is not part of the host page.</p>
        <button
          type="button"
          className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1"
          onClick={() => {
            const next = resolvedTheme === "dark" ? "light" : "dark"
            setTheme(next)
            document.querySelector("iframe")?.contentWindow?.postMessage({ source: "keystone-host", type: "theme", theme: next }, window.location.origin)
          }}
        >
          Theme
        </button>
      </div>
      <main id="content" className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <p className="text-xs tracking-wide text-[var(--clay)] uppercase">The Alden · sample host</p>
        <h1 className="font-display mt-2 text-5xl">A quieter lobby on Cedar Street.</h1>
        <p className="mt-4 max-w-xl text-[var(--muted-foreground)]">
          Packages wait 48 hours. The rooftop lounge books in two-hour blocks. The resident desk is not in the page layout. It arrives from one script tag.
        </p>
        <p className="mt-8 text-sm text-[var(--muted-foreground)]">{BRAND.disclaimer}</p>
      </main>
      <SiteFooter />
      <Script src="/widget.js" strategy="afterInteractive" />
    </div>
  )
}
