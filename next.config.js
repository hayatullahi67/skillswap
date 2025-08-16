/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  async rewrites() {
    return [
      {
        source: '/manifest.json',
        destination: '/api/manifest',
      },
    ]
  },
}

module.exports = nextConfig