/**
 * VOICE RECORDING HANDLER
 * Enterprise-grade voice recording with comprehensive error handling
 */

export interface VoiceRecordingError {
  code: string
  message: string
  userMessage: {
    fa: string
    en: string
    ps: string
  }
}

export const VOICE_ERRORS = {
  NO_CHAT_SELECTED: {
    code: 'NO_CHAT_SELECTED',
    message: 'No chat selected',
    userMessage: {
      fa: 'ابتدا یک گفتگو را انتخاب کنید',
      en: 'Select a chat first',
      ps: 'لومړی یو چټ وټاکئ',
    },
  },
  NO_BROWSER_SUPPORT: {
    code: 'NO_BROWSER_SUPPORT',
    message: 'Browser does not support voice recording',
    userMessage: {
      fa: 'مرورگر شما از ضبط صدا پشتیبانی نمیکند',
      en: 'Your browser does not support voice recording',
      ps: 'ستاسو براوزر د غږ ثبتولو ملاتړ نه کوي',
    },
  },
  NO_SECURE_CONTEXT: {
    code: 'NO_SECURE_CONTEXT',
    message: 'Requires HTTPS or localhost',
    userMessage: {
      fa: 'برای ضبط صدا باید از HTTPS یا localhost استفاده شود',
      en: 'Voice recording requires HTTPS or localhost',
      ps: 'د غږ ثبتولو لپاره HTTPS یا localhost پکار دی',
    },
  },
  PERMISSION_DENIED: {
    code: 'PERMISSION_DENIED',
    message: 'Microphone permission denied',
    userMessage: {
      fa: 'اجازه میکروفون رد شد. روی آیکون قفل کنار آدرس کلیک کنید و میکروفون را مجاز کنید',
      en: 'Microphone permission denied. Click the lock icon next to the address and allow microphone',
      ps: 'د مایکروفون اجازه رد شوه. د ادرس تر څنګ د قفل آیکون کلیک کړئ او مایکروفون اجازه ورکړئ',
    },
  },
  NO_MICROPHONE: {
    code: 'NO_MICROPHONE',
    message: 'No microphone found',
    userMessage: {
      fa: 'میکروفون پیدا نشد. لطفاً میکروفون را وصل کنید',
      en: 'No microphone found. Please connect a microphone',
      ps: 'مایکروفون ونه موندل شو. مهرباني وکړئ مایکروفون وصل کړئ',
    },
  },
  MICROPHONE_IN_USE: {
    code: 'MICROPHONE_IN_USE',
    message: 'Microphone is being used by another application',
    userMessage: {
      fa: 'میکروفون توسط برنامه دیگری استفاده میشود',
      en: 'Microphone is being used by another application',
      ps: 'مایکروفون د بل برنامې لخوا کارول کېږي',
    },
  },
  UNSUPPORTED_SETTINGS: {
    code: 'UNSUPPORTED_SETTINGS',
    message: 'Microphone settings not supported',
    userMessage: {
      fa: 'تنظیمات میکروفون پشتیبانی نمیشود',
      en: 'Microphone settings not supported',
      ps: 'د مایکروفون تنظیمات ملاتړ نه کېږي',
    },
  },
} as const

export async function checkVoiceRecordingSupport(): Promise<{
  supported: boolean
  error?: VoiceRecordingError
}> {
  if (typeof window === 'undefined') {
    return { supported: false, error: VOICE_ERRORS.NO_BROWSER_SUPPORT }
  }

  if (!navigator?.mediaDevices?.getUserMedia) {
    return { supported: false, error: VOICE_ERRORS.NO_BROWSER_SUPPORT }
  }

  if (window.isSecureContext === false) {
    return { supported: false, error: VOICE_ERRORS.NO_SECURE_CONTEXT }
  }

  const hasMediaRecorder = typeof window.MediaRecorder !== 'undefined'
  const hasAudioContext = typeof (window as any).AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined'
  if (!hasMediaRecorder && !hasAudioContext) {
    return { supported: false, error: VOICE_ERRORS.NO_BROWSER_SUPPORT }
  }

  try {
    if (navigator.permissions?.query) {
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName })
      if (permissionStatus.state === 'denied') {
        return { supported: false, error: VOICE_ERRORS.PERMISSION_DENIED }
      }
    }
  } catch {
    // Permission API not available, continue
  }

  return { supported: true }
}

export async function requestMicrophoneAccess(): Promise<{
  stream: MediaStream | null
  error?: VoiceRecordingError
}> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    })
    return { stream }
  } catch (error) {
    const name = error instanceof Error ? error.name : ''

    if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
      return { stream: null, error: VOICE_ERRORS.PERMISSION_DENIED }
    }

    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return { stream: null, error: VOICE_ERRORS.NO_MICROPHONE }
    }

    if (name === 'NotReadableError' || name === 'TrackStartError') {
      return { stream: null, error: VOICE_ERRORS.MICROPHONE_IN_USE }
    }

    if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
      return { stream: null, error: VOICE_ERRORS.UNSUPPORTED_SETTINGS }
    }

    return {
      stream: null,
      error: {
        code: 'UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        userMessage: {
          fa: `خطا در شروع ضبط صدا: ${error instanceof Error ? error.message : 'نامشخص'}`,
          en: `Failed to start recording: ${error instanceof Error ? error.message : 'Unknown'}`,
          ps: `د ثبت پیل کې خطا: ${error instanceof Error ? error.message : 'نامعلوم'}`,
        },
      },
    }
  }
}

export function getSupportedMimeType(): string {
  if (typeof window === 'undefined' || typeof window.MediaRecorder === 'undefined') return ''

  const candidates = [
    'audio/webm;codecs=opus',
    'audio/ogg;codecs=opus',
    'audio/webm',
    'audio/ogg',
    // Safari commonly supports MP4/AAC when MediaRecorder is available.
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4',
    'audio/aac',
  ]

  for (const candidate of candidates) {
    try {
      if (window.MediaRecorder.isTypeSupported(candidate)) return candidate
    } catch {
      // Ignore and try next candidate.
    }
  }

  return ''
}

export function getPreferredAudioExtension(mimeType: string): string {
  const base = (mimeType || '').split(';')[0].trim().toLowerCase()
  if (base === 'audio/ogg') return 'ogg'
  if (base === 'audio/webm') return 'webm'
  if (base === 'audio/mp4' || base === 'audio/x-m4a' || base === 'audio/aac') return 'm4a'
  if (base === 'audio/mpeg' || base === 'audio/mp3') return 'mp3'
  if (base === 'audio/wav' || base === 'audio/wave' || base === 'audio/x-wav') return 'wav'
  return 'webm'
}
