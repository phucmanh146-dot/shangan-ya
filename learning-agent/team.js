'use strict';
const $=id=>document.getElementById(id);
let project=null, action=null;
const labels={candidate:'待选择',scheduled:'已排期',in_progress:'进行中',pending_review:'待验收',completed:'已验收',blocked:'卡住'};
function el(tag,text){const node=document.createElement(tag);node.textContent=text;return node;}
function showJSON(id,value){const d=el('details','');d.append(el('summary','查看完整交接数据'),el('pre',JSON.stringify(value,null,2)));$(id).append(d);}
function diagnosisView(){const box=$('diagnosis');box.replaceChildren();const d=project.diagnosis;if(!d){box.append(el('p','等待 A 的诊断'));return;}box.append(el('p','诊断版本 '+d.diagnosis_version));for(const g of d.gaps)box.append(el('h3',g.target_result),el('p','现状：'+g.current_evidence),el('p','优先原因：'+g.priority_reason),el('p','核验状态：'+g.verification_status));for(const u of d.unknowns)box.append(el('p','待确认：'+u));for(const source of d.sources){box.append(el('p','来源：'+source.title));if(source.url&&/^https?:\/\//i.test(source.url)){const a=el('a','打开原文 ↗');a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';box.append(a);}}showJSON('diagnosis',d);}
function proposalView(){const box=$('proposal');box.replaceChildren();const p=project.proposal;if(!p){box.append(el('p',project.plan?'已采用计划 v'+project.plan.plan_version+'，任务见下方。':'等待 B 的计划'));return;}box.append(el('p',p.reason),el('p',`新增 ${p.diff.added.length} 项 · 修改 ${p.diff.changed.length} 项 · 移除 ${p.diff.removed.length} 项`));for(const t of p.plan.tasks)box.append(el('h3',t.title),el('p','第一步：'+t.steps[0]),el('p','交付：'+t.deliverable),el('p','预计 '+t.estimate_minutes_range.join('–')+' 分钟'));for(const note of p.plan.unscheduled)box.append(el('p','未排入日程：'+(typeof note==='string'?note:JSON.stringify(note))));showJSON('proposal',p);}

async function request(path,data){const response=await fetch('/api/agent/team'+path,data?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{});const value=await response.json();if(!response.ok)throw new Error(value.error||'服务不可用');return value;}
function context(){return {project_id:project.project_id,expected_version:project.version};}
async function load(id){project=await request('?id='+encodeURIComponent(id));localStorage.setItem('team-project',id);render();}
async function refresh(){const state=await request('');$('projects').replaceChildren(...state.projects.map(p=>{const option=el('option',p.goal);option.value=p.project_id;return option;}));const id=project?.project_id||localStorage.getItem('team-project');const found=state.projects.find(p=>p.project_id===id)||state.projects[0];if(found){$('projects').value=found.project_id;await load(found.project_id);} $('message').textContent='已读取后端最新状态';}
async function mutate(path,data){const p=await request('/'+path,{...context(),...data});await load(p.project_id);$('message').textContent='已保存 · 版本 '+project.version;}
async function safe(fn){try{await fn();}catch(e){$('message').textContent=e.message;}}
function render(){
 $('project').hidden=false;$('heading').textContent=project.goal;
 $('meta').textContent=`${project.mode==='demo'?'Demo · 示例数据':'真实项目 · 外部交付'} / 版本 ${project.version} / 真实模型与搜索尚未经总控联调验收`;
 $('demo').hidden=project.mode!=='demo'||!!project.diagnosis;
 $('stale').textContent=project.plan_stale?'诊断已更新，现有计划已过期。请 B 更新后再执行。':'';
 diagnosisView();proposalView();
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
safe(refresh);
