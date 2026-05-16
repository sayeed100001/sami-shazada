'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react'
import { Header } from './header'
import { StreamlinedSidebar } from './streamlined-sidebar'
import { PublicSupportChatWidget } from '@/components/chat/PublicSupportChatWidget'
import { useLanguage } from '@/hooks/useLanguage'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { language } = useLanguage()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [key, setKey] = useState(0)
  const role = session?.user?.role || 'VISITOR'
  const isInternalPortalChat = pathname?.startsWith('/portal/internal-chat')
  const isAdminDashboard = pathname === '/admin'
  const isAdminArea = pathname?.startsWith('/admin')
  const isSarafDashboard = pathname === '/portal/saraf'
  const isUserDashboard = pathname === '/portal/user'
  
  // Hide the basic shortcut if we have specialized floating buttons on these dashboards
  const showAuthenticatedMessengerShortcut = 
    role !== 'VISITOR' && 
    !isInternalPortalChat

  const messengerShortcutHref =
    role === 'ADMIN'
      ? '/portal/internal-chat?tab=customers'
      : role === 'USER' || role === 'SARAF'
        ? '/portal/internal-chat?tab=customers'
        : '/portal/internal-chat?tab=operations'

  const isRTL = language === 'fa' || language === 'ps'
  const sidebarToggleLabel = sidebarCollapsed
    ? language === 'en'
      ? 'Open sidebar'
      : language === 'ps'
        ? 'اړخيز پټه پرانیزئ'
        : 'نوار کناری را باز کنید'
    : language === 'en'
      ? 'Collapse sidebar'
      : language === 'ps'
        ? 'اړخيز پټه راټوله کړئ'
        : 'نوار کناری را جمع کنید'

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    setSidebarCollapsed(localStorage.getItem('sidebarCollapsed') === 'true')
  }, [mounted])

  useEffect(() => {
    const handleLanguageChange = () => {
      setKey((prev) => prev + 1)
    }
    window.addEventListener('languageChanged', handleLanguageChange)
    return () => window.removeEventListener('languageChanged', handleLanguageChange)
  }, [])

  useEffect(() => {
    if (status === 'loading') return

    const protectedRoutes = ['/admin', '/portal', '/user']
    const currentPath = window.location.pathname

    if (!session && protectedRoutes.some((route) => currentPath.startsWith(route))) {
      router.push('/auth/signin')
    }
  }, [router, session, status])

  useEffect(() => {
    if (!isInternalPortalChat) return

    const html = document.documentElement
    const body = document.body
    const previousHtmlOverflow = html.style.overflow
    const previousBodyOverflow = body.style.overflow
    const previousBodyOverscroll = body.style.overscrollBehavior

    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    body.style.overscrollBehavior = 'none'

    return () => {
      html.style.overflow = previousHtmlOverflow
      body.style.overflow = previousBodyOverflow
      body.style.overscrollBehavior = previousBodyOverscroll
    }
  }, [isInternalPortalChat])

  const toggleSidebarCollapse = () => {
    const nextValue = !sidebarCollapsed
    setSidebarCollapsed(nextValue)
    if (mounted) {
      localStorage.setItem('sidebarCollapsed', String(nextValue))
    }
  }

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-purple-600" />
      </div>
    )
  }

  return (
    <div
      key={key}
      className={cn(
        'flex min-h-screen flex-col bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_48%,#f8fafc_100%)] dark:bg-[linear-gradient(180deg,#020617_0%,#0f172a_48%,#111827_100%)]',
        isRTL ? 'rtl' : 'ltr'
      )}
    >
      <Header onMenuClick={() => setSidebarOpen((prev) => !prev)} />

      <div className="flex flex-1">
        <StreamlinedSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onToggleCollapse={toggleSidebarCollapse}
          userRole={session?.user?.role || 'VISITOR'}
          collapsed={sidebarCollapsed}
        />

        {sidebarCollapsed ? (
          <Button
            type="button"
            variant="ghost"
            onClick={toggleSidebarCollapse}
            aria-label={sidebarToggleLabel}
            title={sidebarToggleLabel}
            className={cn(
              'fixed top-20 z-[70] hidden h-10 w-10 rounded-2xl border p-0 lg:flex xl:top-24',
              'border-slate-200/90 bg-white text-slate-600 shadow-[0_18px_34px_-20px_rgba(15,23,42,0.35)]',
              'transition-colors hover:bg-violet-50 hover:text-violet-700 dark:border-slate-700 dark:bg-[#111827] dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white',
              isRTL
                ? 'right-[5.5rem] translate-x-1/2'
                : 'left-[5.5rem] -translate-x-1/2'
            )}
          >
            {isRTL ? <ChevronLeft className="h-4.5 w-4.5" /> : <ChevronRight className="h-4.5 w-4.5" />}
          </Button>
        ) : null}

        <main
          className={cn(
            'flex-1 pt-14 sm:pt-16 transition-all duration-300',
            isInternalPortalChat
              ? 'flex h-[calc(100svh-3.5rem)] sm:h-[calc(100svh-4rem)] min-h-0 flex-col overflow-hidden'
              : 'min-h-[calc(100vh-3.5rem)] sm:min-h-[calc(100vh-4rem)]',
            isRTL
              ? sidebarCollapsed
                ? 'lg:pr-[5.5rem] xl:pr-[5.5rem]'
                : 'lg:pr-[17rem] xl:pr-[17rem]'
              : sidebarCollapsed
                ? 'lg:pl-[5.5rem] xl:pl-[5.5rem]'
                : 'lg:pl-[17rem] xl:pl-[17rem]'
          )}
        >
          {isInternalPortalChat ? (
            <div className="flex flex-1 min-h-0 flex-col overflow-hidden">{children}</div>
          ) : (
            <div className="p-2 sm:p-3 lg:p-4 xl:p-6 max-w-full overflow-x-hidden">{children}</div>
          )}
        </main>
      </div>

      {sidebarOpen ? (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      ) : null}

      {!session?.user && !isAdminArea ? <PublicSupportChatWidget /> : null}
      {showAuthenticatedMessengerShortcut ? (
        <div className={cn('fixed bottom-6 z-50', isRTL ? 'left-6' : 'right-6')}>
          <Button
            type="button"
            onClick={() => router.push(messengerShortcutHref)}
            className="h-14 w-14 rounded-full border border-white/10 bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-[0_18px_50px_-28px_rgba(79,70,229,0.5)] transition hover:brightness-105 active:scale-[0.98]"
            title={language === 'en' ? 'Messenger' : language === 'ps' ? 'پیغام رسوونکی' : 'پیام‌رسان'}
          >
            <MessageSquare className="h-6 w-6" />
          </Button>
        </div>
      ) : null}
    </div>
  )
}
