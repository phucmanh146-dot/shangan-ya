(function () {
  'use strict';
  if (window.__SYTaskAIEntryV1) return;
  window.__SYTaskAIEntryV1 = true;

  function addStyles() {
    if (document.getElementById('sy-task-ai-entry-style')) return;
    var style = document.createElement('style');
    style.id = 'sy-task-ai-entry-style';
    style.textContent = [
      '.sy-ai-config-shortcut{display:flex;align-items:center;gap:9px;margin:10px 12px 8px;padding:11px 12px;border:1px solid var(--border,#dce5df);border-radius:11px;color:var(--text,#294638);background:var(--surface,#fff);font-size:13px;font-weight:750;text-decoration:none;line-height:1.4}',
      '.sy-ai-config-shortcut:hover,.sy-task-ai-link:hover{border-color:var(--accent,#478565);background:var(--surface-soft,#f3f8f4)}',
      '.sy-ai-config-shortcut small{display:block;font-size:11px;font-weight:500;color:var(--text-muted,#74857b);margin-top:2px}',
      '.sy-task-ai-link{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:9px 12px;border:1px solid var(--border,#dce5df);border-radius:10px;background:var(--surface,#fff);color:var(--text,#294638);font-size:13px;font-weight:750;text-decoration:none}',
      '@media(max-width:700px){.sy-ai-config-shortcut{min-height:44px}.sy-task-ai-link{width:100%}}'
    ].join('');
    document.head.appendChild(style);
  }

  function taskId() {
    var picker = document.getElementById('twTaskSelect');
    return String((picker && picker.value) || window.__SYTaskWorkspaceSelectedTaskId || '').trim();
  }

  function updateTaskLink(link) {
    var id = taskId();
    if (!id) {
      link.href = './ai-p2.html';
      link.setAttribute('aria-label', '打开 AI 工作区并选择任务');
      return;
    }
    link.href = './ai-p2.html?taskId=' + encodeURIComponent(id) + '&from=task-workspace';
    link.setAttribute('aria-label', '将当前原任务关联到 AI 工作区');
  }

  function mount() {
    addStyles();
    var sidebar = document.querySelector('.app-sidebar');
    var exit = document.getElementById('exitAppBtn');
    if (sidebar && exit && !document.getElementById('sy-ai-config-shortcut')) {
      var config = document.createElement('a');
      config.id = 'sy-ai-config-shortcut';
      config.className = 'sy-ai-config-shortcut';
      config.href = './ai-p2.html#configure-ai';
      config.innerHTML = '<span aria-hidden="true">✦</span><span>配置 AI API<small>选择模型 · 填写密钥 · 测试连接</small></span><span aria-hidden="true">↗</span>';
      config.title = '打开 AI 配置页；API Key 由你填写并通过真实请求验证';
      sidebar.insertBefore(config, exit);
    }

    var actions = document.querySelector('.tw-hero-actions');
    if (actions && !document.getElementById('sy-task-ai-link')) {
      var link = document.createElement('a');
      link.id = 'sy-task-ai-link';
      link.className = 'sy-task-ai-link';
      link.textContent = '遇到 Bug / 卡点？AI 解卡 ↗';
      link.title = '将当前原任务、截止时间和关联资料带入 AI，分析卡点并给出可执行修复步骤';
      actions.appendChild(link);
      updateTaskLink(link);
    }
  }

  function refresh() {
    mount();
    var link = document.getElementById('sy-task-ai-link');
    if (link) updateTaskLink(link);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh);
  else refresh();
  var observer = new MutationObserver(refresh);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.setInterval(refresh, 1200);
})();
