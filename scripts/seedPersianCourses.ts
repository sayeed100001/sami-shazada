import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const persianCourses = [
  {
    title: "آموزش کامل ارزهای دیجیتال برای مبتدیان",
    description: "در این دوره جامع با مفاهیم پایه ارزهای دیجیتال، بیت کوین، اتریوم و نحوه خرید و فروش آشنا میشوید",
    category: "crypto",
    level: "beginner",
    duration: 45,
    price: 0,
    isPremium: false,
    isPublished: true,
    videoUrl: "https://youtu.be/N920p250fmU",
    content: "آموزش جامع ارزهای دیجیتال از صفر تا صد",
    tags: JSON.stringify(["کریپتو", "بیت کوین", "آموزش", "مبتدی"])
  },
  {
    title: "تحلیل تکنیکال در بازار ارز",
    description: "آموزش کامل تحلیل تکنیکال، شناخت الگوها، اندیکاتورها و استراتژیهای معاملاتی",
    category: "trading",
    level: "intermediate",
    duration: 60,
    price: 0,
    isPremium: false,
    isPublished: true,
    videoUrl: "https://youtu.be/8fVJ1D5tTWE",
    content: "تحلیل تکنیکال حرفهای برای معاملهگران",
    tags: JSON.stringify(["تحلیل تکنیکال", "معاملات", "فارکس"])
  },
  {
    title: "مدیریت ریسک در سرمایهگذاری",
    description: "یادگیری اصول مدیریت ریسک، تنوعبخشی سبد سرمایه و حفظ سرمایه در بازارهای مالی",
    category: "finance",
    level: "intermediate",
    duration: 40,
    price: 0,
    isPremium: false,
    isPublished: true,
    videoUrl: "https://youtu.be/1VyMgYd8fZ4",
    content: "مدیریت ریسک برای سرمایهگذاران",
    tags: JSON.stringify(["مدیریت ریسک", "سرمایهگذاری", "مالی"])
  },
  {
    title: "آموزش بلاکچین و فناوریهای نوین",
    description: "شناخت فناوری بلاکچین، قراردادهای هوشمند و کاربردهای آن در دنیای واقعی",
    category: "crypto",
    level: "advanced",
    duration: 55,
    price: 0,
    isPremium: true,
    isPublished: true,
    videoUrl: "https://youtu.be/SSo_EIwHSd4",
    content: "بلاکچین و قراردادهای هوشمند",
    tags: JSON.stringify(["بلاکچین", "فناوری", "پیشرفته"])
  },
  {
    title: "استراتژیهای معاملاتی در فارکس",
    description: "آموزش استراتژیهای کاربردی معاملاتی، مدیریت سرمایه و روانشناسی معاملهگری",
    category: "trading",
    level: "advanced",
    duration: 70,
    price: 0,
    isPremium: true,
    isPublished: true,
    videoUrl: "https://youtu.be/dFgYN6gB0wc",
    content: "استراتژیهای حرفهای معاملاتی",
    tags: JSON.stringify(["فارکس", "استراتژی", "معاملات"])
  },
  {
    title: "آموزش سرمایهگذاری در طلا و نقره",
    description: "راهنمای کامل سرمایهگذاری در فلزات گرانبها، تحلیل بازار طلا و استراتژیهای خرید",
    category: "finance",
    level: "beginner",
    duration: 35,
    price: 0,
    isPremium: false,
    isPublished: true,
    videoUrl: "https://youtu.be/Low3uT6f5aM",
    content: "سرمایهگذاری در طلا و نقره",
    tags: JSON.stringify(["طلا", "نقره", "سرمایهگذاری"])
  },
  {
    title: "اقتصاد کلان برای سرمایهگذاران",
    description: "درک مفاهیم اقتصاد کلان، تورم، نرخ بهره و تاثیر آنها بر بازارهای مالی",
    category: "finance",
    level: "intermediate",
    duration: 50,
    price: 0,
    isPremium: false,
    isPublished: true,
    videoUrl: "https://youtu.be/PHe0bXAIuk0",
    content: "اقتصاد کلان و بازارهای مالی",
    tags: JSON.stringify(["اقتصاد", "تورم", "مالی"])
  },
  {
    title: "امنیت در معاملات ارز دیجیتال",
    description: "آموزش نحوه محافظت از داراییهای دیجیتال، کیف پولهای امن و جلوگیری از کلاهبرداری",
    category: "crypto",
    level: "beginner",
    duration: 30,
    price: 0,
    isPremium: false,
    isPublished: true,
    videoUrl: "https://youtu.be/3NL0Mfz95eY",
    content: "امنیت در دنیای کریپتو",
    tags: JSON.stringify(["امنیت", "کریپتو", "کیف پول"])
  },
  {
    title: "آموزش حواله و انتقال پول",
    description: "آشنایی با سیستم حواله، نحوه انتقال امن پول و مدیریت تراکنشها",
    category: "finance",
    level: "beginner",
    duration: 25,
    price: 0,
    isPremium: false,
    isPublished: true,
    videoUrl: "https://youtu.be/dQw4w9WgXcQ",
    content: "سیستم حواله و انتقال وجوه",
    tags: JSON.stringify(["حواله", "انتقال پول", "مالی"])
  },
  {
    title: "بازار فارکس و معاملات ارزی",
    description: "آموزش جامع بازار فارکس، جفت ارزها و نحوه معامله در بازار بینالمللی ارز",
    category: "trading",
    level: "intermediate",
    duration: 65,
    price: 0,
    isPremium: true,
    isPublished: true,
    videoUrl: "https://youtu.be/8fVJ1D5tTWE",
    content: "بازار فارکس و معاملات ارزی",
    tags: JSON.stringify(["فارکس", "ارز", "معاملات"])
  },
  {
    title: "روانشناسی معاملهگری",
    description: "شناخت احساسات در معاملات، مدیریت استرس و تصمیمگیری هوشمندانه",
    category: "trading",
    level: "advanced",
    duration: 45,
    price: 0,
    isPremium: true,
    isPublished: true,
    videoUrl: "https://youtu.be/dFgYN6gB0wc",
    content: "روانشناسی بازارهای مالی",
    tags: JSON.stringify(["روانشناسی", "معاملهگری", "استرس"])
  },
  {
    title: "آموزش استخراج ارز دیجیتال",
    description: "آشنایی با مفهوم مایننگ، انواع استخراج و نحوه شروع استخراج",
    category: "crypto",
    level: "intermediate",
    duration: 50,
    price: 0,
    isPremium: false,
    isPublished: true,
    videoUrl: "https://youtu.be/SSo_EIwHSd4",
    content: "استخراج ارزهای دیجیتال",
    tags: JSON.stringify(["مایننگ", "استخراج", "کریپتو"])
  },
  {
    title: "تحلیل بنیادی بازارهای مالی",
    description: "آموزش تحلیل بنیادی، بررسی اخبار اقتصادی و تاثیر آن بر بازارها",
    category: "trading",
    level: "intermediate",
    duration: 55,
    price: 0,
    isPremium: false,
    isPublished: true,
    videoUrl: "https://youtu.be/PHe0bXAIuk0",
    content: "تحلیل بنیادی و اخبار اقتصادی",
    tags: JSON.stringify(["تحلیل بنیادی", "اخبار", "اقتصاد"])
  },
  {
    title: "مدیریت سرمایه شخصی",
    description: "آموزش بودجهبندی، پساندازی، سرمایهگذاری و مدیریت مالی فردی",
    category: "finance",
    level: "beginner",
    duration: 40,
    price: 0,
    isPremium: false,
    isPublished: true,
    videoUrl: "https://youtu.be/1VyMgYd8fZ4",
    content: "مدیریت مالی شخصی",
    tags: JSON.stringify(["مدیریت مالی", "پساندازی", "بودجه"])
  },
  {
    title: "آموزش صرافی و تبدیل ارز",
    description: "آشنایی با کسب و کار صرافی، نحوه تبدیل ارز و مدیریت صرافی",
    category: "finance",
    level: "beginner",
    duration: 35,
    price: 0,
    isPremium: false,
    isPublished: true,
    videoUrl: "https://youtu.be/Low3uT6f5aM",
    content: "صرافی و تبدیل ارز",
    tags: JSON.stringify(["صرافی", "تبدیل ارز", "افغانستان"])
  },
  {
    title: "آموزش تریدینگ ویو (TradingView)",
    description: "آموزش کامل پلتفرم TradingView، ابزارهای ترسیم و اندیکاتورها",
    category: "trading",
    level: "beginner",
    duration: 45,
    price: 0,
    isPremium: false,
    isPublished: true,
    videoUrl: "https://youtu.be/8fVJ1D5tTWE",
    content: "آموزش پلتفرم TradingView",
    tags: JSON.stringify(["TradingView", "نمودار", "تحلیل"])
  },
  {
    title: "آموزش الگوهای قیمتی",
    description: "شناسایی الگوهای کلاسیک قیمتی، نحوه تشخیص و معامله بر اساس آنها",
    category: "trading",
    level: "intermediate",
    duration: 50,
    price: 0,
    isPremium: true,
    isPublished: true,
    videoUrl: "https://youtu.be/dFgYN6gB0wc",
    content: "الگوهای قیمتی در تحلیل تکنیکال",
    tags: JSON.stringify(["الگو", "قیمت", "تحلیل"])
  }
]

async function seedPersianCourses() {
  console.log('🌱 Starting Persian courses seeding...')

  try {
    for (const course of persianCourses) {
      const existing = await prisma.educationCourse.findFirst({
        where: { title: course.title }
      })

      if (!existing) {
        await prisma.educationCourse.create({
          data: course
        })
        console.log(`✅ Created: ${course.title}`)
      } else {
        console.log(`⏭️  Skipped: ${course.title} (already exists)`)
      }
    }

    console.log('\n✅ Persian courses seeding completed!')
    console.log(`📊 Total courses: ${persianCourses.length}`)
  } catch (error) {
    console.error('❌ Error seeding courses:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

seedPersianCourses()
