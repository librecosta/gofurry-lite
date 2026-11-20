import type { MetadataRoute } from 'next'
import { publicPaths, languageUrls } from '../src/lib/routes'

export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  return publicPaths().flatMap((path) => {
    const languages = languageUrls(path)
    return [languages.en, languages['zh-CN']].map((url) => ({ url, alternates: { languages } }))
  })
}
