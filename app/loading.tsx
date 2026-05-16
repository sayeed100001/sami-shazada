export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 gradient-bg rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
          <span className="text-white font-bold text-2xl">س</span>
        </div>
        <div className="loading-spinner mx-auto mb-4"></div>
        <p className="text-muted-foreground">در حال بارگذاری...</p>
      </div>
    </div>
  )
}