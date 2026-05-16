'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function VIPStatusPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [vipData, setVipData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      fetchVIPStatus();
    }
  }, [status]);

  const fetchVIPStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/vip');
      const data = await response.json();
      if (data.success) {
        setVipData(data);
      }
    } catch (error) {
      console.error('Failed to fetch VIP status:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level: string) => {
    const colors: any = {
      NONE: 'bg-gray-100 text-gray-800',
      BRONZE: 'bg-orange-100 text-orange-800',
      SILVER: 'bg-gray-200 text-gray-800',
      GOLD: 'bg-yellow-100 text-yellow-800',
      PLATINUM: 'bg-purple-100 text-purple-800',
    };
    return colors[level] || colors.NONE;
  };

  const getLevelIcon = (level: string) => {
    const icons: any = {
      NONE: '👤',
      BRONZE: '🥉',
      SILVER: '🥈',
      GOLD: '🥇',
      PLATINUM: '💎',
    };
    return icons[level] || icons.NONE;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!vipData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">خطا در بارگذاری اطلاعات VIP</p>
      </div>
    );
  }

  const { vipStatus, rewards, benefits } = vipData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">وضعیت VIP شما</h1>
          <p className="text-gray-600">از مزایای ویژه کاربران VIP بهرهمند شوید</p>
        </div>

        {/* Current Level Card */}
        <div className="bg-white rounded-lg shadow-xl p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="text-6xl">{getLevelIcon(vipStatus.level)}</div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900">{vipStatus.levelName}</h2>
                <p className="text-gray-600">سطح فعلی شما</p>
              </div>
            </div>
            <div className={`px-6 py-3 rounded-full text-lg font-semibold ${getLevelColor(vipStatus.level)}`}>
              {vipStatus.level}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">تعداد تراکنشها</p>
              <p className="text-3xl font-bold text-blue-600">{vipStatus.totalTransactions}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">تخفیف فعلی</p>
              <p className="text-3xl font-bold text-green-600">{benefits.currentDiscount}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">امتیاز VIP</p>
              <p className="text-3xl font-bold text-purple-600">{vipStatus.vipPoints}</p>
            </div>
          </div>

          {/* Progress to Next Level */}
          {vipStatus.nextLevel && (
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-gray-800">پیشرفت به سطح بعدی</h3>
                <span className="text-sm text-gray-600">
                  {vipStatus.nextLevel.name} ({vipStatus.nextLevel.discount * 100}% تخفیف)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 h-4 rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      ((vipStatus.totalTransactions /
                        (vipStatus.totalTransactions + vipStatus.nextLevel.transactionsNeeded)) *
                        100)
                    )}%`,
                  }}
                ></div>
              </div>
              <p className="text-sm text-gray-600">
                {vipStatus.nextLevel.transactionsNeeded} تراکنش دیگر تا سطح {vipStatus.nextLevel.name}
              </p>
            </div>
          )}
        </div>

        {/* Benefits */}
        <div className="bg-white rounded-lg shadow-xl p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">مزایای شما</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
              <span className="text-2xl">💰</span>
              <div>
                <h3 className="font-semibold text-gray-800">تخفیف ویژه</h3>
                <p className="text-sm text-gray-600">{benefits.currentDiscount} تخفیف در تمام تراکنشها</p>
              </div>
            </div>

            {benefits.prioritySupport && (
              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                <span className="text-2xl">🎯</span>
                <div>
                  <h3 className="font-semibold text-gray-800">پشتیبانی اولویتدار</h3>
                  <p className="text-sm text-gray-600">پاسخگویی سریعتر به درخواستها</p>
                </div>
              </div>
            )}

            {benefits.monthlyDiscountCodes > 0 && (
              <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg">
                <span className="text-2xl">🎟️</span>
                <div>
                  <h3 className="font-semibold text-gray-800">کد تخفیف ماهانه</h3>
                  <p className="text-sm text-gray-600">
                    {benefits.monthlyDiscountCodes === 999 ? 'نامحدود' : benefits.monthlyDiscountCodes} کد تخفیف در ماه
                  </p>
                </div>
              </div>
            )}

            {benefits.dedicatedManager && (
              <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
                <span className="text-2xl">👨‍💼</span>
                <div>
                  <h3 className="font-semibold text-gray-800">مدیر حساب اختصاصی</h3>
                  <p className="text-sm text-gray-600">مشاور شخصی برای نیازهای شما</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rewards */}
        {rewards.active.length > 0 && (
          <div className="bg-white rounded-lg shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">جوایز فعال شما</h2>
            <div className="space-y-4">
              {rewards.active.map((reward: any) => (
                <div key={reward.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-1">{reward.title}</h3>
                      <p className="text-sm text-gray-600 mb-2">{reward.description}</p>
                      {reward.code && (
                        <div className="inline-block px-3 py-1 bg-indigo-100 text-indigo-800 rounded font-mono text-sm">
                          {reward.code}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-gray-500">
                        {reward.expiresAt
                          ? `تا ${new Date(reward.expiresAt).toLocaleDateString('fa-IR')}`
                          : 'بدون انقضا'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIP Levels Info */}
        <div className="bg-white rounded-lg shadow-xl p-8 mt-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">سطوح VIP</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="border-2 border-orange-200 rounded-lg p-4">
              <div className="text-3xl mb-2">🥉</div>
              <h3 className="font-bold text-gray-800 mb-2">برنزی</h3>
              <p className="text-sm text-gray-600 mb-2">1-10 تراکنش</p>
              <p className="text-lg font-bold text-orange-600">5% تخفیف</p>
            </div>

            <div className="border-2 border-gray-300 rounded-lg p-4">
              <div className="text-3xl mb-2">🥈</div>
              <h3 className="font-bold text-gray-800 mb-2">نقرهای</h3>
              <p className="text-sm text-gray-600 mb-2">11-50 تراکنش</p>
              <p className="text-lg font-bold text-gray-600">10% تخفیف</p>
            </div>

            <div className="border-2 border-yellow-300 rounded-lg p-4">
              <div className="text-3xl mb-2">🥇</div>
              <h3 className="font-bold text-gray-800 mb-2">طلایی</h3>
              <p className="text-sm text-gray-600 mb-2">51-200 تراکنش</p>
              <p className="text-lg font-bold text-yellow-600">15% تخفیف</p>
            </div>

            <div className="border-2 border-purple-300 rounded-lg p-4 bg-gradient-to-br from-purple-50 to-indigo-50">
              <div className="text-3xl mb-2">💎</div>
              <h3 className="font-bold text-gray-800 mb-2">پلاتینیوم</h3>
              <p className="text-sm text-gray-600 mb-2">200+ تراکنش</p>
              <p className="text-lg font-bold text-purple-600">20% تخفیف</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
