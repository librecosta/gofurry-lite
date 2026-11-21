import type { NextConfig } from 'next'

const config: NextConfig = {
  output: 'export',
  trailingSlash: false,
  images: { unoptimized: true },
  poweredByHeader: false,
  devIndicators: false,
}

export default config
