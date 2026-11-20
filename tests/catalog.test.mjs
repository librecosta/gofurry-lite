import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const read = (path) => JSON.parse(readFileSync(new URL('../' + path, import.meta.url)))
const catalog = read('content/catalog/catalog.json')
const publication = read('content/curation/publication.json')
const categories = read('content/curation/site-categories.json')
const manifest = read('src/generated/worker.json')

test('separate publication and classification govern which historical routes are exported', () => {
  assert.equal(Object.keys(categories).length, 140)
  const publicSites = new Set(publication.siteIds)
  assert(publication.siteIds.some((id) => !categories[id]))
  assert([156, 157, 158, 159, 306].every((id) => !publicSites.has(id)))
  assert(publication.deletedSites.every((id) => !manifest.pages.includes('/site/' + id)))
  assert.equal(manifest.pages.filter((path) => /^\/site\/[0-9]+$/.test(path)).length, 192)
  assert.equal(manifest.pages.filter((path) => /^\/games\/[0-9]+$/.test(path)).length, 198)
  assert.equal(catalog.groups.length, 12)
  assert.equal(catalog.collections.length, 16)
  assert.equal(catalog.updates.length, 31)
})

test('locale indexes contain exactly the approved public records', () => {
  for (const language of ['zh', 'en']) {
    for (const [content, allowed] of [['sites', publication.siteIds], ['games', publication.gameIds]]) {
      const index = read('public/indexes/' + content + '-' + language + '.json')
      assert.deepEqual(index.map(([id]) => id), allowed)
      assert(index.every((row) => typeof row[1] === 'string' && row[1]))
    }
  }
})
