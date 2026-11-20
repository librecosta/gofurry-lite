import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'

const root = new URL('../', import.meta.url)
const file = (path) => new URL(path, root)
const json = async (path) => JSON.parse(await readFile(file(path), 'utf8'))

const [catalog, approved, publication] = await Promise.all([
  json('content/catalog/catalog.json'), json('content/curation/site-categories.json'),
  json('content/curation/publication.json'),
])
const codes = ['community', 'gallery', 'literature', 'resources', 'marketplace', 'knowledge', 'gaming', 'events']
const conflicts = [156, 157, 158, 159, 306]
const counts = { sites: 192, games: 198, groups: 12, tags: 214, collections: 16, updates: 31 }

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
const tagIds = new Map(catalog.tags.map(({ id, code, title }) => [id, { code, title }]))
const groupsById = new Map(catalog.groups.map((group) => [group.id, group]))

assert.equal(Object.keys(approved).length, 140)
for (const { primary, secondary } of Object.values(approved)) {
  assert(codes.includes(primary) && Array.isArray(secondary) && secondary.length === 0)
}
assert.equal(new Set(publication.deletedSites).size, 22)
assert([...publication.deletedSites, ...conflicts].every((id) => !siteIds.has(id)))
assert(catalog.featuredGames.every((id) => gameIds.has(id)))
assert.equal(new Set(catalog.collections.map(({ code }) => code)).size, 16)

for (const site of catalog.sites) {
  assert(site.title.zh || site.title.en, site.id)
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
    assert(url.protocol === 'https:' && !url.username && !url.password)
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
  assert(game.tags.every((tag) => tagIds.has(tag.id) && tagIds.get(tag.id).code !== 'adult'))
  assert(game.screenshots.length <= 6)
  for (const address of [game.cover, ...game.screenshots].filter(Boolean)) {
    const url = new URL(address)
    assert(url.protocol === 'https:' && url.hostname.endsWith('.steamstatic.com'))
    assert.match(url.pathname, new RegExp('/steam/apps/' + game.appId + '/'))
  }
}
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

const paths = [
  '/', '/games', '/games/collections', '/updates', '/about', '/privacy', '/terms', '/site-groups',
  ...codes.map((code) => '/categories/' + code),
  ...catalog.sites.map(({ id }) => '/site/' + id),
  ...catalog.groups.map(({ id }) => '/site-groups/' + id),
  ...catalog.games.map(({ id }) => '/games/' + id),
  ...catalog.collections.map(({ code }) => '/games/collections/' + code),
  ...catalog.updates.map(({ id }) => '/updates/' + id),
]
assert.equal(new Set(paths).size, paths.length)
const pathEn = (path) => path === '/' ? '/en' : '/en' + path
await mkdir(file('src/generated/'), { recursive: true })
await writeFile(file('src/generated/worker.json'), JSON.stringify({
  pages: [...paths, ...paths.map(pathEn)], deletedSites: publication.deletedSites,
}) + '\n')

function indexRow(entry, locale) {
  const tags = (entry.tags ?? []).map(({ id }) => id)
  const terms = [
    entry.title[locale], entry.title[locale === 'zh' ? 'en' : 'zh'],
    (entry.description[locale] || entry.description[locale === 'zh' ? 'en' : 'zh']).slice(0, 440),
    ...tags.flatMap((id) => [tagIds.get(id).title.zh, tagIds.get(id).title.en]),
  ]
  const text = terms.join(' ').normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, ' ').trim()
  return [entry.id, text, ...tags]
}
await mkdir(file('public/indexes/'), { recursive: true })
for (const locale of ['zh', 'en']) {
  for (const kind of ['sites', 'games']) {
    await writeFile(file('public/indexes/' + kind + '-' + locale + '.json'),
      JSON.stringify(catalog[kind].map((entry) => indexRow(entry, locale))) + '\n')
  }
}
console.log('Prepared', paths.length * 2, 'public paths and four filtered search indexes.')
