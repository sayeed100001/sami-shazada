import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'صرافان | Saray Shahzada',
  description:
    'فهرست صرافان و شعبه‌ها در سرای شهزاده: جستجو و فیلتر شهر، مشاهده صرافان تایید شده و نرخ‌های فعال.',
}

export default function SarafsLayout({ children }: { children: React.ReactNode }) {
  return children
}

