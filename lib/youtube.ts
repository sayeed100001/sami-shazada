export function extractYouTubeId(url: string): string | null {
  if (!url) return null
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/playlist\?list=([^&\n?#]+)/
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  
  return null
}

export function getYouTubeEmbedUrl(url: string): string | null {
  const id = extractYouTubeId(url)
  if (!id) return null
  
  if (url.includes('playlist')) {
    return `https://www.youtube.com/embed/videoseries?list=${id}`
  }
  
  return `https://www.youtube.com/embed/${id}`
}

export function getYouTubeThumbnail(url: string): string | null {
  const id = extractYouTubeId(url)
  if (!id || url.includes('playlist')) return null
  
  return `https://img.youtube.com/vi/${id}/maxresdefault.jpg`
}
