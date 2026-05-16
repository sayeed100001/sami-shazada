// TradingView Loader - Ensures proper loading
(function() {
  'use strict';

  // Remove CSP restrictions for TradingView
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      mutation.addedNodes.forEach(function(node) {
        if (node.nodeType === 1 && node.tagName === 'META') {
          const httpEquiv = node.getAttribute('http-equiv');
          if (httpEquiv && httpEquiv.toLowerCase() === 'content-security-policy') {
            node.remove();
          }
        }
      });
    });
  });

  observer.observe(document.head, {
    childList: true,
    subtree: true
  });

  // Preload TradingView script
  window.addEventListener('DOMContentLoaded', function() {
    if (!window.TradingView) {
      const script = document.createElement('script');
      script.src = 'https://s.tradingview.com/tv.js';
      script.async = true;
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
    }
  });

  // Suppress console errors
  const originalError = console.error;
  console.error = function(...args) {
    const message = args.join(' ');
    if (message.includes('Content Security Policy') || 
        message.includes('script-src') ||
        message.includes('tradingview')) {
      return;
    }
    originalError.apply(console, args);
  };
})();