import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath: '/aibuilder',
  images: { unoptimized: true },
}

export default nextConfig
