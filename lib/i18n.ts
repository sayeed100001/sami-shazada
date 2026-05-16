export type Language = 'fa' | 'en' | 'ps'

export type TranslationKey = 
  | 'appName'
  | 'dashboard'
  | 'charts'
  | 'crypto'
  | 'commodities'
  | 'calculator'
  | 'rates'
  | 'hawala'
  | 'sarafs'
  | 'portal'
  | 'transactions'
  | 'reports'
  | 'admin'
  | 'userManagement'
  | 'sarafApproval'
  | 'transactionMonitoring'
  | 'systemReports'
  | 'systemSettings'
  | 'systemManagement'
  | 'systemStatus'
  | 'totalUsers'
  | 'activeSarafs'
  | 'pendingApproval'
  | 'totalTransactions'
  | 'pendingTransactions'
  | 'totalVolume'
  | 'quickActions'
  | 'recentActivity'
  | 'profile'
  | 'settings'
  | 'notifications'
  | 'navigation'
  | 'account'
  | 'adminPanel'
  | 'user'
  | 'saraf'
  | 'logout'
  | 'login'
  | 'signup'
  | 'email'
  | 'password'
  | 'name'
  | 'phone'
  | 'address'
  | 'save'
  | 'cancel'
  | 'delete'
  | 'edit'
  | 'add'
  | 'search'
  | 'filter'
  | 'loading'
  | 'error'
  | 'success'
  | 'warning'
  | 'info'
  | 'confirm'
  | 'yes'
  | 'no'
  | 'close'
  | 'open'
  | 'submit'
  | 'reset'
  | 'clear'
  | 'select'
  | 'all'
  | 'none'
  | 'today'
  | 'yesterday'
  | 'thisWeek'
  | 'thisMonth'
  | 'thisYear'
  | 'total'
  | 'amount'
  | 'currency'
  | 'date'
  | 'time'
  | 'status'
  | 'active'
  | 'inactive'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'cancelled'
  | 'price'
  | 'change'
  | 'volume'
  | 'marketCap'
  | 'high'
  | 'low'
  | 'buy'
  | 'sell'
  | 'exchange'
  | 'convert'
  | 'from'
  | 'to'
  | 'result'
  | 'history'
  | 'details'
  | 'description'
  | 'category'
  | 'type'
  | 'reference'
  | 'code'
  | 'track'
  | 'send'
  | 'receive'
  | 'sender'
  | 'receiver'
  | 'fee'
  | 'commission'
  | 'rate'
  | 'live'
  | 'realTime'
  | 'update'
  | 'refresh'
  | 'new'
  | 'recent'
  | 'popular'
  | 'trending'
  | 'top'
  | 'best'
  | 'worst'
  | 'more'
  | 'less'
  | 'show'
  | 'hide'
  | 'expand'
  | 'collapse'
  | 'next'
  | 'previous'
  | 'first'
  | 'last'
  | 'page'
  | 'of'
  | 'items'
  | 'results'
  | 'found'
  | 'notFound'
  | 'empty'
  | 'full'
  | 'available'
  | 'unavailable'
  | 'online'
  | 'offline'
  | 'connected'
  | 'disconnected'
  | 'welcome'
  | 'goodbye'
  | 'hello'
  | 'thanks'
  | 'please'
  | 'sorry'
  | 'help'
  | 'support'
  | 'contact'
  | 'about'
  | 'privacy'
  | 'terms'
  | 'language'
  | 'theme'
  | 'dark'
  | 'light'
  | 'auto'
  | 'education'

export const translations: Record<Language, Record<TranslationKey, string>> = {
  fa: {
    appName: 'سرای شهزاده',
    dashboard: 'داشبورد',
    charts: 'نمودارها',
    crypto: 'رمزارز',
    commodities: 'کالاها',
    calculator: 'ماشین حساب',
    rates: 'نرخ ارز',
    hawala: 'حواله',
    sarafs: 'صرافان',
    portal: 'پورتال',
    transactions: 'تراکنش‌ها',
    reports: 'گزارشات',
    admin: 'مدیر',
    userManagement: 'مدیریت کاربران',
    sarafApproval: 'تایید صرافان',
    transactionMonitoring: 'نظارت بر تراکنش‌ها',
    systemReports: 'گزارشات سیستم',
    systemSettings: 'تنظیمات سیستم',
    systemManagement: 'مدیریت سیستم',
    systemStatus: 'وضعیت سیستم',
    totalUsers: 'کل کاربران',
    activeSarafs: 'صرافان فعال',
    pendingApproval: 'در انتظار تایید',
    totalTransactions: 'کل تراکنشها',
    pendingTransactions: 'تراکنشهای در انتظار',
    totalVolume: 'کل حجم',
    quickActions: 'عملیات سریع',
    recentActivity: 'فعالیتهای اخیر',
    profile: 'پروفایل',
    settings: 'تنظیمات',
    notifications: 'اعلانات',
    navigation: 'ناوبری',
    account: 'حساب',
    adminPanel: 'پنل مدیریت',
    user: 'کاربر',
    saraf: 'صراف',
    logout: 'خروج',
    login: 'ورود',
    signup: 'ثبت نام',
    email: 'ایمیل',
    password: 'رمز عبور',
    name: 'نام',
    phone: 'تلفن',
    address: 'آدرس',
    save: 'ذخیره',
    cancel: 'لغو',
    delete: 'حذف',
    edit: 'ویرایش',
    add: 'افزودن',
    search: 'جستجو',
    filter: 'فیلتر',
    loading: 'در حال بارگذاری...',
    error: 'خطا',
    success: 'موفقیت',
    warning: 'هشدار',
    info: 'اطلاعات',
    confirm: 'تایید',
    yes: 'بله',
    no: 'خیر',
    close: 'بستن',
    open: 'باز کردن',
    submit: 'ارسال',
    reset: 'بازنشانی',
    clear: 'پاک کردن',
    select: 'انتخاب',
    all: 'همه',
    none: 'هیچ',
    today: 'امروز',
    yesterday: 'دیروز',
    thisWeek: 'این هفته',
    thisMonth: 'این ماه',
    thisYear: 'امسال',
    total: 'مجموع',
    amount: 'مقدار',
    currency: 'ارز',
    date: 'تاریخ',
    time: 'زمان',
    status: 'وضعیت',
    active: 'فعال',
    inactive: 'غیرفعال',
    pending: 'در انتظار',
    approved: 'تایید شده',
    rejected: 'رد شده',
    completed: 'تکمیل شده',
    cancelled: 'لغو شده',
    price: 'قیمت',
    change: 'تغییر',
    volume: 'حجم',
    marketCap: 'ارزش بازار',
    high: 'بالا',
    low: 'پایین',
    buy: 'خرید',
    sell: 'فروش',
    exchange: 'تبادل',
    convert: 'تبدیل',
    from: 'از',
    to: 'به',
    result: 'نتیجه',
    history: 'تاریخچه',
    details: 'جزئیات',
    description: 'توضیحات',
    category: 'دسته‌بندی',
    type: 'نوع',
    reference: 'مرجع',
    code: 'کد',
    track: 'پیگیری',
    send: 'ارسال',
    receive: 'دریافت',
    sender: 'فرستنده',
    receiver: 'گیرنده',
    fee: 'کارمزد',
    commission: 'کمیسیون',
    rate: 'نرخ',
    live: 'زنده',
    realTime: 'لحظه‌ای',
    update: 'بروزرسانی',
    refresh: 'تازه‌سازی',
    new: 'جدید',
    recent: 'اخیر',
    popular: 'محبوب',
    trending: 'پرطرفدار',
    top: 'برتر',
    best: 'بهترین',
    worst: 'بدترین',
    more: 'بیشتر',
    less: 'کمتر',
    show: 'نمایش',
    hide: 'مخفی',
    expand: 'گسترش',
    collapse: 'جمع کردن',
    next: 'بعدی',
    previous: 'قبلی',
    first: 'اول',
    last: 'آخر',
    page: 'صفحه',
    of: 'از',
    items: 'آیتم',
    results: 'نتایج',
    found: 'یافت شد',
    notFound: 'یافت نشد',
    empty: 'خالی',
    full: 'پر',
    available: 'موجود',
    unavailable: 'ناموجود',
    online: 'آنلاین',
    offline: 'آفلاین',
    connected: 'متصل',
    disconnected: 'قطع شده',
    welcome: 'خوش آمدید',
    goodbye: 'خداحافظ',
    hello: 'سلام',
    thanks: 'متشکرم',
    please: 'لطفاً',
    sorry: 'متاسفم',
    help: 'کمک',
    support: 'پشتیبانی',
    contact: 'تماس',
    about: 'درباره',
    privacy: 'حریم خصوصی',
    terms: 'شرایط',
    language: 'زبان',
    theme: 'تم',
    dark: 'تیره',
    light: 'روشن',
    auto: 'خودکار',
    education: 'آموزش'
  },
  en: {
    appName: 'Saray Shazada',
    dashboard: 'Dashboard',
    charts: 'Charts',
    crypto: 'Cryptocurrency',
    commodities: 'Commodities',
    calculator: 'Calculator',
    rates: 'Exchange Rates',
    hawala: 'Hawala',
    sarafs: 'Money Changers',
    portal: 'Portal',
    transactions: 'Transactions',
    reports: 'Reports',
    admin: 'Admin',
    userManagement: 'User Management',
    sarafApproval: 'Saraf Approval',
    transactionMonitoring: 'Transaction Monitoring',
    systemReports: 'System Reports',
    systemSettings: 'System Settings',
    systemManagement: 'System Management',
    systemStatus: 'System Status',
    totalUsers: 'Total Users',
    activeSarafs: 'Active Sarafs',
    pendingApproval: 'Pending Approval',
    totalTransactions: 'Total Transactions',
    pendingTransactions: 'Pending Transactions',
    totalVolume: 'Total Volume',
    quickActions: 'Quick Actions',
    recentActivity: 'Recent Activity',
    profile: 'Profile',
    settings: 'Settings',
    notifications: 'Notifications',
    navigation: 'Navigation',
    account: 'Account',
    adminPanel: 'Admin Panel',
    user: 'User',
    saraf: 'Money Changer',
    logout: 'Logout',
    login: 'Login',
    signup: 'Sign Up',
    email: 'Email',
    password: 'Password',
    name: 'Name',
    phone: 'Phone',
    address: 'Address',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search: 'Search',
    filter: 'Filter',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    warning: 'Warning',
    info: 'Information',
    confirm: 'Confirm',
    yes: 'Yes',
    no: 'No',
    close: 'Close',
    open: 'Open',
    submit: 'Submit',
    reset: 'Reset',
    clear: 'Clear',
    select: 'Select',
    all: 'All',
    none: 'None',
    today: 'Today',
    yesterday: 'Yesterday',
    thisWeek: 'This Week',
    thisMonth: 'This Month',
    thisYear: 'This Year',
    total: 'Total',
    amount: 'Amount',
    currency: 'Currency',
    date: 'Date',
    time: 'Time',
    status: 'Status',
    active: 'Active',
    inactive: 'Inactive',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    completed: 'Completed',
    cancelled: 'Cancelled',
    price: 'Price',
    change: 'Change',
    volume: 'Volume',
    marketCap: 'Market Cap',
    high: 'High',
    low: 'Low',
    buy: 'Buy',
    sell: 'Sell',
    exchange: 'Exchange',
    convert: 'Convert',
    from: 'From',
    to: 'To',
    result: 'Result',
    history: 'History',
    details: 'Details',
    description: 'Description',
    category: 'Category',
    type: 'Type',
    reference: 'Reference',
    code: 'Code',
    track: 'Track',
    send: 'Send',
    receive: 'Receive',
    sender: 'Sender',
    receiver: 'Receiver',
    fee: 'Fee',
    commission: 'Commission',
    rate: 'Rate',
    live: 'Live',
    realTime: 'Real Time',
    update: 'Update',
    refresh: 'Refresh',
    new: 'New',
    recent: 'Recent',
    popular: 'Popular',
    trending: 'Trending',
    top: 'Top',
    best: 'Best',
    worst: 'Worst',
    more: 'More',
    less: 'Less',
    show: 'Show',
    hide: 'Hide',
    expand: 'Expand',
    collapse: 'Collapse',
    next: 'Next',
    previous: 'Previous',
    first: 'First',
    last: 'Last',
    page: 'Page',
    of: 'of',
    items: 'Items',
    results: 'Results',
    found: 'Found',
    notFound: 'Not Found',
    empty: 'Empty',
    full: 'Full',
    available: 'Available',
    unavailable: 'Unavailable',
    online: 'Online',
    offline: 'Offline',
    connected: 'Connected',
    disconnected: 'Disconnected',
    welcome: 'Welcome',
    goodbye: 'Goodbye',
    hello: 'Hello',
    thanks: 'Thanks',
    please: 'Please',
    sorry: 'Sorry',
    help: 'Help',
    support: 'Support',
    contact: 'Contact',
    about: 'About',
    privacy: 'Privacy',
    terms: 'Terms',
    language: 'Language',
    theme: 'Theme',
    dark: 'Dark',
    light: 'Light',
    auto: 'Auto',
    education: 'Education'
  },
  ps: {
    appName: 'د شهزادې سرای',
    dashboard: 'ډشبورډ',
    charts: 'چارټونه',
    crypto: 'کریپټو',
    commodities: 'توکي',
    calculator: 'محاسبه کونکی',
    rates: 'د تبادلې نرخونه',
    hawala: 'حواله',
    sarafs: 'صرافان',
    portal: 'پورټل',
    transactions: 'لیږدونه',
    reports: 'راپورونه',
    admin: 'اډمین',
    userManagement: 'د کاروونکو مدیریت',
    sarafApproval: 'د صرافانو تصدیق',
    transactionMonitoring: 'د لیږدونو څارنه',
    systemReports: 'د سیسټم راپورونه',
    systemSettings: 'د سیسټم تنظیمات',
    systemManagement: 'د سیسټم مدیریت',
    systemStatus: 'د سیسټم حالت',
    totalUsers: 'ټول کاروونکي',
    activeSarafs: 'فعال صرافان',
    pendingApproval: 'د تصدیق په انتظار کې',
    totalTransactions: 'ټول لیږدونه',
    pendingTransactions: 'د انتظار لیږدونه',
    totalVolume: 'ټول حجم',
    quickActions: 'چټک عملیات',
    recentActivity: 'وروستي فعالیتونه',
    profile: 'پروفایل',
    settings: 'تنظیمات',
    notifications: 'اطلاعیې',
    navigation: 'لارښود',
    account: 'حساب',
    adminPanel: 'د اډمین پینل',
    user: 'کاروونکی',
    saraf: 'صراف',
    logout: 'وتل',
    login: 'ننوتل',
    signup: 'نوم لیکنه',
    email: 'بریښنالیک',
    password: 'پټنوم',
    name: 'نوم',
    phone: 'تلیفون',
    address: 'پته',
    save: 'ساتل',
    cancel: 'لغوه کول',
    delete: 'ړنګول',
    edit: 'سمول',
    add: 'اضافه کول',
    search: 'لټون',
    filter: 'فلټر',
    loading: 'بارېږي...',
    error: 'تېروتنه',
    success: 'بریالیتوب',
    warning: 'خبرداری',
    info: 'معلومات',
    confirm: 'تصدیق',
    yes: 'هو',
    no: 'نه',
    close: 'تړل',
    open: 'پرانیستل',
    submit: 'سپارل',
    reset: 'بیا تنظیمول',
    clear: 'پاکول',
    select: 'غوره کول',
    all: 'ټول',
    none: 'هیڅ',
    today: 'نن',
    yesterday: 'پرون',
    thisWeek: 'دا اونۍ',
    thisMonth: 'دا میاشت',
    thisYear: 'دا کال',
    total: 'ټولټال',
    amount: 'اندازه',
    currency: 'اسعارو',
    date: 'نیټه',
    time: 'وخت',
    status: 'حالت',
    active: 'فعال',
    inactive: 'غیر فعال',
    pending: 'پاتې',
    approved: 'تصدیق شوی',
    rejected: 'رد شوی',
    completed: 'بشپړ شوی',
    cancelled: 'لغوه شوی',
    price: 'بیه',
    change: 'بدلون',
    volume: 'حجم',
    marketCap: 'د بازار ارزښت',
    high: 'لوړ',
    low: 'ټیټ',
    buy: 'پیرودل',
    sell: 'پلورل',
    exchange: 'تبادله',
    convert: 'بدلول',
    from: 'له',
    to: 'ته',
    result: 'پایله',
    history: 'تاریخ',
    details: 'جزئیات',
    description: 'تشریح',
    category: 'کټګورۍ',
    type: 'ډول',
    reference: 'حواله',
    code: 'کوډ',
    track: 'تعقیب',
    send: 'لیږل',
    receive: 'ترلاسه کول',
    sender: 'لیږونکی',
    receiver: 'اخیستونکی',
    fee: 'فیس',
    commission: 'کمیسیون',
    rate: 'نرخ',
    live: 'ژوندی',
    realTime: 'ریښتینی وخت',
    update: 'تازه کول',
    refresh: 'بیا تازه کول',
    new: 'نوی',
    recent: 'وروستی',
    popular: 'مشهور',
    trending: 'رواج لرونکی',
    top: 'غوره',
    best: 'غوره',
    worst: 'بدترین',
    more: 'نور',
    less: 'لږ',
    show: 'ښودل',
    hide: 'پټول',
    expand: 'پراخول',
    collapse: 'راټولول',
    next: 'راتلونکی',
    previous: 'پخوانی',
    first: 'لومړی',
    last: 'وروستی',
    page: 'پاڼه',
    of: 'د',
    items: 'توکي',
    results: 'پایلې',
    found: 'موندل شوی',
    notFound: 'ونه موندل شو',
    empty: 'تش',
    full: 'ډک',
    available: 'شتون لري',
    unavailable: 'شتون نلري',
    online: 'آنلاین',
    offline: 'آفلاین',
    connected: 'وصل',
    disconnected: 'قطع شوی',
    welcome: 'ښه راغلاست',
    goodbye: 'د خدای په امان',
    hello: 'سلام',
    thanks: 'مننه',
    please: 'مهرباني وکړئ',
    sorry: 'بخښنه غواړم',
    help: 'مرسته',
    support: 'ملاتړ',
    contact: 'اړیکه',
    about: 'په اړه',
    privacy: 'محرمیت',
    terms: 'شرایط',
    language: 'ژبه',
    theme: 'تیم',
    dark: 'تیاره',
    light: 'روښانه',
    auto: 'اتوماتیک',
    education: 'زده کړه'
  }
}

export function t(key: TranslationKey, language: Language = 'fa'): string {
  return translations[language]?.[key] || translations.fa[key] || key
}