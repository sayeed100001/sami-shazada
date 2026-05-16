import { NextResponse } from 'next/server'
import { getPublicRecaptchaConfig } from '@/lib/recaptcha'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const config = await getPublicRecaptchaConfig()
    return NextResponse.json({
      success: true,
      enabled: config.enabled,
      siteKey: config.siteKey,
      threshold: config.threshold,
      scriptUrl: config.scriptUrl,
    })
  } catch {
    return NextResponse.json({
      success: true,
      enabled: false,
      siteKey: '',
      threshold: 0.5,
      scriptUrl: '',
    })
  }
}
