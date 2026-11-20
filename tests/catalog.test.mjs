
import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const read = (path) => JSON.parse(readFileSync(new URL('../' + path, import.meta.url)))
const catalog = read('content/catalog/catalog.json')
const publication = read('content/curation/publication.json')
const categories = read('content/curation/site-categories.json')
const manifest = read('src/generated/worker.json')
const ordinary = read('src/generated/directory.json')
const complete = read('public/indexes/extended/directory.json')

test('all frozen active IDs are represented with their independent publication modes', () => {
  assert.equal(Object.keys(categories).length, 225)
  assert.deepEqual(catalog.sites.map(({ id }) => id), publication.siteIds)
  assert.deepEqual(catalog.games.map(({ id }) => id), publication.gameIds)
  assert(catalog.sites.every(({ id }) => categories[id]))
  assert([156, 157, 158, 159, 306].every((id) => ordinary.sites.some((site) => site.id === id)))
  const adult = catalog.tags.find(({ code }) => code === 'adult').id
  for (const id of [101, 149, 310, 311, 312]) {
    assert(catalog.games.find((game) => game.id === id).tags.some((tag) => tag.id === adult))
    assert(ordinary.games.some((game) => game.id === id && game.tags.every((tag) => tag.id !== adult)))
  }
  assert(publication.deletedSites.every((id) => !manifest.pages.includes('/site/' + id)))
  assert(publication.deletedGames.every((id) => !manifest.pages.includes('/games/' + id)))
  assert.equal(manifest.pages.filter((path) => /^\/site\/[0-9]+$/.test(path)).length, 225)
  assert.equal(manifest.pages.filter((path) => /^\/games\/[0-9]+$/.test(path)).length, 261)
  assert.equal(manifest.restrictedPaths.length, 172)
  assert.equal(catalog.groups.length, 12)
  assert.equal(catalog.collections.length, 16)
  assert.equal(catalog.updates.length, 31)
})

test('locale indexes match the two catalogue projections and keep historical evidence out of public payloads', () => {
  for (const language of ['zh', 'en']) {
    for (const [kind, expectedCount, fullCount] of [['sites', 197, 225], ['games', 203, 261]]) {
      const name = kind + '-' + language + '.json'
      const defaultIndex = read('public/indexes/' + name)
      const extendedIndex = read('public/indexes/extended/' + name)
      assert.equal(defaultIndex.length, expectedCount)
      assert.equal(extendedIndex.length, fullCount)
      assert.deepEqual(defaultIndex.map(([id]) => id), ordinary[kind].map(({ id }) => id))
      assert.deepEqual(extendedIndex.map(([id]) => id), complete[kind].map(({ id }) => id))
      assert([...defaultIndex, ...extendedIndex].every((row) => typeof row[1] === 'string' && row[1]))
    }
  }
  assert(!complete.sites.some((row) => 'legacyNsfw' in row))
  const archivedSiteUrls = new Map(catalog.sites.map(({ id, url }) => [id, url]))
  for (const directory of [ordinary, complete]) {
    assert(directory.sites.every(({ id, url }) => url === archivedSiteUrls.get(id)))
  }
  for (const [path, kind, id] of manifest.restrictedPaths.map((path) => path.match(/^\/(site|games)\/(\d+)$/)).filter(Boolean)) {
    const detail = read('public/indexes/extended/' + (kind === 'games' ? 'game' : kind) + '/' + id + '.json')
    assert.equal(detail.id, Number(id), path)
    assert.equal(detail.rating, 'nsfw', path)
    assert(!('legacyNsfw' in detail), path)
  }
})

test('collections preserve all 524 relationships and default membership is filtered by effective rating', () => {
  const games = new Set(ordinary.games.map(({ id }) => id))
  assert.equal(complete.collections.reduce((count, item) => count + item.members.length, 0), 524)
  assert.deepEqual(complete.collections, catalog.collections)
  for (const full of complete.collections) {
    assert.deepEqual(ordinary.collections.find(({ id }) => id === full.id).members,
      full.members.filter((id) => games.has(id)))
  }
})
