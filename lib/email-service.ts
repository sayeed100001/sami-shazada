import nodemailer from 'nodemailer'
import { ConfigService } from './config-service'
import { getConfiguredAppOrigin } from './app-url'

export class EmailService {
  private static transporter: any = null

  private static async getTransporter() {
    if (this.transporter) return this.transporter

    const config = await ConfigService.getSmtpConfig()

    if (!config.enabled || !config.host) {
      throw new Error('Email service is not configured')
    }

    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: {
        user: config.user,
        pass: config.password
      }
    })

    return this.transporter
  }

  static async sendEmail(to: string, subject: string, html: string, text?: string) {
    try {
      const config = await ConfigService.getSmtpConfig()

      if (!config.enabled) {
        console.log('Email service disabled, skipping email to:', to)
        return { success: false, message: 'Email service disabled' }
      }

      const transporter = await this.getTransporter()

      const info = await transporter.sendMail({
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to,
        subject,
        text: text || subject,
        html
      })

      console.log('Email sent:', info.messageId)
      return { success: true, messageId: info.messageId }
    } catch (error: any) {
      console.error('Email send error:', error)
      return { success: false, error: error.message }
    }
  }

  static async sendWelcomeEmail(to: string, name: string) {
    const subject = 'خوش آمدید به سرای شهزاده'
    const html = `
      <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6366f1;">سلام ${name}!</h2>
        <p>به سرای شهزاده خوش آمدید. حساب کاربری شما با موفقیت ایجاد شد.</p>
        <p>اکنون میتوانید از تمام امکانات پلتفرم استفاده کنید.</p>
        <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 14px;">
          این ایمیل به صورت خودکار ارسال شده است. لطفاً به آن پاسخ ندهید.
        </p>
      </div>
    `
    return this.sendEmail(to, subject, html)
  }

  static async sendPasswordResetEmail(to: string, resetToken: string) {
    const resetUrl = `${getConfiguredAppOrigin()}/auth/reset-password?token=${resetToken}`
    const subject = 'بازیابی رمز عبور'
    const html = `
      <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6366f1;">بازیابی رمز عبور</h2>
        <p>درخواست بازیابی رمز عبور برای حساب شما دریافت شد.</p>
        <p>برای تنظیم رمز عبور جدید، روی لینک زیر کلیک کنید:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
          بازیابی رمز عبور
        </a>
        <p style="color: #6b7280; font-size: 14px;">
          این لینک تا 1 ساعت معتبر است.
        </p>
        <p style="color: #ef4444; font-size: 14px;">
          اگر شما این درخواست را نداده‌اید، این ایمیل را نادیده بگیرید.
        </p>
      </div>
    `
    return this.sendEmail(to, subject, html)
  }

  static async sendOTPEmail(to: string, otp: string) {
    const subject = 'کد تایید شما'
    const html = `
      <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6366f1;">کد تایید</h2>
        <p>کد تایید شما:</p>
        <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0; border-radius: 8px;">
          ${otp}
        </div>
        <p style="color: #6b7280; font-size: 14px;">
          این کد تا 5 دقیقه معتبر است.
        </p>
      </div>
    `
    return this.sendEmail(to, subject, html)
  }

  static async sendTransactionNotification(to: string, transactionData: any) {
    const subject = 'اطلاعیه تراکنش'
    const html = `
      <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6366f1;">تراکنش جدید</h2>
        <p>تراکنش شما با موفقیت ثبت شد.</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>کد پیگیری:</strong> ${transactionData.referenceCode}</p>
          <p><strong>مبلغ:</strong> ${transactionData.amount} ${transactionData.currency}</p>
          <p><strong>وضعیت:</strong> ${transactionData.status}</p>
        </div>
      </div>
    `
    return this.sendEmail(to, subject, html)
  }
}
