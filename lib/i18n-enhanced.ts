export type SupportedLanguage = 'fa' | 'en' | 'ps'

export interface TranslationData {
  [key: string]: string | TranslationData
}

export const translations: Record<SupportedLanguage, TranslationData> = {
  fa: {
    // Navigation
    nav: {
      dashboard: 'داشبورد',
      rates: 'نرخ ارز',
      sarafs: 'صرافان',
      hawala: 'حواله',
      education: 'آموزش',
      charts: 'نمودارها',
      profile: 'پروفایل',
      settings: 'تنظیمات',
      logout: 'خروج'
    },
    // Common
    common: {
      loading: 'در حال بارگذاری...',
      error: 'خطا',
      success: 'موفقیت',
      save: 'ذخیره',
      cancel: 'لغو',
      delete: 'حذف',
      edit: 'ویرایش',
      view: 'مشاهده',
      search: 'جستجو',
      filter: 'فیلتر',
      export: 'خروجی',
      import: 'ورودی',
      refresh: 'بروزرسانی',
      back: 'بازگشت',
      next: 'بعدی',
      previous: 'قبلی',
      submit: 'ارسال',
      confirm: 'تایید',
      close: 'بستن'
    },
    // Dashboard
    dashboard: {
      title: 'داشبورد',
      welcome: 'خوش آمدید',
      totalBalance: 'موجودی کل',
      todayTransactions: 'تراکنش‌های امروز',
      activeRates: 'نرخ‌های فعال',
      recentActivity: 'فعالیت‌های اخیر',
      quickActions: 'اقدامات سریع',
      marketOverview: 'نمای کلی بازار'
    },
    // Rates
    rates: {
      title: 'نرخ ارز',
      currency: 'ارز',
      buyRate: 'نرخ خرید',
      sellRate: 'نرخ فروش',
      change: 'تغییر',
      lastUpdate: 'آخرین بروزرسانی',
      addRate: 'افزودن نرخ',
      editRate: 'ویرایش نرخ',
      deleteRate: 'حذف نرخ'
    },
    // Sarafs
    sarafs: {
      title: 'صرافان',
      name: 'نام',
      location: 'موقعیت',
      rating: 'امتیاز',
      verified: 'تایید شده',
      contact: 'تماس',
      services: 'خدمات',
      workingHours: 'ساعات کاری',
      findSaraf: 'یافتن صراف'
    },
    // Hawala
    hawala: {
      title: 'حواله',
      sendMoney: 'ارسال پول',
      trackTransfer: 'پیگیری حواله',
      transferId: 'شناسه حواله',
      sender: 'فرستنده',
      receiver: 'گیرنده',
      amount: 'مبلغ',
      status: 'وضعیت',
      fee: 'کارمزد',
      exchangeRate: 'نرخ تبدیل'
    },
    // Education
    education: {
      title: 'آموزش',
      courses: 'دوره‌ها',
      articles: 'مقالات',
      videos: 'ویدیوها',
      webinars: 'وبینارها',
      progress: 'پیشرفت',
      certificate: 'گواهینامه',
      instructor: 'مدرس',
      duration: 'مدت زمان',
      level: 'سطح'
    },
    // Forms
    forms: {
      firstName: 'نام',
      lastName: 'نام خانوادگی',
      email: 'ایمیل',
      phone: 'تلفن',
      password: 'رمز عبور',
      confirmPassword: 'تایید رمز عبور',
      address: 'آدرس',
      city: 'شهر',
      country: 'کشور',
      required: 'الزامی',
      invalid: 'نامعتبر'
    }
  },
  en: {
    // Navigation
    nav: {
      dashboard: 'Dashboard',
      rates: 'Exchange Rates',
      sarafs: 'Money Exchangers',
      hawala: 'Hawala',
      education: 'Education',
      charts: 'Charts',
      profile: 'Profile',
      settings: 'Settings',
      logout: 'Logout'
    },
    // Common
    common: {
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      view: 'View',
      search: 'Search',
      filter: 'Filter',
      export: 'Export',
      import: 'Import',
      refresh: 'Refresh',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      submit: 'Submit',
      confirm: 'Confirm',
      close: 'Close'
    },
    // Dashboard
    dashboard: {
      title: 'Dashboard',
      welcome: 'Welcome',
      totalBalance: 'Total Balance',
      todayTransactions: 'Today\'s Transactions',
      activeRates: 'Active Rates',
      recentActivity: 'Recent Activity',
      quickActions: 'Quick Actions',
      marketOverview: 'Market Overview'
    },
    // Rates
    rates: {
      title: 'Exchange Rates',
      currency: 'Currency',
      buyRate: 'Buy Rate',
      sellRate: 'Sell Rate',
      change: 'Change',
      lastUpdate: 'Last Update',
      addRate: 'Add Rate',
      editRate: 'Edit Rate',
      deleteRate: 'Delete Rate'
    },
    // Sarafs
    sarafs: {
      title: 'Money Exchangers',
      name: 'Name',
      location: 'Location',
      rating: 'Rating',
      verified: 'Verified',
      contact: 'Contact',
      services: 'Services',
      workingHours: 'Working Hours',
      findSaraf: 'Find Exchanger'
    },
    // Hawala
    hawala: {
      title: 'Hawala',
      sendMoney: 'Send Money',
      trackTransfer: 'Track Transfer',
      transferId: 'Transfer ID',
      sender: 'Sender',
      receiver: 'Receiver',
      amount: 'Amount',
      status: 'Status',
      fee: 'Fee',
      exchangeRate: 'Exchange Rate'
    },
    // Education
    education: {
      title: 'Education',
      courses: 'Courses',
      articles: 'Articles',
      videos: 'Videos',
      webinars: 'Webinars',
      progress: 'Progress',
      certificate: 'Certificate',
      instructor: 'Instructor',
      duration: 'Duration',
      level: 'Level'
    },
    // Forms
    forms: {
      firstName: 'First Name',
      lastName: 'Last Name',
      email: 'Email',
      phone: 'Phone',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      address: 'Address',
      city: 'City',
      country: 'Country',
      required: 'Required',
      invalid: 'Invalid'
    }
  },
  ps: {
    // Navigation
    nav: {
      dashboard: 'کورپاڼه',
      rates: 'د اسعارو نرخونه',
      sarafs: 'صرافان',
      hawala: 'حواله',
      education: 'زده کړه',
      charts: 'چارټونه',
      profile: 'پروفایل',
      settings: 'تنظیمات',
      logout: 'وتل'
    },
    // Common
    common: {
      loading: 'بارېږي...',
      error: 'تېروتنه',
      success: 'بریالیتوب',
      save: 'ساتل',
      cancel: 'لغوه کول',
      delete: 'ړنګول',
      edit: 'سمول',
      view: 'کتل',
      search: 'پلټنه',
      filter: 'فلټر',
      export: 'صادرول',
      import: 'وارد کول',
      refresh: 'تازه کول',
      back: 'بیرته',
      next: 'راتلونکی',
      previous: 'پخوانی',
      submit: 'سپارل',
      confirm: 'تایید',
      close: 'تړل'
    },
    // Dashboard
    dashboard: {
      title: 'کورپاڼه',
      welcome: 'ښه راغلاست',
      totalBalance: 'ټوله پیسه',
      todayTransactions: 'د نن لیږدونه',
      activeRates: 'فعال نرخونه',
      recentActivity: 'وروستي فعالیت',
      quickActions: 'ګړندي کړنې',
      marketOverview: 'د بازار کتنه'
    },
    // Rates
    rates: {
      title: 'د اسعارو نرخونه',
      currency: 'اسعار',
      buyRate: 'د پیرودلو نرخ',
      sellRate: 'د پلورلو نرخ',
      change: 'بدلون',
      lastUpdate: 'وروستي تازه کول',
      addRate: 'نرخ اضافه کول',
      editRate: 'نرخ سمول',
      deleteRate: 'نرخ ړنګول'
    },
    // Sarafs
    sarafs: {
      title: 'صرافان',
      name: 'نوم',
      location: 'ځای',
      rating: 'درجه بندي',
      verified: 'تایید شوی',
      contact: 'اړیکه',
      services: 'خدمات',
      workingHours: 'د کار ساعتونه',
      findSaraf: 'صراف موندل'
    },
    // Hawala
    hawala: {
      title: 'حواله',
      sendMoney: 'پیسې لیږل',
      trackTransfer: 'د لیږد تعقیب',
      transferId: 'د لیږد پیژندنه',
      sender: 'لیږونکی',
      receiver: 'اخیستونکی',
      amount: 'اندازه',
      status: 'حالت',
      fee: 'فیس',
      exchangeRate: 'د تبادلې نرخ'
    },
    // Education
    education: {
      title: 'زده کړه',
      courses: 'کورسونه',
      articles: 'مقالې',
      videos: 'ویډیوګانې',
      webinars: 'ویبینارونه',
      progress: 'پرمختګ',
      certificate: 'سند',
      instructor: 'ښوونکی',
      duration: 'موده',
      level: 'کچه'
    },
    // Forms
    forms: {
      firstName: 'لومړی نوم',
      lastName: 'د کورنۍ نوم',
      email: 'بریښنالیک',
      phone: 'تلیفون',
      password: 'پټنوم',
      confirmPassword: 'د پټنوم تایید',
      address: 'پته',
      city: 'ښار',
      country: 'هیواد',
      required: 'اړین',
      invalid: 'غلط'
    }
  }
}

class EnhancedI18n {
  private currentLanguage: SupportedLanguage = 'fa'
  private fallbackLanguage: SupportedLanguage = 'en'

  setLanguage(lang: SupportedLanguage) {
    this.currentLanguage = lang
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', lang)
      document.documentElement.lang = lang
      document.documentElement.dir = lang === 'fa' || lang === 'ps' ? 'rtl' : 'ltr'
    }
  }

  getLanguage(): SupportedLanguage {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('language') as SupportedLanguage
      if (stored && ['fa', 'en', 'ps'].includes(stored)) {
        return stored
      }
    }
    return this.currentLanguage
  }

  t(key: string, params?: Record<string, string>): string {
    const keys = key.split('.')
    let value: any = translations[this.currentLanguage]

    for (const k of keys) {
      value = value?.[k]
      if (value === undefined) break
    }

    // Fallback to English if not found
    if (value === undefined) {
      value = translations[this.fallbackLanguage]
      for (const k of keys) {
        value = value?.[k]
        if (value === undefined) break
      }
    }

    // Return key if translation not found
    if (typeof value !== 'string') {
      return key
    }

    // Replace parameters
    if (params) {
      return Object.entries(params).reduce(
        (str, [param, replacement]) => str.replace(`{{${param}}}`, replacement),
        value
      )
    }

    return value
  }

  // Format numbers based on language
  formatNumber(num: number): string {
    const locale = {
      fa: 'fa-IR',
      en: 'en-US',
      ps: 'ps-AF'
    }[this.currentLanguage]

    return new Intl.NumberFormat(locale).format(num)
  }

  // Format currency
  formatCurrency(amount: number, currency = 'AFN'): string {
    const locale = {
      fa: 'fa-IR',
      en: 'en-US',
      ps: 'ps-AF'
    }[this.currentLanguage]

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0
    }).format(amount)
  }

  // Format date
  formatDate(date: Date): string {
    const locale = {
      fa: 'fa-IR',
      en: 'en-US',
      ps: 'ps-AF'
    }[this.currentLanguage]

    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date)
  }

  // Get supported languages
  getSupportedLanguages() {
    return [
      { code: 'fa', name: 'فارسی', nativeName: 'فارسی' },
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'ps', name: 'Pashto', nativeName: 'پښتو' }
    ]
  }

  // Check if language is RTL
  isRTL(lang?: SupportedLanguage): boolean {
    const language = lang || this.currentLanguage
    return ['fa', 'ps'].includes(language)
  }
}

export const i18n = new EnhancedI18n()