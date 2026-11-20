import { categories, type CategoryCode } from '../lib/categories'
import { href, inCategory, intro, localized, ordered, type DirectorySite, type Locale } from '../lib/presentation'
import type { ReactNode } from 'react'
import { t } from './elements'
import { Icon, type Glyph } from './icons'
import { Media } from './media'
import styles from './home.module.scss'

const projects = [
  { name: 'GoFurry', url: 'https://gofurry.com', icon: 'discover', en: 'The main GoFurry project', zh: 'GoFurry 主站' },
  { name: 'Tool4Furry', url: 'https://tool4furry.com', icon: 'tool', en: 'Tools for the furry community', zh: '面向兽圈的实用工具' },
  { name: 'GopherAtlas', url: 'https://gopheratlas.com', icon: 'book', en: 'Go programming guides and notes', zh: 'Go 开发指南与笔记' },
] satisfies { name: string; url: string; icon: Glyph; en: string; zh: string }[]

export function HomeLead({ locale, search }: { locale: Locale; search: ReactNode }) {
  return <div className={styles.lead}>
    <aside className={styles.projects} aria-labelledby="ecosystem-title">
      <h2 id="ecosystem-title">{t(locale, 'GoFurry 生态', 'GoFurry ecosystem')}</h2>
      <ul>
        {projects.map(({ name, url, icon, ...description }) => <li key={name}>
          <a href={url} target="_blank" rel="noopener noreferrer">
            <span className={styles.projectIcon}><Icon name={icon} size={16} /></span>
            <span className={styles.projectCopy}><strong>{name}</strong><span>{description[locale]}</span></span>
            <Icon name="external" size={15} />
          </a>
        </li>)}
      </ul>
    </aside>
    <div className={styles.discovery}>
      <h1>{intro[locale].title}</h1>
      <p>{intro[locale].description}</p>
      {search}
    </div>
  </div>
}

function CategorySite({ site, locale }: { site: DirectorySite; locale: Locale }) {
  const name = localized(site.title, locale)
  const restricted = site.rating === 'nsfw'
  return <li className={styles.categorySite} data-site-id={site.id}>
    <a className={styles.categoryDetail} href={href(locale, '/site/' + site.id)} title={name}
      aria-label={restricted ? name + ' · NSFW' : undefined}>
      <Media kind="logo" src={site.logo} />
      <span className={styles.siteName}>{name}</span>
      {restricted && <abbr title="NSFW" aria-hidden="true" className={styles.adultBadge}>18+</abbr>}
    </a>
    {site.url && <a className={styles.categoryExternal} href={site.url} target="_blank" rel="noopener noreferrer"
      aria-label={t(locale, '访问网站 ' + name, 'Visit ' + name)} title={t(locale, '访问网站', 'Visit website')}>
      <Icon name="external" size={14} />
    </a>}
  </li>
}

const colors: Record<CategoryCode, string> = {
  community: styles.community, gallery: styles.gallery, literature: styles.literature, resources: styles.resources,
  marketplace: styles.marketplace, knowledge: styles.knowledge, gaming: styles.gaming, events: styles.events,
}

export function HomeCategories({ sites, locale }: { sites: DirectorySite[]; locale: Locale }) {
  const sorted = ordered(sites, locale)
  return <div className={styles.categoryGrid} data-category-grid>
    {categories.map(([code, zh, en, zhDescription, enDescription, icon]) => {
      const heading = t(locale, zh, en)
      const members = sorted.filter((site) => inCategory(site, code))
      const titleId = 'category-title-' + code
      return <section key={code} className={styles.categoryCard + ' ' + colors[code]} aria-labelledby={titleId} data-category={code}>
        <header className={styles.categoryHeader}>
          <h3 id={titleId}><Icon name={icon} size={21} />{heading}</h3>
          <p>{t(locale, zhDescription, enDescription)}</p>
        </header>
        <div className={styles.categoryScroll} tabIndex={0} role="group"
          aria-label={t(locale, heading + '站点列表', heading + ' site list')} data-category-scroll>
          <ul>{members.map((site) => <CategorySite key={site.id} site={site} locale={locale} />)}</ul>
        </div>
        <a className={styles.categoryMore} href={href(locale, '/categories/' + code)}>
          {t(locale, '查看全部 ' + members.length + ' 个站点', 'SEE ALL ' + members.length + (members.length === 1 ? ' SITE' : ' SITES'))}
          <Icon name="arrow" size={15} />
        </a>
      </section>
    })}
  </div>
}
