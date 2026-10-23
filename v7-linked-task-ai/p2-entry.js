(function(){
"use strict";
function ready(){
 const btn=document.getElementById('aiP2Nav');
 if(btn){btn.title="原工作台内的 P2 深度 AI 问答；不进入 Obsidian";btn.setAttribute('aria-label','AI 深度问答 P2');}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();
