/* Screenshot-2 navigation restoration. Reuse the V8 app views and task store.
   No changes to task data, router or existing event handlers. */
(function(){
'use strict';
function label(button,name){var s=button&&button.querySelector('span:last-child');if(s)s.textContent=name;}
function openView(view){if(window.SY&&typeof SY.switchAppView==='function')SY.switchAppView(view);else{var b=document.querySelector('#appNav [data-view="'+view+'"]');if(b)b.click()}}
function arrange(){
 var nav=document.getElementById('appNav');if(!nav||nav.dataset.screenshotTwo==='1')return;
 var buttons={};nav.querySelectorAll('.app-nav-item[data-view]').forEach(function(b){buttons[b.dataset.view]=b});
 if(!buttons.daily||!buttons.quadrant||!buttons.deadlines||!buttons['task-intake'])return;
 nav.dataset.screenshotTwo='1';
 var others=[];
 ['daily','task-workspace','quadrant','deadlines','task-intake','pomodoro','habits','stats','knowledge','sources','ai-p2'].forEach(function(k){if(buttons[k])buttons[k].remove()});
 nav.querySelectorAll(':scope > .app-nav-group-label').forEach(function(n){n.remove()});
 Object.keys(buttons).forEach(function(k){if(['daily','task-workspace','quadrant','deadlines','task-intake','pomodoro','habits','stats','knowledge','sources','ai-p2'].indexOf(k)<0){var b=buttons[k];if(!b.hidden&&b.style.display!=='none')others.push(b);b.remove()}});
 var group=function(title){var p=document.createElement('p');p.className='app-nav-group-label';p.textContent=title;nav.append(p)};
 var add=function(key,name){var b=buttons[key];if(!b)return;b.hidden=false;b.style.removeProperty('display');b.setAttribute('aria-hidden','false');b.tabIndex=0;label(b,name);nav.append(b)};
 var home=document.createElement('button');home.type='button';home.className='app-nav-item sy-original-home';home.setAttribute('aria-label','工作台首页');home.innerHTML='<span class="app-nav-icon" aria-hidden="true">🏠</span><span>工作台首页</span>';
 home.onclick=function(){if(window.SYCoverModules&&typeof SYCoverModules.home==='function')SYCoverModules.home();else openView('daily');};
 nav.append(home);
 group('任务');add('daily','每日清单');add('task-workspace','任务工作区');add('quadrant','轻重缓急');add('deadlines','截止雷达');
 var done=document.createElement('button');done.type='button';done.className='app-nav-item sy-original-done';done.innerHTML='<span class="app-nav-icon" aria-hidden="true">📦</span><span>已完成</span>';
 done.onclick=function(){openView('inbox');setTimeout(function(){var e=document.querySelector('#view-inbox [id*="archive"],#view-inbox [class*="archive"],#view-inbox [id*="done"]');if(e)e.scrollIntoView({block:'start',behavior:'smooth'})},100)};
 nav.append(done);add('task-intake','收集任务');
 // EnergyFlow is no longer a separate navigation destination; it is integrated into Personal Execution Coach.
  group('专注');add('pomodoro','专注陪伴');add('habits','习惯养成');
  group('AI 助手');add('ai-p2','AI 解卡');
 group('复盘');add('stats','进度复盘');add('knowledge','知识与路线');add('sources','资料中心');
 // Keep every tool directly in the original left navigation; no collapsed “更多工具” section.
 if(buttons.inbox){label(buttons.inbox,'收集箱');nav.append(buttons.inbox)}
 if(buttons.profile){label(buttons.profile,'我的资料 / 设置');nav.append(buttons.profile)}
 others.forEach(function(b){if(b!==buttons.inbox&&b!==buttons.profile)nav.append(b)});
 // Legacy energy widgets are never allowed inside the left rail.
 document.querySelectorAll('.app-sidebar #energy-left-planner,.app-sidebar [data-comfort-entry]').forEach(function(n){n.remove()});
}
function reconcile(){
 var nav=document.getElementById('appNav');if(!nav||nav.dataset.screenshotTwo!=='1')return;
 // Flatten any legacy More Tools container and keep all entries visible in the left rail.
 var more=nav.querySelector('.sy-original-more');
 if(more){
  Array.prototype.slice.call(more.querySelectorAll('.app-nav-item')).forEach(function(b){nav.appendChild(b)});
  more.remove();
 }
 Array.prototype.slice.call(nav.children).forEach(function(node){
  if(node.classList.contains('cv-primary-nav')||node.classList.contains('cv-nav-more')){node.hidden=true;node.setAttribute('aria-hidden','true');return;}
 });
 Array.prototype.slice.call(nav.querySelectorAll('.app-nav-item')).forEach(function(b){
  if(b.parentElement!==nav)nav.appendChild(b);
  b.hidden=false;b.style.removeProperty('display');b.setAttribute('aria-hidden','false');b.tabIndex=0;
 });
 // Keep the unified task workspace visible immediately after the daily list.
 var taskWorkspaceButton=nav.querySelector(':scope > .app-nav-item[data-view="task-workspace"]');
 if(taskWorkspaceButton){
  label(taskWorkspaceButton,'任务工作区');
  var dailyButton=nav.querySelector(':scope > .app-nav-item[data-view="daily"]');
  if(dailyButton&&taskWorkspaceButton.previousElementSibling!==dailyButton)nav.insertBefore(taskWorkspaceButton,dailyButton.nextSibling);
 }
 // No duplicate legacy energy widgets; the triad is mounted inside Personal Execution Coach.
 Array.prototype.slice.call(document.querySelectorAll('.app-sidebar #energy-left-planner,.app-sidebar [data-comfort-entry]')).forEach(function(n){n.remove()});
}
var pending=false;
function scheduleReconcile(){if(pending)return;pending=true;setTimeout(function(){pending=false;reconcile()},40)}
document.addEventListener('DOMContentLoaded',arrange);
document.addEventListener('sy:ready',arrange);
if(document.readyState!=='loading'){arrange();reconcile();}
new MutationObserver(scheduleReconcile).observe(document.documentElement,{childList:true,subtree:true});
})();
