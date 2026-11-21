import { categories, type CategoryCode } from '../lib/categories'
import { href, inCategory, intro, localized, type DirectorySite, type Locale } from '../lib/presentation'
import type { MouseEvent, ReactNode } from 'react'
import { CategoryIcon, t } from './elements'
import { HomeShortcuts } from './home-shortcuts'
import { Icon } from './icons'
import { Media } from './media'
import { markSiteVisited, useVisitedSites } from './site-visits'
import styles from './home.module.scss'

export function HomeLead({ locale, search }: { locale: Locale; search: ReactNode }) {
  return <div className={styles.discovery}>
    <h1>{intro[locale].title}</h1>
    <p>{intro[locale].description}</p>
    <div className={styles.leadActions}>
      {search}
      <HomeShortcuts locale={locale} />
    </div>
  </div>
}

function CategorySite({ site, locale, position, visited }: {
  site: DirectorySite; locale: Locale; position: number; visited: boolean
}) {
  const name = localized(site.title, locale)
  const restricted = site.rating === 'nsfw'
  const visitedLabel = t(locale, '已访问', 'Visited')

  function recordVisit(event: MouseEvent<HTMLAnchorElement>) {
    if (!event.defaultPrevented && (event.button === 0 || event.button === 1)) markSiteVisited(site.id)
  }

  return <li className={styles.categorySite} data-site-id={site.id}>
    <span className={styles.categoryPosition} title={visited ? visitedLabel : undefined}>
      {visited ? <><Icon name="check" size={13} /><span className="sr-only">{visitedLabel}</span></> : position + '.'}
    </span>
    <a className={styles.categoryDetail} href={href(locale, '/site/' + site.id)} title={name}
      aria-label={restricted ? name + ' · NSFW' : undefined} onClick={recordVisit} onAuxClick={recordVisit}>
      <Media kind="logo" src={site.logo} />
      <span className={styles.siteName}>{name}</span>
      {restricted && <abbr title="NSFW" aria-hidden="true" className={styles.adultBadge}>18+</abbr>}
    </a>
    {site.url && <a className={styles.categoryExternal} href={site.url} target="_blank" rel="noopener noreferrer"
      aria-label={t(locale, '访问网站 ' + name, 'Visit ' + name)} title={t(locale, '访问网站', 'Visit website')}
      onClick={recordVisit} onAuxClick={recordVisit}>
      <Icon name="external" size={14} />
    </a>}
  </li>
}

const colors: Record<CategoryCode, string> = {
  community: styles.community, gallery: styles.gallery, literature: styles.literature, resources: styles.resources,
  marketplace: styles.marketplace, knowledge: styles.knowledge, gaming: styles.gaming, events: styles.events,
}

// Read across the desktop grid and use the same category order on smaller screens.
const categoryOrder: readonly CategoryCode[] = [
  'gallery', 'gaming', 'marketplace', 'literature', 'knowledge', 'events', 'resources', 'community',
]
const homeCategories = categoryOrder.map((code) => categories.find((category) => category[0] === code)!)

export function HomeCategories({ sites, locale }: { sites: DirectorySite[]; locale: Locale }) {
  const visited = useVisitedSites()
  const sorted = [...sites].sort((a, b) => a.id - b.id)
  return <div className={styles.categoryGrid} data-category-grid>
    {homeCategories.map(([code, zh, en, zhDescription, enDescription]) => {
      const heading = t(locale, zh, en)
      const members = sorted.filter((site) => inCategory(site, code))
      const titleId = 'category-title-' + code
      return <section key={code} className={styles.categoryCard + ' ' + colors[code]} aria-labelledby={titleId} data-category={code}>
        <header className={styles.categoryHeader}>
          <h3 id={titleId}><CategoryIcon code={code} />{heading}</h3>
          <p>{t(locale, zhDescription, enDescription)}</p>
        </header>
        <div className={styles.categoryScroll} tabIndex={0} role="group"
          aria-label={t(locale, heading + '站点列表', heading + ' site list')} data-category-scroll>
          <ol role="list">{members.map((site, index) =>
            <CategorySite key={site.id} site={site} locale={locale} position={index + 1} visited={visited.has(site.id)} />)}</ol>
        </div>
        <a className={styles.categoryMore} href={href(locale, '/categories/' + code)}>
          {t(locale, '查看全部 ' + members.length + ' 个站点', 'SEE ALL ' + members.length + (members.length === 1 ? ' SITE' : ' SITES'))}
          <Icon name="arrow" size={15} />
        </a>
      </section>
    })}
  </div>
}
