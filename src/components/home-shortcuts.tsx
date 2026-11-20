'use client'

import { AnimatePresence, motion, useReducedMotion, useSpring } from 'motion/react'
import Image from 'next/image'
import { useState, type PointerEvent } from 'react'
import type { Locale } from '../lib/presentation'
import { ChannelLink, contactChannels } from './channel-links'
import { Icon } from './icons'
import { easeOut, immediate } from './motion'
import styles from './home.module.scss'

const previewImages: Record<string, string> = {
  gofurry: 'gofurry-og.png',
  tool4furry: 'tool4furry-og.png',
  email: 'librecosta-email.png',
  github: 'librecosta-default.png',
}

const tiltSpring = { stiffness: 320, damping: 30, mass: .65 }
const normalizeOffset = (position: number, extent: number) => Math.max(-1, Math.min(1, 2 * position / extent - 1))

export function HomeShortcuts({ locale }: { locale: Locale }) {
  const [hovered, setHovered] = useState<string>()
  const [focused, setFocused] = useState<string>()
  const reduced = useReducedMotion()
  const x = useSpring(0, tiltSpring)
  const y = useSpring(0, tiltSpring)
  const rotate = useSpring(0, tiltSpring)
  const active = hovered ?? focused
  const image = active && previewImages[active]

  function resetTilt() {
    x.set(0)
    y.set(0)
    rotate.set(0)
  }

  // Pointer offset and rotation follow the supplied TuneShape Hover Preview.
  function trackPointer(event: PointerEvent<HTMLElement>) {
    if (reduced || event.pointerType === 'touch') return
    const bounds = event.currentTarget.getBoundingClientRect()
    const horizontal = normalizeOffset(event.clientX - bounds.left, bounds.width)
    const vertical = normalizeOffset(event.clientY - bounds.top, bounds.height)
    x.set(horizontal * 15)
    y.set(Math.min(0, vertical) * 6 - Math.abs(horizontal) * 13)
    rotate.set(horizontal * 8)
  }

  const shortcuts = [
    { id: 'gofurry', url: 'https://gofurry.com', label: 'GoFurry',
      artwork: <span className={styles.projectMark + ' ' + styles.gofurryMark} aria-hidden="true" /> },
    { id: 'tool4furry', url: 'https://tool4furry.com', label: 'Tool4Furry',
      artwork: <span className={styles.projectMark + ' ' + styles.tool4furryMark} aria-hidden="true" /> },
    ...contactChannels(locale).map(({ icon, ...channel }) => ({ ...channel, artwork: <Icon name={icon} size={23} /> })),
  ]

  return <nav className={styles.shortcuts} aria-label={locale === 'zh' ? '项目与联系方式' : 'Projects and contact'}
    onKeyDown={(event) => {
      if (event.key === 'Escape') {
        setHovered(undefined)
        setFocused(undefined)
        resetTilt()
      }
    }}>
    {shortcuts.map(({ id, url, label, artwork }) => <span key={id} className={styles.shortcut}
      onPointerEnter={(event) => {
        if (event.pointerType !== 'touch') setHovered(id)
      }}
      onPointerMove={trackPointer}
      onPointerLeave={() => {
        setHovered(undefined)
        resetTilt()
      }}
      onFocus={(event) => {
        if (event.target.matches(':focus-visible')) setFocused(id)
      }}
      onBlur={() => setFocused(undefined)}>
      <ChannelLink url={url} label={label} nativeTooltip={false}>{artwork}</ChannelLink>
    </span>)}

    <AnimatePresence initial={false}>
      {active && <motion.div key={active} className={styles.previewAnchor} aria-hidden="true" data-shortcut-preview={active}
        initial={reduced ? false : { opacity: 0, scale: .92, y: 7 }}
        animate={{ opacity: 1, scale: 1, y: 0 }} transition={reduced ? immediate : { duration: .2, ease: easeOut }}
        exit={reduced ? undefined : { opacity: 0, scale: .96, y: 5, transition: { duration: .15 } }}>
        <motion.div className={styles.shortcutPreview} style={reduced ? undefined : { x, y, rotate }}>
          {image ? <Image src={'/media/brand/' + image} alt="" width={1200} height={630} loading="eager" />
            : <div className={styles.xPreview}><Icon name="x-logo" size={26} /><strong>@LibreCostaHQ</strong></div>}
        </motion.div>
      </motion.div>}
    </AnimatePresence>
  </nav>
}
