'use client'

import type { ReactNode } from 'react'
import { categories, type CategoryCode } from '../lib/categories'
import { gameCardLabels, type HomeDirectory, type HomeGame } from '../lib/home-games'
import { href, inCategory, labels, localized, ordered, steamCover, steamStore } from '../lib/presentation'
import type { Collection, Directory, Game, GameCardData, Locale, Site, Tag, View } from '../lib/presentation'
import { Breadcrumb, More, Section, Title, t } from './elements'
import { Filter } from './filter'
import { HomeCategories, HomeLead } from './home-directory'
import { useHomeGameRotation } from './home-game-rotation'
import { Icon, type Glyph } from './icons'
import { Media } from './media'
import { useContentMode } from './preferences'
import { useStaticData } from './static-data'
import homeStyles from './home.module.scss'
import styles from './site.module.scss'

type ModeProps = { locale: Locale; directory: Directory; expanded: boolean }

function categoryTitle(code: CategoryCode, locale: Locale) {
  return categories.find((category) => category[0] === code)![locale === 'zh' ? 1 : 2]
}

function RatingBadge({ rating }: { rating: Site['rating'] }) {
  return rating === 'nsfw' ? <span className={styles.ratingBadge}>NSFW</span> : null
}

function SiteRow({ site, locale, compact = false, searchResult = false }: {
  site: Site; locale: Locale; compact?: boolean; searchResult?: boolean
}) {
  const name = localized(site.title, locale)
  const description = localized(site.description, locale)
  const className = [styles.siteRow, compact && styles.compact, searchResult && styles.siteSearchResult].filter(Boolean).join(' ')
  return <a href={href(locale, '/site/' + site.id)} className={className} data-search-id={compact ? undefined : site.id}>
    <Media kind="logo" src={site.logo} eager={compact} />
    <span className={styles.siteCopy}>
      <strong>{name}<RatingBadge rating={site.rating} /></strong>
      {!compact && description && <span>{description}</span>}
    </span>
    <span className={styles.rowArrow}><Icon name="chevron" size={15} /></span>
  </a>
}

function gameCover(game: Pick<GameCardData, 'appId' | 'cover'>) {
  return game.cover || steamCover(game.appId)
}

function GameCard({ game, locale, tags = [] }: { game: GameCardData | HomeGame; locale: Locale; tags?: Tag[] }) {
  const name = localized(game.title, locale)
  const visibleLabels = 'labels' in game ? game.labels : gameCardLabels(game, (id) => tags.find((tag) => tag.id === id))
  const storeLabel = t(locale, '前往 Steam 商店', 'View on Steam')
  return <div className={styles.gameCard}>
    <a className={styles.gameCoverLink} href={href(locale, '/games/' + game.id)} data-search-id={game.id}>
      <Media src={gameCover(game)} />
      <span className={styles.gameTitle}>
        <strong>{name}</strong><RatingBadge rating={game.rating} />
      </span>
      {visibleLabels.length > 0 && <span className={styles.gameTags}>{visibleLabels.map(({ id, title }) => {
        const label = localized(title, locale)
        return <span key={id} title={label}>{label}</span>
      })}</span>}
    </a>
    <a className={styles.gameSteam} href={steamStore(game.appId)} target="_blank" rel="noopener noreferrer"
      aria-label={storeLabel + ' · ' + name} title={storeLabel}>
      <Icon name="steam" size={18} />
    </a>
  </div>
}

function CollectionCard({ item, locale, games }: { item: Collection; locale: Locale; games: GameCardData[] }) {
  const coverGame = games.find(({ id }) => id === item.members[0])
  return <a href={href(locale, '/games/collections/' + item.code)} className={styles.collectionCard}>
    <Media src={coverGame && gameCover(coverGame)} />
    <div className={styles.collectionCaption}>
      <div><Icon name="layers" size={18} /><strong>{localized(item.title, locale)}</strong></div>
      <small>{item.members.length} {t(locale, '款游戏', item.members.length === 1 ? 'game' : 'games')}</small>
    </div>
  </a>
}

export function HomeView({ locale, initial }: { locale: Locale; initial: HomeDirectory }) {
  const { directory: { sites, games }, rotation, expanded, pending, failed } = useHomeGameRotation(initial, locale)
  const listed = ordered(sites, locale)
  return <>
    {pending && <p className="sr-only" role="status">{t(locale, '正在加载完整目录…', 'Loading the full directory…')}</p>}
    {failed && <p className={styles.notice} role="status">{t(locale, 'NSFW 资料暂不可用。', 'NSFW entries could not be loaded.')}</p>}
    <Filter locale={locale} kind="sites" expanded={expanded}
      searchLayout={(search) => <HomeLead locale={locale} search={search} />}
      entries={listed.map((site) => ({ id: site.id, card: <SiteRow key={site.id} site={site} locale={locale} searchResult /> }))}
      beforeResults={<>
        <Section title={t(locale, '探索分类', 'Explore categories')}
          more={<a className={homeStyles.sectionAction} href={href(locale, '/site-groups')}>
            <span>{labels[locale]['site-groups']}</span>
          </a>}>
          <HomeCategories locale={locale} sites={sites} />
        </Section>
        <Section title={t(locale, '兽游发现', 'Discover games')}
          more={<nav className={homeStyles.sectionActions} aria-label={t(locale, '兽游发现', 'Discover games')}>
            <a className={homeStyles.sectionAction} href={href(locale, '/games/collections')}>
              <span>{labels[locale].collections}</span>
            </a>
            <a className={homeStyles.sectionAction} href={href(locale, '/games')}>
              <span>{t(locale, '全部游戏', 'All games')}</span>
            </a>
          </nav>}>
          <div className={styles.gameGrid + ' ' + homeStyles.homeGameGrid} data-home-games={rotation ?? 'static'}>
            {games.map((game) => <GameCard key={game.id} game={game} locale={locale} />)}
          </div>
        </Section>
      </>} />
  </>
}

function SiteDirectory({ title, description, entries, locale, icon, expanded }: {
  title: string; description: string; entries: Site[]; locale: Locale; icon: Glyph; expanded: boolean
}) {
  const rows = ordered(entries, locale)
  return <>
    <Breadcrumb title={title} locale={locale} />
    <Title title={title} description={description} icon={icon} />
    <Filter locale={locale} kind="sites" expanded={expanded}
      entries={rows.map((site) => ({ id: site.id, card: <SiteRow key={site.id} site={site} locale={locale} /> }))} />
  </>
}

function LegacyGroups({ locale, directory }: ModeProps) {
  return <>
    <Title title={labels[locale]['site-groups']} icon="layers"
      description={t(locale, '按旧站原有分组浏览站点。', 'Browse websites by their original GoFurry groups.')} />
    <div className={styles.siteGrid}>
      {directory.groups.map((group) => <a className={styles.indexItem} key={group.id} href={href(locale, '/site-groups/' + group.id)}>
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

function SiteDetail({ site, locale, directory }: { site: Site } & ModeProps) {
  const name = localized(site.title, locale)
  const description = localized(site.description, locale)
  const classification = directory.sites.find(({ id }) => id === site.id)?.category
  const groups = directory.groups.filter(({ id }) => site.groups.includes(id))
  const related = classification ? directory.sites.filter((item) => inCategory(item, classification.primary)) : []
  const suggestions = ordered(related.filter(({ id }) => id !== site.id), locale).slice(0, 4)
  return <>
    <Breadcrumb title={name} locale={locale} parent={classification
      ? ['/categories/' + classification.primary, categoryTitle(classification.primary, locale)] : undefined} />
    <article className={styles.detail}>
      <div className={styles.siteLead}>
        <Media kind="logo" src={site.logo} eager />
        <div>
          <h1>{name}<RatingBadge rating={site.rating} /></h1>
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

function gameKindFilters(locale: Locale, { games, tags }: Directory) {
  return [
    { name: t(locale, '游戏分类', 'Game category'), key: 'classification' },
    { name: t(locale, '物种标签', 'Species'), key: 'species' },
  ].map(({ name, key }) => {
    const used = new Set(games.flatMap(({ tags }) => tags.map(({ id }) => id)))
    const options = tags.filter((tag) => tag.category === key && used.has(tag.id))
      .map((tag) => ({ id: tag.id, label: localized(tag.title, locale) }))
      .sort((first, last) => first.label.localeCompare(last.label, locale === 'zh' ? 'zh-CN' : 'en'))
    return { name, options }
  })
}

function GameDirectory({ locale, directory, expanded }: ModeProps) {
  const { games, tags, collections } = directory
  const listed = ordered(games, locale)
  return <>
    <Title title={t(locale, '探索兽游', 'Explore furry games')} icon="game"
      description={t(locale, '发现兽人主题的独立游戏与互动作品。', 'Discover furry-themed indie games and interactive works.')} />
    <Filter locale={locale} kind="games" group={gameKindFilters(locale, directory)} expanded={expanded}
      entries={listed.map((game) => ({ id: game.id, card: <GameCard key={game.id} game={game} locale={locale} tags={tags} /> }))}
      beforeResults={<>
        <Section title={t(locale, '精选合集', 'Featured collections')}
          more={<More to={href(locale, '/games/collections')}>{t(locale, '查看全部 16 个合集', 'View all 16 collections')}</More>}>
          <div className={styles.collectionGrid}>
            {collections.slice(0, 3).map((item) => <CollectionCard key={item.code} item={item} locale={locale} games={games} />)}
          </div>
        </Section>
        <div className={styles.sectionHeading}><h2>{t(locale, '全部游戏', 'All games')}</h2><span>{listed.length} {t(locale, '款游戏', 'games')}</span></div>
      </>} />
  </>
}

function Collections({ locale, collection, directory }: { collection?: Collection } & ModeProps) {
  const { games, tags, collections } = directory
  if (!collection) return <>
    <Breadcrumb locale={locale} title={labels[locale].collections} parent={['/games', labels[locale].games]} />
    <Title title={labels[locale].collections} icon="layers" description={t(locale, '按玩法或主题浏览历史游戏合集。', 'Browse the archived collections by genre or theme.')} />
    <div className={styles.collectionGrid}>{collections.map((item) => <CollectionCard key={item.code} item={item} locale={locale} games={games} />)}</div>
  </>
  const title = localized(collection.title, locale)
  const entries = ordered(games.filter(({ id }) => collection.members.includes(id)), locale)
  return <>
    <Breadcrumb locale={locale} title={title} parent={['/games/collections', labels[locale].collections]} />
    <Title title={title} description={localized(collection.description, locale)} icon="layers" />
    <Section title={t(locale, '收录游戏', 'Games in this collection')}
      more={<span>{entries.length} {t(locale, '款游戏', entries.length === 1 ? 'game' : 'games')}</span>}>
      {entries.length
        ? <div className={styles.gameGrid}>{entries.map((game) => <GameCard key={game.id} game={game} locale={locale} tags={tags} />)}</div>
        : <p className={styles.notice}>{t(locale, '暂无可公开展示的游戏。', 'There are no public games in this collection yet.')}</p>}
    </Section>
  </>
}

function GameDetail({ game, locale, directory }: { game: Game } & ModeProps) {
  const name = localized(game.title, locale)
  const description = localized(game.description, locale)
  const longText = game.body ? localized(game.body, locale) : ''
  const tags = game.tags.map(({ id, role }) => ({ item: directory.tags.find((tag) => tag.id === id), role }))
  const collections = directory.collections.filter((item) => item.members.includes(game.id))
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
          <h1>{name}<RatingBadge rating={game.rating} /></h1>
          {description && <p>{description}</p>}
          {tags.length > 0 && <Tags>{tags.filter(({ item }) => item?.category === 'classification').slice(0, 4)
            .map(({ item }) => <span key={item!.id}>{localized(item!.title, locale)}</span>)}</Tags>}
          <div className={styles.actions}><External url={steamStore(game.appId)}>{t(locale, '前往 Steam 商店', 'View on Steam')}</External></div>
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

export function CatalogView({ view, initial, detail, locale }: {
  view: View; initial: Directory; detail?: Site | Game; locale: Locale
}) {
  const requested = useContentMode() === 'nsfw'
  const extension = useStaticData<Directory>(requested ? '/indexes/extended/directory.json' : null)
  const isDetail = view.type === 'site' || view.type === 'game'
  const gated = isDetail && !detail
  const detailUrl = requested && gated ? '/indexes/extended/' + view.type + '/' + view.id + '.json' : null
  const extra = useStaticData<Site | Game>(detailUrl)
  const expanded = requested && Boolean(extension?.value)
  const directory = (requested && extension?.value) || initial
  const props = { locale, directory, expanded }
  const record = detail ?? (requested ? extra?.value : undefined)
  if (gated && (!record || !expanded)) {
    const description = !requested ? t(locale, '请在页头开启 NSFW 模式查看这条历史资料。', 'Enable NSFW mode in the header to view this archived entry.')
      : extension?.failed || extra?.failed ? t(locale, '资料暂不可用，请稍后重试。', 'This entry could not be loaded. Please try again later.')
      : t(locale, '正在加载历史资料…', 'Loading the archived entry…')
    return <article className={styles.readingPanel}>
      <Title title={t(locale, 'NSFW 内容', 'NSFW content')} />
      <p className={styles.notice} role={requested ? 'status' : undefined}>{description}</p>
    </article>
  }

  let content: ReactNode
  switch (view.type) {
    case 'site': if (record && !('appId' in record)) content = <SiteDetail {...props} site={record} />; break
    case 'game': if (record && 'appId' in record) content = <GameDetail {...props} game={record} />; break
    case 'games': content = <GameDirectory {...props} />; break
    case 'groups': content = <LegacyGroups {...props} />; break
    case 'category': {
      const category = categories.find(([code]) => code === view.code)!
      content = <SiteDirectory locale={locale} expanded={expanded} title={category[locale === 'zh' ? 1 : 2]}
        description={category[locale === 'zh' ? 3 : 4]} entries={directory.sites.filter((site) => inCategory(site, view.code))}
        icon={category[5]} />
      break
    }
    case 'group': {
      const group = directory.groups.find(({ id }) => id === view.id)!
      content = <SiteDirectory locale={locale} expanded={expanded} title={localized(group.title, locale)} description={localized(group.description, locale)}
        entries={directory.sites.filter((site) => group.members.includes(site.id))} icon="layers" />
      break
    }
    case 'collections': content = <Collections {...props} />; break
    case 'collection': content = <Collections {...props} collection={directory.collections.find(({ code }) => code === view.code)} />; break
  }
  return <>
    {requested && !expanded && <p className={styles.notice} role="status">{extension?.failed
      ? t(locale, 'NSFW 资料暂不可用。', 'NSFW entries could not be loaded.')
      : t(locale, '正在加载完整目录…', 'Loading the full directory…')}</p>}
    {content}
  </>
}
