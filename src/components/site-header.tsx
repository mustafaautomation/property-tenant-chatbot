import Link from "next/link"

export function SiteHeader({ desk = false }: { desk?: boolean }) {
  return (
    <header className="border-b border-border/80 bg-card/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="group flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
            K
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate font-heading text-sm text-foreground sm:text-base">Keystone Residences</span>
            <span className="hidden text-xs text-muted-foreground sm:block">Cedarhaven resident desk</span>
          </span>
        </Link>
        <nav className="flex shrink-0 items-center gap-1 text-sm whitespace-nowrap">
          <Link href="/chat" className="rounded-lg px-2.5 py-2 text-foreground hover:bg-muted sm:px-3">
            <span className="sm:hidden">Chat</span>
            <span className="hidden sm:inline">Resident chat</span>
          </Link>
          <Link
            href="/admin"
            className={`rounded-lg px-2.5 py-2 sm:px-3 ${desk ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"}`}
          >
            <span className="sm:hidden">Staff</span>
            <span className="hidden sm:inline">Staff desk</span>
          </Link>
        </nav>
      </div>
    </header>
  )
}
