/* Preserve the original V8 navigation. The knowledge workspace must not add another
   row of links for WeChat, source reading or AI. Their existing left-navigation
   destinations remain intact and historical task data is not modified. */
(function(){'use strict';
 function tidy(){
  document.querySelectorAll('#view-knowledge .sy-separate-nav').forEach(function(node){node.remove()});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tidy,{once:true});else tidy();
 document.addEventListener('sy:ready',tidy);
})();
