'use strict';
const $=id=>document.getElementById(id);
let project=null, action=null, periodProject=null;
const labels={candidate:'待选择',scheduled:'已排期',in_progress:'进行中',pending_review:'待验收',completed:'已验收',blocked:'卡住'};
function el(tag,text){const node=document.createElement(tag);node.textContent=text;return node;}
function showJSON(id,value){const d=el('details','');d.append(el('summary','查看完整交接数据'),el('pre',JSON.stringify(value,null,2)));$(id).append(d);}
function diagnosisView(){const box=$('diagnosis');box.replaceChildren();const d=project.diagnosis;if(!d){box.append(el('p','等待 A 的诊断'));return;}box.append(el('p','诊断版本 '+d.diagnosis_version));for(const g of d.gaps)box.append(el('h3',g.target_result),el('p','现状：'+g.current_evidence),el('p','优先原因：'+g.priority_reason),el('p','核验状态：'+g.verification_status));for(const u of d.unknowns)box.append(el('p','待确认：'+u));for(const source of d.sources){box.append(el('p','来源：'+source.title));if(source.url&&/^https?:\/\//i.test(source.url)){const a=el('a','打开原文 ↗');a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';box.append(a);}}showJSON('diagnosis',d);}
function proposalView(){const box=$('proposal');box.replaceChildren();const p=project.proposal;if(!p){box.append(el('p',project.plan?'已采用计划 v'+project.plan.plan_version+'，任务见下方。':'等待 B 的计划'));return;}box.append(el('p',p.reason),el('p',`新增 ${p.diff.added.length} 项 · 修改 ${p.diff.changed.length} 项 · 移除 ${p.diff.removed.length} 项`));for(const t of p.plan.tasks)box.append(el('h3',t.title),el('p','第一步：'+t.steps[0]),el('p','交付：'+t.deliverable),el('p','预计 '+t.estimate_minutes_range.join('–')+' 分钟'));for(const note of p.plan.unscheduled)box.append(el('p','未排入日程：'+(typeof note==='string'?note:JSON.stringify(note))));showJSON('proposal',p);}

async function request(path,data){const response=await fetch('/api/agent/team'+path,data?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{});const value=await response.json();if(!response.ok)throw new Error(value.error||'服务不可用');return value;}
function context(){return {project_id:project.project_id,expected_version:project.version};}
async function load(id){project=await request('?id='+encodeURIComponent(id));localStorage.setItem('team-project',id);render();}
async function refresh(){const state=await request('');$('projects').replaceChildren(...state.projects.map(p=>{const option=el('option',p.goal);option.value=p.project_id;return option;}));const id=project?.project_id||localStorage.getItem('team-project');const found=state.projects.find(p=>p.project_id===id)||state.projects[0];if(found){$('projects').value=found.project_id;await load(found.project_id);} $('message').textContent='已读取后端最新状态';}
async function mutate(path,data){const p=await request('/'+path,{...context(),...data});if(path==='undo-plan')periodProject=null;await load(p.project_id);$('message').textContent='已保存 · 版本 '+project.version;}
async function safe(fn){try{await fn();}catch(e){$('message').textContent=e.message;}}
function render(){
 $('project').hidden=false;$('heading').textContent=project.goal;
 $('meta').textContent=`${project.mode==='demo'?'Demo · 示例数据':'真实项目 · 外部交付'} / 版本 ${project.version} / 真实模型与搜索尚未经总控联调验收`;
 $('demo').hidden=project.mode!=='demo'||!!project.diagnosis;
 $('stale').textContent=project.plan_stale?'诊断已更新，现有计划已过期。请 B 更新后再执行。':'';
 diagnosisView();proposalView();periodView();
 $('apply').disabled=!project.proposal;
 $('tasks').replaceChildren();
 for(const t of project.plan?.tasks||[]){
  const box=el('article','');box.className='task';box.append(el('h3',t.title+' · '+labels[t.status]),el('p','负责人：'+t.owner_ids.join('、')+' / 差距：'+t.gap_ids.join('、')),el('p','第一步：'+t.steps[0]),el('p','产物：'+t.deliverable),el('p','验收：'+t.acceptance_criteria.join('；')),el('p','预计：'+t.estimate_minutes_range.join('–')+' 分钟 / 截止：'+t.deadline));
  const details=el('details','');details.append(el('summary','查看完整任务、来源与证据'),el('pre',JSON.stringify(t,null,2)));box.append(details);
  const choices=t.status==='pending_review'?[['approve','验收通过'],['reject','退回修改']]:t.status==='completed'?[]:t.status==='in_progress'?[['submit','提交成果'],['block','遇到卡点']]:[['start','开始任务'],['block','遇到卡点']];
  choices.push(['change','临时安排反馈']);if(!t.locked)choices.push(['lock','锁定任务']);
  for(const [kind,label]of choices){const button=el('button',label);button.disabled=project.plan_stale;button.onclick=()=>openFeedback(t,kind,label);box.append(button);}
  $('tasks').append(box);
 }
 if(!project.plan)$('tasks').append(el('p','采用计划后显示任务。'));
 $('feedback').replaceChildren(...project.feedback.map(f=>el('p',`${f.task_id} · ${f.action} · ${f.note}${f.evidence?' / 证据：'+f.evidence:''}`)));
 $('history').replaceChildren(...(project.history||[]).map(h=>el('p',`v${h.version} · ${h.action} · ${h.created}`)));
}
function openFeedback(task,kind,label){action={task_id:task.task_id,action:kind,expected_plan_version:project.plan.plan_version,expected_version:project.version};$('feedback-form').reset();$('feedback-title').textContent=label+' · '+task.title;$('submit-fields').hidden=kind!=='submit';$('review-fields').hidden=!['approve','reject'].includes(kind);$('reviewer').replaceChildren(...project.diagnosis.member_profiles.map(m=>{const option=el('option',m.name||m.member_id);option.value=m.member_id;return option;}));$('dialog-error').textContent='';$('feedback-dialog').showModal();}
$('create').onsubmit=e=>{e.preventDefault();safe(async()=>{project=await request('/create',{goal:$('goal').value,mode:$('mode').value});await refresh();});};
$('projects').onchange=()=>safe(()=>load($('projects').value));$('refresh').onclick=()=>safe(refresh);
$('demo').onclick=()=>safe(()=>mutate('demo',{}));$('apply').onclick=()=>safe(()=>mutate('apply',{proposal_id:project.proposal.id}));
$('diagnosis-form').onsubmit=e=>{e.preventDefault();safe(()=>mutate('diagnosis',{diagnosis:JSON.parse($('diagnosis-json').value)}));};
$('plan-form').onsubmit=e=>{e.preventDefault();safe(()=>mutate('propose',{plan:JSON.parse($('plan-json').value),reason:$('reason').value}));};
$('cancel').onclick=()=>$('feedback-dialog').close();
$('feedback-form').onsubmit=async e=>{e.preventDefault();try{await mutate('feedback',{...action,note:$('note').value,artifact_id:$('artifact-id').value,artifact_version:Number($('artifact-version').value),actual_minutes:Number($('minutes').value),evidence:$('evidence').value,reviewer_id:$('reviewer').value});$('feedback-dialog').close();}catch(error){$('dialog-error').textContent=error.message;}};

function localDay(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
function periodTasks(){const member=$('period-member').value;const saved=(project.proposal?.plan||project.plan)?.replanning_context||{};$('period-tasks').replaceChildren();for(const t of project.plan?.tasks||[]){if(!t.owner_ids.includes(member)||t.owner_ids.length!==1||['completed','pending_review'].includes(t.status))continue;const row=el('div','');const check=document.createElement('input');check.type='checkbox';check.value=t.task_id;check.className='period-choice';check.checked=(saved.selected_task_ids||[]).includes(t.task_id);const label=el('label','');label.append(check,document.createTextNode(' '+t.title+' · '+labels[t.status]));const remaining=document.createElement('input');remaining.type='number';remaining.min='1';remaining.max='100000';remaining.placeholder='剩余分钟';remaining.setAttribute('aria-label',t.title+'剩余分钟');remaining.dataset.remaining=t.task_id;remaining.value=saved.remaining_minutes?.[t.task_id]??(t.status==='in_progress'?'':t.estimate_minutes_range[1]);row.append(label,remaining);$('period-tasks').append(row);}}
function windowLines(rows){return (rows||[]).map(x=>`${x.date} ${x.start} ${x.end}`).join('\n');}
function periodView(){const enabled=!!project.plan&&!project.plan_stale;$('period-preview').disabled=!enabled;$('period-panel').hidden=!project.plan;
 if(periodProject!==project.project_id){periodProject=project.project_id;const c=project.plan?.replanning_context||{};$('period-member').replaceChildren(...(project.diagnosis?.member_profiles||[]).map(m=>{const o=el('option',m.name||m.member_id);o.value=m.member_id;return o;}));if(c.member_id)$('period-member').value=c.member_id;$('period-start').value=c.period_start||localDay();$('period-end').value=c.period_end||'';$('period-windows').value=windowLines(c.windows);$('period-busy').value=windowLines(c.busy);$('full-dates').value=(c.full_dates||[]).join(',');$('daily-limit').value=c.daily_limit??60;$('period-buffer').value=c.buffer_minutes??10;$('period-chunk').value=c.chunk_minutes??25;$('allow-split').checked=c.allow_split===true;}
 // Members may arrive after the project is first created.
 if(!$('period-member').options.length&&project.diagnosis?.member_profiles.length){periodProject=null;return periodView();}
 periodTasks();$('undo-period').disabled=!project.undo_plan||project.undo_at_version!==project.version;
 const proposal=project.proposal, plan=proposal?.plan||project.plan, summary=plan?.schedule_summary;
 $('apply-period').disabled=!proposal||!proposal.plan.schedule_summary;
 const box=$('period-result');box.replaceChildren();if(!summary)return;
 box.append(el('h3',proposal?'时间调整预览（尚未采用）':'已采用的周期安排'),el('p',`本轮待安排 ${summary.needed_minutes} 分钟 / 可用 ${summary.available_minutes} 分钟 / 未排入 ${summary.unallocated_minutes} 分钟`),el('p',summary.fits?'按当前估时与空档，所选任务能排入周期；实际完成仍需验收。':'当前条件下不能全部排入，请处理下面的时间缺口或阻塞。'));
 for(const d of summary.daily)box.append(el('p',`${d.date}：可新安排 ${d.available_minutes} 分钟，保留 ${d.preserved_minutes} 分钟${d.full?' · 已排满':''}`));
 for(const x of summary.unallocated)box.append(el('p',`${x.task_id} 尚有 ${x.minutes} 分钟：${x.reason}`));
 for(const x of summary.options)box.append(el('p','可选处理：'+x));
 for(const x of summary.assumptions)box.append(el('p',x));
 const spans=(title,blocks)=>{box.append(el('h3',title));for(const b of blocks.filter(b=>b.member_id===summary.member_id))box.append(el('p',`${b.task_id} · ${b.start} → ${b.end}${b.locked?' · 锁定':''}`));};
 if(proposal){box.append(el('p','调整原因：'+proposal.reason));spans('原安排',proposal.diff.time_blocks_before);spans('新安排',proposal.diff.time_blocks_after);}else spans('当前日程',plan.time_blocks);
}
function parseWindows(id){return $(id).value.split(/\n/).map(x=>x.trim()).filter(Boolean).map(line=>{const bits=line.split(/\s+/);if(bits.length!==3)throw new Error('每行填写：日期 开始时刻 结束时刻');return {date:bits[0],start:bits[1],end:bits[2]};});}
$('period-member').onchange=periodTasks;
$('today-full').onclick=()=>{const dates=new Set($('full-dates').value.split(/[,，\s]+/).filter(Boolean));dates.add(localDay());$('full-dates').value=[...dates].join(',');};
$('period-form').onsubmit=async e=>{e.preventDefault();$('period-error').textContent='';try{const selected=[...document.querySelectorAll('.period-choice:checked')].map(x=>x.value);const remaining={};for(const input of document.querySelectorAll('[data-remaining]'))if(selected.includes(input.dataset.remaining)&&input.value)remaining[input.dataset.remaining]=Number(input.value);
 await mutate('period-replan',{expected_plan_version:project.plan.plan_version,reason:$('period-reason').value,constraints:{member_id:$('period-member').value,period_start:$('period-start').value,period_end:$('period-end').value,windows:parseWindows('period-windows'),busy:parseWindows('period-busy'),full_dates:$('full-dates').value.split(/[,，\s]+/).filter(Boolean),daily_limit:Number($('daily-limit').value),buffer_minutes:Number($('period-buffer').value),chunk_minutes:Number($('period-chunk').value),allow_split:$('allow-split').checked,selected_task_ids:selected,remaining_minutes:remaining}});
 }catch(error){$('period-error').textContent=error.message;}};
$('apply-period').onclick=()=>safe(()=>mutate('apply',{proposal_id:project.proposal.id}));$('undo-period').onclick=()=>safe(()=>mutate('undo-plan',{}));
safe(refresh);
