import type { MetadataRoute } from 'next'

const SITE_URL = 'https://www.shazada.org'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/auth/signin', '/auth/signup', '/auth/saraf-signup', '/support'],
        disallow: [
          '/admin/',
          '/portal/',
          '/api/',
          '/management/',
          '/user/',
          '/settings/',
          '/test-permissions/',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
