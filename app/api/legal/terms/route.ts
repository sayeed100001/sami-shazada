import { NextRequest, NextResponse } from 'next/server'
import { ConfigService } from '@/lib/config-service'

export const dynamic = 'force-dynamic'

function pickLangText(lang: string, fa: string, en: string, ps: string) {
  const normalized = (lang || 'fa').toLowerCase()
  if (normalized.startsWith('en')) return en
  if (normalized.startsWith('ps')) return ps
  return fa
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lang = searchParams.get('lang') || request.headers.get('accept-language') || 'fa'

    const [enabled, key, fa, en, ps] = await Promise.all([
      ConfigService.get('terms_enabled', 'true'),
      ConfigService.get('terms_current_key', 'terms_v1'),
      ConfigService.get('terms_text_fa', 'شرایط استفاده هنوز تنظیم نشده است.'),
      ConfigService.get('terms_text_en', 'Terms of use are not configured yet.'),
      ConfigService.get('terms_text_ps', 'د کارولو شرطونه لا نه دي تنظیم شوي.'),
    ])

    return NextResponse.json({
      enabled: enabled !== 'false',
      documentKey: key || 'terms_v1',
      text: pickLangText(String(lang), fa || '', en || '', ps || ''),
    })
  } catch (error) {
    console.error('Terms GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

