import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

const catalog = JSON.parse(readFileSync(new URL('../content/catalog/catalog.json', import.meta.url), 'utf8')) as typeof import('../content/catalog/catalog.json')

const lastRelease = catalog.updates[0].id

test('bilingual static HTML, canonical links, sitemap and ordinary search indexes', async ({ request }) => {
  for (const [path, language] of [
    ['/', 'zh-CN'], ['/en', 'en'], ['/site/105', 'zh-CN'], ['/en/site/105', 'en'],
    ['/games/102', 'zh-CN'], ['/en/games/102', 'en'], ['/site-groups/100', 'zh-CN'],
    ['/en/categories/community', 'en'], ['/games/collections', 'zh-CN'],
    ['/en/games/collections/open-world', 'en'], ['/updates/' + lastRelease, 'zh-CN'],
    ['/en/updates/' + lastRelease, 'en'], ['/en/about', 'en'], ['/privacy', 'zh-CN'], ['/en/terms', 'en'],
  ]) {
    const response = await request.get(path, { maxRedirects: 0 })
    expect(response.status(), path).toBe(200)
    const body = await response.text()
    expect(body).toContain('<html lang="' + language + '"')
    expect(body).toMatch(/<h1[ >]/)
    expect(body).toContain('rel="canonical" href="https://go-furry.com' + path + '"')
    expect(body).toContain('property="og:title"')
    expect(body).toMatch(/hreflang="en"/i)
  }
  expect(await (await request.get('/robots.txt')).text()).toContain('https://go-furry.com/sitemap.xml')
  const sitemap = await (await request.get('/sitemap.xml')).text()
  expect(sitemap).toContain('https://go-furry.com/en/site/105')
  expect(sitemap).not.toContain('https://go-furry.com/site/156')
  const ordinary = await (await request.get('/indexes/sites-en.json')).json() as unknown[][]
  expect(ordinary.length).toBe(192)
  expect(ordinary.some(([id]) => id === 156 || id === 101)).toBe(false)
  expect((await (await request.get('/indexes/games-zh.json')).json()).length).toBe(198)
})

test('Workers return historical redirects, 404, 410, and HEAD', async ({ request }) => {
  for (const [path, target] of [
    ['/home', '/'], ['/nav', '/'], ['/sites', '/'], ['/sites/105', '/site/105'],
    ['/site/105/old.example', '/site/105'], ['/en/sites/105?a=b', '/en/site/105?a=b'],
    ['/games/search', '/games'], ['/en/games/search', '/en/games'], ['/en/games/102/', '/en/games/102'],
  ]) {
    const response = await request.get(path, { maxRedirects: 0 })
    expect(response.status(), path).toBe(301)
    expect(response.headers().location).toBe('http://127.0.0.1:8787' + target)
  }
  for (const path of ['/site/999999', '/en/sites/183', '/games/999999', '/site/156', '/site/101', '/site/105.html', '/gfn.dump', '/.local/l1-c2-a/candidates.ndjson']) {
    const response = await request.get(path, { maxRedirects: 0 })
    expect(response.status(), path).toBe(404)
    expect(response.headers()['x-robots-tag']).toBe('noindex')
  }
  for (const path of ['/insights', '/en/insights/stats', '/site/142', '/en/games/prize/activation', '/games/prize', '/about/faolan']) {
    const response = await request.get(path, { maxRedirects: 0 })
    expect(response.status(), path).toBe(410)
    expect(await response.text()).toContain('410')
  }
  const www = await request.get('/en/games/102?from=legacy', {
    headers: { host: 'www.go-furry.com' }, maxRedirects: 0,
  })
  expect(www.status()).toBe(301)
  expect(www.headers().location).toBe('https://go-furry.com/en/games/102?from=legacy')
  expect(await (await request.head('/games/102')).text()).toBe('')
  expect((await request.post('/')).status()).toBe(405)
  expect((await request.get('/media/brand/logo.svg')).status()).toBe(200)
})

test('search, game category and species filters, and locale continuity', async ({ page }) => {
  await page.route('https://**/*.jpg', (route) => route.abort())
  await page.goto('/en')
  const input = page.getByRole('searchbox')
  await input.fill('wilddream')
  await expect(page.getByRole('status')).toHaveText('1 result')
  await page.locator('[data-results="sites"] a').filter({ visible: true }).first().click()
  await expect(page).toHaveURL('/en/site/105')
  await page.getByRole('link', { name: '中文', exact: true }).click()
  await expect(page).toHaveURL('/site/105')
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN')

  await page.goto('/en/games')
  await page.getByRole('searchbox').fill('Threefold Recital')
  await expect(page.getByRole('status')).toHaveText('1 result')
  const entry = catalog.games.find(({ id }) => id === 102)!
  const category = entry.tags.find(({ id }) => catalog.tags.some((tag) => tag.id === id && tag.category === 'classification'))!
  const species = entry.tags.find(({ id }) => catalog.tags.some((tag) => tag.id === id && tag.category === 'species'))!
  await page.getByLabel('Game category').selectOption(String(category.id))
  await page.getByLabel('Species').selectOption(String(species.id))
  await expect(page.getByRole('status')).toHaveText('1 result')
  await expect(page.getByRole('link', { name: /Threefold Recital/ })).toBeVisible()
  await page.getByRole('searchbox').fill('nonexistent-catalog-entry')
  await expect(page.getByRole('status')).toHaveText('0 results')
})

test('static pages readable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  try {
    const page = await context.newPage()
    await page.goto('http://127.0.0.1:8787/en/site/105')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('WildDream')
    await expect(page.getByRole('heading', { name: 'About this website' })).toBeVisible()
    await page.goto('http://127.0.0.1:8787/en/updates/' + lastRelease)
    await expect(page.locator('main article')).toContainText('Game Collections')
  } finally {
    await context.close()
  }
})

for (const width of [1440, 820, 390, 320]) {
  test('responsive layouts at ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.route('https://**/*.jpg', (route) => route.abort())
    for (const path of ['/', '/en/categories/community', '/en/games', '/games/102', '/site/105', '/games/collections', '/en/updates/' + lastRelease]) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth), path).toBeLessThanOrEqual(width)
    }
    if (width === 1440) {
      await page.goto('/')
      await expect(page.locator('section[aria-label]').filter({ has: page.getByRole('heading', { level: 3 }) })).toHaveCount(8)
      const columns = await page.getByRole('heading', { name: '探索分类' }).evaluate((heading) =>
        getComputedStyle(heading.parentElement!.nextElementSibling!).gridTemplateColumns.split(' ').length)
      expect(columns).toBe(4)
    }
  })
}

test('theme persists, keyboard focus is visible, reduced motion and broken images degrade safely', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })
  await page.goto('/en')
  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: 'Skip to content' })
  await expect(skip).toBeFocused()
  const before = await page.locator('html').evaluate((html) => getComputedStyle(html).backgroundColor)
  await page.getByRole('button', { name: 'Toggle light or dark theme' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  expect(await page.locator('html').evaluate((html) => getComputedStyle(html).backgroundColor)).not.toBe(before)
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  expect(await page.getByRole('link', { name: 'View all' }).first().evaluate((element) => getComputedStyle(element).transitionDuration)).toBe('0s')

  await page.route(/steamstatic\.com/, (route) => route.abort())
  await page.goto('/en/games/102')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Threefold Recital' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'View on Steam' })).toBeVisible()
  expect(await page.getByRole('link', { name: /^Open screenshot/ }).count()).toBeLessThanOrEqual(6)
})
