import { test, expect, type Locator } from '@playwright/test'

async function revealFrames(button: Locator) {
  return button.evaluateHandle((element) => {
    const root = document.documentElement
    const result = new Promise<{
      center: { x: number; y: number }; frames: { radius: number; x: number; y: number }[]
    }>((resolve) => {
      element.addEventListener('click', () => {
        const bounds = element.getBoundingClientRect()
        const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
        const frames: { radius: number; x: number; y: number }[] = []
        const deadline = performance.now() + 1600
        function sample(now: number) {
          const clip = getComputedStyle(root, '::view-transition-new(root)').clipPath
          const circle = /^circle\(([\d.]+)px at ([\d.]+)px ([\d.]+)px\)$/.exec(clip)
          if (circle) frames.push({ radius: +circle[1], x: +circle[2], y: +circle[3] })
          if (now > deadline || (frames.length && !root.hasAttribute('data-theme-reveal'))) resolve({ center, frames })
          else requestAnimationFrame(sample)
        }
        requestAnimationFrame(sample)
      }, { capture: true, once: true })
    })
    return { result }
  })
}

for (const width of [1440, 390]) {
  test(`theme reveal expands from the active control at ${width}px without moving the page`, async ({ page }) => {
    await page.setViewportSize({ width, height: 820 })
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' })
    await page.route(/steamstatic\.com/, (route) => route.abort())
    await page.goto('/')
    await page.evaluate((width) => scrollTo(0, width < 768 ? 90 : 190), width)
    const trigger = page.getByRole('button', { name: 'Toggle light or dark theme' })
    await expect(trigger).toBeEnabled()
    const scrollBefore = await page.evaluate(() => scrollY)
    const trace = await revealFrames(trigger)
    const button = (await trigger.boundingBox())!
    await page.mouse.click(button.x + button.width / 2, button.y + button.height / 2)
    const { center, frames } = await trace.evaluate((data) => data.result)
    await trace.dispose()
    expect(frames.length).toBeGreaterThan(3)
    for (const frame of frames) {
      expect(frame.x).toBeCloseTo(center.x, 0)
      expect(frame.y).toBeCloseTo(center.y, 0)
    }
    expect(frames.at(-1)!.radius - frames[0].radius).toBeGreaterThan(350)
    expect(await page.evaluate(() => scrollY)).toBe(scrollBefore)
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.locator('html')).not.toHaveAttribute('data-theme-reveal')
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  })
}

test('desktop content switch keeps the mode label opposite the knob inside the capsule', async ({ page }) => {
  await page.route(/steamstatic\.com/, (route) => route.abort())
  await page.goto('/about')
  const mode = page.getByRole('switch', { name: 'NSFW content' })
  const track = mode.locator(':scope > span[aria-hidden]')
  const knob = track.locator('span:last-child')
  const sfw = track.getByText('SFW', { exact: true })
  const nsfw = track.getByText('NSFW', { exact: true })
  const labelOffset = (rating: 'sfw' | 'nsfw') => track.evaluate((element, value) => {
    const capsule = element.getBoundingClientRect()
    const border = parseFloat(getComputedStyle(element).borderLeftWidth)
    const thumb = element.lastElementChild!.getBoundingClientRect()
    const range = document.createRange()
    range.selectNodeContents(element.querySelector(`[data-mode-label="${value}"]`)!)
    const text = range.getBoundingClientRect()
    const center = value === 'sfw' ? (thumb.right + capsule.right - border) / 2 : (capsule.left + border + thumb.left) / 2
    return text.left + text.width / 2 - center
  }, rating)
  const start = (await knob.boundingBox())!.x
  await expect(track).toHaveCSS('border-top-width', '2px')
  const initialInk = await track.evaluate((element) => getComputedStyle(element).borderColor)
  await expect(mode).toHaveAttribute('aria-checked', 'false')
  await expect(sfw).toHaveCSS('opacity', '1')
  await expect(nsfw).toHaveCSS('opacity', '0')
  expect(await labelOffset('sfw')).toBeCloseTo(0, 0)
  await mode.focus()
  await mode.press('ArrowRight')
  await expect(mode).toHaveAttribute('aria-checked', 'true')
  await expect(mode).toBeFocused()
  await expect.poll(async () => (await knob.boundingBox())!.x).toBeCloseTo(start + 48, 0)
  await expect(sfw).toHaveCSS('opacity', '0')
  await expect(nsfw).toHaveCSS('opacity', '1')
  expect(await labelOffset('nsfw')).toBeCloseTo(0, 0)
  await expect.poll(() => track.evaluate((element) => getComputedStyle(element).borderColor)).not.toBe(initialInk)
  await page.reload()
  await expect(mode).toHaveAttribute('aria-checked', 'true')
  await mode.press('Space')
  await expect(mode).toHaveAttribute('aria-checked', 'false')
})

test('theme changes after footer hover keep footer and capsule colors on the current palette', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 800 })
  await page.emulateMedia({ colorScheme: 'light' })
  await page.route(/steamstatic\.com/, (route) => route.abort())
  await page.goto('/')
  const theme = page.getByRole('button', { name: 'Toggle light or dark theme' })
  const capsule = page.getByRole('switch', { name: 'NSFW content' })
  await capsule.click()
  const track = capsule.locator(':scope > span[aria-hidden]')
  const modeColor = () => track.evaluate((element) => getComputedStyle(element).borderColor)
  await expect.poll(() => track.evaluate((element) => Number(getComputedStyle(element).getPropertyValue('--mode-accent')))).toBe(1)
  const lightTrack = await modeColor()

  const footer = page.getByRole('contentinfo')
  const about = footer.getByRole('link', { name: 'About' })
  const legacy = footer.getByRole('link', { name: 'Legacy groups' })
  const copyright = footer.getByRole('link', { name: /The Best Furry Sites!/ })
  const ink = (link: Locator) => link.evaluate((element) => getComputedStyle(element).color)
  const lightInk = await ink(about)
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight))
  await legacy.hover()
  await expect.poll(() => legacy.evaluate((element) => {
    const underline = getComputedStyle(element, '::after')
    return [underline.height, underline.transform]
  })).toEqual(['3px', 'matrix(1, 0, 0, 1, 0, 0)'])
  await copyright.hover()
  await expect.poll(() => copyright.evaluate((element) => Number(getComputedStyle(element).getPropertyValue('--footer-hover')))).toBe(1)

  const control = (await theme.boundingBox())!
  await page.mouse.click(control.x + control.width / 2, control.y + control.height / 2)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('html')).not.toHaveAttribute('data-theme-reveal')
  const darkInk = await ink(about)
  expect(darkInk).not.toBe(lightInk)
  await expect.poll(() => ink(legacy)).toBe(darkInk)
  await expect.poll(() => ink(copyright)).toBe(darkInk)
  expect(await modeColor()).not.toBe(lightTrack)

  await legacy.hover()
  await expect.poll(() => ink(legacy)).not.toBe(darkInk)
  await page.mouse.click(control.x + control.width / 2, control.y + control.height / 2)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect.poll(() => ink(legacy)).toBe(lightInk)
  await expect.poll(modeColor).toBe(lightTrack)
})

test('scroll gauge follows document scrolling, seeks by track, drags, and handles keyboard and resize', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.route(/steamstatic\.com/, (route) => route.abort())
  await page.goto('/')
  const gauge = page.getByRole('slider', { name: 'Reading progress' })
  await expect(gauge).toBeVisible()
  await expect(page.locator('html')).toHaveCSS('scrollbar-width', 'none')
  await expect(gauge).toHaveText('0%')
  const readScroll = () => page.evaluate(() => scrollY / (document.documentElement.scrollHeight - document.documentElement.clientHeight))
  await page.mouse.move(200, 220)
  await page.mouse.wheel(0, 500)
  await expect.poll(readScroll).toBeGreaterThan(0)
  const rail = gauge.locator(':scope > span')
  const bounds = (await rail.boundingBox())!
  const x = bounds.x + bounds.width / 2
  await page.mouse.click(x, bounds.y + bounds.height * .7)
  await expect.poll(readScroll).toBeCloseTo(.7, 1)
  await expect(gauge).toHaveText(/^(6\d|7\d)%$/)
  await page.mouse.move(x, bounds.y + bounds.height * .7)
  await page.mouse.down()
  await page.mouse.move(x, bounds.y + bounds.height * .3)
  await expect(gauge).toHaveAttribute('data-dragging', 'true')
  expect(await readScroll()).toBeCloseTo(.3, 1)
  await page.mouse.up()
  await expect(gauge).not.toHaveAttribute('data-dragging')
  await gauge.press('PageDown')
  await expect.poll(readScroll).toBeCloseTo(.4, 1)
  await gauge.press('PageUp')
  await expect.poll(readScroll).toBeCloseTo(.3, 1)
  await gauge.press('ArrowDown')
  await expect.poll(readScroll).toBeGreaterThan(.31)
  await gauge.press('End')
  await expect(gauge).toHaveText('100%')
  await expect(gauge).toHaveAttribute('aria-valuenow', '100')
  await gauge.press('Home')
  await expect(gauge).toHaveText('0%')
  expect(await readScroll()).toBe(0)
  await page.goto('/about')
  await expect(gauge).toBeHidden()
  await page.setViewportSize({ width: 1280, height: 230 })
  await expect(gauge).toBeVisible()
  await page.setViewportSize({ width: 1280, height: 720 })
  await expect(gauge).toBeHidden()
})

test('mobile bottom bands span the viewport and the copyright follows the current year', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 })
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  await page.clock.setFixedTime(new Date('2026-11-20T00:00:00Z'))
  await page.route(/steamstatic\.com/, (route) => route.abort())
  await page.goto('/')
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight))
  const dock = page.getByRole('navigation', { name: 'Bottom navigation' })
  const gauge = page.getByRole('slider', { name: 'Reading progress' })
  await expect(dock).toBeVisible()
  await expect(gauge).toHaveText('100%')
  const bottom = await dock.boundingBox()
  const scrolling = await gauge.boundingBox()
  expect(scrolling!.y + scrolling!.height).toBeLessThan(bottom!.y)
  const footer = page.getByRole('contentinfo')
  const footerBands = footer.locator(':scope > div')
  await expect(footerBands).toHaveCount(2)
  const guide = page.getByRole('region', { name: 'A guide to GoFurry Lite' })
  const colors = []
  for (const band of [guide, footerBands.first(), footerBands.last()]) {
    const bounds = (await band.boundingBox())!
    expect(bounds.x).toBe(0)
    expect(bounds.width).toBe(320)
    await expect(band).toHaveCSS('border-top-width', '0px')
    await expect(band).toHaveCSS('border-radius', '0px')
    colors.push(await band.evaluate((element) => getComputedStyle(element).backgroundColor))
  }
  expect(new Set(colors).size).toBe(3)
  const copyrightBand = (await footerBands.last().boundingBox())!
  expect(copyrightBand.y + copyrightBand.height).toBeCloseTo(700, 0)
  const channels = footer.getByRole('navigation', { name: 'Contact and official channels' })
  const github = channels.getByRole('link', { name: 'GitHub' })
  await expect(github).toHaveAttribute('href', 'https://github.com/librecosta/gofurry-lite')
  const x = channels.getByRole('link', { name: 'X @LibreCostaHQ' })
  await expect(x).toHaveAttribute('href', 'https://x.com/LibreCostaHQ')
  await expect(x).toHaveAttribute('rel', 'noopener noreferrer')
  const iconBounds = await github.boundingBox()
  const initialInk = await github.evaluate((element) => getComputedStyle(element).color)
  const iconSurface = await github.evaluate((element) => getComputedStyle(element).backgroundColor)
  expect(iconSurface).not.toBe('rgba(0, 0, 0, 0)')
  await github.hover()
  await expect.poll(() => github.evaluate((element) => getComputedStyle(element).color)).not.toBe(initialInk)
  await expect(github).toHaveCSS('border-top-width', '0px')
  await expect(github).toHaveCSS('border-radius', '50%')
  await expect(github).not.toHaveCSS('background-color', iconSurface)
  expect(await github.boundingBox()).toEqual(iconBounds)
  await expect(channels.getByRole('link', { name: /Email LibreCosta/ })).toHaveAttribute('href', 'mailto:contact@librecosta.com')
  await expect(footer.getByRole('navigation', { name: 'Site information' })).toHaveCSS('justify-content', 'center')
  const copyright = footer.getByRole('link', { name: '© 2026 GoFurry · The Best Furry Sites!' })
  await expect(copyright).toHaveAttribute('href', 'https://gofurry.com')
  await expect(footerBands.last()).toHaveCSS('text-align', 'center')
  await page.clock.setFixedTime(new Date('2029-01-01T00:00:00Z'))
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(footer.getByRole('link', { name: '© 2026-2029 GoFurry · The Best Furry Sites!' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320)
})

test('Chinese and English home guide headings and prose are available with JavaScript disabled', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false })
  try {
    const page = await context.newPage()
    await page.route(/steamstatic\.com/, (route) => route.abort())
    for (const [path, name] of [['/zh', 'GoFurry Lite 导览'], ['/', 'A guide to GoFurry Lite']]) {
      await page.goto(path)
      const guide = page.getByRole('region', { name })
      await expect(guide.getByRole('heading', { name, level: 2 })).toBeVisible()
      await expect(guide.getByRole('heading', { level: 3 })).toHaveCount(4)
      await expect(guide.getByRole('listitem')).toHaveCount(8)
      expect((await guide.innerText()).length).toBeGreaterThan(800)
      expect(await guide.evaluate((element) => element.getBoundingClientRect().width)).toBe(await page.evaluate(() => innerWidth))
    }
    await page.goto('/games/collections')
    await expect(page.getByRole('region', { name: 'A guide to GoFurry Lite' })).toHaveCount(0)
  } finally {
    await context.close()
  }
})
