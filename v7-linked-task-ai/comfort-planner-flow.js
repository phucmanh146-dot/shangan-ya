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
 var a=account()||{},p=a.plannerSettings||{},ci=p.lastCognitiveCheckin||{},now=Date.now(),age=now-Number(ci.at||0),active=p.activeSession||a.activeTimer||a.smartPlanner&&a.smartPlanner.active||{},started=startMs(active),elapsed=started?Math.floor((now-started)/60000):0,st=p.stuckState||a.stuckState||null,stuck=st?Math.max(0,Math.floor((now-Number(st.startedAt||st.at||now))/60000)):0;
 var recent=(Array.isArray(a.energyHistory)?a.energyHistory:[]).filter(function(x){return Number(x.at)>0&&now-Number(x.at)<4*3600000&&Number(x.score)>=1&&Number(x.score)<=5}).slice(-12);
 var fatigueLogs=(Array.isArray(a.fatigueLog)?a.fatigueLog:[]).filter(function(x){return Number(x.at)>0&&now-Number(x.at)<4*3600000}),latestFatigue=fatigueLogs.length?Math.max.apply(null,fatigueLogs.map(function(x){return Number(x.at)})):0;
 var score=Number(ci.score||p.currentEnergyScore||0),why='',confidence='低',signals=[],freshFatigue=fatigueLogs.filter(function(x){return Number(x.at)>Number(ci.at||0)&&now-Number(x.at)<120*60000}).length;
 if(age>=0&&age<150*60000&&score>=1&&score<=5){confidence='中';why='最近一次主观状态反馈';signals.push('最近反馈 '+score+'/5')}
 else if(recent.length){score=Number(recent[recent.length-1].score);why='最近精力记录（需结合当前感觉确认）';confidence='低';signals.push('最近精力记录 '+score+'/5')}
 else{score=3;why='缺少近期状态记录，暂按中等负荷保守估算'}
 if(elapsed>=90){score=Math.min(score,2);signals.push('当前计时连续 '+elapsed+' 分钟')}
 else if(elapsed>=55){score=Math.min(score,3);signals.push('当前计时 '+elapsed+' 分钟，建议中断检查')}
 if(stuck>=12){score=Math.min(score,2);signals.push('连续卡壳约 '+stuck+' 分钟')}
 if(freshFatigue){score=Math.min(score,2);signals.push('最近疲惫反馈 '+freshFatigue+' 次，尚未出现更新的状态确认')}
 if(recent.length>=3){var tail=recent.slice(-4),lastSignalAt=Number(ci.at||0),lows=tail.filter(function(x){return Number(x.score)<=2&&Number(x.at)>lastSignalAt}).length;if(lows>=2){score=Math.min(score,2);signals.push('状态确认后仍有多次低精力反馈')}}
 if(latestFatigue&&now-latestFatigue<4*3600000&&Number(ci.at||0)>latestFatigue){signals.push('已优先采用疲惫记录之后的新状态反馈')}
 return pack(score,signals.length?signals.join('；'):why,confidence,elapsed,stuck);
}function pack(score,why,confidence,elapsed,stuck){score=Math.max(1,Math.min(5,Math.round(score||3)));return{score:score,label:score<=1?'可能已明显透支':score===2?'认知负荷偏高':score===3?'中等负荷，先短段推进':score===4?'适合安排深度任务':'当前反馈较清醒',why:why,confidence:confidence,elapsed:elapsed||0,stuck:stuck||0}}
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
function reserveDefaults(b){return{buffer:b.score<=2?45:30,leisure:b.score<=2?90:60,recovery:b.score<=1?25:b.score===2?20:10,fixed:0}}function recentHistory(t){
 var a=account()||{},id=taskId(t),arr=[];
 ['taskHistory','completedTaskHistory','taskRecords','completionHistory'].forEach(function(k){(Array.isArray(a[k])?a[k]:[]).forEach(function(x){if(String(x.taskId||x.id||x.name||'')===id){var n=Number(x.actualMinutes||x.durationMinutes||x.elapsedMinutes||x.actualDuration||0);if(n>0&&n<600)arr.push(n)}})});
 return arr;
}
function taskLoadEvidence(t){
 var a=account()||{},id=taskId(t),eh=(Array.isArray(a.energyHistory)?a.energyHistory:[]).filter(function(x){return String(x.taskId||'')===id&&Number(x.score)>=1&&Number(x.score)<=5}),fh=(Array.isArray(a.fatigueLog)?a.fatigueLog:[]).filter(function(x){return String(x.taskId||'')===id}),n=eh.length,low=n?eh.filter(function(x){return Number(x.score)<=2}).length:0,rate=n?low/n:0;
 return {samples:n,low:low,rate:rate,fatigue:fh.length,score:n?eh.reduce(function(v,x){return v+Number(x.score)},0)/n:0};
}
function estimate(t,b){
 var hist=recentHistory(t).sort(function(a,c){return a-c}),range=t.estimateRange&&typeof t.estimateRange==='object'?t.estimateRange:{},complex=isDeep(t),ev=taskLoadEvidence(t);
 // Keep the original conservative estimate, then adjust only when this task has its own repeated fatigue evidence.
 var factor=complex?(b.score<=2?1.25:1.1):1;
 if(ev.samples>=3&&ev.rate>=.5)factor*=1.12;
 if(ev.fatigue>=2)factor*=1.08;
 if(ev.samples>=5&&ev.rate<.2&&!ev.fatigue)factor*=.97;
 function pct(arr,p){if(!arr.length)return 0;var pos=(arr.length-1)*p,lo=Math.floor(pos),hi=Math.ceil(pos);return arr[lo]+(arr[hi]-arr[lo])*(pos-lo)}
 var base=hist.length?pct(hist,.5):(Number(range.min)>0&&Number(range.max)>=Number(range.min)?(Number(range.min)+Number(range.max))/2:minutes(t));
 var lo=hist.length>=3?pct(hist,.25):(Number(range.min)>0?Number(range.min):base*.8),hi=hist.length>=3?pct(hist,.75):(Number(range.max)>=lo?Number(range.max):base*1.35);
 lo=Math.max(5,Math.round(lo*factor));hi=Math.max(lo,Math.round(hi*factor));base=Math.max(lo,Math.min(hi,Math.round(base*factor)));
 var confidence=hist.length>=5?'中等':hist.length>=2?'偏低':'低';
 var basis=hist.length>=2?'按 '+hist.length+' 条真实耗时估算 P50/P25–P75':(range.min&&range.max?'使用 AI 草稿估时范围；尚无足够个人历史':'缺少个人样本，使用保守初始范围');
 if(ev.samples>=3||ev.fatigue>=2)basis+='；结合该任务 '+ev.samples+' 条精力反馈、'+ev.fatigue+' 条疲惫记录';
 return {minutes:Math.round(Math.max(5,Math.min(180,base))),min:lo,max:hi,basis:basis,complex:complex,samples:hist.length,confidence:confidence,energyEvidence:ev};
}
function getPrefs(){var a=account()||{},p=a.plannerSettings||{},w=a.wellbeingPlan||{},start=nowRounded(),end=21*60;if(start>=20*60)end=23*60+30;if(end-start<60)end=Math.min(1439,start+180);var d=reserveDefaults(brain());return{start:localTime(start),end:localTime(end),buffer:d.buffer,leisure:Math.max(d.leisure,Number(p.dailyLeisureMinutes||0)),recovery:d.recovery,fixed:Math.max(0,Number(w.meet||p.fixedMinutes||0)),breakEvery:brain().score<=2?25:35}}function selectedTasks(){var all=pending();return all.filter(function(t){return chosen.indexOf(taskId(t))>=0})}
function chooseDefaults(){var all=pending().slice().sort(function(a,b){return priority(b)-priority(a)}),acct=account()||{},active=String(window.__SYTaskWorkspaceSelectedTaskId||((acct.activeTimer||{}).taskId)||acct.priorityFocusTaskId||'');chosen=all.filter(function(t){return taskId(t)===active}).map(taskId);if(!chosen.length)chosen=all.slice(0,Math.min(3,all.length)).map(taskId)}
function mountLauncher(){
 var details=$('#sy-energy-daily-details');if(details){details.open=false;details.style.display='none';}
 var legacy=$('[data-comfort-entry]');if(legacy)legacy.remove();
 var page=$('#view-comfort');if(page&&!page.dataset.comfortBound){page.dataset.comfortBound='1';page.addEventListener('click',function(e){var route=e.target.closest&&e.target.closest('[data-cp-route]');if(route){e.preventDefault();var key=route.getAttribute('data-cp-route');if(window.SY&&SY.switchAppView)SY.switchAppView(key);return;}var start=e.target.closest&&e.target.closest('[data-cp-open-link]');if(start){e.preventDefault();open(0);}});}
 updateLauncher();
}
function updateLauncher(){var host=$('[data-cp-page-status]');if(!host)return;var b=brain(),a=account()||{},n=pending().length;host.textContent='系统估计：'+b.label+' · 待处理任务 '+n+' 项 · '+(a.energyHistory||[]).length+' 条精力记录';}
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
 body.innerHTML='<section class="cp-panel"><span class="cp-eyebrow">STEP 03 · AVAILABLE TIME</span><h3>给今天的任务留出真实时间</h3><p class="cp-lead">你不需要估计精力；只需确认可安排的时间窗口。系统会自动预留缓冲、休息和娱乐，不会挤占固定事项。</p><div class="cp-fields"><label>开始安排时间<input type="time" id="cpStart" value="'+prefs.start+'"></label><label>今天最晚结束<input type="time" id="cpEnd" value="'+prefs.end+'"></label><label>固定事项占用（分钟）<input type="number" min="0" max="720" step="5" id="cpFixed" value="'+prefs.fixed+'"></label><label>弹性缓冲（分钟）<input type="number" min="15" max="180" step="5" id="cpBuffer" value="'+prefs.buffer+'"></label><label>放空 / 娱乐（分钟）<input type="number" min="0" max="240" step="5" id="cpLeisure" value="'+prefs.leisure+'"></label><label>短休间隔（分钟）<select id="cpBreak"><option value="20" '+(prefs.breakEvery===20?'selected':'')+'>每 20 分钟（低负荷）</option><option value="25" '+(prefs.breakEvery===25?'selected':'')+'>每 25 分钟</option><option value="35" '+(prefs.breakEvery===35?'selected':'')+'>每 35 分钟</option><option value="45" '+(prefs.breakEvery===45?'selected':'')+'>每 45 分钟</option></select></label></div><div class="cp-note-box">自动规则：疲惫时先恢复、减少高负荷任务；状态较好时再安排深度任务。缓冲不是待办，娱乐不是偷懒。可按现实情况修改时间窗口。</div></section>';
 }else if(step===3){body.innerHTML=buildPreview(b)}
 else {body.innerHTML=buildPatterns(a)}
 footer('');
}
function buildPreview(b){
 var start=parseTime($('#cpStart',dialog)?.value||getPrefs().start),end=parseTime($('#cpEnd',dialog)?.value||getPrefs().end),fixed=Math.max(0,Number($('#cpFixed',dialog)?.value||0)),buffer=Math.max(15,Number($('#cpBuffer',dialog)?.value||45)),leisure=Math.max(0,Number($('#cpLeisure',dialog)?.value||60)),breakEvery=Number($('#cpBreak',dialog)?.value||35);
 if(end<=start)end+=24*60;
 var available=end-start,rest=b.score<=1?25:b.score===2?20:10,chosenList=selectedTasks(),remaining=Math.max(0,available-fixed-buffer-leisure),cursor=start,blocks=[],deferred=[],focusCount=0,deepCount=0;
 function add(title,duration,kind,reason){duration=Math.max(0,Math.round(duration));if(!duration||cursor+duration>end)return false;blocks.push({start:cursor,end:cursor+duration,title:title,minutes:duration,kind:kind,reason:reason||''});cursor+=duration;return true}
 function reserveLeisure(label,duration,kind,reason){if(duration<=0||remaining<=0)return;var d=Math.min(duration,remaining,Math.max(0,end-cursor-buffer));if(d>=5&&add(label,d,kind,reason))remaining-=d}
 if(b.score<=2){var recoveryBlock=Math.min(rest,20);if(reserveLeisure('恢复窗口：离开屏幕、喝水、走动或安静休息',recoveryBlock,'rest','疲惫时先恢复，不要求立刻回到深度工作'))remaining=Math.max(0,remaining-recoveryBlock);}
 function essentialToday(t){
 var a=account()||{},todayKey=today(),flag=t.mustDo===true||t.isMust===true||t.requiredToday===true||t.nonDeferrable===true||t.essentialToday===true;
 var due=String(t.dueDate||t.deadline||t.date||'').slice(0,10);
 return flag||(due&&/^\\d{4}-\\d{2}-\\d{2}$/.test(due)&&due<=todayKey);
}
var ranked=chosenList.slice().sort(function(a,c){
 var mustDiff=Number(essentialToday(c))-Number(essentialToday(a));if(mustDiff)return mustDiff;
 var pr=priority(c)-priority(a);if(pr)return pr;
 var ea=taskLoadEvidence(a),ec=taskLoadEvidence(c);
 // When energy is high, surface repeatedly draining work earlier; when it is lower, prefer tasks with fewer fatigue signals.
 var da=ea.samples>=2||ea.fatigue>=2?(ea.rate*2+ea.fatigue):0,dc=ec.samples>=2||ec.fatigue>=2?(ec.rate*2+ec.fatigue):0;
 if(b.score>=4&&da!==dc)return dc-da;
 if(b.score===3&&isDeep(a)!==isDeep(c))return isDeep(a)?1:-1;
 if(b.score<=2&&isDeep(a)!==isDeep(c))return isDeep(a)?1:-1;
 return 0
}),daydream=Math.max(15,Math.round(leisure*.3)),entertain=Math.max(0,leisure-daydream),daydreamAdded=false;
 ranked.forEach(function(t,index){
  var est=estimate(t,b),deep=est.complex,a0=account()||{},all0=Array.isArray(a0.tasks)?a0.tasks:[],hardIds=Array.isArray(t.hardDependencyIds)?t.hardDependencyIds:[],hardNames=Array.isArray(t.hardDependencies)?t.hardDependencies:[],blocked=hardIds.map(function(id){return all0.find(function(z){return String(taskId(z))===String(id)})}).filter(function(z){return z&&!z.done&&!z.completedAt}),namedBlocked=hardNames.map(function(n){var q=String(n||'').toLowerCase().trim();return all0.find(function(z){var zn=String(taskName(z)).toLowerCase().trim();return zn.length>=4&&q.length>=4&&(zn===q||zn.indexOf(q)>=0||q.indexOf(zn)>=0)})}).filter(function(z){return z&&!z.done&&!z.completedAt});
  if(blocked.length||namedBlocked.length){deferred.push({task:t,reason:'存在尚未完成的硬依赖：'+blocked.concat(namedBlocked).map(taskName).join('、')+'。先检查是否确实不可绕过；软依赖/心理锁定不应自动阻塞。'});return;}
  if(b.score<=1&&deep){deferred.push({task:t,reason:'当前反馈为明显透支：本轮不安排高认知负荷任务，先恢复后重新评估'});return}
  if(b.score===2&&deep){deferred.push({task:t,reason:'当前负荷偏高：先恢复或换轻任务；休息后重新签到再决定是否继续'});return}
  if(remaining<5){deferred.push({task:t,reason:'扣除固定事项、休息、娱乐与缓冲后，可用时间不足'});return}
  var cap=deep?(b.score>=4?Math.min(40,breakEvery):Math.min(25,breakEvery)):Math.min(25,breakEvery);
  var dur=Math.min(est.minutes,cap,remaining);
  if(dur<5){deferred.push({task:t,reason:'剩余时间不足以推进一个有效工作段'});return}
  if(!add(taskName(t),dur,deep?'focus':'light',est.basis+'；估时范围 '+est.min+'–'+est.max+' 分钟，置信度 '+est.confidence)){deferred.push({task:t,reason:'剩余时间窗口不足'});return}
  remaining-=dur;focusCount++;if(deep)deepCount++;
  if(remaining>=5&&index<ranked.length-1){var breakMin=deep?8:5;if(add('短休：离开当前任务、喝水或活动一下',Math.min(breakMin,remaining),'break','短休用于缓解疲劳，不保证立即恢复全部表现'))remaining-=blocks[blocks.length-1].minutes}
  if(!daydreamAdded&&focusCount>=Math.min(2,Math.max(1,ranked.length))&&daydream>0){reserveLeisure('发呆 / 自由放空（不设产出目标）',daydream,'rest','每天受保护的无任务时间；可发呆、散步或安静坐一会儿');daydreamAdded=true}
  if(est.minutes>dur)deferred.push({task:t,reason:'本轮先推进 '+dur+' 分钟；剩余约 '+(est.minutes-dur)+' 分钟，完成当前段后再评估精力'})
 });
 if(!daydreamAdded&&daydream>0)reserveLeisure('发呆 / 自由放空（不设产出目标）',daydream,'rest','每天受保护的无任务时间；可发呆、散步或安静坐一会儿');
 if(entertain>0)reserveLeisure('娱乐 / 看剧 / 轻松刷视频（受保护时间）',entertain,'leisure','娱乐是计划内恢复，不作为未完成任务扣分');
 var endBuffer=Math.min(buffer,Math.max(0,end-cursor));if(endBuffer>0)add('弹性缓冲：卡壳、临时事务或任务超时',endBuffer,'buffer','没有突发情况时也不强制塞入新任务');
 var scheduled=blocks.reduce(function(n,x){return n+x.minutes},0),unused=Math.max(0,end-cursor),focusMinutes=blocks.filter(function(x){return x.kind==='focus'||x.kind==='light'}).reduce(function(n,x){return n+x.minutes},0);
 window.__SYComfortDraft={date:today(),createdAt:Date.now(),state:b,tasks:chosenList.map(function(t){return{id:taskId(t),title:taskName(t)}}),window:{start:localTime(start%1440),end:localTime(end%1440)},fixedMinutes:fixed,bufferMinutes:buffer,leisureMinutes:leisure,blocks:blocks,deferred:deferred,unusedMinutes:unused,scheduledMinutes:scheduled,focusMinutes:focusMinutes,confidence:b.confidence,algorithm:'adaptive-load-v2'};
 return '<section class="cp-panel"><span class="cp-eyebrow">STEP 04 · ADAPTIVE TIMELINE</span><h3>今日排期预览</h3><p class="cp-lead">系统根据当前状态、真实待办与可用时间安排工作段，并把发呆、娱乐和缓冲作为保护时间。'+(b.score<=2?'当前负荷偏高：优先恢复和低负荷事项，不强迫深度任务。':'每段深度任务后安排短休，长任务拆成多个工作段。')+'</p><div class="cp-plan-summary"><div><strong>'+focusMinutes+'</strong><span>工作分钟</span></div><div><strong>'+leisure+'</strong><span>放空与娱乐分钟</span></div><div><strong>'+deferred.length+'</strong><span>延后/待续任务</span></div></div><div class="cp-timeline">'+(blocks.length?blocks.map(function(x){return '<article class="cp-time-row kind-'+x.kind+'"><time>'+localTime(x.start%1440)+'–'+localTime(x.end%1440)+'</time><div><strong>'+esc(x.title)+'</strong><p>'+x.minutes+' 分钟'+(x.reason?' · '+esc(x.reason):'')+'</p></div><span>'+({focus:'专注',light:'轻任务',rest:'放空/恢复',break:'短休',leisure:'娱乐',buffer:'缓冲'}[x.kind]||'安排')+'</span></article>'}).join(''):'<div class="cp-empty">当前时间窗口不足，或没有选择任务。请返回调整。</div>')+'</div>'+(deferred.length?'<div class="cp-deferred"><h4>暂缓安排，不代表放弃</h4>'+deferred.map(function(x){return '<p><strong>'+esc(taskName(x.task))+'</strong>：'+esc(x.reason)+'</p>'}).join('')+'</div>':'')+'<div class="cp-note-box">研究边界：微休息对活力和疲劳的平均改善较小但有统计意义，整体表现提升并不稳定；高消耗任务可能需要更长恢复。系统不会把“90 分钟周期”当作所有人的固定生理规律。请用每次反馈和真实耗时持续校准。</div><p class="cp-note">固定事项按总分钟预留；未录入具体起止时间时，这是一份时间顺序草案，不替代日历。保存后不会自动把任务标记完成。</p></section>';
}function saveDraft(){
 var d=window.__SYComfortDraft;if(!d){render(3);footer('请先生成预览。');return}
 var a=account();if(!a){footer('无法读取当前账号数据，请先登录。');return}
 a.plannerSettings=a.plannerSettings||{};a.plannerSettings.comfortSchedule=d;a.plannerSettings.comfortScheduleSavedAt=Date.now();
 a.wellbeingPlan=a.wellbeingPlan||{};a.wellbeingPlan.buffer=d.bufferMinutes;a.wellbeingPlan.daydream=Math.max(0,Math.round(d.leisureMinutes*.45));a.wellbeingPlan.tv=Math.max(0,d.leisureMinutes-a.wellbeingPlan.daydream);
 save(a);footer('已保存今日排期草案。原任务状态与截止日期未改动。');var n=$('#cpBody',dialog);if(n){var banner=document.createElement('div');banner.className='cp-success';banner.textContent='已保存今日排期草案。可随时重新估算；原任务仍在每日清单中。';n.prepend(banner)}var next=dialog.querySelector('[data-cp-next]');if(next)next.textContent='返回状态';}
function buildPatterns(a){
 var hist=Array.isArray(a.energyHistory)?a.energyHistory:[],fatigue=Array.isArray(a.fatigueLog)?a.fatigueLog:[],bins=[['凌晨',0,5],['上午',6,11],['下午',12,17],['晚上',18,23]],groups=bins.map(function(g){var arr=hist.filter(function(x){var h=Number(x.hour);return h>=g[1]&&h<=g[2]&&Number(x.score)>=1&&Number(x.score)<=5});return{name:g[0],n:arr.length,avg:arr.length?arr.reduce(function(n,x){return n+Number(x.score)},0)/arr.length:0}}),taskHist=[];
 ['taskHistory','completedTaskHistory','taskRecords','completionHistory'].forEach(function(k){if(Array.isArray(a[k]))taskHist=taskHist.concat(a[k])});
 var taskMap={};hist.forEach(function(x){if(!x.taskId)return;var id=String(x.taskId),t=(a.tasks||[]).find(function(y){return String(y.id||y.taskId||y.name)===id}),name=t?taskName(t):String(x.taskName||('任务 '+id));(taskMap[id]||(taskMap[id]={name:name,checks:0,low:0,score:0,fatigue:0})).checks++;taskMap[id].score+=Number(x.score)||0;if(Number(x.score)<=2)taskMap[id].low++});
 fatigue.forEach(function(x){if(!x.taskId)return;var id=String(x.taskId),t=(a.tasks||[]).find(function(y){return String(y.id||y.taskId||y.name)===id}),name=t?taskName(t):String(x.taskName||('任务 '+id));if(!taskMap[id])taskMap[id]={name:name,checks:0,low:0,score:0,fatigue:0};taskMap[id].fatigue++});
 var expensive=Object.keys(taskMap).map(function(id){var x=taskMap[id];return {name:x.name,checks:x.checks,low:x.low,score:x.checks?x.score/x.checks:0,fatigue:x.fatigue,rate:x.checks?x.low/x.checks:0}}).filter(function(x){return x.checks>=2||x.fatigue>=2}).sort(function(x,y){return (y.rate*2+y.fatigue)-(x.rate*2+x.fatigue)});
 var enough=hist.length>=3;
 return '<section class="cp-panel"><span class="cp-eyebrow">PERSONAL PATTERNS · EVIDENCE FIRST</span><h3>你的个人规律</h3><p class="cp-lead">这些分析只用当前账号已保存的记录。样本不足时明确提示；任务低分代表“当时精力偏低”，不是医学诊断，也不单独证明任务导致疲劳。</p><div class="cp-pattern-card"><h4>1. 我的精力时段 · 按签到统计</h4>'+(hist.length>=2?groups.map(function(g){return '<div class="cp-bar-row"><span>'+g.name+'</span><div class="cp-bar"><i style="width:'+(g.n?g.avg/5*100:0)+'%"></i></div><b>'+(g.n?g.avg.toFixed(1)+'/5':'暂无')+'</b><small>'+g.n+' 次</small></div>'}).join(''):'<p class="cp-muted">目前有 '+hist.length+' 次精力记录。至少 2 次后才展示；每个时段最好有 3 次以上样本再比较。</p>')+'</div><div class="cp-pattern-card"><h4>2. 哪些任务更容易遇到低精力 / 疲惫反馈</h4>'+(expensive.length?expensive.slice(0,5).map(function(x){return '<div class="cp-bar-row"><span style="min-width:100px;max-width:40%;overflow-wrap:anywhere">'+esc(x.name)+'</span><div class="cp-bar"><i style="width:'+Math.round(Math.max(x.rate,x.fatigue/(x.checks+x.fatigue||1))*100)+'%"></i></div><b>'+(x.checks?Math.round(x.rate*100)+'%低分':'暂无低分样本')+'</b><small>'+x.checks+' 次反馈 · '+x.fatigue+' 次疲惫</small></div>'}).join(''):'<p class="cp-muted">目前还没有同一任务至少 2 次精力反馈或 2 次疲惫记录。使用“记录状态 / 记录卡壳”并关联任务后，才会形成任务级画像。</p>')+'</div><div class="cp-pattern-card"><h4>3. 任务学习曲线与耗时校准</h4><p>'+(taskHist.length>=2?'已找到 '+taskHist.length+' 条任务历史；排期会优先采用真实耗时中位数，并把重复低精力 / 疲惫反馈作为保守缓冲信号。':'目前有 '+taskHist.length+' 条可识别任务历史。至少需要 2 条有效真实耗时记录；当前不编造耗时。')+'</p></div><div class="cp-pattern-card"><h4>4. 疲惫与必要任务保护</h4><p>精力反馈 '+hist.length+' 次 · 疲惫记录 '+fatigue.length+' 条 · 当前估算置信度 '+esc(brain().confidence)+'. '+(hist.length<3?'样本不足时使用保守规则。':'系统已开始形成个人基线，但仍需结合你此刻的主观反馈。')+'排期先保留固定事项、必要任务、休息与机动缓冲；超出可用时间的任务留在待安排区，不自动标记完成。</p></div><div class="cp-research"><h4>研究依据 · 用于设计，不等于个人诊断</h4><p><a href="https://pubmed.ncbi.nlm.nih.gov/39422518/" target="_blank" rel="noopener noreferrer">Dickens 等，2024：认知疲劳客观测量系统综述</a>：疲劳是复杂状态，单一信号难以可靠实时判定，因此保留主观反馈并标注置信度。</p><p><a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC9432722/" target="_blank" rel="noopener noreferrer">Albulescu 等，2022：微休息系统综述与荟萃分析</a>：对活力与疲劳有小幅改善；高消耗任务可能需要更长恢复。</p><p><a href="https://www.annualreviews.org/content/journals/10.1146/annurev-psych-022824-043825" target="_blank" rel="noopener noreferrer">Cajochen & Schmidt，2025：昼夜节律与认知综述</a>：昼夜节律会影响认知，但睡眠债、个体差异和任务类型都会改变结果。</p><p><a href="https://pubmed.ncbi.nlm.nih.gov/7669837/" target="_blank" rel="noopener noreferrer">Neubauer & Freudenthaler，1995：90 分钟认知周期检验</a>：未发现稳定的 90 分钟认知表现周期，不能把它当作普遍规律。</p></div></section>';
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
 Array.from(nav.querySelectorAll('.app-nav-item')).forEach(function(b){if(b.dataset.cpRedirected==='1')return;var label=(b.textContent||'').replace(/\s+/g,'').trim();if(label==='遇到困难'||label==='困难救援'||label==='卡壳救援'){b.dataset.cpRedirected='1';b.title='遇到困难请使用 AI 解卡';b.addEventListener('click',function(e){e.preventDefault();e.stopImmediatePropagation();if(window.SY&&SY.switchAppView)SY.switchAppView('ai-p2');var q=$('#cp-ai-knowledge [data-cp-query]');if(q)q.focus()},{capture:true});b.style.display='none';b.setAttribute('aria-hidden','true')}})
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