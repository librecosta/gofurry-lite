'use client'

import { useSyncExternalStore } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import type { Locale, Rating } from '../lib/presentation'
import { immediate, interaction, modeSpring } from './motion'
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
  return useSyncExternalStore(subscribeTheme, currentTheme, () => null)
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

export function ContentModeSwitch({ locale, disabled }: { locale: Locale; disabled: boolean }) {
  const mode = useContentMode()
  const reduce = useReducedMotion()
  const nsfw = mode === 'nsfw'
  return <fieldset className={styles.modeSwitch} data-mode={mode} disabled={disabled}>
    <legend className="sr-only">{locale === 'zh' ? '内容展示模式' : 'Content display mode'}</legend>
    <motion.span className={styles.modeTrack} aria-hidden="true" initial={false}
      animate={{ borderColor: nsfw ? 'var(--mode-on)' : 'var(--mode-off)', backgroundColor: nsfw ? 'var(--mode-wash)' : 'transparent' }}
      transition={reduce ? immediate : interaction}>
      <motion.span className={styles.modeThumb} initial={false}
        animate={{ x: nsfw ? 20 : 0, backgroundColor: nsfw ? 'var(--mode-on)' : 'var(--mode-off)' }}
        transition={reduce ? immediate : { x: modeSpring, backgroundColor: interaction }} />
    </motion.span>
    {(['sfw', 'nsfw'] as const).map((value) => <label key={value}>
      <input className="sr-only" type="radio" name="content-mode" value={value} checked={mode === value} onChange={() => setMode(value)} />
      <motion.span initial={false} transition={reduce ? immediate : interaction}
        animate={{ color: mode === value ? (nsfw ? 'var(--mode-on)' : 'var(--text)') : 'var(--muted)' }}
        whileHover={{ color: value === 'nsfw' ? 'var(--mode-on)' : 'var(--text)' }}>{value.toUpperCase()}</motion.span>
    </label>)}
  </fieldset>
}
