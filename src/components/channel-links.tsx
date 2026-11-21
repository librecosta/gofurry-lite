'use client'

import { motion, useReducedMotion, type Target } from 'motion/react'
import type { ReactNode } from 'react'
import { github } from '../lib/links'
import type { Locale } from '../lib/presentation'
import { Icon } from './icons'
import { immediate, interaction } from './motion'
import styles from './footer.module.scss'

const hover = { '--footer-hover': 1 } as Target

export function ChannelLink({ url, label, children, nativeTooltip = true }: {
  url: string; label: string; children: ReactNode; nativeTooltip?: boolean
}) {
  const reduced = useReducedMotion()
  const external = url.startsWith('https://')
  return <motion.a href={url} className={styles.channel} aria-label={label} title={nativeTooltip ? label : undefined}
    target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}
    whileHover={hover} whileFocus={hover} transition={reduced ? immediate : interaction}>
    {children}
  </motion.a>
}

export function contactChannels(locale: Locale) {
  const email = 'contact@librecosta.com'
  const mailLabel = locale === 'zh' ? `联系 LibreCosta（${email}）` : `Email LibreCosta (${email})`
  return [
    { id: 'email', url: `mailto:${email}`, label: mailLabel, icon: 'mail' },
    { id: 'github', url: github, label: 'GitHub', icon: 'github' },
    { id: 'x', url: 'https://x.com/LibreCostaHQ', label: 'X @LibreCostaHQ', icon: 'x-logo' },
  ] as const
}

export function ContactLinks({ locale }: { locale: Locale }) {
  return contactChannels(locale).map(({ id, url, label, icon }) =>
    <ChannelLink key={id} url={url} label={label}><Icon name={icon} size={23} /></ChannelLink>)
}
