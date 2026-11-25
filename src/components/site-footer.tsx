import { BRAND } from "@/lib/brand"

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">
      <p>{BRAND.address}</p>
      <p className="mt-2">
        <a className="underline" href="https://github.com/mustafaautomation/property-tenant-chatbot">GitHub</a>
        {" · "}
        <a className="underline" href="/privacy">Privacy</a>
      </p>
      <p className="mt-3">{BRAND.disclaimer}</p>
    </footer>
  )
}
