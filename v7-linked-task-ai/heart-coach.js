(function(){
'use strict';
const root=document.getElementById('view-heart-coach');
if(!root||root.dataset.hcMounted==='1')return;
root.dataset.hcMounted='1';
const $=id=>root.querySelector('#'+id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let selectedTaskId='';
let fallbackEnergy=3;
let noticeTimer=null;
function account(){try{return window.SY&&typeof SY.getAcctData==='function'?SY.getAcctData():null}catch(e){return null}}
function save(a){try{if(window.SY&&typeof SY.saveAcctData==='function'){SY.saveAcctData(a);return true}}catch(e){}return false}
const LOCAL_KEY='shanganya.energyflow.local.v1';
function localProfile(){try{return JSON.parse(localStorage.getItem(LOCAL_KEY)||'{}')||{}}catch(e){return {}}}
function saveLocalProfile(p){try{localStorage.setItem(LOCAL_KEY,JSON.stringify(p));return true}catch(e){return false}}
function tasks(){const a=account()||{};return (Array.isArray(a.tasks)?a.tasks:[]).filter(t=>t&&!t.deleted)}
function taskName(t){return String(t&&(t.name||t.title||t.text)||'未命名任务')}
function taskDone(t){return !!(t&&(t.done||t.completedAt))}
function currentTask(){const ts=tasks(),a=account()||{};return ts.find(t=>String(t.id)===String(selectedTaskId))||ts.find(t=>String(t.id)===String((a.activeTimer||{}).taskId))||ts.find(t=>String(t.id)===String(a.priorityFocusTaskId))||ts.find(t=>!taskDone(t))||ts[0]||null}
function durationLabel(t){const n=Number(t&&(t.plannedMinutes||t.estMinutes||t.estimatedMinutes||t.durationMinutes)||0);return n>0?(n>=60?Math.floor(n/60)+'小时'+(n%60?Math.round(n%60)+'分钟':''):Math.round(n)+'分钟'):'未设置估时'}
function statusLabel(t,a){if(taskDone(t))return '已完成';const s=a.taskStatusById&&a.taskStatusById[String(t.id)]||'';return ({RECOVERY:'恢复优先',RESUMABLE:'可继续',STUCK:'已卡住',WAITING_AI:'等待 AI',SWITCHED:'已切换，待续'})[s]||'待推进'}
function notify(msg){const el=$('hcNotice');if(!el)return;el.textContent=msg;el.hidden=false;if(noticeTimer)clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>el.hidden=true,3200)}
function latestEnergy(a){const local=localProfile(),c=local.lastCognitiveCheckin;const p=a&&a.plannerSettings||{};const n=Number(c&&c.score||p.currentEnergyScore||fallbackEnergy);return n>=1&&n<=5?n:fallbackEnergy}
function setEnergy(v){fallbackEnergy=Number(v);root.querySelectorAll('[data-hc-energy]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.hcEnergy)===fallbackEnergy)));const copy={
1:['先恢复，不硬攻难题','建议暂停高认知任务，喝水、走动或发呆 10–15 分钟。先保存断点，再决定是否继续。'],
2:['降低任务阻力','优先做一个 10 分钟内可完成的轻任务；把当前难题缩小成一个可验证动作。'],
3:['短时推进，保留缓冲','先做一个 15 分钟内可验证的动作；若没有进展，保存上下文后重新排期。'],
4:['把专注留给最重要的事','可以推进一段重要任务，但设定检查点，不默认精力全天不变。'],
5:['趁状态好，攻克关键一步','把高专注留给最重要的任务，安排 25–40 分钟冲刺，并保留恢复时间。']
};const item=copy[fallbackEnergy]||copy[3];$('hcStateAdvice').innerHTML='<strong>'+item[0]+'</strong>'+item[1];$('hcEnergyMetric').textContent=fallbackEnergy+'/5';$('hcEnergyCaption').textContent=['','很低 · 优先恢复','偏低 · 降低负荷','中等 · 短段推进','较好 · 推进重要任务','很高 · 深度专注'][fallbackEnergy];}
function saveEnergy(){const a=account();if(!a){notify('尚未读取到上岸鸭任务数据。请先登录原工作台。');return}const t=currentTask(),now=Date.now(),score=fallbackEnergy,p=localProfile();p.lastCognitiveCheckin={score,rawScore:score*2,at:now,source:'心航本地精力反馈',taskId:t?String(t.id):''};p.energyHistory=Array.isArray(p.energyHistory)?p.energyHistory:[];p.energyHistory.push({id:'heart-coach-'+now,date:window.SY&&SY.todayKey?SY.todayKey():new Date().toISOString().slice(0,10),at:now,hour:new Date(now).getHours(),score,rawScore:score*2,source:'心航本地精力反馈',taskId:t?String(t.id):'',localOnly:true});if(p.energyHistory.length>500)p.energyHistory=p.energyHistory.slice(-500);if(score<=2){p.fatigueLog=Array.isArray(p.fatigueLog)?p.fatigueLog:[];p.fatigueLog.push({at:now,score,taskId:t?String(t.id):'',category:'认知负荷反馈',reason:score===1?'心航反馈：精力被抽干':'心航反馈：精力偏低'});if(p.fatigueLog.length>200)p.fatigueLog=p.fatigueLog.slice(-200)}p.taskEvents=Array.isArray(p.taskEvents)?p.taskEvents:[];p.taskEvents.push({at:now,taskId:t?String(t.id):'',type:'HEART_COACH_ENERGY',score});if(p.taskEvents.length>1000)p.taskEvents=p.taskEvents.slice(-1000);if(!saveLocalProfile(p)){notify('浏览器本地存储不可用，精力记录未保存。');return}renderTasks();notify(score<=2?'精力记录已保存在本地；建议先恢复，不会改动任务完成状态。':'精力反馈已保存在本地，可用于后续排期。')}
function todayKey(){return window.SY&&SY.todayKey?SY.todayKey():new Date().getFullYear()+'-'+String(new Date().getMonth()+1).padStart(2,'0')+'-'+String(new Date().getDate()).padStart(2,'0')}
function findTaskCard(id){return Array.from(document.querySelectorAll('.app-task[data-id]')).find(el=>String(el.dataset.id)===String(id))||null}
function startTask(id){
 const a=account(),t=tasks().find(x=>String(x.id)===String(id));if(!a||!t){notify('没有找到这项原任务。');return}
 selectedTaskId=String(id);
 const card=findTaskCard(id),btn=card&&card.querySelector('[data-start-id]');
 if(btn){btn.click();renderTasks();notify('已调用原工作台的任务开始/计时入口；摄像头如需使用，请在精力中枢中主动开启。');return}
 const now=Date.now(),old=a.activeTimer||{};
 if(old.taskId&&String(old.taskId)!==String(id)&&old.runningSince){old.accumulatedMs=(Number(old.accumulatedMs)||0)+(now-Number(old.runningSince));old.runningSince=null;a.activeTimer=old;a.taskStatusById=a.taskStatusById||{};a.taskStatusById[String(old.taskId)]='SWITCHED'}
 const same=String(old.taskId)===String(id);a.activeTimer={taskId:String(id),accumulatedMs:same?Number(old.accumulatedMs)||0:0,runningSince:now};
 a.taskEvents=Array.isArray(a.taskEvents)?a.taskEvents:[];a.taskEvents.push({at:now,taskId:String(id),type:'TASK_STARTED',source:'个人执行教练'});if(a.taskEvents.length>1000)a.taskEvents=a.taskEvents.slice(-1000);
 if(!save(a)){notify('开始失败：原账号数据未能保存。');return}renderTasks();notify('已开始任务计时。摄像头预览不会自动开启。')
}
function openScheduleEditor(id){
 const a=account(),t=tasks().find(x=>String(x.id)===String(id));if(!a||!t){notify('没有找到这项原任务。');return}
 const modal=document.createElement('div');modal.className='hc-schedule-overlay';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','编辑任务时间');
 const clock=n=>typeof n==='number'?String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0'):'';
 const start=typeof t.startMinutes==='number'?t.startMinutes:null,planned=Number(t.plannedMinutes||t.estMinutes||t.estimatedMinutes||40);
 const end=start===null?'':clock(start+planned);
 modal.innerHTML='<form class="hc-schedule-modal"><div class="hc-schedule-head"><div><small>任务时间安排</small><h3>编辑：'+esc(taskName(t))+'</h3></div><button type="button" class="hc-schedule-close" aria-label="关闭">×</button></div><label>安排日期<input type="date" name="date" required value="'+esc(t.date||todayKey())+'"></label><div class="hc-schedule-two"><label>固定开始时间<input type="time" name="start" value="'+clock(start)+'"></label><label>固定结束时间<input type="time" name="end" value="'+end+'"></label></div><label>预计用时（分钟）<input type="number" name="estimate" min="5" max="1440" step="5" value="'+planned+'"></label><div class="hc-schedule-two"><label>硬截止日期<input type="date" name="dueDate" value="'+esc(t.dueDate||'')+'"></label><label>截止时刻<input type="time" name="dueTime" value="'+esc(t.dueTime||'')+'"></label></div><p class="hc-schedule-hint">填开始和结束时间＝固定时段；清空开始时间＝留给自动排期。截止时间与执行时间分开保存。</p><div class="hc-schedule-actions"><button type="button" class="hc-btn secondary hc-schedule-close">取消</button><button type="submit" class="hc-btn">保存时间</button></div></form>';
 document.body.appendChild(modal);const form=modal.querySelector('form');
 function close(){modal.remove()}
 modal.querySelectorAll('.hc-schedule-close').forEach(b=>b.addEventListener('click',close));
 modal.addEventListener('click',e=>{if(e.target===modal)close()});
 form.addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(form),date=String(fd.get('date')||''),startStr=String(fd.get('start')||''),endStr=String(fd.get('end')||''),estimate=Math.max(5,Math.min(1440,Number(fd.get('estimate'))||40)),dueDate=String(fd.get('dueDate')||''),dueTime=String(fd.get('dueTime')||'');
 let mins=estimate,startMinutes=null;
 if(startStr){const sp=startStr.split(':').map(Number);startMinutes=sp[0]*60+sp[1];if(endStr){const ep=endStr.split(':').map(Number),endMinutes=ep[0]*60+ep[1];if(endMinutes<=startMinutes){notify('结束时间必须晚于开始时间；跨午夜任务请拆成两段。');return}mins=endMinutes-startMinutes}}
 const live=account(),target=(live&&Array.isArray(live.tasks)?live.tasks:[]).find(x=>String(x.id)===String(id));if(!live||!target){notify('保存失败：原任务已不存在。');return}
 target.date=date;target.plannedMinutes=mins;target.estMinutes=estimate;if(startMinutes===null){delete target.startMinutes;target.fixedTime=false}else{target.startMinutes=startMinutes;target.fixedTime=true}
 target.dueDate=dueDate;target.dueTime=dueTime;
 live.taskEvents=Array.isArray(live.taskEvents)?live.taskEvents:[];live.taskEvents.push({at:Date.now(),taskId:String(id),type:'TASK_SCHEDULE_EDITED',date:date,startMinutes:startMinutes,plannedMinutes:mins,dueDate:dueDate,dueTime:dueTime});if(live.taskEvents.length>1000)live.taskEvents=live.taskEvents.slice(-1000);
 if(!save(live)){notify('保存失败：原账号数据未能写入。');return}close();renderTasks();document.dispatchEvent(new Event('sy:ready'));notify('已保存任务日期、时间和截止信息。')
 });
 const startInput=form.elements.start,endInput=form.elements.end,estimateInput=form.elements.estimate;
 startInput.addEventListener('change',()=>{if(startInput.value&&!endInput.value){const p=Math.max(5,Number(estimateInput.value)||40),sp=startInput.value.split(':').map(Number),n=sp[0]*60+sp[1]+p;endInput.value=String(Math.floor(n/60)%24).padStart(2,'0')+':'+String(n%60).padStart(2,'0')}});
 endInput.addEventListener('change',()=>{if(startInput.value&&endInput.value){const s=startInput.value.split(':').map(Number),e=endInput.value.split(':').map(Number),d=e[0]*60+e[1]-s[0]*60-s[1];if(d>0)estimateInput.value=d}});
}
function urgentInsert(){
 const a=account();if(!a){notify('请先登录原工作台。');return}
 const title=window.prompt('突然出现的任务是什么？\n写下必须完成的具体事项：');if(title===null||!title.trim())return;
 const minutes=Number(window.prompt('预计需要多少分钟？','30'));if(!Number.isFinite(minutes)||minutes<5||minutes>720){notify('请输入 5–720 分钟之间的预计用时。');return}
 const dueDate=window.prompt('这项临时任务有硬截止日期吗？（可留空，格式 YYYY-MM-DD）','')||'';
 if(dueDate&&!/^\\d{4}-\\d{2}-\\d{2}$/.test(dueDate)){notify('截止日期格式应为 YYYY-MM-DD。任务未创建。');return}
 const now=Date.now(),date=todayKey(),id='urgent-'+now,old=a.activeTimer||{};
 if(old.taskId&&old.runningSince){old.accumulatedMs=(Number(old.accumulatedMs)||0)+(now-Number(old.runningSince));old.runningSince=null;a.activeTimer=old;a.taskStatusById=a.taskStatusById||{};a.taskStatusById[String(old.taskId)]='SWITCHED'}
 const startMinutes=(new Date()).getHours()*60+(new Date()).getMinutes();
 const task={id:id,name:title.trim(),title:title.trim(),category:'工作',date:date,startMinutes:startMinutes,plannedMinutes:Math.round(minutes/5)*5,estMinutes:Math.round(minutes/5)*5,dueDate:dueDate,dueTime:'',urgent:true,important:true,priority:'紧急',done:false,createdAt:new Date(now).toISOString(),source:'临时插入'};
 a.tasks=Array.isArray(a.tasks)?a.tasks:[];a.tasks.push(task);a.activeTimer={taskId:id,accumulatedMs:0,runningSince:now};a.taskStatusById=a.taskStatusById||{};a.taskStatusById[id]='ACTIVE';a.taskEvents=Array.isArray(a.taskEvents)?a.taskEvents:[];a.taskEvents.push({at:now,taskId:id,type:'URGENT_TASK_INSERTED',title:title.trim(),pausedTaskId:old.taskId||''});if(a.taskEvents.length>1000)a.taskEvents=a.taskEvents.slice(-1000);
 if(!save(a)){notify('临时任务保存失败；没有确认写入。');return}selectedTaskId=id;renderTasks();notify('已插入紧急任务并切换计时；原任务已保留为待续状态。')
}
function renderTasks(){
 const list=$('hcTaskList');if(!list)return;const a=account()||{},all=tasks();
 if(!selectedTaskId){const t=currentTask();selectedTaskId=t?String(t.id):''}
 const sorted=all.slice().sort((x,y)=>Number(taskDone(x))-Number(taskDone(y)));
 const visible=sorted.slice(0,8);$('hcDoneCount').textContent=all.filter(taskDone).length;$('hcTotalCount').textContent=all.length;
 if(!all.length){list.innerHTML='<div class="hc-empty"><strong>还没有读取到真实任务</strong><p>请先登录上岸鸭，在「每日清单」新增任务；这里会读取同一份任务数据，不会编造任务。</p><button class="hc-btn secondary" type="button" data-hc-open-daily>去每日清单 ↗</button></div>';return}
 if(!$('hcUrgentInsert')){const b=document.createElement('button');b.id='hcUrgentInsert';b.type='button';b.className='hc-btn hc-urgent-btn';b.textContent='⚡ 临时出现任务｜暂停当前并重排';list.parentNode.insertBefore(b,list)}
 list.innerHTML=visible.map(t=>{const id=String(t.id),done=taskDone(t),active=id===String(selectedTaskId),status=statusLabel(t,a),start=typeof t.startMinutes==='number'?String(Math.floor(t.startMinutes/60)).padStart(2,'0')+':'+String(t.startMinutes%60).padStart(2,'0'):'未固定时间',date=t.date||'待安排',end=typeof t.startMinutes==='number'?String(Math.floor((t.startMinutes+Number(t.plannedMinutes||t.estMinutes||40))%1440/60)).padStart(2,'0')+':'+String((t.startMinutes+Number(t.plannedMinutes||t.estMinutes||40))%60).padStart(2,'0'):'';return '<div class="hc-task'+(done?' is-done':'')+(active?' is-current':'')+'" data-hc-task="'+esc(id)+'"><button class="hc-task-check" type="button" data-hc-toggle-done="'+esc(id)+'" aria-label="'+(done?'取消完成':'标记完成')+'" aria-pressed="'+String(done)+'">'+(done?'✓':'')+'</button><div class="hc-task-main"><strong>'+esc(taskName(t))+'</strong><small>'+esc(status)+' · '+esc(date)+' · '+esc(start+(end?'–'+end:''))+' · 预计 '+esc(durationLabel(t))+(t.dueDate?' · 截止 '+esc(t.dueDate+(t.dueTime?' '+t.dueTime:'')):' · 未设硬截止')+'</small></div><div class="hc-task-row-actions"><button class="hc-task-start" type="button" data-hc-start="'+esc(id)+'" '+(done?'disabled':'')+'>▶ 开始</button><button class="hc-task-edit" type="button" data-hc-edit-time="'+esc(id)+'">编辑时间</button><button class="hc-task-select" type="button" data-hc-select-task="'+esc(id)+'">'+(active?'当前任务':'设为当前')+'</button></div></div>'}).join('');
 const t=currentTask();$('hcCurrentTaskTitle').textContent=t?taskName(t):'请先选择任务';$('hcCurrentTaskMeta').textContent=t?'任务状态：'+statusLabel(t,a)+' · 计划：'+durationLabel(t)+(t.date?' · '+t.date:''):'当前没有可执行的真实任务';
 const timer=a.activeTimer||{},isThis=t&&String(timer.taskId)===String(t.id);$('hcTimerHint').textContent=isThis?(timer.runningSince?'已同步原任务计时，不会另起一套计时':'原任务计时已暂停'):'计时会写入上岸鸭原有 activeTimer 数据';$('hcTimerButton').textContent=isThis&&timer.runningSince?'暂停计时':'开始计时';renderClock()
}
function fmt(sec){sec=Math.max(0,sec);return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0')}
function renderClock(){const a=account()||{},t=currentTask(),timer=a.activeTimer||{};if(!t||String(timer.taskId)!==String(t.id)){$('hcClock').textContent='00:00';return}const elapsed=Math.floor((Number(timer.accumulatedMs)||0)/1000)+(timer.runningSince?Math.floor((Date.now()-Number(timer.runningSince))/1000):0);$('hcClock').textContent=fmt(elapsed)}
function timerAction(){const a=account(),t=currentTask();if(!a||!t){notify('请先在每日清单创建一个真实任务。');return}const now=Date.now(),timer=a.activeTimer||{};if(timer.taskId&&String(timer.taskId)!==String(t.id)&&(timer.runningSince||Number(timer.accumulatedMs)>0)){notify('另一个任务保留着计时记录。请先切回该任务继续/清零，避免覆盖原计时数据。');return}if(String(timer.taskId)===String(t.id)&&timer.runningSince){timer.accumulatedMs=(Number(timer.accumulatedMs)||0)+(now-Number(timer.runningSince));timer.runningSince=null;a.activeTimer=timer;notify('已暂停原任务计时')}else{a.activeTimer={taskId:String(t.id),accumulatedMs:String(timer.taskId)===String(t.id)?Number(timer.accumulatedMs)||0:0,runningSince:now};notify('已开始记录原任务计时')}if(!save(a)){notify('原账号数据保存失败，计时未确认写入。');return}renderTasks()}
function resetTimer(){const a=account(),t=currentTask();if(!a||!t||String((a.activeTimer||{}).taskId)!==String(t.id)){notify('当前任务没有对应的原始计时记录。');return}if(!window.confirm('确定清零这个任务的计时？此操作会清除当前计时累计值。'))return;a.activeTimer={taskId:String(t.id),accumulatedMs:0,runningSince:null};if(save(a)){renderTasks();notify('当前任务计时已清零')}else notify('计时数据保存失败。')}
function toggleDone(id){const a=account();if(!a){notify('请先登录原工作台。');return}const t=tasks().find(x=>String(x.id)===String(id));if(!t)return;const isDone=taskDone(t);if(isDone&&!window.confirm('要把这项任务恢复为未完成吗？'))return;if(isDone){t.done=false;delete t.completedAt;if(a.taskStatusById)a.taskStatusById[String(t.id)]='RESUMABLE'}else{t.done=true;t.completedAt=new Date().toISOString();a.taskStatusById=a.taskStatusById||{};delete a.taskStatusById[String(t.id)];if(a.activeTimer&&String(a.activeTimer.taskId)===String(t.id)){a.activeTimer.runningSince=null}}a.taskEvents=Array.isArray(a.taskEvents)?a.taskEvents:[];a.taskEvents.push({at:Date.now(),taskId:String(t.id),type:isDone?'TASK_REOPENED':'TASK_COMPLETED',source:'心航'});if(a.taskEvents.length>1000)a.taskEvents=a.taskEvents.slice(-1000);if(!save(a)){notify('任务状态保存失败，未能确认修改。');return}renderTasks();notify(isDone?'已恢复为未完成':'已将原任务标记完成')}
function stuck(){const a=account(),t=currentTask();if(!a||!t){notify('没有可关联的真实任务，请先创建或选择任务。');return}const raw=window.prompt('保存当前任务断点，三行分别写：\n1. 已经做到哪一步\n2. 卡在哪里 / 试过什么\n3. 恢复后的第一步','已完成的部分：\n卡点与已尝试：\n恢复后的第一步：');if(raw===null)return;const p=String(raw).split(/\n/),now=Date.now(),cp={id:'cp-'+now,taskId:String(t.id),taskName:taskName(t),at:now,progress:p[0]||raw,blocker:p[1]||'',nextStep:p.slice(2).join('\n')||'',raw};a.taskCheckpoints=Array.isArray(a.taskCheckpoints)?a.taskCheckpoints:[];a.taskCheckpoints.push(cp);if(a.taskCheckpoints.length>500)a.taskCheckpoints=a.taskCheckpoints.slice(-500);a.taskStatusById=a.taskStatusById||{};a.taskStatusById[String(t.id)]='STUCK';a.stuckState={taskId:String(t.id),startedAt:now,at:now,reason:p[1]||raw,lastProgress:p[0]||'',attempts:0,nextStep:p.slice(2).join('\n')||''};a.taskEvents=Array.isArray(a.taskEvents)?a.taskEvents:[];a.taskEvents.push({at:now,taskId:String(t.id),type:'STUCK',checkpointId:cp.id,source:'心航'});if(a.taskEvents.length>1000)a.taskEvents=a.taskEvents.slice(-1000);if(save(a)){renderTasks();$('hcStuckPlan').hidden=false;$('hcStuckPlan').innerHTML='<strong>断点已保存到原任务记录</strong><ol><li>先保留已完成的部分，不重复返工。</li><li>把下一步缩小成 10–15 分钟内可以验证的动作。</li><li>如果精力偏低，先切换轻任务；恢复时从刚才保存的断点继续。</li></ol><button class="hc-btn secondary" type="button" data-hc-open-workspace>进入原任务工作区继续处理 ↗</button>';notify('已把卡点写入原任务记录；原任务未被标记完成。')}else notify('保存断点失败，未确认写入。')}
function openView(name){if(window.SY&&typeof SY.switchAppView==='function'){SY.switchAppView(name);return}const b=document.querySelector('#appNav [data-view="'+name+'"]');if(b)b.click()}
function showAiDemo(){const a=account(),t=currentTask();if(!a||!t){notify('请先选择一个真实任务。');return}if(window.SYRescue&&typeof SYRescue.open==='function'){SYRescue.open({task:t});notify('已将当前原任务交给已配置的 AI 解卡入口。');return}openView('task-workspace');window.setTimeout(()=>{const sel=document.getElementById('twTaskSelect');if(sel){sel.value=String(t.id);sel.dispatchEvent(new Event('change',{bubbles:true}))}const ai=document.getElementById('sy-task-ai-link');if(ai)ai.click();else notify('已打开原任务工作区；请从 AI 标签继续，未伪造模型回答。')},350)}
root.addEventListener('click',e=>{
const en=e.target.closest('[data-hc-energy]');if(en){setEnergy(en.dataset.hcEnergy);return}
const urgent=e.target.closest('#hcUrgentInsert');if(urgent){urgentInsert();return}
const startBtn=e.target.closest('[data-hc-start]');if(startBtn){startTask(startBtn.dataset.hcStart);return}
const editBtn=e.target.closest('[data-hc-edit-time]');if(editBtn){openScheduleEditor(editBtn.dataset.hcEditTime);return}
const select=e.target.closest('[data-hc-select-task]');if(select){selectedTaskId=select.dataset.hcSelectTask;renderTasks();notify('当前任务已切换，后续精力与计时将关联这项原任务。');return}
const done=e.target.closest('[data-hc-toggle-done]');if(done){toggleDone(done.dataset.hcToggleDone);return}
if(e.target.closest('#hcSaveFeedback')){saveEnergy();return}
if(e.target.closest('#hcTimerButton')){timerAction();return}
if(e.target.closest('#hcResetTimer')){resetTimer();return}
if(e.target.closest('#hcStuck')){stuck();return}
if(e.target.closest('#hcAiHelp')){showAiDemo();return}
if(e.target.closest('[data-hc-open-daily]')||e.target.closest('#hcOpenDaily')||e.target.closest('#hcOpenDaily2')){openView('daily');return}
if(e.target.closest('#hcOpenTaskWorkspace')||e.target.closest('#hcOpenTaskWorkspace2')||e.target.closest('[data-hc-open-workspace]')){openView('task-workspace');return}
});
const a=account()||{};fallbackEnergy=latestEnergy(a);setEnergy(fallbackEnergy);renderTasks();setInterval(renderClock,1000);setInterval(()=>{if(!root.hidden)renderTasks()},5000);
window.addEventListener('storage',renderTasks);window.addEventListener('focus',renderTasks);document.addEventListener('sy:ready',renderTasks);
})();