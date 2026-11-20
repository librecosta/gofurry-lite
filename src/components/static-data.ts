
'use client'

import { useEffect, useState } from 'react'

const requests = new Map<string, Promise<unknown>>()

function readJson(url: string) {
  const saved = requests.get(url)
  if (saved) return saved
  const request = fetch(url).then((response) => {
    if (!response.ok) throw new Error('Could not load catalogue data')
    return response.json() as Promise<unknown>
  }).catch((error: unknown) => {
    requests.delete(url)
    throw error
  })
  requests.set(url, request)
  return request
}

export function useStaticData<T>(url: string | null) {
  const [result, setResult] = useState<{ url: string; value?: T; failed?: true }>()
  useEffect(() => {
    if (!url) return
    let current = true
    readJson(url).then(
      (value) => { if (current) setResult({ url, value: value as T }) },
      () => { if (current) setResult({ url, failed: true }) },
    )
    return () => { current = false }
  }, [url])
  return result?.url === url ? result : undefined
}
