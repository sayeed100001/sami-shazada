import { fetchConfiguredRssFeeds, fetchRSSFeed } from './rss-feed-service'

const TECH_ONLY_SOURCE_KEYS = ['rss_zoomit', 'rss_digikala_mag', 'rss_arzdigital']

export { fetchRSSFeed }

export async function fetchAllPersianTechNews(): Promise<any[]> {
  return fetchConfiguredRssFeeds(TECH_ONLY_SOURCE_KEYS, 30)
}
