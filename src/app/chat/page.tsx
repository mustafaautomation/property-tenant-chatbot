import { ChatDesk } from "@/components/chat-desk"
import { SiteHeader } from "@/components/site-header"

export default function ChatPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SiteHeader />
      <ChatDesk />
    </div>
  )
}
