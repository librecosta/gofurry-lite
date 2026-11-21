
import type { CategoryCode } from './categories'

export type Locale = 'zh' | 'en'
export type Rating = 'sfw' | 'nsfw'
export type Translation = { zh: string; en: string }
export type Copy = { title: Translation; description: Translation }
export type Classification = { primary: CategoryCode; secondary: CategoryCode[] }
export type Site = Copy & { id: number; rating: Rating; groups: number[]; logo?: string; url?: string }
export type DirectorySite = Site & { category: Classification }
export type Group = Copy & { id: number; members: number[] }
export type GameCardData = Copy & { id: number; rating: Rating; appId: number; cover?: string; tags: { id: number; role: string }[] }
export type Game = GameCardData & {
  body: Translation; developers: string[]; publishers: string[]; platforms: string[]; screenshots: string[]; release?: string
}
export type Tag = { id: number; code: string; category: string; title: Translation }
export type Collection = Copy & { id: number; code: string; members: number[] }
export type Update = Copy & { id: number; date: string; version: string; commit: string; body: Translation }
export type Directory = {
  sites: DirectorySite[]; games: GameCardData[]; groups: Group[]; collections: Collection[]; tags: Tag[]
  collectionCovers?: Partial<Record<number, string>>
}
export type View =
  | { type: 'groups' | 'games' | 'collections' }
  | { type: 'category'; code: CategoryCode }
  | { type: 'group' | 'site' | 'game'; id: number }
  | { type: 'collection'; code: string }

export const intro = {
  zh: { title: '发现值得探索的兽圈网站', description: '社区、创作、文学、工具、游戏与活动，一站发现。' },
  en: { title: 'Discover furry websites', description: 'Find furry communities, art, writing, tools, games and events.' },
}

export const labels = {
  zh: { games: '兽游目录', collections: '游戏合集', updates: '更新日志', about: '关于', privacy: '隐私政策', terms: '使用条款', 'site-groups': '历史分组' },
  en: { games: 'Games', collections: 'Collections', updates: 'Updates', about: 'About', privacy: 'Privacy', terms: 'Terms', 'site-groups': 'Legacy groups' },
}

export function href(locale: Locale, path = '/') {
  return locale === 'en' ? path : '/zh' + (path === '/' ? '' : path)
}

export function localized(value: Translation, locale: Locale) {
  return value[locale] || value[locale === 'zh' ? 'en' : 'zh']
}

export function ordered<T extends Copy>(entries: T[], locale: Locale) {
  const language = locale === 'zh' ? 'zh-CN' : 'en'
  return [...entries].sort((first, next) => localized(first.title, locale).localeCompare(localized(next.title, locale), language))
}

export function steamCover(appId: number) {
  return 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/' + appId + '/header.jpg'
}

export function gameCover(game: Pick<GameCardData, 'appId' | 'cover'>) {
  return game.cover || steamCover(game.appId)
}

export function steamStore(appId: number) {
  return 'https://store.steampowered.com/app/' + appId + '/'
}

export function inCategory(site: DirectorySite, code: CategoryCode) {
  return site.category.primary === code || site.category.secondary.includes(code)
}
