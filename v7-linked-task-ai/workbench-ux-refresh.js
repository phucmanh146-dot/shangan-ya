/* Workbench UX: full-page planning/history, plus real per-account search records. */
(function(){
'use strict';
var $=function(s,r){return (r||document).querySelector(s);};
var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));};
var activeTab='overview',lastResultsSignature='';
function account(){return String(window.SY&&SY.currentAccountKey||'guest');}
function read(key){try{return JSON.parse(localStorage.getItem(key)||'null');}catch(_){return null;}}
function accountData(){try{return window.SY&&SY.getAcctData?SY.getAcctData()||{}:{};}catch(_){return {};}}
function adaptive(key){return read('sy_adaptive_v1:'+account()+':'+key);}
function dateTime(v){if(!v)return '—';var d=new Date(typeof v==='number'?v:v);return Number.isNaN(d.getTime())?String(v):d.toLocaleString('zh-CN',{hour12:false});}
function short(v,n){var s=String(v==null?'':v).replace(/\s+/g,' ').trim();return s.length>(n||180)?s.slice(0,(n||180))+'…':s||'—';}
function recordsKey(){return 'sy_source_search_history_v1:'+account();}
function searchRecords(){var rows=read(recordsKey());return Array.isArray(rows)?rows:[];}
function recordSearch(action,query,status,title){
 query=String(query||'').trim();if(!query)return;
 var rows=searchRecords(),now=Date.now(),existing=rows.find(function(r){return r.action===action&&r.query===query&&now-Number(r.at||0)<2500;});
 if(existing){if(status)existing.status=status;if(title)existing.title=title;existing.at=now;}
 else rows.unshift({id:'srch-'+now.toString(36)+'-'+Math.random().toString(36).slice(2,6),at:now,action:action,query:query,status:status||'已发起',title:title||''});
 try{localStorage.setItem(recordsKey(),JSON.stringify(rows.slice(0,300)));}catch(_){}
 if($('#view-history')&&!$('#view-history').hidden&&activeTab==='search')renderHistoryBody();
}
function mergeUnique(a,b,key){var seen={};return (a||[]).concat(b||[]).filter(function(x){var k=String(x&&((x.id)||(x.at)||(x.generatedAt))||'')+'|'+String(x&&x[key]||'');if(seen[k])return false;seen[k]=1;return true;});}
function rowsFor(tab){
 var d=accountData();
 if(tab==='search')return searchRecords().map(function(r){return{time:dateTime(r.at),action:r.action||'检索',query:r.query||'',title:r.title||'',status:r.status||'—'};});
 if(tab==='tasks')return (Array.isArray(d.tasks)?d.tasks:[]).slice().sort(function(a,b){return Number(b.completedAt||b.updatedAt||b.createdAt||0)-Number(a.completedAt||a.updatedAt||a.createdAt||0);}).map(function(t){return{time:dateTime(t.completedAt||t.updatedAt||t.createdAt),name:t.name||t.title||'未命名任务',category:t.category||'未分类',deadline:t.dueDate||t.date||'—',status:(t.done||t.completedAt)?'已完成':'未完成',minutes:t.plannedMinutes||t.estMinutes||'—'};});
 if(tab==='ai')return (Array.isArray(d.pmAgentHistory)?d.pmAgentHistory:[]).slice().sort(function(a,b){return Number(b.at||0)-Number(a.at||0);}).map(function(r){return{time:dateTime(r.at||r.createdAt),question:short(r.question||r.taskName||r.prompt||r.title,200),summary:short(r.reply||r.answer||r.result||r.summary,260),status:r.status||'已保存'};});
 if(tab==='energy'){
  var er=mergeUnique(Array.isArray(d.energyHistory)?d.energyHistory:[],Array.isArray(adaptive('energyHistory'))?adaptive('energyHistory'):[],'score');
  return er.slice().sort(function(a,b){return Number(b.at||0)-Number(a.at||0);}).map(function(r){return{time:dateTime(r.at||r.date),date:r.date||'—',score:r.score||r.energy||'—',source:r.source||'—',task:r.taskName||r.taskId||'—'};});
 }
 if(tab==='plans'){
  var pr=mergeUnique(Array.isArray(d.planHistory)?d.planHistory:[],Array.isArray(adaptive('planHistory'))?adaptive('planHistory'):[],'day'),one=adaptive('plan');if(one)pr=mergeUnique(pr,[one],'day');
  return pr.slice().sort(function(a,b){return Number(b.at||b.generatedAt||0)-Number(a.at||a.generatedAt||0);}).map(function(r){return{time:dateTime(r.at||r.generatedAt),day:r.day||'—',tasks:r.taskCount||r.tasks?.length||'—',blocks:r.blocks||r.rows?.length||'—',waiting:short(r.waiting||r.spilled||r.bumped||'',180)};});
 }
 if(tab==='reviews'){
  var rv=adaptive('reviews');return (Array.isArray(rv)?rv:[]).slice().sort(function(a,b){return Number(b.updatedAt||b.at||0)-Number(a.updatedAt||a.at||0);}).map(function(r){return{topic:r.topic||r.title||r.front||'—',due:r.nextReview||r.due||'—',grade:r.grade==null?'—':r.grade,step:r.step||r.stage||'—',history:short((r.history||[]).map? (r.history||[]).map(function(x){return x.date||x.at||x.grade||'';}).join('、'):r.history||'',180)};});
 }
 if(tab==='sources'){
  var sr=read('shanganya_source_workflow_v1:'+account()),items=sr&&Array.isArray(sr.rows)?sr.rows:[];
  return items.slice().sort(function(a,b){return Number(b.addedAt||b.updatedAt||0)-Number(a.addedAt||a.updatedAt||0);}).map(function(r){return{time:dateTime(r.addedAt||r.updatedAt),name:r.title||r.name||r.url||'未命名资料',url:r.url||r.sourceRef||'—',status:r.readStatus||r.status||'待核验',task:r.taskName||r.taskId||'—',note:short(r.error||r.note||'',180)};});
 }
 return [];
}
function columns(tab){return{
 search:[['time','检索时间'],['action','检索类型'],['query','关键词 / 链接'],['title','结果标题'],['status','状态']],
 tasks:[['time','最近更新时间'],['name','任务名称'],['category','类别'],['deadline','截止日期'],['status','任务状态'],['minutes','预计分钟']],
 ai:[['time','分析时间'],['question','问题 / 任务'],['summary','AI 回答摘要'],['status','记录状态']],
 energy:[['time','记录时间'],['date','日期'],['score','精力评分'],['source','记录来源'],['task','关联任务']],
 plans:[['time','排程时间'],['day','排程日期'],['tasks','任务数'],['blocks','时间块数'],['waiting','待安排 / 顺延']],
 reviews:[['topic','知识点'],['due','下次复习'],['grade','评分'],['step','复习阶段'],['history','复习记录']],
 sources:[['time','记录时间'],['name','资料名称'],['url','原始链接 / 来源'],['status','读取状态'],['task','关联任务'],['note','备注']]
}[tab]||[];}
function node(tag,cls,text){var n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n;}
function makeButton(text,fn,cls){var b=node('button',cls||'',text);b.type='button';b.addEventListener('click',fn);return b;}
function renderOverview(host){
 var d=accountData(),tasks=Array.isArray(d.tasks)?d.tasks:[],done=tasks.filter(function(t){return t.done||t.completedAt;}).length,src=rowsFor('sources'),search=searchRecords(),ai=rowsFor('ai'),energy=rowsFor('energy'),plans=rowsFor('plans');
 var cards=node('div','syhc-cards');
 [[tasks.length,'原任务总数'],[done,'已完成任务'],[ai.length,'AI 分析记录'],[src.length,'资料解析记录'],[search.length,'账号检索记录']].forEach(function(x){var c=node('div','syhc-card');c.append(node('strong','',x[0]),node('span','',x[1]));cards.append(c);});
 host.append(cards);
 host.append(node('div','syhc-note','这里汇总当前账号已经保存的任务、AI 分析、精力、排程、复习、资料与检索记录。没有被保存的数据不会补造；微信原文仍需通过本机授权读取入口核对。'));
 var shortcuts=node('div','syhc-shortcuts');
 [['planning','打开舒适排期'],['sources','打开资料中心'],['ai-p2','打开 AI 工作助手'],['task-intake','打开微信任务收集']].forEach(function(x){shortcuts.append(makeButton(x[1],function(){if(window.SY&&SY.switchAppView)SY.switchAppView(x[0]);},''));});
 host.append(shortcuts);
 host.append(node('p','syhc-foot','当前可追溯：'+tasks.length+' 项任务 · '+ai.length+' 条 AI 记录 · '+energy.length+' 条精力记录 · '+plans.length+' 条排程记录。'));
}
function renderHistoryBody(){
 var root=$('#historyPageRoot');if(!root)return;var body=$('.syhc-body',root);if(!body)return;body.replaceChildren();
 if(activeTab==='overview'){renderOverview(body);return;}
 var rows=rowsFor(activeTab),cols=columns(activeTab),q=String($('.syhc-search',root)?.value||'').trim().toLowerCase();
 if(q)rows=rows.filter(function(r){return Object.keys(r).some(function(k){return String(r[k]||'').toLowerCase().indexOf(q)>=0;});});
 window.__SYUXHistoryExport={tab:activeTab,rows:rows,columns:cols};
 if(!rows.length){body.append(node('div','syhc-empty',q?'没有匹配这组关键词的记录。':'这类记录目前为空。保存新的检索、任务或复盘后，会从这里逐步积累；不会虚构历史数据。'));return;}
 var wrap=node('div','syhc-tablewrap'),table=node('table','syhc-table'),thead=node('thead'),tr=node('tr');
 cols.forEach(function(c){tr.append(node('th','',c[1]));});thead.append(tr);table.append(thead);
 var tbody=node('tbody');
 rows.forEach(function(r){var row=node('tr');cols.forEach(function(c){var cell=node('td','',r[c[0]]==null?'—':r[c[0]]);if(c[0]==='url'&&/^https?:\/\//i.test(String(r[c[0]]||''))){cell.replaceChildren();var a=node('a','',r[c[0]]);a.href=r[c[0]];a.target='_blank';a.rel='noopener noreferrer';cell.append(a);}row.append(cell);});tbody.append(row);});
 table.append(tbody);wrap.append(table);body.append(wrap);body.append(node('p','syhc-foot','当前筛选 '+rows.length+' 条。数据来自当前账号可访问的本地存储与资料工作流。'));
}
function renderHistoryPage(){
 var root=$('#historyPageRoot');if(!root)return;
 root.replaceChildren();var page=node('div','syhc-page');
 var head=node('header','syhc-head'),intro=node('div');intro.append(node('p','sc-eyebrow','HISTORY · SEARCH · REVIEW'),node('h2','','历史与复盘'),node('p','syhc-sub','按账号查看真实检索、任务执行、AI 分析、精力排程和资料读取记录。可以筛选、追溯和导出，不会补造旧记录。'));head.append(intro);page.append(head);
 var tabs=node('nav','syhc-tabs');[['overview','总览'],['search','账号检索历史'],['tasks','任务历史'],['ai','AI 分析历史'],['energy','精力记录'],['plans','排程记录'],['reviews','复习记录'],['sources','资料解析']].forEach(function(t){var b=makeButton(t[1],function(){activeTab=t[0];tabs.querySelectorAll('button').forEach(function(x){x.setAttribute('aria-selected',String(x.dataset.tab===activeTab));});renderHistoryBody();});b.dataset.tab=t[0];b.setAttribute('aria-selected',String(activeTab===t[0]));tabs.append(b);});page.append(tabs);
 var toolbar=node('div','syhc-toolbar'),search=node('input','syhc-search');search.type='search';search.placeholder='搜索关键词、任务名、链接或状态…';search.setAttribute('aria-label','筛选历史记录');search.addEventListener('input',renderHistoryBody);toolbar.append(search,makeButton('刷新记录',function(){renderHistoryPage();},''),makeButton('导出当前表 CSV',exportHistory,''));page.append(toolbar);
 var body=node('main','syhc-body');page.append(body);root.append(page);renderHistoryBody();
}
function exportHistory(){
 var state=window.__SYUXHistoryExport||{},cols=state.columns||[],rows=state.rows||[];
 if(!rows.length||!cols.length){if(activeTab==='overview')return;alert('当前筛选没有可导出的记录。');return;}
 var cell=function(v){var s=String(v==null?'':v);if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
 var csv='\ufeff'+cols.map(function(c){return cell(c[1]);}).join(',')+'\r\n'+rows.map(function(r){return cols.map(function(c){return cell(r[c[0]]);}).join(',');}).join('\r\n');
 var url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=node('a');a.href=url;a.download='上岸鸭_历史与复盘_'+activeTab+'_'+new Date().toISOString().slice(0,10)+'.csv';document.body.append(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1000);
}
function showHistoryPage(){activeTab='overview';renderHistoryPage();}
function syncRenderedResults(){
 var host=$('#scResults');if(!host)return;var cards=$$('.sc-result',host),signature=cards.map(function(card){return [$('.sc-result-title',card)?.textContent,$('.sc-result-meta',card)?.textContent,$('.sc-result-status',card)?.textContent].join('|');}).join('||');
 if(!signature||signature===lastResultsSignature)return;lastResultsSignature=signature;
 cards.forEach(function(card){var title=$('.sc-result-title',card)?.textContent||'',meta=$('.sc-result-meta',card)?.textContent||'',badge=$('.sc-result-status',card)?.textContent||'待核对',parts=meta.split(' · '),query=parts.slice(1).join(' · ')||meta;
  var rows=searchRecords(),found=rows.find(function(r){return r.query===query||r.query===meta||r.title===title;});
  if(found){found.title=title;found.status=badge;found.at=Date.now();try{localStorage.setItem(recordsKey(),JSON.stringify(rows));}catch(_){}}
  else recordSearch('资料读取结果',query,badge,title);
 });
}
function observeSourceCenter(){
 var root=$('#sourceCenterRoot');if(!root||root.dataset.uxSearchObserver==='true')return;root.dataset.uxSearchObserver='true';
 var attach=function(){
  var results=$('#scResults');
  if(results&&results.dataset.uxObserved!=='true'){results.dataset.uxObserved='true';var ob=new MutationObserver(syncRenderedResults);ob.observe(results,{childList:true,subtree:true,characterData:true});}
  var notes=$('#scObsidianResults');
  if(notes&&notes.dataset.uxObserved!=='true'){notes.dataset.uxObserved='true';var no=new MutationObserver(function(){var q=String($('#scObsidianQuery')?.value||'').trim();if(!q)return;var rows=searchRecords(),rec=rows.find(function(r){return r.action==='Obsidian 检索'&&r.query===q;});if(rec){rec.status='检索列表已更新，请核对匹配结果';rec.title=short(notes.textContent,180);rec.at=Date.now();try{localStorage.setItem(recordsKey(),JSON.stringify(rows));}catch(_){}if($('#view-history')&&!$('#view-history').hidden&&activeTab==='search')renderHistoryBody();}});no.observe(notes,{childList:true,subtree:true,characterData:true});}
 };
 var ob=new MutationObserver(attach);ob.observe(root,{childList:true,subtree:true});attach();
}
function bindSearchLogging(){
 document.addEventListener('click',function(e){var b=e.target&&e.target.closest?e.target.closest('#scReadLinks,#scSearchObsidian'):null;if(!b)return;
  if(b.id==='scReadLinks'){var urls=String($('#scLinks')?.value||'').split(/\r?\n/).map(function(x){return x.trim();}).filter(Boolean);if(!urls.length)return;urls.forEach(function(u){recordSearch('链接读取',u,'读取中');});}
  else if(b.id==='scSearchObsidian'){var q=String($('#scObsidianQuery')?.value||'').trim();if(q)recordSearch('Obsidian 检索',q,'搜索已发起');}
 });
 document.addEventListener('sy:ready',observeSourceCenter);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observeSourceCenter);else observeSourceCenter();
}
window.SYWorkbenchUX={showHistoryPage:showHistoryPage,refreshHistory:renderHistoryPage,recordSearch:recordSearch,version:'2026-10-25-ux-v1'};
bindSearchLogging();
})();