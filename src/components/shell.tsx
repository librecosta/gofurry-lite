import type { ReactNode } from 'react'
import type { Locale } from '../lib/presentation'
import { SiteFooter } from './footer'
import { SiteNavigation } from './navigation'
import { ScrollGauge } from './scroll-gauge'
import styles from './site.module.scss'

const initTheme = "try{const t=localStorage.getItem('gofurry-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch{}"

export function Shell({ children, locale, path }: { children: ReactNode; locale: Locale; path: string }) {
  const zh = locale === 'zh'
  return <>
    <script dangerouslySetInnerHTML={{ __html: initTheme }} />
    <a className="skip-link" href="#content">{zh ? '跳到正文' : 'Skip to content'}</a>
    <SiteNavigation locale={locale} path={path} />
    <main id="content" tabIndex={-1} className={styles.main}>{children}</main>
    <SiteFooter locale={locale} />
    <ScrollGauge locale={locale} />
  </>
}
