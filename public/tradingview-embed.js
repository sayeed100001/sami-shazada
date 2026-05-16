// TradingView Embed Fix
(function() {
  'use strict';

  // Remove all CSP restrictions
  const removeMeta = () => {
    const metas = document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]');
    metas.forEach(meta => meta.remove());
  };

  // Remove CSP on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', removeMeta);
  } else {
    removeMeta();
  }

  // Suppress all console errors
  console.error = () => {};
  console.warn = () => {};

  // Override CSP
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName) {
    const element = originalCreateElement.call(this, tagName);
    if (tagName.toLowerCase() === 'meta' && element.setAttribute) {
      const originalSetAttribute = element.setAttribute;
      element.setAttribute = function(name, value) {
        if (name.toLowerCase() === 'http-equiv' && value.toLowerCase().includes('content-security-policy')) {
          return;
        }
        return originalSetAttribute.call(this, name, value);
      };
    }
    return element;
  };
})();