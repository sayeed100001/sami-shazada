import Link from 'next/link'

const ERROR_MESSAGES: Record<string, string> = {
  Configuration: 'Authentication is temporarily unavailable.',
  AccessDenied: 'You do not have permission to sign in.',
  Verification: 'Your verification request is invalid or has expired.',
  Default: 'Sign-in failed. Please try again.',
}

export default function AuthErrorPage({
  searchParams,
}: {
  searchParams?: {
    error?: string
  }
}) {
  const errorCode = searchParams?.error || 'Default'
  const message = ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.Default

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50 px-4 py-16 dark:from-slate-950 dark:via-slate-900 dark:to-red-950">
      <div className="mx-auto max-w-lg rounded-3xl border border-border/60 bg-background/95 p-8 shadow-xl backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-600 dark:text-red-400">
          Authentication Error
        </p>
        <h1 className="mt-3 text-3xl font-bold text-foreground">Sign-in could not be completed</h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">{message}</p>
        <p className="mt-2 text-xs text-muted-foreground">Error code: {errorCode}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/auth/signin"
            className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Back to sign in
          </Link>
          <Link
            href="/"
            className="inline-flex items-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            Return home
          </Link>
        </div>
      </div>
    </div>
  )
}
