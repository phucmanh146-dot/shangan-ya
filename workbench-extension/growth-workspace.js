(function () {
  'use strict';
  let dialog, owner, token, project, selectedRun, poll, lastFocus;
  let materials = [], frames = [], mediaKind = '', working = false, generation = 0;
  const $ = q => dialog && dialog.querySelector(q);
  const n = (tag, value, cls) => { const e = document.createElement(tag); if (value != null) e.textContent = value; if (cls) e.className = cls; return e; };
  const button = (label, fn, cls) => { const b = n('button', label, cls); b.type = 'button'; b.onclick = fn; return b; };
  const option = (label, value) => { const e = n('option', label); e.value = value; return e; };
  const acct = () => String(window.SY && SY.currentAccountKey || '');
  function notify(message, error) { const el = $('[data-status]'); if (el) { el.textContent = message; el.classList.toggle('is-error', !!error); } }
  function field(label, type, name, placeholder) { const l = n('label', label); const e = n(type === 'textarea' ? 'textarea' : 'input'); if (type !== 'textarea') e.type = type; e.name = name; e.placeholder = placeholder || ''; l.append(e); return l; }
  function value(name) { return $('[name="' + name + '"]').value.trim(); }
  function link(label, value) { try { const u = new URL(value); if (!/^https?:$/.test(u.protocol)) throw 0; const a = n('a', label); a.href = u.href; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a; } catch (_) { return n('span', label); } }
  async function api(path, body) {
    const capturedOwner = owner, capturedGeneration = generation, controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);
    let response;
    try { response = await fetch(path, { signal: controller.signal, method: body ? 'POST' : 'GET', headers: body ? { 'Content-Type': 'application/json', 'X-Growth-Token': token } : {}, body: body ? JSON.stringify(body) : undefined }); }
    catch (e) { throw new Error(e.name === 'AbortError' ? '本次请求超时。已保存的处理记录可稍后继续。' : '本机资料服务未连接，请使用“启动资料行动”入口打开原工作台。'); }
    finally { clearTimeout(timeout); }
    if (capturedGeneration !== generation) throw new Error('窗口已切换。');
    let data; try { data = await response.json(); } catch (_) { throw new Error('资料服务未响应，请使用电脑上的“上岸鸭资料行动”启动入口。'); }
    if (!response.ok) throw new Error(data.error || '这一步未完成。');
    if (capturedOwner !== acct()) throw new Error('资料空间已切换，请重新打开窗口。');
    return data;
  }
  async function guarded(fn) { if (working) return; working = true; const current = generation, buttons = dialog ? [...dialog.querySelectorAll('[data-run],[data-collect]')] : []; buttons.forEach(b => b.disabled = true); try { await fn(); } catch (e) { if (current === generation) notify(e.message, true); } finally { if (current === generation) working = false; buttons.filter(b => b.isConnected).forEach(b => b.disabled = false); } }
  function close() { generation++; clearTimeout(poll); if (dialog) { dialog.close(); dialog.remove(); dialog = null; } if (lastFocus && lastFocus.isConnected) lastFocus.focus(); }
  function open(prefill) {
    if (!window.SY || !acct()) return;
    close(); owner = acct(); token = ''; project = null; selectedRun = null; materials = []; frames = []; mediaKind = ''; working = false;
    lastFocus = document.activeElement;
    dialog = n('dialog', null, 'growth-dialog'); dialog.setAttribute('aria-labelledby', 'growth-title');
    const header = n('header', null, 'growth-head'), titles = n('div'); titles.append(n('p', '把资料变成下一步', 'growth-eyebrow'), n('h2', '资料 → 行动'));
    titles.querySelector('h2').id = 'growth-title'; header.append(titles, button('关闭', close)); dialog.append(header);
    const status = n('p', '正在连接本机资料服务…', 'growth-status'); status.dataset.status = ''; status.setAttribute('role', 'status'); dialog.append(status);
    const body = n('div', null, 'growth-layout'), left = n('section', null, 'growth-compose'), right = n('section', null, 'growth-output');
    const select = n('select'); select.dataset.projects = ''; select.setAttribute('aria-label', '选择学习或竞赛目标'); select.append(option('新建目标', ''));
    select.onchange = () => { project = (select._projects || []).find(p => p.id === select.value) || null; fillProject(); };
    left.append(n('h3', '01 / 这次要完成什么'), select, field('目标名称', 'text', 'title', '例如：完成竞赛方案、学会一个新技能'), field('交付要求 / 当前基础', 'textarea', 'outcome', '要交什么？已有进展？还缺什么？'));
    const presets = n('div', null, 'growth-presets');
    for (const label of ['挑战杯项目', '互联网+项目', '学习成长']) presets.append(button(label, () => { if (!value('title')) $('[name=title]').value = label; $('[name=outcome]').focus(); }));
    left.append(presets);
    const row = n('div', null, 'growth-row'); row.append(field('截止日期', 'date', 'deadline'), field('每天可投入（分钟）', 'number', 'dailyMinutes')); left.append(row);
    left.append(button('保存目标', () => guarded(async () => { await saveProject(); notify('目标已保存，资料和后续任务会关联到这里。'); })));
    left.append(n('h3', '02 / 带入资料与卡点'), field('链接 / 分享文字', 'textarea', 'links', '飞书、网页、B站、YouTube，可粘贴多条链接'), field('正文 / 笔记 / 字幕', 'textarea', 'text', '也可以直接粘贴内容'), field('当前卡点（选填）', 'textarea', 'question', '哪一步没做成？你已经尝试过什么？'));
    const upload = n('input'); upload.type = 'file'; upload.multiple = true; upload.accept = '.pdf,.doc,.docx,.txt,.md,.srt,.vtt,image/*,video/mp4,video/webm,video/quicktime'; upload.hidden = true;
    upload.onchange = () => { const files = Array.from(upload.files); upload.value = ''; guarded(() => importFiles(files)); };
    const drop = button('＋ 拖入文档、图片或视频，也可点击选择', () => upload.click(), 'growth-drop');
    drop.ondragover = e => { e.preventDefault(); drop.classList.add('is-over'); }; drop.ondragleave = () => drop.classList.remove('is-over'); drop.ondrop = e => { e.preventDefault(); drop.classList.remove('is-over'); guarded(() => importFiles(Array.from(e.dataTransfer.files))); };
    const fileList = n('div', null, 'growth-materials'); fileList.dataset.materials = '';
    left.append(upload, drop, n('p', '文档每份 ≤5 MB。视频提取最多6张带时间点的画面；声音内容请同时提供字幕。', 'growth-hint'), fileList);
    const search = n('label', null, 'growth-check'); const check = n('input'); check.type = 'checkbox'; check.name = 'search'; search.append(check, document.createTextNode('结合当前目标联网搜索，保留来源链接')); left.append(search);
    const collect = button('读取并保存全部链接', () => guarded(() => begin(true)), 'growth-primary'); collect.dataset.collect = ''; left.append(collect);
    left.append(n('p', '最多100条链接，自动去重、逐条保存。某条失败不影响其他链接；只读取资料不需要连接AI。', 'growth-hint'));
    const start = button('解析资料，生成行动草稿 →', () => guarded(() => begin(false)), 'growth-primary'); start.dataset.run = ''; left.append(start);
    const wx = n('details'); wx.append(n('summary', '从微信带入资料')); const wxBody = n('div', null, 'growth-wechat');
    wxBody.append(field('群聊名', 'text', 'wxQuery', '输入要查找的群名'), button('查找群聊', () => guarded(async () => { const result = await api('/api/growth/wechat-groups', { query: value('wxQuery') }); const select = $('[data-groups]'); select.replaceChildren(option('选择实际查到的群聊', '')); result.groups.forEach(g => select.append(option(g.name, g.id))); notify('找到 ' + result.groups.length + ' 个群聊。'); })));
    const groups = n('select'); groups.dataset.groups = ''; groups.setAttribute('aria-label', '选择微信群聊'); groups.append(option('先查找群聊', '')); wxBody.append(groups, field('消息关键词', 'text', 'wxKeyword', '分享 / feishu / 爬楼'));
    wxBody.append(button('读取匹配消息', () => guarded(async () => { if (!groups.value) throw new Error('先选择查到的群聊。'); const result = await api('/api/growth/wechat-messages', { id: groups.value, keyword: value('wxKeyword') }); materials.push({ title: '微信 · ' + groups.selectedOptions[0].textContent, text: result.text, kind: 'wechat' }); drawMaterials(); notify('匹配消息已带入，可核对后生成草稿。'); })), n('p', '读取当前已登录微信可访问的搜索结果。若微信未开放搜索控件，会保留错误并提示手动带入。', 'growth-hint')); wx.append(wxBody); left.append(wx);
    right.append(n('h3', '03 / 核对来源与行动')); const out = n('div'); out.dataset.result = ''; out.append(n('div', '先带入一份资料。处理完成后，在这里核对核心内容、差距和任务草稿。', 'growth-empty')); right.append(out);
    const history = n('details'); history.open = true; history.append(n('summary', '处理记录 · 中断后继续')); const historyList = n('div'); historyList.dataset.history = ''; history.append(historyList); right.append(history);
    const memos = n('details'); memos.append(n('summary', '已保存备忘')); const memoList = n('div'); memoList.dataset.memos = ''; memos.append(memoList); right.append(memos);
    const connection = n('details'); connection.append(n('summary', '模型与联网连接')); const connections = n('div'); connections.dataset.connections = ''; connection.append(connections); right.append(connection);
    body.append(left, right); dialog.append(body); dialog.addEventListener('cancel', e => { e.preventDefault(); close(); }); document.body.append(dialog); dialog.showModal();
    $('[name=dailyMinutes]').value = '60'; $('[name=dailyMinutes]').min = '5'; $('[name=dailyMinutes]').max = '720';
    for (const key of ['title', 'outcome', 'links', 'text']) if (prefill && typeof prefill[key] === 'string') $('[name="' + key + '"]').value = prefill[key];
    drawMemos();
    guarded(async () => { token = (await api('/api/growth/session')).token; await refresh(); await renderConnections(); notify('已连接。目标、资料和处理记录会持续保存在这台电脑。'); });
  }
  function fillProject() { for (const k of ['title', 'outcome', 'deadline', 'dailyMinutes']) $('[name="' + k + '"]').value = project ? project[k] : k === 'dailyMinutes' ? 60 : ''; }
  async function saveProject() { project = await api('/api/growth/project', { account: owner, id: project && project.id, version: project && project.version, title: value('title'), outcome: value('outcome'), deadline: value('deadline'), dailyMinutes: Number(value('dailyMinutes')) }); await refresh(false); return project; }
  async function refresh(selectLatest = true) {
    const state = await api('/api/growth/state?account=' + encodeURIComponent(owner)); if (!dialog) return;
    const select = $('[data-projects]'); select._projects = state.projects; select.replaceChildren(option('新建目标', '')); state.projects.forEach(p => select.append(option(p.title, p.id))); if (project) select.value = project.id;
    const host = $('[data-history]'); host.replaceChildren();
    state.runs.forEach(run => { const b = button(historyLabel(run), () => loadRun(run.id).catch(e => notify(e.message, true))); b.dataset.historyRun = run.id; host.append(b); });
    if (selectLatest && state.runs.length) showRun(state.runs[0]);
  }
  function drawMaterials() { const host = $('[data-materials]'); if (!host) return; host.replaceChildren(); materials.forEach((m, i) => { const row = n('div', null, 'growth-material'); row.append(n('span', m.title + ' · ' + m.text.length + '字'), button('移除', () => { materials.splice(i, 1); drawMaterials(); })); host.append(row); }); if (frames.length) host.append(n('p', (mediaKind === 'video' ? '视频' : '图片') + ' · ' + frames.length + '张待分析画面'), button('移除画面', () => { frames = []; drawMaterials(); })); }
  function once(el, event) { return new Promise((resolve, reject) => { const timer = setTimeout(() => done(new Error('媒体读取超时，请换一个文件重试。')), 20000); function done(err) { clearTimeout(timer); el.removeEventListener(event, ok); el.removeEventListener('error', fail); err ? reject(err) : resolve(); } const ok = () => done(), fail = () => done(new Error('浏览器无法解码此媒体，请换为 JPG、MP4 或 WebM。')); el.addEventListener(event, ok, { once: true }); el.addEventListener('error', fail, { once: true }); }); }
  function jpeg(el) { const w = el.videoWidth || el.naturalWidth, h = el.videoHeight || el.naturalHeight; if (!w || !h) throw new Error('无法读取画面尺寸。'); const scale = Math.min(1, 1000 / w, 900 / h), canvas = document.createElement('canvas'); canvas.width = Math.round(w * scale); canvas.height = Math.round(h * scale); canvas.getContext('2d').drawImage(el, 0, 0, canvas.width, canvas.height); return canvas.toDataURL('image/jpeg', .72); }
  async function mediaFrames(file) {
    const url = URL.createObjectURL(file), isVideo = file.type.startsWith('video/'), element = document.createElement(isVideo ? 'video' : 'img');
    try { if (isVideo) { element.muted = true; element.preload = 'auto'; } const ready = once(element, isVideo ? 'loadeddata' : 'load'); element.src = url; await ready;
      if (!isVideo) return [{ timestamp: 0, image: jpeg(element) }];
      if (!Number.isFinite(element.duration) || element.duration <= 0) throw new Error('视频时长无效。');
      const result = [], end = Math.max(0, element.duration - .02);
      for (const time of [...new Set(Array.from({ length: 6 }, (_, i) => Math.min(end, element.duration * i / 5)))]) { if (Math.abs(element.currentTime - time) > .001) { const seeked = once(element, 'seeked'); element.currentTime = time; await seeked; } result.push({ timestamp: Math.round(time * 1000) / 1000, image: jpeg(element) }); } return result;
    } finally { element.removeAttribute('src'); if (isVideo) element.load(); URL.revokeObjectURL(url); }
  }
  async function importFiles(files) {
    const current = generation;
    for (const file of files.slice(0, 12)) {
      if (materials.length >= 12) throw new Error('本次最多导入12份资料，请分批处理。');
      notify('正在读取 ' + file.name + '…');
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) { if (file.size > 100 * 1024 * 1024) throw new Error('媒体超过100 MB，请先截取需要解析的片段。'); const next = await mediaFrames(file); if (current !== generation) return; if (frames.length + next.length > 6) throw new Error('本次最多6张画面，请先移除已选画面。'); frames.push(...next); mediaKind = file.type.startsWith('video/') || mediaKind === 'video' ? 'video' : 'image'; }
      else { if (file.size > 5 * 1024 * 1024) throw new Error('文档每份最多5 MB，请按章节拆分。'); let doc;
        if (/\.(txt|md|srt|vtt)$/i.test(file.name)) doc = { text: await file.text() };
        else { const bytes = new Uint8Array(await file.arrayBuffer()); let binary = ''; for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 32768)); doc = await api('/api/extract-file', { name: file.name, content: btoa(binary) }); }
        if (current !== generation) return;
        if (!doc.text || doc.thin) throw new Error(file.name + ' 没有可读取文字。');
        if (doc.text.length > 30000) throw new Error(file.name + ' 超过30000字，请按章节拆分后导入，避免漏掉后半部分。');
        materials.push({ title: file.name, text: doc.text, kind: 'document' }); }
      drawMaterials();
    } notify('资料已带入，点击“生成行动草稿”继续。');
  }
  async function begin(readOnly = false) {
    await saveProject(); const inputs = materials.slice(); if (value('text')) inputs.push({ title: '手动正文 / 笔记', text: value('text'), kind: 'text' });
    const current = SY.getAcctData();
    const run = await api('/api/growth/run', { account: owner, projectId: project.id, materials: inputs, links: value('links'), readOnly, frames, mediaKind, question: value('question'), search: $('[name=search]').checked, categories: (current.categories || []).map(c => typeof c === 'string' ? c : c.name).filter(Boolean) });
    notify('已开始处理。可以关闭窗口，稍后从处理记录继续。'); await loadRun(run.id);
  }
  async function loadRun(id) { const run = await api('/api/growth/run?account=' + encodeURIComponent(owner) + '&id=' + encodeURIComponent(id)); if (dialog) showRun(run); }
  function historyLabel(run) { return (run.project && run.project.title || '资料处理') + ' · ' + ({ succeeded: '待核对', failed: '未完成', interrupted: '已中断', running: '处理中', queued: '等待中', collected: '资料已读取', partial: '已保存 · 有待补充链接', blocked: '等待补充' }[run.status] || run.status); }
  async function retryRun(run, options) { await api('/api/growth/retry', { account: owner, id: run.id, ...options }); await loadRun(run.id); }
  function showRun(run) {
    clearTimeout(poll); selectedRun = run; const host = $('[data-result]'); if (!host) return; host.replaceChildren();
    let history = [...dialog.querySelectorAll('[data-history-run]')].find(b => b.dataset.historyRun === run.id);
    if (!history) { history = button('', () => loadRun(run.id).catch(e => notify(e.message, true))); history.dataset.historyRun = run.id; $('[data-history]').prepend(history); }
    history.textContent = historyLabel(run);
    const active = ['queued', 'running'].includes(run.status);
    const flow = n('div', null, 'growth-flow'); ['读取资料', '识别画面', '提炼内容', '生成行动', '核对采用'].forEach((t, i) => { const stage = ['collect', 'vision', 'diagnose', 'plan', 'review'].indexOf(run.stage); flow.append(n('span', t, i === stage ? 'active' : '')); }); host.append(flow);
    const events = n('div', null, 'growth-events'); (run.events || []).slice(-4).forEach(e => events.append(n('p', e.message))); host.append(events);
    if (run.sourceResults && run.sourceResults.length) {
      const list = n('details', null, 'growth-link-results'); list.open = true;
      const count = run.sourceResults.filter(s => s.status === 'read').length;
      list.append(n('summary', '全部资料 · ' + count + '/' + run.sourceResults.length + ' 已读取'));
      run.sourceResults.forEach(s => {
        const item = n('article', null, 'growth-source'); item.dataset.sourceStatus = s.status;
        const label = { read: '已读取', partial: '仅有简介', failed: '待补充', pending: '等待读取' }[s.status] || s.status;
        item.append(n('strong', label + (s.chars ? ' · ' + s.chars + '字' : '')), s.url ? link(s.title + ' ↗', s.url) : n('p', s.title));
        if (s.error) item.append(n('p', s.error, 'growth-hint'));
        if (s.previewText) { const preview = n('details'); preview.append(n('summary', '标题/简介预览 · 尚未读到完整内容'), n('pre', s.previewText)); item.append(preview); }
        if (s.status !== 'read' && !active) item.append(button('重试此链接', () => guarded(() => retryRun(run, { readOnly: true, sourceId: s.id }))));
        list.append(item);
      }); host.append(list);
      if (count < run.sourceResults.length && !active) host.append(n('p', '待补充的链接已保留。生成行动只依据已读取的资料，不会把未读取的视频当作已理解。', 'growth-hint'), button('重试全部未读链接', () => guarded(() => retryRun(run, { readOnly: true }))));
    }
    if (!active && run.sources && run.sources.length && ['collected', 'partial', 'blocked'].includes(run.status)) host.append(button('用已读取资料生成行动', () => guarded(() => retryRun(run, { readOnly: false, retrySources: false })), 'growth-primary'));
    if (run.error) { host.append(n('p', run.error, 'growth-error')); if (['failed', 'interrupted'].includes(run.status)) host.append(button('从中断处继续', () => guarded(async () => { await api('/api/growth/retry', { account: owner, id: run.id }); await loadRun(run.id); }))); }
    (run.warnings || []).forEach(t => host.append(n('p', t, 'growth-error')));
    if (run.sources && run.sources.length) { const details = n('details'); details.append(n('summary', '已保存的来源 · ' + run.sources.length)); run.sources.forEach(s => { const item = n('article', null, 'growth-source'); item.append(s.url ? link(s.title + ' ↗', s.url) : n('strong', s.title)); if (s.note) item.append(n('p', s.note, 'growth-hint')); item.append(n('pre', s.text)); details.append(item); }); host.append(details); }
    if (run.diagnosis) { const d = run.diagnosis; host.append(n('h4', '核心内容'), n('p', d.summary, 'growth-summary')); for (const [key, label] of [['keyPoints', '关键点'], ['gaps', '还需补齐'], ['unknowns', '待核实']]) if (d[key] && d[key].length) { host.append(n('h4', label)); const list = n('ul'); d[key].forEach(t => list.append(n('li', t))); host.append(list); } host.append(button('将核心内容存入备忘', () => saveMemo(run))); }
    if (run.status === 'succeeded') {
      const estimates = n('p', '建议行动共 ' + run.totalMinutes + ' 分钟；每天可投入 ' + run.project.dailyMinutes + ' 分钟。加入清单后仍可调整时间。', 'growth-hint'); host.append(estimates);
      (run.drafts || []).forEach(draft => { const card = n('article', null, 'growth-draft'); card.dataset.draft = draft.id; const select = n('label', null, 'growth-check'); const check = n('input'); check.type = 'checkbox'; check.checked = !(SY.getAcctData().tasks || []).some(t => t.growthSourceKey === draft.id); check.dataset.selectDraft = ''; select.append(check, document.createTextNode('加入我的清单')); card.append(select);
        for (const [label, type, key] of [['任务名称', 'text', 'name'], ['负责人', 'text', 'owner'], ['预计分钟', 'number', 'minutes'], ['截止日期', 'date', 'dueDate']]) { const f = field(label, type, key); f.querySelector('input').value = draft[key] || ''; card.append(f); }
        const planned = field('计划哪天做', 'date', 'date'); planned.querySelector('input').value = SY.todayKey(); card.append(planned);
        const categoryLabel = n('label', '类别'), category = n('select'); category.name = 'category';
        const categories = (SY.getAcctData().categories || []).map(c => typeof c === 'string' ? c : c.name).filter(Boolean);
        (categories.length ? categories : ['学习']).forEach(c => category.append(option(c, c))); categoryLabel.append(category); card.append(categoryLabel);
        card.append(n('p', '先做：' + draft.firstStep), n('p', '交付：' + draft.deliverable), n('p', '完成标准：' + draft.check));
        for (const [key, label] of [['important', '重要'], ['urgent', '紧急']]) { const l = n('label', null, 'growth-check'); const c = n('input'); c.type = 'checkbox'; c.name = key; l.append(c, document.createTextNode(label)); card.append(l); } host.append(card);
      });
      if (run.drafts.length) host.append(button('保存所选任务，同时存入备忘', () => applyDrafts(run), 'growth-primary')); else host.append(n('p', '本份资料没有生成行动建议，可保存核心内容。'));
    }
    if (['queued', 'running'].includes(run.status)) poll = setTimeout(() => loadRun(run.id).catch(e => notify(e.message, true)), 1600);
  }
  function memoFor(run) { return { id: run.id, title: run.project.title, summary: run.diagnosis.summary, keyPoints: run.diagnosis.keyPoints, sources: run.sources.map(s => ({ title: s.title, url: s.url })), savedAt: new Date().toISOString() }; }
  function saveMemo(run) { if (owner !== acct()) return; const data = SY.getAcctData(); data.growthMemos = data.growthMemos || []; if (!data.growthMemos.some(m => m.id === run.id)) data.growthMemos.push(memoFor(run)); SY.saveAcctData(data); drawMemos(); notify('核心内容已保存到备忘。'); }
  function drawMemos() { const host = $('[data-memos]'); if (!host || !window.SY) return; host.replaceChildren(); const memos = SY.getAcctData().growthMemos || []; if (!memos.length) host.append(n('p', '还没有保存备忘。', 'growth-hint')); memos.slice().reverse().forEach(m => { const a = n('article', null, 'growth-memo'); a.append(n('h4', m.title), n('p', m.summary)); (m.sources || []).filter(s => s.url).forEach(s => a.append(link(s.title + ' ↗', s.url))); host.append(a); }); }
  function applyDrafts(run) {
    try { if (owner !== acct()) throw new Error('资料空间已切换，请重新打开。'); const data = SY.getAcctData(), pending = []; data.tasks = data.tasks || [];
      for (const card of dialog.querySelectorAll('[data-draft]')) { if (!card.querySelector('[data-select-draft]').checked || data.tasks.some(t => t.growthSourceKey === card.dataset.draft)) continue;
        const source = run.drafts.find(d => d.id === card.dataset.draft), val = key => card.querySelector('[name="' + key + '"]').value.trim(); const minutes = Number(val('minutes')), name = val('name');
        if (!name || !Number.isFinite(minutes) || minutes < 5 || minutes > 720) throw new Error('请核对任务名称和预计分钟数。');
        if (!val('date') || (val('dueDate') && val('date') > val('dueDate'))) throw new Error('计划日期不能空着，也不能晚于截止日期。');
        const links = run.sources.filter(s => source.sourceIds.includes(s.id) && s.url).map(s => s.url).join('\n');
        pending.push({ id: SY.uid(), growthSourceKey: source.id, growthProjectId: run.projectId, name, owner: val('owner'), category: val('category'), date: val('date'), dueDate: val('dueDate'), dueTime: '', estMinutes: minutes, plannedMinutes: minutes, multiplier: 1, firstTime: false, startMinutes: null, weight: 'medium', done: false, createdAt: Date.now(), important: card.querySelector('[name=important]').checked, urgent: card.querySelector('[name=urgent]').checked, order: Math.max(0, ...data.tasks.map(t => Number(t.order) || 0)) + pending.length + 1, noteGain: run.diagnosis.summary, noteKnowledge: run.diagnosis.keyPoints.join('\n'), noteRemark: '第一步：' + source.firstStep + '\n交付物：' + source.deliverable + '\n验收：' + source.check + '\n来源：\n' + links });
      }
      data.tasks.push(...pending); data.growthMemos = data.growthMemos || []; if (!data.growthMemos.some(m => m.id === run.id)) data.growthMemos.push(memoFor(run)); SY.saveAcctData(data); SY.refreshCurrentView(); drawMemos(); notify('已保存 ' + pending.length + ' 个新任务和核心备忘；重复任务已跳过。'); showRun(run);
    } catch (e) { notify(e.message, true); }
  }
  async function renderConnections() {
    const h = await api('/api/growth/health'); const host = $('[data-connections]'); if (!host) return; host.replaceChildren();
    host.append(n('p', h.ai.verified ? '模型最近一次连接测试通过：' + h.ai.model : '模型尚未通过当前连接测试。', 'growth-hint'));
    const providers = n('select'); providers.setAttribute('aria-label', '选择电脑上已配置的模型'); providers.append(option('选择已有的模型服务', '')); (h.providers || []).filter(p => p.available).forEach(p => providers.append(option(p.name + ' · ' + p.model, p.id))); host.append(providers);
    if (window.SYRescue && typeof SYRescue.configure === 'function') host.append(button('打开原模型设置', () => { close(); SYRescue.configure(); }));
    host.append(button('验证并使用此模型', () => guarded(async () => { if (!providers.value) throw new Error('先选择一个已有模型。'); notify('正在实际请求所选模型…'); const v = await api('/api/growth/model', { id: providers.value }); notify('模型连接通过：' + v.model); await renderConnections(); })), button('测试联网搜索', () => guarded(async () => { notify('正在联网搜索…'); const v = await api('/api/growth/search-test', {}); notify('联网成功：' + v.provider + ' 返回 ' + v.results.length + ' 条来源。'); const results = n('div'); v.results.forEach(s => results.append(link(s.title + ' ↗', s.url))); host.append(results); })), n('p', '模型凭证沿用这台电脑已有配置，不发送到 GitHub。验证失败时保留原连接。', 'growth-hint'));
  }
  function mount() {
    if (!window.SY) return;
    const bar = document.querySelector('.app-topbar-right');
    if (bar && !bar.querySelector('[data-growth-open]')) { const b = button('资料 → 行动', () => open(), 'btn btn-primary btn-sm'); b.dataset.growthOpen = ''; bar.prepend(b); }
    const form = document.querySelector('#syRouteForm');
    if (form && !form.querySelector('[data-growth-route]')) {
      const section = n('div', null, 'growth-route-entry'); section.dataset.growthRoute = '';
      const prefill = () => { const read = key => form.querySelector('[data-route-field="' + key + '"]')?.value || ''; open({ title: read('name'), links: read('urls'), text: read('sourceText') }); };
      section.append(n('strong', '把资料继续变成行动'), n('p', '带入图片、视频、文档或微信资料，结合目标检索，核对任务后加入清单；核心内容同步保存备忘。'), button('＋ 导入图片 / 视频 / 文档', prefill, 'btn btn-primary'));
      form.append(section);
    }
  }
  window.SYGrowth = { open, close };
  document.addEventListener('sy:data', mount); document.addEventListener('DOMContentLoaded', mount); mount();
  new MutationObserver(mount).observe(document.body, { childList: true, subtree: true });
})();
