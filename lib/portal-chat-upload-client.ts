'use client'

import {
  PORTAL_CHAT_MAX_IMAGE_BYTES,
  PORTAL_CHAT_MAX_IMAGE_DIMENSION,
  PORTAL_CHAT_MAX_UPLOAD_BYTES,
  formatPortalUploadLimit,
} from '@/lib/portal-chat-upload'

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to read image'))
    }

    image.src = objectUrl
  })
}

async function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/webp', quality)
  })
}

export async function preparePortalChatUpload(file: File) {
  if (!file.type.startsWith('image/')) {
    if (file.size > PORTAL_CHAT_MAX_UPLOAD_BYTES) {
      throw new Error(`File is larger than ${formatPortalUploadLimit()}.`)
    }
    return file
  }

  if (file.type === 'image/gif') {
    if (file.size > PORTAL_CHAT_MAX_UPLOAD_BYTES) {
      throw new Error(`Animated GIF files must stay under ${formatPortalUploadLimit()}.`)
    }
    return file
  }

  if (file.size <= PORTAL_CHAT_MAX_IMAGE_BYTES) {
    return file
  }

  const image = await loadImage(file)
  const ratio = Math.min(1, PORTAL_CHAT_MAX_IMAGE_DIMENSION / Math.max(image.width, image.height))
  let width = Math.max(1, Math.round(image.width * ratio))
  let height = Math.max(1, Math.round(image.height * ratio))

  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Image compression is not available in this browser.')
  }

  const qualitySteps = [0.86, 0.78, 0.7, 0.62, 0.54]

  for (let scaleAttempt = 0; scaleAttempt < 4; scaleAttempt += 1) {
    canvas.width = width
    canvas.height = height
    context.clearRect(0, 0, width, height)
    context.drawImage(image, 0, 0, width, height)

    for (const quality of qualitySteps) {
      const blob = await canvasToBlob(canvas, quality)
      if (blob && blob.size <= PORTAL_CHAT_MAX_IMAGE_BYTES) {
        const outputName = file.name.replace(/\.[^.]+$/, '.webp')
        return new File([blob], outputName, {
          type: 'image/webp',
          lastModified: Date.now(),
        })
      }
    }

    width = Math.max(320, Math.round(width * 0.82))
    height = Math.max(320, Math.round(height * 0.82))
  }

  throw new Error(`Image could not be reduced under ${formatPortalUploadLimit()}. Try a smaller image.`)
}
