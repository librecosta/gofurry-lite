import manifest from '../src/generated/worker.json'

const pages = new Set(manifest.pages)
const restrictedPaths = new Set(manifest.restrictedPaths)
const deletedSites = new Set(manifest.deletedSites.map(String))
const deletedGames = new Set(manifest.deletedGames.map(String))

interface Bindings {
  ASSETS: { fetch(request: Request): Promise<Response> }
}

function redirect(url: URL, path: string) {
  url.pathname = path
  return Response.redirect(url.href, 301)
}

function fetchAsset(binding: Bindings['ASSETS'], request: Request, pathname: string) {
  const url = new URL(request.url)
  url.pathname = pathname
  return binding.fetch(new Request(url, request))
}

function routeLegacy(path: string) {
  if (['/home', '/nav', '/sites'].includes(path)) return '/'
  if (path === '/games/search') return '/games'
  const oldSite = path.match(/^\/sites\/([1-9]\d*)$/)
    ?? path.match(/^\/site\/([1-9]\d*)\/[^/]+$/)
  return oldSite ? '/site/' + oldSite[1] : path
}

function retired(path: string) {
  if (['/insights', '/games/prize', '/games/prize/activation', '/about/faolan'].includes(path)) return true
  if (path.startsWith('/insights/')) return true
  const site = path.match(/^\/site\/([1-9]\d*)$/)
  const game = path.match(/^\/games\/([1-9]\d*)$/)
  return Boolean((site && deletedSites.has(site[1])) || (game && deletedGames.has(game[1])))
}

export default {
  async fetch(request: Request, env: Bindings): Promise<Response> {
    const url = new URL(request.url)
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response(null, { status: 405, headers: { allow: 'GET, HEAD' } })
    }
    const rawPath = url.pathname
    if (url.hostname === 'www.go-furry.com') {
      url.hostname = 'go-furry.com'
      url.protocol = 'https:'
      url.port = ''
    }
    const isWww = url.hostname !== new URL(request.url).hostname
    const path = rawPath.replace(/\/+$/, '') || '/'
    const en = path === '/en' || path.startsWith('/en/')
    const prefix = en ? '/en' : ''
    const localPath = path.slice(prefix.length) || '/'
    const target = routeLegacy(localPath)
    const canonical = prefix + (target === '/' && en ? '' : target)

    if (path === '/favicon.ico' || path === '/favicon.svg') return redirect(url, '/media/brand/gofurry-favicon.png')
    if (path === '/healthz') {
      if (isWww || path !== rawPath) return redirect(url, path)
      return new Response(request.method === 'GET' ? 'ok\n' : null, {
        headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
      })
    }
    if (pages.has(canonical)) {
      if (isWww || canonical !== rawPath) return redirect(url, canonical)
      const asset = canonical === '/' ? '/index.html' : canonical + '.html'
      const response = await fetchAsset(env.ASSETS, request, asset)
      return restrictedPaths.has(canonical) ? noindex(response) : response
    }
    if (localPath === '/410' || retired(target)) return error(410)
    // HTML pages are available only through the publication manifest.
    if (/^\/(?:_next|media|indexes)\//.test(rawPath) || ['/robots.txt', '/sitemap.xml'].includes(rawPath)) {
      if (isWww) return redirect(url, rawPath)
      const asset = await env.ASSETS.fetch(request)
      if (asset.status !== 404) return rawPath.startsWith('/indexes/extended/') ? noindex(asset) : asset
    }
    return error(404)

    async function error(status: 404 | 410) {
      const asset = await fetchAsset(env.ASSETS, request, prefix + '/status/' + (status === 410 ? 'gone' : 'not-found') + '.html')
      return new Response(asset.ok ? asset.body : null, {
        status,
        headers: { 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'noindex', 'cache-control': 'no-store' },
      })
    }
  },
} satisfies { fetch(request: Request, env: Bindings): Promise<Response> }

function noindex(response: Response) {
  const headers = new Headers(response.headers)
  headers.set('x-robots-tag', 'noindex')
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}
