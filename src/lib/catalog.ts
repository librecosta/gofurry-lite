import 'server-only'
import data from '../../content/catalog/catalog.json'
import policy from '../../content/curation/publication.json'
import approved from '../../content/curation/site-categories.json'
import { categories, type CategoryCode } from './categories'

export type Locale = 'zh' | 'en'
export type Translation = { zh: string; en: string }
export type Copy = { title: Translation; description: Translation }
export type Site = Copy & { id: number; groups: number[]; logo?: string; url?: string; priority?: number }
export type Group = Copy & { id: number; members: number[] }
export type Game = Copy & {
  id: number
  appId: number
  cover?: string
  body?: Translation
  developers: string[]
  publishers: string[]
  platforms: string[]
  screenshots: string[]
  release?: string
  tags: { id: number; role: string }[]
}
export type Tag = { id: number; code: string; category: string; title: Translation }
export type Collection = Copy & { id: number; code: string; members: number[] }
export type Update = Copy & { id: number; date: string; version: string; commit: string; body: Translation }
type Catalog = { sites: Site[]; groups: Group[]; games: Game[]; tags: Tag[]; collections: Collection[]; updates: Update[]; featuredGames: number[] }

export const catalog: Catalog = data

const publicSiteIds = new Set(policy.siteIds)
const publicGameIds = new Set(policy.gameIds)
export const sites = catalog.sites.filter(({ id }) => publicSiteIds.has(id))
export const games = catalog.games.filter(({ id }) => publicGameIds.has(id))
export const siteById = new Map(sites.map((site) => [site.id, site]))
export const gameById = new Map(games.map((game) => [game.id, game]))
export const tagsById = new Map(catalog.tags.map((tag) => [tag.id, tag]))
const isCategory = (value: string): value is CategoryCode => categories.some(([code]) => code === value)
export const categoriesBySite: Partial<Record<string, { primary: CategoryCode; secondary: CategoryCode[] }>> =
  Object.fromEntries(Object.entries(approved).flatMap(([id, { primary, secondary }]) =>
    isCategory(primary) ? [[id, { primary, secondary: secondary.filter(isCategory) }]] : []))

export function localized(value: Translation, locale: Locale) {
  return value[locale] || value[locale === 'zh' ? 'en' : 'zh']
}

export function ordered<T extends Copy>(entries: T[], locale: Locale) {
  return [...entries].sort((first, next) => localized(first.title, locale).localeCompare(localized(next.title, locale), locale === 'zh' ? 'zh-CN' : 'en'))
}

export function steamCover(appId: number) {
  return 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/' + appId + '/header.jpg'
}
