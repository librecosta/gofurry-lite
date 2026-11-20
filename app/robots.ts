import type { MetadataRoute } from 'next'
import { origin } from '../src/lib/routes'

export const dynamic = 'force-static'

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', allow: '/', disallow: ['/404', '/410', '/zh/404', '/zh/410'] }, sitemap: origin + '/sitemap.xml' }
}
