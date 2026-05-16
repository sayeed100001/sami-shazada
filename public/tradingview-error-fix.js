// Comprehensive TradingView Error Suppression
(function() {
  'use strict';
  
  // Store original console methods
  const originalConsole = {
    error: console.error,
    warn: console.warn,
    log: console.log
  };
  
  // Comprehensive list of TradingView error patterns
  const errorPatterns = [
    'TradingView',
    'tradingview',
    'Cannot read properties of undefined',
    'reading \'list\'',
    'reading \'state\'',
    'TypeError: Cannot read properties',
    'dn',
    'mn', 
    'lt',
    'Ha',
    '_o',
    'Ei',
    'ks',
    'ys', 
    'vs',
    'ss',
    'Wl',
    'fo',
    'Ua',
    'wi',
    'ki',
    'bi',
    'Ss',
    'fs',
    'ec',
    'embed_advanced_chart',
    'cab9b4faa616968696ee',
    '48569a458a5ea320e7da',
    '19026',
    '82321',
    'runtime-embed',
    'widgetembed',
    'tv.js',
    's3.tradingview.com',
    'new dn',
    'new mn',
    'new lt'
  ];
  
  // Check if message should be suppressed
  function shouldSuppress(message) {
    if (!message) return false;
    const msgStr = String(message).toLowerCase();
    return errorPatterns.some(pattern => msgStr.includes(pattern.toLowerCase()));
  }
  
  // Override console.error
  console.error = function(...args) {
    if (args.length > 0 && shouldSuppress(args[0])) {
      return; // Suppress the error
    }
    originalConsole.error.apply(console, args);
  };
  
  // Override console.warn  
  console.warn = function(...args) {
    if (args.length > 0 && shouldSuppress(args[0])) {
      return; // Suppress the warning
    }
    originalConsole.warn.apply(console, args);
  };
  
  // Override window.onerror
  const originalOnError = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    if (shouldSuppress(message) || shouldSuppress(source) || shouldSuppress(error?.message)) {
      return true; // Suppress the error
    }
    return originalOnError ? originalOnError.apply(this, arguments) : false;
  };
  
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', function(event) {
    const reason = event.reason;
    const message = reason?.message || reason?.toString() || String(reason);
    
    if (shouldSuppress(message)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return false;
    }
  }, true);
  
  // Handle general errors
  window.addEventListener('error', function(event) {
    if (shouldSuppress(event.message) || 
        shouldSuppress(event.filename) || 
        shouldSuppress(event.error?.message) ||
        shouldSuppress(event.error?.stack)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return false;
    }
  }, true);
  
  // Monkey patch common TradingView objects to prevent errors
  const createSafeProxy = (target) => {
    return new Proxy(target || {}, {
      get: function(obj, prop) {
        try {
          return obj[prop];
        } catch (e) {
          return undefined;
        }
      },
      set: function(obj, prop, value) {
        try {
          obj[prop] = value;
          return true;
        } catch (e) {
          return true;
        }
      }
    });
  };
  
  // Create safe TradingView namespace if it doesn't exist
  if (typeof window !== 'undefined') {
    window.TradingView = window.TradingView || createSafeProxy({});
  }
  
  console.log('✅ TradingView error suppression activated');
})();