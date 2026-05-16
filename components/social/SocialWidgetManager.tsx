'use client';

import { useEffect, useState } from 'react';

interface SocialWidgetManagerProps {
  enableFacebook?: boolean;
  enableGoogle?: boolean;
  enableYoutube?: boolean;
}

export default function SocialWidgetManager({ 
  enableFacebook = false, 
  enableGoogle = false, 
  enableYoutube = false 
}: SocialWidgetManagerProps) {
  const [scriptsLoaded, setScriptsLoaded] = useState(false);

  useEffect(() => {
    let cleanup: (() => void)[] = [];

    const loadScript = (src: string, id: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        // Check if script already exists
        if (document.getElementById(id)) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.id = id;
        script.src = src;
        script.async = true;
        script.defer = true;
        
        script.onload = () => resolve();
        script.onerror = () => {
          console.warn(`Failed to load script: ${src}`);
          resolve(); // Don't reject, just continue
        };

        document.head.appendChild(script);
        
        cleanup.push(() => {
          const scriptEl = document.getElementById(id);
          if (scriptEl) {
            scriptEl.remove();
          }
        });
      });
    };

    const initializeWidgets = async () => {
      try {
        const promises: Promise<void>[] = [];

        if (enableFacebook) {
          promises.push(loadScript('https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v18.0', 'facebook-jssdk'));
        }

        if (enableGoogle) {
          promises.push(loadScript('https://apis.google.com/js/platform.js', 'google-platform'));
        }

        if (enableYoutube) {
          promises.push(loadScript('https://www.youtube.com/iframe_api', 'youtube-api'));
        }

        await Promise.allSettled(promises);
        
        // Initialize Facebook SDK if loaded
        if (enableFacebook && window.FB) {
          window.FB.init({
            appId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '',
            cookie: true,
            xfbml: true,
            version: 'v18.0'
          });
        }

        setScriptsLoaded(true);
      } catch (error) {
        console.warn('Some social widgets failed to load:', error);
        setScriptsLoaded(true);
      }
    };

    // Delay initialization to avoid conflicts
    const timer = setTimeout(initializeWidgets, 2000);

    return () => {
      clearTimeout(timer);
      cleanup.forEach(fn => fn());
    };
  }, [enableFacebook, enableGoogle, enableYoutube]);

  // Error boundary for social widgets
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const message = event.message || '';
      
      // Suppress social widget errors
      if (
        message.includes('facebook') ||
        message.includes('google') ||
        message.includes('youtube') ||
        message.includes('Could not find element') ||
        message.includes('DataStore.get')
      ) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    };

    window.addEventListener('error', handleError);
    
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);

  return (
    <div className="social-widget-manager" style={{ display: 'none' }}>
      {scriptsLoaded && (
        <div className="social-widgets-loaded" data-loaded="true" />
      )}
    </div>
  );
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    FB?: any;
    gapi?: any;
    YT?: any;
  }
}