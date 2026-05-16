// Ultra-aggressive console filter - loads first
(function() {
  const original = {
    error: console.error,
    warn: console.warn,
    log: console.log
  };
  
  const patterns = ['refused', 'facebook', 'frame-src', 'csp', 'security policy'];
  
  function shouldBlock(msg) {
    if (!msg) return false;
    const str = String(msg).toLowerCase();
    return patterns.some(p => str.includes(p));
  }
  
  console.error = function() {
    if (arguments.length && shouldBlock(arguments[0])) return;
    original.error.apply(console, arguments);
  };
  
  console.warn = function() {
    if (arguments.length && shouldBlock(arguments[0])) return;
    original.warn.apply(console, arguments);
  };
  
  console.log = function() {
    if (arguments.length && shouldBlock(arguments[0])) return;
    original.log.apply(console, arguments);
  };
})();
