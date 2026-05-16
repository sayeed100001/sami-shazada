'use client';

import { Share2, Facebook, Twitter, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface CleanSocialShareProps {
  url?: string;
  title?: string;
  description?: string;
}

export default function CleanSocialShare({ 
  url = typeof window !== 'undefined' ? window.location.href : '',
  title = 'سرای شهزاده - پلتفورم مالی افغانستان',
  description = 'پلتفورم جامع مالی برای افغانستان'
}: CleanSocialShareProps) {
  const [isSharing, setIsSharing] = useState(false);

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${title} - ${url}`)}`
  };

  const handleShare = async (platform: string) => {
    setIsSharing(true);
    
    try {
      if (platform === 'native' && navigator.share) {
        await navigator.share({
          title,
          text: description,
          url
        });
      } else {
        const shareUrl = shareLinks[platform as keyof typeof shareLinks];
        if (shareUrl) {
          window.open(shareUrl, '_blank', 'width=600,height=400,scrollbars=yes,resizable=yes');
        }
      }
    } catch (error) {
      // Silently handle share errors
    } finally {
      setIsSharing(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      // Could add toast notification here
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  return (
      <div className="flex items-center gap-2 p-2">
      {/* Native Share (if supported) */}
      {typeof navigator !== 'undefined' &&
        'share' in navigator &&
        typeof (navigator as any).share === 'function' && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleShare('native')}
          disabled={isSharing}
          className="flex items-center gap-1"
        >
          <Share2 className="h-4 w-4" />
          اشتراک
        </Button>
      )}

      {/* Facebook */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleShare('facebook')}
        disabled={isSharing}
        className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
      >
        <Facebook className="h-4 w-4" />
        فیسبوک
      </Button>

      {/* Twitter */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleShare('twitter')}
        disabled={isSharing}
        className="flex items-center gap-1 text-sky-500 hover:text-sky-600"
      >
        <Twitter className="h-4 w-4" />
        توییتر
      </Button>

      {/* Telegram */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleShare('telegram')}
        disabled={isSharing}
        className="flex items-center gap-1 text-blue-500 hover:text-blue-600"
      >
        <MessageCircle className="h-4 w-4" />
        تلگرام
      </Button>

      {/* Copy Link */}
      <Button
        variant="outline"
        size="sm"
        onClick={copyToClipboard}
        className="flex items-center gap-1"
      >
        کپی لینک
      </Button>
    </div>
  );
}
