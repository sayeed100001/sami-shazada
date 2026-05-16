'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { FileText, ShieldAlert } from 'lucide-react'
import { useLanguage } from '@/hooks/useLanguage'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'

interface TermsConsentPanelProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  id: string
}

export function TermsConsentPanel({ checked, onCheckedChange, id }: TermsConsentPanelProps) {
  const { language } = useLanguage()
  const [termsText, setTermsText] = useState('')
  const [loading, setLoading] = useState(true)

  const copy = useMemo(() => {
    if (language === 'en') {
      return {
        title: 'Read before accepting',
        description:
          'Review the main service rules before creating your account. This acknowledgement is shown to reduce disputes, fraud, and misuse later.',
        documentTitle: 'Current terms summary',
        loading: 'Loading current terms...',
        checkboxLabel:
          'I have read and accept the terms, privacy notice, account responsibility, and transaction risk disclosure.',
        viewTerms: 'View terms',
        viewPrivacy: 'View privacy',
        fallbackText:
          'By creating an account and using this platform, you confirm that: (1) you will provide accurate, current identity, contact, and transaction information; (2) you will not use the service for fraud, money laundering, unlawful financing, unauthorized access, or false information; (3) rates, fees, processing times, country restrictions, and service availability may change until final confirmation; (4) submitting a request does not guarantee profit, a fixed rate, payment, or transaction completion, and final execution remains subject to platform approval, saraf approval, applicable law, and security checks; (5) the platform may retain and review records, logs, and supporting data for security, fraud prevention, dispute handling, and legal compliance; and (6) accounts or requests may be suspended, limited, or rejected for violations. By accepting these terms, final responsibility for the accuracy of information and the lawfulness of the transaction remains with you and the transaction parties.',
        bullets: [
          'Provide accurate identity, contact, and transaction details.',
          'Do not use the platform for fraud, unlawful activity, or false information.',
          'Rates, fees, and availability may change until final confirmation.',
          'A submitted request is not a guarantee of execution, payment, or profit.',
          'Security, fraud-prevention, and legal reviews may lead to suspension or rejection.',
        ],
      }
    }

    if (language === 'ps') {
      return {
        title: 'د منلو مخکې یې ولولئ',
        description:
          'د حساب له جوړولو مخکې د خدمت اصلي اصول ولولئ. دا منل د راتلونکو شخړو، درغلیو او ناسم استعمال د کمولو لپاره ښودل کېږي.',
        documentTitle: 'د اوسنیو شرایطو لنډیز',
        loading: 'اوسني شرایط بارېږي...',
        checkboxLabel:
          'ما شرایط، د محرمیت خبرتیا، د حساب مسؤلیت او د معاملې د خطرونو خبرتیا ولوستله او منم یې.',
        viewTerms: 'شرایط وګورئ',
        viewPrivacy: 'محرمیت وګورئ',
        fallbackText:
          'د حساب په جوړولو او د دې پلاتفورم په کارولو سره، تاسې تاییدوئ چې: (۱) د هویت، اړیکې او معاملې ټول معلومات به سم، تازه او بشپړ ورکوئ؛ (۲) دا خدمت به د درغلۍ، پیسو مینځلو، ناقانونه تمویل، غیر مجاز لاسرسي یا ناسم معلوماتو لپاره نه کاروئ؛ (۳) نرخونه، فیسونه، د اجرا وخت، د هېواد محدودیتونه او د خدمت شتون تر وروستي تایید مخکې بدلېدای شي؛ (۴) د غوښتنې ثبتول د ګټې، ثابت نرخ، تادیې یا د معاملې د بشپړېدو تضمین نه دی، او وروستی اجرا د پلاتفورم تایید، د صراف تایید، نافذو قوانینو او امنیتي څارنو تابع ده؛ (۵) پلاتفورم کولای شي د امنیت، د درغلۍ مخنیوي، د شخړو د حل او قانوني پابندۍ لپاره ریکارډونه، لاګونه او اسناد وساتي او وڅېړي؛ او (۶) د سرغړونې په صورت کې حساب یا غوښتنه ځنډول، محدودول یا رد کېدای شي. د دې شرایطو په منلو سره، د معلوماتو د صحت او د معاملې د قانوني والي وروستی مسؤلیت له تاسې او د معاملې له اړخونو سره پاتې کېږي.',
        bullets: [
          'د هویت، اړیکې او معاملې سم معلومات ورکړئ.',
          'دا پلاتفورم د درغلۍ، ناقانونه کار او ناسم معلوماتو لپاره مه کاروئ.',
          'نرخونه، فیسونه او د خدمت شتون تر وروستي تایید مخکې بدلېدای شي.',
          'د غوښتنې ثبتول د اجرا، تادیې یا ګټې تضمین نه دی.',
          'امنيتي، د درغلۍ ضد او قانوني ارزونې د ځنډ، محدودیت یا رد سبب کېدای شي.',
        ],
      }
    }

    return {
      title: 'پیش از پذیرش بخوانید',
      description:
        'پیش از ایجاد حساب، قواعد اصلی استفاده از خدمت را مرور کنید. این تایید برای کاهش اختلاف، تقلب و سوءاستفاده در آینده نمایش داده می‌شود.',
      documentTitle: 'خلاصه شرایط فعلی',
      loading: 'در حال دریافت متن شرایط...',
      checkboxLabel:
        'متن شرایط، حریم خصوصی، مسئولیت حساب و افشای ریسک تراکنش را خوانده‌ام و می‌پذیرم.',
      viewTerms: 'مشاهده شرایط',
      viewPrivacy: 'مشاهده حریم خصوصی',
      fallbackText:
        'با ایجاد حساب و استفاده از این سامانه، شما تأیید می‌کنید که: (1) اطلاعات هویتی، تماس و تراکنش را درست و به‌روز وارد می‌کنید؛ (2) از این سامانه برای تقلب، پول‌شویی، تأمین مالی غیرقانونی، دسترسی غیرمجاز یا ارائه اطلاعات نادرست استفاده نمی‌کنید؛ (3) نرخ، کارمزد، زمان انجام، محدودیت‌های کشوری و امکان انجام خدمت ممکن است تا پیش از تأیید نهایی تغییر کند؛ (4) ثبت درخواست به معنای تضمین سود، نرخ ثابت، پرداخت قطعی یا تکمیل تراکنش نیست و انجام نهایی منوط به تأیید سامانه، صراف، قوانین قابل اجرا و کنترل‌های امنیتی است؛ (5) سامانه می‌تواند برای امنیت، مبارزه با تقلب، رسیدگی به اختلاف و الزامات قانونی سوابق، لاگ‌ها و اسناد را نگهداری و بررسی کند؛ و (6) در صورت تخلف، حساب یا درخواست می‌تواند تعلیق، محدود یا رد شود. با پذیرش این شرایط، مسئولیت نهایی صحت اطلاعات و مشروعیت معامله با شما و طرف‌های معامله است.',
      bullets: [
        'اطلاعات هویتی، تماس و تراکنش را دقیق و به‌روز وارد کنید.',
        'از سامانه برای تقلب، فعالیت غیرقانونی یا ثبت اطلاعات نادرست استفاده نکنید.',
        'نرخ، کارمزد و امکان انجام خدمت تا پیش از تایید نهایی ممکن است تغییر کند.',
        'ثبت درخواست به معنای تضمین اجرا، پرداخت یا سود نیست.',
        'بررسی‌های امنیتی، ضدتقلب و قانونی می‌تواند باعث تعلیق، محدودسازی یا رد درخواست شود.',
      ],
    }
  }, [language])

  useEffect(() => {
    let active = true

    setLoading(true)
    fetch(`/api/legal/terms?lang=${language}`, { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(data?.error || 'Failed to load terms')
        }
        if (!active) return
        setTermsText(String(data?.text || copy.fallbackText))
      })
      .catch(() => {
        if (!active) return
        setTermsText(copy.fallbackText)
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [copy.fallbackText, language])

  return (
    <div className="space-y-4 rounded-2xl border border-amber-200/70 bg-amber-50/80 p-4 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/10">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-amber-500/10 p-2 dark:bg-amber-400/10">
          <ShieldAlert className="h-5 w-5 text-amber-700 dark:text-amber-300" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-amber-950 dark:text-amber-100">{copy.title}</h3>
          <p className="text-sm leading-6 text-amber-900/90 dark:text-amber-200/90">{copy.description}</p>
        </div>
      </div>

      <ul className="space-y-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
        {copy.bullets.map((bullet) => (
          <li key={bullet} className="flex items-start gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-600 dark:bg-amber-400" />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
          <FileText className="h-4 w-4 text-amber-700 dark:text-amber-300" />
          <span>{copy.documentTitle}</span>
        </div>
        <ScrollArea className="h-28 rounded-xl border border-amber-200/80 bg-white/75 dark:border-amber-900/40 dark:bg-slate-950/60">
          <div className="whitespace-pre-line p-4 text-xs leading-6 text-slate-700 dark:text-slate-200">
            {loading ? copy.loading : termsText}
          </div>
        </ScrollArea>
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200/80 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
        <div className="flex items-start gap-3">
          <Checkbox
            id={id}
            checked={checked}
            onCheckedChange={(value) => onCheckedChange(value === true)}
            className="mt-0.5 h-5 w-5 rounded-md"
          />
          <Label htmlFor={id} className="cursor-pointer text-sm leading-6 text-slate-700 dark:text-slate-200">
            {copy.checkboxLabel}
          </Label>
        </div>

        <div className="flex flex-wrap gap-3 text-xs font-semibold">
          <Link href="/terms" className="text-amber-800 underline decoration-amber-400 underline-offset-4 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-200">
            {copy.viewTerms}
          </Link>
          <Link href="/privacy" className="text-amber-800 underline decoration-amber-400 underline-offset-4 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-200">
            {copy.viewPrivacy}
          </Link>
        </div>
      </div>
    </div>
  )
}
