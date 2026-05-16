'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowRightLeft, TrendingUp, DollarSign, Users, Settings } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/hooks/useLanguage'
import type { Language } from '@/lib/i18n'
import { formatLocalizedNumber } from '@/lib/locale'

interface ExchangeSettings {
  exchangeEnabled: boolean
  freeTrialIncludesExchange: boolean
  exchangeEnabledUserIds?: string
  exchangeDisabledUserIds?: string
  exchangeSystemFeePercent?: string
  exchangeFeeOffForTrialSarafs?: boolean
  exchangeRewardDiscountRate?: string
}

interface ExchangeData {
  transactions: any[]
  pagination: any
  stats: {
    today: StatsData
    month: StatsData
    year: StatsData
  }
  topSarafs: TopSaraf[]
}

interface StatsData {
  count: number
  volume: number
  systemRevenue: number
  waivedSystemRevenue: number
  creditsCollected: number
}

interface TopSaraf {
  sarafId: string
  sarafName: string
  count: number
  volume: number
  systemRevenue: number
  waivedSystemRevenue: number
}

function pick(language: Language, fa: string, en: string, ps: string) {
  return language === 'en' ? en : language === 'ps' ? ps : fa
}

function formatMoney(value: number, language: Language) {
  return formatLocalizedNumber(value, language, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

export default function AdminExchangePage() {
  const { language } = useLanguage()
  const [settings, setSettings] = useState<ExchangeSettings>({
    exchangeEnabled: true,
    freeTrialIncludesExchange: false
    ,
    exchangeEnabledUserIds: '',
    exchangeDisabledUserIds: '',
    exchangeSystemFeePercent: '',
    exchangeFeeOffForTrialSarafs: false,
    exchangeRewardDiscountRate: '0.01'
  })
  const [data, setData] = useState<ExchangeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(1)
  const limit = 20

  const t = {
    title: pick(language, 'مدیریت تبادله ارز', 'Exchange Management', 'د تبادلې مدیریت'),
    subtitle: pick(language, 'تنظیمات و آمار تبادلات ارزی', 'Exchange settings and statistics', 'د تبادلې تنظیمات او احصائیې'),
    settings: pick(language, 'تنظیمات', 'Settings', 'تنظیمات'),
    statistics: pick(language, 'آمار', 'Statistics', 'احصائیې'),
    transactions: pick(language, 'تراکنش‌ها', 'Transactions', 'معاملې'),
    enableExchange: pick(language, 'فعال‌سازی تبادله ارز', 'Enable Currency Exchange', 'د اسعارو تبادله فعاله کړئ'),
    enableExchangeDesc: pick(language, 'فعال یا غیرفعال کردن قابلیت تبادله ارز برای همه کاربران', 'Enable or disable currency exchange feature for all users', 'د ټولو کاروونکو لپاره د اسعارو تبادله فعاله یا غیرفعاله کړئ'),
    freeTrialIncludes: pick(language, 'شامل در دوره آزمایشی', 'Include in Free Trial', 'په وړیا ازموینې کې شامل'),
    freeTrialIncludesDesc: pick(language, 'آیا تبادله ارز در دوره آزمایشی رایگان شامل شود؟', 'Should exchange be included in free trial period?', 'ایا تبادله باید په وړیا ازموینې کې شامله وي؟'),
    save: pick(language, 'ذخیره تغییرات', 'Save Changes', 'بدلونونه خوندي کړئ'),
    saving: pick(language, 'در حال ذخیره...', 'Saving...', 'خوندي کېږي...'),
    today: pick(language, 'امروز', 'Today', 'نن'),
    month: pick(language, 'ماه', 'Month', 'میاشت'),
    year: pick(language, 'سال', 'Year', 'کال'),
    totalTransactions: pick(language, 'کل تراکنش‌ها', 'Total Transactions', 'ټولې معاملې'),
    totalVolume: pick(language, 'حجم کل', 'Total Volume', 'ټول حجم'),
    systemRevenue: pick(language, 'درآمد سیستم', 'System Revenue', 'د سیسټم عاید'),
    waivedRevenue: pick(language, 'درآمد بخشوده‌شده', 'Waived Revenue', 'بښل شوی عاید'),
    creditsCollected: pick(language, 'کریدیت جمع‌آوری شده', 'Credits Collected', 'راټول شوي کریډیټ'),
    topSarafs: pick(language, 'برترین صرافان', 'Top Sarafs', 'غوره صرافان'),
    sarafName: pick(language, 'نام صراف', 'Saraf Name', 'د صراف نوم'),
    volume: pick(language, 'حجم', 'Volume', 'حجم'),
    revenue: pick(language, 'درآمد', 'Revenue', 'عاید'),
    loading: pick(language, 'در حال بارگذاری...', 'Loading...', 'بارېږي...'),
    successSaved: pick(language, 'تنظیمات با موفقیت ذخیره شد', 'Settings saved successfully', 'تنظیمات په برياليتوب خوندي شول'),
  }

  useEffect(() => {
    fetchSettings()
    fetchData()
  }, [page])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/exchange/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings({
          exchangeEnabled: Boolean(data.exchangeEnabled),
          freeTrialIncludesExchange: Boolean(data.freeTrialIncludesExchange),
          exchangeEnabledUserIds: String(data.exchangeEnabledUserIds || ''),
          exchangeDisabledUserIds: String(data.exchangeDisabledUserIds || ''),
          exchangeSystemFeePercent: String(data.exchangeSystemFeePercent || ''),
          exchangeFeeOffForTrialSarafs: Boolean(data.exchangeFeeOffForTrialSarafs),
          exchangeRewardDiscountRate: String(data.exchangeRewardDiscountRate || '0.01'),
        })
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/exchange?page=${page}&limit=${limit}`)
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/exchange/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exchangeEnabled: settings.exchangeEnabled,
          freeTrialIncludesExchange: settings.freeTrialIncludesExchange,
          exchangeEnabledUserIds: settings.exchangeEnabledUserIds || '',
          exchangeDisabledUserIds: settings.exchangeDisabledUserIds || '',
          exchangeSystemFeePercent: settings.exchangeSystemFeePercent || '',
          exchangeFeeOffForTrialSarafs: settings.exchangeFeeOffForTrialSarafs || false,
          exchangeRewardDiscountRate: settings.exchangeRewardDiscountRate || '0.01',
        })
      })

      if (response.ok) {
        toast.success(t.successSaved)
      } else {
        throw new Error('Failed to save')
      }
    } catch (error) {
      toast.error('خطا در ذخیره تنظیمات')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
      <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 text-white rounded-2xl p-8 mb-8 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
            <ArrowRightLeft className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-4xl font-bold mb-2">{t.title}</h1>
            <p className="text-purple-50 text-lg">{t.subtitle}</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            {t.settings}
          </TabsTrigger>
          <TabsTrigger value="statistics">
            <TrendingUp className="h-4 w-4 mr-2" />
            {t.statistics}
          </TabsTrigger>
          <TabsTrigger value="transactions">
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            {t.transactions}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle>{t.settings}</CardTitle>
              <CardDescription>{t.subtitle}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="exchange-enabled" className="text-base font-semibold">
                    {t.enableExchange}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t.enableExchangeDesc}
                  </p>
                </div>
                <Switch
                  id="exchange-enabled"
                  checked={settings.exchangeEnabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, exchangeEnabled: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="free-trial" className="text-base font-semibold">
                    {t.freeTrialIncludes}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t.freeTrialIncludesDesc}
                  </p>
                </div>
                <Switch
                  id="free-trial"
                  checked={settings.freeTrialIncludesExchange}
                  onCheckedChange={(checked) => setSettings({ ...settings, freeTrialIncludesExchange: checked })}
                />
              </div>

              <div className="space-y-2 p-4 bg-muted rounded-lg">
                <Label className="text-base font-semibold">
                  {pick(language, 'درصد کارمزد سیستم تبادله (اختیاری)', 'Exchange System Fee % (optional)', 'د تبادلې د سیسټم فیس سلنه (اختیاري)')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {pick(
                    language,
                    'اگر مقدار بدهید، از همین درصد برای کارمزد سیستم استفاده می‌شود. اگر خالی باشد از جدول کمیسیون استفاده می‌شود.',
                    'If set, this percentage overrides exchange system fee. Empty means commission table is used.',
                    'که مقدار ورکړئ، د سیسټم فیس به له همدې سلنې وي. که خالي وي د کمیشن جدول کارول کېږي.'
                  )}
                </p>
                <input
                  className="w-full rounded-md border bg-background p-3 text-sm"
                  type="number"
                  step="0.01"
                  min="0"
                  value={settings.exchangeSystemFeePercent || ''}
                  onChange={(event) =>
                    setSettings({ ...settings, exchangeSystemFeePercent: event.target.value })
                  }
                  placeholder="e.g. 0.65"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="fee-off-trial" className="text-base font-semibold">
                    {pick(language, 'کارمزد سیستم صفر در دوره آزمایشی صراف', 'System fee off for trial sarafs', 'د ازمایښتي صراف لپاره د سیسټم فیس صفر')}
                  </Label>
                </div>
                <Switch
                  id="fee-off-trial"
                  checked={settings.exchangeFeeOffForTrialSarafs || false}
                  onCheckedChange={(checked) => setSettings({ ...settings, exchangeFeeOffForTrialSarafs: checked })}
                />
              </div>

              <div className="space-y-2 p-4 bg-muted rounded-lg">
                <Label className="text-base font-semibold">
                  {pick(language, 'نرخ پاداش کاربر ثبت‌شده بعد از تبادله', 'Registered user reward rate after exchange', 'د ثبت شوي کارونکي د انعام کچه د تبادلې وروسته')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {pick(
                    language,
                    'حداکثر 0.05 (5%). برای جلوگیری از ضرر سیستم، این مقدار را پایین نگه دارید.',
                    'Maximum 0.05 (5%). Keep it low to protect system margins.',
                    'تر 0.05 (5%) پورې. د سیسټم د ګټې ساتلو لپاره دا ټیټ وساتئ.'
                  )}
                </p>
                <input
                  className="w-full rounded-md border bg-background p-3 text-sm"
                  type="number"
                  step="0.001"
                  min="0"
                  max="0.05"
                  value={settings.exchangeRewardDiscountRate || '0.01'}
                  onChange={(event) =>
                    setSettings({ ...settings, exchangeRewardDiscountRate: event.target.value })
                  }
                  placeholder="0.01"
                />
              </div>

              <div className="space-y-2 p-4 bg-muted rounded-lg">
                <Label className="text-base font-semibold">
                  {pick(language, 'فعال برای کاربران خاص', 'Enable for specific users', 'د ځانګړو کاروونکو لپاره فعال')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {pick(
                    language,
                    'لیست شناسه کاربر (userId) جدا شده با کاما. این لیست بر تنظیمات عمومی اولویت دارد.',
                    'Comma-separated user IDs. This override takes priority over global setting.',
                    'د کاما په واسطه جلا شوي userId ګانې. دا د عمومي تنظیماتو څخه لوړه لومړیتوب لري.'
                  )}
                </p>
                <textarea
                  className="w-full min-h-[90px] rounded-md border bg-background p-3 text-sm"
                  value={settings.exchangeEnabledUserIds || ''}
                  onChange={(event) =>
                    setSettings({ ...settings, exchangeEnabledUserIds: event.target.value })
                  }
                  placeholder="cuid1,cuid2,cuid3"
                />
              </div>

              <div className="space-y-2 p-4 bg-muted rounded-lg">
                <Label className="text-base font-semibold">
                  {pick(language, 'غیرفعال برای کاربران خاص', 'Disable for specific users', 'د ځانګړو کاروونکو لپاره غیرفعال')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {pick(
                    language,
                    'لیست شناسه کاربر (userId) جدا شده با کاما. این لیست بر تنظیمات عمومی اولویت دارد.',
                    'Comma-separated user IDs. This override takes priority over global setting.',
                    'د کاما په واسطه جلا شوي userId ګانې. دا د عمومي تنظیماتو څخه لوړه لومړیتوب لري.'
                  )}
                </p>
                <textarea
                  className="w-full min-h-[90px] rounded-md border bg-background p-3 text-sm"
                  value={settings.exchangeDisabledUserIds || ''}
                  onChange={(event) =>
                    setSettings({ ...settings, exchangeDisabledUserIds: event.target.value })
                  }
                  placeholder="cuid4,cuid5"
                />
              </div>

              <Button
                onClick={handleSaveSettings}
                disabled={saving}
                size="lg"
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {saving ? t.saving : t.save}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statistics" className="space-y-6">
          {loading ? (
            <div className="text-center py-12">{t.loading}</div>
          ) : data ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="glass-card border-0">
                  <CardHeader>
                    <CardTitle className="text-lg">{t.today}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{t.totalTransactions}:</span>
                      <span className="font-bold">{data.stats.today.count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{t.totalVolume}:</span>
                      <span className="font-bold">${formatMoney(data.stats.today.volume, language)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{t.systemRevenue}:</span>
                      <span className="font-bold text-green-600">${formatMoney(data.stats.today.systemRevenue, language)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{t.waivedRevenue}:</span>
                      <span className="font-bold text-amber-600">${formatMoney(data.stats.today.waivedSystemRevenue, language)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{t.creditsCollected}:</span>
                      <span className="font-bold">{data.stats.today.creditsCollected}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card border-0">
                  <CardHeader>
                    <CardTitle className="text-lg">{t.month}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{t.totalTransactions}:</span>
                      <span className="font-bold">{data.stats.month.count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{t.totalVolume}:</span>
                      <span className="font-bold">${formatMoney(data.stats.month.volume, language)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{t.systemRevenue}:</span>
                      <span className="font-bold text-green-600">${formatMoney(data.stats.month.systemRevenue, language)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{t.waivedRevenue}:</span>
                      <span className="font-bold text-amber-600">${formatMoney(data.stats.month.waivedSystemRevenue, language)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{t.creditsCollected}:</span>
                      <span className="font-bold">{data.stats.month.creditsCollected}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card border-0">
                  <CardHeader>
                    <CardTitle className="text-lg">{t.year}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{t.totalTransactions}:</span>
                      <span className="font-bold">{data.stats.year.count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{t.totalVolume}:</span>
                      <span className="font-bold">${formatMoney(data.stats.year.volume, language)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{t.systemRevenue}:</span>
                      <span className="font-bold text-green-600">${formatMoney(data.stats.year.systemRevenue, language)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{t.waivedRevenue}:</span>
                      <span className="font-bold text-amber-600">${formatMoney(data.stats.year.waivedSystemRevenue, language)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{t.creditsCollected}:</span>
                      <span className="font-bold">{data.stats.year.creditsCollected}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="glass-card border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {t.topSarafs}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.topSarafs.map((saraf, index) => (
                      <div key={saraf.sarafId} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                            #{index + 1}
                          </div>
                          <div>
                            <div className="font-bold">{saraf.sarafName}</div>
                            <div className="text-sm text-muted-foreground">
                              {saraf.count} {t.transactions}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-600">
                            ${formatMoney(saraf.systemRevenue, language)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {t.volume}: ${formatMoney(saraf.volume, language)}
                          </div>
                          <div className="text-xs text-amber-600">
                            {t.waivedRevenue}: ${formatMoney(saraf.waivedSystemRevenue, language)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="transactions">
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle>{t.transactions}</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12 text-muted-foreground">{t.loading}</div>
              ) : !data ? (
                <div className="text-center py-12 text-muted-foreground">{t.loading}</div>
              ) : data.transactions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {pick(language, 'هیچ تراکنشی یافت نشد', 'No transactions found', 'هېڅ معامله ونه موندل شوه')}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-3 text-left">{pick(language, 'کد', 'Code', 'کوډ')}</th>
                          <th className="p-3 text-left">{pick(language, 'صراف', 'Saraf', 'صراف')}</th>
                          <th className="p-3 text-left">{pick(language, 'از', 'From', 'له')}</th>
                          <th className="p-3 text-left">{pick(language, 'به', 'To', 'ته')}</th>
                          <th className="p-3 text-left">{pick(language, 'کارمزد سیستم', 'System Fee', 'د سیسټم فیس')}</th>
                          <th className="p-3 text-left">{pick(language, 'تاریخ', 'Date', 'نېټه')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.transactions.map((tx: any) => (
                          <tr key={tx.id} className="border-t">
                            <td className="p-3 font-mono">{tx.referenceCode}</td>
                            <td className="p-3">{tx.saraf?.businessName || '-'}</td>
                            <td className="p-3">
                              {formatMoney(tx.fromAmount || 0, language)} {tx.fromCurrency}
                            </td>
                            <td className="p-3">
                              {formatMoney(tx.toAmount || 0, language)} {tx.toCurrency}
                            </td>
                            <td className="p-3">
                              ${formatMoney(tx.systemCommission || 0, language)}
                            </td>
                            <td className="p-3">
                              {tx.createdAt ? new Date(tx.createdAt).toLocaleString(language === 'en' ? 'en-US' : 'fa-IR') : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      {pick(language, 'صفحه', 'Page', 'پاڼه')} {data.pagination?.page || page} / {data.pagination?.pages || 1}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        {pick(language, 'قبلی', 'Prev', 'مخکینی')}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={page >= (data.pagination?.pages || 1)}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        {pick(language, 'بعدی', 'Next', 'بل')}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
