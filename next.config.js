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
            value: process.env.NODE_ENV === 'development' 
              ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https: wss: *; script-src 'self' 'unsafe-inline' 'unsafe-eval' https: blob: *; worker-src 'self' blob: *; style-src 'self' 'unsafe-inline' https: *; connect-src 'self' https: wss: *; img-src 'self' data: blob: https: *; media-src 'self' blob: https: *; font-src 'self' data: https: *;"
              : "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co blob:; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; connect-src 'self' https://*.supabase.co wss://*.supabase.co; img-src 'self' data: blob:; media-src 'self' blob:;",
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
