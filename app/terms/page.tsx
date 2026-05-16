import Link from 'next/link'

export const metadata = {
  title: 'شرایط و قوانین | سرای شهزاده',
  description: 'شرایط و قوانین استفاده از پلتفرم سرای شهزاده',
}

const sections = [
  {
    title: 'پذیرش قوانین',
    body:
      'با استفاده از سرای شهزاده، شما می‌پذیرید که از این پلتفرم مطابق قوانین افغانستان، مقررات مالی مرتبط و ضوابط داخلی سامانه استفاده کنید.',
  },
  {
    title: 'مسئولیت حساب کاربری',
    body:
      'کاربر مسئول حفظ محرمانگی اطلاعات ورود، صحت اطلاعات ثبت‌شده، و تمام فعالیت‌هایی است که از طریق حساب او انجام می‌شود.',
  },
  {
    title: 'تراکنش‌ها و حواله‌ها',
    body:
      'تمام درخواست‌های حواله، نرخ‌ها، پرداخت‌ها و وضعیت‌های تراکنش باید مطابق داده‌های ثبت‌شده در سیستم و تاییدهای نهایی سامانه تفسیر شوند.',
  },
  {
    title: 'محدودیت استفاده',
    body:
      'استفاده از سامانه برای فعالیت‌های غیرقانونی، تقلب، دسترسی غیرمجاز، ارسال داده نادرست یا سوءاستفاده از APIها و امکانات مدیریتی ممنوع است.',
  },
  {
    title: 'تغییر خدمات',
    body:
      'سرای شهزاده می‌تواند در راستای امنیت، نگهداری یا توسعه، بخشی از خدمات، قابلیت‌ها یا این قوانین را به‌روزرسانی کند.',
  },
]

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-amber-50 text-slate-900">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 space-y-4">
          <p className="text-sm font-semibold tracking-[0.2em] text-amber-700">LEGAL</p>
          <h1 className="text-4xl font-black sm:text-5xl">شرایط و قوانین</h1>
          <p className="max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
            این صفحه چارچوب استفاده از سامانه، مسئولیت‌های کاربران و قواعد اصلی استفاده از خدمات سرای شهزاده را مشخص می‌کند.
          </p>
        </div>

        <div className="space-y-6">
          {sections.map((section) => (
            <section
              key={section.title}
              className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur"
            >
              <h2 className="mb-3 text-xl font-bold text-slate-900">{section.title}</h2>
              <p className="text-sm leading-8 text-slate-600 sm:text-base">{section.body}</p>
            </section>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/auth/signin"
            className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            بازگشت به ورود
          </Link>
          <Link
            href="/privacy"
            className="rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
          >
            مشاهده حریم خصوصی
          </Link>
        </div>
      </div>
    </main>
  )
}
