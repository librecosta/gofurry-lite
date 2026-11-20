
import { test, expect, type Locator } from '@playwright/test'

async function dockFits(dock: Locator) {
  const geometry = await dock.evaluate((nav) => {
    const frame = nav.getBoundingClientRect()
    const items = [...nav.querySelectorAll<HTMLElement>('[data-dock-item]')]
    return {
      bounded: frame.left >= 0 && frame.right <= document.documentElement.clientWidth,
      separate: items.every((item, i) => i === 0 || item.getBoundingClientRect().left >= items[i - 1].getBoundingClientRect().right),
    }
  })
  expect(geometry).toEqual({ bounded: true, separate: true })
}

test('desktop navigation keeps its required order and both themes remain translucent while scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 800 })
  await page.emulateMedia({ colorScheme: 'light' })
  await page.route(/steamstatic\.com/, (route) => route.abort())
  await page.goto('/en')
  const header = page.getByRole('banner')
  const nav = header.getByRole('navigation', { name: 'Primary navigation' })
  await expect(nav.locator(':scope > *')).toHaveText(['SFWNSFW', 'Discover', 'Games', 'Collections', '', '中文'])
  await expect(nav.getByRole('switch', { name: 'NSFW content' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Discover' })).toHaveAttribute('aria-current', 'page')
  const before = await header.evaluate((element) => ({
    background: getComputedStyle(element).backgroundColor,
    blur: getComputedStyle(element).backdropFilter,
    border: getComputedStyle(element).borderBottomWidth,
  }))
  expect(before.background).toMatch(/rgba\(255, 250, 242, 0\.78\)/)
  expect(before.blur).toBe('blur(12px)')
  expect(before.border).toBe('0px')
  const games = nav.getByRole('link', { name: 'Games' })
  const normal = await games.evaluate((element) => getComputedStyle(element).color)
  const active = await nav.getByRole('link', { name: 'Discover' }).evaluate((element) => getComputedStyle(element).color)
  expect(normal).not.toBe(active)
  await games.hover()
  await expect.poll(() => games.evaluate((element) => Number(getComputedStyle(element).getPropertyValue('--nav-hover')))).toBe(1)
  const hovered = await games.evaluate((element) => getComputedStyle(element).color)
  expect(hovered).not.toBe(normal)
  expect(hovered).not.toBe(active)
  await expect(games).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await expect(nav.getByRole('link', { name: 'Discover' })).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')

  await page.evaluate(() => scrollTo(0, 540))
  await expect.poll(() => header.evaluate((element) => element.getBoundingClientRect().top)).toBe(0)
  const dotLayer = await page.evaluate(() => {
    const style = getComputedStyle(document.body, '::before')
    return { position: style.position, top: style.top, pointerEvents: style.pointerEvents, mask: style.maskImage }
  })
  expect(dotLayer).toMatchObject({ position: 'fixed', top: '0px', pointerEvents: 'none' })
  expect(dotLayer.mask).toContain('linear-gradient')
  const theme = nav.getByRole('button', { name: 'Toggle light or dark theme' })
  await theme.hover()
  await expect.poll(() => theme.evaluate((element) => Number(getComputedStyle(element).getPropertyValue('--nav-button-fill')))).toBe(1)
  await expect(theme).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await theme.click()
  await expect.poll(() => header.evaluate((element) => getComputedStyle(element).backgroundColor)).toMatch(/rgba\(40, 42, 45, 0\.78\)/)
  await expect(page.getByRole('navigation', { name: 'Bottom navigation' })).toHaveCount(0)
})

test('complete navigation stays visible at medium widths including 768px', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 880 })
  await page.route(/steamstatic\.com/, (route) => route.abort())
  await page.goto('/en')
  const header = page.getByRole('banner')
  const nav = header.getByRole('navigation', { name: 'Primary navigation' })
  await page.evaluate(() => scrollTo(0, 240))
  for (const width of [820, 1024, 768]) {
    await page.setViewportSize({ width, height: 768 })
    await expect(nav.locator(':scope > *')).toHaveCount(6)
    await expect(nav).toBeVisible()
    await expect(header.getByRole('button', { name: 'Navigation menu' })).toBeHidden()
    await expect(page.getByRole('navigation', { name: 'Bottom navigation' })).toHaveCount(0)
    expect(await header.evaluate(element => element.getBoundingClientRect().top)).toBe(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
  }
})

test('small-screen dock expands on hover and keyboard focus, activates links, and dismisses at the top', async ({ page }) => {
  await page.setViewportSize({ width: 767, height: 768 })
  await page.route(/steamstatic\.com/, (route) => route.abort())
  await page.goto('/en')
  const header = page.getByRole('banner')
  const dock = page.locator('#mobile-navigation')
  const trigger = header.getByRole('button', { name: 'Navigation menu' })
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await expect(dock).toBeHidden()
  await expect(header.getByRole('navigation', { name: 'Primary navigation' })).toHaveCount(0)

  await page.evaluate(() => scrollTo(0, 240))
  await expect(dock).toBeVisible()
  await expect(dock.locator('[data-dock-item]')).toHaveCount(7)
  await expect.poll(() => header.evaluate((element) => element.getBoundingClientRect().bottom)).toBeLessThan(0)
  const iconLink = dock.getByRole('link', { name: 'Collections' })
  const closedWidth = (await iconLink.boundingBox())!.width
  await iconLink.hover()
  await expect(iconLink).toHaveAttribute('data-expanded', 'true')
  await expect.poll(async () => (await iconLink.boundingBox())!.width).toBeGreaterThan(closedWidth + 48)
  await dockFits(dock)

  await iconLink.focus()
  await iconLink.press('ArrowRight')
  const mode = dock.getByRole('switch', { name: 'NSFW content' })
  await expect(mode).toBeFocused()
  await expect(mode).toHaveAttribute('data-expanded', 'true')
  await mode.press('End')
  const github = dock.getByRole('link', { name: 'GitHub' })
  await expect(github).toBeFocused()
  const url = 'https://github.com/librecosta/gofurry-lite'
  await expect(github).toHaveAttribute('href', url)
  await expect(github).toHaveAttribute('rel', 'noopener noreferrer')
  await page.context().route(url, (route) => route.fulfill({ body: 'GitHub destination' }))
  const [popup] = await Promise.all([page.waitForEvent('popup'), github.press('Enter')])
  await expect(popup).toHaveURL(url)
  await popup.close()

  await page.evaluate(() => scrollTo(0, 0))
  await expect(dock).toBeHidden()
  await expect(trigger).toBeFocused()
  await trigger.press('Enter')
  await expect(dock).toBeVisible()
  await page.keyboard.press('Tab')
  const discover = dock.getByRole('link', { name: 'Discover' })
  await expect(discover).toBeFocused()
  await discover.press('Escape')
  await expect(dock).toBeHidden()
  await expect(trigger).toBeFocused()

  await page.evaluate(() => scrollTo(0, 240))
  await iconLink.click()
  await expect(page).toHaveURL('/en/games/collections')
  await trigger.click()
  await expect(iconLink).toHaveAttribute('aria-current', 'page')
})

for (const width of [320, 390]) {
  test('touch dock at ' + width + 'px fits seven actions and persists preferences across languages', async ({ browser, baseURL }) => {
    const context = await browser.newContext({
      baseURL, viewport: { width, height: 720 }, isMobile: true, hasTouch: true, colorScheme: 'light', reducedMotion: 'reduce',
    })
    try {
      const page = await context.newPage()
      const session = await context.newCDPSession(page)
      await session.send('Emulation.setSafeAreaInsetsOverride', { insets: { bottom: 34 } })
      await page.route(/steamstatic\.com/, (route) => route.abort())
      await page.goto('/en/privacy')
      const menu = page.getByRole('button', { name: 'Navigation menu' })
      const dock = page.locator('#mobile-navigation')
      const brand = page.getByRole('link', { name: 'GoFurry Lite' })
      const artwork = brand.locator(':scope > span')
      await expect(artwork.first()).toHaveCSS('width', '138px')
      await expect(artwork.first()).toHaveCSS('height', '34.5px')
      await expect(artwork.last()).toHaveCSS('height', '34.5px')
      expect((await artwork.first().boundingBox())?.y).toBe((await artwork.last().boundingBox())?.y)
      await expect(page.locator('meta[name="viewport"]')).toHaveAttribute('content', /viewport-fit=cover/)
      await expect(dock).toBeHidden()
      await menu.tap()
      await expect(dock).toBeVisible()
      expect(await dock.evaluate((nav) => innerHeight - nav.getBoundingClientRect().bottom)).toBeCloseTo(42, 0)
      await expect(dock.locator('[data-dock-item]')).toHaveCount(7)
      await dockFits(dock)

      const collections = dock.getByRole('link', { name: 'Collections' })
      await collections.focus()
      await expect(collections).toHaveAttribute('data-expanded', 'true')
      await expect.poll(() => collections.evaluate((link) => {
        const label = link.lastElementChild!.getBoundingClientRect()
        return label.right <= link.getBoundingClientRect().right + 0.5
      })).toBe(true)
      await dockFits(dock)
      expect(await dock.evaluate((nav) => getComputedStyle(nav).transitionDuration)).toBe('0s')

      const mode = dock.getByRole('switch', { name: 'NSFW content' })
      await expect(mode).toHaveAttribute('aria-checked', 'false')
      await mode.tap()
      await expect(mode).toHaveAttribute('aria-checked', 'true')
      await expect(mode).toHaveAttribute('data-expanded', 'true')
      await dockFits(dock)
      const theme = dock.getByRole('button', { name: 'Toggle light or dark theme' })
      await theme.tap()
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
      expect(await page.locator('html').getAttribute('data-theme-reveal')).toBeNull()
      await dock.getByRole('link', { name: '中文' }).tap()
      await expect(page).toHaveURL('/privacy')
      await expect(dock).toBeHidden()
      await page.getByRole('button', { name: '导航菜单' }).tap()
      await expect(dock.getByRole('switch', { name: 'NSFW 内容' })).toHaveAttribute('aria-checked', 'true')
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
    } finally {
      await context.close()
    }
  })
}
