import type { Metadata } from 'next'
import classifications from '../../content/curation/site-categories.json'
import { categories, categoryName } from './categories'
import { catalog, sites, games } from './catalog'
import { href, labels, localized, type Collection, type Game, type Group, type Locale, type Site, type Update } from './presentation'
import { categoryDescriptions, landingMetadata } from './seo-copy'
import { detailDescription, cleanMetadataText } from './seo-text'

export const origin = 'https://go-furry.com'
export { href } from './presentation'

export function languageUrls(path: string) {
  const en = origin + href('en', path)
  return { en, 'zh-CN': origin + href('zh', path), 'x-default': en }
}

type LandingPath = keyof typeof landingMetadata
type Page =
  | { kind: 'landing'; path: LandingPath }
  | { kind: 'category'; category: typeof categories[number] }
  | { kind: 'site'; record: Site }
  | { kind: 'game'; record: Game }
  | { kind: 'group'; record: Group }
  | { kind: 'collection'; record: Collection }
  | { kind: 'update'; record: Update }

const pages = new Map<string, Page>()
for (const path of Object.keys(landingMetadata) as LandingPath[]) pages.set(path, { kind: 'landing', path })
for (const category of categories) pages.set('/categories/' + category[0], { kind: 'category', category })
for (const record of sites) pages.set('/site/' + record.id, { kind: 'site', record })
for (const record of games) pages.set('/games/' + record.id, { kind: 'game', record })
for (const record of catalog.groups) pages.set('/site-groups/' + record.id, { kind: 'group', record })
for (const record of catalog.collections) pages.set('/games/collections/' + record.code, { kind: 'collection', record })
for (const record of catalog.updates) pages.set('/updates/' + record.id, { kind: 'update', record })

function isRestricted(page: Page) {
  return (page.kind === 'site' || page.kind === 'game') && page.record.rating === 'nsfw'
}

export function pageFor(path: string) {
  return pages.get(path)
}

export function publicPaths(includeNsfw = false) {
  return [...pages].filter(([, page]) => includeNsfw || !isRestricted(page)).map(([path]) => path)
}

export function buildParams() {
  return [...publicPaths(true), '/status/not-found', '/status/gone'].map((path) => ({ path: path.split('/').filter(Boolean) }))
}

function pageCopy(page: Page, locale: Locale) {
  if (isRestricted(page)) return locale === 'zh'
    ? { title: 'NSFW 内容 · GoFurry Lite', description: '开启 NSFW 模式可查看这条历史资料。' }
    : { title: 'NSFW content · GoFurry Lite', description: 'Enable NSFW mode to view this archived entry.' }
  if (page.kind === 'landing') {
    const copy = landingMetadata[page.path]
    return { title: copy.title[locale], description: copy.description[locale] }
  }
  if (page.kind === 'category') {
    const code = page.category[0]
    const suffix = locale === 'zh' ? '兽圈网站导航' : 'Furry Websites'
    return { title: `${categoryName(code, locale)} — ${suffix} | GoFurry Lite`, description: categoryDescriptions[code][locale] }
  }
  const name = cleanMetadataText(localized(page.record.title, locale))
  return {
    title: /\bGoFurry Lite\b/i.test(name) ? name : name + ' | GoFurry Lite',
    description: detailDescription(page.kind, page.record, locale),
  }
}

export function metadataFor(locale: Locale, segments: string[]): Metadata {
  const path = '/' + segments.join('/')
  const page = pageFor(path)
  if (!page) return {
    title: path === '/status/gone' ? '410 · GoFurry Lite' : '404 · GoFurry Lite',
    robots: { index: false, follow: false },
  }
  const { title, description } = pageCopy(page, locale)
  const canonical = origin + href(locale, path)
  const image = origin + '/media/brand/gofurry-lite-og.png'
  return {
    title, description, icons: '/media/brand/gofurry-favicon.png',
    ...(isRestricted(page) && { robots: { index: false, follow: false } }),
    alternates: { canonical, languages: languageUrls(path) },
    openGraph: {
      title, description, url: canonical, siteName: 'GoFurry Lite', type: 'website',
      locale: locale === 'zh' ? 'zh_CN' : 'en_US', alternateLocale: locale === 'zh' ? 'en_US' : 'zh_CN',
      images: [{ url: image, width: 1200, height: 630, alt: 'GoFurry Lite' }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  }
}

export function structuredDataFor(path: string, locale: Locale) {
  const page = pageFor(path)
  if (!page || isRestricted(page)) return
  const canonical = origin + href(locale, path)
  if (path === '/') return {
    '@context': 'https://schema.org', '@type': 'WebSite', name: 'GoFurry Lite',
    url: canonical, description: landingMetadata['/'].description[locale],
    inLanguage: locale === 'zh' ? 'zh-CN' : 'en',
  }
  const crumbs: [string, string][] = [['/', locale === 'zh' ? '首页' : 'Home']]
  const label = labels[locale]
  if (page.kind === 'landing') {
    if (path === '/games/collections') crumbs.push(['/games', label.games], [path, label.collections])
    else if (path === '/site-groups') crumbs.push([path, label['site-groups']])
    else return
  } else if (page.kind === 'category') {
    crumbs.push([path, categoryName(page.category[0], locale)])
  } else {
    switch (page.kind) {
      case 'site': {
        const code = classifications[String(page.record.id) as keyof typeof classifications].primary as (typeof categories)[number][0]
        crumbs.push(['/categories/' + code, categoryName(code, locale)])
        break
      }
      case 'game': crumbs.push(['/games', label.games]); break
      case 'collection': crumbs.push(['/games', label.games], ['/games/collections', label.collections]); break
      case 'group': crumbs.push(['/site-groups', label['site-groups']]); break
      case 'update': crumbs.push(['/updates', label.updates]); break
    }
    crumbs.push([path, localized(page.record.title, locale)])
  }
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map(([crumbPath, name], index) => ({
      '@type': 'ListItem', position: index + 1, name, item: origin + href(locale, crumbPath),
    })),
  }
}
