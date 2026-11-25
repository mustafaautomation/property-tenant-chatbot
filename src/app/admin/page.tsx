import { cookies } from "next/headers"
import { LoginCard } from "@/components/login-card"
import { SiteHeader } from "@/components/site-header"
import { StaffDesk } from "@/components/staff-desk"
import { DESK_COOKIE, deskToken } from "@/lib/auth"

export default async function AdminPage() {
  const jar = await cookies()
  const signedIn = jar.get(DESK_COOKIE)?.value === deskToken()
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main id="content" className="flex-1">
        {signedIn ? <StaffDesk /> : <LoginCard />}
      </main>
    </div>
  )
}
