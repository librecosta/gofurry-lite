'use client'

import { useSyncExternalStore } from 'react'
import { Icon } from './icons'
import type { Locale } from '../lib/catalog'

const subscribers = new Set<() => void>()

function subscribe(callback: () => void) {
  subscribers.add(callback)
  return () => { subscribers.delete(callback) }
}

function currentTheme() {
  const theme = document.documentElement.dataset.theme
  return theme === 'light' || theme === 'dark' ? theme : 'system'
}

function toggleTheme() {
  const active = currentTheme()
  const hasDark = active === 'dark' || (active === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  const next = hasDark ? 'light' : 'dark'
  document.documentElement.dataset.theme = next
  try { localStorage.setItem('gofurry-theme', next) } catch {}
  for (const update of subscribers) update()
}


export function ThemeButton({ locale }: { locale: Locale }) {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => 'system')
  const description = locale === 'zh' ? '切换亮暗主题' : 'Toggle light or dark theme'
  return <button className="icon-button" type="button" onClick={toggleTheme} aria-label={description} title={description}><Icon name={theme === 'dark' ? 'sun' : 'moon'} /></button>
}
