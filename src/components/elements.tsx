import type { ReactNode } from 'react'
import type { CategoryCode } from '../lib/categories'
import { href, type Locale } from '../lib/presentation'
import { Icon } from './icons'
import styles from './site.module.scss'

export const t = (locale: Locale, zh: string, en: string) => locale === 'zh' ? zh : en

export function CategoryIcon({ code, large = false }: { code: CategoryCode; large?: boolean }) {
  const size = large ? 48 : 32
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className={styles.categoryIcon} src={`/media/category-icons/pixel/${code}-${large ? 128 : 32}.webp`}
      alt="" width={size} height={size} decoding="async" />
  )
}

type PageIconName = 'discovery-compass' | 'gaming-controller' | 'game-collections'

export function PageIcon({ name }: { name: PageIconName }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className={styles.pageArtwork} src={'/media/page-art/' + name + '.png'} alt="" width={52} height={52} decoding="async" />
  )
}

export function Title({ title, description, category, artwork }: {
  title: string; description?: string; category?: CategoryCode; artwork?: PageIconName
}) {
  return <div className={styles.pageTitle}>
    {category && <CategoryIcon code={category} large />}
    {artwork && <PageIcon name={artwork} />}
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

export function Breadcrumb({ locale, title, parent, grandparent }: {
  locale: Locale; title: string; parent?: [string, string]; grandparent?: [string, string]
}) {
  return <nav className={styles.breadcrumb} aria-label={t(locale, '面包屑导航', 'Breadcrumb')}>
    <a href={href(locale)}>{t(locale, '首页', 'Home')}</a><Icon name="chevron" size={13} />
    {grandparent && <><a href={href(locale, grandparent[0])}>{grandparent[1]}</a><Icon name="chevron" size={13} /></>}
    {parent && <><a href={href(locale, parent[0])}>{parent[1]}</a><Icon name="chevron" size={13} /></>}
    <span aria-current="page">{title}</span>
  </nav>
}
