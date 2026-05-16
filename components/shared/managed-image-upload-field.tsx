'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { ImagePlus, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type ManagedImageUploadFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  scope: string
  accept?: string
  maxSizeMb?: number
  maxSizeBytes?: number
  maxSizeLabel?: string
  disabled?: boolean
  helperText?: string
  previewAlt?: string
  uploadLabel?: string
  clearLabel?: string
  emptyLabel?: string
  uploadSuccessMessage?: string
  previewHeightClassName?: string
}

export function ManagedImageUploadField({
  label,
  value,
  onChange,
  scope,
  accept = 'image/png,image/jpeg,image/webp,image/gif',
  maxSizeMb = 5,
  maxSizeBytes,
  maxSizeLabel,
  disabled = false,
  helperText,
  previewAlt = 'Uploaded image',
  uploadLabel = 'Upload image',
  clearLabel = 'Clear',
  emptyLabel = 'No image uploaded yet',
  uploadSuccessMessage = 'Image uploaded successfully.',
  previewHeightClassName = 'h-48',
}: ManagedImageUploadFieldProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const resetSelection = () => {
    setSelectedFile(null)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Select an image first.')
      return
    }

    const maxBytes = maxSizeBytes ?? maxSizeMb * 1024 * 1024
    const limitLabel = maxSizeLabel || `${maxSizeMb}MB`
    if (selectedFile.size > maxBytes) {
      toast.error(`Image must be at most ${limitLabel}.`)
      return
    }

    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', selectedFile)
      form.append('scope', scope)

      const response = await fetch('/api/admin/uploads/image', {
        method: 'POST',
        body: form,
      })

      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.url) {
        throw new Error(data?.error || 'Upload failed')
      }

      onChange(data.url)
      resetSelection()
      toast.success(uploadSuccessMessage)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>{label}</Label>
        {helperText ? <p className="text-xs text-muted-foreground">{helperText}</p> : null}
      </div>

      <Input
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={disabled || uploading}
        onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => void handleUpload()}
          disabled={disabled || uploading || !selectedFile}
        >
          <Upload className="mr-2 h-4 w-4" />
          {uploading ? 'Uploading...' : uploadLabel}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            resetSelection()
            onChange('')
          }}
          disabled={disabled || uploading || (!value && !selectedFile)}
        >
          <X className="mr-2 h-4 w-4" />
          {clearLabel}
        </Button>
      </div>

      {value ? (
        <div className={`relative overflow-hidden rounded-xl border bg-muted/30 ${previewHeightClassName}`}>
          <Image src={value} alt={previewAlt} fill className="object-cover" />
        </div>
      ) : (
        <div className={`flex items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground ${previewHeightClassName}`}>
          <div className="flex flex-col items-center gap-2 text-center">
            <ImagePlus className="h-6 w-6" />
            <span>{emptyLabel}</span>
          </div>
        </div>
      )}
    </div>
  )
}
