import type { ReactNode } from 'react'
import { href, type Locale } from '../lib/presentation'
import { Icon, type Glyph } from './icons'
import styles from './site.module.scss'

export const t = (locale: Locale, zh: string, en: string) => locale === 'zh' ? zh : en

export function Title({ title, description, icon }: { title: string; description?: string; icon?: Glyph }) {
  return <div className={styles.pageTitle}>
    {icon && <span className={styles.titleIcon}><Icon name={icon} size={24} /></span>}
    <div><h1>{title}</h1>{description && <p>{description}</p>}</div>
  </div>
}

export function Section({ title, children, more }: { title: string; children: ReactNode; more?: ReactNode }) {
  return <section className={styles.section}>
    <div className={styles.sectionHeading}><h2>{title}</h2>{more}</div>
    {children}
  </section>
}

export function More({ to, children }: { to: string; children: ReactNode }) {
  return <a href={to} className={styles.more}>{children}<Icon name="arrow" size={15} /></a>
}

export function TextLink({ to, children, className }: { to: string; children: ReactNode; className?: string }) {
  return <a href={to} className={className ? styles.textLink + ' ' + className : styles.textLink}><span>{children}</span></a>
}

export function Breadcrumb({ locale, title, parent }: { locale: Locale; title: string; parent?: [string, string] }) {
  return <nav className={styles.breadcrumb} aria-label={t(locale, '面包屑导航', 'Breadcrumb')}>
    <a href={href(locale)}>{t(locale, '首页', 'Home')}</a><Icon name="chevron" size={13} />
    {parent && <><a href={href(locale, parent[0])}>{parent[1]}</a><Icon name="chevron" size={13} /></>}
    <span aria-current="page">{title}</span>
  </nav>
}
