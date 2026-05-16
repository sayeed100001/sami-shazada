// Enhanced Content Loading Fix
(function() {
  'use strict';
  
  // Suppress YouTube DoubleClick errors
  const originalConsoleError = console.error;
  console.error = function(...args) {
    const message = args.join(' ');
    
    // Block specific error patterns
    const blockedPatterns = [
      'static.doubleclick.net',
      'googleads.g.doubleclick.net',
      'ERR_CONNECTION_RESET',
      'ERR_QUIC_PROTOCOL_ERROR',
      'QUIC_NETWORK_IDLE_TIMEOUT',
      'Failed to load resource: the server responded with a status of 400',
      'Refused to frame',
      'X-Frame-Options',
      'lovable.dev'
    ];
    
    if (!blockedPatterns.some(pattern => message.includes(pattern))) {
      originalConsoleError.apply(console, args);
    }
  };
  
  // Suppress network errors
  const originalConsoleWarn = console.warn;
  console.warn = function(...args) {
    const message = args.join(' ');
    
    const blockedWarnings = [
      'doubleclick',
      'googleads',
      'Failed to load',
      'ERR_CONNECTION'
    ];
    
    if (!blockedWarnings.some(pattern => message.includes(pattern))) {
      originalConsoleWarn.apply(console, args);
    }
  };
  
  // Handle iframe loading errors
  document.addEventListener('DOMContentLoaded', function() {
    const iframes = document.querySelectorAll('iframe');
    
    iframes.forEach(iframe => {
      iframe.addEventListener('error', function(e) {
        e.stopPropagation();
        e.preventDefault();
      });
      
      // Add loading timeout
      const timeout = setTimeout(() => {
        if (!iframe.contentDocument && !iframe.contentWindow) {
          console.log('Iframe loading timeout, but continuing...');
        }
      }, 10000);
      
      iframe.addEventListener('load', () => {
        clearTimeout(timeout);
      });
    });
  });
  
  // Prevent unhandled promise rejections from network errors
  window.addEventListener('unhandledrejection', function(event) {
    const reason = event.reason;
    if (reason && typeof reason === 'object') {
      const message = reason.message || reason.toString();
      
      const networkErrors = [
        'Failed to fetch',
        'NetworkError',
        'ERR_CONNECTION',
        'ERR_QUIC_PROTOCOL',
        'doubleclick',
        'googleads'
      ];
      
      if (networkErrors.some(error => message.includes(error))) {
        event.preventDefault();
        console.log('Network error suppressed:', message);
      }
    }
  });
  
})();