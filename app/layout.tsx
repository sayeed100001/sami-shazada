import type { Metadata, Viewport } from 'next'
import './globals.css'
import './dark-mode-fix.css'
import { Providers } from '@/components/providers'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { SystemConfigProvider } from '@/contexts/SystemConfigContext'
import { ConfigService } from '@/lib/config-service'

const SITE_URL = 'https://www.shazada.org'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export async function generateMetadata(): Promise<Metadata> {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return {
      metadataBase: new URL(SITE_URL),
      alternates: { canonical: '/' },
      title: 'Saray Shahzada (سرای شهزاده)',
      description:
        'Saray Shahzada (سرای شهزاده): rates, saraf directory, hawala tracking, exchange tools, and financial services platform for Afghanistan.',
      keywords:
        'Saray Shahzada, Saray Shazada, Sarai Shahzada, سرای شهزاده, saraf, hawala, afghanistan, exchange, gold, silver, crypto',
      authors: [{ name: 'Saray Shahzada Team' }],
      robots: 'index, follow',
      openGraph: {
        title: 'Saray Shahzada (سرای شهزاده)',
        description: 'Rates, saraf directory, hawala tracking, and exchange tools for Afghanistan.',
        type: 'website',
        locale: 'fa_AF',
        url: SITE_URL,
        siteName: 'Saray Shahzada',
      },
      icons: {
        icon: '/favicon.ico',
      },
    }
  }

  const siteTitle =
    (await ConfigService.get('site_title', 'سرای شهزاده | Saray Shahzada (Sarai Shahzada)')) ||
    'Saray Shahzada'
  const siteDescription =
    (await ConfigService.get(
      'site_description',
      'سرای شهزاده (Saray Shahzada): نرخ‌ها، فهرست صرافان، پیگیری حواله، و ابزارهای تبادله برای افغانستان.'
    )) ||
    'Integrated financial platform'
  const faviconUrl = (await ConfigService.get('favicon_url', '/favicon.ico')) || '/favicon.ico'
  const logoUrl = (await ConfigService.get('logo_url', '/logo.png')) || '/logo.png'

  return {
    metadataBase: new URL(SITE_URL),
    alternates: { canonical: '/' },
    title: siteTitle,
    description: siteDescription,
    keywords:
      'Saray Shahzada, Saray Shazada, Sarai Shahzada, سرای شهزاده, صرافی, حواله, افغانستان, ارز, طلا, نقره, کریپتو',
    authors: [{ name: 'Saray Shahzada Team' }],
    robots: 'index, follow',
    openGraph: {
      title: siteTitle,
      description: siteDescription,
      type: 'website',
      locale: 'fa_AF',
      url: SITE_URL,
      siteName: 'Saray Shahzada',
      images: logoUrl ? [logoUrl] : undefined,
    },
    icons: {
      icon: faviconUrl,
      apple: logoUrl,
    },
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                '@context': 'https://schema.org',
                '@type': 'Organization',
                name: 'Saray Shahzada',
                alternateName: ['Saray Shazada', 'Sarai Shahzada', 'سرای شهزاده'],
                url: SITE_URL,
                logo: `${SITE_URL}/logo.png`,
              },
              {
                '@context': 'https://schema.org',
                '@type': 'WebSite',
                name: 'Saray Shahzada',
                alternateName: ['Saray Shazada', 'Sarai Shahzada', 'سرای شهزاده'],
                url: SITE_URL,
                potentialAction: {
                  '@type': 'SearchAction',
                  target: `${SITE_URL}/search?q={search_term_string}`,
                  'query-input': 'required name=search_term_string',
                },
              },
            ]),
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const lang = localStorage.getItem('language') || 'fa';
                  const isRTL = lang === 'fa' || lang === 'ps';
                  document.documentElement.lang = lang;
                  document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
                  document.documentElement.setAttribute('data-language', lang);
                } catch (e) {
                  document.documentElement.lang = 'fa';
                  document.documentElement.dir = 'rtl';
                }
              })();
            `,
          }}
        />
      </head>
      <body className="font-vazir" suppressHydrationWarning>
        <ErrorBoundary>
          <SystemConfigProvider>
            <ThemeProvider>
              <Providers>
                {children}
                <Toaster />
                <Sonner />
              </Providers>
            </ThemeProvider>
          </SystemConfigProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
