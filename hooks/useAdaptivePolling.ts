'use client'

import { useEffect, useRef, useState } from 'react'

type PageActivityState = {
  isVisible: boolean
  isFocused: boolean
  isActive: boolean
}

type AdaptivePollingOptions = {
  enabled?: boolean
  activeIntervalMs: number
  idleIntervalMs?: number
  hiddenIntervalMs?: number | false
  runImmediately?: boolean
  immediateOnResume?: boolean
}

function getPageActivityState(): PageActivityState {
  if (typeof document === 'undefined') {
    return {
      isVisible: true,
      isFocused: true,
      isActive: true,
    }
  }

  const isVisible = document.visibilityState !== 'hidden'
  const isFocused = typeof document.hasFocus === 'function' ? document.hasFocus() : true

  return {
    isVisible,
    isFocused,
    isActive: isVisible && isFocused,
  }
}

export function usePageActivity() {
  const [activity, setActivity] = useState<PageActivityState>(() => getPageActivityState())

  useEffect(() => {
    const updateActivity = () => {
      setActivity(getPageActivityState())
    }

    updateActivity()

    document.addEventListener('visibilitychange', updateActivity)
    window.addEventListener('focus', updateActivity)
    window.addEventListener('blur', updateActivity)

    return () => {
      document.removeEventListener('visibilitychange', updateActivity)
      window.removeEventListener('focus', updateActivity)
      window.removeEventListener('blur', updateActivity)
    }
  }, [])

  return activity
}

export function useAdaptivePolling(
  callback: () => void | Promise<void>,
  {
    enabled = true,
    activeIntervalMs,
    idleIntervalMs,
    hiddenIntervalMs = false,
    runImmediately = true,
    immediateOnResume = true,
  }: AdaptivePollingOptions
) {
  const { isVisible, isFocused, isActive } = usePageActivity()
  const callbackRef = useRef(callback)
  const inFlightRef = useRef(false)
  const wasActiveRef = useRef(isActive)

  callbackRef.current = callback

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return
    }

    let cancelled = false
    let timeoutId: number | null = null

    const clearTimer = () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
        timeoutId = null
      }
    }

    const getDelay = () => {
      if (!isVisible) {
        return hiddenIntervalMs === false ? null : hiddenIntervalMs
      }

      if (!isFocused) {
        return idleIntervalMs ?? Math.max(activeIntervalMs * 2, activeIntervalMs + 1000)
      }

      return activeIntervalMs
    }

    const scheduleNext = () => {
      clearTimer()

      const delay = getDelay()
      if (delay == null || delay < 0) {
        return
      }

      timeoutId = window.setTimeout(() => {
        void run()
      }, delay)
    }

    const run = async () => {
      if (cancelled) {
        return
      }

      if (inFlightRef.current) {
        scheduleNext()
        return
      }

      inFlightRef.current = true

      try {
        await callbackRef.current()
      } finally {
        inFlightRef.current = false
        if (!cancelled) {
          scheduleNext()
        }
      }
    }

    if (runImmediately) {
      void run()
    } else {
      scheduleNext()
    }

    return () => {
      cancelled = true
      clearTimer()
    }
  }, [
    activeIntervalMs,
    enabled,
    hiddenIntervalMs,
    idleIntervalMs,
    immediateOnResume,
    isActive,
    isFocused,
    isVisible,
    runImmediately,
  ])

  useEffect(() => {
    const wasActive = wasActiveRef.current
    wasActiveRef.current = isActive

    if (!enabled || !immediateOnResume || !isActive || wasActive) {
      return
    }

    void callbackRef.current()
  }, [enabled, immediateOnResume, isActive])
}
