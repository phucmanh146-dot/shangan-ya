(function(){
'use strict';
const root=document.getElementById('view-heart-coach');if(!root||root.dataset.hcMounted==='1')return;root.dataset.hcMounted='1';
const $=id=>root.querySelector('#'+id);
const key='shanganya-heart-coach-v1';
let state={energy:3,task:'需求拆解：明确这次要交付什么',elapsed:0,running:false,startedAt:0,completed:[],lastFeedback:'',stuck:false};
try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved)state={...state,...saved,running:false,startedAt:0}}catch(e){}
function persist(){try{localStorage.setItem(key,JSON.stringify({...state,running:false,startedAt:0}))}catch(e){}}
function notify(msg){const el=$('hcNotice');if(!el)return;el.textContent=msg;el.hidden=false;clearTimeout(notify.t);notify.t=setTimeout(()=>el.hidden=true,2600)}
function setEnergy(v){state.energy=Number(v);root.querySelectorAll('[data-hc-energy]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.hcEnergy)===state.energy)));const copy={
1:['先恢复，不硬攻难题','建议暂停高认知任务 10–15 分钟。喝水、走动或发呆，之后再决定是否继续。'],
2:['降低任务阻力','选择一个 10 分钟内能完成的轻任务，或把当前任务缩小成一个明确步骤。'],
3:['短时推进，保留缓冲','先做一个 15 分钟内可验证的动作；如果没有进展，进入 AI 解卡或重新排期。'],
4:['把专注留给最重要的事','可以推进一段高难度任务，但仍设置检查点，避免默认精力全天不变。']
};$('hcStateAdvice').innerHTML='<strong>'+copy[state.energy][0]+'</strong>'+copy[state.energy][1];$('hcEnergyMetric').textContent=state.energy+'/4';$('hcEnergyCaption').textContent=['','低 · 优先恢复','偏低 · 轻量任务','中等 · 短段推进','较好 · 重要任务'][state.energy];persist()}
function fmt(sec){sec=Math.max(0,sec);return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0')}
function renderClock(){const total=state.elapsed+(state.running?Math.floor((Date.now()-state.startedAt)/1000):0);$('hcClock').textContent=fmt(total);$('hcTimerButton').textContent=state.running?'暂停计时':'开始计时';$('hcTimerHint').textContent=state.running?'正在记录当前演示任务时间':'计时只记录执行时长；卡壳或休息可暂停并记录'}
function renderTasks(){root.querySelectorAll('[data-hc-task]').forEach(el=>{const name=el.dataset.hcTask;const done=state.completed.includes(name);el.classList.toggle('is-done',done);el.querySelector('.hc-task-check').setAttribute('aria-label',done?'取消完成':'标记完成');el.querySelector('.hc-task-check').setAttribute('aria-pressed',String(done));el.querySelector('.hc-task-check').textContent=done?'✓':''});$('hcDoneCount').textContent=state.completed.length}
root.addEventListener('click',e=>{
 const energy=e.target.closest('[data-hc-energy]');if(energy){setEnergy(energy.dataset.hcEnergy);return}
 const task=e.target.closest('[data-hc-task-toggle]');if(task){const name=task.closest('[data-hc-task]').dataset.hcTask;state.completed=state.completed.includes(name)?state.completed.filter(x=>x!==name):[...state.completed,name];persist();renderTasks();notify('已更新演示任务状态');return}
 if(e.target.closest('#hcTimerButton')){if(state.running){state.elapsed+=Math.floor((Date.now()-state.startedAt)/1000);state.running=false;state.startedAt=0}else{state.running=true;state.startedAt=Date.now()}persist();renderClock();return}
 if(e.target.closest('#hcResetTimer')){state.elapsed=0;state.running=false;state.startedAt=0;persist();renderClock();notify('计时已重置');return}
 if(e.target.closest('#hcAiHelp')){const out=$('hcAiOutput');out.classList.add('show');out.innerHTML='<strong>当前演示建议（尚未调用真实模型）</strong><ol><li>用一句话写清这项任务最终要交付的结果。</li><li>把最近一次尝试和具体错误记录下来，避免重复试同一条路。</li><li>设定 10–15 分钟的最小验证；如果仍无进展，保存上下文后切换轻任务。</li></ol><p style="margin:8px 0 0">要调用真实 AI，请从左侧进入「任务工作区」，选择实际任务并提供错误信息或关联资料。</p>';return}
 if(e.target.closest('#hcOpenTaskWorkspace')){if(window.SY&&typeof window.SY.switchAppView==='function')window.SY.switchAppView('task-workspace');else{const b=document.querySelector('#appNav [data-view="task-workspace"]');if(b)b.click()}return}
 if(e.target.closest('#hcOpenDaily')){if(window.SY&&typeof window.SY.switchAppView==='function')window.SY.switchAppView('daily');else{const b=document.querySelector('#appNav [data-view="daily"]');if(b)b.click()}return}
 if(e.target.closest('#hcStuck')){$('hcStuckPlan').hidden=false;$('hcStuckPlan').innerHTML='<strong>建议先止损，保住后续安排</strong><ol><li>暂停当前计时，保存已经尝试的步骤与错误信息。</li><li>判断是否能在 15 分钟内完成一个最小验证。</li><li>如果不能，先切换到必要的轻任务，并把当前任务保留为「未完成 / 待继续」。</li></ol><button class="hc-btn secondary" id="hcOpenTaskWorkspace" type="button">进入任务工作区处理 ↗</button>';state.stuck=true;persist();notify('已展开示例止损方案');return}
 if(e.target.closest('#hcSaveFeedback')){state.lastFeedback=new Date().toISOString();persist();notify('本次精力反馈已保存在当前浏览器');return}
});
setEnergy(state.energy);renderTasks();renderClock();setInterval(renderClock,1000);
})();