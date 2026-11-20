import type { Metadata } from 'next'
import { categories } from './categories'
import { catalog, sites, games, siteById, gameById, localized, steamCover } from './catalog'
import type { Locale } from './catalog'

export const origin = 'https://go-furry.com'
export const intro = {
  zh: { title: '发现值得探索的兽圈网站', description: '社区、创作、文学、工具、游戏与活动，一站发现。' },
  en: { title: 'Discover furry websites worth exploring', description: 'Find furry communities, art, writing, tools, games and events.' },
}

export const labels = {
  zh: { games: '兽游目录', collections: '游戏合集', updates: '更新日志', about: '关于', privacy: '隐私政策', terms: '使用条款', 'site-groups': '历史分组' },
  en: { games: 'Games', collections: 'Collections', updates: 'Updates', about: 'About', privacy: 'Privacy', terms: 'Terms', 'site-groups': 'Legacy groups' },
}

export function href(locale: Locale, path = '/') {
  return locale === 'zh' ? path : '/en' + (path === '/' ? '' : path)
}

const landingPages = ['games', 'games/collections', 'updates', 'about', 'privacy', 'terms', 'site-groups']
  .map((page) => '/' + page)
export function publicPaths() {
  return [
    '/', ...landingPages,
    ...categories.map(([code]) => '/categories/' + code),
    ...sites.map(({ id }) => '/site/' + id),
    ...catalog.groups.map(({ id }) => '/site-groups/' + id),
    ...games.map(({ id }) => '/games/' + id),
    ...catalog.collections.map(({ code }) => '/games/collections/' + code),
    ...catalog.updates.map(({ id }) => '/updates/' + id),
  ]
}

export function buildParams() {
  return [...publicPaths(), '/status/not-found', '/status/gone'].map((path) => ({ path: path.split('/').filter(Boolean) }))
}

export function metadataFor(locale: Locale, segments: string[]): Metadata {
  const path = '/' + segments.join('/')
  const isError = segments[0] === 'status'
  const content = landingPages.includes(path) ? labels[locale][segments.at(-1) as keyof typeof labels.en] : undefined
  let title = content ?? intro[locale].title
  let description = intro[locale].description
  let image = origin + '/favicon.svg'
  const [section, key, slug] = segments
  const record = section === 'site' ? siteById.get(Number(key))
    : section === 'games' && key === 'collections' ? catalog.collections.find((item) => item.code === slug)
    : section === 'games' ? gameById.get(Number(key))
    : section === 'site-groups' ? catalog.groups.find((item) => item.id === Number(key))
    : section === 'updates' ? catalog.updates.find((item) => item.id === Number(key)) : undefined
  if (record) {
    title = localized(record.title, locale)
    description = (localized(record.description, locale) || description).replace(/\s+/g, ' ').slice(0, 170)
    if ('logo' in record && record.logo) image = origin + record.logo
    if ('appId' in record) image = record.cover || steamCover(record.appId)
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
    title, description, icons: '/favicon.svg',
    alternates: { canonical, languages: { 'zh-CN': origin + path, en: origin + href('en', path) } },
    openGraph: { title, description, url: canonical, siteName: 'GoFurry Lite', type: 'website', locale: locale === 'zh' ? 'zh_CN' : 'en_US', images: [image] },
  }
}
