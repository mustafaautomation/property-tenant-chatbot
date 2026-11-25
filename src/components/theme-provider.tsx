"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"
import { MotionConfig } from "motion/react"

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <MotionConfig reducedMotion="user" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
        {children}
      </MotionConfig>
    </NextThemesProvider>
  )
}
