import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { catalog, initialDetail, initialDirectory } from '../lib/catalog'
import type { HomeDirectory } from '../lib/home-games'
import { href, labels, localized, type Locale, type Update, type View } from '../lib/presentation'
import { origin, pageFor, publicPaths, structuredDataFor } from '../lib/routes'
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

const markdownDestinations = new Set(publicPaths())

function safeMarkdownLink(value: string, locale: Locale) {
  if (value.startsWith('#')) return value
  try {
    const parsed = new URL(value, origin)
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return ''
    if (parsed.origin !== origin) return parsed.href
    if (!markdownDestinations.has(parsed.pathname)) return ''
    return href(locale, parsed.pathname) + parsed.search + parsed.hash
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
        remarkPlugins={[remarkGfm]} skipHtml urlTransform={(url) => safeMarkdownLink(url, locale)}
        components={{
          a: ({ href, children, title }) => href ? <a href={href} title={title}>{children}</a> : <>{children}</>,
          h1: ({ children }) => <h2>{children}</h2>, img: ({ alt }) => alt ? <span>{alt}</span> : null,
        }}
      >{localized(update.body, locale)}</ReactMarkdown></div>
    </article>
  </>
}

function Info({ locale, page }: { locale: Locale; page: 'about' | 'terms' | 'privacy' }) {
  const content = readFileSync(join(process.cwd(), 'content', 'pages', `${page}.${locale}.md`), 'utf8')

  return <article className={styles.readingPanel + ' ' + styles.readable}>
    <ReactMarkdown
      skipHtml urlTransform={(url) => safeMarkdownLink(url, locale)}
      components={{ h1: ({ children }) => <header className={styles.pageTitle}><h1>{children}</h1></header> }}
    >{content}</ReactMarkdown>
  </article>
}

export function SitePage({ locale, segments }: { locale: Locale; segments: string[] }) {
  const path = '/' + segments.join('/')
  const schema = structuredDataFor(path, locale)
  return <>
    {schema && <script type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} />}
    <PageContent locale={locale} path={path} />
  </>
}

function PageContent({ path, locale }: { path: string; locale: Locale }) {
  if (path === '/status/not-found' || path === '/status/gone') {
    const gone = path === '/status/gone'
    return <article className={styles.readingPanel + ' ' + styles.statusPanel}>
      <p className={styles.statusCode}>{gone ? '410' : '404'}</p>
      <Title title={gone ? t(locale, '历史页面已退出', 'This legacy page has been retired') : t(locale, '找不到这个页面', 'Page not found')} />
      <More to={href(locale)}>{t(locale, '返回导航首页', 'Back to the directory')}</More>
    </article>
  }
  const page = pageFor(path)
  if (!page) notFound()
  switch (page.kind) {
    case 'category': return <CatalogRoute locale={locale} view={{ type: 'category', code: page.category[0] }} />
    case 'site': return <CatalogRoute locale={locale} view={{ type: 'site', id: page.record.id }} />
    case 'game': return <CatalogRoute locale={locale} view={{ type: 'game', id: page.record.id }} />
    case 'group': return <CatalogRoute locale={locale} view={{ type: 'group', id: page.record.id }} />
    case 'collection': return <CatalogRoute locale={locale} view={{ type: 'collection', code: page.record.code }} />
    case 'update': return <Updates locale={locale} update={page.record} />
    case 'landing':
      switch (page.path) {
        case '/': return <HomeView locale={locale} initial={home as HomeDirectory} />
        case '/games': return <CatalogRoute locale={locale} view={{ type: 'games' }} />
        case '/games/collections': return <CatalogRoute locale={locale} view={{ type: 'collections' }} />
        case '/site-groups': return <CatalogRoute locale={locale} view={{ type: 'groups' }} />
        case '/updates': return <Updates locale={locale} />
        case '/about': return <Info locale={locale} page="about" />
        case '/privacy': return <Info locale={locale} page="privacy" />
        case '/terms': return <Info locale={locale} page="terms" />
      }
  }
}
