import type { ReactNode } from 'react'
import '@fontsource-variable/manrope'
import '../../../src/styles/globals.scss'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
