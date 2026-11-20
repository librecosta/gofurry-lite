import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { categories } from '../lib/categories'
import type { CategoryCode } from '../lib/categories'
import { catalog, sites, games, gameById, siteById, tagsById, ordered, localized, categoriesBySite, steamCover } from '../lib/catalog'
import type { Locale, Site, Game, Collection, Update } from '../lib/catalog'
import { href, intro, labels, origin } from '../lib/routes'
import { Filter, HomeSearch } from './filter'
import { Icon } from './icons'
import type { Glyph } from './icons'
import { Media } from './media'
import styles from './site.module.scss'

const t = (locale: Locale, zh: string, en: string) => locale === 'zh' ? zh : en

function Title({ title, description, icon }: { title: string; description?: string; icon?: Glyph }) {
  return <div className={styles.pageTitle}>
    {icon && <span className={styles.titleIcon}><Icon name={icon} size={24} /></span>}
    <div><h1>{title}</h1>{description && <p>{description}</p>}</div>
  </div>
}

function Section({ title, children, more }: { title: string; children: ReactNode; more?: ReactNode }) {
  return <section className={styles.section}>
    <div className={styles.sectionHeading}><h2>{title}</h2>{more}</div>
    {children}
  </section>
}

function More({ to, children }: { to: string; children: ReactNode }) {
  return <a href={to} className={styles.more}>{children}<Icon name="arrow" size={15} /></a>
}

function Breadcrumb({ locale, title, parent }: { locale: Locale; title: string; parent?: [string, string] }) {
  return <nav className={styles.breadcrumb} aria-label={t(locale, '面包屑导航', 'Breadcrumb')}>
    <a href={href(locale)}>{t(locale, '首页', 'Home')}</a><Icon name="chevron" size={13} />
    {parent && <><a href={href(locale, parent[0])}>{parent[1]}</a><Icon name="chevron" size={13} /></>}
    <span aria-current="page">{title}</span>
  </nav>
}

function categoryTitle(code: CategoryCode, locale: Locale) {
  return categories.find((category) => category[0] === code)![locale === 'zh' ? 1 : 2]
}

function byCategory(code: CategoryCode) {
  return sites.filter(({ id }) => {
    const record = categoriesBySite[id]
    return record && (record.primary === code || record.secondary.includes(code))
  })
}

function SiteRow({ site, locale, compact = false }: { site: Site; locale: Locale; compact?: boolean }) {
  const name = localized(site.title, locale)
  const description = localized(site.description, locale)
  return <a href={href(locale, '/site/' + site.id)} className={styles.siteRow + (compact ? ' ' + styles.compact : '')} data-search-id={compact ? undefined : site.id}>
    <Media kind="logo" src={site.logo} eager={compact} />
    <span className={styles.siteCopy}>
      <strong>{name}</strong>
      {!compact && description && <span>{description}</span>}
    </span>
    <span className={styles.rowArrow}><Icon name="chevron" size={15} /></span>
  </a>
}

function gameCover(game: Game) {
  return game.cover || steamCover(game.appId)
}

function GameCard({ game, locale }: { game: Game; locale: Locale }) {
  const name = localized(game.title, locale)
  const visibleTags = game.tags.map(({ id }) => tagsById.get(id))
    .filter((tag) => tag?.category === 'classification').slice(0, 3)
  return <a href={href(locale, '/games/' + game.id)} className={styles.gameCard} data-search-id={game.id}>
    <Media src={gameCover(game)} />
    <div className={styles.gameCaption}>
      <strong>{name}</strong>
      {visibleTags.length > 0 && <span>{visibleTags.map((tag) => localized(tag!.title, locale)).join(' · ')}</span>}
    </div>
  </a>
}

function CollectionCard({ item, locale }: { item: Collection; locale: Locale }) {
  const coverGame = gameById.get(item.members[0])
  return <a href={href(locale, '/games/collections/' + item.code)} className={styles.collectionCard}>
    <Media src={coverGame && gameCover(coverGame)} />
    <div className={styles.collectionCaption}>
      <div><Icon name="layers" size={18} /><strong>{localized(item.title, locale)}</strong></div>
      <small>{item.members.length} {t(locale, '款游戏', item.members.length === 1 ? 'game' : 'games')}</small>
    </div>
  </a>
}

function Home({ locale }: { locale: Locale }) {
  const listed = ordered(sites, locale)
  const spotlight = catalog.featuredGames.slice(0, 4).map((id) => gameById.get(id)).filter((game): game is Game => !!game)
  return <>
    <Title title={intro[locale].title} description={intro[locale].description} />
    <HomeSearch locale={locale} total={listed.length} results={listed.map((site) => <SiteRow key={site.id} site={site} locale={locale} />)}>
      <Section title={t(locale, '探索分类', 'Explore categories')}
        more={<More to={href(locale, '/site-groups')}>{labels[locale]['site-groups']}</More>}>
        <div className={styles.categoryGrid}>
          {categories.map(([code, zh, en, , , icon]) => {
            const heading = locale === 'zh' ? zh : en
            const members = ordered(byCategory(code), locale)
            return <section key={code} className={styles.categoryCard} aria-label={heading}>
              <h3><a href={href(locale, '/categories/' + code)}><span className={styles.categoryIcon}><Icon name={icon} /></span>{heading}</a></h3>
              <div className={styles.categoryEntries}>
                {members.slice(0, 8).map((site) => <SiteRow key={site.id} site={site} locale={locale} compact />)}
              </div>
              <div className={styles.categoryFooter}>
                <span>{members.length} {t(locale, '个站点', members.length === 1 ? 'site' : 'sites')}</span>
                <More to={href(locale, '/categories/' + code)}>{t(locale, '查看全部', 'View all')}</More>
              </div>
            </section>
          })}
        </div>
      </Section>
      <Section title={t(locale, '兽游发现', 'Discover games')}
        more={<div className={styles.sectionLinks}><a href={href(locale, '/games/collections')}>{labels[locale].collections}</a><More to={href(locale, '/games')}>{t(locale, '全部游戏', 'All games')}</More></div>}>
        <div className={styles.gameGrid}>{spotlight.map((game) => <GameCard key={game.id} game={game} locale={locale} />)}</div>
      </Section>
    </HomeSearch>
  </>
}

function SiteDirectory({ title, description, entries, locale, icon }: {
  title: string; description: string; entries: Site[]; locale: Locale; icon: Glyph
}) {
  const rows = ordered(entries, locale)
  return <>
    <Breadcrumb title={title} locale={locale} />
    <Title title={title} description={description} icon={icon} />
    <Filter locale={locale} kind="sites" total={rows.length}>
      {rows.map((site) => <SiteRow key={site.id} site={site} locale={locale} />)}
    </Filter>
  </>
}

function LegacyGroups({ locale }: { locale: Locale }) {
  return <>
    <Title title={labels[locale]['site-groups']} icon="layers"
      description={t(locale, '按旧站原有分组浏览站点。', 'Browse websites by their original GoFurry groups.')} />
    <div className={styles.siteGrid}>
      {catalog.groups.map((group) => <a className={styles.indexItem} key={group.id} href={href(locale, '/site-groups/' + group.id)}>
        <Icon name="layers" /><div><strong>{localized(group.title, locale)}</strong><span>{group.members.length} {t(locale, '个站点', 'sites')}</span></div><Icon name="chevron" size={16} />
      </a>)}
    </div>
  </>
}

function Tags({ children }: { children: ReactNode }) {
  return <div className={styles.tags}>{children}</div>
}

function PlainBody({ value }: { value: string }) {
  if (!value) return null
  return <div className={styles.readable}>{value.split(/\n+/).filter((line) => line.trim()).map((line, i) => <p key={i}>{line}</p>)}</div>
}

function External({ url, children }: { url: string; children: ReactNode }) {
  return <a className={styles.action} href={url} target="_blank" rel="noopener noreferrer"><Icon name="external" size={17} />{children}</a>
}

function SiteDetail({ site, locale }: { site: Site; locale: Locale }) {
  const name = localized(site.title, locale)
  const description = localized(site.description, locale)
  const classification = categoriesBySite[site.id]
  const groups = catalog.groups.filter(({ id }) => site.groups.includes(id))
  const related = classification ? byCategory(classification.primary) : sites.filter((item) => item.groups.some((id) => site.groups.includes(id)))
  const suggestions = ordered(related.filter(({ id }) => id !== site.id), locale).slice(0, 4)
  return <>
    <Breadcrumb title={name} locale={locale} parent={classification
      ? ['/categories/' + classification.primary, categoryTitle(classification.primary, locale)] : undefined} />
    <article className={styles.detail}>
      <div className={styles.siteLead}>
        <Media kind="logo" src={site.logo} eager />
        <div>
          <h1>{name}</h1>
          {site.url && <span className={styles.detailHost}>{new URL(site.url).hostname}</span>}
          {description && <p>{description.split('\n')[0]}</p>}
          {classification && <Tags>{[classification.primary, ...classification.secondary].map((code) => <a key={code} href={href(locale, '/categories/' + code)}>{categoryTitle(code, locale)}</a>)}</Tags>}
        </div>
      </div>
      {(site.url || classification) && <div className={styles.actions}>
        {site.url && <External url={site.url}>{t(locale, '访问网站', 'Visit website')}</External>}
        {classification && <a className={styles.secondaryAction} href={href(locale, '/categories/' + classification.primary)}>{t(locale, '返回分类', 'Browse category')}</a>}
      </div>}
      <div className={styles.detailSplit}>
        <div>
          {description && <section><h2>{t(locale, '关于网站', 'About this website')}</h2><PlainBody value={description} /></section>}
          {suggestions.length > 0 && <section className={styles.related}>
            <h2>{t(locale, '相关网站', 'Related websites')}</h2>
            {suggestions.map((item) => <SiteRow key={item.id} site={item} locale={locale} compact />)}
          </section>}
        </div>
        {(classification || groups.length > 0) && <aside className={styles.facts}>
          <h2>{t(locale, '站点信息', 'Site information')}</h2>
          <dl>
            {classification && <div><dt>{t(locale, '主分类', 'Primary category')}</dt><dd><a href={href(locale, '/categories/' + classification.primary)}>{categoryTitle(classification.primary, locale)}</a></dd></div>}
            {groups.length > 0 && <div><dt>{labels[locale]['site-groups']}</dt>
              <dd className={styles.factLinks}>{groups.map((group) => <a key={group.id} href={href(locale, '/site-groups/' + group.id)}>{localized(group.title, locale)}</a>)}</dd>
            </div>}
          </dl>
        </aside>}
      </div>
    </article>
  </>
}

function gameKindFilters(locale: Locale) {
  return [
    { name: t(locale, '游戏分类', 'Game category'), key: 'classification' },
    { name: t(locale, '物种标签', 'Species'), key: 'species' },
  ].map(({ name, key }) => {
    const used = new Set(games.flatMap(({ tags }) => tags.map(({ id }) => id)))
    const options = catalog.tags.filter((tag) => tag.category === key && used.has(tag.id))
      .map((tag) => ({ id: tag.id, label: localized(tag.title, locale) }))
      .sort((first, last) => first.label.localeCompare(last.label, locale === 'zh' ? 'zh-CN' : 'en'))
    return { name, options }
  })
}

function GameDirectory({ locale }: { locale: Locale }) {
  const listed = ordered(games, locale)
  return <>
    <Title title={t(locale, '探索兽游', 'Explore furry games')} icon="game"
      description={t(locale, '发现兽人主题的独立游戏与互动作品。', 'Discover furry-themed indie games and interactive works.')} />
    <Filter locale={locale} kind="games" group={gameKindFilters(locale)} total={listed.length}
      beforeResults={<>
        <Section title={t(locale, '精选合集', 'Featured collections')}
          more={<More to={href(locale, '/games/collections')}>{t(locale, '查看全部 16 个合集', 'View all 16 collections')}</More>}>
          <div className={styles.collectionGrid}>
            {catalog.collections.slice(0, 3).map((item) => <CollectionCard key={item.code} item={item} locale={locale} />)}
          </div>
        </Section>
        <div className={styles.sectionHeading}><h2>{t(locale, '全部游戏', 'All games')}</h2><span>{t(locale, '按名称排序', 'Sorted by name')}</span></div>
      </>}>
      {listed.map((game) => <GameCard key={game.id} game={game} locale={locale} />)}
    </Filter>
  </>
}

function Collections({ locale, collection }: { locale: Locale; collection?: Collection }) {
  if (!collection) return <>
    <Breadcrumb locale={locale} title={labels[locale].collections} parent={['/games', labels[locale].games]} />
    <Title title={labels[locale].collections} icon="layers" description={t(locale, '按玩法或主题浏览历史游戏合集。', 'Browse the archived collections by genre or theme.')} />
    <div className={styles.collectionGrid}>{catalog.collections.map((item) => <CollectionCard key={item.code} item={item} locale={locale} />)}</div>
  </>
  const title = localized(collection.title, locale)
  const entries = ordered(collection.members.map((id) => gameById.get(id)!).filter(Boolean), locale)
  return <>
    <Breadcrumb locale={locale} title={title} parent={['/games/collections', labels[locale].collections]} />
    <Title title={title} description={localized(collection.description, locale)} icon="layers" />
    <Section title={t(locale, '收录游戏', 'Games in this collection')}
      more={<span>{entries.length} {t(locale, '款游戏', entries.length === 1 ? 'game' : 'games')}</span>}>
      {entries.length
        ? <div className={styles.gameGrid}>{entries.map((game) => <GameCard key={game.id} game={game} locale={locale} />)}</div>
        : <p className={styles.notice}>{t(locale, '暂无可公开展示的游戏。', 'There are no public games in this collection yet.')}</p>}
    </Section>
  </>
}

function GameDetail({ game, locale }: { game: Game; locale: Locale }) {
  const name = localized(game.title, locale)
  const description = localized(game.description, locale)
  const longText = game.body ? localized(game.body, locale) : ''
  const officialSteam = 'https://store.steampowered.com/app/' + game.appId + '/'
  const tags = game.tags.map(({ id, role }) => ({ item: tagsById.get(id), role }))
  const collections = catalog.collections.filter((item) => item.members.includes(game.id))
  const platforms = game.platforms.map((platform) => ({ linux: 'Linux', mac: 'macOS', windows: 'Windows' })[platform] ?? platform)
  const facts = [
    [t(locale, '开发者', 'Developer'), game.developers.join(', ')],
    [t(locale, '发行商', 'Publisher'), game.publishers.join(', ')],
    [t(locale, '平台', 'Platforms'), platforms.join(' · ')],
    [t(locale, '发行信息', 'Release'), game.release || ''],
  ].filter(([, value]) => value)
  return <>
    <Breadcrumb locale={locale} title={name} parent={['/games', labels[locale].games]} />
    <article className={styles.detail}>
      <div className={styles.gameLead}>
        <Media src={gameCover(game)} label={name} eager />
        <div>
          <h1>{name}</h1>
          {description && <p>{description}</p>}
          {tags.length > 0 && <Tags>{tags.filter(({ item }) => item?.category === 'classification').slice(0, 4)
            .map(({ item }) => <span key={item!.id}>{localized(item!.title, locale)}</span>)}</Tags>}
          <div className={styles.actions}><External url={officialSteam}>{t(locale, '前往 Steam 商店', 'View on Steam')}</External></div>
        </div>
      </div>
      <div className={styles.detailSplit}>
        <div>
          {(longText || description) && <section><h2>{t(locale, '游戏介绍', 'About the game')}</h2><PlainBody value={longText || description} /></section>}
          {game.screenshots.length > 0 && <section className={styles.related}>
            <h2>{t(locale, '游戏截图', 'Screenshots')}</h2>
            <div className={styles.shots}>{game.screenshots.map((url, i) => <a key={url} href={url} target="_blank" rel="noopener noreferrer"
              aria-label={t(locale, '打开截图 ', 'Open screenshot ') + (i + 1)}><Media kind="shot" src={url} /></a>)}</div>
          </section>}
        </div>
        <aside className={styles.facts}>
          <h2>{t(locale, '游戏资料', 'Game information')}</h2>
          <dl>
            {facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
            {collections.length > 0 && <div><dt>{t(locale, '相关合集', 'Collections')}</dt>
              <dd className={styles.factLinks}>{collections.map(({ code, title }) => <a key={code} href={href(locale, '/games/collections/' + code)}>{localized(title, locale)}</a>)}</dd></div>}
            {tags.length > 0 && <div><dt>{t(locale, '标签', 'Tags')}</dt><dd>
              <Tags>{tags.map(({ item, role }) => item && <span key={item.id} data-primary={role === 'primary' || undefined}>{localized(item.title, locale)}</span>)}</Tags>
            </dd></div>}
          </dl>
        </aside>
      </div>
    </article>
  </>
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
    zh: ['本站提供可直接浏览的静态页面，站内搜索与筛选在浏览器内运行。主题选择保存在当前浏览器中。', '游戏图片由 Steam 图像服务器提供。打开第三方资源时，相关网络请求由对应服务处理。'],
    en: ['Pages are static and directory searches and filters run in your browser. Your theme preference is stored in this browser.', 'Game images are served by Steam. Requests for third-party resources are handled by the corresponding service.'],
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
  if (segments.length === 0) return <Home locale={locale} />
  if (section === 'status') {
    const gone = key === 'gone'
    return <article className={styles.readingPanel}>
      <p className={styles.statusCode}>{gone ? '410' : '404'}</p>
      <Title title={gone ? t(locale, '历史页面已退出', 'This legacy page has been retired') : t(locale, '找不到这个页面', 'Page not found')} />
      <More to={href(locale)}>{t(locale, '返回导航首页', 'Back to the directory')}</More>
    </article>
  }
  if (section === 'categories') {
    const category = categories.find(([code]) => code === key)
    if (category) return <SiteDirectory locale={locale} title={category[locale === 'zh' ? 1 : 2]}
      description={category[locale === 'zh' ? 3 : 4]} entries={byCategory(category[0])} icon={category[5]} />
  }
  if (section === 'site-groups') {
    if (!key) return <LegacyGroups locale={locale} />
    const group = catalog.groups.find(({ id }) => id === Number(key))
    if (group) return <SiteDirectory title={localized(group.title, locale)} description={localized(group.description, locale)}
      entries={group.members.map((id) => siteById.get(id)!).filter(Boolean)} icon="layers" locale={locale} />
  }
  if (section === 'site') {
    const site = siteById.get(Number(key))
    if (site) return <SiteDetail locale={locale} site={site} />
  }
  if (section === 'games') {
    if (!key) return <GameDirectory locale={locale} />
    if (key === 'collections') {
      if (!slug) return <Collections locale={locale} />
      const collection = catalog.collections.find(({ code }) => code === slug)
      if (collection) return <Collections locale={locale} collection={collection} />
    }
    const game = gameById.get(Number(key))
    if (game) return <GameDetail locale={locale} game={game} />
  }
  if (section === 'updates') {
    if (!key) return <Updates locale={locale} />
    const update = catalog.updates.find(({ id }) => id === Number(key))
    if (update) return <Updates locale={locale} update={update} />
  }
  if (section === 'about' || section === 'privacy' || section === 'terms') return <Info locale={locale} page={section} />
  notFound()
}
