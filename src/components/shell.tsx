import type { ReactNode } from 'react'
import Image from 'next/image'
import { href, labels, type Locale } from '../lib/presentation'
import { SiteNavigation } from './navigation'
import styles from './site.module.scss'

const initTheme = "try{const t=localStorage.getItem('gofurry-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch{}"

export function Shell({ children, locale, path }: { children: ReactNode; locale: Locale; path: string }) {
  const zh = locale === 'zh'
  return <>
    <script dangerouslySetInnerHTML={{ __html: initTheme }} />
    <a className="skip-link" href="#content">{zh ? '跳到正文' : 'Skip to content'}</a>
    <SiteNavigation locale={locale} path={path} />
    <main id="content" tabIndex={-1} className={styles.main}>{children}</main>
    <footer className={styles.footer}>
      <div>
        <a href={href(locale)} className={styles.footerBrand}><Image src="/media/brand/gofurry-symbol.svg" alt="" width={17} height={17} />GoFurry Lite</a>
        <nav aria-label={zh ? '站点信息' : 'Site information'}>
          {(['about', 'privacy', 'terms', 'updates', 'site-groups'] as const).map((page) => <a key={page} href={href(locale, '/' + page)}>{labels[locale][page]}</a>)}
        </nav>
      </div>
    </footer>
  </>
}
