import type { MetadataRoute } from 'next'
import { publicPaths, origin } from '../src/lib/routes'

export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  return publicPaths().flatMap((path) => {
    const languages = { 'zh-CN': origin + path, en: origin + '/en' + (path === '/' ? '' : path) }
    return Object.values(languages).map((url) => ({ url, alternates: { languages } }))
  })
}
