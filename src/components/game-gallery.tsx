'use client'

import { useCallback, useId, useLayoutEffect, useRef, useState } from 'react'
import type Hls from 'hls.js'
import { motion, useReducedMotion } from 'motion/react'
import type { GameMovie, Locale } from '../lib/presentation'
import { t } from './elements'
import { Icon } from './icons'
import { immediate, interaction } from './motion'
import styles from './game-gallery.module.scss'

function GalleryImage({ src, alt = '', errorLabel }: { src: string; alt?: string; errorLabel?: string }) {
  const [failed, setFailed] = useState(false)
  const detectEarlyFailure = useCallback((image: HTMLImageElement | null) => {
    if (image?.complete && !image.naturalWidth) setFailed(true)
  }, [])
  if (failed) return <span className={styles.unavailable} role={errorLabel ? 'status' : undefined}>
    <Icon name="image" size={22} />
    {errorLabel && <span>{errorLabel}</span>}
  </span>
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img ref={detectEarlyFailure} src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} />
  )
}

function MoviePlayer({ movie, label, errorLabel }: { movie: GameMovie; label: string; errorLabel: string }) {
  const [index, setIndex] = useState(0)
  const video = useRef<HTMLVideoElement>(null)
  const source = [movie.mp4, movie.webm, movie.hls].filter(Boolean)[index]
  const isHls = source === movie.hls
  useLayoutEffect(() => {
    const element = video.current
    if (!element || !source) return
    let cancelled = false
    let hls: Hls | undefined
    const tryNextSource = () => {
      if (!cancelled) setIndex((current) => current === index ? current + 1 : current)
    }
    element.addEventListener('error', tryNextSource)

    if (!isHls || element.canPlayType('application/vnd.apple.mpegurl')) {
      element.src = source
    } else {
      void import('hls.js').then(({ default: HlsPlayer }) => {
        if (cancelled) return
        if (!HlsPlayer.isSupported()) {
          tryNextSource()
          return
        }
        hls = new HlsPlayer({ enableWorker: false })
        hls.on(HlsPlayer.Events.ERROR, (_, error) => {
          if (error.fatal) tryNextSource()
        })
        hls.loadSource(source)
        hls.attachMedia(element)
      }).catch(tryNextSource)
    }

    return () => {
      cancelled = true
      element.removeEventListener('error', tryNextSource)
      element.pause()
      hls?.destroy()
      element.removeAttribute('src')
      element.load()
    }
  }, [index, isHls, source])

  return source
    ? <video ref={video} controls playsInline preload="metadata" poster={movie.thumbnail} aria-label={label} />
    : <div className={styles.unavailable} role="status"><Icon name="play" size={25} />{errorLabel}</div>
}

export function GameGallery({ screenshots, movies = [], locale }: { screenshots: string[]; movies?: GameMovie[]; locale: Locale }) {
  const [selection, setSelection] = useState<string>()
  const reduced = useReducedMotion()
  const lightbox = useRef<HTMLDialogElement>(null)
  const imageButton = useRef<HTMLButtonElement>(null)
  const heading = useId()
  const imageError = t(locale, '截图暂时无法加载。', 'This screenshot could not be loaded.')
  const closeLabel = t(locale, '关闭大图', 'Close enlarged screenshot')
  const items = [
    ...screenshots.filter((url, index) => screenshots.indexOf(url) === index).map((url, index) => ({
      kind: 'image' as const, key: url, thumbnail: url, label: t(locale, `截图 ${index + 1}`, `Screenshot ${index + 1}`),
    })),
    ...movies.slice(0, 4).map((movie, index) => ({
      kind: 'video' as const, key: movie.id, thumbnail: movie.thumbnail, movie,
      label: movie.title || t(locale, `视频 ${index + 1}`, `Video ${index + 1}`),
    })),
  ]
  const current = items.find(({ key }) => key === selection) ?? items[0]
  if (!current) return null

  const enlargeLabel = t(locale, '放大：', 'Enlarge: ') + current.label
  return <section className={styles.gallery} aria-labelledby={heading}>
    <h2 id={heading}>{movies.length ? t(locale, '游戏媒体', 'Game media') : t(locale, '游戏截图', 'Screenshots')}</h2>
    <div className={styles.stage}>
      <motion.div key={current.key} className={styles.current}
        initial={selection && !reduced ? { opacity: .72 } : false} animate={{ opacity: 1 }}
        transition={reduced ? immediate : interaction}>
        {current.kind === 'image'
          ? <button ref={imageButton} type="button" className={styles.stageButton} aria-label={enlargeLabel}
            onClick={() => lightbox.current?.showModal()}>
            <GalleryImage src={current.thumbnail} alt={current.label} errorLabel={imageError} />
            <span className={styles.enlarge}><Icon name="expand" size={17} /></span>
          </button>
          : selection === current.key
            ? <MoviePlayer movie={current.movie} label={current.label}
              errorLabel={t(locale, 'Steam 视频暂时无法播放。', 'This Steam video could not be played.')} />
            : <button type="button" className={styles.stageButton} onClick={() => setSelection(current.key)}>
              <GalleryImage src={current.thumbnail} />
              <span className={styles.stagePlay}><Icon name="play" size={24} />{t(locale, '加载视频：', 'Load video: ')}{current.label}</span>
            </button>}
      </motion.div>
    </div>
    <ul className={styles.thumbnails}>
      {items.map((item) => <li key={item.key}>
        <button type="button" className={styles.thumbnail} aria-pressed={item.key === current.key}
          aria-label={item.kind === 'video' ? t(locale, '视频：', 'Video: ') + item.label : item.label}
          title={item.label} onClick={() => setSelection(item.key)}>
          <GalleryImage src={item.thumbnail} />
          {item.kind === 'video' && <span className={styles.play}><Icon name="play" size={18} /></span>}
        </button>
      </li>)}
    </ul>
    {current.kind === 'image' && <dialog ref={lightbox} className={styles.lightbox} aria-label={enlargeLabel}
      onClose={() => imageButton.current?.focus()}>
      <button type="button" className={styles.close} aria-label={closeLabel} onClick={() => lightbox.current?.close()}>
        <Icon name="close" size={20} />
      </button>
      <GalleryImage key={current.key} src={current.thumbnail} alt={current.label} errorLabel={imageError} />
    </dialog>}
  </section>
}
