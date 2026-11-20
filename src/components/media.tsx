'use client'

import { useCallback, useState } from 'react'
import { Icon } from './icons'
import styles from './site.module.scss'

/* Static export serves archived logos and official game media without an image server. */
export function Media({ src, label, kind = 'cover', eager = false }: {
  src?: string; label?: string; kind?: 'cover' | 'logo' | 'shot'; eager?: boolean
}) {
  const [failedSource, setFailedSource] = useState<string>()
  const show = src && failedSource !== src
  const detectEarlyFailure = useCallback((image: HTMLImageElement | null) => {
    if (image?.complete && !image.naturalWidth) setFailedSource(src)
  }, [src])
  return <span className={styles.media + ' ' + styles[kind]}>
    <span className={styles.mediaFallback} aria-hidden="true"><Icon name={kind === 'logo' ? 'globe' : kind === 'cover' ? 'game' : 'image'} size={kind === 'logo' ? 21 : 29} /></span>
    {show && (
      // eslint-disable-next-line @next/next/no-img-element
      <img ref={detectEarlyFailure} src={src} alt={label ?? ''} loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setFailedSource(src)} />
    )}
  </span>
}
