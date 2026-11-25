"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function LoginCard() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })
      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        setError(payload.error || "That password does not open the desk.")
        return
      }
      router.refresh()
    } catch {
      setError("The desk couldn't be reached.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-6">
        <p className="text-xs tracking-wide text-copper uppercase">Staff desk</p>
        <h1 className="mt-2 text-3xl">Open the board</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This is a public demo. The password is <span className="font-medium text-foreground">keystone-demo</span>. It does not protect a real building.
        </p>
        <div className="mt-5 space-y-2">
          <Label htmlFor="desk-password">Password</Label>
          <Input
            id="desk-password"
            data-testid="desk-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-11"
          />
        </div>
        {error ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="mt-4 h-11 w-full" disabled={pending || !password}>
          {pending ? "Checking…" : "Enter the desk"}
        </Button>
      </form>
    </div>
  )
}
