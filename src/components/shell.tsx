import type { ReactNode } from 'react'
import Image from 'next/image'
import { href, labels } from '../lib/routes'
import type { Locale } from '../lib/catalog'
import { ThemeButton } from './preferences'
import styles from './site.module.scss'

const initTheme = "try{const t=localStorage.getItem('gofurry-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch{}"

export function Shell({ children, locale, path }: { children: ReactNode; locale: Locale; path: string }) {
  const alternateLocale = locale === 'zh' ? 'en' : 'zh'
  const alternatePath = path.startsWith('/status/') ? '/' : path
  const zh = locale === 'zh'
  return <>
    <script dangerouslySetInnerHTML={{ __html: initTheme }} />
    <a className="skip-link" href="#content">{zh ? '跳到正文' : 'Skip to content'}</a>
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <a href={href(locale)} className={styles.wordmark}><Image src="/media/brand/logo.svg" alt="" width={36} height={36} priority /><span>GoFurry <small>Lite</small></span></a>
        <nav aria-label={zh ? '主导航' : 'Primary navigation'} className={styles.navigation}>
          <a href={href(locale)}>{zh ? '导航' : 'Discover'}</a>
          <a href={href(locale, '/games')}>{zh ? '游戏' : 'Games'}</a>
          <a className={styles.desktopNav} href={href(locale, '/games/collections')}>{zh ? '合集' : 'Collections'}</a>
          <span className={styles.preferences}><ThemeButton locale={locale} /><a className="language-button" href={href(alternateLocale, alternatePath)} lang={zh ? 'en' : 'zh-CN'}>{zh ? 'EN' : '中文'}</a></span>
        </nav>
      </div>
    </header>
    <main id="content" tabIndex={-1} className={styles.main}>{children}</main>
    <footer className={styles.footer}>
      <div>
        <a href={href(locale)} className={styles.footerBrand}>GoFurry Lite</a>
        <nav aria-label={zh ? '站点信息' : 'Site information'}>
          {(['about', 'privacy', 'terms', 'updates', 'site-groups'] as const).map((page) => <a key={page} href={href(locale, '/' + page)}>{labels[locale][page]}</a>)}
        </nav>
      </div>
    </footer>
  </>
}
