const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
const PHONE = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/g

export function maskPii(text: string): string {
  return text.replace(EMAIL, "[email]").replace(PHONE, "[phone]")
}

export function isInjection(text: string): boolean {
  return /\b(ignore (all |your |previous |the )?(instructions|rules)|system prompt|developer message|you are now|jailbreak|reveal (the )?(hidden )?prompt|print the (system )?prompt)\b/i.test(
    text,
  )
}

export function isOffTopic(text: string): boolean {
  return /\b(poem|haiku|homework|stock market|bitcoin|crypto price|recipe for|weather forecast|write (me )?(some )?code|capital of|celebrity|movie script|sports score|who won the)\b/i.test(
    text,
  )
}

export function isFrustrated(text: string): boolean {
  return /\b(this is useless|you'?re useless|worst (service|desk)|nobody helps|so frustrated|i'?m furious|terrible service|this is ridiculous)\b/i.test(
    text,
  )
}

export function isSensitive(text: string): boolean {
  return /\b(lawsuit|sue you|sue the|my lawyer|an attorney|evict|eviction|discriminat|harassment|domestic violence|restraining order)\b/i.test(
    text,
  )
}
