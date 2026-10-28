(function () {
  'use strict';
  function bindFallback() {
    var triggers = document.querySelectorAll('[data-open-login]');
    var overlay = document.getElementById('loginOverlay');
    triggers.forEach(function (button) {
      if (button.dataset.startUseFallbackBound === '1') return;
      button.dataset.startUseFallbackBound = '1';
      button.addEventListener('click', function (event) {
        var current = document.getElementById('loginOverlay');
        if (!current) {
          console.error('[上岸鸭] 找不到登录弹层 #loginOverlay，开始使用无法打开。');
          return;
        }
        // Keep the existing login flow; this independent capture-phase fallback only opens the existing dialog.
        current.hidden = false;
        current.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        if (typeof current.showModal === 'function' && current.tagName === 'DIALOG' && !current.open) {
          try { current.showModal(); } catch (_) {}
        }
      }, true);
    });
    return !!overlay;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindFallback, { once: true });
  else bindFallback();
})();