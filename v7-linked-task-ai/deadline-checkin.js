(function (root) {
  'use strict';
  var host=null,active=null,activeAccount='',activeStage='',KEY='sy_deadline_checkins_v2';
  function dueAt(t){
    if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(t.dueDate||''))return Infinity;
    var date=t.dueDate.split('-').map(Number),time=/^(\\d{2}):(\\d{2})$/.exec(t.dueTime||'23:59');
    if(!time||+time[1]>23||+time[2]>59)return Infinity;
    var d=new Date(date[0],date[1]-1,date[2],+time[1],+time[2]);
    return d.getFullYear()===date[0]&&d.getMonth()===date[1]-1&&d.getDate()===date[2]?d.getTime():Infinity;
  }
  function stageFor(t,now){
    var left=dueAt(t)-now;
    if(!isFinite(left)||left < -86400000)return '';
    if(left<=0)return 'overdue';
    if(left<=600000)return 'urgent';
    if(left<=86400000)return 'day-before';
    return '';
  }
  function history(){try{var data=JSON.parse(localStorage.getItem(KEY)||'{}');return data&&typeof data==='object'&&!Array.isArray(data)?data:{};}catch(_){return {};}}
  function signature(t,stage){return String(root.SY.currentAccountKey)+':'+t.id+':'+t.dueDate+':'+(t.dueTime||'23:59')+':'+stage;}
  function record(action,progress){if(!active||activeAccount!==String(root.SY.currentAccountKey))return;var h=history();h[signature(active,activeStage)]={at:Date.now(),action:action,progress:progress||'',until:action==='later'?Date.now()+120000:0};try{localStorage.setItem(KEY,JSON.stringify(h));}catch(_){} }
  function eligible(tasks,now,h){return (tasks||[]).map(function(t){return {task:t,stage:stageFor(t,now)};}).filter(function(item){var t=item.task,s=item.stage,entry=h[signature(t,s)];return s&&!t.done&&!t.completedAt&&(!entry||entry.action==='later'&&now>=entry.until);}).sort(function(a,b){return dueAt(a.task)-dueAt(b.task);});}
  function hide(){if(host)host.hidden=true;active=null;activeStage='';}
  function mount(){
    if(host&&host.isConnected)return;
    host=document.createElement('aside');host.className='sy-deadline-banner';host.setAttribute('aria-label','截止前进度提醒');
    host.innerHTML='<header><span>上岸鸭 · 截止倒计时</span><button data-deadline="later" aria-label="两分钟后再提醒">稍后</button></header><strong data-deadline-title></strong><p data-deadline-copy role="status"></p><label>现在做到哪里了？<input data-deadline-progress maxlength="500" placeholder="例如：正文已写完，还差检查和提交"></label><div class="sy-deadline-actions"><button data-deadline="working">正在收尾</button><button data-deadline="stuck">遇到困难 · AI 解卡</button><button data-deadline="distracted">走神了</button><button data-deadline="entertainment">被娱乐带走</button><button data-deadline="tired">有点累</button><button data-deadline="open">查看任务</button></div><small>默认在截止前 24 小时进入倒计时，并在最后 10 分钟再次提醒。网页关闭或设备休眠期间无法弹出，重新打开后会补查。</small>';
    document.body.append(host);
    host.addEventListener('click',function(e){
      var button=e.target.closest('[data-deadline]');if(!button||!active)return;
      if(activeAccount!==String(root.SY.currentAccountKey)){hide();check();return;}
      var task=active,action=button.dataset.deadline,progress=host.querySelector('[data-deadline-progress]').value;
      if(action==='open'){if(root.SY.openTaskModal)root.SY.openTaskModal(task.id);else if(root.SYTaskWorkspace&&root.SYTaskWorkspace.openAI)root.SYTaskWorkspace.openAI();return;}
      record(action,progress);hide();
      if(action==='stuck'&&root.SYRescue)root.SYRescue.open({task:task,question:progress?'目前进度：'+progress+'。请帮我解决剩余问题。':''});
      else if(['distracted','entertainment','tired','working'].includes(action)){
        var message=root.SYCompanion?root.SYCompanion.respond(action==='working'?'focus':action,{taskName:task.name||task.title,taskId:task.id,quiet:true}):'回到「'+(task.name||task.title)+'」，先完成眼前的一小步。';
        if(root.SYFocus&&root.SYFocus.feedback)root.SYFocus.feedback(message);
        var tip=document.createElement('div');tip.className='fq-toast';tip.textContent=message;document.body.append(tip);setTimeout(function(){tip.remove();},6000);
      }
      setTimeout(check,300);
    });
  }
  function check(){
    if(!root.SY||document.hidden)return;
    var app=document.getElementById('appHome');if(!app||app.hidden){hide();return;}
    if(active&&activeAccount!==String(root.SY.currentAccountKey))hide();
    var account=root.SY.getAcctData&&root.SY.getAcctData(),tasks=account&&account.tasks||[],all=eligible(tasks,Date.now(),history());
    if(active&&!all.some(function(item){return signature(item.task,item.stage)===signature(active,activeStage);})){hide();}
    if(!all.length){if(active)hide();return;}
    var item=all[0],task=item.task,s=item.stage,same=active&&signature(active,activeStage)===signature(task,s);mount();active=task;activeStage=s;activeAccount=String(root.SY.currentAccountKey);
    var dialogs=document.querySelectorAll('dialog[open]'),parent=dialogs.length?dialogs[dialogs.length-1]:document.body;
    if(host.parentElement!==parent)parent.append(host);
    host.hidden=false;host.dataset.stage=s;host.querySelector('[data-deadline-title]').textContent=task.name||task.title||'未命名任务';
    var left=dueAt(task)-Date.now(),remaining=Math.max(0,Math.ceil(left/60000)),copy='';
    if(s==='day-before')copy='进入 24 小时倒计时：距截止还有 '+Math.floor(remaining/60)+' 小时 '+(remaining%60)+' 分钟。先确认交付范围，不追求完美，优先完成可提交版本。';
    else if(s==='urgent')copy='最后 10 分钟冲刺：还剩 '+remaining+' 分钟。只做提交前检查和交付，不再扩展范围。';
    else copy='已经超过截止时间。先保存当前成果，判断是否还能补交，并记录下一步。';
    copy+=' 你现在是什么状态？'+(all.length>1?' 另有 '+(all.length-1)+' 项截止任务进入提醒范围。':'');
    host.querySelector('[data-deadline-copy]').textContent=copy;
    if(!same)host.querySelector('[data-deadline-progress]').value='';
  }
  root.SYDeadline={dueAt:dueAt,stageFor:stageFor,eligible:eligible,check:check};
  if(typeof document!=='undefined'){setInterval(check,15000);setTimeout(check,2000);document.addEventListener('visibilitychange',check);window.addEventListener('focus',check);window.addEventListener('storage',check);}
})(typeof window==='undefined'?globalThis:window);
