'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PublicSupportChatWidget } from '@/components/chat/PublicSupportChatWidget'
import {
  PublicAdvertisementSlot,
  createEmptyPublicAdvertisementPlacementMap,
  type PublicAdvertisementPlacementMap,
} from '@/components/advertising/public-advertisement-slots'

export default function SearchSarafsPage() {
  const [sarafs, setSarafs] = useState<any[]>([])
  const [advertisements, setAdvertisements] = useState<PublicAdvertisementPlacementMap>(
    createEmptyPublicAdvertisementPlacementMap()
  )
  const [loading, setLoading] = useState(true)
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('Afghanistan')
  const [search, setSearch] = useState('')
  const [showSignupPrompt, setShowSignupPrompt] = useState(false)

  useEffect(() => {
    void fetchSarafs()
    void fetchAdvertisements()

    const timer = setTimeout(() => setShowSignupPrompt(true), 10000)
    return () => clearTimeout(timer)
  }, [])

  const fetchSarafs = async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams()
      if (city) params.append('city', city)
      if (country) params.append('country', country)
      if (search) params.append('search', search)

      const response = await fetch(`/api/public/sarafs?${params}`)
      const data = await response.json()

      if (data.success) {
        setSarafs(data.data.sarafs)
      }
    } catch (error) {
      console.error('Failed to fetch sarafs:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAdvertisements = async () => {
    try {
      const response = await fetch('/api/public/advertisements?positions=HERO,FEATURED,SIDEBAR,FOOTER', {
        cache: 'no-store',
      })
      const data = await response.json()

      if (data.success) {
        setAdvertisements(data.data.grouped || createEmptyPublicAdvertisementPlacementMap())
      }
    } catch (error) {
      console.error('Failed to fetch advertisements:', error)
    }
  }

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault()
    void fetchSarafs()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <h1 className="text-2xl font-bold text-indigo-600">سرای شهزاده</h1>
          <div className="flex gap-4">
            <Link href="/auth/signin" className="px-4 py-2 text-indigo-600 hover:text-indigo-800">
              ورود
            </Link>
            <Link
              href="/auth/signup"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
            >
              ثبت نام
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 pt-6">
        <PublicAdvertisementSlot placement="HERO" advertisements={advertisements.HERO} />
      </div>

      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 mt-6">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                🎁 با ثبت نام از مزایای ویژه بهره‌مند شوید!
              </h3>
              <ul className="space-y-1 text-sm text-yellow-700">
                <li>✅ تخفیف تا 20% برای کاربران VIP</li>
                <li>✅ پیگیری آنلاین حواله‌ها 24/7</li>
                <li>✅ کد تخفیف اختصاصی و جوایز ماهانه</li>
                <li>✅ نرخ ویژه برای حواله‌های بزرگ</li>
              </ul>
            </div>
            <Link
              href="/auth/signup"
              className="whitespace-nowrap rounded-lg bg-yellow-500 px-6 py-3 font-semibold text-white hover:bg-yellow-600"
            >
              ثبت نام رایگان
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <PublicAdvertisementSlot
          placement="FEATURED"
          advertisements={advertisements.FEATURED}
          className="mb-8"
        />

        <div className="mb-8 rounded-lg bg-white p-6 shadow-lg">
          <h2 className="mb-6 text-2xl font-bold text-gray-800">جستجوی صرافی</h2>
          <form onSubmit={handleSearch} className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <input
              type="text"
              placeholder="نام صرافی..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="rounded-lg border px-4 py-2 focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="text"
              placeholder="شهر..."
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className="rounded-lg border px-4 py-2 focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              className="rounded-lg border px-4 py-2 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Afghanistan">افغانستان</option>
              <option value="Iran">ایران</option>
              <option value="Pakistan">پاکستان</option>
              <option value="UAE">امارات</option>
              <option value="Turkey">ترکیه</option>
            </select>
            <button type="submit" className="rounded-lg bg-indigo-600 px-6 py-2 text-white hover:bg-indigo-700">
              جستجو
            </button>
          </form>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-600" />
            <p className="mt-4 text-gray-600">در حال بارگذاری...</p>
          </div>
        ) : (
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {sarafs.map((saraf) => (
                <div
                  key={saraf.id}
                  className="rounded-lg bg-white p-6 shadow-lg transition-shadow hover:shadow-xl"
                >
                  {saraf.isFeatured ? (
                    <span className="mb-3 inline-block rounded-full bg-yellow-400 px-3 py-1 text-xs font-semibold text-yellow-900">
                      ⭐ ویژه
                    </span>
                  ) : null}
                  <h3 className="mb-2 text-xl font-bold text-gray-800">{saraf.businessName}</h3>
                  <div className="mb-4 space-y-2 text-sm text-gray-600">
                    <p>📍 {saraf.businessAddress}</p>
                    <p>📞 {saraf.businessPhone}</p>
                    <p>⭐ امتیاز: {saraf.rating.toFixed(1)} / 5</p>
                    <p>📊 {saraf.totalTransactions} تراکنش</p>
                  </div>

                  {saraf.branches.length > 0 ? (
                    <div className="mb-4">
                      <h4 className="mb-2 font-semibold text-gray-700">شعبه‌ها:</h4>
                      <div className="space-y-1">
                        {saraf.branches.slice(0, 3).map((branch: any) => (
                          <div key={branch.id} className="text-xs text-gray-600">
                            • {branch.name} - {branch.city}
                          </div>
                        ))}
                        {saraf.branches.length > 3 ? (
                          <div className="text-xs text-indigo-600">
                            + {saraf.branches.length - 3} شعبه دیگر
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  <div className="flex gap-2">
                    <a
                      href={`tel:${saraf.businessPhone}`}
                      className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-center text-white hover:bg-green-700"
                    >
                      📞 تماس
                    </a>
                    <a
                      href={`https://wa.me/${saraf.businessPhone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 rounded-lg bg-green-500 px-4 py-2 text-center text-white hover:bg-green-600"
                    >
                      💬 واتساپ
                    </a>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Link
                      href={`/sarafs/${saraf.id}`}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-center text-white hover:bg-indigo-700"
                    >
                      مشاهده جزئیات
                    </Link>
                    <Link
                      href={`/sarafs/${saraf.id}?openChat=true`}
                      className="rounded-lg bg-slate-700 px-4 py-2 text-center text-white hover:bg-slate-800"
                    >
                      شروع چت
                    </Link>
                    <Link
                      href={`/sarafs/${saraf.id}?openHawala=true`}
                      className="rounded-lg bg-rose-600 px-4 py-2 text-center text-white hover:bg-rose-700"
                    >
                      درخواست حواله
                    </Link>
                    <Link
                      href={`/sarafs/${saraf.id}?openExchange=true`}
                      className="rounded-lg bg-violet-600 px-4 py-2 text-center text-white hover:bg-violet-700"
                    >
                      درخواست تبادله
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            <aside className="hidden xl:block">
              <div className="sticky top-6">
                <PublicAdvertisementSlot placement="SIDEBAR" advertisements={advertisements.SIDEBAR} />
              </div>
            </aside>
          </div>
        )}

        {!loading && sarafs.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-lg text-gray-600">صرافی یافت نشد</p>
          </div>
        ) : null}

        <PublicAdvertisementSlot
          placement="SIDEBAR"
          advertisements={advertisements.SIDEBAR}
          compact
          className="mt-8 xl:hidden"
        />
        <PublicAdvertisementSlot
          placement="FOOTER"
          advertisements={advertisements.FOOTER}
          className="mt-10"
        />
      </div>

      {showSignupPrompt ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl">
            <button
              onClick={() => setShowSignupPrompt(false)}
              className="float-right text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
            <div className="text-center">
              <div className="mb-4 text-5xl">🎉</div>
              <h3 className="mb-4 text-2xl font-bold text-gray-800">به سرای شهزاده خوش آمدید!</h3>
              <p className="mb-6 text-gray-600">
                با ثبت نام رایگان از تخفیفات ویژه، کدهای تخفیف، و جوایز ماهانه بهره‌مند شوید
              </p>
              <div className="space-y-3">
                <Link
                  href="/auth/signup"
                  className="block w-full rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700"
                >
                  ثبت نام رایگان
                </Link>
                <button
                  onClick={() => setShowSignupPrompt(false)}
                  className="block w-full px-6 py-3 text-gray-600 hover:text-gray-800"
                >
                  بعداً
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="container mx-auto px-4 py-8">
        <div className="rounded-lg bg-indigo-50 p-6 text-center">
          <h3 className="mb-2 text-lg font-semibold text-indigo-800">پیگیری حواله</h3>
          <p className="mb-4 text-indigo-600">
            کد پیگیری یا شماره مرجع حواله خود را دارید؟
          </p>
          <Link
            href="/track"
            className="inline-block rounded-lg bg-indigo-600 px-6 py-3 text-white hover:bg-indigo-700"
          >
            پیگیری حواله
          </Link>
        </div>
      </div>

      <PublicSupportChatWidget />
    </div>
  )
}
