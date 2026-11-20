import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

const catalog = JSON.parse(readFileSync(new URL('../content/catalog/catalog.json', import.meta.url), 'utf8')) as typeof import('../content/catalog/catalog.json')
const classifications: Record<string, { primary: string; secondary: string[] }> =
  JSON.parse(readFileSync(new URL('../content/curation/site-categories.json', import.meta.url), 'utf8'))

const lastRelease = catalog.updates[0].id

test('bilingual static HTML, canonical links, sitemap and ordinary search indexes', async ({ request }) => {
  for (const [path, language] of [
    ['/', 'en'], ['/zh', 'zh-CN'], ['/site/105', 'en'], ['/zh/site/105', 'zh-CN'],
    ['/games/102', 'en'], ['/zh/games/102', 'zh-CN'], ['/zh/site-groups/100', 'zh-CN'],
    ['/categories/community', 'en'], ['/zh/games/collections', 'zh-CN'],
    ['/games/collections/open-world', 'en'], ['/zh/updates/' + lastRelease, 'zh-CN'],
    ['/updates/' + lastRelease, 'en'], ['/about', 'en'], ['/zh/privacy', 'zh-CN'], ['/terms', 'en'],
  ]) {
    const response = await request.get(path, { maxRedirects: 0, headers: { 'Accept-Language': 'zh-CN' } })
    expect(response.status(), path).toBe(200)
    const body = await response.text()
    expect(body).toContain('<html lang="' + language + '"')
    expect(body).toMatch(/<h1[ >]/)
    expect(body).toContain('rel="canonical" href="https://go-furry.com' + path + '"')
    expect(body).toContain('property="og:title"')
    const english = path.replace(/^\/zh(?=\/|$)/, '') || '/'
    const chinese = '/zh' + (english === '/' ? '' : english)
    for (const [locale, canonical] of [['en', english], ['zh-CN', chinese], ['x-default', english]]) {
      expect(body).toContain('hrefLang="' + locale + '" href="https://go-furry.com' + canonical + '"')
    }
    expect(body).toContain('property="og:locale" content="' + (language === 'en' ? 'en_US' : 'zh_CN') + '"')
  }
  expect(await (await request.get('/robots.txt')).text()).toContain('https://go-furry.com/sitemap.xml')
  const sitemap = await (await request.get('/sitemap.xml')).text()
  expect(sitemap).toContain('https://go-furry.com/zh/site/105')
  expect(sitemap).toContain('hreflang="x-default" href="https://go-furry.com/site/105"')
  expect(sitemap).not.toContain('https://go-furry.com/en/')
  expect(sitemap).toContain('https://go-furry.com/site/156')
  expect(sitemap).not.toContain('https://go-furry.com/site/101<')
  const ordinary = await (await request.get('/indexes/sites-en.json')).json() as unknown[][]
  expect(ordinary.length).toBe(197)
  expect(ordinary.some(([id]) => id === 156)).toBe(true)
  expect(ordinary.some(([id]) => id === 101)).toBe(false)
  expect((await (await request.get('/indexes/games-zh.json')).json()).length).toBe(203)
})

test('Workers return historical redirects, 404, 410, and HEAD', async ({ request }) => {
  for (const [path, target] of [
    ['/home', '/'], ['/nav', '/'], ['/sites', '/'], ['/sites/105', '/site/105'],
    ['/site/105/old.example', '/site/105'], ['/en/sites/105?a=b', '/site/105?a=b'],
    ['/games/search', '/games'], ['/en/games/search?q=story', '/games?q=story'], ['/en/games/102/', '/games/102'],
    ['/en?ref=old', '/?ref=old'], ['/en/', '/'], ['/en/site/105', '/site/105'],
    ['/en/games/collections/open-world', '/games/collections/open-world'], ['/en/site-groups/100', '/site-groups/100'],
    ['/zh/', '/zh'], ['/zh/sites/105?via=old', '/zh/site/105?via=old'], ['/zh/nav', '/zh'],
    ['/en/insights/stats', '/insights/stats'], ['/en/games/355', '/games/355'], ['/en/sites/183', '/sites/183'],
  ]) {
    const response = await request.get(path, { maxRedirects: 0 })
    expect(response.status(), path).toBe(301)
    expect(response.headers().location).toBe('http://127.0.0.1:8787' + target)
  }
  for (const path of ['/site/999999', '/sites/183', '/zh/sites/183', '/games/999999', '/site/105.html', '/gfn.dump', '/.local/l1-c2-a/candidates.ndjson']) {
    const response = await request.get(path, { maxRedirects: 0 })
    expect(response.status(), path).toBe(404)
    expect(response.headers()['x-robots-tag']).toBe('noindex')
  }
  for (const path of ['/insights', '/insights/stats', '/site/142', '/games/355', '/zh/games/355', '/zh/games/prize/activation', '/games/prize', '/about/faolan']) {
    const response = await request.get(path, { maxRedirects: 0 })
    expect(response.status(), path).toBe(410)
    expect(await response.text()).toContain('410')
  }
  const www = await request.get('/en/games/102?from=legacy', {
    headers: { host: 'www.go-furry.com' }, maxRedirects: 0,
  })
  expect(www.status()).toBe(301)
  expect(www.headers().location).toBe('https://go-furry.com/games/102?from=legacy')
  expect(await (await request.head('/games/102')).text()).toBe('')
  expect((await request.post('/')).status()).toBe(405)
  for (const asset of ['gofurry-favicon.png', 'gofurry-horizontal.svg', 'gofurry-symbol.svg', 'gofurry-lite-og.png']) {
    expect((await request.get('/media/brand/' + asset)).status(), asset).toBe(200)
  }
})

test('search, game category and species filters, and locale continuity', async ({ page }) => {
  await page.route('https://**/*.jpg', (route) => route.abort())
  await page.goto('/')
  const input = page.getByRole('searchbox')
  await input.fill('wilddream')
  await expect(page.getByRole('status')).toHaveText(/^\d+ results?$/)
  await page.locator('[data-results="sites"] a[href="/site/105"]').click()
  await expect(page).toHaveURL('/site/105')
  await page.getByRole('link', { name: '中文', exact: true }).click()
  await expect(page).toHaveURL('/zh/site/105')
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN')
  const chineseNav = page.getByRole('navigation', { name: '主导航' })
  await expect(chineseNav.getByRole('link', { name: '导航' })).toHaveAttribute('href', '/zh')
  await expect(chineseNav.getByRole('link', { name: '游戏', exact: true })).toHaveAttribute('href', '/zh/games')
  await expect(chineseNav.getByRole('link', { name: '合集', exact: true })).toHaveAttribute('href', '/zh/games/collections')
  await chineseNav.getByRole('link', { name: 'EN', exact: true }).click()
  await expect(page).toHaveURL('/site/105')

  await page.goto('/games')
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

test('homepage floating search handles the outline notch, IME and clear controls', async ({ page }) => {
  await page.route(/steamstatic\.com/, (route) => route.abort())
  await page.goto('/zh')
  const input = page.getByRole('searchbox', { name: '搜索兽圈网站' })
  const wrapper = input.locator('..')
  const outline = wrapper.locator('fieldset')
  const notch = wrapper.locator('legend')
  const firstCharacter = wrapper.locator('label span[aria-hidden] > span').first()
  await expect(outline).toHaveCSS('border-top-color', 'rgba(0, 0, 0, 0)')
  await expect(outline).toHaveCSS('transition-duration', '0.42s')
  await expect(notch).toHaveCSS('max-inline-size', '0px')
  await expect(firstCharacter).toHaveCSS('transform', 'none')
  await input.focus()
  await expect(outline).toHaveCSS('border-top-width', '2px')
  await expect(outline).toHaveCSS('border-top-color', 'rgb(203, 92, 37)')
  await expect(notch).toHaveCSS('max-inline-size', '100%')
  await expect(firstCharacter).not.toHaveCSS('transform', 'none')
  await expect(wrapper.locator('label span[aria-hidden] > span').nth(1)).toHaveCSS('transition-delay', '0.007s')

  const session = await page.context().newCDPSession(page)
  const site = catalog.sites.find(({ id }) => id === 105)!
  const keyword = site.title.zh
  await session.send('Input.imeSetComposition', { text: keyword, selectionStart: keyword.length, selectionEnd: keyword.length })
  await expect(input).toHaveValue(keyword)
  await expect(page.locator('[data-category-grid]')).toBeVisible()
  await expect(page.locator('[data-results="sites"]')).toHaveCount(0)
  await session.send('Input.insertText', { text: keyword })
  await expect(page.locator('[data-results="sites"] a[href="/zh/site/105"]')).toBeVisible()
  await page.getByRole('button', { name: '清除搜索' }).click()
  await expect(input).toHaveValue('')
  await expect(input).toBeFocused()
  await expect(page.locator('[data-category-grid]')).toBeVisible()

  await input.fill('wilddream')
  await expect(page.locator('[data-results="sites"] a[href="/zh/site/105"]')).toBeVisible()
  await input.press('Escape')
  await expect(input).toHaveValue('')
  await expect(page.locator('[data-category-grid]')).toBeVisible()
  await input.blur()
  await expect(outline).toHaveCSS('border-top-color', 'rgba(0, 0, 0, 0)')
})

test('all homepage category members render with mode-specific counts and separately actionable links', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 840 })
  await page.route(/steamstatic\.com/, (route) => route.abort())
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Discover furry websites')
  const shortcuts = page.getByRole('navigation', { name: 'Projects and contact' })
  await expect(shortcuts.getByRole('link')).toHaveCount(5)
  for (const [name, url] of [
    ['GoFurry', 'https://gofurry.com'], ['Tool4Furry', 'https://tool4furry.com'],
    ['GitHub', 'https://github.com/librecosta/gofurry-lite'], ['X @LibreCostaHQ', 'https://x.com/LibreCostaHQ'],
  ]) {
    const link = shortcuts.getByRole('link', { name, exact: true })
    await expect(link).toHaveAttribute('href', url)
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    await expect(link).toHaveCSS('border-top-width', '0px')
    await expect(link).toHaveCSS('border-radius', '50%')
  }
  await expect(shortcuts.getByRole('link', { name: /Email LibreCosta/ })).toHaveAttribute('href', 'mailto:contact@librecosta.com')
  for (const [name, symbol] of [['GoFurry', 'gofurry-symbol.svg'], ['Tool4Furry', 'tool4furry-symbol.svg']]) {
    const mark = shortcuts.getByRole('link', { name, exact: true }).locator('span')
    expect(await mark.evaluate((node) => getComputedStyle(node).maskImage)).toContain('/media/brand/' + symbol)
    expect((await page.request.get('/media/brand/' + symbol)).ok()).toBe(true)
  }

  const codes = [...new Set(Object.values(classifications).map(({ primary }) => primary))]
  const mode = page.getByRole('switch', { name: 'NSFW content' })
  for (const expanded of [false, true]) {
    if (expanded) await mode.click()
    await expect(mode).toHaveAttribute('aria-checked', String(expanded))
    for (const code of codes) {
      const members = catalog.sites.filter(({ id, rating }) => (expanded || rating === 'sfw') &&
        (classifications[id].primary === code || classifications[id].secondary.includes(code)))
      const card = page.locator('[data-category="' + code + '"]')
      await expect(card.locator('[data-site-id]')).toHaveCount(members.length)
      const actual = await card.locator('[data-site-id]').evaluateAll((rows) => rows.map((row) => Number(row.getAttribute('data-site-id'))))
      expect(actual, code).toEqual(members.map(({ id }) => id).sort((a, b) => a - b))
      await expect(card.getByRole('link', { name: 'SEE ALL ' + members.length + ' SITES', exact: true })).toHaveAttribute('href', '/categories/' + code)
    }
  }

  const row = page.locator('[data-site-id="105"]').first()
  await expect(row.locator('a').first()).toHaveAttribute('href', '/site/105')
  const external = row.getByRole('link', { name: /^Visit / })
  await expect(external).toHaveAttribute('href', catalog.sites.find(({ id }) => id === 105)!.url!)
  await expect(external).toHaveAttribute('target', '_blank')
  await expect(external).toHaveAttribute('rel', 'noopener noreferrer')
  await expect(page.locator('[data-site-id="135"] a[target="_blank"]')).toHaveCount(0)

  const scroll = page.locator('[data-category="community"] [data-category-scroll]')
  await scroll.focus()
  await expect(scroll).toBeFocused()
  await scroll.press('PageDown')
  await expect.poll(() => scroll.evaluate((node) => node.scrollTop)).toBeGreaterThan(0)
  await scroll.evaluate((node) => { node.scrollTop = node.scrollHeight })
  await scroll.hover()
  const y = await page.evaluate(() => scrollY)
  await page.mouse.wheel(0, 150)
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(y)
})

test('homepage tall cards follow the desktop sketch and share one height in the single-column layout', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.route(/steamstatic\.com/, (route) => route.abort())
  await page.goto('/')
  const boxes = () => page.locator('[data-category]').evaluateAll((cards) => Object.fromEntries(
    cards.map((card) => {
      const { x, y, width, height } = card.getBoundingClientRect()
      return [card.getAttribute('data-category')!, { x, y, width, height }] as const
    }),
  ))
  const { community, gallery, marketplace, literature, resources, events, knowledge, gaming } = await boxes()
  const gap = gallery.x - (community.x + community.width)
  expect(gap).toBeGreaterThan(0)
  expect(gallery.y).toBe(community.y)
  expect(community.width).toBeCloseTo(marketplace.width + literature.width + gap, 1)
  expect(gallery.width).toBeCloseTo(resources.width + events.width + gap, 1)
  expect([literature.y, resources.y, events.y]).toEqual([marketplace.y, marketplace.y, marketplace.y])
  expect([knowledge.x, gaming.x]).toEqual([literature.x, resources.x])
  expect(knowledge.y).toBeCloseTo(literature.y + literature.height + gap, 1)
  expect(gaming.y).toBeCloseTo(resources.y + resources.height + gap, 1)
  expect(marketplace.y + marketplace.height).toBeCloseTo(knowledge.y + knowledge.height, 1)
  expect(events.y + events.height).toBeCloseTo(gaming.y + gaming.height, 1)
  expect(community.height).toBeGreaterThan(304)
  expect(literature.height).toBeGreaterThan(304)

  for (const width of [960, 375, 320]) {
    await page.setViewportSize({ width, height: 850 })
    const cards = Object.values(await boxes())
    expect(new Set(cards.map(({ x, height, width }) => [x, height, width].join('/'))).size).toBe(1)
    expect(cards[0].height).toBeGreaterThan(304)
    expect(cards.every(({ y }, index) => index === 0 || y > cards[index - 1].y)).toBe(true)
  }
})

test('homepage records visits from detail links and external links without reordering sites', async ({ page, context }) => {
  await page.route(/steamstatic\.com/, (route) => route.abort())
  await page.goto('/')
  const community = page.locator('[data-category="community"]')
  const sortedIds = () => community.locator('[data-site-id]').evaluateAll((rows) => rows.map((row) => row.getAttribute('data-site-id')))
  const originalOrder = await sortedIds()
  const first = community.locator('[data-site-id]').first()
  const firstLink = first.locator('a').first()
  const detail = (await firstLink.getAttribute('href'))!
  await expect(first.getByText('1.', { exact: true })).toBeVisible()
  await firstLink.press('Enter')
  await expect(page).toHaveURL(detail)

  await page.goto('/zh')
  await expect(first.getByTitle('已访问', { exact: true })).toBeVisible()
  expect(await sortedIds()).toEqual(originalOrder)
  await page.getByRole('switch', { name: 'NSFW 内容' }).click()
  const allCommunity = catalog.sites.filter(({ id }) =>
    classifications[id].primary === 'community' || classifications[id].secondary.includes('community'))
  await expect(community.locator('[data-site-id]')).toHaveCount(allCommunity.length)
  await expect(first.getByTitle('已访问', { exact: true })).toBeVisible()
  expect((await sortedIds()).filter((id) => originalOrder.includes(id))).toEqual(originalOrder)

  const row = page.locator('[data-site-id="105"]').first()
  const external = row.locator('a[target="_blank"]')
  const address = (await external.getAttribute('href'))!
  await context.route(address, (route) => route.fulfill({ body: 'External destination' }))
  const [popup] = await Promise.all([page.waitForEvent('popup'), external.click()])
  await expect(row.getByTitle('已访问', { exact: true })).toBeVisible()
  await popup.close()
  await page.reload()
  await expect(row.getByTitle('已访问', { exact: true })).toBeVisible()
})

test('category dividers expand from the center and category accents stay distinct in both themes', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 840 })
  await page.emulateMedia({ colorScheme: 'light' })
  await page.route(/steamstatic\.com/, (route) => route.abort())
  await page.goto('/')
  const card = page.locator('[data-category="community"]')
  const heading = card.getByRole('heading')
  const divider = () => heading.evaluate((node) => {
    const track = getComputedStyle(node, '::before')
    const accent = getComputedStyle(node, '::after')
    return { track: track.inlineSize, accent: accent.inlineSize, thickness: accent.height, duration: accent.transitionDuration }
  })
  const rest = await divider()
  expect(rest).toMatchObject({ accent: '55px', thickness: '3px', duration: '0.42s' })
  expect(parseFloat(rest.track)).toBeGreaterThan(55)
  await heading.hover()
  await expect.poll(async () => (await divider()).accent).toBe(rest.track)
  await page.mouse.move(0, 0)
  await expect.poll(async () => (await divider()).accent).toBe('55px')
  await card.locator('[data-category-scroll]').focus()
  await expect.poll(async () => (await divider()).accent).toBe(rest.track)

  const buttons = page.locator('[data-category] > a')
  const fills = () => buttons.evaluateAll((links) => links.map((link) => getComputedStyle(link).backgroundColor))
  const light = await fills()
  expect(new Set(light).size).toBe(8)
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  await expect.poll(fills).not.toEqual(light)
  expect(new Set(await fills()).size).toBe(8)
  expect((await divider()).duration).toBe('0s')
})

test('homepage shortcut previews retain their artwork, stay above the buttons and support keyboard focus', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 840 })
  await page.route(/steamstatic\.com/, (route) => route.abort())
  await page.goto('/')
  const nav = page.getByRole('navigation', { name: 'Projects and contact' })
  const previews = nav.locator('[data-shortcut-preview]')
  await expect(previews).toHaveCount(0)
  for (const [name, image] of [
    ['GoFurry', 'gofurry-og.png'], ['Tool4Furry', 'tool4furry-og.png'],
    [/Email LibreCosta/, 'librecosta-email.png'], ['GitHub', 'librecosta-default.png'],
  ] as const) {
    const shortcut = nav.getByRole('link', { name })
    await shortcut.hover({ position: { x: 32, y: 12 } })
    const preview = previews.locator('img[src$="/' + image + '"]')
    await expect(preview).toBeVisible()
    await expect.poll(() => preview.evaluate((node) => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
    const previewBox = (await preview.boundingBox())!
    const buttonBox = (await shortcut.boundingBox())!
    expect(previewBox.y + previewBox.height).toBeLessThan(buttonBox.y)
    expect(previewBox.x + previewBox.width).toBeLessThan(1440)
  }
  await nav.getByRole('link', { name: 'X @LibreCostaHQ' }).hover()
  await expect(previews.filter({ hasText: '@LibreCostaHQ' })).toBeVisible()
  await page.mouse.move(0, 0)
  await expect(previews).toHaveCount(0)
  await page.getByRole('searchbox').focus()
  await page.keyboard.press('Tab')
  await expect(nav.getByRole('link', { name: 'GoFurry' })).toBeFocused()
  await expect(previews.locator('img[src$="/gofurry-og.png"]')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(previews).toHaveCount(0)
})

test('static pages readable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  try {
    const page = await context.newPage()
    await page.goto('http://127.0.0.1:8787/site/105')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('WildDream')
    await expect(page.getByRole('heading', { name: 'About this website' })).toBeVisible()
    await page.goto('http://127.0.0.1:8787/updates/' + lastRelease)
    await expect(page.locator('main article')).toContainText('Game Collections')
  } finally {
    await context.close()
  }
})

for (const [width, cardColumns, entryColumns] of [[1440, 4, 1], [820, 1, 3], [375, 1, 2], [320, 1, 1]]) {
  test('responsive layouts at ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.route('https://**/*.jpg', (route) => route.abort())
    for (const path of ['/', '/zh', '/categories/community', '/zh/games', '/games/102', '/site/105', '/games/collections', '/zh/updates/' + lastRelease]) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth), path).toBeLessThanOrEqual(width)
      if (path === '/' || path === '/zh') {
        const grid = page.locator('[data-category-grid]')
        await expect(grid.locator('[data-category]')).toHaveCount(8)
        await expect(grid.locator('[data-category]').first()).toHaveCSS('border-top-width', '3px')
        expect(await grid.evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(' ').length)).toBe(cardColumns)
        const list = grid.locator('[data-category-scroll]').first()
        expect(await list.locator('ol').evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(' ').length)).toBe(entryColumns)
        expect(await list.evaluate((node) => node.scrollWidth - node.clientWidth)).toBe(0)

        const shortcuts = (await page.getByRole('navigation', { name: /Projects and contact|项目与联系方式/ }).boundingBox())!
        const search = (await page.getByRole('searchbox').boundingBox())!
        if (width < 768) expect(search.y + search.height).toBeLessThan(shortcuts.y)
        else {
          expect(search.x + search.width).toBeLessThan(shortcuts.x)
          expect(search.y + search.height / 2).toBeCloseTo(shortcuts.y + shortcuts.height / 2, 0)
        }
      }
    }
  })
}

test('theme persists, keyboard focus is visible, reduced motion and broken images degrade safely', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })
  await page.goto('/')
  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: 'Skip to content' })
  await expect(skip).toBeFocused()
  const before = await page.locator('html').evaluate((html) => getComputedStyle(html).backgroundColor)
  await page.getByRole('button', { name: 'Toggle light or dark theme' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  expect(await page.locator('html').evaluate((html) => getComputedStyle(html).backgroundColor)).not.toBe(before)
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.getByRole('link', { name: /^See all \d+ sites?$/i }).first()).toHaveCSS('transition-duration', '0s')

  await page.route(/steamstatic\.com/, (route) => route.abort())
  await page.goto('/games/102')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Threefold Recital' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'View on Steam' })).toBeVisible()
  expect(await page.getByRole('link', { name: /^Open screenshot/ }).count()).toBeLessThanOrEqual(6)
})


test('the browser uses the self-hosted Chinese and English variable fonts', async ({ page }) => {
  await page.route(/steamstatic\.com/, (route) => route.abort())
  const remoteFonts: string[] = []
  page.on('request', (request) => {
    if (request.resourceType() === 'font' && !request.url().startsWith('http://127.0.0.1:8787/')) remoteFonts.push(request.url())
  })
  const session = await page.context().newCDPSession(page)
  await session.send('DOM.enable')
  await session.send('CSS.enable')
  for (const [path, family] of [['/zh', /Noto Sans SC/i], ['/', /Manrope/i]] as const) {
    await page.goto(path)
    await page.evaluate(() => document.fonts.ready.then(() => true))
    const { root } = await session.send('DOM.getDocument')
    const { nodeId } = await session.send('DOM.querySelector', { nodeId: root.nodeId, selector: 'main h1' })
    const { fonts } = await session.send('CSS.getPlatformFontsForNode', { nodeId })
    expect(fonts.some((font) => family.test(font.familyName) && font.isCustomFont && font.glyphCount > 0), JSON.stringify(fonts)).toBe(true)
  }
  expect(remoteFonts).toEqual([])
})

test('the two modes reuse real home, category, group, game and collection data', async ({ page }) => {
  await page.route(/steamstatic\.com/, (route) => route.abort())
  const requested: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/indexes/extended/')) requested.push(request.url())
  })
  await page.goto('/')
  const mode = page.getByRole('switch', { name: 'NSFW content' })
  await expect(mode).toHaveAttribute('aria-checked', 'false')
  await page.getByRole('searchbox').fill('FurAffinity')
  await expect(page.getByRole('status')).toHaveText(/^\d+ results?$/)
  await expect(page.locator('[data-results="sites"] a[href="/site/101"]')).toHaveCount(0)
  expect(requested).toEqual([])
  await mode.focus()
  await mode.press('ArrowRight')
  await expect(mode).toHaveAttribute('aria-checked', 'true')
  await expect(page.locator('[data-results="sites"] a[href="/site/101"]')).toContainText('NSFW')
  await page.reload()
  await expect(mode).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('link', { name: '中文', exact: true }).click()
  await expect(page.getByRole('switch', { name: 'NSFW 内容' })).toHaveAttribute('aria-checked', 'true')
  await expect(page).toHaveURL('/zh')

  await page.goto('/categories/gallery')
  await expect(page.locator('[data-results="sites"] a[href="/site/101"]')).toBeVisible()
  await page.goto('/site-groups/100')
  await expect(page.locator('[data-results="sites"] a[href="/site/101"]')).toBeVisible()

  await page.goto('/games')
  const restored = catalog.games.find(({ rating }) => rating === 'nsfw')!
  const games = page.locator('[data-results="games"] [data-search-id]')
  await expect(games).toHaveCount(261)
  await page.getByRole('searchbox').fill(restored.title.en || restored.title.zh)
  await expect(page.locator('a[href="/games/' + restored.id + '"]')).toContainText('NSFW')
  await page.getByRole('searchbox').clear()
  await mode.click()
  await expect(games).toHaveCount(203)
  await expect(page.locator('a[href="/games/' + restored.id + '"]')).toHaveCount(0)
  await page.getByRole('searchbox').fill('Changed')
  await expect(page.locator('a[href="/games/101"]')).toBeVisible()

  const collection = catalog.collections.find(({ members }) => members.includes(restored.id))!
  const adultIds = new Set(catalog.games.filter(({ rating }) => rating === 'nsfw').map(({ id }) => id))
  const normalSize = collection.members.filter((id) => !adultIds.has(id)).length
  await page.goto('/games/collections/' + collection.code)
  await expect(page.locator('[data-search-id]')).toHaveCount(normalSize)
  await mode.click()
  await expect(page.locator('[data-search-id]')).toHaveCount(collection.members.length)
})

test('known adult historical details return a gated document and load only after enabling NSFW', async ({ page, request }) => {
  await page.route(/steamstatic\.com/, (route) => route.abort())
  const game = catalog.games.find(({ rating }) => rating === 'nsfw')!
  for (const path of ['/site/101', '/games/' + game.id]) {
    const response = await request.get(path)
    expect(response.status()).toBe(200)
    expect(response.headers()['x-robots-tag']).toBe('noindex')
    const html = await response.text()
    expect(html).toContain('name="robots" content="noindex, nofollow"')
    expect(html).toContain('Enable NSFW mode in the header')
  }
  await page.goto('/site/101')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('NSFW content')
  await expect(page.getByRole('link', { name: 'Visit website' })).toHaveCount(0)
  const mode = page.getByRole('switch', { name: 'NSFW content' })
  await mode.click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('FurAffinity')
  await expect(page.getByRole('link', { name: 'Visit website' })).toHaveAttribute('href', 'https://www.furaffinity.net/')
  await page.goto('/games/' + game.id)
  await expect(page.getByRole('heading', { level: 1 })).toContainText(game.title.en || game.title.zh)
  await mode.click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('NSFW content')
})

test('verified site links open directly and unrelated historical IDs retain distinct identities', async ({ page }) => {
  for (const [id, url] of [
    [225, 'https://furryweekend.com/'], [270, 'https://furryweekend.com/'],
    [293, 'https://www.furfest.org/'], [334, 'https://www.tasfurry.com/'],
  ] as const) {
    await page.goto('/site/' + id)
    await expect(page).toHaveURL('/site/' + id)
    const link = page.getByRole('link', { name: 'Visit website' })
    await expect(link).toHaveAttribute('href', url)
    await expect(link).toHaveAttribute('target', '_blank')
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  }
  await page.goto('/site/135')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('FurryFusion')
  await expect(page.getByRole('link', { name: 'Visit website' })).toHaveCount(0)
})
