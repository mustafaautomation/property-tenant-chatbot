import type { EmergencyKind, Priority, TicketCategory } from "@/lib/types"

const PRIORITY_RANK: Record<Priority, number> = {
  low: 0,
  normal: 1,
  high: 2,
  urgent: 3,
}

export function higherPriority(a: Priority, b: Priority): Priority {
  return PRIORITY_RANK[a] >= PRIORITY_RANK[b] ? a : b
}

export function etaFor(priority: Priority): string {
  switch (priority) {
    case "urgent":
      return "Today, within 4 hours while a technician is on duty."
    case "high":
      return "Today, before the desk closes at 6:00 p.m."
    case "normal":
      return "Next business day."
    case "low":
      return "Within 5 business days."
  }
}

function isHypothetical(text: string): boolean {
  const trimmed = text.trim()
  if (/\b(what if|what should|what do i do|how do i|how should|in case of|procedure for|what's the procedure|what is the procedure)\b/i.test(trimmed)) {
    return true
  }
  if (/^(what|how|when|where|why|can |could |should |do |does )\b/i.test(trimmed)) {
    return !/\b(right now|help me|i smell|i'm |i am |we're |we are |locked out)\b/i.test(trimmed)
  }
  return false
}

function isGas(text: string): boolean {
  if (/gas (stove|range|oven|burner).{0,40}(won't|wont|not|isn't|isnt|does not|doesn't).{0,20}(light|ignite)/.test(text)) {
    return false
  }
  if (/smell(s|ing)? (of )?gas|gas leak|rotten eggs?|odor of gas/.test(text)) return true
  if (/\bgas\b/.test(text) && /\b(leak|leaking|smell|odor|hiss)\b/.test(text)) return true
  return false
}

function isFire(text: string): boolean {
  if (/smoke detector|detector is (chirp|beep)|chirping|beeping|fire alarm test|fireplace|fire pit/.test(text)) {
    return false
  }
  if (/\b(fire|flames?)\b/.test(text)) return true
  if (/\bsmoke\b/.test(text)) return true
  return false
}

function isFlood(text: string): boolean {
  if (/\b(flood(ing|ed)?|pipe burst|water everywhere|gushing)\b/.test(text)) return true
  if (/pouring from the (ceiling|wall)|water pouring|ceiling is (leaking badly|pouring)/.test(text)) return true
  return false
}

function isLockout(text: string): boolean {
  return /locked out|lockout|keys are inside|keys locked inside|lost my keys|can't get into|cannot get into|cant get into/.test(text)
}

function isNoHeat(text: string): boolean {
  if (/hot water|water heater/.test(text) && !/no heat\b|furnace|freezing/.test(text)) return false
  return /no heat|heat is out|heat (is )?(not working|broken|out)|heater (is )?(not|isn't|isnt|won't|wont)|furnace (is )?(out|broken|not)|freezing in|radiator is cold/.test(text)
}

export function detectEmergency(text: string): EmergencyKind | null {
  const normalized = text.toLowerCase()
  let kind: EmergencyKind | null = null
  if (isGas(normalized)) kind = "gas"
  else if (isFire(normalized)) kind = "fire"
  else if (isFlood(normalized)) kind = "flooding"
  else if (isLockout(normalized)) kind = "lockout"
  else if (isNoHeat(normalized)) kind = "no_heat"
  if (!kind) return null
  if (isHypothetical(text)) return null
  return kind
}

export function triageMaintenance(text: string): {
  category: TicketCategory
  priority: Priority
  rationale: string
} {
  const normalized = text.toLowerCase()
  let category: TicketCategory = "general"

  if (/sink|toilet|leak|drain|faucet|plumb|disposal|pipe|water|clog/.test(normalized)) category = "plumbing"
  else if (/outlet|spark|breaker|light|electrical|power|detector|bulb/.test(normalized)) category = "electrical"
  else if (/ac\b|a\/c|air condition|hvac|thermostat|heat/.test(normalized)) category = "hvac"
  else if (/fridge|refrigerator|dishwasher|oven|stove|washer|dryer|appliance|microwave/.test(normalized)) category = "appliance"
  else if (/roach|ant|mouse|pest|bug|bedbug/.test(normalized)) category = "pest"
  else if (/lock|key|door won't|door wont/.test(normalized)) category = "locksmith"

  let priority: Priority = "normal"
  let rationale = "This can go on the next business-day route."

  if (/paint|scuff|nail hole|cosmetic|touch-up|touch up/.test(normalized)) {
    priority = "low"
    rationale = "Cosmetic work is batched within five business days."
  }

  if (/chirp|beep|battery|light is out|bulb|won't latch|squeak/.test(normalized)) {
    priority = "normal"
    rationale = "This is a routine visit, not an active leak or a life-safety call."
  }

  if (/drip|dripping|slow leak|running toilet/.test(normalized)) {
    priority = "high"
    rationale = "A slow drip can wait behind active leaks, and it is still scheduled today."
  }

  if (
    /active leak|leaking|overflow|sewage|no water|no hot water|spark|fridge|refrigerator|toilet.*(overflow|won't flush|not working)|clog/.test(
      normalized,
    )
  ) {
    priority = "urgent"
    rationale = "Water, an essential appliance, or a clog that blocks the unit is an urgent visit."
  }

  if (/sink/.test(normalized) && /leak/.test(normalized)) {
    category = "plumbing"
    priority = "urgent"
    rationale = "Water is actively leaking from the sink, so this is an urgent plumbing visit rather than a routine drip."
  }

  if (/drip/.test(normalized) && !/leak/.test(normalized)) {
    priority = "high"
    rationale = "A drip is not a flood. It is scheduled today, ahead of cosmetic work."
  }

  if (/no hot water|water heater/.test(normalized)) {
    category = "plumbing"
    priority = "urgent"
    rationale = "No hot water is urgent. It is not the no-heat emergency line unless the apartment heat is also out."
  }

  if (/gas (stove|range|oven|burner)/.test(normalized) && /won't|wont|not light|doesn't light|does not light/.test(normalized)) {
    category = "appliance"
    priority = "normal"
    rationale = "A burner that will not light, with no gas odor, is an appliance visit. A gas odor is the emergency line."
  }

  return { category, priority, rationale }
}

export function entryPermissionFrom(text: string): string {
  if (/you can enter|ok to enter|permission to enter|enter if i'?m out|enter if i am out/.test(text.toLowerCase())) {
    return "Permission granted to enter if the resident is out."
  }
  if (/do not enter|don't enter|dont enter|i'?ll be home|i will be home|call first/.test(text.toLowerCase())) {
    return "Call first. The resident will be home."
  }
  return "Call first, and enter if there is no answer."
}
