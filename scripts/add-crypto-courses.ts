import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const cryptoCourses = [
  {
    title: 'آموزش جامع ارزهای دیجیتال برای مبتدیان',
    description: 'در این دوره کامل با دنیای ارزهای دیجیتال آشنا می‌شوید. از مفاهیم پایه تا نحوه خرید و فروش و نگهداری امن ارزها.',
    category: 'crypto',
    level: 'beginner',
    duration: 180,
    price: 0,
    isPremium: false,
    isPublished: true,
    thumbnailUrl: 'https://img.youtube.com/vi/41JCpzvnn_0/maxresdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=41JCpzvnn_0',
    content: `
# آموزش جامع ارزهای دیجیتال

## سرفصل‌های دوره:

### 1. مقدمه و آشنایی با بلاکچین
- بلاکچین چیست؟
- تاریخچه بیت کوین
- تفاوت ارزهای دیجیتال با پول سنتی

### 2. انواع ارزهای دیجیتال
- بیت کوین (Bitcoin)
- اتریوم (Ethereum)
- آلت کوین‌ها
- استیبل کوین‌ها

### 3. نحوه خرید و فروش
- صرافی‌های معتبر
- کیف پول‌های دیجیتال
- امنیت در معاملات

### 4. تحلیل بازار
- تحلیل تکنیکال پایه
- شاخص‌های مهم
- مدیریت ریسک

### 5. نگهداری امن
- کیف پول سرد و گرم
- کلیدهای خصوصی
- امنیت دو مرحله‌ای

**مدت دوره:** 3 ساعت
**سطح:** مبتدی
**زبان:** فارسی

**لینک ویدیو:** https://www.youtube.com/watch?v=41JCpzvnn_0
    `,
    tags: JSON.stringify(['کریپتو', 'بیت کوین', 'بلاکچین', 'آموزش مبتدی', 'ارز دیجیتال']),
    rating: 4.5,
    enrollments: 0
  },
  {
    title: 'تحلیل تکنیکال در بازار کریپتو',
    description: 'آموزش کامل تحلیل تکنیکال برای معامله‌گری در بازار ارزهای دیجیتال. از الگوهای کندل استیک تا اندیکاتورهای پیشرفته.',
    category: 'crypto',
    level: 'intermediate',
    duration: 240,
    price: 0,
    isPremium: false,
    isPublished: true,
    thumbnailUrl: 'https://img.youtube.com/vi/XZQJCFMRu3k/maxresdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=XZQJCFMRu3k',
    content: `
# تحلیل تکنیکال در بازار کریپتو

## محتوای دوره:

### 1. مبانی تحلیل تکنیکال
- نمودارهای قیمت
- الگوهای کندل استیک
- خطوط روند و حمایت/مقاومت

### 2. اندیکاتورهای اصلی
- میانگین متحرک (MA)
- RSI و MACD
- باند بولینگر
- فیبوناچی

### 3. الگوهای نموداری
- الگوهای بازگشتی
- الگوهای ادامه‌دهنده
- سر و شانه
- مثلث‌ها و پرچم‌ها

### 4. استراتژی‌های معاملاتی
- معامله روزانه (Day Trading)
- معامله نوسانی (Swing Trading)
- مدیریت سرمایه
- حد ضرر و حد سود

### 5. روانشناسی معامله‌گری
- کنترل احساسات
- صبر و انضباط
- اشتباهات رایج

**مدت دوره:** 4 ساعت
**سطح:** متوسط
**زبان:** فارسی

**لینک ویدیو:** https://www.youtube.com/watch?v=XZQJCFMRu3k
    `,
    tags: JSON.stringify(['تحلیل تکنیکال', 'کریپتو', 'معامله‌گری', 'اندیکاتور', 'نمودار']),
    rating: 4.7,
    enrollments: 0
  },
  {
    title: 'اقتصاد کلان و تأثیر آن بر بازارهای مالی',
    description: 'درک عمیق از اقتصاد کلان و نحوه تأثیر آن بر بازارهای مالی، ارز و کریپتو. مناسب برای سرمایه‌گذاران و معامله‌گران.',
    category: 'finance',
    level: 'intermediate',
    duration: 200,
    price: 0,
    isPremium: false,
    isPublished: true,
    thumbnailUrl: 'https://img.youtube.com/vi/PHe0bXAIuk0/maxresdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=PHe0bXAIuk0',
    content: `
# اقتصاد کلان و بازارهای مالی

## سرفصل‌ها:

### 1. مبانی اقتصاد کلان
- تولید ناخالص داخلی (GDP)
- تورم و کاهش ارزش پول
- نرخ بهره و سیاست‌های پولی
- بیکاری و اشتغال

### 2. بانک‌های مرکزی
- نقش فدرال رزرو
- سیاست‌های انبساطی و انقباضی
- کنترل نقدینگی
- تأثیر بر بازارها

### 3. شاخص‌های اقتصادی
- CPI و PPI
- PMI و شاخص اعتماد مصرف‌کننده
- تراز تجاری
- داده‌های اشتغال

### 4. تأثیر بر بازارهای مالی
- ارتباط طلا و دلار
- تأثیر بر بازار سهام
- ارزهای دیجیتال و اقتصاد کلان
- بحران‌های مالی

### 5. تحلیل فاندامنتال
- خواندن اخبار اقتصادی
- تقویم اقتصادی
- پیش‌بینی روندها
- استراتژی سرمایه‌گذاری

**مدت دوره:** 3.5 ساعت
**سطح:** متوسط
**زبان:** فارسی

**لینک ویدیو:** https://www.youtube.com/watch?v=PHe0bXAIuk0
    `,
    tags: JSON.stringify(['اقتصاد کلان', 'بازار مالی', 'تحلیل فاندامنتال', 'سرمایه‌گذاری', 'بانک مرکزی']),
    rating: 4.6,
    enrollments: 0
  },
  {
    title: 'دیفای (DeFi) و آینده مالی غیرمتمرکز',
    description: 'آشنایی کامل با دنیای دیفای، پروتکل‌های وام‌دهی، استیکینگ، ییلد فارمینگ و فرصت‌های سرمایه‌گذاری در مالی غیرمتمرکز.',
    category: 'crypto',
    level: 'advanced',
    duration: 150,
    price: 0,
    isPremium: true,
    isPublished: true,
    thumbnailUrl: 'https://img.youtube.com/vi/k9HYC0EJU6E/maxresdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=k9HYC0EJU6E',
    content: `
# دیفای (DeFi) - مالی غیرمتمرکز

## محتوای دوره:

### 1. مقدمه‌ای بر DeFi
- DeFi چیست؟
- تفاوت با مالی سنتی
- مزایا و معایب
- پروتکل‌های اصلی

### 2. کیف پول‌های غیرمتمرکز
- MetaMask
- Trust Wallet
- اتصال به dApps
- امنیت کیف پول

### 3. صرافی‌های غیرمتمرکز (DEX)
- Uniswap
- PancakeSwap
- SushiSwap
- نقدینگی و Liquidity Pool

### 4. وام‌دهی و قرض‌گیری
- Aave
- Compound
- MakerDAO
- ریسک‌ها و بازدهی

### 5. Staking و Yield Farming
- استیکینگ چیست؟
- ییلد فارمینگ
- محاسبه APY
- استراتژی‌های سودآور

### 6. NFT و Metaverse
- توکن‌های غیرقابل تعویض
- بازار NFT
- کاربردهای واقعی
- آینده متاورس

**مدت دوره:** 2.5 ساعت
**سطح:** پیشرفته
**زبان:** فارسی

**لینک ویدیو:** https://www.youtube.com/watch?v=k9HYC0EJU6E
    `,
    tags: JSON.stringify(['DeFi', 'دیفای', 'مالی غیرمتمرکز', 'استیکینگ', 'ییلد فارمینگ', 'NFT']),
    rating: 4.8,
    enrollments: 0
  },
  {
    title: 'مدیریت ریسک و سرمایه در بازارهای مالی',
    description: 'آموزش اصول مدیریت ریسک، تنوع‌بخشی سبد سرمایه، استراتژی‌های حفاظت از سرمایه و روانشناسی سرمایه‌گذاری.',
    category: 'finance',
    level: 'intermediate',
    duration: 120,
    price: 0,
    isPremium: false,
    isPublished: true,
    thumbnailUrl: 'https://img.youtube.com/vi/1pwV-jRWNbI/maxresdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=1pwV-jRWNbI',
    content: `
# مدیریت ریسک و سرمایه

## سرفصل‌های دوره:

### 1. اصول مدیریت ریسک
- ریسک چیست؟
- انواع ریسک در بازارهای مالی
- نسبت ریسک به بازده
- محاسبه ریسک

### 2. مدیریت سرمایه
- قانون 1-2 درصد
- اندازه پوزیشن
- حد ضرر و حد سود
- نسبت ریسک به ریوارد

### 3. تنوع‌بخشی سبد
- اهمیت تنوع
- انواع دارایی‌ها
- توزیع سرمایه
- ریبالانس سبد

### 4. استراتژی‌های محافظتی
- هجینگ (Hedging)
- استاپ لاس
- تریلینگ استاپ
- بیمه سبد

### 5. روانشناسی سرمایه‌گذاری
- ترس و طمع
- FOMO و FUD
- صبر و انضباط
- برنامه‌ریزی بلندمدت

### 6. اشتباهات رایج
- اورلوریج
- عدم استاپ لاس
- معامله احساسی
- عدم تحقیق

**مدت دوره:** 2 ساعت
**سطح:** متوسط
**زبان:** فارسی

**لینک ویدیو:** https://www.youtube.com/watch?v=1pwV-jRWNbI
    `,
    tags: JSON.stringify(['مدیریت ریسک', 'مدیریت سرمایه', 'سرمایه‌گذاری', 'تنوع‌بخشی', 'روانشناسی']),
    rating: 4.7,
    enrollments: 0
  },
  {
    title: 'بیت کوین: از صفر تا صد',
    description: 'آموزش کامل بیت کوین از مفاهیم پایه تا پیشرفته. استخراج، نحوه کار شبکه، امنیت و آینده بیت کوین.',
    category: 'crypto',
    level: 'beginner',
    duration: 160,
    price: 0,
    isPremium: false,
    isPublished: true,
    thumbnailUrl: 'https://img.youtube.com/vi/Gc2en3nHxA4/maxresdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=Gc2en3nHxA4',
    content: `
# بیت کوین: از صفر تا صد

## محتوای دوره:

### 1. تاریخچه بیت کوین
- ساتوشی ناکاموتو
- وایت پیپر بیت کوین
- اولین تراکنش
- تکامل بیت کوین

### 2. فناوری بلاکچین
- بلاک و زنجیره
- ماینینگ و اثبات کار
- نودها و شبکه
- امنیت شبکه

### 3. کیف پول بیت کوین
- انواع کیف پول
- کیف پول سخت‌افزاری
- کلید خصوصی و عمومی
- بکاپ و امنیت

### 4. خرید و فروش
- صرافی‌های معتبر
- P2P
- ATM بیت کوین
- کارمزدها

### 5. استخراج بیت کوین
- ماینینگ چیست؟
- سخت‌افزار مورد نیاز
- استخرهای استخراج
- سودآوری

### 6. آینده بیت کوین
- Lightning Network
- Taproot
- پذیرش جهانی
- چالش‌ها و فرصت‌ها

**مدت دوره:** 2.5 ساعت
**سطح:** مبتدی
**زبان:** فارسی

**لینک ویدیو:** https://www.youtube.com/watch?v=Gc2en3nHxA4
    `,
    tags: JSON.stringify(['بیت کوین', 'Bitcoin', 'بلاکچین', 'ماینینگ', 'کیف پول']),
    rating: 4.6,
    enrollments: 0
  }
]

async function main() {
  console.log('🚀 شروع اضافه کردن کورسهای کریپتو و اقتصاد...\n')

  let addedCount = 0
  let skippedCount = 0

  for (const course of cryptoCourses) {
    try {
      // بررسی اینکه کورس قبلاً وجود دارد یا نه
      const existing = await prisma.educationCourse.findFirst({
        where: { title: course.title }
      })

      if (existing) {
        console.log(`⏭️  کورس "${course.title}" قبلاً وجود دارد - رد شد`)
        skippedCount++
        continue
      }

      // اضافه کردن کورس جدید
      const created = await prisma.educationCourse.create({
        data: course
      })

      console.log(`✅ کورس "${course.title}" با موفقیت اضافه شد`)
      console.log(`   📁 دسته: ${course.category}`)
      console.log(`   📊 سطح: ${course.level}`)
      console.log(`   ⏱️  مدت: ${course.duration} دقیقه`)
      console.log(`   🎬 ویدیو: ${course.videoUrl}`)
      console.log(`   💎 پریمیوم: ${course.isPremium ? 'بله' : 'خیر'}`)
      console.log(`   📢 منتشر شده: ${course.isPublished ? 'بله' : 'خیر'}\n`)
      
      addedCount++
    } catch (error) {
      console.error(`❌ خطا در اضافه کردن کورس "${course.title}":`, error)
    }
  }

  console.log('\n📊 خلاصه:')
  console.log(`✅ تعداد کورس‌های اضافه شده: ${addedCount}`)
  console.log(`⏭️  تعداد کورس‌های رد شده: ${skippedCount}`)
  console.log(`📚 مجموع کورس‌ها: ${cryptoCourses.length}`)
  
  // نمایش تعداد کل کورس‌ها در دیتابیس
  const totalCourses = await prisma.educationCourse.count()
  console.log(`\n💾 تعداد کل کورس‌ها در دیتابیس: ${totalCourses}`)
  
  // نمایش کورس‌های منتشر شده
  const publishedCourses = await prisma.educationCourse.count({
    where: { isPublished: true }
  })
  console.log(`📢 تعداد کورس‌های منتشر شده: ${publishedCourses}`)
  
  // نمایش کورس‌های کریپتو
  const cryptoCoursesCount = await prisma.educationCourse.count({
    where: { category: 'crypto' }
  })
  console.log(`🪙 تعداد کورس‌های کریپتو: ${cryptoCoursesCount}`)
  
  // نمایش کورس‌های اقتصاد
  const financeCoursesCount = await prisma.educationCourse.count({
    where: { category: 'finance' }
  })
  console.log(`💰 تعداد کورس‌های اقتصاد: ${financeCoursesCount}`)
  
  console.log('\n✨ عملیات با موفقیت انجام شد!')
  console.log('🎓 کورس‌ها در بخش آموزش قابل مشاهده هستند')
  console.log('⚙️  ادمین می‌تواند از پنل ادمین آنها را ویرایش یا حذف کند')
}

main()
  .catch((e) => {
    console.error('❌ خطای کلی:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
