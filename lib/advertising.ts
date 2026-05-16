export const ADVERTISEMENT_POSITIONS = ['HERO', 'FEATURED', 'SIDEBAR', 'FOOTER'] as const

export type AdvertisementPosition = (typeof ADVERTISEMENT_POSITIONS)[number]

export interface AdvertisementPackage {
  position: AdvertisementPosition
  code: string
  dailyPrice: number
  currency: 'AFN'
  placementTitle: string
  placementDescription: string
  billingMode: 'OFFLINE'
}

export const ADVERTISEMENT_PACKAGES: Record<AdvertisementPosition, AdvertisementPackage> = {
  HERO: {
    position: 'HERO',
    code: 'SEARCH_HERO_BANNER',
    dailyPrice: 100,
    currency: 'AFN',
    placementTitle: 'Directory hero banner',
    placementDescription: 'Large hero banner shown above the saraf directory search results.',
    billingMode: 'OFFLINE',
  },
  FEATURED: {
    position: 'FEATURED',
    code: 'DIRECTORY_FEATURED_CARD',
    dailyPrice: 75,
    currency: 'AFN',
    placementTitle: 'Featured directory card',
    placementDescription: 'Highlighted featured card shown near the top of the saraf directory.',
    billingMode: 'OFFLINE',
  },
  SIDEBAR: {
    position: 'SIDEBAR',
    code: 'DIRECTORY_SIDEBAR_POPUP',
    dailyPrice: 50,
    currency: 'AFN',
    placementTitle: 'Directory sidebar popup',
    placementDescription: 'Floating sidebar card shown while visitors browse the saraf directory.',
    billingMode: 'OFFLINE',
  },
  FOOTER: {
    position: 'FOOTER',
    code: 'DIRECTORY_FOOTER_BANNER',
    dailyPrice: 25,
    currency: 'AFN',
    placementTitle: 'Directory footer banner',
    placementDescription: 'Footer banner displayed below the public saraf directory content.',
    billingMode: 'OFFLINE',
  },
}

export function isAdvertisementPosition(value: string): value is AdvertisementPosition {
  return ADVERTISEMENT_POSITIONS.includes(value as AdvertisementPosition)
}

export function listAdvertisementPackages() {
  return ADVERTISEMENT_POSITIONS.map((position) => ADVERTISEMENT_PACKAGES[position])
}

export function getAdvertisementPackage(position: string) {
  if (!isAdvertisementPosition(position)) {
    return null
  }

  return ADVERTISEMENT_PACKAGES[position]
}

export function calculateAdvertisementPrice(position: string, duration: number) {
  const adPackage = getAdvertisementPackage(position)
  if (!adPackage) {
    return null
  }

  const normalizedDuration = Number.isFinite(duration) ? Math.max(1, Math.floor(duration)) : 1
  return adPackage.dailyPrice * normalizedDuration
}
