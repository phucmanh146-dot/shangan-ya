(function(){
'use strict';
if(window.SYHistoryCenter)return;
var dialog=null,active='overview',rowsForExport=[],currentTitle='历史概览';
var css='.syhc-quick-details{margin:8px 0 14px;border:1px solid #eedfe5;border-radius:12px;background:#fff}.syhc-quick-details>summary{padding:10px 12px;cursor:pointer;font-weight:700;color:#805268}.syhc-quick-details .syhc-actions{padding:0 10px 10px;margin:0}.syhc-dialog{width:min(1120px,96vw);max-width:96vw;max-height:92vh;padding:0;border:1px solid #ead9df;border-radius:20px;background:#fffafc;color:#3c3036;box-shadow:0 24px 80px #25121c40}.syhc-dialog::backdrop{background:#27151f88;backdrop-filter:blur(3px)}.syhc-head{display:flex;gap:16px;align-items:flex-start;justify-content:space-between;padding:20px 22px 14px;border-bottom:1px solid #f0e3e8}.syhc-head h2{margin:0;font-size:22px}.syhc-sub{margin:6px 0 0;color:#7b6871;font-size:13px;line-height:1.6}.syhc-close{border:0;border-radius:10px;background:#f6e8ed;padding:7px 12px;font-size:22px;cursor:pointer}.syhc-tabs{display:flex;gap:8px;overflow:auto;padding:12px 18px;border-bottom:1px solid #f0e3e8}.syhc-tabs button,.syhc-actions button{white-space:nowrap;border:1px solid #e8d5dd;border-radius:10px;padding:9px 12px;background:white;color:#6d4656;cursor:pointer;font-weight:650}.syhc-tabs button[aria-selected=true],.syhc-actions .primary{background:#f4dce5;border-color:#d8a7ba;color:#773d56}.syhc-body{padding:18px 20px 24px;overflow:auto;max-height:calc(92vh - 150px)}.syhc-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:16px}.syhc-card{background:#fff;border:1px solid #efdee5;border-radius:14px;padding:14px}.syhc-card strong{display:block;font-size:25px;color:#864f67}.syhc-card span{font-size:12px;color:#7b6871}.syhc-note{background:#fff1f5;border-radius:12px;padding:12px 14px;color:#795367;font-size:13px;line-height:1.65;margin:10px 0 16px}.syhc-actions{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 14px}.syhc-tablewrap{overflow:auto;border:1px solid #eedfe5;border-radius:12px;background:#fff}.syhc-table{border-collapse:collapse;width:100%;min-width:700px;font-size:13px}.syhc-table th,.syhc-table td{text-align:left;vertical-align:top;padding:10px 12px;border-bottom:1px solid #f2e7eb;line-height:1.5;max-width:380px;overflow-wrap:anywhere}.syhc-table th{position:sticky;top:0;background:#fbf0f4;color:#7a4a60}.syhc-empty{padding:28px;text-align:center;color:#806d76}.syhc-foot{font-size:12px;color:#887780;margin-top:12px}@media(max-width:680px){.syhc-cards{grid-template-columns:repeat(2,minmax(0,1fr))}.syhc-head{padding:15px}.syhc-body{padding:12px}.syhc-tabs{padding:10px}}';
function el(tag,cls,text){var n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n;}
function account(){return String(window.SY&&SY.currentAccountKey||'guest');}
function read(key){try{return JSON.parse(localStorage.getItem(key)||'null');}catch(_){return null;}}
function adaptive(key){return read('sy_adaptive_v1:'+account()+':'+key);}
function dateTime(v){if(!v)return '—';var d=new Date(typeof v==='number'?v:v);return Number.isNaN(d.getTime())?String(v):d.toLocaleString();}
function safe(v){if(v===null||v===undefined||v==='')return '—';return String(v);}
function currentData(){try{return window.SY&&SY.getAcctData?SY.getAcctData():{};}catch(_){return {};}}
function tasks(){var d=currentData();return Array.isArray(d.tasks)?d.tasks:[];}
function energyRows(){var d=currentData(),rows=Array.isArray(d.energyHistory)?d.energyHistory.slice():[],local=adaptive('energyHistory');if(Array.isArray(local))rows=rows.concat(local);var seen={};return rows.filter(function(r){var k=String(r.id||r.at||r.date)+'|'+String(r.score||r.energy);if(seen[k])return false;seen[k]=1;return true;}).sort(function(x,y){return Number(y.at||0)-Number(x.at||0);}).slice(0,500);}
function planRows(){var d=currentData(),rows=Array.isArray(d.planHistory)?d.planHistory.slice():[],local=adaptive('planHistory');if(Array.isArray(local))rows=rows.concat(local);var one=adaptive('plan');if(one)rows.push(one);var seen={};return rows.filter(function(r){var k=String(r.id||r.at||r.generatedAt||'')+'|'+String(r.day||r.taskCount||'');if(seen[k])return false;seen[k]=1;return true;}).sort(function(x,y){return new Date(y.at||y.generatedAt||0)-new Date(x.at||x.generatedAt||0);}).slice(0,100);}
function reviews(){var r=adaptive('reviews');return Array.isArray(r)?r:[];}
function aiRows(){var d=currentData(),r=Array.isArray(d.pmAgentHistory)?d.pmAgentHistory:[];return r.slice().sort(function(x,y){return new Date(y.at||0)-new Date(x.at||0);});}
function sources(){var d=read('shanganya_source_workflow_v1:'+account());return d&&Array.isArray(d.rows)?d.rows.slice().sort(function(x,y){return Number(y.addedAt||y.updatedAt||0)-Number(x.addedAt||x.updatedAt||0);}):[];}
function formatTask(t){return {id:safe(t.id),name:safe(t.name||t.title),category:safe(t.category),deadline:safe(t.date||t.deadline),status:(t.done||t.completedAt)?'已完成':'未完成',created:dateTime(t.createdAt||t.created),estimated:safe(t.plannedMinutes||t.estMinutes||t.plannedMinutes===0? t.plannedMinutes||t.estMinutes||0:'—'),completed:dateTime(t.completedAt)};}
function makeRows(tab){
 if(tab==='tasks')return tasks().slice().sort(function(x,y){return Number(y.completedAt||y.createdAt||0)-Number(x.completedAt||x.createdAt||0);}).map(formatTask);
 if(tab==='ai')return aiRows().map(function(r){return {time:dateTime(r.at),question:safe(r.question),reply:safe(r.reply)};});
 if(tab==='energy')return energyRows().map(function(r){return {time:dateTime(r.at||r.timestamp||r.date),date:safe(r.date),score:safe(r.score||r.energy),morning:safe(r.morning),afternoon:safe(r.afternoon),evening:safe(r.evening),source:safe(r.source||'手动签到'),task:safe(r.taskName||r.taskId)};});
 if(tab==='plans')return planRows().map(function(r){return {time:dateTime(r.at||r.generatedAt),day:safe(r.day||(r.at||'').slice(0,10)),taskCount:safe(r.taskCount),blocks:Array.isArray(r.rows)?r.rows.length:(Array.isArray(r.blocks)?r.blocks.length:'—'),waiting:Array.isArray(r.waiting)?r.waiting.join('；'):Array.isArray(r.deferred)?r.deferred.join('；'):'—'};});
 if(tab==='reviews'){var out=[];reviews().forEach(function(r){var hist=Array.isArray(r.history)?r.history:[];if(!hist.length)out.push({topic:safe(r.title),due:safe(r.due),grade:'尚无评分',history:'—',step:safe(r.step)});hist.forEach(function(h){out.push({topic:safe(r.title),due:safe(r.due),grade:safe(h.grade),history:dateTime(h.date),step:safe(r.step)});});});return out.sort(function(x,y){return String(y.history).localeCompare(String(x.history));});}
 if(tab==='sources')return sources().map(function(r){var doc=r.doc||{};return {added:dateTime(r.addedAt||r.updatedAt),name:safe(r.name||doc.title||r.url),url:safe(r.url),task:safe(r.taskName||r.taskId),status:r.readFailed?'读取失败':doc.partial?'部分读取':doc.text?'已读取正文':r.error?'有错误':'待解析',sections:safe(Array.isArray(doc.sections)?doc.sections.length:0),error:safe(r.error||doc.error)};});
 return [];
}
function headings(tab){return {tasks:[['id','任务ID'],['name','任务名称'],['category','类别'],['deadline','截止日期'],['status','状态'],['created','创建时间'],['estimated','预计分钟'],['completed','完成时间']],energy:[['time','记录时间'],['date','日期'],['score','整体精力 1–5'],['morning','上午'],['afternoon','下午'],['evening','晚上'],['source','来源'],['task','关联任务']],plans:[['time','保存时间'],['day','排程日期'],['taskCount','任务数'],['blocks','时间块数'],['waiting','未排任务/顺延']],ai:[['time','分析时间'],['question','问题/任务'],['reply','AI 回答摘要']],reviews:[['topic','知识点'],['due','下次复习'],['grade','评分 0–3'],['history','复习时间'],['step','复习阶段']],sources:[['added','记录时间'],['name','资料/链接'],['url','原始链接'],['task','关联任务'],['status','解析状态'],['sections','内容分段'],['error','错误/备注']]}[tab]||[];}
function renderTable(host,tab){
 var rows=makeRows(tab),cols=headings(tab);rowsForExport=rows;currentTitle=({tasks:'任务历史',ai:'AI分析历史',energy:'精力签到历史',plans:'排程历史',reviews:'复习记录',sources:'资料解析记录'})[tab]||'历史概览';
 var title=el('h3','',currentTitle);title.style.margin='0 0 10px';host.append(title);
 if(!rows.length){var empty=el('div','syhc-empty','这类记录目前为空。没有可追溯的数据时不会补造历史；从本版开始产生的新记录会逐步显示在这里。');host.append(empty);return;}
 var wrap=el('div','syhc-tablewrap'),table=el('table','syhc-table'),thead=el('thead'),tr=el('tr');cols.forEach(function(c){tr.append(el('th','',c[1]));});thead.append(tr);table.append(thead);var body=el('tbody');
 rows.slice(0,500).forEach(function(r){var row=el('tr');cols.forEach(function(c){row.append(el('td','',safe(r[c[0]])));});body.append(row);});table.append(body);wrap.append(table);host.append(wrap);
 var foot=el('p','syhc-foot','当前账号可见 '+rows.length+' 条记录。任务读取自原任务表；精力、排程和复习记录读取自原工作台的现有存储。');host.append(foot);
}
function openTab(tab){
 active=tab;var body=dialog.querySelector('.syhc-body');body.replaceChildren();dialog.querySelectorAll('[data-syhc-tab]').forEach(function(b){b.setAttribute('aria-selected',String(b.dataset.syhcTab===tab));});
 if(tab==='overview'){
  var d=currentData(),all=tasks(),done=all.filter(function(t){return !!(t.done||t.completedAt)}).length,er=energyRows(),pr=planRows(),rv=reviews(),sr=sources();
  var cards=el('div','syhc-cards');[[all.length,'原任务总数'],[done,'已完成任务'],[aiRows().length,'AI分析记录'],[er.length,'精力记录'],[pr.length,'排程记录']].forEach(function(x){var c=el('div','syhc-card');c.append(el('strong','',x[0]),el('span','',x[1]));cards.append(c);});body.append(cards);
  var note=el('div','syhc-note','历史数据核对：任务来自原账号任务表；资料解析记录来自现有资料工作流；精力与排程只显示已经保存的记录。旧版本没有保存过的签到不会被伪造补齐。微信原文仍通过本机授权读取入口查看，不会把云端状态冒充成本机已连接。');body.append(note);
  var actions=el('div','syhc-actions');[['tasks','查看任务历史'],['ai','查看AI分析历史'],['energy','查看精力历史'],['plans','查看排程历史'],['reviews','查看复习记录'],['sources','查看资料解析记录']].forEach(function(x){var b=el('button','',x[1]);b.onclick=function(){openTab(x[0]);};actions.append(b);});body.append(actions);
  var quickDetails=el('details','syhc-quick-details'),quickSummary=el('summary','','打开关联功能（按需展开）'),quick=el('div','syhc-actions');quickDetails.append(quickSummary);var wx=el('button','','打开微信历史读取');wx.onclick=function(){if(window.SYWechatPrivate&&SYWechatPrivate.open)SYWechatPrivate.open();else if(window.SYPMWeChatV4&&SYPMWeChatV4.focus)SYPMWeChatV4.focus();else if(window.SYPMWeChatV4&&SYPMWeChatV4.mount)SYPMWeChatV4.mount();else alert('微信历史模块尚未加载。');};quick.append(wx);var plan=el('button','','打开精力排程');plan.onclick=function(){if(window.SYAdaptive)SYAdaptive.open('plan');else alert('精力排程模块尚未加载。');};quick.append(plan);var src=el('button','','打开资料与链接解析');src.onclick=function(){if(window.SYSourceWorkflow)SYSourceWorkflow.open();else if(window.SYHub)SYHub.open();else alert('资料解析模块尚未加载。');};quick.append(src);quickDetails.append(quick);body.append(quickDetails);
  var stats=el('p','syhc-foot','AI分析记录 '+aiRows().length+' 条；复习卡片 '+rv.length+' 条；资料解析记录 '+sr.length+' 条。原任务、四象限和清单不因查看历史而改变。');body.append(stats);
 }else renderTable(body,tab);
}
function exportCSV(){
 var cols=headings(active);if(!rowsForExport.length||!cols.length){alert('当前表没有可导出的记录。');return;}
 var cell=function(v){var s=String(v==null?'':v);if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
 var csv='\ufeff'+cols.map(function(c){return cell(c[1]);}).join(',')+'\r\n'+rowsForExport.map(function(r){return cols.map(function(c){return cell(r[c[0]]);}).join(',');}).join('\r\n');
 var url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=el('a');a.href=url;a.download='上岸鸭_'+currentTitle+'_'+new Date().toISOString().slice(0,10)+'.csv';document.body.append(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1000);
}
function open(){
 if(!window.SY){alert('请先登录原工作台，再查看当前账号的历史记录。');return;}
 if(dialog){dialog.close();dialog.remove();}
 if(!document.getElementById('syhc-style')){var st=el('style');st.id='syhc-style';st.textContent=css;document.head.append(st);}
 dialog=el('dialog','syhc-dialog');var head=el('header','syhc-head'),intro=el('div');intro.append(el('h2','','历史记录与复盘'),el('p','syhc-sub','把原任务、精力签到、排程、复习和资料解析记录分开核对。'));var close=el('button','syhc-close','×');close.setAttribute('aria-label','关闭');close.onclick=function(){dialog.close();dialog.remove();dialog=null;};head.append(intro,close);dialog.append(head);
 var tabs=el('nav','syhc-tabs');[['overview','总览'],['tasks','任务历史'],['ai','AI分析历史'],['energy','精力历史'],['plans','排程历史'],['reviews','复习记录'],['sources','资料解析记录']].forEach(function(x){var b=el('button','',x[1]);b.type='button';b.dataset.syhcTab=x[0];b.onclick=function(){openTab(x[0]);};tabs.append(b);});dialog.append(tabs);
 var actions=el('div','syhc-actions');actions.style.padding='10px 20px 0';var refresh=el('button','','刷新历史');refresh.onclick=function(){openTab(active);};var exp=el('button','primary','导出当前表 CSV');exp.onclick=exportCSV;actions.append(refresh,exp);dialog.append(actions);
 var body=el('main','syhc-body');dialog.append(body);document.body.append(dialog);dialog.addEventListener('cancel',function(e){e.preventDefault();if(dialog){dialog.close();dialog.remove();dialog=null;}});dialog.showModal();openTab('overview');
}
function mount(){
 var nav=document.querySelector('#appNav');if(!nav||document.querySelector('[data-syhc-open]'))return;
 var b=el('button','app-nav-item');b.type='button';b.dataset.syhcOpen='true';b.innerHTML='<span class="app-nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V5M4 19h17"/><path d="m7 15 4-4 3 2 5-6"/></svg></span><span>历史与复盘</span>';b.addEventListener('click',function(){open();});var inbox=nav.querySelector('[data-view="inbox"]');if(inbox)nav.insertBefore(b,inbox);else nav.append(b);
}
window.SYHistoryCenter={open:open,refresh:function(){if(dialog)openTab(active);},version:'2026-10-25-history-tables-v1'};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
document.addEventListener('sy:ready',mount);
new MutationObserver(function(){if(document.querySelector('#appNav')&&!document.querySelector('[data-syhc-open]'))mount();}).observe(document.documentElement,{childList:true,subtree:true});
})();