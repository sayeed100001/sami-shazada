'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { X, FileIcon, ImageIcon, Mic, AlertTriangle } from 'lucide-react'
import { compressImage, formatFileSize, isImageFile, isAudioFile, getFileSizeLimit } from '@/lib/image-compression'

interface FileUploadPreviewProps {
  file: File | null
  onCancel: () => void
  onConfirm: (file: File) => Promise<void>
  language: string
}

export function FileUploadPreview({
  file,
  onCancel,
  onConfirm,
  language,
}: FileUploadPreviewProps) {
  const [compressing, setCompressing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [compressedFile, setCompressedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const pick = (fa: string, en: string, ps: string) =>
    language === 'en' ? en : language === 'ps' ? ps : fa

  useEffect(() => {
    if (!file) {
      setCompressedFile(null)
      setPreviewUrl(null)
      setError(null)
      return
    }

    const { limit, type } = getFileSizeLimit(file)

    // Check if file exceeds limit
    if (file.size > limit) {
      if (isImageFile(file)) {
        // Try to compress
        setCompressing(true)
        compressImage(file, { maxSizeMB: limit / (1024 * 1024), maxWidthOrHeight: 1920, quality: 0.85 })
          .then((compressed) => {
            if (compressed.size > limit) {
              setError(
                pick(
                  `تصویر خیلی بزرگ است. حداکثر ${formatFileSize(limit)} مجاز است.`,
                  `Image is too large. Maximum ${formatFileSize(limit)} allowed.`,
                  `انځور ډېر لوی دی. حداکثر ${formatFileSize(limit)} اجازه لري.`
                )
              )
            } else {
              setCompressedFile(compressed)
            }
          })
          .catch(() => {
            setError(
              pick(
                'خطا در فشردهسازی تصویر',
                'Failed to compress image',
                'د انځور په فشردولو کې ستونزه'
              )
            )
          })
          .finally(() => setCompressing(false))
      } else {
        setError(
          pick(
            `فایل خیلی بزرگ است. حداکثر ${formatFileSize(limit)} برای ${type} مجاز است.`,
            `File is too large. Maximum ${formatFileSize(limit)} allowed for ${type}.`,
            `فایل ډېر لوی دی. حداکثر ${formatFileSize(limit)} د ${type} لپاره اجازه لري.`
          )
        )
      }
    } else {
      setCompressedFile(file)
    }

    // Create preview for images
    if (isImageFile(file)) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [file, language])

  const handleConfirm = async () => {
    const fileToUpload = compressedFile || file
    if (!fileToUpload || error) return

    setUploading(true)
    setProgress(0)

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 10, 90))
    }, 200)

    try {
      await onConfirm(fileToUpload)
      setProgress(100)
    } catch (err) {
      setError(
        pick(
          'خطا در ارسال فایل',
          'Failed to upload file',
          'د فایل په لېږلو کې ستونزه'
        )
      )
    } finally {
      clearInterval(progressInterval)
      setUploading(false)
      setProgress(0)
    }
  }

  if (!file) return null

  const finalFile = compressedFile || file
  const { limit } = getFileSizeLimit(file)
  const isOverLimit = finalFile.size > limit
  const compressionSaved = file.size - (compressedFile?.size || file.size)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">
            {pick('پیشنمایش فایل', 'File Preview', 'د فایل مخکتنه')}
          </h3>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onCancel}
            className="text-white hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Preview Area */}
        <div className="mb-4 overflow-hidden rounded-[24px] border border-white/10 bg-black/20">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Preview"
              className="max-h-96 w-full object-contain"
            />
          ) : (
            <div className="flex h-48 items-center justify-center">
              {isAudioFile(file) ? (
                <Mic className="h-16 w-16 text-white/40" />
              ) : (
                <FileIcon className="h-16 w-16 text-white/40" />
              )}
            </div>
          )}
        </div>

        {/* File Info */}
        <div className="mb-4 space-y-2 rounded-[20px] border border-white/10 bg-white/5 p-4 text-sm text-white">
          <div className="flex items-center justify-between">
            <span className="text-white/60">
              {pick('نام فایل:', 'File name:', 'د فایل نوم:')}
            </span>
            <span className="truncate font-mono">{file.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/60">
              {pick('حجم اصلی:', 'Original size:', 'اصلي حجم:')}
            </span>
            <span className="font-mono">{formatFileSize(file.size)}</span>
          </div>
          {compressedFile && compressedFile !== file && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-white/60">
                  {pick('حجم فشرده:', 'Compressed size:', 'فشرده حجم:')}
                </span>
                <span className="font-mono text-green-400">
                  {formatFileSize(compressedFile.size)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60">
                  {pick('صرفهجویی:', 'Saved:', 'خوندي شوی:')}
                </span>
                <span className="font-mono text-green-400">
                  {formatFileSize(compressionSaved)} (
                  {Math.round((compressionSaved / file.size) * 100)}%)
                </span>
              </div>
            </>
          )}
          <div className="flex items-center justify-between">
            <span className="text-white/60">
              {pick('حداکثر مجاز:', 'Max allowed:', 'حداکثر اجازه:')}
            </span>
            <span className="font-mono">{formatFileSize(limit)}</span>
          </div>
        </div>

        {/* Warnings */}
        {compressing && (
          <Alert className="mb-4 border-blue-500/50 bg-blue-500/10">
            <AlertDescription className="text-blue-200">
              {pick(
                'در حال فشردهسازی تصویر...',
                'Compressing image...',
                'انځور فشردېږي...'
              )}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="mb-4 border-red-500/50 bg-red-500/10">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-200">{error}</AlertDescription>
          </Alert>
        )}

        {!error && compressionSaved > 0 && (
          <Alert className="mb-4 border-green-500/50 bg-green-500/10">
            <AlertDescription className="text-green-200">
              {pick(
                `تصویر با موفقیت فشرده شد و ${formatFileSize(compressionSaved)} صرفهجویی شد!`,
                `Image compressed successfully, saved ${formatFileSize(compressionSaved)}!`,
                `انځور په برياليتوب فشرده شو، ${formatFileSize(compressionSaved)} خوندي شو!`
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Upload Progress */}
        {uploading && (
          <div className="mb-4 space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-center text-sm text-white/60">
              {pick(
                `در حال آپلود... ${progress}%`,
                `Uploading... ${progress}%`,
                `اپلوډېږي... ${progress}%`
              )}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={uploading}
            className="flex-1"
          >
            {pick('لغو', 'Cancel', 'لغوه')}
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={uploading || compressing || !!error || isOverLimit}
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          >
            {uploading
              ? pick('در حال ارسال...', 'Sending...', 'لېږل کېږي...')
              : pick('ارسال', 'Send', 'لېږل')}
          </Button>
        </div>
      </div>
    </div>
  )
}
