(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const checks = [
    { name: 'AI 主模型', url: '/api/p2/status', read: (d) => {
      const a = d.ai || {};
      return { state: a.verified ? 'ok' : 'warn', status: a.verified ? '已验证' : a.configured ? '已配置但未验证' : '尚未配置/验证', detail: a.lastError || a.model || '请在“配置 / 测试 API”中配置并执行真实测试。' };
    }},
    { name: '飞书官方 API', url: '/api/public-feishu-status', read: (d) => ({
      state: d.configured ? 'ok' : 'warn',
      status: d.configured ? '应用凭证已配置' : '应用凭证未配置',
      detail: d.configured ? '还需验证目标 Wiki 的读取权限。' : '需要官方应用凭证和目标文档只读权限；下面已预填指定 Wiki。'
    })},
    { name: '公网会话知识库', url: '/api/vault', read: (d) => ({
      state: d.connected && Number(d.count) > 0 ? 'ok' : 'warn',
      status: (d.connected ? '服务响应' : '服务未连接') + ' · ' + Number(d.count || 0) + ' 篇',
      detail: '公网会话库不等于你电脑上的“韩奕知识复盘”本机 Vault。'
    })},
    { name: '微信桥接', url: '/api/pm/wx/status', read: (d) => {
      const ok = !!(d.connected || d.ready);
      return { state: ok ? 'ok' : 'warn', status: ok ? '桥接报告已连接' : '尚未确认连接', detail: d.note || d.error || '只分析用户主动选中的会话；可见窗口 OCR 不等于完整历史导出。' };
    }},
    { name: '链接/多模态服务', url: '/api/health', read: (d) => {
      const c = d.capabilities || {};
      return { state: d.ok ? 'ok' : 'warn', status: d.ok ? '健康接口响应' : '健康状态未确认', detail: '链接解析：' + (c.extract ? '已声明支持' : '未声明') + '；图片：' + (c.imageImport ? '已声明支持' : '未声明') + '；视频：' + (c.video ? '已声明支持' : '未声明') + '。声明不等于端到端测试通过。' };
    }}
  ];
  function card(root, name, state, status, detail) {
    const el = document.createElement('section');
    el.className = 'p2-audit-card';
    const h = document.createElement('strong'); h.textContent = name;
    const b = document.createElement('span'); b.className = 'p2-audit-state ' + state; b.textContent = status;
    const p = document.createElement('p'); p.textContent = detail || '';
    el.append(h, b, p); root.append(el); return el;
  }
  function update(el, state, status, detail) {
    el.querySelector('.p2-audit-state').className = 'p2-audit-state ' + state;
    el.querySelector('.p2-audit-state').textContent = status;
    el.querySelector('p').textContent = detail || '';
  }
  function install() {
    const top = $('.p2-topbar');
    if (!top || $('#p2-integration-audit')) return;
    const panel = document.createElement('details');
    panel.id = 'p2-integration-audit';
    panel.className = 'p2-integration-audit';
    const summary = document.createElement('summary');
    summary.textContent = '工作台连接体检 · AI / 模型 / 飞书 / Obsidian / 微信 / 多模态';
    panel.append(summary);
    const intro = document.createElement('p');
    intro.className = 'p2-audit-intro';
    intro.textContent = '只读取当前服务的状态接口，不修改任务、截止日期或历史对话；尚未验证的连接不会标记为成功。';
    panel.append(intro);
    const actions = document.createElement('div'); actions.className = 'p2-audit-actions';
    const run = document.createElement('button'); run.type = 'button'; run.textContent = '检查全部连接';
    const resume = document.createElement('button'); resume.type = 'button'; resume.textContent = '载入历史需求，继续优化';
    actions.append(run, resume); panel.append(actions);
    const grid = document.createElement('div'); grid.className = 'p2-audit-grid'; grid.setAttribute('aria-live', 'polite');
    grid.textContent = '点击“检查全部连接”查看接口实际状态。'; panel.append(grid);
    const privacy = document.createElement('p'); privacy.className = 'p2-audit-intro';
    privacy.textContent = '隐私边界：不会读取浏览器密码/Cookie，不会自动发送微信消息，不会把整个本机知识库上传到公网。';
    panel.append(privacy);
    top.insertAdjacentElement('afterend', panel);
    run.addEventListener('click', async () => {
      run.disabled = true; grid.replaceChildren();
      for (const item of checks) {
        const el = card(grid, item.name, 'wait', '检查中…', '');
        try {
          const ctl = new AbortController();
          const timer = setTimeout(() => ctl.abort(), 8000);
          let res;
          try { res = await fetch(item.url, { cache: 'no-store', credentials: 'same-origin', signal: ctl.signal }); }
          finally { clearTimeout(timer); }
          const data = await res.json().catch(() => ({}));
          if (!res.ok || data.error) throw new Error(data.error || ('HTTP ' + res.status));
          const r = item.read(data); update(el, r.state, r.status, r.detail);
        } catch (e) { update(el, 'bad', '检查失败 · ' + e.message, '此项尚未通过验证；请修复后重试。'); }
      }
      const local = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
      card(grid, '本机 Obsidian', 'warn', local ? '需要验证本机 Vault 服务' : '公网页面无法直接读取本机 Vault', local ? '请检查本机 /api/vault 和 /api/vault-search 是否真实连接韩奕知识复盘。' : '需要本机桥接或用户主动选择文件夹；不能把公网空库当成本机笔记。');
      run.disabled = false;
    });
    resume.addEventListener('click', () => {
      const box = $('#p2-text');
      const context = $('#p2-task-context');
      if (!box) return;
      box.value = '请基于现有上岸鸭工作台继续增量优化，不要另起炉灶。请先读取并分析指定飞书 Wiki： https://tcnb3a3fuvtb.feishu.cn/wiki/YD6HwHCS5iXlgmkpLOoccnvon7b\n\n保留原首页交互、任务清单、截止日期、重要/紧急分类、历史数据和持久化结构，不删除、不覆盖原任务。逐项核对真实实现：1) AI 服务商官方 API、Key 配置、模型目录和真实调用测试、失败重试/回退；2) 飞书 Wiki 目录/子页与普通网页、B站、YouTube 链接正文/字幕读取；3) 本机 Obsidian“韩奕知识复盘”真实搜索、来源引用和 obsidian:// 跳转；4) 微信仅读取用户授权选择的会话，明确区分可见窗口 OCR 与完整历史；5) Word/PDF/表格/图片/音频/视频导入、OCR/字幕/抽帧、思维导图和通俗讲解视频；6) 将结论关联原任务，但新增待办必须由用户确认。每项标记为已验证、部分实现、未配置或失败，附实际接口、错误原因、修复及可复现测试；不许伪报成功。先只读核查，再做最小增量修改。';
      if (context) context.value = '继续优化上岸鸭工作台：保护原任务、截止日期、重要/紧急清单、历史数据。优先核查 AI API 与模型发现、指定飞书 Wiki 目录读取、本机 Obsidian 韩奕知识复盘、授权微信桥接、外链/文档/图片/视频解析、思维导图与讲解视频。所有连接必须用真实状态和测试证据验证。';
      const search = $('#p2-search'); if (search) search.checked = true;
      box.dispatchEvent(new Event('input', { bubbles: true }));
      box.focus();
      const s = $('#p2-status'); if (s) s.textContent = '已载入历史需求和指定飞书 Wiki；发送后仍需依据真实读取结果分析。';
    });
  }
  function styles() {
    if ($('#p2-integration-audit-style')) return;
    const s = document.createElement('style'); s.id = 'p2-integration-audit-style';
    s.textContent = '.p2-integration-audit{margin:0 18px 10px;padding:10px 12px;border:1px solid #d7e3dc;border-radius:12px;background:#f7faf8;color:#1c332c;font-size:13px}.p2-integration-audit>summary{cursor:pointer;font-weight:700}.p2-audit-intro{margin:8px 0;color:#64776e;line-height:1.5}.p2-audit-actions{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}.p2-audit-actions button{border:1px solid #cbd9d1;border-radius:8px;background:#fff;padding:7px 10px;cursor:pointer;color:#21483a}.p2-audit-actions button:disabled{opacity:.55;cursor:wait}.p2-audit-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;margin-top:8px}.p2-audit-card{border:1px solid #dce6e0;border-radius:9px;padding:10px;background:#fff;min-width:0}.p2-audit-card strong{display:block;margin-bottom:7px}.p2-audit-state{display:block;font-weight:600;overflow-wrap:anywhere}.p2-audit-state.ok{color:#26734d}.p2-audit-state.warn{color:#9a6718}.p2-audit-state.bad{color:#b43c38}.p2-audit-state.wait{color:#64776e}.p2-audit-card p{margin:6px 0 0;color:#65776e;line-height:1.45;overflow-wrap:anywhere}@media(max-width:640px){.p2-integration-audit{margin:0 8px 8px}.p2-audit-actions button{flex:1}}';
    document.head.append(s);
  }
  styles();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true }); else install();
})();