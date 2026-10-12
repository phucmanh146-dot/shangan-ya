(() => {
  'use strict';
  if (document.getElementById('syRemoteEntry')) return;
  const origin = 'http://127.0.0.1:8878', button = document.createElement('button');
  button.id = 'syRemoteEntry'; button.type = 'button'; button.textContent = '远程桌面';
  button.style.cssText = 'position:fixed;right:22px;bottom:24px;z-index:9000;border:1px solid #b4cba1;border-radius:14px;padding:12px 20px;background:#ddebaf;color:#173d2a;font:600 15px system-ui;cursor:pointer';
  document.body.append(button);
  let dialog, frame, status, retry, readyTimer, generation = 0;
  const node = (tag, text) => { const el = document.createElement(tag); if (text) el.textContent = text; return el; };
  function stop() {
    generation++; clearTimeout(readyTimer);
    if (frame) { frame.contentWindow.postMessage('sy-remote-stop', origin); frame.src = 'about:blank'; }
    window.removeEventListener('message', receive);
    if (dialog) dialog.remove(); dialog = frame = null;
  }
  function receive(e) {
    if (!frame || e.origin !== origin || e.source !== frame.contentWindow) return;
    if (e.data?.type === 'sy-remote-ready') {
      clearTimeout(readyTimer); status.textContent = '本机面板已连接。可直接输入微信关键词，或按需连接桌面画面。';
      if (window.SYRemoteRequest) { frame.contentWindow.postMessage({ type: 'sy-remote-request', ...window.SYRemoteRequest }, origin); window.SYRemoteRequest = null; }
    }
    if (e.data?.type === 'sy-remote-capture') {
      const data = e.data;
      if (data.image && (!data.image.startsWith('data:image/png;base64,') || data.image.length > 7000000)) return;
      if (data.text && (typeof data.text !== 'string' || data.text.length > 60000)) return;
      stop();
      if (data.kind === 'wechat' && data.text && window.SYGrowth) SYGrowth.open({ title: '微信资料 · ' + (data.keyword || '内容整理'), text: data.text });
      else if (window.SYSmart) SYSmart.receiveCapture(data);
    }
  }
  async function connect() {
    const current = ++generation; retry.disabled = true; status.textContent = '正在检查并启动本机远程面板…';
    try {
      const session = await fetch('/api/growth/session', { signal: AbortSignal.timeout(8000) });
      if (!session.ok) throw Error('资料服务未运行，请从桌面的“上岸鸭-资料行动”入口启动。');
      const auth = await session.json();
      const r = await fetch('/api/growth/remote-start', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Growth-Token': auth.token }, body: '{}', signal: AbortSignal.timeout(20000) });
      const result = await r.json();
      if (!r.ok || !result.ready) throw Error(result.error || '远程面板还未启动，请重试。');
      if (!dialog || current !== generation) return;
      frame.src = origin + '/'; frame.hidden = false;
      status.textContent = '服务已启动，正在加载面板…';
      readyTimer = setTimeout(() => { if (dialog && current === generation) status.textContent = '服务已在线，但浏览器尚未显示面板。可点击“独立窗口打开”，或在浏览器提示时允许本机连接。'; }, 8000);
    } catch (e) { if (dialog && current === generation) { status.textContent = e.name === 'TimeoutError' ? '连接超时，请点“重新连接”检查服务。' : e.message; frame.hidden = true; } }
    finally { if (dialog && current === generation) retry.disabled = false; }
  }
  button.onclick = () => {
    if (dialog) { dialog.showModal(); return; }
    dialog = node('dialog'); dialog.style.cssText = 'padding:16px;border:1px solid #688368;border-radius:20px;width:min(1100px,94vw);height:88vh;background:#153b2e;color:#eef3d5';
    const bar = node('div'); bar.style.cssText = 'display:flex;gap:14px;align-items:center;flex-wrap:wrap';
    const link = node('a', '独立窗口打开'); link.href = origin + '/'; link.target = '_blank'; link.rel = 'noopener'; link.style.color = '#deedb8';
    const close = node('button', '关闭并停止'); close.onclick = () => dialog.close();
    retry = node('button', '重新连接'); retry.onclick = connect;
    bar.append(node('strong', '上岸鸭 · 本机远程窗口'), link, retry, close);
    status = node('p', '正在连接…'); status.setAttribute('role', 'status');
    frame = node('iframe'); frame.title = '本机远程桌面'; frame.allow = 'display-capture'; frame.hidden = true; frame.style.cssText = 'width:100%;height:calc(100% - 92px);border:0;border-radius:12px';
    dialog.append(bar, status, frame); document.body.append(dialog);
    window.addEventListener('message', receive); dialog.addEventListener('close', stop); dialog.showModal(); connect();
  };
})();
