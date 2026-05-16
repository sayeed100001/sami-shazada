import { ConfigService } from './config-service'
import { ExternalAPIService } from './external-api-service'

export class SMSService {
  static async sendSMS(to: string, message: string) {
    try {
      const config = await ConfigService.getSmsConfig()

      if (!config.enabled) {
        console.log('SMS service disabled, skipping SMS to:', to)
        return { success: false, message: 'SMS service disabled' }
      }

      switch (config.provider) {
        case 'kavenegar':
          return await this.sendKavenegar(to, message, config)
        case 'ghasedak':
          return await this.sendGhasedak(to, message, config)
        case 'twilio':
          return await this.sendTwilio(to, message, config)
        case 'nexmo':
          return await this.sendNexmo(to, message, config)
        case 'afghansms':
          return await this.sendAfghanSMS(to, message)
        default:
          throw new Error(`Unsupported SMS provider: ${config.provider}`)
      }
    } catch (error: any) {
      console.error('SMS send error:', error)
      return { success: false, error: error.message }
    }
  }

  private static async sendKavenegar(to: string, message: string, config: any) {
    try {
      const apiConfig = await ExternalAPIService.getKavenegarConfig()
      const apiKey = apiConfig.apiKey || config.apiKey
      const senderNumber = apiConfig.senderNumber || config.senderNumber

      const response = await fetch(
        ExternalAPIService.buildUrl(apiConfig.baseUrl, `/${apiKey}/sms/send.json`),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            sender: senderNumber,
            receptor: to,
            message
          })
        }
      )

      const data = await response.json()
      return { success: response.ok, data }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  private static async sendGhasedak(to: string, message: string, config: any) {
    try {
      const apiConfig = await ExternalAPIService.getGhasedakConfig()
      const apiKey = apiConfig.apiKey || config.apiKey
      const senderNumber = apiConfig.senderNumber || config.senderNumber

      const response = await fetch(ExternalAPIService.buildUrl(apiConfig.baseUrl, '/sms/send/simple'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiKey
        },
        body: JSON.stringify({
          lineNumber: senderNumber,
          receptor: to,
          message
        })
      })

      const data = await response.json()
      return { success: response.ok, data }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  private static async sendTwilio(to: string, message: string, config: any) {
    try {
      const apiConfig = await ExternalAPIService.getTwilioConfig()
      const accountSid = apiConfig.accountSid || config.apiKey
      const authToken = apiConfig.authToken || config.apiSecret
      const senderNumber = apiConfig.fromNumber || config.senderNumber
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64')

      const response = await fetch(
        ExternalAPIService.buildUrl(apiConfig.baseUrl, `/Accounts/${accountSid}/Messages.json`),
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            From: senderNumber,
            To: to,
            Body: message
          })
        }
      )

      const data = await response.json()
      return { success: response.ok, data }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  private static async sendNexmo(to: string, message: string, config: any) {
    try {
      const apiConfig = await ExternalAPIService.getNexmoConfig()
      const response = await fetch(ExternalAPIService.buildUrl(apiConfig.baseUrl, '/sms/json'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiConfig.apiKey || config.apiKey,
          api_secret: apiConfig.apiSecret || config.apiSecret,
          from: apiConfig.senderNumber || config.senderNumber,
          to,
          text: message
        })
      })

      const data = await response.json()
      return { success: response.ok, data }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  private static async sendAfghanSMS(to: string, message: string) {
    try {
      const apiConfig = await ExternalAPIService.getAfghanSMSConfig()
      const response = await fetch(ExternalAPIService.buildUrl(apiConfig.baseUrl, '/send'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiConfig.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender_id: apiConfig.senderId,
          recipient: to,
          message: message.slice(0, 160),
          type: 'text',
        }),
      })

      const data = await response.json()
      return { success: response.ok, data }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  static async sendOTP(to: string, otp: string) {
    const message = `کد تایید شما: ${otp}\nاین کد تا 5 دقیقه معتبر است.\nسرای شهزاده`
    return this.sendSMS(to, message)
  }

  static async sendTransactionNotification(to: string, referenceCode: string) {
    const message = `تراکنش شما با کد پیگیری ${referenceCode} ثبت شد.\nسرای شهزاده`
    return this.sendSMS(to, message)
  }

  static async sendWelcomeSMS(to: string, name: string) {
    const message = `${name} عزیز، به سرای شهزاده خوش آمدید!`
    return this.sendSMS(to, message)
  }
}
