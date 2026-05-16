/**
 * Image compression utility for Vercel Blob free tier optimization
 * Compresses images before upload to stay within size limits
 */

export interface CompressionOptions {
  maxSizeMB: number
  maxWidthOrHeight?: number
  quality?: number
}

export async function compressImage(
  file: File,
  options: CompressionOptions = { maxSizeMB: 2, maxWidthOrHeight: 1920, quality: 0.85 }
): Promise<File> {
  // If file is already small enough, return as is
  if (file.size <= options.maxSizeMB * 1024 * 1024 * 0.9) {
    return file
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img

        // Calculate new dimensions
        const maxDimension = options.maxWidthOrHeight || 1920
        if (width > height && width > maxDimension) {
          height = (height * maxDimension) / width
          width = maxDimension
        } else if (height > maxDimension) {
          width = (width * maxDimension) / height
          height = maxDimension
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'))
              return
            }

            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            })

            resolve(compressedFile)
          },
          file.type,
          options.quality || 0.85
        )
      }
      img.onerror = () => reject(new Error('Failed to load image'))
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
  })
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

export function isAudioFile(file: File): boolean {
  return file.type.startsWith('audio/')
}

export function getFileSizeLimit(file: File): { limit: number; type: string } {
  if (isImageFile(file)) {
    return { limit: 2 * 1024 * 1024, type: 'image' }
  }
  if (isAudioFile(file)) {
    return { limit: 1.5 * 1024 * 1024, type: 'audio' }
  }
  return { limit: 1 * 1024 * 1024, type: 'document' }
}
