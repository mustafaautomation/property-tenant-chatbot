import Script from "next/script"
import { SiteHeader } from "@/components/site-header"

const snippet = `<script src="https://property-chat.quvantic.com/widget.js" data-origin="https://property-chat.quvantic.com" async></script>`

export default function EmbedDemoPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SiteHeader />
      <main id="content" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <p className="text-xs tracking-wide text-copper uppercase">Sample host site</p>
        <h1 className="mt-2 text-4xl">Cedar Street bakery</h1>
        <p className="mt-3 text-muted-foreground">
          This page is a stand-in for a building website. The resident desk is not part of the page layout. It arrives from one script tag and opens in an iframe.
        </p>
        <pre className="mt-6 overflow-x-auto rounded-xl bg-primary p-4 text-sm text-primary-foreground">
          <code>{snippet}</code>
        </pre>
        <p className="mt-4 text-sm text-muted-foreground">
          Use the Desk button at the lower right. Escape closes it. The same chat runs inside the frame.
        </p>
      </main>
      <Script src="/widget.js" strategy="afterInteractive" />
    </div>
  )
}
