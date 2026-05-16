import { NextResponse } from 'next/server'
import { ConfigService } from '@/lib/config-service'
import { ConfigEnforcer } from '@/lib/config-enforcer'

export const dynamic = 'force-dynamic'

export async function GET() {
  const enabled = (await ConfigService.get('forgot_password_enabled', 'true')) === 'true'
  const otpSettings = await ConfigEnforcer.getOtpChannelAvailability()
  const preferredPhoneChannel = await ConfigEnforcer.getPreferredPhoneOtpChannel()

  return NextResponse.json({
    enabled,
    otpEnabled: otpSettings.otpEnabled,
    otpMethod: otpSettings.method,
    emailEnabled: otpSettings.emailEnabled,
    smsEnabled: otpSettings.smsEnabled,
    whatsappEnabled: otpSettings.whatsappEnabled,
    availableChannels: enabled ? otpSettings.availableChannels : [],
    availablePhoneChannels: enabled ? otpSettings.availablePhoneChannels : [],
    preferredPhoneChannel: enabled ? preferredPhoneChannel : null,
  })
}
