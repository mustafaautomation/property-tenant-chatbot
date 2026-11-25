export function MarkdownText({ text }: { text: string }) {
  const lines = text.split("\n")
  return (
    <div className="space-y-1">
      {lines.map((line, index) => {
        const list = line.match(/^\s*[-*]\s+(.*)/)
        const content = renderInline(list ? list[1] : line)
        if (list) {
          return (
            <p key={index} className="pl-4">
              • {content}
            </p>
          )
        }
        return <p key={index}>{content}</p>
      })}
    </div>
  )
}

function renderInline(line: string) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>
    }
    return <span key={index}>{part}</span>
  })
}
