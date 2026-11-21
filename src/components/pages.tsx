import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { categories } from '../lib/categories'
import { catalog, gameById, initialDetail, initialDirectory, siteById } from '../lib/catalog'
import type { HomeDirectory } from '../lib/home-games'
import { href, labels, localized, type Locale, type Update, type View } from '../lib/presentation'
import { origin } from '../lib/routes'
import home from '../generated/home.json'
import { CatalogView, HomeView } from './catalog-views'
import { Breadcrumb, More, Title, t } from './elements'
import { Icon } from './icons'
import styles from './site.module.scss'

function Tags({ children }: { children: ReactNode }) {
  return <div className={styles.tags}>{children}</div>
}

function CatalogRoute({ locale, view }: { locale: Locale; view: View }) {
  return <CatalogView view={view} initial={initialDirectory(view)} detail={initialDetail(view)} locale={locale} />
}

function safeMarkdownLink(value: string) {
  if (value.startsWith('#')) return value
  try {
    const parsed = new URL(value, origin)
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password ? parsed.href : ''
  } catch {
    return ''
  }
}

function Updates({ update, locale }: { update?: Update; locale: Locale }) {
  const title = update ? localized(update.title, locale) : labels[locale].updates
  if (!update) return <>
    <Title title={title} description={t(locale, '旧 GoFurry 的公开版本记录与站点公告。', 'Public release notes and announcements from legacy GoFurry.')} />
    <div className={styles.timeline}>
      {catalog.updates.map((row) => <a key={row.id} className={styles.indexItem} href={href(locale, '/updates/' + row.id)}>
        <time dateTime={row.date}>{row.date.slice(0, 10)}</time>
        <div><strong>{localized(row.title, locale)}</strong>{localized(row.description, locale) && <span>{localized(row.description, locale)}</span>}</div>
        <Icon name="chevron" size={16} />
      </a>)}
    </div>
  </>
  return <>
    <Breadcrumb locale={locale} title={title} parent={['/updates', labels[locale].updates]} />
    <article className={styles.readingPanel}>
      <Title title={title} description={localized(update.description, locale)} />
      <Tags><time dateTime={update.date}>{update.date.slice(0, 10)}</time>{update.version && <span>{update.version}</span>}{update.commit && <code title={update.commit}>{update.commit.slice(0, 12)}</code>}</Tags>
      <div className={styles.readable}><ReactMarkdown
        remarkPlugins={[remarkGfm]} skipHtml urlTransform={safeMarkdownLink}
        components={{ h1: ({ children }) => <h2>{children}</h2>, img: ({ alt }) => alt ? <span>{alt}</span> : null }}
      >{localized(update.body, locale)}</ReactMarkdown></div>
    </article>
  </>
}

function Info({ locale, page }: { locale: Locale; page: 'about' | 'terms' | 'privacy' }) {
  const content = readFileSync(join(process.cwd(), 'content', 'pages', `${page}.${locale}.md`), 'utf8')

  return <article className={styles.readingPanel + ' ' + styles.readable}>
    <ReactMarkdown
      skipHtml urlTransform={safeMarkdownLink}
      components={{ h1: ({ children }) => <header className={styles.pageTitle}><h1>{children}</h1></header> }}
    >{content}</ReactMarkdown>
  </article>
}

export function SitePage({ locale, segments }: { locale: Locale; segments: string[] }) {
  const [section, key, slug] = segments
  if (segments.length === 0) return <HomeView locale={locale} initial={home as HomeDirectory} />
  if (section === 'status') {
    const gone = key === 'gone'
    return <article className={styles.readingPanel + ' ' + styles.statusPanel}>
      <p className={styles.statusCode}>{gone ? '410' : '404'}</p>
      <Title title={gone ? t(locale, '历史页面已退出', 'This legacy page has been retired') : t(locale, '找不到这个页面', 'Page not found')} />
      <More to={href(locale)}>{t(locale, '返回导航首页', 'Back to the directory')}</More>
    </article>
  }
  const id = Number(key)
  if (section === 'categories') {
    const category = categories.find(([code]) => code === key)
    if (category) return <CatalogRoute locale={locale} view={{ type: 'category', code: category[0] }} />
  }
  if (section === 'site-groups') {
    if (!key) return <CatalogRoute locale={locale} view={{ type: 'groups' }} />
    if (catalog.groups.some((group) => group.id === id)) return <CatalogRoute locale={locale} view={{ type: 'group', id }} />
  }
  if (section === 'site' && siteById.has(id)) return <CatalogRoute locale={locale} view={{ type: 'site', id }} />
  if (section === 'games') {
    if (!key) return <CatalogRoute locale={locale} view={{ type: 'games' }} />
    if (key === 'collections') {
      if (!slug) return <CatalogRoute locale={locale} view={{ type: 'collections' }} />
      if (catalog.collections.some(({ code }) => code === slug)) return <CatalogRoute locale={locale} view={{ type: 'collection', code: slug }} />
    }
    if (gameById.has(id)) return <CatalogRoute locale={locale} view={{ type: 'game', id }} />
  }
  if (section === 'updates') {
    if (!key) return <Updates locale={locale} />
    const update = catalog.updates.find(({ id }) => id === Number(key))
    if (update) return <Updates locale={locale} update={update} />
  }
  if (section === 'about' || section === 'privacy' || section === 'terms') return <Info locale={locale} page={section} />
  notFound()
}
