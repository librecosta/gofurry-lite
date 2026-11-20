'use client'

import { useMemo, useSyncExternalStore } from 'react'

const storageKey = 'gofurry-visited-sites'
const empty = '[]'
const listeners = new Set<() => void>()
let unsaved: string | undefined

function readSnapshot() {
  if (unsaved !== undefined) return unsaved
  try { return localStorage.getItem(storageKey) ?? empty } catch { return empty }
}

function parseVisits(snapshot: string) {
  try {
    const ids: unknown = JSON.parse(snapshot)
    if (Array.isArray(ids)) return new Set<number>(ids.filter((id) => Number.isSafeInteger(id) && id > 0))
  } catch {}
  return new Set<number>()
}

function subscribe(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === storageKey || event.key === null) listener()
  }
  listeners.add(listener)
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function useVisitedSites() {
  const snapshot = useSyncExternalStore(subscribe, readSnapshot, () => empty)
  return useMemo(() => parseVisits(snapshot), [snapshot])
}

export function markSiteVisited(id: number) {
  const visits = parseVisits(readSnapshot())
  if (visits.has(id)) return
  visits.add(id)
  const snapshot = JSON.stringify([...visits])
  try {
    localStorage.setItem(storageKey, snapshot)
    unsaved = undefined
  } catch {
    unsaved = snapshot
  }
  for (const listener of listeners) listener()
}
