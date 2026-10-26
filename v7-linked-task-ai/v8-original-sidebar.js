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
 ['daily','quadrant','deadlines','task-intake','pomodoro','habits','stats','knowledge','sources'].forEach(function(k){if(buttons[k])buttons[k].remove()});
 nav.querySelectorAll(':scope > .app-nav-group-label').forEach(function(n){n.remove()});
 Object.keys(buttons).forEach(function(k){if(['daily','quadrant','deadlines','task-intake','pomodoro','habits','stats','knowledge','sources'].indexOf(k)<0){var b=buttons[k];if(!b.hidden&&b.style.display!=='none')others.push(b);b.remove()}});
 var group=function(title){var p=document.createElement('p');p.className='app-nav-group-label';p.textContent=title;nav.append(p)};
 var add=function(key,name){var b=buttons[key];if(!b)return;label(b,name);nav.append(b)};
 var home=document.createElement('button');home.type='button';home.className='app-nav-item sy-original-home';home.setAttribute('aria-label','工作台首页');home.innerHTML='<span class="app-nav-icon" aria-hidden="true">🏠</span><span>工作台首页</span>';
 home.onclick=function(){openView('daily');var daily=document.getElementById('view-daily');if(daily)daily.scrollIntoView({block:'start',behavior:'smooth'})};
 nav.append(home);
 group('任务');add('daily','每日清单');add('quadrant','轻重缓急');add('deadlines','截止雷达');
 var done=document.createElement('button');done.type='button';done.className='app-nav-item sy-original-done';done.innerHTML='<span class="app-nav-icon" aria-hidden="true">📦</span><span>已完成</span>';
 done.onclick=function(){openView('inbox');setTimeout(function(){var e=document.querySelector('#view-inbox [id*="archive"],#view-inbox [class*="archive"],#view-inbox [id*="done"]');if(e)e.scrollIntoView({block:'start',behavior:'smooth'})},100)};
 nav.append(done);add('task-intake','收集任务');
 group('专注');add('pomodoro','专注陪伴');add('habits','习惯养成');
 group('复盘');add('stats','进度复盘');add('knowledge','知识与路线');add('sources','资料中心');
 var more=document.createElement('details');more.className='sy-original-more';
 var summary=document.createElement('summary');summary.textContent='▸ 更多工具';more.append(summary);
 var moreNav=document.createElement('div');moreNav.className='sy-original-more-items';more.append(moreNav);
 if(buttons.inbox){label(buttons.inbox,'收集箱');moreNav.append(buttons.inbox)}
 if(buttons.profile){label(buttons.profile,'我的资料 / 设置');moreNav.append(buttons.profile)}
 others.forEach(function(b){if(b!==buttons.inbox&&b!==buttons.profile)moreNav.append(b)});
 nav.after(more);
 // Legacy energy widgets are never allowed inside the left rail.
 document.querySelectorAll('.app-sidebar #energy-left-planner,.app-sidebar [data-comfort-entry]').forEach(function(n){n.remove()});
}
document.addEventListener('DOMContentLoaded',arrange);
document.addEventListener('sy:ready',arrange);
if(document.readyState!=='loading')arrange();
})();
