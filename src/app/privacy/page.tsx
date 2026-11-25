import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { BRAND } from "@/lib/brand"

export default function PrivacyPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="content" className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <h1 className="font-display text-4xl">Privacy</h1>
        <p className="mt-4 text-[var(--muted-foreground)]">
          Chats, photos, and contact details in this demo stay in the session or the demo JSON store. Nothing is sent to a third-party host. The people and buildings are fictional.
        </p>
        <p className="mt-4">{BRAND.disclaimer}</p>
      </main>
      <SiteFooter />
    </div>
  )
}
