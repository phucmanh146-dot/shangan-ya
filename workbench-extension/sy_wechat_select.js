/* Search is scoped by selected group; only explicitly checked text is imported. */
(() => {
  'use strict';
  let selectedGroup = null, current = { groups: [], messages: [], conversations: [] }, chosen = new Set();
  const btn = (text, action) => { const b = el('button', text); b.type = 'button'; b.onclick = action; return b; };
  function draw() {
    const host = $('results'); host.replaceChildren();
    if (current.note) host.append(el('p', current.note));
    if (current.groups.length) {
      const section = el('article'); section.append(el('h2', '先选群聊 · ' + current.groups.length));
      current.groups.forEach(group => {
        const row = el('div'); row.className = 'row';
        row.append(el('span', group.name), btn(selectedGroup?.name === group.name ? '已选择此群' : '选择此群', () => chooseGroup(group)));
        section.append(row);
      }); host.append(section);
    }
    if (current.conversations.length) {
      const box = el('details'); box.append(el('summary', '尚未展开的聊天记录 · ' + current.conversations.length));
      current.conversations.forEach(text => box.append(el('p', text))); host.append(box);
    }
    if (current.messages.length) {
      const box = el('article'); box.append(el('h2', '勾选需要的消息 / 框选内容 · ' + current.messages.length));
      const toolbar = el('div'); toolbar.className = 'row';
      toolbar.append(btn('全选', () => { chosen = new Set(current.messages.map((_, i) => i)); draw(); }), btn('清空选择', () => { chosen.clear(); draw(); })); box.append(toolbar);
      current.messages.forEach((m, i) => {
        const row = el('label'); row.className = 'message-choice';
        const check = el('input'); check.type = 'checkbox'; check.checked = chosen.has(i); check.dataset.messageIndex = i;
        check.onchange = () => { check.checked ? chosen.add(i) : chosen.delete(i); updateImport(); };
        const content = el('div'); if (m.group) content.append(el('strong', m.group));
        content.append(el('pre', m.text));
        if (m.image) { const img = el('img'); img.src = m.image; img.alt = '本次框选的区域'; img.style.maxWidth = '100%'; content.append(img); }
        row.append(check, content); box.append(row);
      });
      const use = btn('', () => {
        const messages = current.messages.filter((_, i) => chosen.has(i)); if (!messages.length) return;
        const text = '来源：微信中由我勾选的内容；仅所选消息 / 框选区域。\n\n' + messages.map(m => (m.group ? '群聊：' + m.group + '\n' : '') + m.text).join('\n\n');
        if (text.length > 30000) return note('所选内容超过30000字，请分批带入。');
        bringBack({ text, kind: 'wechat', keyword: $('keyword').value.trim() });
      }); use.id = 'importChosen'; box.append(use); host.append(box); updateImport();
    }
    if (!current.groups.length && !current.messages.length && !current.conversations.length) host.append(el('p', '当前没有可供选择的结果。'));
  }
  function updateImport() {
    const button = $('importChosen'); if (button) { button.disabled = chosen.size === 0; button.textContent = '将所选 ' + chosen.size + ' 条带入正文'; }
  }
  function render(result, append = false) {
    if (append) current.messages.push(...(result.messages || []));
    else { current = { ...result, groups: result.groups || [], messages: result.messages || [], conversations: result.conversations || [] }; chosen.clear(); }
    draw(); note('已列出 ' + current.groups.length + ' 个群聊、' + current.messages.length + ' 条可选择内容。请勾选后带入正文。');
  }
  async function chooseGroup(group) {
    if (searching || window.SYSharedWechatBusy?.()) return;
    selectedGroup = group; $('groupQuery').value = group.name;
    $('selectedGroup').textContent = '已选群：' + group.name; draw();
    const keyword = $('keyword').value.trim();
    if (!keyword) return note('已选群，请填写消息关键词，再点击“生成列表”。');
    if (!group.id) {
      note('已选群：' + group.name + '。请在微信打开这个群并搜索“' + keyword + '”，再点“读取当前搜索画面”；也可以直接浮动框选。');
      return;
    }
    await runSearch(() => api('/wechat-group-messages', { id: group.id, keyword }));
  }
  async function runSearch(action) {
    searching = true; const ticket = ++searchSequence; searchButtons();
    try { const result = await action(); if (ticket === searchSequence) render(result); }
    catch (e) { if (ticket === searchSequence) note(e.message); }
    finally { if (ticket === searchSequence) { searching = false; searchButtons(); } }
  }
  async function search() {
    if (searching || window.SYSharedWechatBusy?.()) return;
    const group = $('groupQuery').value.trim(), keyword = $('keyword').value.trim();
    if (!group && !keyword) return note('填写群聊名称或消息关键词。');
    if (selectedGroup?.name !== group) selectedGroup = null;
    note(group ? '正在查找群聊，列出后由你选择…' : '正在读取匹配的群聊和消息…');
    if (selectedGroup && keyword) return chooseGroup(selectedGroup);
    await runSearch(() => group ? api('/wechat-group-list', { query: group }) : api('/wechat-search', { keyword }));
  }
  $('groupQuery').addEventListener('input', () => { selectedGroup = null; $('selectedGroup').textContent = ''; });
  window.SYWechatLists = { render, search, group: () => selectedGroup?.name || '',
    addCrop: (text, image) => render({ messages: [{ text: '微信框选文字（请核对识别结果）：\n' + text, image }] }, true) };
})();
