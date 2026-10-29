/* Mount the existing EnergyFlow triad inside the original "个人执行教练" view.
   Do not create another task store, timer, planner, or standalone demo. */
(function () {
  'use strict';
  if (window.__SYCoachHubPlacementV1) return;
  window.__SYCoachHubPlacementV1 = true;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  function placeHub() {
    const view = $('#view-heart-coach');
    const hub = $('#syEfHub');
    if (!view || !hub) return false;

    // Remove the old, separate launcher from the Daily page; keep the actual hub and its existing handlers.
    const launcher = $('.sy-ef-launch');
    if (launcher) launcher.remove();
    const oldCoach = $('.hc-wrap', view);
    if (oldCoach) oldCoach.hidden = true;

    // The existing EnergyFlow component is the integrated triad; move it rather than cloning it.
    if (hub.parentElement !== view) view.appendChild(hub);
    hub.hidden = false;
    hub.style.removeProperty('display');
    hub.setAttribute('data-integrated-location', 'personal-execution-coach');
    return true;
  }

  function placeNav() {
    const nav = $('#appNav');
    if (!nav) return;
    // This entry belongs directly in the left rail, under the existing review group.
    const legacyMore = $('.sy-original-more', nav);
    if (legacyMore) {
      $('.app-nav-item', legacyMore).forEach(b => nav.appendChild(b));
      legacyMore.remove();
    }

    // Reuse the exact button already labeled "个人执行教练" instead of creating a second entry.
    let coach = $('button[data-open-execution-hub="coach"]', nav);
    if (!coach) {
      coach = $$('.app-nav-item', nav).find(b => (b.textContent || '').trim() === '个人执行教练') || null;
    }
    if (!coach) {
      coach = document.createElement('button');
      coach.type = 'button';
      coach.className = 'app-nav-item';
      coach.innerHTML = '<span class="app-nav-icon" aria-hidden="true">◎</span><span>个人执行教练</span>';
    }
    // Remove the legacy click handler marker; this entry now opens the existing app view.
    coach.removeAttribute('data-open-execution-hub');
    coach.dataset.view = 'heart-coach';
    coach.hidden = false;
    coach.style.removeProperty('display');
    coach.setAttribute('aria-hidden', 'false');
    coach.tabIndex = 0;
    const label = $('span:last-child', coach);
    if (label) label.textContent = '个人执行教练';

    // Remove the old "心航 · AI 执行教练" duplicate entry; its useful features are consolidated here.
    $$('.app-nav-item[data-view="heart-coach"]', nav).forEach(b => {
      if (b !== coach) b.remove();
    });
    $$('.app-nav-item', nav).forEach(b => {
      if (b !== coach && (b.textContent || '').trim() === '个人执行教练') b.remove();
    });
    // Restore the original placement: directly after the unified task workspace, under the main task group.
    const taskWorkspace = nav.querySelector(':scope > .app-nav-item[data-view="task-workspace"]');
    if (taskWorkspace) {
      if (coach.parentElement !== nav || coach.previousElementSibling !== taskWorkspace) nav.insertBefore(coach, taskWorkspace.nextSibling);
    } else if (coach.parentElement !== nav) {
      nav.appendChild(coach);
    }
  }

  function reconcile() {
    placeHub();
    placeNav();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', reconcile, { once: true });
  } else {
    reconcile();
  }
  const observer = new MutationObserver(reconcile);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('sy:ready', reconcile);
  window.addEventListener('load', reconcile, { once: true });
})();