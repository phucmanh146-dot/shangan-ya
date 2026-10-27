/* Comfort Planner Flow: task-grounded cognitive-load scheduling and real local-note retrieval. */
(function(){
'use strict';
if(window.SYComfortFlow)return;
var dialog=null,step=0,chosen=[],lastNotes=[],stateFeedback=null,observer=null;
var $=function(s,r){return (r||document).querySelector(s)};
var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
var account=function(){try{return window.SY&&SY.getAcctData?SY.getAcctData():null}catch(e){return null}};
var save=function(a){try{if(window.SY&&SY.saveAcctData)SY.saveAcctData(a);return true}catch(e){return false}};
var today=function(){try{return SY.todayKey?SY.todayKey():new Date().toISOString().slice(0,10)}catch(e){return new Date().toISOString().slice(0,10)}};
var tasks=function(){var a=account();return (a&&Array.isArray(a.tasks)?a.tasks:[]).filter(function(t){return t&&!t.done&&!t.completedAt&&!t.deleted})};
var pending=function(){return tasks().filter(function(t){return !t.date||String(t.date).slice(0,10)<=today()})};
var taskId=function(t){return String(t.id||t.taskId||t.name||'')};
var taskName=function(t){return String(t.name||t.title||t.text||'未命名任务')};
var minutes=function(t){var n=Number(t.plannedMinutes||t.estMinutes||t.estimatedMinutes||t.durationMinutes||t.minutes||0);return Math.max(10,Math.min(240,n||30))};
var isDeep=function(t){var s=[taskName(t),t.category,t.type,t.kind,t.weight].join(' ').toLowerCase();return /agent|编程|开发|代码|学习|研究|需求分析|产品设计|写作|论文|建模|复盘|阅读|理解|算法|debug|调试|深度|heavy|主要|重点/.test(s)};
var isLight=function(t){return /整理|归档|回复|确认|预约|上传|提交|收集|简单|轻量|清单|分类/.test([taskName(t),t.category,t.type,t.kind].join(' '))};
var priority=function(t){var s=String(t.priority||t.urgency||t.weight||t.level||'').toLowerCase(),n=Number(t.priorityScore||t.priorityValue||0);if(n)return n;if(/urgent|high|高|紧急|重要|heavy|主要/.test(s))return 3;if(/low|低|轻量|minor/.test(s))return 1;return 2};
function startMs(o){if(!o)return 0;var v=o.startedAt||o.runningSince||o.startAt||o.startedAtMs||o.startTime||o.started_at||0;if(typeof v==='string'&&!/^\d{10,13}$/.test(v)){var p=Date.parse(v);return Number.isFinite(p)?p:0}var n=Number(v);if(n>0&&n<1e11)n*=1000;return n>0&&n<=Date.now()?n:0}
function brain(){
 var a=account()||{},p=a.plannerSettings||{},ci=p.lastCognitiveCheckin||{},now=Date.now(),age=now-Number(ci.at||0),active=p.activeSession||a.activeTimer||a.smartPlanner&&a.smartPlanner.active||{},elapsed=startMs(active)?Math.floor((now-startMs(active))/60000):0,st=p.stuckState||a.stuckState||null,stuck=st?Math.max(0,Math.floor((now-Number(st.startedAt||st.at||now))/60000)):0,logs=(a.fatigueLog||[]).filter(function(x){return now-Number(x.at||0)<2*3600000}),score=Number(ci.score||p.currentEnergyScore||0),why='',confidence='低';
 if(age>=0&&age<150*60000&&score>=1&&score<=5){confidence='中';why='最近一次状态反馈';if(elapsed>=90)score=Math.max(1,score-2);else if(elapsed>=60)score=Math.max(1,score-1);return pack(score,why,confidence,elapsed,stuck)}
 if(logs.length){var last=logs[logs.length-1];score=Number(last.score)||2;why='近两小时疲惫反馈';confidence='中';return pack(Math.min(score,2),why,confidence,elapsed,stuck)}
 if(stuck>=12)return pack(2,'连续卡壳约 '+stuck+' 分钟','中',elapsed,stuck);
 if(elapsed>=90)return pack(2,'连续用脑约 '+elapsed+' 分钟，建议恢复','中',elapsed,stuck);
 if(elapsed>=60)return pack(3,'连续用脑约 '+elapsed+' 分钟，建议短休或换任务','中',elapsed,stuck);
 var hist=(a.energyHistory||[]).filter(function(x){return Number(x.score)>=1&&Number(x.score)<=5&&now-Number(x.at||0)<3*3600000}).slice(-1)[0];
 if(hist)return pack(Number(hist.score),'参考最近精力记录，当前状态可能已变化','低',elapsed,stuck);
 return pack(3,'缺少近期反馈或连续用脑记录，暂按保守负荷估算','低',elapsed,stuck);
}
function pack(score,why,confidence,elapsed,stuck){score=Math.max(1,Math.min(5,Math.round(score||3)));return{score:score,label:score<=1?'可能已明显透支':score===2?'认知负荷偏高':score===3?'中等负荷，先短段推进':score===4?'适合安排深度任务':'当前反馈较清醒',why:why,confidence:confidence,elapsed:elapsed||0,stuck:stuck||0}}
function recordFeedback(score){
 var a=account();if(!a)return false;var now=Date.now(),id=String((a.activeTimer||{}).taskId||a.priorityFocusTaskId||'');
 a.plannerSettings=a.plannerSettings||{};a.plannerSettings.lastCognitiveCheckin={score:score,at:now,source:'舒适排期快速反馈',taskId:id};
 a.plannerSettings.currentEnergyScore=score;a.plannerSettings.currentEnergyLevel=score<=2?'low':score>=4?'high':'medium';a.plannerSettings.energyLevelUpdatedAt=now;
 a.energyHistory=Array.isArray(a.energyHistory)?a.energyHistory:[];a.energyHistory.push({id:'comfort-'+now,date:today(),at:now,hour:new Date(now).getHours(),score:score,source:'舒适排期快速反馈',taskId:id});if(a.energyHistory.length>500)a.energyHistory=a.energyHistory.slice(-500);
 if(score<=2){a.fatigueLog=Array.isArray(a.fatigueLog)?a.fatigueLog:[];a.fatigueLog.push({at:now,score:score,taskId:id,category:'认知负荷反馈',reason:score===1?'脑袋被抽干': '读不进去/认知负荷偏高'});if(a.fatigueLog.length>200)a.fatigueLog=a.fatigueLog.slice(-200)}
 save(a);stateFeedback=score;return true;
}
function localTime(n){n=Math.max(0,Math.min(1439,n));return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')}
function parseTime(s){var p=String(s||'').split(':');return Math.max(0,Math.min(1439,(Number(p[0])||0)*60+(Number(p[1])||0)))}
function nowRounded(){var d=new Date();return Math.ceil((d.getHours()*60+d.getMinutes())/5)*5}
function reserveDefaults(b){return{buffer:b.score<=2?40:30,leisure:25,recovery:b.score<=1?20:b.score===2?15:10,fixed:0}}
function recentHistory(t){
 var a=account()||{},id=taskId(t),arr=[];
 ['taskHistory','completedTaskHistory','taskRecords','completionHistory'].forEach(function(k){(Array.isArray(a[k])?a[k]:[]).forEach(function(x){if(String(x.taskId||x.id||x.name||'')===id){var n=Number(x.actualMinutes||x.durationMinutes||x.elapsedMinutes||x.actualDuration||0);if(n>0&&n<600)arr.push(n)}})});
 return arr;
}
function estimate(t,b){
 var hist=recentHistory(t),base=hist.length?hist.reduce(function(x,y){return x+y},0)/hist.length:minutes(t),complex=isDeep(t),factor=complex?(b.score<=2?1.35:1.2):1;
 return {minutes:Math.round(Math.max(5,Math.min(180,base*factor))),basis:hist.length?'按 '+hist.length+' 条历史完成记录校准':(t.plannedMinutes||t.estMinutes||t.estimatedMinutes?'参考任务原估时，再按复杂度调整':'缺少历史耗时，使用保守初始估时'),complex:complex,samples:hist.length};
}
function getPrefs(){var a=account()||{},p=a.plannerSettings||{},w=a.wellbeingPlan||{},start=nowRounded(),end=21*60;if(start>=20*60)end=23*60+30;if(end-start<60)end=Math.min(1439,start+180);var d=reserveDefaults(brain());return{start:localTime(start),end:localTime(end),buffer:d.buffer,leisure:d.leisure,recovery:d.recovery,fixed:Math.max(0,Number(w.meet||p.fixedMinutes||0)),breakEvery:45}}
function selectedTasks(){var all=pending();return all.filter(function(t){return chosen.indexOf(taskId(t))>=0})}
function chooseDefaults(){var all=pending().slice().sort(function(a,b){return priority(b)-priority(a)}),active=String(((account()||{}).activeTimer||{}).taskId||'');chosen=all.filter(function(t){return taskId(t)===active}).map(taskId);if(!chosen.length)chosen=all.slice(0,Math.min(3,all.length)).map(taskId)}
function mountLauncher(){
 var details=$('#sy-energy-daily-details');if(!details||details.dataset.comfortMounted==='1')return;
 details.dataset.comfortMounted='1';details.open=false;details.style.display='none';
 var old=$('[data-comfort-entry]');if(old)return;
 var card=document.createElement('section');card.className='cp-home-entry';card.dataset.comfortEntry='1';
 card.innerHTML='<div class="cp-entry-icon" aria-hidden="true">◷</div><div class="cp-entry-copy"><span class="cp-kicker">COGNITIVE LOAD · ADAPTIVE PLAN</span><h2>舒适排期</h2><p>系统先评估任务负荷与已有记录，再生成带休息和缓冲的今日安排。</p><div class="cp-entry-status" data-cp-home-status></div></div><button type="button" class="cp-primary" data-cp-open>开始规划 <span aria-hidden="true">→</span></button>';
 details.parentNode.insertBefore(card,details);
 card.querySelector('[data-cp-open]').addEventListener('click',function(){open(0)});
 updateLauncher();
}
function updateLauncher(){var host=$('[data-cp-home-status]');if(!host)return;var b=brain(),a=account()||{},n=pending().length;host.textContent='系统估计：'+b.label+' · 待处理任务 '+n+' 项 · '+(a.energyHistory||[]).length+' 条精力记录';}
function open(initial){
 if(dialog){dialog.remove();dialog=null}
 step=typeof initial==='number'?initial:0;if(!chosen.length)chooseDefaults();
 dialog=document.createElement('dialog');dialog.className='cp-dialog';dialog.setAttribute('aria-labelledby','cpTitle');
 dialog.innerHTML='<header class="cp-dialog-head"><div><div class="cp-kicker">SHANGANYA · PERSONAL ENERGY</div><h2 id="cpTitle">舒适排期工作台</h2><p>先看状态，再挑真实任务，最后生成有缓冲的日程。</p></div><button type="button" class="cp-close" aria-label="关闭">×</button></header><nav class="cp-steps" aria-label="排期步骤">'+[['状态','状态'],['任务','任务'],['时间','时间'],['预览','预览'],['个人规律','规律']].map(function(x,i){return '<button type="button" data-cp-goto="'+i+'"><span>'+(i+1)+'</span>'+x[0]+'</button>'}).join('')+'</nav><main class="cp-body" id="cpBody"></main><footer class="cp-footer"><span class="cp-save-status" role="status" aria-live="polite"></span><div><button type="button" class="cp-secondary" data-cp-back>上一步</button><button type="button" class="cp-primary" data-cp-next>下一步 →</button></div></footer>';
 document.body.append(dialog);dialog.showModal();
 dialog.querySelector('.cp-close').onclick=close;dialog.addEventListener('cancel',function(e){e.preventDefault();close()});
 dialog.querySelectorAll('[data-cp-goto]').forEach(function(b){b.onclick=function(){render(Number(b.dataset.cpGoto))}});
 dialog.querySelector('[data-cp-back]').onclick=function(){render(Math.max(0,step-1))};
 dialog.querySelector('[data-cp-next]').onclick=function(){if(step===0){render(1)}else if(step===1){render(2)}else if(step===2){render(3)}else if(step===3){saveDraft()}else render(0)};
 render(step);
}
function close(){if(dialog){dialog.close();dialog.remove();dialog=null}}
function footer(msg){var n=dialog&&dialog.querySelector('.cp-save-status');if(n)n.textContent=msg||''}
function render(n){
 if(!dialog)return;step=Math.max(0,Math.min(4,n));dialog.querySelectorAll('[data-cp-goto]').forEach(function(b){b.setAttribute('aria-current',Number(b.dataset.cpGoto)===step?'step':'false')});
 dialog.querySelector('[data-cp-back]').style.visibility=step===0?'hidden':'visible';
 dialog.querySelector('[data-cp-next]').textContent=step===3?'保存排期草案':step===4?'返回状态':step===2?'生成排期预览':'下一步 →';
 var body=$('#cpBody',dialog),b=brain(),a=account()||{},prefs=getPrefs();
 if(step===0){body.innerHTML='<section class="cp-panel"><span class="cp-eyebrow">STEP 01 · CHECK IN</span><h3>脑袋现在转得动吗？</h3><p class="cp-lead">不用预测全天精力。系统先读取已有计时、卡壳和反馈记录；你只在感觉变化时点一下。</p><div class="cp-state-grid">'+[[5,'清醒，能学新东西','适合尝试一段深度任务'],[3,'有点慢，先做短段','缩短工作段，减少任务切换'],[2,'读不进去，先降负荷','暂停高难度任务，先恢复或做轻任务'],[1,'脑袋被抽干了，先休息','先停止深度任务，保留恢复时间']].map(function(x){return '<button type="button" class="cp-state-option '+(Number((a.plannerSettings||{}).lastCognitiveCheckin?.score)===x[0]?'is-selected':'')+'" data-cp-feedback="'+x[0]+'"><strong>'+x[1]+'</strong><span>'+x[2]+'</span></button>'}).join('')+'</div></section><section class="cp-panel cp-estimate"><div class="cp-estimate-title"><span class="cp-dot '+(b.score<=2?'low':b.score>=4?'high':'mid')+'"></span><div><h3>系统估计：'+esc(b.label)+'</h3><p>'+esc(b.why)+'</p></div><span class="cp-confidence">'+esc(b.confidence)+'置信度</span></div><p class="cp-note">参考：'+(b.elapsed?'连续计时 '+b.elapsed+' 分钟；':'')+(b.stuck?'卡壳约 '+b.stuck+' 分钟；':'')+'不使用摄像头、不做脑波检测或医疗判断。缺少数据时会保守估计。</p></section><section class="cp-panel"><h3>当前估算会影响什么？</h3><div class="cp-three"><div><b>'+(b.score<=1?'恢复优先':b.score===2?'低负荷':b.score===3?'短段推进':'深度任务')+'</b><span>任务强度</span></div><div><b>'+((b.score<=2)?'40 分钟':'30 分钟')+'</b><span>默认缓冲</span></div><div><b>'+((b.score<=2)?'15–20 分钟':'5–10 分钟')+'</b><span>恢复安排</span></div></div></section>';
 body.querySelectorAll('[data-cp-feedback]').forEach(function(btn){btn.onclick=function(){var score=Number(btn.dataset.cpFeedback);if(recordFeedback(score)){body.querySelectorAll('[data-cp-feedback]').forEach(function(x){x.classList.toggle('is-selected',x===btn)});render(0);footer('已记录本次状态；后续排期将按新反馈重新估算。')}else footer('未能保存反馈，请先登录工作台。')}});
 }else if(step===1){
 var all=pending();if(!chosen.length)chooseDefaults();
 body.innerHTML='<section class="cp-panel"><span class="cp-eyebrow">STEP 02 · REAL TASKS</span><h3>今天真正要推进哪些任务？</h3><p class="cp-lead">只从你原有清单里选择，不生成虚构任务，不改变原任务完成状态。默认优先当前任务和高优先级任务，可自行调整。</p><div class="cp-task-list">'+(all.length?all.map(function(t){var id=taskId(t),est=estimate(t,b);return '<label class="cp-task-row"><input type="checkbox" data-cp-task="'+esc(id)+'" '+(chosen.indexOf(id)>=0?'checked':'')+'><span class="cp-task-info"><strong>'+esc(taskName(t))+'</strong><small>'+esc(t.category||t.type||'未分类')+' · '+(isDeep(t)?'高认知负荷':'一般/轻量')+' · 优先级 '+priority(t)+'</small><small>'+est.minutes+' 分钟初估 · '+esc(est.basis)+'</small></span></label>'}).join(''):'<div class="cp-empty">今天没有识别到待办任务。请先回到「每日清单」添加真实任务，再回来排期。</div>')+'</div><div class="cp-inline-actions"><button type="button" class="cp-secondary" data-cp-view-tasks>打开每日清单</button><button type="button" class="cp-secondary" data-cp-source>去资料中心检索</button></div></section>';
 body.querySelectorAll('[data-cp-task]').forEach(function(input){input.onchange=function(){var id=input.dataset.cpTask;if(input.checked){if(chosen.indexOf(id)<0)chosen.push(id)}else chosen=chosen.filter(function(x){return x!==id})}});
 var vt=body.querySelector('[data-cp-view-tasks]');if(vt)vt.onclick=function(){close();if(window.SY&&SY.switchAppView)SY.switchAppView('daily')};
 var vs=body.querySelector('[data-cp-source]');if(vs)vs.onclick=function(){close();if(window.SY&&SY.switchAppView)SY.switchAppView('sources')};
 }else if(step===2){
 body.innerHTML='<section class="cp-panel"><span class="cp-eyebrow">STEP 03 · AVAILABLE TIME</span><h3>给今天的任务留出真实时间</h3><p class="cp-lead">你不需要估计精力；只需确认可安排的时间窗口。系统会自动预留缓冲、休息和娱乐，不会挤占固定事项。</p><div class="cp-fields"><label>开始安排时间<input type="time" id="cpStart" value="'+prefs.start+'"></label><label>今天最晚结束<input type="time" id="cpEnd" value="'+prefs.end+'"></label><label>固定事项占用（分钟）<input type="number" min="0" max="720" step="5" id="cpFixed" value="'+prefs.fixed+'"></label><label>弹性缓冲（分钟）<input type="number" min="15" max="180" step="5" id="cpBuffer" value="'+prefs.buffer+'"></label><label>放空 / 娱乐（分钟）<input type="number" min="0" max="240" step="5" id="cpLeisure" value="'+prefs.leisure+'"></label><label>短休间隔（分钟）<select id="cpBreak"><option value="25">每 25 分钟</option><option value="35">每 35 分钟</option><option value="45" selected>每 45 分钟</option><option value="50">每 50 分钟</option></select></label></div><div class="cp-note-box">自动规则：疲惫时先恢复、减少高负荷任务；状态较好时再安排深度任务。缓冲不是待办，娱乐不是偷懒。可按现实情况修改时间窗口。</div></section>';
 }else if(step===3){body.innerHTML=buildPreview(b)}
 else {body.innerHTML=buildPatterns(a)}
 footer('');
}
function buildPreview(b){
 var start=parseTime($('#cpStart',dialog)?.value||getPrefs().start),end=parseTime($('#cpEnd',dialog)?.value||getPrefs().end),fixed=Math.max(0,Number($('#cpFixed',dialog)?.value||0)),buffer=Math.max(15,Number($('#cpBuffer',dialog)?.value||30)),leisure=Math.max(0,Number($('#cpLeisure',dialog)?.value||25)),breakEvery=Number($('#cpBreak',dialog)?.value||45);
 if(end<=start)end+=24*60;
 var available=end-start,rest=b.score<=1?20:b.score===2?15:8,chosenList=selectedTasks(),remaining=Math.max(0,available-fixed-buffer-leisure),cursor=start,blocks=[],deepLimit=b.score<=1?0:b.score===2?10:b.score===3?25:breakEvery;
 function add(title,duration,kind,reason){duration=Math.max(0,Math.round(duration));if(!duration)return;if(cursor+duration>end)return;blocks.push({start:cursor,end:cursor+duration,title:title,minutes:duration,kind:kind,reason:reason||''});cursor+=duration}
 if(b.score<=2){add('恢复时间：离开屏幕、喝水、走动或安静休息',Math.min(rest,remaining),'rest','先恢复，不强迫继续输入新信息');remaining-=blocks.length?blocks[blocks.length-1].minutes:0}
 var ranked=chosenList.slice().sort(function(a,c){return priority(c)-priority(a)}),deferred=[];
 ranked.forEach(function(t){
  var est=estimate(t,b),deep=est.complex;
  if(b.score<=1&&deep){deferred.push({task:t,reason:'当前反馈为明显透支，暂不安排深度任务'});return}
  if(b.score===2&&deep){deferred.push({task:t,reason:'当前认知负荷偏高，先恢复后再决定是否继续'});return}
  var dur=est.minutes;
  if(remaining<=0){deferred.push({task:t,reason:'可用时间已留给固定事项、休息与缓冲'});return}
  if(deep)dur=Math.min(dur,deepLimit,remaining);else dur=Math.min(dur,b.score<=2?20:35,remaining);
  if(dur<5){deferred.push({task:t,reason:'剩余时间不足以推进有效步骤'});return}
  add(taskName(t),dur,deep?'focus':'light',est.basis);remaining-=dur;
  if(remaining>=5&&cursor+5<=end&&ranked.indexOf(t)!==ranked.length-1){add('短休：离开当前任务、喝水或走动',Math.min(b.score<=2?10:5,remaining),'break','降低连续用脑与任务切换成本');remaining-=blocks[blocks.length-1].minutes}
  if(est.minutes>dur)deferred.push({task:t,reason:'本轮先推进 '+dur+' 分钟；剩余 '+(est.minutes-dur)+' 分钟留待下轮或重排'});
 });
 if(leisure>0&&cursor+leisure<=end){add('放空 / 娱乐 / 看剧（受保护时间）',leisure,'leisure','不自动挤占这段时间')}
 var endBuffer=Math.min(buffer,Math.max(0,end-cursor));if(endBuffer>0){add('弹性缓冲（卡壳、临时事务、超时）',endBuffer,'buffer','未发生突发情况时也不强制塞入任务')}
 var unused=Math.max(0,end-cursor),scheduled=blocks.reduce(function(n,x){return n+x.minutes},0);
 window.__SYComfortDraft={date:today(),createdAt:Date.now(),state:b,tasks:chosenList.map(function(t){return{id:taskId(t),title:taskName(t)}}),window:{start:localTime(start%1440),end:localTime(end%1440)},fixedMinutes:fixed,bufferMinutes:buffer,leisureMinutes:leisure,blocks:blocks,deferred:deferred,unusedMinutes:unused,scheduledMinutes:scheduled,confidence:b.confidence};
 return '<section class="cp-panel"><span class="cp-eyebrow">STEP 04 · ADAPTIVE TIMELINE</span><h3>今日排期预览</h3><p class="cp-lead">按 '+esc(b.label)+'、真实待办与可用时间生成。深度任务 '+(b.score<=2?'已暂停或延后':'优先放入短工作段')+'；未安排的任务会列出原因。</p><div class="cp-plan-summary"><div><strong>'+scheduled+'</strong><span>已排分钟</span></div><div><strong>'+buffer+'</strong><span>缓冲分钟</span></div><div><strong>'+deferred.length+'</strong><span>延后/待续任务</span></div></div><div class="cp-timeline">'+(blocks.length?blocks.map(function(x){return '<article class="cp-time-row kind-'+x.kind+'"><time>'+localTime(x.start%1440)+'–'+localTime(x.end%1440)+'</time><div><strong>'+esc(x.title)+'</strong><p>'+x.minutes+' 分钟'+(x.reason?' · '+esc(x.reason):'')+'</p></div><span>'+({focus:'专注',light:'轻任务',rest:'恢复',break:'短休',leisure:'放空',buffer:'缓冲'}[x.kind]||'安排')+'</span></article>'}).join(''):'<div class="cp-empty">当前时间窗口不足，或没有选择任务。请返回调整。</div>')+'</div>'+(deferred.length?'<div class="cp-deferred"><h4>暂缓安排，不代表放弃</h4>'+deferred.map(function(x){return '<p><strong>'+esc(taskName(x.task))+'</strong>：'+esc(x.reason)+'</p>'}).join('')+'</div>':'')+'<p class="cp-note">固定事项占用 '+fixed+' 分钟；缓冲与放空不会被任务自动占用。排期是建议草案，需你确认后保存，不会自动把任务标记完成。</p></section>';
}
function saveDraft(){
 var d=window.__SYComfortDraft;if(!d){render(3);footer('请先生成预览。');return}
 var a=account();if(!a){footer('无法读取当前账号数据，请先登录。');return}
 a.plannerSettings=a.plannerSettings||{};a.plannerSettings.comfortSchedule=d;a.plannerSettings.comfortScheduleSavedAt=Date.now();
 a.wellbeingPlan=a.wellbeingPlan||{};a.wellbeingPlan.buffer=d.bufferMinutes;a.wellbeingPlan.daydream=Math.max(0,Math.round(d.leisureMinutes*.45));a.wellbeingPlan.tv=Math.max(0,d.leisureMinutes-a.wellbeingPlan.daydream);
 save(a);footer('已保存今日排期草案。原任务状态与截止日期未改动。');var n=$('#cpBody',dialog);if(n){var banner=document.createElement('div');banner.className='cp-success';banner.textContent='已保存今日排期草案。可随时重新估算；原任务仍在每日清单中。';n.prepend(banner)}var next=dialog.querySelector('[data-cp-next]');if(next)next.textContent='返回状态';}
function buildPatterns(a){
 var hist=Array.isArray(a.energyHistory)?a.energyHistory:[],bins=[['凌晨',0,5],['上午',6,11],['下午',12,17],['晚上',18,23]],groups=bins.map(function(g){var arr=hist.filter(function(x){var h=Number(x.hour);return h>=g[1]&&h<=g[2]&&Number(x.score)>=1&&Number(x.score)<=5});return{name:g[0],n:arr.length,avg:arr.length?arr.reduce(function(n,x){return n+Number(x.score)},0)/arr.length:0}});
 var taskHist=[];['taskHistory','completedTaskHistory','taskRecords','completionHistory'].forEach(function(k){if(Array.isArray(a[k]))taskHist=taskHist.concat(a[k])});
 return '<section class="cp-panel"><span class="cp-eyebrow">PERSONAL PATTERNS · EVIDENCE FIRST</span><h3>你的个人规律</h3><p class="cp-lead">这三个分析只用已保存的记录。样本不足时不画趋势，不把某个时段武断称为黄金时段。</p><div class="cp-pattern-card"><h4>1. 我的精力时段 · 按签到统计</h4>'+(hist.length>=2?groups.map(function(g){return '<div class="cp-bar-row"><span>'+g.name+'</span><div class="cp-bar"><i style="width:'+(g.n?g.avg/5*100:0)+'%"></i></div><b>'+(g.n?g.avg.toFixed(1)+'/5':'暂无')+'</b><small>'+g.n+' 次</small></div>'}).join(''):'<p class="cp-muted">目前有 '+hist.length+' 次精力记录。至少记录 2 次后显示个人变化；按时间段积累更多记录后再比较。</p>')+'</div><div class="cp-pattern-card"><h4>2. 任务学习曲线 · 同类任务真实耗时</h4><p>'+(taskHist.length>=2?'找到 '+taskHist.length+' 条任务记录；后续可按同类任务的真实完成耗时校准。':'目前只有 '+taskHist.length+' 条可识别任务历史。至少需要 2 条有效的真实耗时记录，才展示学习曲线；当前不编造耗时。')+'</p></div><div class="cp-pattern-card"><h4>3. 认知负荷与恢复</h4><p>精力反馈 '+hist.length+' 次 · 疲惫记录 '+(a.fatigueLog||[]).length+' 条 · 当前估算置信度 '+esc(brain().confidence)+'。这是排程辅助信号，不是生理检测。</p></div><div class="cp-research"><h4>研究依据</h4><p><a href="https://pubmed.ncbi.nlm.nih.gov/39422518/" target="_blank" rel="noopener noreferrer">2024 认知疲劳客观测量系统综述</a>：现实环境中可靠测量仍有局限。</p><p><a href="https://pubmed.ncbi.nlm.nih.gov/40293205/" target="_blank" rel="noopener noreferrer">2025 昼夜节律与认知表现系统综述</a>：时段效应并非人人一致，需要结合个体与任务。</p><p><a href="https://pubmed.ncbi.nlm.nih.gov/34273814/" target="_blank" rel="noopener noreferrer">中断对任务表现影响的系统综述与荟萃分析</a>：减少中断带来的恢复成本值得纳入排程设计。</p></div></section>';
}
function quickSearchPanel(){
 var ai=$('#view-ai-p2');if(!ai||$('#cp-ai-knowledge'))return;
 var panel=document.createElement('section');panel.id='cp-ai-knowledge';panel.className='cp-ai-knowledge';
 panel.innerHTML='<div class="cp-ai-head"><div><span class="cp-kicker">LOCAL KNOWLEDGE · REAL SEARCH</span><h3>遇到困难？先检索你的本机笔记</h3><p>通过本机后端搜索「韩奕知识复盘」标题与正文。只有后端返回的真实结果才会显示；连接不上时明确提示。</p></div><button type="button" class="cp-secondary" data-cp-open-source>打开资料中心 →</button></div><form class="cp-ai-search" data-cp-search-form><input type="search" data-cp-query placeholder="输入当前卡住的问题：例如 Agent、MCP、需求分析…" aria-label="搜索本机 Obsidian 笔记"><button type="submit" class="cp-primary">搜索本机笔记</button></form><p class="cp-ai-status" data-cp-ai-status role="status" aria-live="polite">尚未检索；不会假装已读取。</p><div class="cp-ai-results" data-cp-ai-results></div>';
 var head=$('.embedded-p2-head',ai);if(head)head.before(panel);else ai.prepend(panel);
 panel.querySelector('[data-cp-open-source]').onclick=function(){if(window.SY&&SY.switchAppView)SY.switchAppView('sources')};
 panel.querySelector('[data-cp-search-form]').onsubmit=function(e){e.preventDefault();searchVault(panel.querySelector('[data-cp-query]').value.trim(),panel)};
}
async function backend(path,data){
 if(window.SY&&typeof SY.backendCall==='function'){var r=await SY.backendCall(path,data,60000);if(!r||!r.ok)throw Error(r&&r.error||'本机知识库后端未返回成功');return r.data||{}}
 throw Error('本机后端接口未就绪。请在本机启动工作台配套服务后重试。');
}
async function searchVault(q,panel){
 var status=$('[data-cp-ai-status]',panel),host=$('[data-cp-ai-results]',panel);status.textContent='正在请求本机后端，搜索真实笔记…';host.replaceChildren();
 try{var data=await backend('/api/pm/tutorials?q='+encodeURIComponent(q));lastNotes=data.notes||[];status.textContent='后端已返回：'+(data.name||'本机知识库')+' · 共 '+(data.total??lastNotes.length)+' 篇 · 命中 '+(data.matched??lastNotes.length)+' 篇。';
 if(!lastNotes.length){host.textContent='没有匹配到笔记。试试任务关键词、项目名称或技术名词。';return}
 lastNotes.slice(0,8).forEach(function(note){var card=document.createElement('article');card.className='cp-note-result';var title=document.createElement('strong');title.textContent=note.title||note.name||note.path||'未命名笔记';var meta=document.createElement('small');meta.textContent=note.path||note.relativePath||note.url||'本机知识库返回的记录';var excerpt=document.createElement('p');excerpt.textContent=String(note.excerpt||note.preview||note.snippet||'检索命中。点击“读取全文”后，才会请求正文。').slice(0,320);var actions=document.createElement('div');actions.className='cp-inline-actions';var read=document.createElement('button');read.type='button';read.className='cp-secondary';read.textContent='读取全文';read.onclick=function(){readVaultNote(note,panel,card)};var ai=document.createElement('button');ai.type='button';ai.className='cp-secondary';ai.textContent='带入 AI 解卡';ai.onclick=function(){readVaultNote(note,panel,card,true)};actions.append(read,ai);card.append(title,meta,excerpt,actions);host.append(card)})
 }catch(e){status.textContent='本机知识库读取失败：'+(e.message||String(e))+'。请检查本机后端是否运行及 Vault 是否已配置；未显示虚构结果。';status.dataset.error='true'}
}
async function readVaultNote(note,panel,card,sendToAI){
 var status=$('[data-cp-ai-status]',panel);status.textContent='正在读取笔记全文…';
 try{var path=note.path||note.relativePath||note.filePath;if(!path)throw Error('搜索结果未返回可读取的笔记路径，无法请求全文');var data=await backend('/api/pm/tutorial-links',{path:path});var content=String(data.content||data.text||'');if(!content.trim())throw Error('后端未返回正文，不能标记为已读取');var pre=card.querySelector('pre');if(!pre){pre=document.createElement('pre');pre.className='cp-fulltext';card.append(pre)}pre.textContent=content.slice(0,10000)+(content.length>10000?'\n…全文超过展示上限，原文仍保留在本机库。':'');status.textContent='已从本机后端读取全文：'+(data.title||note.title||path)+' · '+content.length+' 字。';
 if(sendToAI){var frame=$('#embeddedP2Frame');var doc=null;try{doc=frame&&frame.contentDocument}catch(e){}var candidates=doc?Array.from(doc.querySelectorAll('textarea,input[type="text"],[contenteditable="true"]')):[];var input=candidates.find(function(x){var hint=((x.placeholder||'')+' '+(x.getAttribute('aria-label')||'')+' '+(x.parentElement&&x.parentElement.innerText||'')).toLowerCase();return /提问|问题|向 ai|ask|message|输入/.test(hint)&&!/(api|key|token|模型名称)/.test(hint)})||candidates.find(function(x){return x.tagName==='TEXTAREA'&&!/api|key|token/i.test(x.placeholder||'')});if(input){var task=(account()&&account().tasks||[]).find(function(t){return chosen.indexOf(taskId(t))>=0});input.value='请结合我的真实任务'+(task?'「'+taskName(task)+'」':'')+'和以下 Obsidian 原文，解释我卡住的原因，并给出下一步可执行动作。不要编造原文没有的信息。\n\n笔记标题：'+(data.title||note.title||'')+'\n来源：'+path+'\n\n'+content.slice(0,12000);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));input.focus();status.textContent='已读取原文并带入 AI 解卡输入框，请检查后点击 AI 的发送按钮；不会擅自发送或消耗模型额度。'}else{var copy=document.createElement('button');copy.type='button';copy.className='cp-secondary';copy.textContent='复制原文与任务问题';copy.onclick=function(){var txt='任务：'+(task?taskName(task):'请先选择任务')+'\n笔记：'+(data.title||note.title||'')+'\n\n'+content;navigator.clipboard&&navigator.clipboard.writeText(txt).then(function(){status.textContent='已复制，可粘贴到 AI 解卡。'}).catch(function(){status.textContent='浏览器未授权剪贴板，请选中上方全文手动复制。'})};card.querySelector('.cp-inline-actions').append(copy);status.textContent='原文已读取，但未定位到 AI 输入框；可以复制原文后交给 AI。'}}
 }catch(e){status.textContent='读取全文失败：'+(e.message||String(e))+'。连接成功不代表正文读取成功。';status.dataset.error='true'}
}
function redirectDifficulty(){
 var nav=$('#appNav');if(!nav)return;
 Array.from(nav.querySelectorAll('.app-nav-item')).forEach(function(b){var label=(b.textContent||'').replace(/\s+/g,'').trim();if(label==='遇到困难'||label==='困难救援'||label==='卡壳救援'){b.title='遇到困难请使用 AI 解卡';b.addEventListener('click',function(e){e.preventDefault();e.stopImmediatePropagation();if(window.SY&&SY.switchAppView)SY.switchAppView('ai-p2');var q=$('#cp-ai-knowledge [data-cp-query]');if(q)q.focus()},{capture:true});b.style.display='none';b.setAttribute('aria-hidden','true')}})
}
function init(){
 mountLauncher();quickSearchPanel();redirectDifficulty();
 var details=$('#sy-energy-daily-details');if(details){details.open=false;details.style.display='none'}
 // Keep the three evidence-dependent trend cards inside the separate "个人规律" step, never expanded on the homepage.
 var old=$('#energy-left-planner');if(old)old.style.display='none';
 updateLauncher();
}
function scheduleInit(){if(!document.body)return;init()}
document.addEventListener('DOMContentLoaded',scheduleInit);document.addEventListener('sy:ready',scheduleInit);
if(document.readyState!=='loading')scheduleInit();
observer=new MutationObserver(function(){if(!dialog){mountLauncher();quickSearchPanel();redirectDifficulty();updateLauncher()}});
observer.observe(document.documentElement,{childList:true,subtree:true});
window.SYComfortFlow={open:open,brain:brain,searchVault:searchVault,readVaultNote:readVaultNote,refresh:updateLauncher};
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-cp-open]');if(b){e.preventDefault();open(0);return}var legacy=e.target.closest&&e.target.closest('button,a,[role="button"]');if(legacy&&/舒适排期|给休息留时间/.test(legacy.textContent||'')&&!legacy.closest('.cp-dialog')){e.preventDefault();open(0)}});
})();