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
 group('专注');add('pomodoro','专注陪伴');add('habits','习惯养成');
  group('AI 助手');add('ai-p2','AI 解卡');
 group('复盘');add('stats','进度复盘');add('knowledge','知识与路线');add('sources','资料中心');
 var more=document.createElement('details');more.className='sy-original-more';
 var summary=document.createElement('summary');summary.textContent='▸ 更多工具';more.append(summary);
 var moreNav=document.createElement('div');moreNav.className='sy-original-more-items';more.append(moreNav);
 if(buttons.inbox){label(buttons.inbox,'收集箱');moreNav.append(buttons.inbox)}
 if(buttons.profile){label(buttons.profile,'我的资料 / 设置');moreNav.append(buttons.profile)}
 others.forEach(function(b){if(b!==buttons.inbox&&b!==buttons.profile)moreNav.append(b)});
 nav.append(more);
 // Legacy energy widgets are never allowed inside the left rail.
 document.querySelectorAll('.app-sidebar #energy-left-planner,.app-sidebar [data-comfort-entry]').forEach(function(n){n.remove()});
}
function reconcile(){
 var nav=document.getElementById('appNav');if(!nav||nav.dataset.screenshotTwo!=='1')return;
 var more=nav.querySelector('.sy-original-more-items');if(!more)return;
 var primary={'每日清单':1,'任务工作区':1,'AI 解卡':1,'精力与弹性排期':1,'轻重缓急':1,'截止雷达':1,'已完成':1,'收集任务':1,'专注陪伴':1,'习惯养成':1,'进度复盘':1,'知识与路线':1,'资料中心':1,'工作台首页':1};
 var canonical=Array.prototype.slice.call(nav.querySelectorAll(':scope > .app-nav-item'));
 var existing=new Set(canonical.map(function(n){return (n.textContent||'').trim()}));
 Array.prototype.slice.call(nav.children).forEach(function(node){
  if(node.classList.contains('cv-primary-nav')||node.classList.contains('cv-nav-more')){node.hidden=true;node.setAttribute('aria-hidden','true');return;}
  if(node.classList.contains('app-nav-item')&&!node.classList.contains('sy-original-home')&&!node.classList.contains('sy-original-done')){
    var title=(node.textContent||'').trim();
    if(!primary[title]||canonical.indexOf(node)<0)more.appendChild(node);
  }
 });
 // No additional energy score, energy curve or old eight-link navigation in the left rail.
 Array.prototype.slice.call(document.querySelectorAll('.app-sidebar #energy-left-planner,.app-sidebar [data-comfort-entry]')).forEach(function(n){n.remove()});
}
var pending=false;
function scheduleReconcile(){if(pending)return;pending=true;setTimeout(function(){pending=false;reconcile()},40)}
document.addEventListener('DOMContentLoaded',arrange);
document.addEventListener('sy:ready',arrange);
if(document.readyState!=='loading'){arrange();reconcile();}
new MutationObserver(scheduleReconcile).observe(document.documentElement,{childList:true,subtree:true});
})();
