import { opendir, readFile, stat } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { resolve, sep } from 'node:path'

const read = (name) => readFile(new URL('../' + name, import.meta.url), 'utf8')
const manifest = JSON.parse(await read('src/generated/worker.json'))
const out = resolve('out')
const expected = new Set(manifest.pages)
const errors = ['404', 'en/status/not-found', 'en/status/gone', 'status/not-found', 'status/gone', '_not-found', '_global-error']
for (const path of expected) {
  const filename = path === '/' ? '/index.html' : path + '.html'
  const html = await read('out' + filename)
  const locale = path === '/en' || path.startsWith('/en/') ? 'en' : 'zh-CN'
  assert(html.includes('lang="' + locale + '"'), path)
  assert.match(html, /<h1[ >]/, path)
  assert(html.includes('rel="canonical" href="https://go-furry.com' + path + '"'), path)
  assert(html.includes('hrefLang="zh-CN"') && html.includes('hrefLang="en"'), path)
  assert(html.includes('property="og:title"'), path)
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
assert.equal(urls.length, expected.size)
assert(urls.every((url) => expected.has(url.slice('https://go-furry.com'.length))))
for (const file of ['robots.txt', 'status/gone.html', 'status/not-found.html', 'en/status/gone.html', 'en/status/not-found.html']) {
  assert((await stat(resolve(out, file))).isFile(), file)
}
console.log('Verified', expected.size, 'bilingual HTML pages and', checked, 'text assets.')
