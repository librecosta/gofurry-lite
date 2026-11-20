import { opendir, readFile, stat } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { resolve, sep } from 'node:path'

const read = (name) => readFile(new URL('../' + name, import.meta.url), 'utf8')
const manifest = JSON.parse(await read('src/generated/worker.json'))
const out = resolve('out')
const expected = new Set(manifest.pages)
const restricted = new Set(manifest.restrictedPaths)
const ordinary = new Set(manifest.pages.filter((path) => !restricted.has(path)))
const errors = ['404', 'zh/status/not-found', 'zh/status/gone', 'status/not-found', 'status/gone', '_not-found', '_global-error']
for (const path of expected) {
  const filename = path === '/' ? '/index.html' : path + '.html'
  const html = await read('out' + filename)
  const zh = path === '/zh' || path.startsWith('/zh/')
  const localPath = path.replace(/^\/zh(?=\/|$)/, '') || '/'
  const zhPath = '/zh' + (localPath === '/' ? '' : localPath)
  assert.match(html, new RegExp('<html lang="' + (zh ? 'zh-CN' : 'en') + '"'), path)
  assert.match(html, /<h1[ >]/, path)
  assert(html.includes('rel="canonical" href="https://go-furry.com' + path + '"'), path)
  for (const [language, target] of [['en', localPath], ['zh-CN', zhPath], ['x-default', localPath]]) {
    assert(html.includes('hrefLang="' + language + '" href="https://go-furry.com' + target + '"'), path)
  }
  assert(html.includes('property="og:title"'), path)
  assert(html.includes('https://go-furry.com/media/brand/gofurry-lite-og.png'), path)
  assert(html.includes('name="twitter:card" content="summary_large_image"'), path)
  assert.equal(html.includes('name="robots" content="noindex, nofollow"'), restricted.has(path), path)
  if (localPath === '/' || /^(?:\/categories\/|\/site-groups(?:\/|$)|\/games(?:$|\/collections(?:\/|$)))/.test(localPath)) {
    for (const [, link] of html.matchAll(/href="((?:\/zh)?\/(?:site|games)\/\d+)"/g)) {
      assert(!restricted.has(link), path + ' lists ' + link)
    }
  }
}

let checked = 0
async function walk(directory) {
  for await (const entry of await opendir(directory)) {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) {
      await walk(path)
      continue
    }
    const relative = path.slice(out.length + 1).split(sep).join('/')
    assert(!/(^|\/)(?:\.local|globals\.sql|SHA256SUMS|candidates\.ndjson|[^/]+\.(?:dump|zst))$/i.test(relative), relative)
    if (relative.endsWith('.html')) {
      const canonical = relative === 'index.html' ? '/' : '/' + relative.slice(0, -5)
      assert(expected.has(canonical) || errors.includes(canonical.slice(1)), canonical)
    }
    if (/\.(?:html|json|txt|js|xml)$/i.test(relative)) {
      const data = await readFile(path, 'utf8')
      assert(!/(?:postgres(?:ql)?|redis):\/\/[^\s<]*:[^\s<]*@|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|postgresql:\/\/[a-z0-9_]+:\S+@/i.test(data), relative)
      checked++
    }
  }
}
await walk(out)
const map = await read('out/sitemap.xml')
const urls = [...map.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
assert.equal(new Set(urls).size, ordinary.size)
assert.equal(urls.length, ordinary.size)
assert(urls.every((url) => ordinary.has(url.slice('https://go-furry.com'.length))))
for (const file of ['robots.txt', 'status/gone.html', 'status/not-found.html', 'zh/status/gone.html', 'zh/status/not-found.html']) {
  assert((await stat(resolve(out, file))).isFile(), file)
}
const og = await readFile(resolve(out, 'media/brand/gofurry-lite-og.png'))
assert.equal(og.readUInt32BE(16), 1200)
assert.equal(og.readUInt32BE(20), 630)
console.log('Verified', ordinary.size, 'indexable HTML pages,', restricted.size, 'gated HTML pages and', checked, 'text assets.')
