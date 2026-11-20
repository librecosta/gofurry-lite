
import 'server-only'
import data from '../../content/catalog/catalog.json'
import policy from '../../content/curation/publication.json'
import ordinary from '../generated/directory.json'
import type { Collection, Directory, Game, Group, Site, Tag, Update, View } from './presentation'
import { inCategory } from './presentation'

export type { Locale } from './presentation'

type Catalog = { sites: Site[]; groups: Group[]; games: Game[]; tags: Tag[]; collections: Collection[]; updates: Update[]; featuredGames: number[] }
type FrozenCatalog = Omit<Catalog, 'sites' | 'games'> & {
  sites: (Omit<Site, 'rating'> & { rating: string })[]
  games: (Omit<Game, 'rating'> & { rating: string })[]
}

function rating(value: string) {
  if (value === 'sfw' || value === 'nsfw') return value
  throw new Error('Invalid frozen rating')
}

const frozen: FrozenCatalog = data
export const catalog: Catalog = {
  ...frozen,
  sites: frozen.sites.map((site) => ({ ...site, rating: rating(site.rating) })),
  games: frozen.games.map((game) => ({ ...game, rating: rating(game.rating) })),
}

const publicSiteIds = new Set(policy.siteIds)
const publicGameIds = new Set(policy.gameIds)
export const sites = catalog.sites.filter(({ id }) => publicSiteIds.has(id))
export const games = catalog.games.filter(({ id }) => publicGameIds.has(id))
export const siteById = new Map(sites.map((site) => [site.id, site]))
export const gameById = new Map(games.map((game) => [game.id, game]))
const adultTag = catalog.tags.find(({ code }) => code === 'adult')?.id

export function initialDetail(view: View): Site | Game | undefined {
  if (view.type === 'site') {
    const site = siteById.get(view.id)
    if (site?.rating === 'sfw') {
      const { id, title, description, rating, groups, logo, url } = site
      return { id, title, description, rating, groups, logo, url }
    }
  }
  if (view.type === 'game') {
    const game = gameById.get(view.id)
    if (game?.rating === 'sfw') return { ...game, tags: game.tags.filter(({ id }) => id !== adultTag) }
  }
}

// prepare.mjs validates the snapshot before projecting the default presentation data.
const directory = ordinary as Directory

export function initialDirectory(view: View): Directory {
  const result: Directory = { sites: [], games: [], groups: [], collections: [], tags: [] }
  switch (view.type) {
    case 'category':
      result.sites = directory.sites.filter((site) => inCategory(site, view.code))
      break
    case 'group':
      result.groups = directory.groups.filter((group) => group.id === view.id)
      result.sites = directory.sites.filter((site) => site.groups.includes(view.id))
      break
    case 'groups':
      result.groups = directory.groups
      break
    case 'site': {
      const site = directory.sites.find(({ id }) => id === view.id)
      if (site) {
        result.sites = directory.sites.filter((item) => item.id === view.id || inCategory(item, site.category.primary))
        result.groups = directory.groups.filter(({ id }) => site.groups.includes(id))
      }
      break
    }
    case 'games':
      result.games = directory.games
      result.tags = directory.tags
      result.collections = directory.collections.slice(0, 3)
      break
    case 'collections':
      result.collections = directory.collections
      result.games = directory.games.filter(({ id }) => directory.collections.some((item) => item.members[0] === id))
      break
    case 'collection':
      result.collections = directory.collections.filter((item) => item.code === view.code)
      result.games = directory.games.filter(({ id }) => result.collections[0]?.members.includes(id))
      result.tags = directory.tags.filter(({ id }) => result.games.some((game) => game.tags.some((tag) => tag.id === id)))
      break
    case 'game': {
      const game = directory.games.find(({ id }) => id === view.id)
      if (game) {
        result.collections = directory.collections.filter((item) => item.members.includes(game.id))
        result.tags = directory.tags.filter(({ id }) => game.tags.some((tag) => tag.id === id))
      }
      break
    }
  }
  return result
}
