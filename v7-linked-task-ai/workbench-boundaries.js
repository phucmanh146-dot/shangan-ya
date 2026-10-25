/* Present separate task collection, source reading and AI destinations without remounting or altering stored tasks. */
(function(){'use strict';
function mount(){
 const host=document.getElementById('knowledgeBody');if(!host)return;
 if(host.querySelector('.sy-separate-nav'))return;
 const bar=document.createElement('nav');bar.className='sy-separate-nav';bar.setAttribute('aria-label','独立功能入口');
 const links=[['📁 资料中心：本机知识库 / 网页 / 飞书 / 文件','sources'],['💬 微信消息与任务收集','task-intake'],['✦ 独立 AI 工作助手','ai-p2']];
 links.forEach(function(item){const btn=document.createElement('button');btn.type='button';btn.textContent=item[0];btn.addEventListener('click',function(){if(window.SY&&SY.switchAppView)SY.switchAppView(item[1]);});bar.appendChild(btn)});
 const note=document.createElement('p');note.textContent='资料读取、微信消息与 AI 问答分别进入独立页面；这里仅保留学习路线和已记录的知识复盘。';bar.appendChild(note);
 const top=host.querySelector('.app-main-topbar');if(top)top.after(bar);else host.prepend(bar);
}
let queued=false;
const obs=new MutationObserver(function(){if(queued)return;queued=true;requestAnimationFrame(function(){queued=false;mount()})});obs.observe(document.documentElement,{subtree:true,childList:true});
document.addEventListener('DOMContentLoaded',mount);mount();
})();