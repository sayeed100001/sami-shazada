export const IMAGE_UPLOAD_LIMITS = {
  avatar: {
    maxBytes: 2 * 1024 * 1024,
    label: '2MB',
  },
  advertisement: {
    maxBytes: 200 * 1024,
    label: '200KB',
  },
  homeContent: {
    maxBytes: 2 * 1024 * 1024,
    label: '2MB',
  },
  educationCourse: {
    maxBytes: 2 * 1024 * 1024,
    label: '2MB',
  },
  brandingLogo: {
    maxBytes: 1024 * 1024,
    label: '1MB',
  },
  brandingFavicon: {
    maxBytes: 512 * 1024,
    label: '512KB',
  },
  brandingDefault: {
    maxBytes: 2 * 1024 * 1024,
    label: '2MB',
  },
  contentImage: {
    maxBytes: 512 * 1024,
    label: '512KB',
  },
} as const
