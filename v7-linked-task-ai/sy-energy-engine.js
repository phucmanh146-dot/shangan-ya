(function(){
'use strict';
if(window.SYEnergyEngine)return;
function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
function median(xs){if(!xs.length)return 0;xs=xs.slice().sort((a,b)=>a-b);var m=Math.floor(xs.length/2);return xs.length%2?xs[m]:(xs[m-1]+xs[m])/2}
function logs(a,t){var raw=(Array.isArray(a.durationLog)?a.durationLog:[]).filter(r=>Number(r.actualMinutes)>0&&((String(r.taskId||'')===String(t.id))||(String(r.taskName||'').trim().toLowerCase()===String(t.name||'').trim().toLowerCase()&&String(r.category||'')===String(t.category||'')))).sort((x,y)=>Number(x.loggedAt||0)-Number(y.loggedAt||0));var out=[],sum=0;raw.forEach(function(r){sum+=Number(r.actualMinutes)||0;if(r.completedTask===true){out.push({actualMinutes:sum,loggedAt:r.loggedAt});sum=0}});if(!out.length){var legacy=raw.filter(r=>r.completed===true);return legacy.map(r=>({actualMinutes:Number(r.actualMinutes),loggedAt:r.loggedAt}))}return out}
function estimate(a,t){
 var hist=logs(a,t),xs=hist.slice(-8).map(r=>Number(r.actualMinutes)).filter(n=>n>0),level=t.experienceLevel||((t.firstTime)?'new':'unknown');
 var base=median(xs)||Number(t.estMinutes)||Number(t.plannedMinutes)||({heavy:60,main:60,light:15}[String(t.weight||'').toLowerCase()]||30);
 var factor={new:1.35,learning:1.23,familiar:1.14,expert:1.07,unknown:1.25}[level]||1.25;
 var pad=xs.length>=4?1.08:xs.length>=2?1.12:factor;
 var minutes=Math.max(5,Math.ceil(base*pad/5)*5),low,high;
 if(xs.length>=3){low=Math.max(5,Math.floor((xs[Math.floor((xs.length-1)*.25)]||base)/5)*5);high=Math.max(minutes,Math.ceil((xs[Math.ceil((xs.length-1)*.75)]||base)/5)*5)}
 else {low=Math.max(5,Math.floor(base/5)*5);high=Math.ceil(base*factor*1.2/5)*5}
 var prev=xs.length>1?xs[xs.length-2]:0,last=xs.length?xs[xs.length-1]:0;
 return {minutes:minutes,low:Math.min(low,minutes),high:Math.max(high,minutes),base:Math.round(base),samples:xs.length,confidence:xs.length>=4?'高':xs.length>=2?'中':'低',experience:level,attempt:xs.length+1,delta:prev>0?Math.round((prev-last)/prev*100):null,source:xs.length?'个人真实用时':'初始估算'};
}
function energyAt(a,hour){
 var hist=(a.energyHistory||[]).filter(r=>Number(r.hour)===hour&&Number(r.score)>=1&&Number(r.score)<=5).slice(-12);
 if(hist.length>=3){var avg=hist.reduce((s,r)=>s+Number(r.score),0)/hist.length;return avg>=3.7?'high':avg<=2.3?'low':'mid'}
 var periods=Array.isArray(a.energyPeriods)?a.energyPeriods:[];
 var m=hour*60;
 for(var i=0;i<periods.length;i++){var p=periods[i];if(m>=Number(p.startMin||0)&&m<Number(p.endMin||0)){var n=String((p.name||'')+' '+(p.suggestion||''));if(/高精力|深度|high|peak/i.test(n))return'high';if(/低精力|疲惫|休息|low/i.test(n))return'low';return'mid'}}
 return 'mid';
}
function weight(t){var s=String(t.weight||t.taskWeight||t.priority||'').toLowerCase();if(/light|轻|次要/.test(s))return'light';if(/heavy|main|major|重要|紧急|高/.test(s))return'heavy';return'mid'}
function rank(a,t,score,now){
 var due=t.dueDate||'',late=due&&due<now?1000:due===now?600:due?200:0;
 var urgent=t.urgent||/紧急/.test(String(t.priority||'')),important=t.important||/重要/.test(String(t.priority||''));
 var w=weight(t),fit=score<=2?(w==='light'?100:w==='mid'?40:-100):score>=4?(w==='heavy'?100:w==='mid'?60:10):(w==='mid'?80:w==='light'?45:30);
 return late+(urgent?250:0)+(important?180:0)+fit-Number(t.order||0);
}
function build(a,opts){
 var tasks=(a.tasks||[]).filter(t=>!t.done&&!t.completedAt),now=opts.date||new Date().toISOString().slice(0,10);
 var score=clamp(Number(opts.energy)||3,1,5),start=Number(opts.start)||9*60,end=Number(opts.end)||21*60;
 var fixed=(opts.fixed||[]).filter(x=>x&&Number(x.minutes)>0),blocks=[],cursor=start;
 fixed.forEach(x=>{});
 var reserved=Number(opts.meals||60)+Number(opts.rest||45)+Number(opts.leisure||45)+Number(opts.buffer||45);
 var available=Math.max(0,end-start-fixed.reduce((s,x)=>s+Number(x.minutes||0),0)-reserved);
 tasks=tasks.map(t=>({task:t,est:estimate(a,t),rank:rank(a,t,score,now)})).sort((x,y)=>y.rank-x.rank);
 var deepLimit=score<=2?0:score===3?1:2,deepUsed=0;
 tasks.forEach(x=>{
  var t=x.task,w=weight(t),mins=x.est.minutes;
  var tier=score<=2?'low':score>=4?'high':'mid';
  if((score<=2&&w==='heavy')||(tier==='mid'&&w==='heavy'&&deepUsed>=deepLimit))return;
  if(mins>available)return;
  var taskTier=w==='heavy'?'high':w==='light'?'low':tier;
  if(w==='heavy')deepUsed++;
  blocks.push({type:'task',taskId:t.id,name:t.name||'未命名任务',start:cursor,end:cursor+mins,minutes:mins,tier:taskTier,estimate:x.est,reason:(t.dueDate&&t.dueDate<=now?'截止日期优先；':'')+(score<=2?'当前状态优先低负荷；':score>=4?'当前状态适合推进深度任务；':'匹配中等负荷；')+x.est.source});
  cursor+=mins;available-=mins;
  if(available>0&&Number(opts.buffer)>0){var b=Math.min(Number(opts.buffer),available);blocks.push({type:'buffer',name:'机动缓冲 / 切换时间',start:cursor,end:cursor+b,minutes:b});cursor+=b;available-=b}
 });
 if(Number(opts.rest)>0)blocks.push({type:'rest',name:'休息 / 发呆',minutes:Number(opts.rest)});
 if(Number(opts.leisure)>0)blocks.push({type:'leisure',name:'看剧 / 自由娱乐',minutes:Number(opts.leisure)});
 var scheduled=blocks.filter(b=>b.type==='task').reduce((s,b)=>s+b.minutes,0);
 return {blocks:blocks,scheduled:scheduled,available:Math.max(0,Number(opts.end)-Number(opts.start)-reserved),pending:tasks.filter(x=>!blocks.some(b=>String(b.taskId)===String(x.task.id))).map(x=>({id:x.task.id,name:x.task.name,minutes:x.est.minutes,reason:score<=2&&weight(x.task)==='heavy'?'精力较低，建议移到个人高精力窗口':'今日剩余容量不足或需要先处理其他事项'})),energy:score};
}
window.SYEnergyEngine={estimate:estimate,energyAt:energyAt,build:build,weight:weight,clamp:clamp};
})();