import Link from 'next/link'

export const metadata = {
  title: 'حریم خصوصی | سرای شهزاده',
  description: 'سیاست حریم خصوصی و نحوه استفاده از داده‌ها در سرای شهزاده',
}

const privacyItems = [
  'اطلاعات حساب، تماس و تراکنش فقط برای ارائه خدمات، امنیت و پشتیبانی استفاده می‌شود.',
  'داده‌های حساس مانند کلیدها و تنظیمات امنیتی طبق سازوکارهای رمزنگاری و محدودیت دسترسی نگهداری می‌شوند.',
  'اطلاعات کاربران بدون مبنای قانونی یا ضرورت عملیاتی در اختیار اشخاص ثالث قرار نمی‌گیرد.',
  'برای بهبود امنیت، لاگ‌های عملیاتی و رویدادهای احراز هویت ممکن است ثبت و پایش شوند.',
]

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 text-slate-900">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 space-y-4">
          <p className="text-sm font-semibold tracking-[0.2em] text-emerald-700">PRIVACY</p>
          <h1 className="text-4xl font-black sm:text-5xl">حریم خصوصی</h1>
          <p className="max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
            این صفحه به‌صورت خلاصه توضیح می‌دهد چه داده‌هایی در سامانه استفاده می‌شود و این داده‌ها با چه هدفی نگهداری و پردازش می‌شوند.
          </p>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
          <ul className="space-y-4 text-sm leading-8 text-slate-600 sm:text-base">
            {privacyItems.map((item) => (
              <li key={item} className="rounded-2xl bg-slate-50 px-4 py-3">
                {item}
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/terms"
            className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            مشاهده شرایط و قوانین
          </Link>
          <Link
            href="/auth/signin"
            className="rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
          >
            بازگشت به ورود
          </Link>
        </div>
      </div>
    </main>
  )
}
