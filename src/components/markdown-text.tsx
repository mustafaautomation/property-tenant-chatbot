export function MarkdownText({ text, streaming = false }: { text: string; streaming?: boolean }) {
  const lines = text.split("\n")
  return (
    <div className="space-y-1 text-[14.5px] leading-[22px]">
      {lines.map((line, index) => {
        const list = line.match(/^\s*[-*]\s+(.*)/)
        const content = renderInline(list ? list[1] : line)
        const caret = streaming && index === lines.length - 1 ? <span className="stream-caret" data-streaming="true" aria-hidden="true" /> : null
        if (list) {
          return (
            <p key={index} className="pl-4">
              • {content}
              {caret}
            </p>
          )
        }
        return (
          <p key={index}>
            {content}
            {caret}
          </p>
        )
      })}
    </div>
  )
}

function renderInline(line: string) {
  const parts = line.split(/(\*\*[^*]+\*\*|\b(?:KR|HO|AM|NC|MI)-\d+\b)/g)
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>
    if (/^(?:KR|HO|AM|NC|MI)-\d+$/.test(part)) {
      return (
        <span key={index} className="rounded-md bg-[var(--muted)] px-1 font-mono text-[13px]">
          {part}
        </span>
      )
    }
    return <span key={index}>{part}</span>
  })
}
