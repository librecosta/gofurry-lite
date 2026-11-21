import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import type { Game } from '../src/lib/presentation'

const { games } = JSON.parse(readFileSync(new URL('../content/catalog/catalog.json', import.meta.url), 'utf8')) as { games: Game[] }
const image = '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90"><rect width="160" height="90" fill="#925336"/></svg>'

async function recordClip(page: Page, mime: string) {
  const bytes = await page.evaluate(async (mimeType) => {
    if (!MediaRecorder.isTypeSupported(mimeType)) return []
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 36
    const paint = canvas.getContext('2d')!
    const stream = canvas.captureStream(16)
    const recorder = new MediaRecorder(stream, { mimeType })
    const chunks: Blob[] = []
    recorder.ondataavailable = ({ data }) => chunks.push(data)
    const done = new Promise<void>((resolve) => { recorder.onstop = () => resolve() })
    recorder.start()
    let frame = 0
    const timer = setInterval(() => {
      paint.fillStyle = frame++ % 2 ? '#593022' : '#ba8657'
      paint.fillRect(0, 0, canvas.width, canvas.height)
    }, 45)
    await new Promise((resolve) => setTimeout(resolve, 820))
    recorder.stop()
    await done
    clearInterval(timer)
    stream.getTracks().forEach((track) => track.stop())
    return [...new Uint8Array(await new Blob(chunks).arrayBuffer())]
  }, mime)
  return Buffer.from(bytes)
}

test('screenshot-only archives keep a responsive gallery and a keyboard-accessible lightbox', async ({ page }) => {
  const game = games.find(({ id }) => id === 205)!
  await page.route(/steamstatic\.com\//, (route) => route.request().url() === game.screenshots[1]
    ? route.abort()
    : route.fulfill({ contentType: 'image/svg+xml', body: image }))
  const gallery = page.getByRole('region', { name: 'Screenshots' })
  for (const [width, colorScheme] of [[390, 'dark'], [768, 'light'], [1440, 'dark']] as const) {
    await page.setViewportSize({ width, height: 850 })
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
    await page.goto('/games/' + game.id)
    const stage = gallery.getByRole('button', { name: 'Enlarge: Screenshot 1' })
    const box = await stage.boundingBox()
    expect(box!.width / box!.height).toBeCloseTo(16 / 9, 1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
    await expect(gallery.locator('video')).toHaveCount(0)
    await stage.press('Enter')
    const dialog = gallery.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(stage).toBeFocused()
    await gallery.getByRole('button', { name: 'Screenshot 2', exact: true }).press('Space')
    await expect(gallery.getByRole('status')).toHaveText('This screenshot could not be loaded.')
  }
})

test('restricted detail defers video requests and switches native sources without retaining the player', async ({ page, request }) => {
  const game = games.find(({ rating, screenshots }) => rating === 'nsfw' && screenshots.length > 0)!
  const mp4Clip = await recordClip(page, 'video/mp4;codecs=avc1.42001f')
  const webmClip = await recordClip(page, 'video/webm;codecs=vp8')
  expect(webmClip.length).toBeGreaterThan(0)
  const movies = Array.from({ length: 5 }, (_, i) => {
    const id = String(9000000 + i)
    const base = 'https://cdn.akamai.steamstatic.com/steam/apps/' + id + '/movie_max'
    return {
      id, title: 'Test trailer ' + i, mp4: base + '.mp4', webm: base + '.webm',
      thumbnail: 'https://shared.akamai.steamstatic.com/steam/apps/' + id + '/movie.jpg',
    }
  })
  const asked: string[] = []
  await page.route(/steamstatic\.com\//, async (route) => {
    const url = route.request().url()
    if (!/\.(mp4|webm)$/.test(url)) {
      await route.fulfill({ contentType: 'image/svg+xml', body: image })
      return
    }
    asked.push(url)
    if (url === movies[0].mp4 && mp4Clip.length) {
      await route.fulfill({ contentType: 'video/mp4', body: mp4Clip })
    } else if (url === movies[1].webm || (url === movies[0].webm && !mp4Clip.length)) {
      await route.fulfill({ contentType: 'video/webm', body: webmClip })
    } else {
      await route.abort()
    }
  })
  await page.route('**/indexes/extended/game/' + game.id + '.json', (route) =>
    route.fulfill({ json: { ...game, movies } }))
  await page.goto('/games/' + game.id)
  const gallery = page.getByRole('region', { name: 'Game media' })
  await expect(gallery).toHaveCount(0)
  const raw = await (await request.get('/games/' + game.id)).text()
  expect(raw).not.toContain('store_trailers/')
  expect(raw).not.toContain(game.screenshots[0])
  await page.getByRole('switch', { name: 'NSFW content' }).click()
  await expect(gallery.getByRole('button', { name: /^Video: / })).toHaveCount(4)
  await expect(gallery.locator('video')).toHaveCount(0)
  expect(asked).toEqual([])

  const player = gallery.locator('video')
  for (const i of [0, 1]) {
    await gallery.getByRole('button', { name: 'Video: Test trailer ' + i }).click()
    await expect(player).toHaveAttribute('preload', 'metadata')
    await expect.poll(() => player.evaluate((video) => (video as HTMLVideoElement).readyState)).toBeGreaterThanOrEqual(1)
    expect(asked.indexOf(movies[i].mp4)).toBeGreaterThanOrEqual(0)
    if (i === 1) expect(asked.indexOf(movies[i].webm)).toBeGreaterThan(asked.indexOf(movies[i].mp4))
    expect(await player.evaluate((element) => {
      const video = element as HTMLVideoElement
      return video.paused && !video.autoplay && video.controls
    })).toBe(true)
    await player.evaluate((video) => (video as HTMLVideoElement).play())
    await expect.poll(() => player.evaluate((video) => (video as HTMLVideoElement).currentTime)).toBeGreaterThan(0)
    const playing = (await player.elementHandle())!
    await gallery.getByRole('button', { name: 'Screenshot 1', exact: true }).click()
    expect(await playing.evaluate((video) => (video as HTMLVideoElement).paused && !video.getAttribute('src'))).toBe(true)
    await expect(player).toHaveCount(0)
  }
  await gallery.getByRole('button', { name: 'Video: Test trailer 2' }).click()
  await expect(gallery.getByRole('status')).toHaveText('This Steam video could not be played.')
  await expect(page.locator('h1')).not.toHaveText('NSFW content')
  await page.getByRole('switch', { name: 'NSFW content' }).click()
  await expect(gallery).toHaveCount(0)
  await expect(page.locator('h1')).toHaveText('NSFW content')
})
