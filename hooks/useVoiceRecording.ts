'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { checkVoiceRecordingSupport, requestMicrophoneAccess, getSupportedMimeType } from '@/lib/voice-recording-handler'

interface UseVoiceRecordingProps {
  onRecordingComplete: (file: File) => Promise<void>
  maxDurationSeconds: number
  audioBitsPerSecond: number
  language: 'fa' | 'en' | 'ps'
}

export function useVoiceRecording({
  onRecordingComplete,
  maxDurationSeconds,
  audioBitsPerSecond,
  language,
}: UseVoiceRecordingProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingChunksRef = useRef<Blob[]>([])
  const recordingStreamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<number | null>(null)

  const pick = (fa: string, en: string, ps: string) => {
    if (language === 'en') return en
    if (language === 'ps') return ps
    return fa
  }

  const startRecording = async () => {
    const support = await checkVoiceRecordingSupport()
    if (!support.supported && support.error) {
      toast.error(pick(support.error.userMessage.fa, support.error.userMessage.en, support.error.userMessage.ps))
      return false
    }

    const { stream, error } = await requestMicrophoneAccess()
    if (!stream || error) {
      toast.error(pick(error!.userMessage.fa, error!.userMessage.en, error!.userMessage.ps))
      return false
    }

    const mimeType = getSupportedMimeType()
    const recorder = new MediaRecorder(
      stream,
      mimeType ? { mimeType, audioBitsPerSecond } : { audioBitsPerSecond }
    )

    recordingStreamRef.current = stream
    recordingChunksRef.current = []
    mediaRecorderRef.current = recorder
    setRecordingSeconds(0)
    setIsRecording(true)
    toast.message(pick('ضبط صدا شروع شد', 'Recording started', 'غږ ثبت پیل شو'))

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) recordingChunksRef.current.push(event.data)
    }

    recorder.onerror = () => {
      cleanup()
      toast.error(pick('ضبط صدا با خطا متوقف شد', 'Recording stopped due to error', 'د غږ ثبت د خطا له امله ودرید'))
    }

    stream.getAudioTracks().forEach((track) => {
      track.onended = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop()
        }
      }
    })

    recorder.onstop = async () => {
      const activeStream = recordingStreamRef.current
      recordingStreamRef.current = null
      activeStream?.getTracks().forEach((track) => track.stop())
      setIsRecording(false)
      setRecordingSeconds(0)
      mediaRecorderRef.current = null

      if (timerRef.current) {
        window.clearInterval(timerRef.current)
        timerRef.current = null
      }

      if (!recordingChunksRef.current.length) {
        toast.error(pick('فایل صوتی ایجاد نشد', 'No audio captured', 'هیڅ غږیز فایل جوړ نه شو'))
        return
      }

      const extension = recorder.mimeType.includes('ogg') ? 'ogg' : 'webm'
      const voiceFile = new File(
        recordingChunksRef.current,
        `voice-note-${Date.now()}.${extension}`,
        { type: recorder.mimeType || `audio/${extension}` }
      )
      recordingChunksRef.current = []

      try {
        await onRecordingComplete(voiceFile)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to send voice note')
      }
    }

    recorder.start()

    timerRef.current = window.setInterval(() => {
      setRecordingSeconds((prev) => {
        if (prev + 1 >= maxDurationSeconds) {
          stopRecording()
        }
        return prev + 1
      })
    }, 1000)

    return true
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
  }

  const cleanup = () => {
    const activeStream = recordingStreamRef.current
    recordingStreamRef.current = null
    activeStream?.getTracks().forEach((track) => track.stop())
    recordingChunksRef.current = []
    mediaRecorderRef.current = null
    setIsRecording(false)
    setRecordingSeconds(0)
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const toggleRecording = async () => {
    if (isRecording) {
      stopRecording()
    } else {
      await startRecording()
    }
  }

  return {
    isRecording,
    recordingSeconds,
    toggleRecording,
    cleanup,
  }
}
