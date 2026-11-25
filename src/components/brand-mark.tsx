export function BrandMark({ className = "size-5", strokeWidth = 1.75 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <path
        d="M4 20V11.2C4 6.9 7.6 3.5 12 3.5s8 3.4 8 7.7V20"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <path d="M9.2 20v-4.2a2.8 2.8 0 0 1 5.6 0V20" stroke="currentColor" strokeWidth={strokeWidth} />
      <path d="M10.2 8.2h3.6L14.6 11H9.4l.8-2.8Z" fill="currentColor" />
    </svg>
  )
}
