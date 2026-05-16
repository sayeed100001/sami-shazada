'use client'

declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void
      execute: (siteKey: string, options: { action: string }) => Promise<string>
    }
  }
}

const RECAPTCHA_SCRIPT_ID = 'google-recaptcha-script'

export async function loadRecaptchaScript(siteKey: string, scriptUrl?: string) {
  if (typeof window === 'undefined') {
    throw new Error('reCAPTCHA is only available in the browser')
  }

  if (window.grecaptcha) {
    return
  }

  const existingScript = document.getElementById(RECAPTCHA_SCRIPT_ID) as HTMLScriptElement | null

  if (existingScript) {
    await waitForRecaptcha()
    return
  }

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.id = RECAPTCHA_SCRIPT_ID
    if (!scriptUrl) {
      reject(new Error('reCAPTCHA script URL is not configured'))
      return
    }

    const targetScriptUrl = scriptUrl
    script.src = targetScriptUrl.includes('render=')
      ? targetScriptUrl
      : `${targetScriptUrl}${targetScriptUrl.includes('?') ? '&' : '?'}render=${encodeURIComponent(siteKey)}`
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load reCAPTCHA script'))
    document.head.appendChild(script)
  })

  await waitForRecaptcha()
}

function waitForRecaptcha() {
  return new Promise<void>((resolve, reject) => {
    const startedAt = Date.now()

    const check = () => {
      if (typeof window !== 'undefined' && window.grecaptcha) {
        resolve()
        return
      }

      if (Date.now() - startedAt > 8000) {
        reject(new Error('reCAPTCHA did not initialize in time'))
        return
      }

      window.setTimeout(check, 100)
    }

    check()
  })
}

export async function executeRecaptcha(siteKey: string, action: string, scriptUrl?: string) {
  await loadRecaptchaScript(siteKey, scriptUrl)

  return new Promise<string>((resolve, reject) => {
    window.grecaptcha?.ready(async () => {
      try {
        const token = await window.grecaptcha?.execute(siteKey, { action })
        if (!token) {
          reject(new Error('reCAPTCHA token was not generated'))
          return
        }
        resolve(token)
      } catch (error) {
        reject(error instanceof Error ? error : new Error('reCAPTCHA execution failed'))
      }
    })
  })
}
