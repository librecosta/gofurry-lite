'use client'

import { motion, useReducedMotion, type Target } from 'motion/react'
import { useSyncExternalStore } from 'react'
import { href, labels, type Locale } from '../lib/presentation'
import { ContactLinks } from './channel-links'
import { immediate, interaction } from './motion'
import styles from './footer.module.scss'

const firstYear = 2026
const currentYear = () => new Date().getUTCFullYear()
const hover = { '--footer-hover': 1 } as Target

function subscribeToYear(refresh: () => void) {
  window.addEventListener('pageshow', refresh)
  window.addEventListener('focus', refresh)
  return () => {
    window.removeEventListener('pageshow', refresh)
    window.removeEventListener('focus', refresh)
  }
}

export function SiteFooter({ locale, initialYear }: { locale: Locale; initialYear: number }) {
  const zh = locale === 'zh'
  const reduced = useReducedMotion()
  const transition = reduced ? immediate : interaction
  const year = useSyncExternalStore(subscribeToYear, currentYear, () => initialYear)
  const copyrightYear = year > firstYear ? `${firstYear}-${year}` : String(firstYear)

  return <footer>
    <div className={styles.primary}>
      <nav className={styles.channels} aria-label={zh ? '联系方式与官方渠道' : 'Contact and official channels'}>
        <ContactLinks locale={locale} />
      </nav>
      <nav className={styles.links} aria-label={zh ? '站点信息' : 'Site information'}>
        {(['about', 'privacy', 'terms', 'updates', 'site-groups'] as const).map((page) =>
          <motion.a key={page} href={href(locale, '/' + page)} className={styles.textLink}
            whileHover={hover} whileFocus={hover} transition={transition}>
            {labels[locale][page]}
          </motion.a>)}
      </nav>
    </div>
    <div className={styles.copyright}>
      <motion.a href="https://gofurry.com" className={styles.textLink} whileHover={hover} whileFocus={hover} transition={transition}>
        © {copyrightYear} GoFurry · The Best Furry Sites!
      </motion.a>
    </div>
  </footer>
}
