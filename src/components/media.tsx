'use client'

import { useCallback, useState } from 'react'
import { Icon } from './icons'
import styles from './site.module.scss'

/* Static export serves archived logos and official game media without an image server. */
export function Media({ src, label, kind = 'cover', eager = false, revealOnLoad = false, noScriptSrc }: {
  src?: string; label?: string; kind?: 'cover' | 'logo'; eager?: boolean; revealOnLoad?: boolean; noScriptSrc?: string
}) {
  const [failedSource, setFailedSource] = useState<string>()
  const [loadedSource, setLoadedSource] = useState<string>()
  const show = src && failedSource !== src
  const detectEarlyFailure = useCallback((image: HTMLImageElement | null) => {
    if (!image?.complete) return
    if (!image.naturalWidth) setFailedSource(src)
    else if (revealOnLoad) setLoadedSource(src)
  }, [src, revealOnLoad])
  return <span className={styles.media + ' ' + styles[kind]}>
    <span className={styles.mediaFallback} aria-hidden="true"><Icon name={kind === 'logo' ? 'globe' : 'game'} size={kind === 'logo' ? 21 : 29} /></span>
    {noScriptSrc && <noscript>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={noScriptSrc} alt={label ?? ''} loading="lazy" />
    </noscript>}
    {show && (
      // eslint-disable-next-line @next/next/no-img-element
      <img ref={detectEarlyFailure} src={src} alt={label ?? ''} loading={eager ? 'eager' : 'lazy'}
        decoding={revealOnLoad ? 'sync' : 'async'} data-loading={revealOnLoad && loadedSource !== src || undefined}
        onLoad={revealOnLoad ? () => setLoadedSource(src) : undefined} onError={() => setFailedSource(src)} />
    )}
  </span>
}
