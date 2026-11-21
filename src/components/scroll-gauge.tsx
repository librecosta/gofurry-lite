'use client'

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useSpring, useTransform } from 'motion/react'
import type { Locale } from '../lib/presentation'
import { gaugeSpring, interaction } from './motion'
import styles from './scroll-gauge.module.scss'

// Adapted from TuneShape's Vertical Scroll Gauge (MIT). See docs/third-party-notices.md.
const keySteps: Readonly<Record<string, number | undefined>> = {
  ArrowUp: -.025, ArrowDown: .025, ArrowRight: .025, ArrowLeft: -.025, PageDown: .1, PageUp: -.1,
}

function clamp(value: number) {
  return Math.max(0, Math.min(value, 1))
}

function scrollRange() {
  const page = document.scrollingElement
  return page ? Math.max(0, page.scrollHeight - page.clientHeight) : 0
}

export function ScrollGauge({ locale }: { locale: Locale }) {
  const reduce = useReducedMotion()
  const progress = useMotionValue(0)
  const smooth = useSpring(0, gaugeSpring)
  const fill = useTransform(smooth, clamp)
  const marker = useTransform(smooth, (value) => `${clamp(value) * 100}%`)
  const text = useTransform(smooth, (value) => `${Math.round(clamp(value) * 100)}%`)
  const track = useRef<HTMLSpanElement>(null)
  const pointer = useRef<{ id: number; start: number; dragging: boolean } | null>(null)
  const scroll = useRef<{ stop: () => void } | null>(null)
  const [visible, setVisible] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [percent, setPercent] = useState(0)
  useMotionValueEvent(progress, 'change', (value) => setPercent(Math.round(value * 100)))

  const stopScroll = useCallback(() => {
    scroll.current?.stop()
    scroll.current = null
  }, [])

  const measure = useCallback((instant = false) => {
    const range = scrollRange()
    const ratio = range ? clamp(window.scrollY / range) : 0
    if (!range && pointer.current) {
      pointer.current = null
      setDragging(false)
    }
    setVisible(range > 0)
    progress.set(ratio)
    if (instant || reduce || pointer.current?.dragging) smooth.jump(ratio)
    else if (smooth.get() !== ratio) smooth.set(ratio)
  }, [progress, reduce, smooth])

  useEffect(() => {
    const sync = () => measure()
    const resize = () => { stopScroll(); measure(true) }
    const observer = new ResizeObserver(resize)
    observer.observe(document.body)
    observer.observe(document.documentElement)
    window.addEventListener('scroll', sync, { passive: true })
    window.addEventListener('resize', resize)
    window.addEventListener('wheel', stopScroll, { passive: true })
    window.addEventListener('touchstart', stopScroll, { passive: true })
    window.addEventListener('keydown', stopScroll)
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', sync)
      window.removeEventListener('resize', resize)
      window.removeEventListener('wheel', stopScroll)
      window.removeEventListener('touchstart', stopScroll)
      window.removeEventListener('keydown', stopScroll)
      stopScroll()
    }
  }, [measure, stopScroll])

  function seek(fraction: number, animateScroll = false) {
    stopScroll()
    const top = clamp(fraction) * scrollRange()
    if (animateScroll && !reduce && Math.abs(top - window.scrollY) > 1) {
      scroll.current = animate(window.scrollY, top, {
        ...interaction,
        onUpdate: (value) => window.scrollTo({ top: value, behavior: 'instant' }),
        onComplete: () => { scroll.current = null },
      })
    } else {
      window.scrollTo({ top, behavior: 'instant' })
      measure(true)
    }
  }

  function seekAt(clientY: number, animateScroll = false) {
    const bounds = track.current?.getBoundingClientRect()
    if (bounds?.height) seek((clientY - bounds.top) / bounds.height, animateScroll)
  }

  function start(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || !event.isPrimary || pointer.current) return
    event.preventDefault()
    stopScroll()
    event.currentTarget.focus({ preventScroll: true })
    event.currentTarget.setPointerCapture(event.pointerId)
    pointer.current = { id: event.pointerId, start: event.clientY, dragging: false }
  }

  function move(event: PointerEvent<HTMLDivElement>) {
    const gesture = pointer.current
    if (!gesture || gesture.id !== event.pointerId) return
    if (!gesture.dragging) {
      if (Math.abs(event.clientY - gesture.start) < 5) return
      gesture.dragging = true
      setDragging(true)
    }
    seekAt(event.clientY)
  }

  function finish(event: PointerEvent<HTMLDivElement>) {
    const gesture = pointer.current
    if (!gesture || gesture.id !== event.pointerId) return
    pointer.current = null
    setDragging(false)
    if (event.type === 'pointerup') seekAt(event.clientY, !gesture.dragging)
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const step = Object.hasOwn(keySteps, event.key) ? keySteps[event.key] : undefined
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : step === undefined ? undefined : progress.get() + step
    if (next === undefined) return
    event.preventDefault()
    seek(next)
  }

  if (!visible) return null
  return <div className={styles.gauge} role="slider" tabIndex={0} aria-orientation="vertical"
    aria-label={locale === 'zh' ? '阅读进度' : 'Reading progress'} aria-valuemin={0} aria-valuemax={100}
    aria-valuenow={percent} aria-valuetext={`${percent}%`} data-dragging={dragging || undefined}
    onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish}
    onKeyDown={onKeyDown}>
    <span className={styles.track} ref={track} aria-hidden="true">
      <motion.span className={styles.fill} style={{ scaleY: fill }} />
      <motion.span className={styles.marker} style={{ top: marker }}>{text}</motion.span>
    </span>
  </div>
}
