'use client'

import { useSyncExternalStore } from 'react'
import type { Locale, Rating } from '../lib/presentation'
import styles from './navigation.module.scss'

const subscribers = new Set<() => void>()

function subscribe(callback: () => void) {
  subscribers.add(callback)
  return () => { subscribers.delete(callback) }
}

function currentTheme() {
  const theme = document.documentElement.dataset.theme
  if (theme === 'light' || theme === 'dark') return theme
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function toggleTheme() {
  const next = currentTheme() === 'dark' ? 'light' : 'dark'
  document.documentElement.dataset.theme = next
  try { localStorage.setItem('gofurry-theme', next) } catch {}
  for (const update of subscribers) update()
}

function subscribeTheme(callback: () => void) {
  const unsubscribe = subscribe(callback)
  const scheme = matchMedia('(prefers-color-scheme: dark)')
  scheme.addEventListener('change', callback)
  return () => {
    unsubscribe()
    scheme.removeEventListener('change', callback)
  }
}

export function useTheme() {
  return useSyncExternalStore(subscribeTheme, currentTheme, () => 'light')
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

export function toggleContentMode() {
  setMode(currentMode() === 'sfw' ? 'nsfw' : 'sfw')
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
