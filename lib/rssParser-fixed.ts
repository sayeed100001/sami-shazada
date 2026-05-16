import { fetchConfiguredRssFeeds, fetchRSSFeed } from './rss-feed-service'

const FALLBACK_SOURCE_KEYS = ['rss_bbc_persian', 'rss_dw_persian', 'rss_voa_persian']

export { fetchRSSFeed }

export async function fetchAllPersianTechNews(): Promise<any[]> {
  return fetchConfiguredRssFeeds(FALLBACK_SOURCE_KEYS, 30)
}
