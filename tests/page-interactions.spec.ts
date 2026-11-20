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
    await page.goto('/en')
    await page.evaluate(() => scrollTo(0, 190))
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
  await page.goto('/en/about')
  const mode = page.getByRole('switch', { name: 'NSFW content' })
  const track = mode.locator(':scope > span[aria-hidden]')
  const knob = track.locator('span:last-child')
  const sfw = track.getByText('SFW', { exact: true })
  const nsfw = track.getByText('NSFW', { exact: true })
  const start = (await knob.boundingBox())!.x
  await expect(track).toHaveCSS('border-top-width', '2px')
  const initialInk = await track.evaluate((element) => getComputedStyle(element).borderColor)
  await expect(mode).toHaveAttribute('aria-checked', 'false')
  await expect(sfw).toHaveCSS('opacity', '1')
  await expect(nsfw).toHaveCSS('opacity', '0')
  const sfwBox = (await sfw.boundingBox())!
  const capsule = (await track.boundingBox())!
  expect(sfwBox.x).toBeGreaterThan(start + (await knob.boundingBox())!.width)
  expect(sfwBox.x + sfwBox.width).toBeLessThan(capsule.x + capsule.width)
  await mode.focus()
  await mode.press('ArrowRight')
  await expect(mode).toHaveAttribute('aria-checked', 'true')
  await expect(mode).toBeFocused()
  await expect.poll(async () => (await knob.boundingBox())!.x).toBeCloseTo(start + 48, 0)
  await expect(sfw).toHaveCSS('opacity', '0')
  await expect(nsfw).toHaveCSS('opacity', '1')
  const nsfwBox = (await nsfw.boundingBox())!
  expect(nsfwBox.x).toBeGreaterThan(capsule.x)
  expect(nsfwBox.x + nsfwBox.width).toBeLessThan((await knob.boundingBox())!.x)
  await expect.poll(() => track.evaluate((element) => getComputedStyle(element).borderColor)).not.toBe(initialInk)
  await page.reload()
  await expect(mode).toHaveAttribute('aria-checked', 'true')
  await mode.press('Space')
  await expect(mode).toHaveAttribute('aria-checked', 'false')
})

test('scroll gauge follows document scrolling, seeks by track, drags, and handles keyboard and resize', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.route(/steamstatic\.com/, (route) => route.abort())
  await page.goto('/en')
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
  await page.goto('/en/about')
  await expect(gauge).toBeHidden()
  await page.setViewportSize({ width: 1280, height: 230 })
  await expect(gauge).toBeVisible()
  await page.setViewportSize({ width: 1280, height: 720 })
  await expect(gauge).toBeHidden()
})

test('scroll gauge clears the mobile dock and footer exposes two centered sections', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 })
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  await page.route(/steamstatic\.com/, (route) => route.abort())
  await page.goto('/en')
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight))
  const dock = page.getByRole('navigation', { name: 'Bottom navigation' })
  const gauge = page.getByRole('slider', { name: 'Reading progress' })
  await expect(dock).toBeVisible()
  await expect(gauge).toHaveText('100%')
  const bottom = await dock.boundingBox()
  const scrolling = await gauge.boundingBox()
  expect(scrolling!.y + scrolling!.height).toBeLessThan(bottom!.y)
  const footer = page.getByRole('contentinfo')
  await expect(footer.locator(':scope > div')).toHaveCount(2)
  const channels = footer.getByRole('navigation', { name: 'Contact and official channels' })
  await expect(channels.getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', 'https://github.com/librecosta/gofurry-lite')
  await expect(channels.getByRole('link', { name: /Email LibreCosta/ })).toHaveAttribute('href', 'mailto:contact@librecosta.com')
  await expect(footer.getByRole('navigation', { name: 'Site information' })).toHaveCSS('justify-content', 'center')
  await expect(footer.getByText('© 2026 LibreCosta · GoFurry Lite')).toHaveCSS('text-align', 'center')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320)
})

test('Chinese and English home guide headings and prose are available with JavaScript disabled', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false })
  try {
    const page = await context.newPage()
    await page.route(/steamstatic\.com/, (route) => route.abort())
    for (const [path, name] of [['/', 'GoFurry Lite 导览'], ['/en', 'A guide to GoFurry Lite']]) {
      await page.goto(path)
      const guide = page.getByRole('region', { name })
      await expect(guide.getByRole('heading', { name, level: 2 })).toBeVisible()
      await expect(guide.getByRole('heading', { level: 3 })).toHaveCount(4)
      await expect(guide.getByRole('listitem')).toHaveCount(8)
      expect((await guide.innerText()).length).toBeGreaterThan(800)
    }
    await page.goto('/en/games/collections')
    await expect(page.getByRole('region', { name: 'A guide to GoFurry Lite' })).toHaveCount(0)
  } finally {
    await context.close()
  }
})
