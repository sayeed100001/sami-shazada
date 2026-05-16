export const HOME_PAGE_POSITION = 'HOME_PAGE'
export const HOME_PAGE_INITIALIZED_CONFIG_KEY = 'home_page_content_initialized'

export const HOME_PAGE_SECTIONS = ['HERO', 'FEATURE_CARD', 'STAT_CARD'] as const
export type HomePageSection = typeof HOME_PAGE_SECTIONS[number]

export const HOME_PAGE_LANGUAGES = ['fa', 'en', 'ps'] as const
export type HomePageLanguage = typeof HOME_PAGE_LANGUAGES[number]

export interface HomePageContentRecord {
  id: string
  section: HomePageSection
  title: string
  badgeText?: string | null
  subtitle?: string | null
  description?: string | null
  icon?: string | null
  value?: string | null
  linkUrl?: string | null
  linkText?: string | null
  imageUrl?: string | null
  order: number
  isActive: boolean
  language: HomePageLanguage
}

export interface HomePageContentGroup {
  hero: HomePageContentRecord[]
  featureCards: HomePageContentRecord[]
  statCards: HomePageContentRecord[]
}

type SerializedHomePageContent = {
  section: HomePageSection
  badgeText?: string | null
  subtitle?: string | null
  description?: string | null
  icon?: string | null
  value?: string | null
  linkUrl?: string | null
  linkText?: string | null
  imageUrl?: string | null
  order?: number
  language?: string | null
}

function countMojibakeCharacters(value: string) {
  const matches = value.match(/[ØÙÚÛâ€™œ]/g)
  return matches ? matches.length : 0
}

function repairMojibakeText(value: string | null | undefined) {
  if (!value) {
    return value ?? null
  }

  if (!/[ØÙÚÛâ€™œ]/.test(value)) {
    return value
  }

  try {
    const bytes = Uint8Array.from(Array.from(value, (char) => char.charCodeAt(0) & 0xff))
    const repaired = new TextDecoder('utf-8').decode(bytes)

    if (!repaired) {
      return value
    }

    if (countMojibakeCharacters(repaired) < countMojibakeCharacters(value)) {
      return repaired
    }
  } catch {
    return value
  }

  return value
}

const DEFAULT_HOME_PAGE_CONTENT: Record<HomePageLanguage, Omit<HomePageContentRecord, 'id'>[]> = {
  fa: [
    {
      section: 'HERO',
      title: 'سرای شهزاده',
      badgeText: 'بروزرسانی لحظهای',
      subtitle: 'پلتفرم جامع مالی افغانستان',
      description: 'نرخ ارز لحظه‌ای • حواله سریع • صرافی معتبر',
      icon: null,
      value: null,
      linkUrl: null,
      linkText: null,
      imageUrl: null,
      order: 0,
      isActive: true,
      language: 'fa',
    },
    {
      section: 'FEATURE_CARD',
      title: 'پیگیری حواله',
      description: 'پیگیری وضعیت حواله با کد رهگیری',
      icon: 'search',
      linkUrl: '/hawala/track',
      linkText: 'پیگیری حواله',
      subtitle: null,
      value: null,
      imageUrl: null,
      order: 0,
      isActive: true,
      language: 'fa',
    },
    {
      section: 'FEATURE_CARD',
      title: 'ماشین حساب ارز',
      description: 'تبدیل ارز و محاسبه نرخ‌ها',
      icon: 'calculator',
      linkUrl: '/calculator',
      linkText: 'ماشین حساب ارز',
      subtitle: null,
      value: null,
      imageUrl: null,
      order: 1,
      isActive: true,
      language: 'fa',
    },
    {
      section: 'FEATURE_CARD',
      title: 'صرافان',
      description: 'مشاهده صرافان معتبر و نرخ‌ها',
      icon: 'building',
      linkUrl: '/sarafs',
      linkText: 'صرافان',
      subtitle: null,
      value: null,
      imageUrl: null,
      order: 2,
      isActive: true,
      language: 'fa',
    },
    {
      section: 'FEATURE_CARD',
      title: 'آموزش',
      description: 'راهنمای استفاده و مفاهیم مالی',
      icon: 'book-open',
      linkUrl: '/education',
      linkText: 'آموزش',
      subtitle: null,
      value: null,
      imageUrl: null,
      order: 3,
      isActive: true,
      language: 'fa',
    },
    {
      section: 'FEATURE_CARD',
      title: 'اپلیکیشن موبایل',
      description: 'دانلود اپ موبایل سرای شهزاده',
      icon: 'smartphone',
      linkUrl: '/mobile-app',
      linkText: 'اپلیکیشن موبایل',
      subtitle: null,
      value: null,
      imageUrl: null,
      order: 4,
      isActive: true,
      language: 'fa',
    },
    {
      section: 'FEATURE_CARD',
      title: 'نمودارها',
      description: 'مشاهده روند قیمت‌ها و تحلیل بازار',
      icon: 'trending-up',
      linkUrl: '/charts',
      linkText: 'نمودارها',
      subtitle: null,
      value: null,
      imageUrl: null,
      order: 5,
      isActive: true,
      language: 'fa',
    },
    {
      section: 'STAT_CARD',
      title: 'کاربر فعال',
      value: '10K+',
      icon: 'users',
      subtitle: null,
      description: null,
      linkUrl: null,
      linkText: null,
      imageUrl: null,
      order: 0,
      isActive: true,
      language: 'fa',
    },
    {
      section: 'STAT_CARD',
      title: 'صراف معتبر',
      value: '50+',
      icon: 'building',
      subtitle: null,
      description: null,
      linkUrl: null,
      linkText: null,
      imageUrl: null,
      order: 1,
      isActive: true,
      language: 'fa',
    },
    {
      section: 'STAT_CARD',
      title: 'پشتیبانی آنلاین',
      value: '24/7',
      icon: 'message-square',
      subtitle: null,
      description: null,
      linkUrl: null,
      linkText: null,
      imageUrl: null,
      order: 2,
      isActive: true,
      language: 'fa',
    },
    {
      section: 'STAT_CARD',
      title: 'امنیت تضمین شده',
      value: '100%',
      icon: 'shield',
      subtitle: null,
      description: null,
      linkUrl: null,
      linkText: null,
      imageUrl: null,
      order: 3,
      isActive: true,
      language: 'fa',
    },
  ],
  en: [
    {
      section: 'HERO',
      title: 'Saray Shahzada',
      badgeText: 'Live updates',
      subtitle: 'Afghanistan Financial Platform',
      description: 'Live exchange rates • Fast hawala • Trusted sarafs',
      icon: null,
      value: null,
      linkUrl: null,
      linkText: null,
      imageUrl: null,
      order: 0,
      isActive: true,
      language: 'en',
    },
    {
      section: 'FEATURE_CARD',
      title: 'Track Hawala',
      description: 'Track your hawala with a tracking code',
      icon: 'search',
      linkUrl: '/hawala/track',
      linkText: 'Track Hawala',
      subtitle: null,
      value: null,
      imageUrl: null,
      order: 0,
      isActive: true,
      language: 'en',
    },
    {
      section: 'FEATURE_CARD',
      title: 'Currency Calculator',
      description: 'Convert currencies and calculate rates',
      icon: 'calculator',
      linkUrl: '/calculator',
      linkText: 'Currency Calculator',
      subtitle: null,
      value: null,
      imageUrl: null,
      order: 1,
      isActive: true,
      language: 'en',
    },
    {
      section: 'FEATURE_CARD',
      title: 'Sarafs',
      description: 'View trusted sarafs and rates',
      icon: 'building',
      linkUrl: '/sarafs',
      linkText: 'Sarafs',
      subtitle: null,
      value: null,
      imageUrl: null,
      order: 2,
      isActive: true,
      language: 'en',
    },
    {
      section: 'FEATURE_CARD',
      title: 'Education',
      description: 'Financial guides and concepts',
      icon: 'book-open',
      linkUrl: '/education',
      linkText: 'Education',
      subtitle: null,
      value: null,
      imageUrl: null,
      order: 3,
      isActive: true,
      language: 'en',
    },
    {
      section: 'FEATURE_CARD',
      title: 'Mobile App',
      description: 'Download the Saray Shahzada mobile app',
      icon: 'smartphone',
      linkUrl: '/mobile-app',
      linkText: 'Mobile App',
      subtitle: null,
      value: null,
      imageUrl: null,
      order: 4,
      isActive: true,
      language: 'en',
    },
    {
      section: 'FEATURE_CARD',
      title: 'Charts',
      description: 'View price trends and market analysis',
      icon: 'trending-up',
      linkUrl: '/charts',
      linkText: 'Charts',
      subtitle: null,
      value: null,
      imageUrl: null,
      order: 5,
      isActive: true,
      language: 'en',
    },
    {
      section: 'STAT_CARD',
      title: 'Active Users',
      value: '10K+',
      icon: 'users',
      subtitle: null,
      description: null,
      linkUrl: null,
      linkText: null,
      imageUrl: null,
      order: 0,
      isActive: true,
      language: 'en',
    },
    {
      section: 'STAT_CARD',
      title: 'Trusted Sarafs',
      value: '50+',
      icon: 'building',
      subtitle: null,
      description: null,
      linkUrl: null,
      linkText: null,
      imageUrl: null,
      order: 1,
      isActive: true,
      language: 'en',
    },
    {
      section: 'STAT_CARD',
      title: 'Online Support',
      value: '24/7',
      icon: 'message-square',
      subtitle: null,
      description: null,
      linkUrl: null,
      linkText: null,
      imageUrl: null,
      order: 2,
      isActive: true,
      language: 'en',
    },
    {
      section: 'STAT_CARD',
      title: 'Security Guaranteed',
      value: '100%',
      icon: 'shield',
      subtitle: null,
      description: null,
      linkUrl: null,
      linkText: null,
      imageUrl: null,
      order: 3,
      isActive: true,
      language: 'en',
    },
  ],
  ps: [
    {
      section: 'HERO',
      title: 'سرای شهزاده',
      badgeText: 'ژوندی تازه‌کول',
      subtitle: 'د افغانستان جامع مالي پلاتفورم',
      description: 'ژوندی د اسعارو نرخونه • چټکه حواله • باوري صرافان',
      icon: null,
      value: null,
      linkUrl: null,
      linkText: null,
      imageUrl: null,
      order: 0,
      isActive: true,
      language: 'ps',
    },
    {
      section: 'FEATURE_CARD',
      title: 'د حوالې تعقیب',
      description: 'د حوالې حالت د تعقیب کوډ په وسیله وګورئ',
      icon: 'search',
      linkUrl: '/hawala/track',
      linkText: 'د حوالې تعقیب',
      subtitle: null,
      value: null,
      imageUrl: null,
      order: 0,
      isActive: true,
      language: 'ps',
    },
    {
      section: 'FEATURE_CARD',
      title: 'د اسعارو ماشین حساب',
      description: 'اسعار بدلول او نرخونه محاسبه کول',
      icon: 'calculator',
      linkUrl: '/calculator',
      linkText: 'ماشین حساب',
      subtitle: null,
      value: null,
      imageUrl: null,
      order: 1,
      isActive: true,
      language: 'ps',
    },
    {
      section: 'FEATURE_CARD',
      title: 'صرافان',
      description: 'باوري صرافان او نرخونه وګورئ',
      icon: 'building',
      linkUrl: '/sarafs',
      linkText: 'صرافان',
      subtitle: null,
      value: null,
      imageUrl: null,
      order: 2,
      isActive: true,
      language: 'ps',
    },
    {
      section: 'FEATURE_CARD',
      title: 'زده کړه',
      description: 'د کارونې لارښود او مالي مفاهیم',
      icon: 'book-open',
      linkUrl: '/education',
      linkText: 'زده کړه',
      subtitle: null,
      value: null,
      imageUrl: null,
      order: 3,
      isActive: true,
      language: 'ps',
    },
    {
      section: 'FEATURE_CARD',
      title: 'موبایل اپلیکیشن',
      description: 'د سرای شهزاده موبایل اپ ډاونلوډ کړئ',
      icon: 'smartphone',
      linkUrl: '/mobile-app',
      linkText: 'موبایل اپلیکیشن',
      subtitle: null,
      value: null,
      imageUrl: null,
      order: 4,
      isActive: true,
      language: 'ps',
    },
    {
      section: 'FEATURE_CARD',
      title: 'چارټونه',
      description: 'د نرخونو رجحان او د بازار تحلیل وګورئ',
      icon: 'trending-up',
      linkUrl: '/charts',
      linkText: 'چارټونه',
      subtitle: null,
      value: null,
      imageUrl: null,
      order: 5,
      isActive: true,
      language: 'ps',
    },
    {
      section: 'STAT_CARD',
      title: 'فعال کاروونکي',
      value: '10K+',
      icon: 'users',
      subtitle: null,
      description: null,
      linkUrl: null,
      linkText: null,
      imageUrl: null,
      order: 0,
      isActive: true,
      language: 'ps',
    },
    {
      section: 'STAT_CARD',
      title: 'باوري صرافان',
      value: '50+',
      icon: 'building',
      subtitle: null,
      description: null,
      linkUrl: null,
      linkText: null,
      imageUrl: null,
      order: 1,
      isActive: true,
      language: 'ps',
    },
    {
      section: 'STAT_CARD',
      title: 'آنلاین ملاتړ',
      value: '24/7',
      icon: 'message-square',
      subtitle: null,
      description: null,
      linkUrl: null,
      linkText: null,
      imageUrl: null,
      order: 2,
      isActive: true,
      language: 'ps',
    },
    {
      section: 'STAT_CARD',
      title: 'تضمین شوی امنیت',
      value: '100%',
      icon: 'shield',
      subtitle: null,
      description: null,
      linkUrl: null,
      linkText: null,
      imageUrl: null,
      order: 3,
      isActive: true,
      language: 'ps',
    },
  ],
}

export function normalizeHomePageLanguage(language?: string | null): HomePageLanguage {
  if (language && HOME_PAGE_LANGUAGES.includes(language as HomePageLanguage)) {
    return language as HomePageLanguage
  }
  return 'fa'
}

export function getDefaultHomePageContents(language: string | null | undefined): HomePageContentRecord[] {
  const normalizedLanguage = normalizeHomePageLanguage(language)
  return DEFAULT_HOME_PAGE_CONTENT[normalizedLanguage].map((item, index) => ({
    id: `default-${normalizedLanguage}-${item.section}-${index}`,
    ...item,
  }))
}

export function getAllDefaultHomePageContents(): Omit<HomePageContentRecord, 'id'>[] {
  return HOME_PAGE_LANGUAGES.flatMap((language) => DEFAULT_HOME_PAGE_CONTENT[language].map((item) => ({ ...item })))
}

export function serializeHomePageContent(record: Omit<HomePageContentRecord, 'id'>) {
  return {
    title: record.title,
    type: record.section,
    content: JSON.stringify({
      section: record.section,
      badgeText: record.badgeText || null,
      subtitle: record.subtitle || null,
      description: record.description || null,
      icon: record.icon || null,
      value: record.value || null,
      linkUrl: record.linkUrl || null,
      linkText: record.linkText || null,
      imageUrl: record.imageUrl || null,
      order: record.order,
      language: record.language,
    }),
    url: record.linkUrl || null,
    position: HOME_PAGE_POSITION,
    isActive: record.isActive,
  }
}

export function parseHomePageContentItem(item: {
  id: string
  title: string
  type: string
  content: string
  url?: string | null
  isActive: boolean
}): HomePageContentRecord | null {
  let parsedContent: SerializedHomePageContent | null = null

  try {
    const value = JSON.parse(item.content)
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      parsedContent = value as SerializedHomePageContent
    }
  } catch {
    parsedContent = null
  }

  const section = (parsedContent?.section || item.type) as HomePageSection
  if (!HOME_PAGE_SECTIONS.includes(section)) {
    return null
  }

  const language = normalizeHomePageLanguage(parsedContent?.language)

  return {
    id: item.id,
    section,
    title: repairMojibakeText(item.title) || '',
    badgeText: repairMojibakeText(parsedContent?.badgeText || null),
    subtitle: repairMojibakeText(parsedContent?.subtitle || null),
    description: repairMojibakeText(parsedContent?.description || null),
    icon: repairMojibakeText(parsedContent?.icon || null),
    value: repairMojibakeText(parsedContent?.value || null),
    linkUrl: repairMojibakeText(parsedContent?.linkUrl || item.url || null),
    linkText: repairMojibakeText(parsedContent?.linkText || null),
    imageUrl: repairMojibakeText(parsedContent?.imageUrl || null),
    order: typeof parsedContent?.order === 'number' ? parsedContent.order : 0,
    isActive: item.isActive,
    language,
  }
}

export function sortHomePageContents(contents: HomePageContentRecord[]) {
  const sectionOrder: Record<HomePageSection, number> = {
    HERO: 0,
    FEATURE_CARD: 1,
    STAT_CARD: 2,
  }

  return [...contents].sort((left, right) => {
    const sectionDiff = sectionOrder[left.section] - sectionOrder[right.section]
    if (sectionDiff !== 0) {
      return sectionDiff
    }
    return left.order - right.order
  })
}

export function groupHomePageContents(contents: HomePageContentRecord[]): HomePageContentGroup {
  const sorted = sortHomePageContents(contents)

  return {
    hero: sorted.filter((item) => item.section === 'HERO' && item.isActive),
    featureCards: sorted.filter((item) => item.section === 'FEATURE_CARD' && item.isActive),
    statCards: sorted.filter((item) => item.section === 'STAT_CARD' && item.isActive),
  }
}
