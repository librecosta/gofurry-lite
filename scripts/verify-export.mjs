import { opendir, readFile, stat } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { resolve, sep } from 'node:path'
import { homeGameCount } from '../src/lib/home-games.ts'
import { categories } from '../src/lib/categories.ts'
import { categoryDescriptions, landingMetadata } from '../src/lib/seo-copy.ts'
import './check-security.mjs'

const read = (name) => readFile(new URL('../' + name, import.meta.url), 'utf8')
const [manifest, catalog, publication, translations] = await Promise.all([
  'src/generated/worker.json', 'content/catalog/catalog.json', 'content/curation/publication.json',
  'content/curation/game-body-zh.json',
].map(async (path) => JSON.parse(await read(path))))
const origin = 'https://go-furry.com'
const ogUrl = origin + '/media/brand/gofurry-lite-og.png'
const out = resolve('out')
const expected = new Set(manifest.pages)
const restricted = new Set(manifest.restrictedPaths)
const ordinary = new Set(manifest.pages.filter((path) => !restricted.has(path)))
const errors = ['404', 'zh/status/not-found', 'zh/status/gone', 'status/not-found', 'status/gone', '_not-found', '_global-error']
const englishPath = (path) => path.replace(/^\/zh(?=\/|$)/, '') || '/'
const chinesePath = (path) => path === '/' ? '/zh' : '/zh' + path
const bilingual = (paths) => new Set(paths.flatMap((path) => [path, chinesePath(path)]))
const details = [
  ...catalog.sites.map(({ id, rating }) => ['/site/' + id, rating]),
  ...catalog.games.map(({ id, rating }) => ['/games/' + id, rating]),
]
assert.equal(manifest.pages.length, expected.size)
assert.deepEqual(expected, bilingual([
  ...Object.keys(landingMetadata), ...categories.map(([code]) => '/categories/' + code),
  ...catalog.groups.map(({ id }) => '/site-groups/' + id), ...catalog.updates.map(({ id }) => '/updates/' + id),
  ...catalog.collections.map(({ code }) => '/games/collections/' + code), ...details.map(([path]) => path),
]))
assert.deepEqual(restricted, bilingual(details.filter(([, rating]) => rating === 'nsfw').map(([path]) => path)))
for (const path of bilingual([
  ...publication.deletedSites.map((id) => '/site/' + id), ...publication.deletedGames.map((id) => '/games/' + id),
])) assert(!expected.has(path), path)

const entities = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' }
const decode = (value) => value.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt);/gi, (_, entity) => {
  if (entity.startsWith('#x')) return String.fromCodePoint(parseInt(entity.slice(2), 16))
  if (entity.startsWith('#')) return String.fromCodePoint(Number(entity.slice(1)))
  return entities[entity]
})
const attrs = (tag) => Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)]
  .map(([, key, value]) => [key.toLowerCase(), decode(value)]))
const stripScripts = (html) => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
const localeLinks = (path) => ({ en: origin + path, 'zh-CN': origin + chinesePath(path), 'x-default': origin + path })
const hasBreadcrumb = (path) => /^\/(?:categories\/|site\/|games\/(?:\d+$|collections(?:\/|$))|site-groups(?:\/|$)|updates\/)/.test(path)
const schemaCounts = { WebSite: 0, BreadcrumbList: 0 }
const assetLinks = new Set()

function assertLinks(html, path, zh) {
  for (const tag of html.matchAll(/<a\b[^>]*>/g)) {
    const link = attrs(tag[0]).href
    if (!link || !/^(?:\/(?!\/)|https:\/\/go-furry\.com(?:\/|$))/.test(link)) continue
    const target = new URL(link, origin).pathname
    if (target.startsWith('/media/')) {
      assetLinks.add(target)
      continue
    }
    assert(expected.has(target), `${path} links to unknown ${link}`)
    const targetZh = target === '/zh' || target.startsWith('/zh/')
    if (targetZh !== zh) assert.equal(englishPath(target), englishPath(path), `${path} links across languages to ${link}`)
    assert(!restricted.has(target) || (restricted.has(path) && englishPath(target) === englishPath(path)),
      `${path} links to restricted ${link} in its default HTML`)
  }
}

function assertSchema(html, visibleHtml, path, localPath, lang, description) {
  const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  const type = restricted.has(path) ? null : localPath === '/' ? 'WebSite' : hasBreadcrumb(localPath) ? 'BreadcrumbList' : null
  assert.equal(scripts.length, type ? 1 : 0, `${path} structured data`)
  if (!type) return
  const schema = JSON.parse(scripts[0][1])
  assert.equal(schema['@context'], 'https://schema.org', path)
  assert.equal(schema['@type'], type, path)
  schemaCounts[type]++
  const canonical = origin + path
  if (type === 'WebSite') {
    assert.deepEqual(schema, {
      '@context': 'https://schema.org', '@type': type, name: 'GoFurry Lite',
      url: canonical, description, inLanguage: lang,
    }, path)
    return
  }
  const nav = visibleHtml.match(/<nav [^>]*aria-label="(?:Breadcrumb|面包屑导航)"[^>]*>([\s\S]*?)<\/nav>/)?.[1]
  assert(nav, `${path} visible breadcrumbs`)
  const crumbLinks = [...nav.matchAll(/<a href="([^"]+)">([^<]+)<\/a>/g)]
    .map(([, href, name]) => [origin + decode(href), decode(name)])
  const current = nav.match(/<span aria-current="page">([^<]+)<\/span>/)?.[1]
  assert(current, `${path} final breadcrumb`)
  const crumbs = [...crumbLinks, [canonical, decode(current)]]
  assert.deepEqual(schema.itemListElement, crumbs.map(([item, name], index) => ({
    '@type': 'ListItem', position: index + 1, name, item,
  })), path)
}

for (const path of expected) {
  const filename = path === '/' ? '/index.html' : path + '.html'
  const html = await read('out' + filename)
  const visibleHtml = stripScripts(html)
  const zh = path === '/zh' || path.startsWith('/zh/')
  const locale = zh ? 'zh' : 'en'
  const lang = zh ? 'zh-CN' : 'en'
  const localPath = englishPath(path)
  assert.match(visibleHtml, new RegExp('<html lang="' + lang + '"'), path)
  assert.equal([...visibleHtml.matchAll(/<h1[ >]/g)].length, 1, `${path} H1`)
  assertLinks(visibleHtml, path, zh)
  const head = visibleHtml.match(/<head>([\s\S]*?)<\/head>/)?.[1]
  assert(head, path)
  const titles = [...head.matchAll(/<title>([^<]+)<\/title>/g)]
  assert.equal(titles.length, 1, `${path} title`)
  const title = decode(titles[0][1])
  const meta = [...head.matchAll(/<meta\b[^>]*>/g)].map(([tag]) => attrs(tag))
  const getMeta = (key) => {
    const matches = meta.filter((tag) => (tag.name ?? tag.property) === key)
    assert(matches.length <= 1, `${path} duplicate ${key}`)
    return matches[0]?.content
  }
  const links = [...head.matchAll(/<link\b[^>]*>/g)].map(([tag]) => attrs(tag))
  const canonical = origin + path
  assert.deepEqual(links.filter(({ rel }) => rel === 'canonical').map(({ href }) => href), [canonical], path)
  assert.deepEqual(links.filter(({ rel }) => rel === 'alternate').map(({ hreflang, href }) => [hreflang, href]),
    Object.entries(localeLinks(localPath)), path)
  assert(links.some(({ rel, href }) => rel === 'icon' && href === '/media/brand/gofurry-favicon.png'), path)
  const description = getMeta('description')
  assert(title.trim() && description?.trim(), `${path} title and description`)
  const landing = landingMetadata[localPath]
  const category = categories.find(([code]) => localPath === '/categories/' + code)
  if (landing) {
    assert.equal(title, landing.title[locale], path)
    assert.equal(description, landing.description[locale], path)
  } else if (category) {
    assert.equal(title, `${category[zh ? 1 : 2]} — ${zh ? '兽圈网站导航' : 'Furry Websites'} | GoFurry Lite`, path)
    assert.equal(description, categoryDescriptions[category[0]][locale], path)
  }
  assert.equal(getMeta('keywords'), undefined, path)
  assert.equal(getMeta('robots'), restricted.has(path) ? 'noindex, nofollow' : undefined, path)
  if (restricted.has(path)) {
    assert.equal(title, zh ? 'NSFW 内容 · GoFurry Lite' : 'NSFW content · GoFurry Lite', path)
    assert.equal(description, zh ? '开启 NSFW 模式可查看这条历史资料。' : 'Enable NSFW mode to view this archived entry.', path)
  }
  for (const [key, value] of Object.entries({
    'og:title': title, 'og:description': description, 'og:url': canonical,
    'og:locale': zh ? 'zh_CN' : 'en_US', 'og:locale:alternate': zh ? 'en_US' : 'zh_CN',
    'og:image': ogUrl, 'og:image:width': '1200', 'og:image:height': '630',
    'twitter:card': 'summary_large_image', 'twitter:title': title,
    'twitter:description': description, 'twitter:image': ogUrl,
  })) assert.equal(getMeta(key), value, `${path} ${key}`)
  assertSchema(html, visibleHtml, path, localPath, lang, description)
  if (localPath === '/') {
    const cards = [...visibleHtml.matchAll(/href="((?:\/zh)?\/games\/\d+)"/g)].map(([, href]) => href)
    assert.equal(cards.length, homeGameCount, path)
    assert.equal(new Set(cards).size, homeGameCount, path)
    const guide = visibleHtml.match(/<section [^>]*aria-labelledby="home-guide"[^>]*>([\s\S]*?)<\/section>/)?.[1]
    assert(guide, path)
    assert.equal([...visibleHtml.matchAll(/\bid="home-guide"/g)].length, 1, path)
    const headings = [...guide.matchAll(/<h([1-6])\b/g)].map(([, level]) => Number(level))
    assert.equal(headings[0], 2, path)
    assert(headings.slice(1).every((level) => level === 3 || level === 4), path)
  }
}
for (const file of assetLinks) assert((await stat(resolve(out, '.' + file))).isFile(), file)

const trailerUrls = new Set(catalog.games.filter(({ rating }) => rating === 'nsfw').flatMap(({ movies }) =>
  movies?.flatMap(({ mp4, webm, hls }) => [mp4, webm, hls].filter(Boolean)) ?? []))
const restrictedPassages = catalog.games.filter(({ rating }) => rating === 'nsfw').flatMap(({ id, body }) =>
  [body.en, translations[id] ?? body.zh].flatMap((text) => {
    const passage = text.split('\n').map((line) => line.trim()).find((line) => line.length >= 52)
    return passage ? [passage.slice(0, 52)] : []
  }))
for (const game of catalog.games) {
  const translation = translations[game.id] ?? game.body.zh
  assert(translation.trim(), `No effective Chinese game body for ${game.id}`)
  if (game.rating === 'nsfw') {
    const detail = JSON.parse(await read(`out/indexes/extended/game/${game.id}.json`))
    assert.deepEqual(detail.body, { ...game.body, zh: translation }, `Restricted game ${game.id} body projection`)
  }
}
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const restrictedText = new RegExp([...trailerUrls, ...restrictedPassages].map(escapeRegex).join('|'))

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
      if (!relative.startsWith('indexes/extended/')) {
        assert(!/"rating"\s*:\s*"nsfw"/.test(data.replace(/\\"/g, '"')), relative)
        assert(!restrictedText.test(decode(data)), `Restricted description or trailer in ${relative}`)
      }
      checked++
    }
  }
}
await walk(out)
const map = await read('out/sitemap.xml')
const nodes = [...map.matchAll(/<url>([\s\S]*?)<\/url>/g)]
assert.equal(nodes.length, ordinary.size)
const urls = new Set()
for (const [, node] of nodes) {
  const location = node.match(/<loc>([^<]+)<\/loc>/)?.[1]
  assert(location?.startsWith(origin + '/'), location)
  assert(!urls.has(location), `Duplicate sitemap location ${location}`)
  urls.add(location)
  const alternates = [...node.matchAll(/<xhtml:link\b[^>]*\/>/g)].map(([tag]) => attrs(tag))
  assert.deepEqual(alternates.map(({ rel, hreflang, href }) => [rel, hreflang, href]),
    Object.entries(localeLinks(englishPath(location.slice(origin.length)))).map(([lang, href]) => ['alternate', lang, href]), location)
  assert(alternates.every(({ href }) => ordinary.has(href.slice(origin.length))), location)
}
assert.deepEqual(urls, new Set([...ordinary].map((path) => origin + path)))
assert(!map.includes('<lastmod>'), 'Do not emit unverified page modification dates')
const robots = (await read('out/robots.txt')).replace(/\r\n/g, '\n')
assert.match(robots, /^User-Agent: \*\nAllow: \/\n\nSitemap: https:\/\/go-furry\.com\/sitemap\.xml\n?$/i)
const llms = [...(await read('out/llms.txt')).matchAll(/\]\((https:\/\/[^)]+)\)/g)].map(([, url]) => url)
assert.deepEqual(new Set(llms), new Set([
  ...[...Object.keys(landingMetadata), '/zh', ...categories.map(([code]) => '/categories/' + code)].map((path) => origin + path),
  'https://gofurry.com', 'https://github.com/librecosta/gofurry-lite', 'https://github.com/librecosta/gofurry-lite/issues',
]))
for (const url of llms.filter((url) => url.startsWith(origin + '/'))) assert(ordinary.has(url.slice(origin.length)), url)
for (const file of ['status/gone.html', 'status/not-found.html', 'zh/status/gone.html', 'zh/status/not-found.html']) {
  assert((await stat(resolve(out, file))).isFile(), file)
  const html = await read('out/' + file)
  assert(html.includes('name="robots" content="noindex, nofollow"'), file)
  assert(!html.includes('type="application/ld+json"'), file)
}
const og = await readFile(resolve(out, 'media/brand/gofurry-lite-og.png'))
assert.equal(og.readUInt32BE(16), 1200)
assert.equal(og.readUInt32BE(20), 630)
console.log('Verified', ordinary.size, 'indexable HTML pages,', restricted.size, 'gated HTML pages,', schemaCounts, 'and', checked, 'text assets.')
