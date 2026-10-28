(function(){
"use strict";
function ready(){
 const btn=document.getElementById('aiP2Nav');
 if(btn){btn.title="按当前任务打开的进阶 AI 工具；资料读取状态需核验";btn.setAttribute('aria-label','上岸鸭进阶 AI 工具');}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();
