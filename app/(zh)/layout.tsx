import type { ReactNode } from 'react'
import '@fontsource-variable/manrope'
import '@fontsource-variable/noto-sans-sc'
import '../../src/styles/globals.scss'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
