import { fetchConfiguredRssFeeds, fetchRSSFeed } from './rss-feed-service'

const DEFAULT_PERSIAN_SOURCE_KEYS = [
  'rss_zoomit',
  'rss_digikala_mag',
  'rss_tekrato',
  'rss_gadgetnews',
  'rss_arzdigital',
  'rss_coiniran',
  'rss_bbc_persian',
  'rss_dw_persian',
  'rss_radiofarda',
  'rss_itna',
  'rss_mehrnews',
  'rss_iranintl',
]

export { fetchRSSFeed }

export async function fetchAllPersianTechNews(): Promise<any[]> {
  return fetchConfiguredRssFeeds(DEFAULT_PERSIAN_SOURCE_KEYS, 50)
}
