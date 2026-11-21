'use client'

import { useEffect, useRef, useState } from 'react'
import { homeGameCount, sampleHomeGames, type HomeDirectory, type HomeGame } from '../lib/home-games'
import { href, type Locale, type Rating } from '../lib/presentation'
import { useContentMode } from './preferences'
import { readStaticData } from './static-data'

const storageKey = 'gofurry-home-game-rotation'
type Picks = Partial<Record<Rating, unknown>>

function startVisit(locale: Locale): Picks {
  try {
    // The language links cross documents. Reloads and independent visits start a new draw.
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    const previous = new URL(document.referrer || location.href)
    if (navigation?.type === 'navigate' && previous.origin === location.origin &&
      previous.pathname === href(locale === 'zh' ? 'en' : 'zh')) {
      const saved: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? '{}')
      if (saved && typeof saved === 'object') return saved as Picks
    }
    sessionStorage.removeItem(storageKey)
  } catch {}
  return {}
}

function restoreGames(pool: HomeGame[], ids: unknown) {
  if (!Array.isArray(ids) || ids.length !== homeGameCount || new Set(ids).size !== homeGameCount) return
  const byId = new Map(pool.map((game) => [game.id, game]))
  const games = ids.map((id) => byId.get(id))
  if (games.every((game) => game !== undefined)) return games
}

export function useHomeGameRotation(initial: HomeDirectory, locale: Locale) {
  const mode = useContentMode(null)
  const picks = useRef<Picks | undefined>(undefined)
  const [rotations, setRotations] = useState<Partial<Record<Rating, HomeDirectory>>>({})
  const [failedMode, setFailedMode] = useState<Rating>()
  const current = mode ? rotations[mode] : undefined

  useEffect(() => {
    if (!mode || current) return
    const visit = (picks.current ??= startVisit(locale))
    let active = true
    const request = mode === 'sfw'
      ? readStaticData<HomeGame[]>('/indexes/home-games.json').then((games) => ({ sites: initial.sites, games }))
      : readStaticData<HomeDirectory>('/indexes/extended/home-directory.json')

    request.then(({ sites, games: pool }) => {
      if (!active) return
      const games = restoreGames(pool, visit[mode]) ?? sampleHomeGames(pool)
      if (games.length !== homeGameCount) throw new Error('Incomplete home game rotation')
      visit[mode] = games.map(({ id }) => id)
      try { sessionStorage.setItem(storageKey, JSON.stringify(visit)) } catch {}
      setRotations((previous) => ({ ...previous, [mode]: { sites, games } }))
    }).catch(() => { if (active) setFailedMode(mode) })

    return () => { active = false }
  }, [current, initial.sites, locale, mode])

  return {
    directory: current ?? rotations.sfw ?? initial,
    rotation: current ? mode : null,
    expanded: mode === 'nsfw' && Boolean(current),
    pending: mode === 'nsfw' && !current && failedMode !== mode,
    failed: mode === 'nsfw' && !current && failedMode === mode,
  }
}
