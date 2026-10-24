/* Open advanced AI tools only from the selected task; keep the primary navigation clean. */
(function(){
 'use strict';
 const nav=document.getElementById('aiP2Nav');
 const view=document.getElementById('view-ai-p2');
 const frame=document.getElementById('embeddedP2Frame');
 if(!nav||!view||!frame)return;
 function adapt(){
   if(view.hidden)return;
   try{
     const inner=frame.contentDocument;
     if(inner&&inner.body){
       inner.body.classList.add('p2-embedded');
       const back=inner.querySelector('.p2-back');
       if(back)back.hidden=true;
       const tag=inner.querySelector('.p2-top-title span');
       if(tag)tag.textContent='进阶工具 · 视频解析 · 思维导图 · 通俗讲解';
       const status=document.getElementById('embeddedP2Status');
       if(status)status.textContent='已打开进阶工具 · 资料需实际读取后才加入对话';
     }
   }catch(_){ }
 }
 frame.addEventListener('load',adapt);
 nav.addEventListener('click',()=>requestAnimationFrame(adapt));

})();
