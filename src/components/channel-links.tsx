'use client'

import { motion, useReducedMotion, type Target } from 'motion/react'
import type { ReactNode } from 'react'
import { github } from '../lib/links'
import type { Locale } from '../lib/presentation'
import { Icon } from './icons'
import { immediate, interaction } from './motion'
import styles from './footer.module.scss'

const hover = { '--footer-hover': 1 } as Target

export function ChannelLink({ url, label, children }: { url: string; label: string; children: ReactNode }) {
  const reduced = useReducedMotion()
  const external = url.startsWith('https://')
  return <motion.a href={url} className={styles.channel} aria-label={label} title={label}
    target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}
    whileHover={hover} whileFocus={hover} transition={reduced ? immediate : interaction}>
    {children}
  </motion.a>
}

export function ContactLinks({ locale }: { locale: Locale }) {
  const email = 'contact@librecosta.com'
  const mailLabel = locale === 'zh' ? `联系 LibreCosta（${email}）` : `Email LibreCosta (${email})`
  return <>
    <ChannelLink url={`mailto:${email}`} label={mailLabel}><Icon name="mail" size={23} /></ChannelLink>
    <ChannelLink url={github} label="GitHub"><Icon name="github" size={23} /></ChannelLink>
    <ChannelLink url="https://x.com/LibreCostaHQ" label="X @LibreCostaHQ"><Icon name="x-logo" size={23} /></ChannelLink>
  </>
}
