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
    <Title title={title} icon="news" description={t(locale, '旧 GoFurry 的公开版本记录与站点公告。', 'Public release notes and announcements from legacy GoFurry.')} />
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

const statements = {
  about: {
    zh: ['GoFurry Lite 是原 GoFurry 导航与兽游资料的静态延续，可浏览网站、游戏、合集和历史更新日志。', '中文和英文档案沿用旧站历史标识。资料来自 2026 年 11 月 15 日封板记录，条目反映当时的内容与资料。'],
    en: ['GoFurry Lite is the static successor to the original GoFurry website and game directory. It preserves websites, games, collections and public release notes.', 'The Chinese and English archives retain their legacy identifiers. The catalogue is based on the November 15, 2026 snapshot.'],
  },
  privacy: {
    zh: ['本站提供可直接浏览的静态页面，站内搜索与筛选在浏览器内运行。主题和内容模式保存在当前浏览器中。内容模式是展示偏好。', '游戏图片由 Steam 图像服务器提供。打开第三方资源时，相关网络请求由对应服务处理。'],
    en: ['Pages are static and directory searches and filters run in your browser. Your theme and content display preferences are stored in this browser.', 'Game images are served by Steam. Requests for third-party resources are handled by the corresponding service.'],
  },
  terms: {
    zh: ['目录和更新日志反映历史存档。请通过游戏发行方或网站运营方核对实时情况、价格和使用规则。', '第三方名称、标志、作品与媒体的权利归各权利方。外部平台适用其各自条款。'],
    en: ['The directory and release notes are historical records. Consult the publisher or site operator for current availability, pricing and conditions.', 'Third-party names, marks, works and media remain the property of their respective rights holders. External platforms have their own terms.'],
  },
}

function Info({ locale, page }: { locale: Locale; page: keyof typeof statements }) {
  return <article className={styles.readingPanel}>
    <Title title={labels[locale][page]} />
    <div className={styles.readable}>{statements[page][locale].map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
  </article>
}

export function SitePage({ locale, segments }: { locale: Locale; segments: string[] }) {
  const [section, key, slug] = segments
  if (segments.length === 0) return <HomeView locale={locale} initial={home as HomeDirectory} />
  if (section === 'status') {
    const gone = key === 'gone'
    return <article className={styles.readingPanel}>
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
