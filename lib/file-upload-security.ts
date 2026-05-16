import path from 'path'
import crypto from 'crypto'
import { writeFile, mkdir } from 'fs/promises'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx']

interface UploadOptions {
  maxSize?: number
  allowedTypes?: string[]
  allowedExtensions?: string[]
  folder?: string
}

interface UploadResult {
  success: boolean
  filename?: string
  path?: string
  url?: string
  error?: string
}

function sanitizeFilename(filename: string): string {
  const ext = path.extname(filename).toLowerCase()
  const name = path.basename(filename, ext)
  const sanitized = name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50)
  const hash = crypto.randomBytes(8).toString('hex')
  return `${sanitized}_${hash}${ext}`
}

function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type)
}

function validateFileExtension(filename: string, allowedExtensions: string[]): boolean {
  const ext = path.extname(filename).toLowerCase()
  return allowedExtensions.includes(ext)
}

function validateFileSize(size: number, maxSize: number): boolean {
  return size > 0 && size <= maxSize
}

async function scanFileContent(buffer: Buffer, filename: string): Promise<boolean> {
  const ext = path.extname(filename).toLowerCase()
  
  // Check for executable signatures
  const executableSignatures = [
    Buffer.from([0x4D, 0x5A]), // EXE
    Buffer.from([0x7F, 0x45, 0x4C, 0x46]), // ELF
    Buffer.from([0xCA, 0xFE, 0xBA, 0xBE]), // Mach-O
  ]
  
  for (const signature of executableSignatures) {
    if (buffer.subarray(0, signature.length).equals(signature)) {
      return false
    }
  }
  
  // Check for script tags in images
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
    const content = buffer.toString('utf8', 0, Math.min(buffer.length, 1024))
    if (/<script|javascript:|onerror=/i.test(content)) {
      return false
    }
  }
  
  return true
}

export async function uploadFile(
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const {
    maxSize = MAX_FILE_SIZE,
    allowedTypes = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES],
    allowedExtensions = ALLOWED_EXTENSIONS,
    folder = 'uploads'
  } = options

  // Validate file size
  if (!validateFileSize(file.size, maxSize)) {
    return {
      success: false,
      error: `File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`
    }
  }

  // Validate file type
  if (!validateFileType(file, allowedTypes)) {
    return {
      success: false,
      error: 'File type not allowed'
    }
  }

  // Validate file extension
  if (!validateFileExtension(file.name, allowedExtensions)) {
    return {
      success: false,
      error: 'File extension not allowed'
    }
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())

    // Scan file content
    const isSafe = await scanFileContent(buffer, file.name)
    if (!isSafe) {
      return {
        success: false,
        error: 'File contains potentially malicious content'
      }
    }

    // Generate safe filename
    const safeFilename = sanitizeFilename(file.name)
    const uploadDir = path.join(process.cwd(), 'private', folder)
    const filePath = path.join(uploadDir, safeFilename)

    // Create directory if not exists
    await mkdir(uploadDir, { recursive: true })

    // Write file
    await writeFile(filePath, buffer)

    return {
      success: true,
      filename: safeFilename,
      path: filePath,
      url: `/api/files/${folder}/${safeFilename}`
    }
  } catch (error) {
    console.error('File upload error:', error)
    return {
      success: false,
      error: 'Failed to upload file'
    }
  }
}

export function validateImageDimensions(
  buffer: Buffer,
  maxWidth: number = 4096,
  maxHeight: number = 4096
): boolean {
  // Basic PNG check
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) {
    const width = buffer.readUInt32BE(16)
    const height = buffer.readUInt32BE(20)
    return width <= maxWidth && height <= maxHeight
  }

  // Basic JPEG check
  if (buffer.subarray(0, 2).equals(Buffer.from([0xFF, 0xD8]))) {
    // JPEG validation would require more complex parsing
    return true
  }

  return true
}
