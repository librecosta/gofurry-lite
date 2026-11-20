'use client'

import { motion, useReducedMotion } from 'motion/react'
import { github } from '../lib/links'
import { href, labels, type Locale } from '../lib/presentation'
import { Icon } from './icons'
import { immediate, interaction } from './motion'
import styles from './footer.module.scss'

export function SiteFooter({ locale }: { locale: Locale }) {
  const zh = locale === 'zh'
  const reduced = useReducedMotion()
  const transition = reduced ? immediate : interaction
  const color = { color: 'var(--brand)' }
  const iconHover = { ...color, backgroundColor: 'var(--brand-soft)', y: reduced ? 0 : -2 }
  const email = 'contact@librecosta.com'
  const mailLabel = zh ? `联系 LibreCosta（${email}）` : `Email LibreCosta (${email})`

  return <footer>
    <div className={styles.primary}>
      <nav className={styles.channels} aria-label={zh ? '联系方式与官方渠道' : 'Contact and official channels'}>
        <motion.a href={`mailto:${email}`} className={styles.channel} aria-label={mailLabel} title={mailLabel}
          whileHover={iconHover} whileFocus={color} transition={transition}>
          <Icon name="mail" size={20} />
        </motion.a>
        <motion.a href={github} className={styles.channel} aria-label="GitHub" title="GitHub"
          target="_blank" rel="noopener noreferrer" whileHover={iconHover} whileFocus={color} transition={transition}>
          <Icon name="github" size={20} />
        </motion.a>
      </nav>
      <nav className={styles.links} aria-label={zh ? '站点信息' : 'Site information'}>
        {(['about', 'privacy', 'terms', 'updates', 'site-groups'] as const).map((page) =>
          <motion.a key={page} href={href(locale, '/' + page)} whileHover={color} whileFocus={color} transition={transition}>
            {labels[locale][page]}
          </motion.a>)}
      </nav>
    </div>
    <div className={styles.copyright}>© 2026 LibreCosta · GoFurry Lite</div>
  </footer>
}
