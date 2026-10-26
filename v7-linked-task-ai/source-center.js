(function(){
'use strict';
if(window.SYSourceCenter)return;
var items=[],busy=false,owner='';
function $(s,r){return (r||document).querySelector(s)}
function el(tag,cls,text){var n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n}
function esc(s){return String(s==null?'':s)}
function uid(){return 'source-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7)}
function account(){return String(window.SY&&SY.currentAccountKey||'guest')}
function currentAccount(){return window.SY&&SY.getAcctData?SY.getAcctData():{tasks:[]}}
function noteStatus(text,bad){var n=$('#scStatus');if(n){n.textContent=text||'';n.style.color=bad?'#a43f52':''}}
function sourceType(url){var s=String(url||'').toLowerCase();if(s.indexOf('obsidian://')===0)return 'Obsidian';if(/feishu\.cn|larksuite\.com/.test(s))return '飞书';if(/bilibili\.com|b23\.tv|youtube\.com|youtu\.be|douyin\.com/.test(s))return '视频链接';return '网页链接'}
function titleFor(doc,url,name){return String(doc&&doc.title||name||url||'未命名资料').slice(0,180)}
function contentFor(doc){try{return window.SYSourceIO.toMarkdown(doc)}catch(_){return String(doc&&(doc.text||doc.content)||'')}}
function addToPool(item){
 if(!window.SYPMUpgrade||!window.SYPMUpgrade.addExternalMaterial)return;
 var existing=window.SYPMUpgrade.getMaterials?window.SYPMUpgrade.getMaterials():[];
 if(existing.some(function(m){return String(m.id||'')===String(item.id||'')||(item.url&&String(m.url||'')===String(item.url))||(item.sourceRef&&String(m.sourceRef||'')===String(item.sourceRef))}))return;
 window.SYPMUpgrade.addExternalMaterial({id:item.id,title:item.title,source:item.sourceKey||'web',sourceRef:item.sourceRef||item.url||'',url:item.url||'',content:item.content||'',selected:true,importedAt:new Date().toISOString()})
}
function renderShell(){
 var root=$('#sourceCenterRoot');if(!root)return;
 root.innerHTML='<div class="sc-page">'+
 '<header class="sc-head"><div><p class="sc-eyebrow">SOURCE CENTER · READ · VERIFY · LINK</p><h1>资料中心</h1><p class="sc-subtitle">Obsidian、飞书 Wiki、网页、视频链接和本地文档在这里读取与核对。微信消息不放在这里，请前往「收集任务」逐条识别并关联任务。</p></div><div id="scApiState" class="sc-api-state">后端 API 状态待检测</div></header>'+
 '<ol class="sc-flow" id="scFlow" aria-label="读取与关联进度"><li data-sc-step="1"><b>1</b><span>选择资料来源</span></li><li data-sc-step="2"><b>2</b><span>逐条读取正文</span></li><li data-sc-step="3"><b>3</b><span>核对原文与状态</span></li><li data-sc-step="4"><b>4</b><span>关联任务 / AI 分析</span></li></ol>'+
 '<div class="sc-loop-back"><b>↻</b><span id="scFlowHint" role="status" aria-live="polite">先选择来源，读取成功后再核对并关联任务。整个过程不改变原任务。</span><button class="sc-btn sc-next" type="button" id="scNextStep">前往读取结果 →</button></div>'+
 '<div class="sc-workspace">'+
 '<nav class="sc-subnav" aria-label="资料中心子目录">'+
 '<p class="sc-subnav-title">资料来源</p>'+
 '<button type="button" class="sc-subnav-item is-active" data-sc-tab="obsidian"><span class="sc-subnav-icon">◉</span><span><b>本机知识库</b><small>韩奕知识复盘 · 搜索笔记</small></span></button>'+
 '<button type="button" class="sc-subnav-item" data-sc-tab="web"><span class="sc-subnav-icon">↗</span><span><b>网页链接</b><small>公开网页 · 文章 · 分享链接</small></span></button>'+
 '<button type="button" class="sc-subnav-item" data-sc-tab="feishu"><span class="sc-subnav-icon">▤</span><span><b>飞书文档</b><small>Wiki · 文档正文读取</small></span></button>'+
 '<button type="button" class="sc-subnav-item" data-sc-tab="file"><span class="sc-subnav-icon">▧</span><span><b>本地文件</b><small>Word · PDF · 图片 · 字幕</small></span></button>'+
 '<button type="button" class="sc-subnav-item" data-sc-tab="video"><span class="sc-subnav-icon">▷</span><span><b>视频链接</b><small>B站 · YouTube · 视频来源</small></span></button>'+
 '<button type="button" class="sc-subnav-item" data-sc-tab="results"><span class="sc-subnav-icon">☷</span><span><b>读取结果与任务</b><small>核对原文 · 关联已有任务</small></span></button>'+
 '<div class="sc-subnav-note">一次只专注一种来源；读取成功后前往结果页核对。连接成功不代表已读取正文。</div>'+
 '</nav>'+
 '<div class="sc-workspace-main">'+
 '<section class="sc-card sc-source-panel is-active" data-sc-panel="obsidian"><div class="sc-panel-kicker">SOURCE 01</div><h2>本机知识库 · Obsidian</h2><p id="scVaultState">正在检查本机连接…</p><div class="sc-vault-name">指定知识库：<strong>韩奕知识复盘</strong></div><label for="scObsidianQuery">搜索笔记标题和正文<input id="scObsidianQuery" type="text" placeholder="例如：Agent、提示词、比赛复盘、工作流"></label><div class="sc-actions"><button class="sc-btn primary" id="scSearchObsidian" type="button">搜索本机笔记</button><button class="sc-btn" id="scConnectVault" type="button">选择 / 连接知识库</button><button class="sc-btn secondary" id="scOpenVault" type="button">打开 Obsidian</button></div><div id="scObsidianResults" class="sc-results-list"></div><p class="sc-mini-status">先搜索，再逐篇读取真实全文。只有读取成功的笔记才能关联任务或交给 AI 分析；不会把普通网页自动写入 Obsidian。</p></section>'+
 '<section class="sc-card sc-source-panel" data-sc-panel="web" hidden><div class="sc-panel-kicker">SOURCE 02</div><h2>网页链接</h2><p>单独处理普通网页、课程页和公开分享链接。每行一条链接，逐条显示正文读取状态；需要登录或无法提取正文时会明确提示。</p><label for="scLinks">粘贴网页链接<textarea id="scLinks" placeholder="https://example.com/article…&#10;https://www.woshipm.com/…"></textarea></label><div class="sc-actions"><button class="sc-btn primary" id="scReadLinks" type="button">读取网页正文</button><button class="sc-btn" id="scOpenAdvanced" type="button">连接与 API 检测</button></div><p class="sc-mini-status">只读取并保存来源和正文状态，不会自动关联任务；请到“读取结果与任务”中确认。</p></section>'+
 '<section class="sc-card sc-source-panel" data-sc-panel="feishu" hidden><div class="sc-panel-kicker">SOURCE 03</div><h2>飞书文档 / Wiki</h2><p>单独读取飞书 Wiki 或文档分享链接。请使用你有权限访问的链接；若需要登录或授权，会显示实际失败原因，不会假装读取成功。</p><label for="scFeishuLinks">粘贴飞书链接<textarea id="scFeishuLinks" placeholder="https://xxx.feishu.cn/wiki/…&#10;https://xxx.feishu.cn/docx/…"></textarea></label><div class="sc-actions"><button class="sc-btn primary" id="scReadFeishu" type="button">读取飞书正文</button><button class="sc-btn" id="scOpenAdvancedFeishu" type="button">检查飞书 / API 连接</button></div><p class="sc-mini-status">按目录整理飞书内容时保留原文、来源链接和真实人物信息；未核实的姓名不猜测。</p></section>'+
 '<section class="sc-card sc-source-panel" data-sc-panel="file" hidden><div class="sc-panel-kicker">SOURCE 04</div><h2>本地文件</h2><p>选择本机文件后解析正文，支持 Word、PDF、Markdown、TXT、CSV、字幕和常见图片。单个文件最大 5 MB；无法解析时显示原因。</p><input id="scFiles" type="file" multiple accept=".txt,.md,.csv,.json,.srt,.vtt,.html,.htm,.pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.gif,.bmp" hidden><div class="sc-file-drop" id="scFileDrop"><strong>将文件拖到这里，或点击选择</strong><span>文件只在你主动选择后读取，不会自动上传到公开页面。</span><button class="sc-btn primary" id="scChooseFiles" type="button">选择文件并解析</button></div><div class="sc-actions"><button class="sc-btn" id="scClear" type="button">清空本次读取结果</button></div><p class="sc-mini-status">解析结果会进入“读取结果与任务”，核对后再决定是否关联任务。</p></section>'+
 '<section class="sc-card sc-source-panel" data-sc-panel="video" hidden><div class="sc-panel-kicker">SOURCE 05</div><h2>视频链接解析</h2><p>单独处理 B 站、YouTube 等视频链接。系统会尝试读取可访问的标题、描述或字幕；拿不到字幕/正文时会如实标注，不会编造视频内容。</p><label for="scVideoLinks">粘贴视频链接<textarea id="scVideoLinks" placeholder="https://www.bilibili.com/video/…&#10;https://www.youtube.com/watch?v=…"></textarea></label><div class="sc-actions"><button class="sc-btn primary" id="scReadVideo" type="button">读取视频资料</button><button class="sc-btn" id="scGoAI" type="button">打开 AI 工作助手</button></div><p class="sc-mini-status">读取成功后可在结果页核对来源、选择任务，再交给 AI 做逐段分析或生成讲解脚本。</p></section>'+
 '<section class="sc-card sc-source-panel sc-results-panel" data-sc-panel="results" hidden><div class="sc-panel-kicker">READ · VERIFY · LINK</div><h2>读取结果与任务关联</h2><p>先核对每条资料的原文、来源和读取状态，再手动勾选要关联的内容。任务不会因读取资料而自动改动。</p><div class="sc-results-head"><h2>本次读取结果</h2><span class="sc-mini-status" id="scStatus" role="status">尚未读取资料。</span></div><div class="sc-results-toolbar"><span id="scResultCount" role="status">0 份资料</span><div class="sc-actions"><button type="button" class="sc-btn" id="scSelectAll">选择已读正文</button><button type="button" class="sc-btn" id="scSelectNone">清除选择</button></div></div><div class="sc-results-list" id="scResults"></div><div class="sc-associate-inline"><h2>关联到已有任务</h2><div class="sc-associate-row"><label for="scTask">选择任务<select id="scTask"></select></label><div class="sc-actions"><button class="sc-btn primary" id="scAssociate" type="button">关联选中资料</button><button class="sc-btn secondary" id="scAnalyze" type="button">交给 AI 分析</button><button class="sc-btn" id="scGoRoute" type="button">带入航线工坊</button></div></div><p class="sc-mini-status">只关联已成功读取正文的资料；原始链接、来源类型和读取状态会保留。</p></div><div class="sc-actions"><button class="sc-btn" id="scGoWechat" type="button">微信消息 → 收集任务</button></div></section>'+
 '</div></div>';
 '</div>';
 bind();renderTasks();renderResults();refreshHealth();refreshVaultState();
}
function renderTasks(){
 var select=$('#scTask');if(!select)return;
 var prev=select.value;select.replaceChildren(new Option('请选择一个已有任务',''));
 var a=currentAccount(),tasks=Array.isArray(a.tasks)?a.tasks:[]; tasks.filter(function(t){return t&&!t.done}).forEach(function(t){select.append(new Option(String(t.name||'未命名任务')+' · '+String(t.category||'未分类'),String(t.id)))});
 if(prev&&Array.from(select.options).some(function(o){return o.value===prev}))select.value=prev;
}
function renderResults(){
 var host=$('#scResults');if(!host)return;host.replaceChildren();
 var count=$('#scResultCount');if(count){var good=items.filter(function(x){return x.readStatus==='fulltext'}).length;count.textContent=items.length+' 份资料 · '+good+' 份可关联 · '+items.filter(function(x){return x.selected&&x.readStatus==='fulltext'}).length+' 份已选';}
 updateFlow();
 if(!items.length){host.append(el('div','sc-empty','读取结果会显示在这里。每条资料都有独立状态，可单独勾选、查看原文并关联任务。'));return}
 items.forEach(function(item){
  var card=el('article','sc-result'),head=el('div','sc-result-head'),check=el('input');check.type='checkbox';check.checked=!!item.selected&&item.readStatus==='fulltext';check.disabled=item.readStatus!=='fulltext';check.dataset.scPick=item.id;check.setAttribute('aria-label','选择资料 '+item.title);check.addEventListener('change',function(){item.selected=check.checked;renderResults()});
  var meta=el('div');meta.style.minWidth='0';meta.append(el('div','sc-result-title',item.title),el('div','sc-result-meta',(item.type||'资料')+' · '+(item.url||item.sourceRef||'本地文件')));
  var badge=el('span','sc-result-status',item.readStatus==='fulltext'?'已读取正文':item.readStatus==='failed'?'未读到正文':'待核对');badge.dataset.ok=String(item.readStatus==='fulltext');meta.append(badge);head.append(check,meta);card.append(head);
  if(item.error)card.append(el('p','sc-mini-status',item.error));
  if(item.content){var details=el('details','sc-preview'),summary=el('summary','', '预览已读取原文 · '+item.content.length+' 字'),excerpt=el('pre','sc-result-excerpt',item.content.slice(0,6000)+(item.content.length>6000?'\n…（仅展示前 6000 字）':''));details.append(summary,excerpt);card.append(details)}
  var actions=el('div','sc-actions');
  if(item.url&&/^(https?:|obsidian:)/i.test(item.url)){var a=el('a','sc-btn','打开原文 ↗');a.href=item.url;if(!/^obsidian:/i.test(item.url)){a.target='_blank';a.rel='noopener noreferrer'}actions.append(a)}
  var pool=el('button','sc-btn','加入 AI 资料池');pool.type='button';pool.onclick=function(){if(item.readStatus!=='fulltext')return noteStatus('这条资料没有读取到正文，先重试或手动打开原文。',true);addToPool(item);noteStatus('已把《'+item.title+'》加入 AI 资料池。')};actions.append(pool);if(item.readStatus==='failed'&&item.url&&/^https?:/.test(item.url)){var retry=el('button','sc-btn','重新读取');retry.type='button';retry.onclick=async function(){if(busy)return;busy=true;retry.disabled=true;retry.textContent='正在重新读取…';try{var doc=await SYSourceIO.readLink(item.url),content=contentFor(doc);if(!content.trim())throw Error('接口没有返回正文');item.content=content;item.title=titleFor(doc,item.url);item.readStatus='fulltext';item.error='';item.selected=true;addToPool(item);noteStatus('重试成功：《'+item.title+'》已读取全文。')}catch(e){item.error=e.message||'读取失败';noteStatus('重新读取失败：'+item.error,true)}finally{busy=false;renderResults()}};actions.append(retry)}card.append(actions);host.append(card);
 });
}
function selectedItems(){var ids=Array.from(document.querySelectorAll('[data-sc-pick]:checked')).map(function(n){return n.dataset.scPick});return items.filter(function(x){return ids.indexOf(x.id)>=0})}
function upsert(item){var key=item.url||item.sourceRef||item.id,idx=items.findIndex(function(x){return (x.url||x.sourceRef||x.id)===key});if(idx>=0)items[idx]=item;else items.push(item)}
async function refreshHealth(){
 var n=$('#scApiState');if(!n)return;n.textContent='正在检测本机后端 API…';n.dataset.ok='false';
 try{var r=await window.SY.backendCall('/api/health',null,8000);if(!r||!r.ok)throw Error(r&&r.error||'后端未返回成功状态');var h=r.data||{},caps=h.capabilities||{};n.textContent='后端已连接 · '+(caps.extract?'文件解析可用':'文件解析待核验')+' · '+(caps.feishu?'飞书应用已配置':'飞书权限待核验')+' · AI '+(caps.aiVerified?'已验证':'待验证');n.dataset.ok='true'}
 catch(e){n.textContent='后端未连接：'+e.message+'。读取失败会明确显示，不会伪装成功。';n.dataset.ok='false'}
}
async function refreshVaultState(){
 var n=$('#scVaultState');if(!n)return;
 try{
  if(window.SY&&typeof SY.backendCall==='function'){
   var r=await SY.backendCall('/api/health',null,8000),v=r&&r.ok&&r.data&&r.data.vault;
   if(v&&v.connected){if((v.name||'')==='vault'&&Number(v.count||0)===0){n.textContent='后端只识别到空的「vault」，不是目标「韩奕知识复盘」。请检查 Windows 本机服务是否在线及其实际 Vault 配置；暂不标记为已读取。';return}n.textContent='本机已识别「'+(v.name||'Obsidian')+'」· '+(Number(v.count)>0?v.count+' 篇可检索资料':'笔记数未验证')+'；只有成功读取全文后才能关联任务。';return}
  }
 }catch(_){}
 try{var s=window.SYKnowledge&&SYKnowledge.getStatus?SYKnowledge.getStatus():null;n.textContent=s&&s.connected?'已连接「'+(s.vaultName||'Obsidian')+'」· '+s.count+' 篇已导入资料':'尚未连接本机 Obsidian；点击连接后选择「韩奕知识复盘」或已有库。'}
 catch(_){n.textContent='尚未读取到 Obsidian 连接状态。'}
}
async function searchObsidian(){
 var input=$('#scObsidianQuery'),host=$('#scObsidianResults'),query=String(input&&input.value||'').trim();
 if(!query){input.focus();return noteStatus('先输入 Obsidian 搜索词。',true)}
 if(!host)return;host.replaceChildren();host.append(el('div','sc-empty','正在搜索本机 Obsidian 标题和正文…'));
 try{
  var r=await SY.backendCall('/api/pm/tutorials?q='+encodeURIComponent(query),undefined,45000);
  if(!r||!r.ok)throw Error(r&&r.error||'本机知识库搜索未成功');
  var data=r.data||{},notes=Array.isArray(data.notes)?data.notes:[];
  host.replaceChildren();
  if(!notes.length)host.append(el('div','sc-empty','没有找到匹配笔记。试试更短的关键词。'));
  notes.slice(0,35).forEach(function(note){
   var card=el('article','sc-result');card.append(el('div','sc-result-title',note.title||note.path||'Obsidian 笔记'),el('div','sc-result-meta',note.path||'本机笔记'));
   (note.snippets||[]).slice(0,2).forEach(function(s){card.append(el('p','sc-mini-status',s))});
   var row=el('div','sc-actions'),read=el('button','sc-btn primary','读取全文并加入资料中心');read.type='button';
   read.onclick=function(){readObsidianNote(note.path,read)};row.append(read);card.append(row);host.append(card)
  });
  noteStatus('本机搜索完成：匹配 '+(data.matched==null?notes.length:data.matched)+' 篇，显示 '+Math.min(notes.length,35)+' 篇。选择「读取全文」后才能关联任务。');
 }catch(e){host.replaceChildren(el('div','sc-empty','搜索失败：'+e.message));noteStatus('Obsidian 搜索未成功：'+e.message,true)}
}
async function readObsidianNote(path,button){
 if(!path)return noteStatus('笔记路径为空，无法读取。',true);
 if(button){button.disabled=true;button.textContent='正在读取真实全文…'}
 try{
  var r=await SY.backendCall('/api/pm/tutorial-links',{path:path},60000);
  if(!r||!r.ok)throw Error(r&&r.error||'本机笔记读取未成功');
  var note=r.data||{},content=String(note.content||'');
  if(!content.trim())throw Error('接口没有返回笔记正文');
  importMaterial({id:'obsidian:'+note.path,source:'obsidian',title:note.title||path,content:content,sourceRef:note.path||path,url:note.url||'',links:note.links||[],selected:true,importedAt:new Date().toISOString()});
  if(button){button.textContent='已读取全文 ✓';button.disabled=false}
  noteStatus('已读取《'+String(note.title||path)+'》全文，共 '+(note.chars||content.length)+' 字；已加入 AI 资料池和本次结果。');
 }catch(e){if(button){button.disabled=false;button.textContent='重试读取全文'}noteStatus('读取 Obsidian 全文失败：'+e.message,true)}
}
async function readLinks(kind){
 kind=kind||'web';
 var fieldId=kind==='feishu'?'scFeishuLinks':kind==='video'?'scVideoLinks':'scLinks';
 var buttonId=kind==='feishu'?'scReadFeishu':kind==='video'?'scReadVideo':'scReadLinks';
 var urls=window.SYSourceIO?SYSourceIO.normalizeLinks($('#'+fieldId)&&$('#'+fieldId).value||[]):[];
 if(!urls.length){var field=$('#'+fieldId);if(field)field.focus();noteStatus('请先粘贴至少一条完整链接。',true);return}
 busy=true;var button=$('#'+buttonId);if(button){button.disabled=true;button.textContent='逐条读取中…'}
 var ok=0,fail=0;
 try{for(var i=0;i<urls.slice(0,12).length;i++){
   var url=urls[i];noteStatus('正在读取第 '+(i+1)+' / '+Math.min(urls.length,12)+' 条：'+url);
   var type=sourceType(url);
   var item={id:uid(),url:url,type:type,sourceKey:type==='飞书'?'feishu':type==='视频链接'?'video':'web',title:url,sourceRef:url,content:'',readStatus:'failed',error:''};
   try{var doc=await SYSourceIO.readLink(url);item.title=titleFor(doc,url);item.content=contentFor(doc);item.sourceRef=doc.path||doc.sourceRef||url;item.readStatus=String(doc.readStatus||'fulltext');if(!item.content.trim())throw Error('接口返回成功但没有正文');item.readStatus='fulltext';ok++;addToPool(item)}
   catch(e){item.error=e.message||'读取失败';item.readStatus='failed';fail++}
   upsert(item);renderResults();
  }
  activateSourceTab('results');
  noteStatus('本批完成：已读到正文 '+ok+' 条，失败 '+fail+' 条。每条状态已单独列出；失败项可打开原文或调整权限后重试。',fail>0)
 }finally{busy=false;if(button){button.disabled=false;button.textContent=kind==='feishu'?'读取飞书正文':kind==='video'?'读取视频资料':'读取网页正文'}}
}
async function readFiles(files){
 files=Array.from(files||[]);if(!files.length)return;busy=true;var button=$('#scChooseFiles');if(button){button.disabled=true;button.textContent='解析中…'}
 var ok=0,fail=0;
 try{for(var file of files){var item={id:uid(),title:file.name,type:'本地文件',sourceKey:'file',sourceRef:file.name,url:'',content:'',readStatus:'failed',error:''};
  try{var doc=await SYSourceIO.readFile(file);item.title=titleFor(doc,'',file.name);item.content=contentFor(doc);item.sourceRef=file.name;if(!item.content.trim())throw Error('文件没有提取到正文');item.readStatus='fulltext';ok++;addToPool(item)}
  catch(e){item.error=e.message||'文件解析失败';fail++}
  upsert(item);renderResults()
 }}finally{busy=false;if(button){button.disabled=false;button.textContent='选择文件并解析'}renderResults();noteStatus('文件处理完成：成功 '+ok+' 个，失败 '+fail+' 个。',fail>0)}
}
function associate(){
 var selected=selectedItems(),taskId=$('#scTask')&&$('#scTask').value;
 if(!selected.length)return noteStatus('先勾选至少一条资料。',true);
 if(!taskId)return noteStatus('先选择要关联的已有任务。',true);
 var a=currentAccount(),task=(a.tasks||[]).find(function(t){return String(t.id)===String(taskId)});
 if(!task)return noteStatus('没有找到这个任务，请刷新任务列表。',true);
 task.materials=Array.isArray(task.materials)?task.materials:[];
 var added=0;
 selected.forEach(function(item){if(item.readStatus!=='fulltext')return;var key=item.url||item.sourceRef||item.title;
  if(task.materials.some(function(m){return String(m&&(m.url||m.sourceRef||m.title)||m)===String(key)}))return;
  task.materials.push({id:item.id,title:item.title,url:item.url||'',sourceRef:item.sourceRef||'',source:item.sourceKey||'web',readStatus:'fulltext',chars:item.content.length,preview:item.content.slice(0,700),addedAt:Date.now()});added++
 });
 if(!added)return noteStatus('没有新增资料：选中项可能已经关联，或尚未读取到正文。原任务没有被改动。',true);
 if(!window.SY||!SY.saveAcctData)return noteStatus('任务保存接口尚未加载，资料没有写入任务。',true);
 SY.saveAcctData(a);if(SY.refreshCurrentView)SY.refreshCurrentView();noteStatus('已将 '+added+' 份资料关联到《'+task.name+'》。原始链接和读取状态已保留；未读取成功的资料没有关联。')
}
function analyze(){ var selected=selectedItems().filter(function(x){return x.readStatus==='fulltext'});
 if(!selected.length)return noteStatus('请先勾选已读取正文的资料，再交给 AI 分析。',true);
 selected.forEach(addToPool);
 var question=document.getElementById('pma-question'),ask=document.getElementById('pma-ask');
 if(window.SY&&SY.switchAppView)SY.switchAppView('knowledge');
 if(question&&ask){question.value='请基于我刚刚在资料中心勾选的真实原文完成分析。逐份说明来源与读取范围，先总结重点，再提取行动项、截止时间、风险和可以关联的现有任务；区分原文事实与推断，不要编造。';question.dispatchEvent(new Event('input',{bubbles:true}));ask.click();noteStatus('已将 '+selected.length+' 份已读取资料提交给 AI 分析。请在知识库的回答区核对来源和结论。')}
 else noteStatus('已将 '+selected.length+' 份资料加入 AI 资料池。已打开知识库；若 AI 输入区未出现，请在该页进入「遇到困难」模块继续分析。')
}
function routeSelected(){
 var selected=selectedItems().filter(function(x){return x.readStatus==='fulltext'});
 if(!selected.length)return noteStatus('先勾选至少一份已读取正文的资料。',true);
 var text=selected.map(function(x){return '# '+x.title+'\n来源：'+(x.url||x.sourceRef||'本地文件')+'\n\n'+x.content}).join('\n\n---\n\n').slice(0,20000);
 if(window.SY&&SY.switchAppView)SY.switchAppView('knowledge');
 setTimeout(function(){
  var input=document.getElementById('skillSourceInput');
  if(!input){var skip=document.getElementById('swSkipToSrc');if(skip)skip.click();input=document.getElementById('skillSourceInput')}
  if(input){input.value=text;input.dispatchEvent(new Event('input',{bubbles:true}));input.focus({preventScroll:true});noteStatus('已把 '+selected.length+' 份原文带入航线工坊资料框。请核对后再生成路线。')}
  else noteStatus('资料已加入 AI 资料池并打开知识库；请在航线工坊第三步粘贴或核对资料。')
 },80)
}
function importMaterial(data){
 if(!data)return;
 var content=String(data.content||data.text||'');
 if(!content.trim())return;
 var item={id:String(data.id||uid()),title:titleFor(data,data.url,data.sourceRef),type:data.source==='obsidian'?'Obsidian 笔记':'导入资料',sourceKey:data.source||'web',sourceRef:data.sourceRef||data.path||data.url||'',url:data.url||'',content:content,readStatus:'fulltext',selected:true,error:''};
 upsert(item);addToPool(item);renderResults();noteStatus('已导入《'+item.title+'》全文到资料中心，可关联任务或带入航线工坊。');
}
function updateFlow(){var root=$('#sourceCenterRoot');if(!root)return;var active=$('[data-sc-tab].is-active',root),key=active&&active.dataset.scTab||'obsidian',ready=items.filter(function(x){return x.readStatus==='fulltext'}).length,selected=items.filter(function(x){return x.selected&&x.readStatus==='fulltext'}).length,step=key==='results'?(selected?4:3):(ready?2:1),hint=$('#scFlowHint');root.querySelectorAll('[data-sc-step]').forEach(function(li){var n=Number(li.dataset.scStep);li.classList.toggle('is-current',n===step);li.classList.toggle('is-done',n<step)});if(hint)hint.textContent=key==='results'?(selected?'已选择 '+selected+' 份真实正文，选择任务后即可关联或交给 AI 分析。':'请先勾选已成功读取正文的资料。'):ready?'目前有 '+ready+' 份已读正文，点击“前往读取结果”核对与关联。':'选择一种资料来源，读取完成后自动进入结果页；连接状态不等于正文读取成功。';}
function activateSourceTab(key){
 var root=$('#sourceCenterRoot');if(!root)return;
 root.querySelectorAll('[data-sc-tab]').forEach(function(btn){var active=btn.getAttribute('data-sc-tab')===key;btn.classList.toggle('is-active',active);btn.setAttribute('aria-current',active?'page':'false')});
 root.querySelectorAll('[data-sc-panel]').forEach(function(panel){var active=panel.getAttribute('data-sc-panel')===key;panel.hidden=!active;panel.classList.toggle('is-active',active)});updateFlow();
}
function bind(){
 var root=$('#sourceCenterRoot');
 $('#scNextStep').onclick=function(){activateSourceTab('results');$('#scResults').scrollIntoView({behavior:'smooth',block:'nearest'})};
 $('#scSelectAll').onclick=function(){items.forEach(function(x){x.selected=x.readStatus==='fulltext'});renderResults()};
 $('#scSelectNone').onclick=function(){items.forEach(function(x){x.selected=false});renderResults()};
 if(root)root.querySelectorAll('[data-sc-tab]').forEach(function(btn){btn.onclick=function(){activateSourceTab(btn.getAttribute('data-sc-tab'))}});
 $('#scSearchObsidian').onclick=searchObsidian;
 $('#scObsidianQuery').onkeydown=function(e){if(e.key==='Enter'){e.preventDefault();searchObsidian()}};
 $('#scConnectVault').onclick=function(){if(window.SYKnowledge)SYKnowledge.open();else noteStatus('Obsidian 读取组件尚未加载。',true);setTimeout(refreshVaultState,500)};
 $('#scOpenVault').onclick=async function(){try{var r=await SY.backendCall('/api/pm/vault-open',{},10000);if(!r||!r.ok)throw Error(r&&r.error||'本机服务没有打开 Obsidian');noteStatus('已请求打开本机 Obsidian。')}catch(e){noteStatus('打开失败：'+e.message,true)}};
 $('#scReadLinks').onclick=function(){readLinks('web')};
 $('#scReadFeishu').onclick=function(){readLinks('feishu')};
 $('#scReadVideo').onclick=function(){readLinks('video')};
 $('#scOpenAdvancedFeishu').onclick=function(){if(window.SYHub)SYHub.open(null,'connect');else noteStatus('连接检测面板尚未加载。',true)};
 $('#scGoAI').onclick=function(){if(window.SY&&SY.switchAppView)SY.switchAppView('knowledge');else noteStatus('AI 工作助手入口尚未加载。',true)};
 $('#scFiles').onchange=function(){var files=Array.from(this.files||[]);this.value='';readFiles(files)};
 $('#scChooseFiles').onclick=function(){$('#scFiles').click()};
 var drop=$('#scFileDrop');if(drop){['dragenter','dragover'].forEach(function(ev){drop.addEventListener(ev,function(e){e.preventDefault();drop.classList.add('is-dragging')})});['dragleave','dragend'].forEach(function(ev){drop.addEventListener(ev,function(e){e.preventDefault();drop.classList.remove('is-dragging')})});drop.addEventListener('drop',function(e){e.preventDefault();drop.classList.remove('is-dragging');readFiles(e.dataTransfer&&e.dataTransfer.files)})}
 $('#scClear').onclick=function(){items=[];renderResults();noteStatus('已清空本次读取结果；已关联到任务的资料不会被删除。')};
 $('#scAssociate').onclick=associate;
 $('#scAnalyze').onclick=analyze;
 $('#scGoWechat').onclick=function(){if(window.SY&&SY.switchAppView)SY.switchAppView('task-intake')};
 $('#scGoRoute').onclick=routeSelected;
 $('#scOpenAdvanced').onclick=function(){if(window.SYHub)SYHub.open(null,'connect');else noteStatus('连接检测面板尚未加载。',true)};
}
function refresh(){renderTasks();refreshHealth();refreshVaultState()}
function mount(){if(!$('#sourceCenterRoot'))return;if(owner!==account()){owner=account();items=[]}renderShell()}document.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('[data-view="sources"]'))refresh()});
document.addEventListener('sy:ready',mount);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
window.SYSourceCenter={refresh:refresh,readLinks:readLinks,renderResults:renderResults,importMaterial:importMaterial,activateSourceTab:activateSourceTab};
})();