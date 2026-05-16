import { XMLParser } from 'fast-xml-parser'
import { ExternalAPIService, type ExternalApiRecord } from './external-api-service'

const DEFAULT_RSS_PLACEHOLDER_IMAGE = '/placeholder-avatar.jpg'

interface RSSItem {
  title?: string
  description?: string
  content?: string
  'content:encoded'?: string
  link?: string
  pubDate?: string
  'dc:date'?: string
  'media:content'?: { '@_url'?: string }
  'media:thumbnail'?: { '@_url'?: string }
  enclosure?: { '@_url'?: string; '@_type'?: string }
  image?: string
}

interface RSSFeedResponse {
  rss?: {
    channel?: {
      item?: RSSItem | RSSItem[]
    }
  }
}

function getFieldValue(fields: Record<string, string> | undefined, key: string) {
  if (!fields) return ''
  const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]+/g, '')
  return fields[key] || fields[normalizedKey] || ''
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function normalizeItems(payload: RSSFeedResponse) {
  const rawItems = payload.rss?.channel?.item
  if (Array.isArray(rawItems)) {
    return rawItems
  }

  return rawItems ? [rawItems] : []
}

function extractImageUrl(item: RSSItem) {
  if (item['media:content']?.['@_url']) {
    return item['media:content']['@_url']
  }

  if (item['media:thumbnail']?.['@_url']) {
    return item['media:thumbnail']['@_url']
  }

  if (item.enclosure?.['@_url'] && item.enclosure?.['@_type']?.includes('image')) {
    return item.enclosure['@_url']
  }

  if (item.image) {
    return item.image
  }

  const richContent = item['content:encoded'] || item.content || item.description || ''
  const imageMatch = richContent.match(/<img[^>]+src=["']([^"']+)["']/i)
  if (imageMatch?.[1]) {
    return imageMatch[1]
  }

  return DEFAULT_RSS_PLACEHOLDER_IMAGE
}

function normalizePublishedAt(item: RSSItem) {
  const candidate = item.pubDate || item['dc:date'] || new Date().toISOString()
  const date = new Date(candidate)
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
}

function buildNewsItem(item: RSSItem, source: { key: string; name: string; fields?: Record<string, string> }, index: number) {
  const rawDescription = item.description || item['content:encoded'] || item.content || ''
  const cleanDescription = stripHtml(rawDescription).slice(0, 300)

  return {
    id: `${source.key}-${Date.now()}-${index}`,
    title: (item.title || 'Untitled').trim(),
    description: cleanDescription,
    content: item['content:encoded'] || item.content || cleanDescription,
    url: item.link || '',
    source: source.name,
    category: getFieldValue(source.fields, 'newsCategory') || 'technology',
    language: getFieldValue(source.fields, 'language') || 'fa',
    imageUrl: extractImageUrl(item),
    publishedAt: normalizePublishedAt(item),
    isActive: true,
    views: 0,
    createdAt: new Date().toISOString(),
  }
}

async function fetchAndParseFeed(url: string, sourceName: string) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'SarayShahzada/1.0',
      Accept: 'application/rss+xml, application/xml, text/xml, application/atom+xml',
      'Cache-Control': 'no-cache',
      'Accept-Language': 'fa,en;q=0.9',
    },
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    throw new Error(`RSS fetch failed for ${sourceName}: HTTP ${response.status}`)
  }

  const xmlText = await response.text()
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseTagValue: false,
    trimValues: true,
  })

  return parser.parse(xmlText) as RSSFeedResponse
}

export async function fetchRSSFeed(
  url: string,
  source: string,
  options?: {
    category?: string
    language?: string
    sourceKey?: string
  }
): Promise<any[]> {
  try {
    const payload = await fetchAndParseFeed(url, source)
    return normalizeItems(payload)
      .slice(0, 10)
      .map((item, index) =>
        buildNewsItem(
          item,
          {
            key: options?.sourceKey || source.replace(/[^a-z0-9]+/gi, '_').toLowerCase(),
            name: source,
            fields: {
              newsCategory: options?.category || 'technology',
              language: options?.language || 'fa',
            },
          },
          index
        )
      )
      .filter((item) => Boolean(item.url))
  } catch (error) {
    console.error(`Error fetching RSS from ${url}:`, error)
    return []
  }
}

async function fetchConfiguredSource(api: ExternalApiRecord) {
  try {
    const payload = await fetchAndParseFeed(api.baseUrl, api.name)
    return normalizeItems(payload)
      .slice(0, 10)
      .map((item, index) => buildNewsItem(item, api, index))
      .filter((item) => Boolean(item.url))
  } catch (error) {
    console.error(`Error fetching configured RSS source ${api.key}:`, error)
    return []
  }
}

export async function fetchConfiguredRssFeeds(sourceKeys?: string[], limit = 50): Promise<any[]> {
  const sources = await ExternalAPIService.getContentFeedConfigs(sourceKeys)
  if (sources.length === 0) {
    return []
  }

  const results = await Promise.allSettled(sources.map((source) => fetchConfiguredSource(source)))
  const allNews: any[] = []

  results.forEach((result) => {
    if (result.status === 'fulfilled' && result.value.length > 0) {
      allNews.push(...result.value)
    }
  })

  return allNews
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, limit)
}

export function getEducationPlaceholderImage() {
  return DEFAULT_RSS_PLACEHOLDER_IMAGE
}
