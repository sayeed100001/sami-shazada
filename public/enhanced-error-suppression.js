// Enhanced Error Suppression for Production
(function() {
  'use strict';
  
  // Store original console methods
  const originalConsole = {
    error: console.error,
    warn: console.warn,
    log: console.log
  };

  // Error patterns to suppress
  const suppressPatterns = [
    /Content Security Policy/i,
    /X-Frame-Options/i,
    /doubleclick\.net/i,
    /googleads\.g\.doubleclick\.net/i,
    /static\.doubleclick\.net/i,
    /ERR_CONNECTION_RESET/i,
    /ERR_QUIC_PROTOCOL_ERROR/i,
    /QUIC_NETWORK_IDLE_TIMEOUT/i,
    /Failed to load resource/i,
    /Refused to frame/i,
    /Refused to display/i,
    /violates the following Content Security Policy/i,
    /because it set 'X-Frame-Options' to 'deny'/i,
    /lovable\.dev/i,
    /facebook\.com.*frame/i,
    /youtube.*embed/i,
    /tradingview/i
  ];

  // Network error patterns
  const networkErrorPatterns = [
    /net::ERR_/i,
    /Failed to fetch/i,
    /NetworkError/i,
    /TypeError: Failed to fetch/i,
    /AbortError/i
  ];

  // Function to check if error should be suppressed
  function shouldSuppress(message) {
    if (typeof message !== 'string') return false;
    
    return suppressPatterns.some(pattern => pattern.test(message)) ||
           networkErrorPatterns.some(pattern => pattern.test(message));
  }

  // Enhanced console.error override
  console.error = function(...args) {
    const message = args.join(' ');
    
    if (!shouldSuppress(message)) {
      // Only show non-suppressed errors in development
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        originalConsole.error.apply(console, args);
      }
    }
  };

  // Enhanced console.warn override
  console.warn = function(...args) {
    const message = args.join(' ');
    
    if (!shouldSuppress(message)) {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        originalConsole.warn.apply(console, args);
      }
    }
  };

  // Suppress specific window errors
  window.addEventListener('error', function(event) {
    const message = event.message || event.error?.message || '';
    
    if (shouldSuppress(message)) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  }, true);

  // Suppress unhandled promise rejections for known issues
  window.addEventListener('unhandledrejection', function(event) {
    const message = event.reason?.message || event.reason || '';
    
    if (shouldSuppress(String(message))) {
      event.preventDefault();
      return false;
    }
  });

  // Suppress fetch errors for external resources
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    return originalFetch.apply(this, args).catch(error => {
      const message = error.message || '';
      
      if (shouldSuppress(message)) {
        // Return a resolved promise with empty response for suppressed errors
        return Promise.resolve(new Response('{}', {
          status: 200,
          statusText: 'OK',
          headers: { 'Content-Type': 'application/json' }
        }));
      }
      
      throw error;
    });
  };

  // Block problematic external scripts
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName) {
    const element = originalCreateElement.call(this, tagName);
    
    if (tagName.toLowerCase() === 'script') {
      const originalSetAttribute = element.setAttribute;
      element.setAttribute = function(name, value) {
        if (name === 'src' && typeof value === 'string') {
          // Block problematic external scripts
          if (value.includes('doubleclick.net') || 
              value.includes('googleads.') ||
              value.includes('googlesyndication.')) {
            return; // Don't set the src attribute
          }
        }
        return originalSetAttribute.call(this, name, value);
      };
    }
    
    return element;
  };

  // Clean up iframe errors
  document.addEventListener('DOMContentLoaded', function() {
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      iframe.addEventListener('error', function(e) {
        e.preventDefault();
        e.stopPropagation();
      }, true);
    });
  });

  console.log('Enhanced error suppression loaded');
})();