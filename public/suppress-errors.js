// ULTRA-AGGRESSIVE error suppression
(function() {
  'use strict';
  
  const _error = console.error;
  const _warn = console.warn;
  
  console.error = function() {
    return; // Block ALL errors
  };
  
  console.warn = function() {
    return; // Block ALL warnings
  };
  
  window.addEventListener('error', function(e) {
    e.stopImmediatePropagation();
    e.preventDefault();
    return false;
  }, true);
  
  window.addEventListener('unhandledrejection', function(e) {
    e.stopImmediatePropagation();
    e.preventDefault();
    return false;
  }, true);
  
})();
