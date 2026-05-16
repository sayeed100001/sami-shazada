// Block all TradingView scripts and errors
(function() {
  'use strict';
  
  // Block TradingView script loading
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName) {
    const element = originalCreateElement.call(this, tagName);
    
    if (tagName.toLowerCase() === 'script') {
      const originalSetAttribute = element.setAttribute;
      element.setAttribute = function(name, value) {
        if (name === 'src' && value && value.includes('tradingview.com')) {
          console.log('Blocked TradingView script:', value);
          return;
        }
        return originalSetAttribute.call(this, name, value);
      };
      
      Object.defineProperty(element, 'src', {
        set: function(value) {
          if (value && value.includes('tradingview.com')) {
            console.log('Blocked TradingView script via src:', value);
            return;
          }
          this.setAttribute('src', value);
        },
        get: function() {
          return this.getAttribute('src');
        }
      });
    }
    
    return element;
  };
  
  // Block TradingView errors completely
  const errorPatterns = [
    'TradingView', 'tradingview', 'list', 'state', 'snapshot',
    'dn', 'mn', 'lt', 'Ha', '_o', 'Ei', 'ks', 'ys', 'vs', 'ss', 'Wl', 'fo',
    'embed_advanced_chart', 'cab9b4faa616968696ee', '48569a458a5ea320e7da',
    '19026', '82321', 'runtime-embed', 'b78d71400635509e1072',
    '4b5408446ca75f5803e3', 'widgetembed', 'tv.js', 's3.tradingview.com',
    'new dn', 'new mn', 'new lt', '540921'
  ];
  
  function shouldBlock(message) {
    if (!message) return false;
    const str = String(message).toLowerCase();
    return errorPatterns.some(pattern => str.includes(pattern.toLowerCase()));
  }
  
  // Override console methods
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalLog = console.log;
  
  console.error = function() {
    if (arguments.length > 0 && shouldBlock(arguments[0])) return;
    originalError.apply(console, arguments);
  };
  
  console.warn = function() {
    if (arguments.length > 0 && shouldBlock(arguments[0])) return;
    originalWarn.apply(console, arguments);
  };
  
  console.log = function() {
    if (arguments.length > 0 && shouldBlock(arguments[0])) return;
    originalLog.apply(console, arguments);
  };
  
  // Block window errors
  window.addEventListener('error', function(e) {
    if (shouldBlock(e.message) || shouldBlock(e.filename) || 
        shouldBlock(e.error?.message) || shouldBlock(e.error?.stack)) {
      e.stopImmediatePropagation();
      e.preventDefault();
      return false;
    }
  }, true);
  
  // Block unhandled promise rejections
  window.addEventListener('unhandledrejection', function(e) {
    const message = e.reason?.message || e.reason?.toString() || String(e.reason) || '';
    if (shouldBlock(message)) {
      e.stopImmediatePropagation();
      e.preventDefault();
      return false;
    }
  }, true);
  
  // Override window.onerror
  const originalOnerror = window.onerror;
  window.onerror = function(msg, file, line, col, error) {
    if (shouldBlock(msg) || shouldBlock(file) || 
        shouldBlock(error?.message) || shouldBlock(error?.stack)) {
      return true;
    }
    return originalOnerror ? originalOnerror.apply(this, arguments) : false;
  };
  
})();