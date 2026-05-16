import type { Language } from '@/lib/i18n'

const LANGUAGE_LOCALES: Record<Language, string> = {
  fa: 'fa-AF',
  en: 'en-US',
  ps: 'ps-AF',
}

const RELATIVE_TIME_UNITS: Record<
  Language,
  {
    year: string
    month: string
    week: string
    day: string
    hour: string
    minute: string
    second: string
    now: string
    ago: string
  }
> = {
  fa: {
    year: 'سال',
    month: 'ماه',
    week: 'هفته',
    day: 'روز',
    hour: 'ساعت',
    minute: 'دقیقه',
    second: 'ثانیه',
    now: 'همین حالا',
    ago: 'پیش',
  },
  en: {
    year: 'year',
    month: 'month',
    week: 'week',
    day: 'day',
    hour: 'hour',
    minute: 'minute',
    second: 'second',
    now: 'just now',
    ago: 'ago',
  },
  ps: {
    year: 'کال',
    month: 'میاشت',
    week: 'اونۍ',
    day: 'ورځ',
    hour: 'ساعت',
    minute: 'دقیقه',
    second: 'ثانیه',
    now: 'همدا اوس',
    ago: 'مخکې',
  },
}

export function getLanguageLocale(language: Language) {
  return LANGUAGE_LOCALES[language] || LANGUAGE_LOCALES.fa
}

export function formatLocalizedDate(
  value: string | Date | null | undefined,
  language: Language,
  options?: Intl.DateTimeFormatOptions
) {
  if (!value) return ''

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat(getLanguageLocale(language), options).format(date)
}

export function formatLocalizedNumber(
  value: number,
  language: Language,
  options?: Intl.NumberFormatOptions
) {
  return new Intl.NumberFormat(getLanguageLocale(language), options).format(value)
}

export function formatLocalizedRelativeTime(value: string | Date, language: Language) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return RELATIVE_TIME_UNITS[language]?.now || RELATIVE_TIME_UNITS.fa.now
  }

  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  const copy = RELATIVE_TIME_UNITS[language] || RELATIVE_TIME_UNITS.fa

  const units: Array<{ key: keyof typeof copy; seconds: number }> = [
    { key: 'year', seconds: 31536000 },
    { key: 'month', seconds: 2592000 },
    { key: 'week', seconds: 604800 },
    { key: 'day', seconds: 86400 },
    { key: 'hour', seconds: 3600 },
    { key: 'minute', seconds: 60 },
    { key: 'second', seconds: 1 },
  ]

  for (const unit of units) {
    const count = Math.floor(diffInSeconds / unit.seconds)
    if (count > 0) {
      if (language === 'en') {
        const suffix = count === 1 ? '' : 's'
        return `${count} ${copy[unit.key]}${suffix} ${copy.ago}`
      }

      return `${formatLocalizedNumber(count, language)} ${copy[unit.key]} ${copy.ago}`
    }
  }

  return copy.now
}
