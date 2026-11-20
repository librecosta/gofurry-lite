import type { Viewport } from 'next'
import type { ReactNode } from 'react'
import '@fontsource-variable/manrope'
import '@fontsource-variable/noto-sans-sc'
import '../../src/styles/globals.scss'

export const viewport: Viewport = { viewportFit: 'cover' }

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <div className="page-dots" aria-hidden="true" />
        {children}
      </body>
    </html>
  )
}
