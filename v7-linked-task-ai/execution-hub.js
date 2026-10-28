(function(){'use strict';
  function init(){
    var root=document.getElementById('view-execution-hub');if(!root||root.dataset.ready==='1')return;root.dataset.ready='1';
    var tabs=[].slice.call(root.querySelectorAll('[data-hub-tab]'));var panels=[].slice.call(root.querySelectorAll('[data-hub-panel]'));
    var urls={coach:'./personal-execution-coach-demo.html',ai:'./ai-setup.html'};var loaded={};
    function activate(key){tabs.forEach(function(t){var yes=t.getAttribute('data-hub-tab')===key;t.classList.toggle('is-active',yes);t.setAttribute('aria-selected',yes?'true':'false');});panels.forEach(function(p){p.hidden=p.getAttribute('data-hub-panel')!==key;});
      if(urls[key]&&!loaded[key]){var f=root.querySelector('[data-hub-frame="'+key+'"]');if(f){f.src=urls[key];loaded[key]=true;}}
    }
    tabs.forEach(function(t){t.addEventListener('click',function(){activate(t.getAttribute('data-hub-tab'));});});
    root.querySelectorAll('[data-hub-open-view]').forEach(function(b){b.addEventListener('click',function(){var key=b.getAttribute('data-hub-open-view');var nav=document.querySelector('.app-nav-item[data-view="'+key+'"]');if(nav)nav.click();});});
    root.querySelectorAll('[data-hub-reload]').forEach(function(b){b.addEventListener('click',function(){var key=b.getAttribute('data-hub-reload');var f=root.querySelector('[data-hub-frame="'+key+'"]');if(f&&urls[key]){f.src=urls[key];loaded[key]=true;}});});
    // Direct links to the old standalone demo are consolidated into this single in-app entry point.
    activate('energy');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
