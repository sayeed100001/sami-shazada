import type { MetadataRoute } from 'next'

const SITE_URL = 'https://www.shazada.org'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const staticPublicRoutes: Array<{
    path: string
    priority: number
    changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
  }> = [
    { path: '/', priority: 1, changeFrequency: 'daily' },
    { path: '/rates', priority: 0.9, changeFrequency: 'hourly' },
    { path: '/sarafs', priority: 0.85, changeFrequency: 'daily' },
    { path: '/support', priority: 0.72, changeFrequency: 'weekly' },
    { path: '/mobile-app', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/search', priority: 0.7, changeFrequency: 'daily' },
    { path: '/charts', priority: 0.6, changeFrequency: 'weekly' },
    { path: '/crypto', priority: 0.6, changeFrequency: 'daily' },
    { path: '/commodities', priority: 0.6, changeFrequency: 'daily' },
    { path: '/calculator', priority: 0.55, changeFrequency: 'monthly' },
    { path: '/education', priority: 0.55, changeFrequency: 'weekly' },
    { path: '/track', priority: 0.5, changeFrequency: 'weekly' },
    { path: '/vip', priority: 0.45, changeFrequency: 'weekly' },
    { path: '/community', priority: 0.45, changeFrequency: 'weekly' },
    // Allow Google to discover core auth pages for potential sitelinks.
    { path: '/auth/signin', priority: 0.35, changeFrequency: 'monthly' },
    { path: '/auth/signup', priority: 0.35, changeFrequency: 'monthly' },
    { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
    { path: '/terms', priority: 0.3, changeFrequency: 'yearly' },
    { path: '/system-status', priority: 0.25, changeFrequency: 'weekly' },
  ]

  return staticPublicRoutes.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }))
}
