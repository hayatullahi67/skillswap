// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   async headers() {
//     return [
//       {
//         source: '/(.*)',
//         headers: [
//           {
//             key: 'X-Content-Type-Options',
//             value: 'nosniff',
//           },
//           {
//             key: 'Content-Security-Policy',
//             value: "default-src 'self' 'unsafe-inline' 'unsafe-eval' *.zoom.us *.zoomgov.com *.supabase.co data: blob:; connect-src 'self' *.supabase.co *.zoom.us *.zoomgov.com; img-src 'self' data: blob: *.zoom.us *.zoomgov.com; media-src 'self' blob: *.zoom.us *.zoomgov.com;",
//           },
//           {
//             key: 'Referrer-Policy',
//             value: 'strict-origin-when-cross-origin',
//           },
//         ],
//       },
//     ]
//   },
// }

// module.exports = nextConfig




/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.zoom.us https://*.zoomgov.com https://*.supabase.co; connect-src 'self' https://*.supabase.co https://*.zoom.us https://*.zoomgov.com; img-src 'self' data: blob: https://*.zoom.us https://*.zoomgov.com; media-src 'self' blob: https://*.zoom.us https://*.zoomgov.com;",
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
