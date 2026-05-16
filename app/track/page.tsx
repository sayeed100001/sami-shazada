'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function TrackTransactionPage() {
  const [trackingToken, setTrackingToken] = useState('');
  const [referenceCode, setReferenceCode] = useState('');
  const [phone, setPhone] = useState('');
  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setTransaction(null);

    if (!trackingToken && !referenceCode) {
      setError('لطفاً کد پیگیری یا شماره مرجع را وارد کنید');
      return;
    }

    if (!phone) {
      setError('برای امنیت، لطفاً شماره تلفن (فرستنده یا گیرنده) را وارد کنید');
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (trackingToken) params.append('token', trackingToken);
      if (referenceCode) params.append('ref', referenceCode);
      params.append('phone', phone);

      const response = await fetch(`/api/public/track?${params}`);
      const data = await response.json();

      if (data.success) {
        setTransaction({
          ...data.data,
          destinationBranch: data.data.destinationBranch || {
            name: 'Not assigned yet',
            address: 'Destination branch will be assigned after approval.',
            city: 'Pending',
            country: '',
            phone: 'Pending',
          },
        });
      } else {
        setError(data.error || 'حواله یافت نشد');
      }
    } catch (error) {
      setError('خطا در پیگیری حواله');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: any = {
      PENDING: { text: 'در انتظار', color: 'bg-yellow-100 text-yellow-800' },
      COMPLETED: { text: 'تکمیل شده', color: 'bg-green-100 text-green-800' },
      CANCELLED: { text: 'لغو شده', color: 'bg-red-100 text-red-800' },
    };
    const badge = badges[status] || badges.PENDING;
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/search" className="text-2xl font-bold text-indigo-600">
            سرای شهزاده
          </Link>
          <div className="flex gap-4">
            <Link
              href="/auth/signin"
              className="px-4 py-2 text-indigo-600 hover:text-indigo-800"
            >
              ورود
            </Link>
            <Link
              href="/auth/signup"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              ثبت نام
            </Link>
          </div>
        </div>
      </header>

      {/* Signup Benefits Banner */}
      <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-green-800 mb-2">
                💡 با ثبت نام، پیگیری حوالهها را آسانتر کنید!
              </h3>
              <p className="text-sm text-green-700">
                با حساب کاربری میتوانید تمام حوالههای خود را در یک جا مشاهده کنید و از تخفیفات ویژه بهرهمند شوید
              </p>
            </div>
            <Link
              href="/auth/signup"
              className="px-6 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 whitespace-nowrap"
            >
              ثبت نام رایگان
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Tracking Form */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">
              پیگیری حواله
            </h2>
            <form onSubmit={handleTrack} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  کد پیگیری (اگر دارید)
                </label>
                <input
                  type="text"
                  placeholder="TRK..."
                  value={trackingToken}
                  onChange={(e) => setTrackingToken(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="text-center text-gray-500">یا</div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  شماره مرجع حواله
                </label>
                <input
                  type="text"
                  placeholder="HW..."
                  value={referenceCode}
                  onChange={(e) => setReferenceCode(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  شماره تلفن (برای تایید)
                </label>
                <input
                  type="tel"
                  placeholder="+93..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400"
              >
                {loading ? 'در حال پیگیری...' : 'پیگیری حواله'}
              </button>
            </form>
          </div>

          {/* Transaction Details */}
          {transaction && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">
                  جزئیات حواله
                </h3>
                {getStatusBadge(transaction.status)}
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">شماره مرجع</p>
                    <p className="font-semibold">{transaction.referenceCode}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">نوع</p>
                    <p className="font-semibold">{transaction.type}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-700 mb-3">فرستنده</h4>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <span className="text-gray-600">نام:</span>{' '}
                      <span className="font-medium">{transaction.senderName}</span>
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-700 mb-3">گیرنده</h4>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <span className="text-gray-600">نام:</span>{' '}
                      <span className="font-medium">{transaction.receiverName}</span>
                    </p>
                    <p className="text-sm">
                      <span className="text-gray-600">شهر:</span>{' '}
                      <span className="font-medium">
                        {transaction.receiverCity}, {transaction.receiverCountry}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-700 mb-3">مبالغ</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600">مبلغ ارسالی</p>
                      <p className="text-lg font-bold text-blue-600">
                        {transaction.fromAmount.toLocaleString()} {transaction.fromCurrency}
                      </p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600">مبلغ دریافتی</p>
                      <p className="text-lg font-bold text-green-600">
                        {transaction.toAmount.toLocaleString()} {transaction.toCurrency}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-700 mb-3">شعبه مقصد</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="font-medium">{transaction.destinationBranch?.name || 'Not assigned yet'}</p>
                    <p className="text-sm text-gray-600">
                      {transaction.destinationBranch?.address || 'Destination branch will be assigned after approval.'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {transaction.destinationBranch ? `${transaction.destinationBranch.city}, ${transaction.destinationBranch.country}` : 'Pending branch assignment'}
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      📞 {transaction.destinationBranch.phone}
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">تاریخ ایجاد</p>
                      <p className="font-medium">
                        {new Date(transaction.createdAt).toLocaleString('fa-IR')}
                      </p>
                    </div>
                    {transaction.completedAt && (
                      <div>
                        <p className="text-gray-600">تاریخ تکمیل</p>
                        <p className="font-medium">
                          {new Date(transaction.completedAt).toLocaleString('fa-IR')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {transaction.status === 'PENDING' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800">
                      ⏳ حواله شما در انتظار پرداخت توسط شعبه مقصد است
                    </p>
                  </div>
                )}

                {transaction.status === 'COMPLETED' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800">
                      ✅ حواله شما با موفقیت تکمیل شد
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
