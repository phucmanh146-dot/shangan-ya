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
 '<ol class="sc-flow"><li><b>1</b><span>选择资料来源</span></li><li><b>2</b><span>逐条读取正文</span></li><li><b>3</b><span>核对原文与状态</span></li><li><b>4</b><span>关联任务 / AI 分析</span></li></ol>'+
 '<div class="sc-loop-back"><b>↻</b><span>资料闭环：读取 → 核对 → 关联任务 → 执行 / 复盘 → 回到资料中心补充</span></div>'+
 '<div class="sc-grid">'+
 '<section class="sc-card"><h2>Obsidian 本机知识库</h2><p id="scVaultState">读取本机知识库连接状态中…</p><label for="scObsidianQuery">搜索笔记标题和正文<input id="scObsidianQuery" type="text" placeholder="例如：Agent、提示词、比赛复盘、工作流"></label><div class="sc-actions"><button class="sc-btn primary" id="scSearchObsidian" type="button">搜索本机笔记</button><button class="sc-btn" id="scConnectVault" type="button">选择 / 连接其他库</button><button class="sc-btn secondary" id="scOpenVault" type="button">打开本机 Obsidian</button></div><div id="scObsidianResults" class="sc-results-list"></div><p class="sc-mini-status">先搜索标题和正文，再逐篇读取全文。只有读取成功的笔记才能关联任务或进入航线工坊。</p></section>'+
 '<section class="sc-card"><h2>飞书 / 网页 / 视频链接</h2><p>每行粘贴一条完整分享链接。系统逐条读取正文，显示成功或失败；未读到正文的链接不会标记为已解析。</p><label for="scLinks">链接列表<textarea id="scLinks" placeholder="https://xxx.feishu.cn/wiki/…&#10;https://www.woshipm.com/…&#10;https://www.bilibili.com/video/…"></textarea></label><div class="sc-actions"><button class="sc-btn primary" id="scReadLinks" type="button">逐条读取正文</button><button class="sc-btn" id="scOpenAdvanced" type="button">连接与 API 检测</button></div></section>'+
 '<section class="sc-card"><h2>本地文档 / 图片</h2><p>支持 Word、PDF、Markdown、TXT、字幕和常见图片。单个文件最大 5 MB；图片识别失败会显示原因，不会虚报正文。</p><input id="scFiles" type="file" multiple accept=".txt,.md,.csv,.json,.srt,.vtt,.html,.htm,.pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.gif,.bmp" hidden><div class="sc-actions"><button class="sc-btn primary" id="scChooseFiles" type="button">选择文件并解析</button><button class="sc-btn" id="scClear" type="button">清空本次结果</button></div><p class="sc-mini-status">本次解析结果保存在当前页面；关联任务后会把来源信息保存到对应任务。</p></section>'+
 '<section class="sc-card"><h2>任务关联规则</h2><p>先读取并核对原文，再选择一个已有任务。只保存你勾选的资料；保留原始链接、来源类型和读取状态，不会自动改动任务排期。</p><div class="sc-actions"><button class="sc-btn secondary" id="scGoWechat" type="button">微信消息 → 收集任务</button><button class="sc-btn" id="scGoRoute" type="button">带入航线工坊</button></div><p class="sc-mini-status">AI 分析会使用已选资料；若正文未读取成功，先打开原文或调整权限后重试。</p></section>'+
 '</div>'+
 '<section class="sc-results"><div class="sc-results-head"><h2>本次读取结果</h2><span class="sc-mini-status" id="scStatus" role="status">尚未读取资料。</span></div><div class="sc-results-list" id="scResults"></div></section>'+
 '<section class="sc-associate"><h2>关联到已有任务</h2><div class="sc-associate-row"><label for="scTask">选择任务<select id="scTask"></select></label><div class="sc-actions"><button class="sc-btn primary" id="scAssociate" type="button">关联选中资料</button><button class="sc-btn secondary" id="scAnalyze" type="button">交给 AI 分析</button></div></div></section>'+
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
 if(!items.length){host.append(el('div','sc-empty','读取结果会显示在这里。每条资料都有独立状态，可单独勾选、查看原文并关联任务。'));return}
 items.forEach(function(item){
  var card=el('article','sc-result'),head=el('div','sc-result-head'),check=el('input');check.type='checkbox';check.checked=!!item.selected;check.dataset.scPick=item.id;check.setAttribute('aria-label','选择资料 '+item.title);
  var meta=el('div');meta.style.minWidth='0';meta.append(el('div','sc-result-title',item.title),el('div','sc-result-meta',(item.type||'资料')+' · '+(item.url||item.sourceRef||'本地文件')));
  var badge=el('span','sc-result-status',item.readStatus==='fulltext'?'已读取正文':item.readStatus==='failed'?'未读到正文':'待核对');badge.dataset.ok=String(item.readStatus==='fulltext');meta.append(badge);head.append(check,meta);card.append(head);
  if(item.error)card.append(el('p','sc-mini-status',item.error));
  if(item.content)card.append(el('pre','sc-result-excerpt',item.content.slice(0,1600)));
  var actions=el('div','sc-actions');
  if(item.url&&/^(https?:|obsidian:)/i.test(item.url)){var a=el('a','sc-btn','打开原文 ↗');a.href=item.url;if(!/^obsidian:/i.test(item.url)){a.target='_blank';a.rel='noopener noreferrer'}actions.append(a)}
  var pool=el('button','sc-btn','加入 AI 资料池');pool.type='button';pool.onclick=function(){if(item.readStatus!=='fulltext')return noteStatus('这条资料没有读取到正文，先重试或手动打开原文。',true);addToPool(item);noteStatus('已把《'+item.title+'》加入 AI 资料池。')};actions.append(pool);card.append(actions);host.append(card);
 });
}
function selectedItems(){var ids=Array.from(document.querySelectorAll('[data-sc-pick]:checked')).map(function(n){return n.dataset.scPick});return items.filter(function(x){return ids.indexOf(x.id)>=0})}
function upsert(item){var key=item.url||item.sourceRef||item.id,idx=items.findIndex(function(x){return (x.url||x.sourceRef||x.id)===key});if(idx>=0)items[idx]=item;else items.push(item)}
async function refreshHealth(){
 var n=$('#scApiState');if(!n)return;n.textContent='正在检测本机后端 API…';n.dataset.ok='false';
 try{var r=await window.SY.backendCall('/api/health',null,8000);if(!r||!r.ok)throw Error(r&&r.error||'后端未返回成功状态');var h=r.data||{},caps=h.capabilities||{};n.textContent='后端已连接 · '+(caps.extract?'文件解析可用':'文件解析待核验')+' · '+(caps.feishu?'飞书应用已配置':'飞书权限待核验');n.dataset.ok='true'}
 catch(e){n.textContent='后端未连接：'+e.message+'。读取失败会明确显示，不会伪装成功。';n.dataset.ok='false'}
}
async function refreshVaultState(){
 var n=$('#scVaultState');if(!n)return;
 try{
  if(window.SY&&typeof SY.backendCall==='function'){
   var r=await SY.backendCall('/api/health',null,8000),v=r&&r.ok&&r.data&&r.data.vault;
   if(v&&v.connected){n.textContent='本机已连接「'+(v.name||'Obsidian')+'」· '+(v.count==null?'可读取本机库':v.count+' 篇资料')+'；可继续搜索或导入原文。';return}
  }
 }catch(_){}
 try{var s=window.SYKnowledge&&SYKnowledge.getStatus?SYKnowledge.getStatus():null;n.textContent=s&&s.connected?'已连接「'+(s.vaultName||'Obsidian')+'」· '+s.count+' 篇已导入资料':'尚未连接本机 Obsidian；点击连接后选择「韩奕知识复盘」或已有库。'}
 catch(_){n.textContent='尚未读取到 Obsidian 连接状态。'}
}
async function searchObsidian(){
 var input=$('#scObsidianQuery'),host=$('#scObsidianResults'),query=String(input&&input.value||'').trim();
 if(!query)return noteStatus('先输入 Obsidian 搜索词。',true);
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
async function readLinks(){
 if(busy)return;var urls=window.SYSourceIO?SYSourceIO.normalizeLinks($('#scLinks')&&$('#scLinks').value||[]):[];
 if(!urls.length){noteStatus('请先粘贴至少一条完整链接。',true);return}
 busy=true;var button=$('#scReadLinks');if(button){button.disabled=true;button.textContent='逐条读取中…'}
 var ok=0,fail=0;
 try{  for(var i=0;i<urls.slice(0,12).length;i++){
   var url=urls[i];noteStatus('正在读取第 '+(i+1)+' / '+Math.min(urls.length,12)+' 条：'+url);
   var item={id:uid(),url:url,type:sourceType(url),sourceKey:sourceType(url)==='飞书'?'feishu':sourceType(url)==='视频链接'?'video':'web',title:url,sourceRef:url,content:'',readStatus:'failed',error:''};
   try{var doc=await SYSourceIO.readLink(url);item.title=titleFor(doc,url);item.content=contentFor(doc);item.sourceRef=doc.path||doc.sourceRef||url;item.readStatus=String(doc.readStatus||'fulltext');if(!item.content.trim())throw Error('接口返回成功但没有正文');item.readStatus='fulltext';ok++;addToPool(item)}
   catch(e){item.error=e.message||'读取失败';item.readStatus='failed';fail++}
   upsert(item);renderResults();
  }
  noteStatus('本批完成：已读到正文 '+ok+' 条，失败 '+fail+' 条。每条状态已单独列出；失败项可打开原文或调整权限后重试。',fail>0)
 }finally{busy=false;if(button){button.disabled=false;button.textContent='逐条读取正文'}}
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
function bind(){
 $('#scSearchObsidian').onclick=searchObsidian;
 $('#scObsidianQuery').onkeydown=function(e){if(e.key==='Enter'){e.preventDefault();searchObsidian()}};
 $('#scConnectVault').onclick=function(){if(window.SYKnowledge)SYKnowledge.open();else noteStatus('Obsidian 读取组件尚未加载。',true);setTimeout(refreshVaultState,500)};
 $('#scOpenVault').onclick=async function(){try{var r=await SY.backendCall('/api/pm/vault-open',{},10000);if(!r||!r.ok)throw Error(r&&r.error||'本机服务没有打开 Obsidian');noteStatus('已请求打开本机 Obsidian。')}catch(e){noteStatus('打开失败：'+e.message,true)}};
 $('#scReadLinks').onclick=readLinks;
 $('#scFiles').onchange=function(){var files=Array.from(this.files||[]);this.value='';readFiles(files)};
 $('#scChooseFiles').onclick=function(){$('#scFiles').click()};
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
window.SYSourceCenter={refresh:refresh,readLinks:readLinks,renderResults:renderResults,importMaterial:importMaterial};
})();