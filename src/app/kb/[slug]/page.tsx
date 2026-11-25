import fs from "fs"
import path from "path"
import { notFound } from "next/navigation"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"

export default async function KnowledgePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!/^[a-z0-9-]+$/.test(slug)) notFound()
  const file = path.join(process.cwd(), "kb", `${slug}.md`)
  if (!fs.existsSync(file)) notFound()
  const raw = fs.readFileSync(file, "utf8")
  const title = raw.match(/^#\s+(.+)$/m)?.[1] ?? slug
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="content" className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <p className="text-xs tracking-wide text-[var(--muted-foreground)] uppercase">Resident note</p>
        <h1 className="font-display mt-2 text-4xl">{title}</h1>
        <pre className="mt-6 font-sans text-sm leading-6 whitespace-pre-wrap">{raw.replace(/^#\s+.+\n/, "")}</pre>
      </main>
      <SiteFooter />
    </div>
  )
}
