// Production Error Suppression and Fixes
(function() {
  'use strict';
  
  // Only run in production
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return;
  }
  
  // Store original methods
  const originalConsole = {
    error: console.error,
    warn: console.warn,
    log: console.log
  };

  // Comprehensive error patterns to suppress
  const suppressPatterns = [
    // CSP and Frame errors
    /Content Security Policy/i,
    /X-Frame-Options/i,
    /Refused to frame/i,
    /Refused to display/i,
    /violates the following Content Security Policy/i,
    /because it set 'X-Frame-Options' to 'deny'/i,
    
    // Network and connection errors
    /doubleclick\.net/i,
    /googleads\.g\.doubleclick\.net/i,
    /static\.doubleclick\.net/i,
    /ERR_CONNECTION_RESET/i,
    /ERR_QUIC_PROTOCOL_ERROR/i,
    /QUIC_NETWORK_IDLE_TIMEOUT/i,
    /Failed to load resource/i,
    /net::ERR_/i,
    /Failed to fetch/i,
    /NetworkError/i,
    /TypeError: Failed to fetch/i,
    /AbortError/i,
    
    // External service errors
    /lovable\.dev/i,
    /facebook\.com.*frame/i,
    /youtube.*embed/i,
    /tradingview/i,
    /www-embed-player\.js/i,
    
    // React DevTools
    /Download the React DevTools/i,
    /React DevTools/i
  ];

  // Function to check if error should be suppressed
  function shouldSuppress(message) {
    if (typeof message !== 'string') return false;
    return suppressPatterns.some(pattern => pattern.test(message));
  }

  // Override console methods
  console.error = function(...args) {
    const message = args.join(' ');
    if (!shouldSuppress(message)) {
      originalConsole.error.apply(console, args);
    }
  };

  console.warn = function(...args) {
    const message = args.join(' ');
    if (!shouldSuppress(message)) {
      originalConsole.warn.apply(console, args);
    }
  };

  // Suppress window errors
  window.addEventListener('error', function(event) {
    const message = event.message || event.error?.message || '';
    if (shouldSuppress(message)) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  }, true);

  // Suppress unhandled promise rejections
  window.addEventListener('unhandledrejection', function(event) {
    const message = event.reason?.message || event.reason || '';
    if (shouldSuppress(String(message))) {
      event.preventDefault();
      return false;
    }
  });

  // Enhanced fetch wrapper
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    return originalFetch.apply(this, args).catch(error => {
      const message = error.message || '';
      if (shouldSuppress(message)) {
        // Return empty successful response for suppressed errors
        return Promise.resolve(new Response('[]', {
          status: 200,
          statusText: 'OK',
          headers: { 'Content-Type': 'application/json' }
        }));
      }
      throw error;
    });
  };

  // Block problematic scripts
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName) {
    const element = originalCreateElement.call(this, tagName);
    
    if (tagName.toLowerCase() === 'script') {
      const originalSetAttribute = element.setAttribute;
      element.setAttribute = function(name, value) {
        if (name === 'src' && typeof value === 'string') {
          const blockedDomains = [
            'doubleclick.net',
            'googleads.',
            'googlesyndication.',
            'google-analytics.com'
          ];
          
          if (blockedDomains.some(domain => value.includes(domain))) {
            console.log('Blocked problematic script:', value);
            return;
          }
        }
        return originalSetAttribute.call(this, name, value);
      };
    }
    
    return element;
  };

  // Clean up iframe errors on DOM ready
  function cleanupIframes() {
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      iframe.addEventListener('error', function(e) {
        e.preventDefault();
        e.stopPropagation();
      }, true);
      
      // Add loading attribute for better performance
      if (!iframe.hasAttribute('loading')) {
        iframe.setAttribute('loading', 'lazy');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cleanupIframes);
  } else {
    cleanupIframes();
  }

  // Periodic cleanup
  setInterval(cleanupIframes, 5000);

  console.log('Production error suppression loaded');
})();