import { isManagedAdvertisementUrl } from '@/lib/advertisement-storage'
import { isManagedImageUrl } from '@/lib/managed-image-storage'

function isAllowedInternalImagePath(url: string) {
  return url.startsWith('/') && !url.startsWith('//') && !url.includes('..') && !url.includes('\\')
}

export function isAllowedManagedOrInternalImageUrl(url: string | null | undefined) {
  if (!url) {
    return true
  }

  return isManagedImageUrl(url) || isAllowedInternalImagePath(url)
}

export function isAllowedAdvertisementImageUrl(url: string | null | undefined) {
  if (!url) {
    return true
  }

  return isManagedAdvertisementUrl(url) || isAllowedInternalImagePath(url)
}

export function assertAllowedManagedOrInternalImageUrl(
  url: string | null | undefined,
  fieldName = 'imageUrl'
) {
  if (!isAllowedManagedOrInternalImageUrl(url)) {
    throw new Error(`${fieldName} must come from managed upload storage or an internal asset path`)
  }
}

export function assertAllowedAdvertisementImageUrl(
  url: string | null | undefined,
  fieldName = 'imageUrl'
) {
  if (!isAllowedAdvertisementImageUrl(url)) {
    throw new Error(`${fieldName} must come from managed advertisement upload storage or an internal asset path`)
  }
}
