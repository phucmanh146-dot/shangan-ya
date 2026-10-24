(function(){
  'use strict';
  document.addEventListener('click', function(event){
    var button = event.target.closest && event.target.closest('[data-pp="capture"]');
    if(button && window.SY && typeof SY.openQuickCapture === 'function') SY.openQuickCapture();
  });
})();
