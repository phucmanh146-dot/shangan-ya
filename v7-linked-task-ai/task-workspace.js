(function(){
'use strict';if(window.SYTaskWorkspace)return;
var Q=function(s,r){return (r||document).querySelector(s)},QA=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))},routes={overview:'task-workspace',materials:'sources',ai:'ai-p2',schedule:'comfort',knowledge:'knowledge'},selectedId='';
function acct(){try{return window.SY&&SY.getAcctData?SY.getAcctData():null}catch(e){return null}}
function allTasks(){var a=acct()||{};return (Array.isArray(a.tasks)?a.tasks:[]).filter(function(t){return t&&!t.deleted})}
function task(id){return allTasks().find(function(t){return String(t.id)===String(id)})||null}
function name(t){return String(t&&(t.name||t.title||t.text)||'未命名任务')}
function minText(n){n=Number(n);if(!Number.isFinite(n)||n<=0)return '暂无记录';return n>=60?Math.floor(n/60)+'小时'+(Math.round(n%60)?Math.round(n%60)+'分钟':''):Math.round(n)+'分钟'}
function durationRows(a,t){return (Array.isArray(a.durationLog)?a.durationLog:[]).filter(function(r){return String(r.taskId)===String(t.id)&&Number(r.actualMinutes)>0})}
function materialList(t){return Array.isArray(t.materials)?t.materials:[]}
function isFulltext(m){return !!(m&&(typeof m.content==='string'&&m.content.trim().length>0||m.readStatus==='fulltext'||m.contentRead===true))}
function due(t){return t.dueDate?String(t.dueDate)+(t.dueTime?' '+t.dueTime:''):'未设置截止日期'}
function defaultTask(){var a=acct()||{},ts=allTasks(),active=String((a.activeTimer||{}).taskId||a.priorityFocusTaskId||'');return ts.find(function(t){return String(t.id)===active})||ts.find(function(t){return !t.done&&!t.completedAt})||ts[0]||null}
function set(id,v){var e=Q('#'+id);if(e)e.textContent=v}
function renderSelect(){var sel=Q('#twTaskSelect');if(!sel)return;var old=selectedId||sel.value,ts=allTasks();sel.replaceChildren();sel.append(new Option(ts.length?'选择已有任务':'当前账号暂无任务',''));ts.forEach(function(t){sel.append(new Option(name(t)+(t.done?' · 已完成':''),String(t.id)))});var t=ts.find(function(x){return String(x.id)===String(old)})||defaultTask();selectedId=t?String(t.id):'';sel.value=selectedId;window.__SYTaskWorkspaceSelectedTaskId=selectedId||''}
function render(){var a=acct()||{},t=task(selectedId),metrics=Q('#twTaskMetrics');if(!t){set('twMonitorStatus','暂无任务');set('twSelectedTaskTitle','请先在每日清单创建或选择任务');set('twSelectedTaskDesc','任务工作区只读取已有任务，不会自行编造任务、进度或截止日期。');set('twMaterialsSummary','当前没有可展示的任务资料。');set('twHistorySummary','选择任务后才会计算实际耗时与状态。');if(metrics)metrics.replaceChildren();set('twNextTitle','先选一个真实任务');set('twNextCopy','然后读取资料、分析卡点并安排下一步。');return}
var mats=materialList(t),full=mats.filter(isFulltext),rows=durationRows(a,t),avg=rows.length?rows.reduce(function(s,r){return s+Number(r.actualMinutes)},0)/rows.length:null,planned=Number(t.plannedMinutes||t.estMinutes||t.estimatedMinutes||0),timer=a.activeTimer&&String(a.activeTimer.taskId)===String(t.id)?a.activeTimer:null,elapsed=timer?Math.floor((Number(timer.accumulatedMs)||0)/60000)+(timer.runningSince?Math.floor((Date.now()-Number(timer.runningSince))/60000):0):0,now=Date.now(),p=a.plannerSettings||{},check=p.lastCognitiveCheckin,energy=(Array.isArray(a.energyHistory)?a.energyHistory:[]).filter(function(x){return String(x.taskId||'')===String(t.id)&&Number(x.score)>=1&&Number(x.score)<=5}).slice(-5),fatigue=(Array.isArray(a.fatigueLog)?a.fatigueLog:[]).filter(function(x){return String(x.taskId||'')===String(t.id)&&Number(x.at)>now-4*3600000}),stuck=a.stuckState||p.stuckState,stuckFor=stuck&&String(stuck.taskId||'')===String(t.id)?Math.max(0,Math.floor((now-Number(stuck.startedAt||stuck.at||now))/60000)):0,liveCheck=check&&String(check.taskId||'')===String(t.id)&&now-Number(check.at)<150*60000?Number(check.score):null;
var statusMap=a.taskStatusById&&a.taskStatusById[String(t.id)]||'';
var loadScore=(/开发|研究|分析|设计|写作|学习|调试|排查|PPT|口播/i.test(name(t))?2:0)+(elapsed>=75?2:elapsed>=40?1:0)+(stuckFor>=15?3:stuckFor>=8?2:0)+(liveCheck!==null&&liveCheck<=2?2:0)+(fatigue.length?1:0);
var loadLabel=loadScore>=5?'偏高':loadScore>=2?'中等':'偏低';
var loadConfidence=rows.length>=3&&energy.length>=2?'中等':rows.length>=1||energy.length>=1?'偏低':'低';
var status=t.done||t.completedAt?'已完成':statusMap==='WAITING_AI'?'等待 AI':statusMap==='RECOVERY'?'恢复优先（任务未完成）':statusMap==='RESUMABLE'?'可从断点恢复':statusMap==='SWITCHED'?'已切换任务（原任务未完成）':stuckFor>0?'已反馈卡住 '+minText(stuckFor):timer&&planned>0&&elapsed>planned*1.25?'出现执行摩擦':timer&&planned>0&&elapsed>planned?'计时已超过计划':timer?'正在执行':t.date&&String(t.date).slice(0,10)>new Date().toISOString().slice(0,10)?'待排期':'待推进';
set('twMonitorStatus',status);set('twSelectedTaskTitle',name(t));set('twSelectedTaskDesc',String(t.description||t.note||'以原任务记录为准；先看资料与前置依赖，再决定最小可交付动作。'));
if(metrics){metrics.replaceChildren();[['状态',status],['计划',minText(planned)],['截止',due(t)],['已计时',timer?minText(elapsed):'当前未计时']].forEach(function(x){var s=document.createElement('span'),b=document.createElement('b');b.textContent=x[0]+' ';s.append(b,document.createTextNode(x[1]));metrics.append(s)})}
var mh=Q('#twMaterialsSummary');if(mh){mh.replaceChildren();if(!mats.length){var p0=document.createElement('p');p0.textContent='任务尚未关联资料。进入资料中心读取原文后，再确认关联到此任务。';mh.append(p0)}else{mats.slice(0,6).forEach(function(m){var row=document.createElement('div');row.className='tw-material-row';var b=document.createElement('b'),s=document.createElement('span');b.textContent=String(m.title||m.name||m.url||m.sourceRef||'未命名资料');s.textContent=isFulltext(m)?'有正文内容（需核对来源）':m.description?'仅有摘要/说明':'仅保存链接，尚未证实读到正文';row.append(b,s);mh.append(row)});var foot=document.createElement('p');foot.textContent='已关联 '+mats.length+' 份；含正文内容 '+full.length+' 份。以资料中心逐条读取状态为准。';mh.append(foot)}}
var hh=Q('#twHistorySummary');if(hh){hh.replaceChildren();var lines=[];lines.push(rows.length?'该任务有 '+rows.length+' 条真实计时，平均 '+minText(avg):'该任务尚无有效计时记录，估时置信度低。');
lines.push('认知负荷估算：'+loadLabel+' · 置信度 '+loadConfidence+'。依据：任务类型、连续执行 '+minText(elapsed)+'、卡壳 '+minText(stuckFor)+'、近期反馈与疲劳记录；不是脑电/生理测量。');if(timer)lines.push('本次已连续执行约 '+minText(elapsed)+(planned?'；相对计划 '+minText(planned):'；没有计划时长可比较')+'。');if(planned&&avg!==null)lines.push('历史均值相对当前计划 '+(avg>planned?'高出约 '+Math.round((avg/planned-1)*100)+'%':avg<planned?'低约 '+Math.round((1-avg/planned)*100)+'%':'接近计划')+'。');lines.push(liveCheck!==null?'最近一次关联精力反馈：'+liveCheck+'/5。':'暂无近期与该任务绑定的精力反馈。');if(fatigue.length)lines.push('近 4 小时有 '+fatigue.length+' 条该任务疲劳反馈。');if(energy.length)lines.push('已有 '+energy.length+' 条近期精力反馈用于个人曲线校准。');if(stuckFor>0)lines.push('卡点持续 '+minText(stuckFor)+'；建议保存断点，先缩小问题或切换低负荷动作。');lines.forEach(function(x){var el=document.createElement('p');el.textContent=x;hh.append(el)})}
if(t.done||t.completedAt){set('twNextTitle','任务已完成：保留记录并复盘');set('twNextCopy','查看真实耗时与原始资料，不重复创建任务。')}else if(stuckFor>0){set('twNextTitle','先处理卡点，不要继续硬耗');set('twNextCopy','记录当前具体障碍，读取对应资料，再把下一步缩到一个短工作段内可验收。')}else if(!mats.length||!full.length){set('twNextTitle','先核对 '+mats.length+' 份任务资料');set('twNextCopy','任务链接和摘要不等于正文已读取；进入资料中心逐条读取并核对原文。')}else{set('twNextTitle','用已核对资料拆出最小下一步');set('twNextCopy','AI 输出来源、依赖、交付物、验收标准、估时与不确定项；确认后再排期。')}}
function switchTab(tab){if(!routes[tab])tab='overview';window.__syTaskWorkspaceTab=tab;if(window.SY&&SY.switchAppView)SY.switchAppView(routes[tab]);else renderTab(tab)}
function renderTab(tab){tab=tab||window.__syTaskWorkspaceTab||'overview';if(!routes[tab])tab='overview';QA('[data-tw-tab]').forEach(function(b){var on=b.dataset.twTab===tab;b.classList.toggle('is-active',on);b.setAttribute('aria-selected',on?'true':'false')});QA('[data-tw-panel]').forEach(function(p){p.hidden=p.dataset.twPanel!==tab});QA('[data-tw-embedded]').forEach(function(p){p.hidden=p.dataset.twEmbedded!==tab});if(tab==='materials'){if(window.SYSourceCenter)SYSourceCenter.refresh();syncSourceTask()}if(tab==='schedule'&&window.SYComfortFlow&&SYComfortFlow.refresh)SYComfortFlow.refresh();if(tab==='knowledge'&&window.SY&&SY.renderKnowledgeView)SY.renderKnowledgeView();if(tab==='ai')fillAIContext(false)}
async function fillAIContext(force){
var frame=Q('#embeddedP2Frame'),doc;try{doc=frame&&frame.contentDocument}catch(e){return false}if(!doc)return false;
var t=task(selectedId);if(!t)return false;var ctx=doc.getElementById('p2-task-context'),prompt=doc.getElementById('p2-text');if(!ctx)return false;
if(!force&&ctx.value.trim()&&(ctx.dataset.twAuto!=='1'||ctx.dataset.twTaskId===String(t.id)))return true;
var taskIdNow=String(t.id),a=acct()||{},rows=durationRows(a,t),mats=materialList(t),cp=(Array.isArray(a.taskCheckpoints)?a.taskCheckpoints:[]).filter(function(x){return String(x.taskId)===taskIdNow}).slice(-1)[0];
var sourceRows=[],sourceWarnings=[],toRead=mats.slice(0,6);
for(var i=0;i<toRead.length;i++){
 var m=toRead[i],title=String(m.title||m.name||'未命名资料'),url=String(m.url||''),content=typeof m.content==='string'?m.content:'';
 if(content.trim().length>100){sourceRows.push({title:title,url:url,text:content,readStatus:'fulltext'});continue;}
 try{
  var data=null;
  if((m.path||m.sourcePath)&&(/obsidian|vault|note/i.test(String(m.sourceType||m.kind||m.sourceRef||''))||!url)){
   var pr=await fetch('/api/pm/tutorial-links',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({path:String(m.path||m.sourcePath)})});
   data=await pr.json();if(!pr.ok)throw Error(data.error||'本机笔记读取失败');
  }else if(/^https?:\/\//i.test(url)){
   var rr=await fetch('/api/sources/read',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:url})});
   data=await rr.json();if(!rr.ok)throw Error(data.error||'资料读取失败');
  }else throw Error('没有可读取的 HTTP 链接或笔记路径');
  var textBody=String(data.text||data.content||'');
  if(data.readStatus!=='fulltext'&&textBody.trim().length<100)throw Error(data.error||'后端未返回可核验的完整正文');
  if(textBody.trim().length<100)throw Error('正文过短，不能当作完整资料');
  sourceRows.push({title:String(data.title||title),url:String(data.url||url||m.path||m.sourcePath||''),text:textBody,readStatus:'fulltext'});
  m.readStatus='fulltext';m.lastReadAt=Date.now();m.contentChars=textBody.length;
 }catch(err){sourceWarnings.push(title+'：'+String(err.message||err));sourceRows.push({title:title,url:url,text:'',readStatus:'failed',error:String(err.message||err)});}
}
if(String(window.__SYTaskWorkspaceSelectedTaskId||selectedId)!==taskIdNow)return false;
if(sourceRows.some(function(x){return x.readStatus==='fulltext'})){if(window.SY&&SY.saveAcctData)SY.saveAcctData(a);}
var fullText=sourceRows.map(function(m,i){return '[资料 S'+String(i+1).padStart(2,'0')+'] '+m.title+'\n原链接/路径：'+(m.url||'未返回')+'\n读取状态：'+m.readStatus+(m.error?'\n读取说明：'+m.error:'')+(m.text?'\n正文：'+m.text.slice(0,2600):'\n没有读取到正文；不要引用为已读资料。')}).join('\n\n').slice(0,14500);
var status=a.taskStatusById&&a.taskStatusById[taskIdNow]|| (t.done?'DONE':'ACTIVE');
ctx.value=['当前任务：'+name(t),'任务ID：'+taskIdNow,'任务状态：'+status,'截止：'+due(t),'计划时长：'+minText(t.plannedMinutes||t.estMinutes||t.estimatedMinutes),'该任务历史计时条数：'+rows.length,'关联资料数：'+mats.length,'资料全文与来源：\n'+(fullText||'暂无关联资料。请先在资料中心关联资料。'),'资料读取提醒：'+(sourceWarnings.length?sourceWarnings.join('；'):'所有已尝试读取的资料均已返回可用正文或没有需要读取的资料。'),'最近断点：'+(cp?JSON.stringify({progress:cp.progress,blocker:cp.blocker,nextStep:cp.nextStep,at:cp.at}):'暂无断点'),'请先基于已读取的原文拆解当前任务。每项注明来源编号、硬依赖、软依赖、可并行步骤、交付物、验收标准、估时区间、认知负荷和不确定项。区分真实技术依赖与心理锁定。禁止虚构我已完成的工作。'].join('\n');
ctx.dataset.twAuto='1';ctx.dataset.twTaskId=taskIdNow;ctx.dispatchEvent(new Event('input',{bubbles:true}));
if(force&&prompt){var instr='请结合当前任务与上方真实读取资料，先说明证据与资料缺口，再拆成最小可交付任务；给出依赖关系、产出、验收标准、估时依据、认知负荷风险和建议缓冲。自我介绍、口播/PPT/投递等材料只使用有证据支持的本人经历。资料未读到时不要假装读过。';if(prompt.value.indexOf('请结合当前任务与上方真实读取资料')<0)prompt.value=(prompt.value.trim()?prompt.value.trim()+'\n\n':'')+instr;prompt.dispatchEvent(new Event('input',{bubbles:true}));}
return true;
}
function openAI(){if(!task(selectedId)){alert('请先选择一个原有任务。');return}switchTab('ai');setTimeout(function(){fillAIContext(true);var f=Q('#embeddedP2Frame'),d;try{d=f&&f.contentDocument}catch(e){}var p=d&&d.getElementById('p2-text');if(p)p.focus()},200)}
function recordEnergy(score){var a=acct(),t=task(selectedId);if(!a||!t){set('twEnergySaved','先选择任务，再记录关联精力。');return}var now=Date.now();a.plannerSettings=a.plannerSettings||{};a.plannerSettings.lastCognitiveCheckin={score:score,at:now,source:'任务工作区主动反馈',taskId:String(t.id)};a.plannerSettings.currentEnergyScore=score;a.plannerSettings.currentEnergyLevel=score<=2?'low':score>=4?'high':'medium';a.plannerSettings.energyLevelUpdatedAt=now;a.energyHistory=Array.isArray(a.energyHistory)?a.energyHistory:[];a.energyHistory.push({id:'task-monitor-'+now,date:(window.SY&&SY.todayKey?SY.todayKey():new Date().toISOString().slice(0,10)),at:now,hour:new Date(now).getHours(),score:score,source:'任务工作区主动反馈',taskId:String(t.id)});if(a.energyHistory.length>500)a.energyHistory=a.energyHistory.slice(-500);a.taskStatusById=a.taskStatusById||{};if(score<=2)a.taskStatusById[String(t.id)]='RECOVERY';else if(a.taskStatusById[String(t.id)]==='RECOVERY')a.taskStatusById[String(t.id)]='RESUMABLE';if(score<=2){a.fatigueLog=Array.isArray(a.fatigueLog)?a.fatigueLog:[];a.fatigueLog.push({at:now,score:score,taskId:String(t.id),category:'认知负荷反馈',reason:score===1?'用户反馈：精力被抽干':'用户反馈：读不进去/认知负荷偏高'});if(a.fatigueLog.length>200)a.fatigueLog=a.fatigueLog.slice(-200)}if(window.SY&&SY.saveAcctData)SY.saveAcctData(a);set('twEnergySaved',score<=2?'已保存反馈并将当前任务标记为恢复优先（仍未完成）。建议先保存断点，再生成新的舒适排期。':'已保存 '+score+'/5 的主动反馈，并关联当前任务；可据此重新排期。');render()}
function saveCheckpoint(markStuck){
var a=acct(),t=task(selectedId);if(!a||!t){set('twEnergySaved','请先选择一个原有任务。');return;}
var raw=window.prompt('一次写清断点（可留空的字段写“暂无”）：\n1. 我已经做到哪一步？\n2. 为什么卡住/已试过什么？\n3. 回来后的第一步是什么？','已完成的部分：\n卡点与已尝试：\n恢复后的第一步：');
if(raw===null)return;
var parts=String(raw).split(/\n/),now=Date.now(),checkpoint={id:'cp-'+now,taskId:String(t.id),taskName:name(t),at:now,progress:parts[0]||raw,blocker:parts[1]||'',nextStep:parts.slice(2).join('\n')||'',raw:raw};
a.taskCheckpoints=Array.isArray(a.taskCheckpoints)?a.taskCheckpoints:[];a.taskCheckpoints.push(checkpoint);if(a.taskCheckpoints.length>500)a.taskCheckpoints=a.taskCheckpoints.slice(-500);
a.taskStatusById=a.taskStatusById||{};if(markStuck){a.stuckState={taskId:String(t.id),startedAt:now,at:now,reason:parts[1]||raw,lastProgress:parts[0]||'',attempts:0,nextStep:parts.slice(2).join('\n')||''};a.taskStatusById[String(t.id)]='STUCK';}
a.taskEvents=Array.isArray(a.taskEvents)?a.taskEvents:[];a.taskEvents.push({at:now,taskId:String(t.id),type:markStuck?'STUCK':'CHECKPOINT_SAVED',checkpointId:checkpoint.id});if(a.taskEvents.length>1000)a.taskEvents=a.taskEvents.slice(-1000);
if(window.SY&&SY.saveAcctData)SY.saveAcctData(a);set('twEnergySaved',markStuck?'已保存断点并记录卡壳；原任务仍未完成。':'已保存恢复断点；原任务状态未改为完成。');render();
}
function markWaitingAI(){
var a=acct(),t=task(selectedId);if(!a||!t)return;
a.taskStatusById=a.taskStatusById||{};a.taskStatusById[String(t.id)]='WAITING_AI';
a.taskEvents=Array.isArray(a.taskEvents)?a.taskEvents:[];a.taskEvents.push({at:Date.now(),taskId:String(t.id),type:'WAITING_AI'});if(window.SY&&SY.saveAcctData)SY.saveAcctData(a);
set('twEnergySaved','已标记等待 AI，可先去做不依赖此任务的事项；原任务仍未完成。');render();
}
function resumeTask(){
var a=acct(),t=task(selectedId);if(!a||!t)return;
a.taskStatusById=a.taskStatusById||{};a.taskStatusById[String(t.id)]='RESUMABLE';
a.taskEvents=Array.isArray(a.taskEvents)?a.taskEvents:[];a.taskEvents.push({at:Date.now(),taskId:String(t.id),type:'RESUMABLE'});if(window.SY&&SY.saveAcctData)SY.saveAcctData(a);
set('twEnergySaved','原任务已标记为可恢复；请从已保存的断点继续，未自动标记完成。');render();
}
function bind(){var sel=Q('#twTaskSelect');if(sel)sel.addEventListener('change',function(){selectedId=sel.value;window.__SYTaskWorkspaceSelectedTaskId=selectedId||'';render();syncSourceTask()});QA('[data-tw-tab]').forEach(function(b){b.addEventListener('click',function(){switchTab(b.dataset.twTab)})});QA('[data-tw-go]').forEach(function(b){b.addEventListener('click',function(){var tab=b.dataset.twGo;if(tab==='ai')openAI();else switchTab(tab)})});QA('[data-tw-energy]').forEach(function(b){b.addEventListener('click',function(){recordEnergy(Number(b.dataset.twEnergy))})});document.addEventListener('click',function(ev){var b=ev.target.closest('[data-tw-checkpoint],[data-tw-stuck],[data-tw-wait-ai],[data-tw-resume]');if(!b)return;if(b.hasAttribute('data-tw-checkpoint'))saveCheckpoint(false);else if(b.hasAttribute('data-tw-stuck'))saveCheckpoint(true);else if(b.hasAttribute('data-tw-wait-ai'))markWaitingAI();else if(b.hasAttribute('data-tw-resume'))resumeTask();});var frame=Q('#embeddedP2Frame');if(frame)frame.addEventListener('load',function(){if(window.__syTaskWorkspaceTab==='ai')fillAIContext(false)});document.addEventListener('sy:ready',function(){renderSelect();render()})}
function syncSourceTask(){var sel=Q('#scTask'),t=task(selectedId);if(!sel||!t)return;var o=Array.prototype.slice.call(sel.options).find(function(x){return String(x.value)===String(t.id)});if(o){sel.value=o.value;sel.dispatchEvent(new Event('change',{bubbles:true}))}}
function refresh(){renderSelect();render();syncSourceTask()}
function init(){renderSelect();render();bind();if(!window.__SYTaskWorkspaceHeartbeat){window.__SYTaskWorkspaceHeartbeat=window.setInterval(function(){if(document.visibilityState==='hidden')return;render();},15000);}}
window.SYTaskWorkspace={setTab:switchTab,renderTab:renderTab,refresh:refresh,selectedTask:function(){return task(selectedId)},fillAIContext:fillAIContext,openAI:openAI};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();