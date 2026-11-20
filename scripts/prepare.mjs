import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { gameCardLabels, homeGameCount } from '../src/lib/home-games.ts'

const root = new URL('../', import.meta.url)
const file = (path) => new URL(path, root)
const json = async (path) => JSON.parse(await readFile(file(path), 'utf8'))

const [catalog, approved, publication, ratings, links] = await Promise.all([
  json('content/catalog/catalog.json'), json('content/curation/site-categories.json'),
  json('content/curation/publication.json'), json('content/curation/content-ratings.json'), json('content/curation/site-link-review.json'),
])
const codes = ['community', 'gallery', 'literature', 'resources', 'marketplace', 'knowledge', 'gaming', 'events']
const counts = { sites: 225, games: 261, groups: 12, tags: 214, collections: 16, updates: 31 }

for (const [kind, count] of Object.entries(counts)) {
  const ids = catalog[kind].map(({ id }) => id)
  assert.equal(new Set(ids).size, count, kind)
  assert.equal(ids.length, count, kind)
  assert(ids.every((id) => Number.isSafeInteger(id) && id > 0), kind)
}

function eligible(entries, allowed) {
  const ids = new Set(allowed)
  assert.equal(ids.size, allowed.length)
  assert.equal(entries.length, allowed.length)
  assert(entries.every(({ id }) => ids.has(id)))
  return ids
}

const siteIds = eligible(catalog.sites, publication.siteIds)
const gameIds = eligible(catalog.games, publication.gameIds)
const tagIds = new Map(catalog.tags.map((tag) => [tag.id, tag]))
const adultTag = catalog.tags.find(({ code }) => code === 'adult').id
const linked = new Set([...links.verifiedSnapshotIds, ...Object.keys(links.verifiedOverrides).map(Number)])
assert.equal(linked.size, links.verifiedSnapshotIds.length + Object.keys(links.verifiedOverrides).length)
assert([...linked].every((id) => siteIds.has(id)))
const groupsById = new Map(catalog.groups.map((group) => [group.id, group]))

assert.equal(Object.keys(approved).length, siteIds.size)
for (const [id, { primary, secondary }] of Object.entries(approved)) {
  assert(siteIds.has(Number(id)) && String(Number(id)) === id)
  assert(codes.includes(primary) && Array.isArray(secondary) && secondary.length <= 2)
  assert(new Set(secondary).size === secondary.length && secondary.every((code) => code !== primary && codes.includes(code)))
}
assert(Object.entries(ratings.sites).every(([id, rating]) => siteIds.has(Number(id)) && rating === 'sfw'))
assert(Object.entries(ratings.games).every(([id, rating]) => gameIds.has(Number(id)) && rating === 'sfw'))
assert.equal(new Set(publication.deletedSites).size, 22)
assert(publication.deletedSites.every((id) => !siteIds.has(id)))
assert.deepEqual(publication.deletedGames, [355])
assert(publication.deletedGames.every((id) => !gameIds.has(id)))
assert(catalog.featuredGames.every((id) => gameIds.has(id)))
assert.equal(new Set(catalog.collections.map(({ code }) => code)).size, 16)

for (const site of catalog.sites) {
  assert(site.title.zh || site.title.en, site.id)
  assert(site.legacyNsfw === 0 || site.legacyNsfw === 1)
  assert.equal(site.rating, ratings.sites[site.id] ?? (site.legacyNsfw === 1 ? 'nsfw' : 'sfw'))
  assert.equal(Boolean(site.url), linked.has(site.id))
  const groups = new Set(site.groups)
  assert.equal(groups.size, site.groups.length)
  assert([...groups].every((id) => groupsById.get(id)?.members.includes(site.id)))
  if (site.logo) {
    assert.match(site.logo, /^\/media\/site\/[a-f0-9]{64}\.webp$/)
    const asset = await readFile(file('public' + site.logo))
    assert.equal(asset.subarray(8, 12).toString(), 'WEBP')
  }
  if (site.url) {
    const url = new URL(site.url)
    assert(url.protocol === 'https:' && !url.username && !url.password && !url.port && !url.hash)
    if (links.verifiedOverrides[site.id]) assert.equal(site.url, links.verifiedOverrides[site.id].url)
  }
}

const referencedLogos = new Set(catalog.sites.flatMap((site) => site.logo ? [site.logo.split('/').at(-1)] : []))
const logoFiles = await readdir(file('public/media/site/'))
assert.equal(logoFiles.length, referencedLogos.size, 'only public logo files may be bundled')
assert(logoFiles.every((asset) => referencedLogos.has(asset)))
const sitesById = new Map(catalog.sites.map((site) => [site.id, site]))
for (const group of catalog.groups) {
  assert.equal(new Set(group.members).size, group.members.length)
  assert(group.members.every((id) => sitesById.get(id)?.groups.includes(group.id)))
}
for (const game of catalog.games) {
  assert(game.title.zh || game.title.en, game.id)
  assert(Number.isSafeInteger(game.appId) && game.appId > 0)
  assert.equal(new Set(game.tags.map((tag) => tag.id)).size, game.tags.length)
  assert(game.tags.every((tag) => tagIds.has(tag.id) && ['primary', 'secondary', 'normal'].includes(tag.role)))
  const legacyAdult = game.tags.some(({ id }) => id === adultTag)
  if (ratings.games[game.id]) assert(legacyAdult, game.id)
  assert.equal(game.rating, ratings.games[game.id] ?? (legacyAdult ? 'nsfw' : 'sfw'))
  assert(game.screenshots.length <= 6)
  for (const address of [game.cover, ...game.screenshots].filter(Boolean)) {
    const url = new URL(address)
    assert(url.protocol === 'https:' && url.hostname.endsWith('.steamstatic.com'))
    assert.match(url.pathname, new RegExp('/steam/apps/' + game.appId + '/'))
  }
}
assert.equal(catalog.sites.filter((site) => site.legacyNsfw === 1).length, 28)
assert.equal(catalog.games.filter((game) => game.tags.some(({ id }) => id === adultTag)).length, 63)
assert.equal(catalog.games.reduce((total, game) => total + game.tags.length, 0), 5053)
assert.equal(catalog.collections.reduce((total, item) => total + item.members.length, 0), 524)
for (const collection of catalog.collections) {
  assert.match(collection.code, /^[a-z0-9-]+$/)
  assert.equal(new Set(collection.members).size, collection.members.length)
  assert(collection.members.every((id) => gameIds.has(id)))
}
for (const update of catalog.updates) {
  assert(update.title.zh || update.title.en)
  assert(update.body.zh || update.body.en)
  assert(Date.parse(update.date) <= Date.parse('2026-11-15T17:33:22+08:00'))
}

const ordinarySites = catalog.sites.filter(({ rating }) => rating === 'sfw')
const ordinaryGames = catalog.games.filter(({ rating }) => rating === 'sfw')
assert.equal(ordinarySites.length, 197)
assert.equal(ordinaryGames.length, 203)
const pathZh = (path) => path === '/' ? '/zh' : '/zh' + path
const bilingual = (paths) => [...paths, ...paths.map(pathZh)]
const directoryPaths = [
  '/', '/games', '/games/collections', '/updates', '/about', '/privacy', '/terms', '/site-groups',
  ...codes.map((code) => '/categories/' + code),
  ...catalog.groups.map(({ id }) => '/site-groups/' + id),
  ...catalog.collections.map(({ code }) => '/games/collections/' + code),
  ...catalog.updates.map(({ id }) => '/updates/' + id),
]
const ordinaryPaths = bilingual([
  ...directoryPaths,
  ...ordinarySites.map(({ id }) => '/site/' + id),
  ...ordinaryGames.map(({ id }) => '/games/' + id),
])
const restrictedPaths = bilingual([
  ...catalog.sites.filter(({ rating }) => rating === 'nsfw').map(({ id }) => '/site/' + id),
  ...catalog.games.filter(({ rating }) => rating === 'nsfw').map(({ id }) => '/games/' + id),
])
const pages = [...ordinaryPaths, ...restrictedPaths]
assert.equal(new Set(pages).size, pages.length)
await mkdir(file('src/generated/'), { recursive: true })
const writeJson = (path, value) => writeFile(file(path), JSON.stringify(value) + '\n')
await writeJson('src/generated/worker.json', {
  pages, restrictedPaths, deletedSites: publication.deletedSites, deletedGames: publication.deletedGames,
})

function visibleTags(game) {
  return game.tags.filter(({ id }) => game.rating === 'nsfw' || id !== adultTag)
}

function directory(sites, games) {
  const allowedSites = new Set(sites.map(({ id }) => id))
  const allowedGames = new Set(games.map(({ id }) => id))
  const tags = new Set(games.flatMap((game) => visibleTags(game).map(({ id }) => id)))
  return {
    sites: sites.map(({ id, title, description, rating, groups, logo, url }) => ({
      id, title, description, rating, groups, logo, url, category: approved[id],
    })),
    games: games.map(({ id, title, description, rating, appId, cover, tags }) => ({
      id, title, description, rating, appId, cover, tags: visibleTags({ rating, tags }),
    })),
    groups: catalog.groups.map(({ members, ...group }) => ({ ...group, members: members.filter((id) => allowedSites.has(id)) })),
    collections: catalog.collections.map(({ members, ...item }) => ({ ...item, members: members.filter((id) => allowedGames.has(id)) })),
    tags: catalog.tags.filter(({ id }) => tags.has(id)),
  }
}

function indexRow(entry, locale) {
  const alternate = locale === 'zh' ? 'en' : 'zh'
  const tags = entry.tags ? visibleTags(entry).map(({ id }) => id) : []
  const terms = [
    entry.title[locale], entry.title[alternate],
    entry.description[locale].slice(0, 440), entry.description[alternate].slice(0, 440),
    ...tags.flatMap((id) => [tagIds.get(id).title.zh, tagIds.get(id).title.en]),
  ]
  const text = terms.join(' ').normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, ' ').trim()
  return [entry.id, text, ...tags]
}

const extended = 'public/indexes/extended/'
await Promise.all(['site', 'game'].map((kind) => mkdir(file(extended + kind + '/'), { recursive: true })))
const ordinaryDirectory = directory(ordinarySites, ordinaryGames)
const extendedDirectory = directory(catalog.sites, catalog.games)
await writeJson('src/generated/directory.json', ordinaryDirectory)
await writeJson(extended + 'directory.json', extendedDirectory)

function projectGameCards(games) {
  return games.map((game) => {
    const { id, title, rating, appId, cover } = game
    const labels = gameCardLabels(game, (tagId) => tagIds.get(tagId))
    return { id, title, rating, appId, cover, labels }
  })
}

const ordinaryCards = projectGameCards(ordinaryDirectory.games)
const cardsById = new Map(ordinaryCards.map((game) => [game.id, game]))
const featured = [...new Set(catalog.featuredGames)].flatMap((id) => cardsById.get(id) ?? [])
const featuredIds = new Set(featured.map(({ id }) => id))
const initialCards = [...featured, ...ordinaryCards.filter(({ id }) => !featuredIds.has(id))].slice(0, homeGameCount)
assert.equal(initialCards.length, homeGameCount)
await writeJson('src/generated/home.json', { sites: ordinaryDirectory.sites, games: initialCards })
await writeJson('public/indexes/home-games.json', ordinaryCards)
await writeJson(extended + 'home-directory.json', {
  sites: extendedDirectory.sites, games: projectGameCards(extendedDirectory.games),
})

for (const [kind, entries] of [['site', catalog.sites], ['game', catalog.games]]) {
  const path = extended + kind + '/'
  const details = new Set()
  for (const entry of entries.filter(({ rating }) => rating === 'nsfw')) {
    // Public detail payloads carry rendered fields only, never the historical site rating evidence.
    const { legacyNsfw: _legacyNsfw, ...detail } = entry
    void _legacyNsfw
    const filename = entry.id + '.json'
    details.add(filename)
    await writeJson(path + filename, detail)
  }
  for (const filename of await readdir(file(path))) {
    if (/^[1-9]\d*\.json$/.test(filename) && !details.has(filename)) await unlink(file(path + filename))
  }
}
for (const locale of ['zh', 'en']) {
  for (const [kind, ordinary] of [['sites', ordinarySites], ['games', ordinaryGames]]) {
    const filename = kind + '-' + locale + '.json'
    await writeJson('public/indexes/' + filename, ordinary.map((entry) => indexRow(entry, locale)))
    await writeJson(extended + filename, catalog[kind].map((entry) => indexRow(entry, locale)))
  }
}
console.log('Prepared', ordinaryPaths.length, 'indexable pages and', restrictedPaths.length, 'mode-gated pages.')
