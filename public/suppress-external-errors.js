// Suppress noisy external errors from third-party scripts (Facebook, TradingView, etc.).
// IMPORTANT: This file must never remove DOM nodes or block SDK globals.
// Removing iframes/scripts breaks legitimate embeds (e.g. /admin/content previews).
(function () {
  'use strict';

  const suppressPatterns = [
    'facebook',
    'fburl',
    'connect.facebook',
    'ErrorUtils',
    'DataStore',
    '__elem_',
    'Permissions policy',
    'unload is not allowed',
    'Refused to frame',
    'Content Security Policy',
    'violates the following',
    'TradingView',
    'tradingview',
    'widgetembed',
  ];

  function shouldSuppress(message) {
    if (!message) return false;
    const msgStr = String(message).toLowerCase();
    return suppressPatterns.some((pattern) => msgStr.includes(String(pattern).toLowerCase()));
  }

  const originalError = console.error;
  console.error = function (...args) {
    if (args.length > 0 && shouldSuppress(args[0])) return;
    originalError.apply(console, args);
  };

  const originalWarn = console.warn;
  console.warn = function (...args) {
    if (args.length > 0 && shouldSuppress(args[0])) return;
    originalWarn.apply(console, args);
  };

  window.addEventListener(
    'error',
    function (e) {
      if (shouldSuppress(e.message) || shouldSuppress(e.filename)) {
        e.stopImmediatePropagation();
        e.preventDefault();
        return false;
      }
    },
    true
  );

  window.addEventListener(
    'unhandledrejection',
    function (e) {
      if (shouldSuppress(e.reason)) {
        e.stopImmediatePropagation();
        e.preventDefault();
        return false;
      }
    },
    true
  );

  // Quiet by default; avoid noisy logs in production.
})();

