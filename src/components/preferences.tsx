'use client'

import { useSyncExternalStore } from 'react'
import { Icon } from './icons'
import type { Locale, Rating } from '../lib/presentation'
import styles from './site.module.scss'

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

const ratingKey = 'gofurry-content-mode'

function currentMode(): Rating {
  try {
    const stored = localStorage.getItem(ratingKey)
    if (stored === 'sfw' || stored === 'nsfw') return stored
  } catch {}
  return document.documentElement.dataset.contentMode === 'nsfw' ? 'nsfw' : 'sfw'
}

function setMode(mode: Rating) {
  document.documentElement.dataset.contentMode = mode
  try { localStorage.setItem(ratingKey, mode) } catch {}
  for (const update of subscribers) update()
}

export function useContentMode() {
  return useSyncExternalStore(subscribe, currentMode, () => 'sfw' as const)
}

export function ContentModeSwitch({ locale }: { locale: Locale }) {
  const mode = useContentMode()
  return <fieldset className={styles.modeSwitch} data-mode={mode}>
    <legend className="sr-only">{locale === 'zh' ? '内容展示模式' : 'Content display mode'}</legend>
    {(['sfw', 'nsfw'] as const).map((value) => <label key={value}>
      <input className="sr-only" type="radio" name="content-mode" value={value} checked={mode === value} onChange={() => setMode(value)} />
      <span>{value.toUpperCase()}</span>
    </label>)}
  </fieldset>
}
