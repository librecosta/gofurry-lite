import type { Metadata } from 'next'
import { categories } from './categories'
import { catalog, sites, games, siteById, gameById } from './catalog'
import { href, intro, labels, localized, type Locale } from './presentation'

export const origin = 'https://go-furry.com'
export { href } from './presentation'

export function languageUrls(path: string) {
  const en = origin + href('en', path)
  return { en, 'zh-CN': origin + href('zh', path), 'x-default': en }
}

const landingPages = ['games', 'games/collections', 'updates', 'about', 'privacy', 'terms', 'site-groups']
  .map((page) => '/' + page)
export function publicPaths(includeNsfw = false) {
  return [
    '/', ...landingPages,
    ...categories.map(([code]) => '/categories/' + code),
    ...sites.filter((site) => includeNsfw || site.rating === 'sfw').map(({ id }) => '/site/' + id),
    ...catalog.groups.map(({ id }) => '/site-groups/' + id),
    ...games.filter((game) => includeNsfw || game.rating === 'sfw').map(({ id }) => '/games/' + id),
    ...catalog.collections.map(({ code }) => '/games/collections/' + code),
    ...catalog.updates.map(({ id }) => '/updates/' + id),
  ]
}

export function buildParams() {
  return [...publicPaths(true), '/status/not-found', '/status/gone'].map((path) => ({ path: path.split('/').filter(Boolean) }))
}

export function metadataFor(locale: Locale, segments: string[]): Metadata {
  const path = '/' + segments.join('/')
  const isError = segments[0] === 'status'
  const content = landingPages.includes(path) ? labels[locale][segments.at(-1) as keyof typeof labels.en] : undefined
  let title = content ?? intro[locale].title
  let description = intro[locale].description
  const image = origin + '/media/brand/gofurry-lite-og.png'
  const [section, key, slug] = segments
  const record = section === 'site' ? siteById.get(Number(key))
    : section === 'games' && key === 'collections' ? catalog.collections.find((item) => item.code === slug)
    : section === 'games' ? gameById.get(Number(key))
    : section === 'site-groups' ? catalog.groups.find((item) => item.id === Number(key))
    : section === 'updates' ? catalog.updates.find((item) => item.id === Number(key)) : undefined
  const restricted = record && 'rating' in record && record.rating === 'nsfw'
  if (restricted) {
    title = locale === 'zh' ? 'NSFW 内容' : 'NSFW content'
    description = locale === 'zh' ? '开启 NSFW 模式可查看这条历史资料。' : 'Enable NSFW mode to view this archived entry.'
  } else if (record) {
    title = localized(record.title, locale)
    description = (localized(record.description, locale) || description).replace(/\s+/g, ' ').slice(0, 170)
  } else if (section === 'categories') {
    const category = categories.find(([code]) => code === key)
    if (category) {
      title = category[locale === 'zh' ? 1 : 2]
      description = category[locale === 'zh' ? 3 : 4]
    }
  }
  if (isError) return { title: key === 'gone' ? '410 · GoFurry Lite' : '404 · GoFurry Lite', robots: { index: false, follow: false } }
  const canonical = origin + href(locale, path)
  title += ' · GoFurry Lite'
  return {
    title, description, icons: '/media/brand/gofurry-favicon.png',
    ...(restricted && { robots: { index: false, follow: false } }),
    alternates: { canonical, languages: languageUrls(path) },
    openGraph: { title, description, url: canonical, siteName: 'GoFurry Lite', type: 'website', locale: locale === 'zh' ? 'zh_CN' : 'en_US', alternateLocale: locale === 'zh' ? 'en_US' : 'zh_CN', images: [{ url: image, width: 1200, height: 630, alt: 'GoFurry Lite' }] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  }
}
