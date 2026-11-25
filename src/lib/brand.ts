export const BRAND = {
  name: "Keystone Residences",
  botName: "Keystone desk",
  subtitle: "Resident desk · AI agent",
  agentName: "Amina Rahman",
  agentSubtitle: "Amina Rahman · human specialist",
  city: "Cedarhaven",
  address: "410 Cedar Street, Cedarhaven",
  nudges: ["Report a repair", "When is rent due?"],
  placeholder: "Ask about a repair, rent, or the lease notes…",
  humanPlaceholder: "Message Amina Rahman…",
  greeting:
    "I can open a repair, check the lease notes, and read a ledger for a verified unit. Emergencies — flooding, gas, fire, no heat, and lockouts — page the on-call line.",
  disclaimer: "Portfolio demo by Quvantic - fictional brand, not a real business / not client work",
  accuracy: "AI can be inaccurate.",
} as const

export const STARTERS = [
  { label: "My heater isn't working", prompt: "My heater isn't working", icon: "thermometer" },
  { label: "What's the package policy?", prompt: "What's the package policy?", icon: "package" },
  { label: "I need a maintenance ticket", prompt: "I need a maintenance ticket", icon: "wrench" },
  { label: "Talk to the office", prompt: "I want to talk to a person", icon: "headphones" },
] as const

export const METRICS = [
  { value: "24", label: "Resident notes" },
  { value: "33", label: "Evals in CI" },
  { value: "10", label: "Desk tools" },
  { value: "Seconds", label: "Replies in" },
] as const

export const VISUAL_CLOCK = "2026-11-25T18:00:00.000Z"

export const KB_COUNT = 24
export const EVAL_COUNT = 33
export const TOOL_COUNT = 10
