/* 上岸鸭三合一：任务过程反馈 + 固定事项清单。
   Reuses the account data and original planner; no second task store. */
(function () {
  'use strict';
  if (window.__SYEnergyFeedbackLoopV1) return;
  window.__SYEnergyFeedbackLoopV1 = true;

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  }); };
  var stamp = function () { return new Date().toISOString(); };
  var today = function () {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  };
  function account() { try { return window.SY && SY.getAcctData ? SY.getAcctData() : null; } catch (e) { return null; } }
  function save(d) { try { return !!(window.SY && SY.saveAcctData && SY.saveAcctData(d)); } catch (e) { return false; } }
  function settings(d) { d.plannerSettings = d.plannerSettings || {}; return d.plannerSettings; }
  function flow(d) {
    d.energyFlow = d.energyFlow || {};
    d.energyFlow.events = Array.isArray(d.energyFlow.events) ? d.energyFlow.events : [];
    d.energyFlow.reviews = Array.isArray(d.energyFlow.reviews) ? d.energyFlow.reviews : [];
    return d.energyFlow;
  }
  function tasks(d) { return Array.isArray(d.tasks) ? d.tasks : []; }
  function taskName(t) { return t && (t.name || t.title || t.taskName) || '当前任务'; }
  function toMinutes(s) { var p = String(s || '').split(':'); return (Number(p[0]) || 0) * 60 + (Number(p[1]) || 0); }
  function duration(e) {
    var a = toMinutes(e.start), b = toMinutes(e.end);
    if (b <= a) b += 1440;
    return Math.max(0, b - a);
  }
  function matchesToday(e) {
    if (e.active === false) return false;
    var rep = e.repeat || 'once', day = today(), d = new Date();
    if (rep === 'daily') return !e.date || e.date <= day;
    if (rep === 'weekdays') return d.getDay() >= 1 && d.getDay() <= 5 && (!e.date || e.date <= day);
    if (rep === 'weekly') {
      if (!e.date) return false;
      return new Date(e.date + 'T12:00:00').getDay() === d.getDay() && e.date <= day;
    }
    return (e.date || day) === day;
  }
  function activeEvents(d) {
    var p = d.plannerSettings || {};
    return (Array.isArray(p.fixedEvents) ? p.fixedEvents : []).filter(matchesToday).slice().sort(function (a,b) {
      return toMinutes(a.start) - toMinutes(b.start);
    });
  }
  function totalFixedMinutes(d) {
    var items = activeEvents(d).map(function(e){return {start:toMinutes(e.start),end:toMinutes(e.end)}}).map(function(e){if(e.end<=e.start)e.end+=1440;return e}).sort(function(a,b){return a.start-b.start;});
    var total=0,lastEnd=-1;
    items.forEach(function(e){var start=Math.max(e.start,lastEnd);if(e.end>start)total+=e.end-start;lastEnd=Math.max(lastEnd,e.end)});
    return total;
  }
  function appendEvent(d, type, text, extra) {
    var s = flow(d), item = {at:stamp(), type:type, text:text};
    if (extra) Object.keys(extra).forEach(function(k){ item[k] = extra[k]; });
    s.events.push(item); s.events = s.events.slice(-120);
  }

  function injectStyles() {
    if ($('syEfFeedbackLoopStyle')) return;
    var style = document.createElement('style');
    style.id = 'syEfFeedbackLoopStyle';
    style.textContent = [
      '.sy-ef-extra-card{margin:14px 0;padding:16px;border:1px solid #dce9e0;border-radius:15px;background:#fff;box-shadow:0 7px 22px #17382d08}',
      '.sy-ef-extra-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}',
      '.sy-ef-extra-card h3{margin:0 0 6px;color:#173d2d;font-size:16px}',
      '.sy-ef-extra-muted{font-size:12px;color:#71877d;margin:0 0 12px;line-height:1.6}',
      '.sy-ef-extra-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}',
      '.sy-ef-extra-grid label{display:grid;gap:5px;font-size:12px;color:#60786b;font-weight:700}',
      '.sy-ef-extra-grid input,.sy-ef-extra-grid select{min-width:0;width:100%;border:1px solid #dce8e0;border-radius:9px;padding:9px;background:#fff;color:#17382d;font:inherit}',
      '.sy-ef-extra-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:11px}',
      '.sy-ef-extra-btn{border:1px solid #d5e4da;border-radius:10px;padding:9px 12px;background:#f3f8f4;color:#24563e;font-weight:750;cursor:pointer}',
      '.sy-ef-extra-btn.primary{background:#286149;color:#fff;border-color:#286149}',
      '.sy-ef-extra-list{display:grid;gap:7px;margin-top:12px}',
      '.sy-ef-fixed-row{display:grid;grid-template-columns:84px minmax(0,1fr) auto;gap:10px;align-items:center;border:1px solid #e7efe9;border-radius:10px;padding:10px;background:#fbfdfb}',
      '.sy-ef-fixed-time{font-size:12px;color:#2b6b4c;font-weight:800;font-variant-numeric:tabular-nums}',
      '.sy-ef-fixed-title{font-weight:750;color:#214533}',
      '.sy-ef-fixed-meta{font-size:11px;color:#7c9186;margin-top:2px}',
      '.sy-ef-feedback-dock{display:none;margin:14px 0;padding:15px;border:1px solid #e7c77f;border-radius:14px;background:#fff9e9}',
      '.sy-ef-feedback-dock.is-open{display:block}',
      '.sy-ef-feedback-dock h3{margin:0 0 5px;font-size:16px;color:#684e18}',
      '.sy-ef-feedback-dock p{margin:0 0 10px;font-size:12px;color:#806b3c}',
      '.sy-ef-feedback-dock .sy-ef-extra-grid{grid-template-columns:repeat(3,minmax(0,1fr))}',
      '.sy-ef-feedback-note{font-size:12px;color:#426d57;margin-top:9px;white-space:pre-wrap}',
      '@media(max-width:760px){.sy-ef-extra-grid,.sy-ef-feedback-dock .sy-ef-extra-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.sy-ef-fixed-row{grid-template-columns:70px minmax(0,1fr)}.sy-ef-fixed-row .sy-ef-extra-actions{grid-column:1/-1}}',
      '@media(max-width:460px){.sy-ef-extra-grid,.sy-ef-feedback-dock .sy-ef-extra-grid{grid-template-columns:1fr}}'
    ].join('');
    document.head.appendChild(style);
  }

  function injectUI() {
    var hub = $('syEfHub'), todayPane = hub && hub.querySelector('[data-ef-pane="today"]');
    if (!hub || !todayPane) return false;
    injectStyles();

    if (!$('syEfFeedbackDock')) {
      var dock = document.createElement('section');
      dock.id = 'syEfFeedbackDock';
      dock.className = 'sy-ef-feedback-dock';
      dock.setAttribute('aria-live', 'polite');
      dock.innerHTML =
        '<div class="sy-ef-extra-head"><div><h3 id="syEfFeedbackTitle">执行到一段，确认一下现在的精力</h3><p id="syEfFeedbackPrompt">不用长篇填写。选一下当前状态，系统会据此调整后续任务。</p></div><button class="sy-ef-extra-btn" id="syEfFeedbackDismiss" type="button">稍后再说</button></div>' +
        '<div class="sy-ef-extra-grid">' +
        '<label>当前精力（1–10）<select id="syEfQuickEnergy">' + Array.from({length:10},function(_,i){return '<option value="'+(i+1)+'"'+(i===5?' selected':'')+'>'+(i+1)+'</option>';}).join('') + '</select></label>' +
        '<label>现在的状态<select id="syEfQuickMood"><option value="可继续">还能继续</option><option value="有点疲惫">有点疲惫</option><option value="读不进去">读不进去</option><option value="遇到困难">任务卡住了</option><option value="需要休息">需要休息 / 发呆</option></select></label>' +
        '<label>这段任务结果<select id="syEfQuickProgress"><option value="进行中">还在推进</option><option value="部分完成">完成一部分</option><option value="已完成">任务已完成</option><option value="卡点">卡点阻塞</option><option value="被打断">被临时事务打断</option></select></label>' +
        '</div><div class="sy-ef-extra-actions"><button class="sy-ef-extra-btn primary" id="syEfSaveQuickFeedback" type="button">记录状态并调整建议</button><button class="sy-ef-extra-btn" id="syEfReportTiredNow" type="button">我现在很疲惫</button></div><div id="syEfQuickFeedbackResult" class="sy-ef-feedback-note"></div>';
      var live = todayPane.querySelector('.sy-ef-live-energy');
      todayPane.insertBefore(dock, live || todayPane.firstChild);
    }

    if (!$('syEfOpenFeedback')) {
      var trigger = document.createElement('div');
      trigger.className = 'sy-ef-extra-actions';
      trigger.style.cssText = 'margin:8px 0 10px';
      trigger.innerHTML = '<button class="sy-ef-extra-btn primary" id="syEfOpenFeedback" type="button">随时汇报精力 / 我现在很疲惫</button><span class="sy-ef-extra-muted">任务中途累了、卡住了，不必等到半小时。</span>';
      var dock = $('syEfFeedbackDock');
      todayPane.insertBefore(trigger, dock || todayPane.firstChild);
    }

    if (!$('syEfFixedManager')) {
      var fixed = document.createElement('section');
      fixed.id = 'syEfFixedManager';
      fixed.className = 'sy-ef-extra-card';
      fixed.innerHTML =
        '<div class="sy-ef-extra-head"><div><h3>固定事项清单</h3><p class="sy-ef-extra-muted">先把上课、实战营、会议、吃饭、通勤和睡眠锁定，再排剩余任务。固定事项独立成列表，不会被普通任务挤掉。</p></div><span class="sy-ef-tag">优先保留</span></div>' +
        '<div class="sy-ef-extra-grid">' +
        '<label>事项名称<input id="syEfFixedName" maxlength="120" placeholder="例如：AI 实战营培训 / 午餐"></label>' +
        '<label>开始时间<input id="syEfFixedStart" type="time" value="12:00"></label>' +
        '<label>结束时间<input id="syEfFixedEnd" type="time" value="13:00"></label>' +
        '<label>事项类型<select id="syEfFixedCategory"><option>上课 / 培训</option><option>会议</option><option>吃饭</option><option>通勤 / 办事</option><option>睡眠</option><option>休息 / 恢复</option><option>其他固定安排</option></select></label>' +
        '<label>重复规则<select id="syEfFixedRepeat"><option value="once">仅今天</option><option value="daily">每天</option><option value="weekdays">每个工作日</option><option value="weekly">每周同一天</option></select></label>' +
        '<label>生效日期<input id="syEfFixedDate" type="date" value="'+today()+'"></label>' +
        '<label>是否必须保留<select id="syEfFixedRequired"><option value="yes">必须保留</option><option value="flexible">可协商调整</option></select></label>' +
        '</div><div class="sy-ef-extra-actions"><button class="sy-ef-extra-btn primary" id="syEfAddFixed" type="button">加入固定事项清单</button><button class="sy-ef-extra-btn" id="syEfOpenPlanner" type="button">带着固定事项去重排</button></div>' +
        '<div class="sy-ef-extra-list" id="syEfFixedList"></div><div class="sy-ef-feedback-note" id="syEfFixedStatus"></div>';
      var mount = $('syEfExistingPlannerMount');
      if (mount) todayPane.insertBefore(fixed, mount);
      else todayPane.appendChild(fixed);
    }

    var fixedTag = hub.querySelector('#syEfFixedManager .sy-ef-tag');
    if (fixedTag) { fixedTag.style.cssText = 'display:inline-flex;padding:5px 9px;border-radius:99px;background:#edf5ef;color:#426d57;font-size:11px;font-weight:750;white-space:nowrap'; }

    bindUI();
    renderFixed();
    return true;
  }

  var bound = false, knownDone = {};
  function bindUI() {
    if (bound) return;
    bound = true;

    if ($('syEfAddFixed')) $('syEfAddFixed').onclick = function () {
      var d = account(); if (!d) return;
      var name = $('syEfFixedName').value.trim(), start = $('syEfFixedStart').value, end = $('syEfFixedEnd').value;
      if (!name) { $('syEfFixedStatus').textContent = '先写事项名称。'; return; }
      if (!start || !end || duration({start:start,end:end}) <= 0 || duration({start:start,end:end}) > 1440) {
        $('syEfFixedStatus').textContent = '请检查开始与结束时间；跨午夜事项请拆成两条记录。'; return;
      }
      var p = settings(d), list = Array.isArray(p.fixedEvents) ? p.fixedEvents : [];
      var repeat = $('syEfFixedRepeat').value, date = $('syEfFixedDate').value || today();
      list.push({id:'fixed-'+Date.now(),name:name,start:start,end:end,category:$('syEfFixedCategory').value,repeat:repeat,date:date,required:$('syEfFixedRequired').value==='yes',active:true,createdAt:stamp()});
      p.fixedEvents = list.slice(-120);
      /* Exact fixed-event windows are counted by the planner; do not double-subtract minutes. */
      appendEvent(d,'固定事项新增',name+' · '+start+'–'+end+' · '+$('syEfFixedCategory').value);
      save(d); $('syEfFixedName').value = ''; renderFixed();
      $('syEfFixedStatus').textContent = '已保存到上岸鸭账号数据。点击“带着固定事项去重排”后，生成新时间轴并确认应用。';
    };

    if ($('syEfFixedList')) $('syEfFixedList').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-fixed-action]'); if (!b) return;
      var d = account(); if (!d) return;
      var p = settings(d), list = Array.isArray(p.fixedEvents) ? p.fixedEvents : [], id = b.getAttribute('data-id');
      var item = list.find(function (x) { return String(x.id) === String(id); });
      if (!item) return;
      if (b.dataset.fixedAction === 'delete') {
        if (!window.confirm('删除固定事项“'+item.name+'”？')) return;
        p.fixedEvents = list.filter(function (x) { return String(x.id) !== String(id); });
        /* Exact fixed-event windows are counted by the planner; do not double-subtract minutes. */
        appendEvent(d,'固定事项删除',item.name);
        save(d); renderFixed();
      } else if (b.dataset.fixedAction === 'toggle') {
        item.active = item.active === false;
        /* Exact fixed-event windows are counted by the planner; do not double-subtract minutes. */
        appendEvent(d,'固定事项状态',item.name+' · '+(item.active?'已启用':'已停用'));
        save(d); renderFixed();
      } else if (b.dataset.fixedAction === 'edit') {
        var name = window.prompt('事项名称',item.name); if (name === null) return;
        var start = window.prompt('开始时间 HH:MM',item.start); if (start === null) return;
        var end = window.prompt('结束时间 HH:MM',item.end); if (end === null) return;
        if (!name.trim() || !/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end) || duration({start:start,end:end}) <= 0) {
          window.alert('名称或时间格式不正确。'); return;
        }
        item.name = name.trim(); item.start = start; item.end = end;
        /* Exact fixed-event windows are counted by the planner; do not double-subtract minutes. */ appendEvent(d,'固定事项修改',item.name+' · '+start+'–'+end);
        save(d); renderFixed();
      }
    });

    if ($('syEfOpenPlanner')) $('syEfOpenPlanner').onclick = function () {
      var d = account(); if (!d) return;
      var p = settings(d); /* Exact fixed-event windows are counted by the planner; do not double-subtract minutes. */ save(d);
      var b = document.querySelector('[data-cp-open]');
      if (b) { b.click(); $('syEfFixedStatus').textContent = '已打开原有舒适排期流程。请检查固定事项与任务清单，生成预览后再确认应用。'; }
      else { $('syEfFixedStatus').textContent = '固定事项已保存，但原有舒适排期入口尚未加载；请稍后重试。'; }
    };

    if ($('syEfOpenFeedback')) $('syEfOpenFeedback').onclick = function () {
      var d = account() || {}, p = d.plannerSettings || {}, session = sessionInfo(d);
      $('syEfFeedbackTitle').textContent = '随时汇报：现在的精力还够吗？';
      $('syEfFeedbackPrompt').textContent = session ? '当前任务：'+session.name+'。如疲惫或卡住，直接选择状态，系统会记录并给出下一步。' : '选择当前精力与状态；无需等任务完成，也不必长篇填写。';
      if (session && $('syEfCurrentTask') && session.id) $('syEfCurrentTask').value = session.id;
      $('syEfFeedbackDock').classList.add('is-open');
      $('syEfQuickEnergy').focus();
    };
    if ($('syEfFeedbackDismiss')) $('syEfFeedbackDismiss').onclick = function () {
      var d = account(); if (d) { settings(d).lastEnergyPromptAt = Date.now(); save(d); }
      $('syEfFeedbackDock').classList.remove('is-open');
    };
    if ($('syEfReportTiredNow')) $('syEfReportTiredNow').onclick = function () {
      $('syEfQuickEnergy').value = '2'; $('syEfQuickMood').value = '需要休息'; $('syEfQuickProgress').value = '进行中';
      $('syEfFeedbackDock').classList.add('is-open');
      $('syEfFeedbackPrompt').textContent = '先保存断点，不用硬扛。记录后可把后续任务改成低负荷或顺延。';
      $('syEfQuickEnergy').focus();
    };
    if ($('syEfSaveQuickFeedback')) $('syEfSaveQuickFeedback').onclick = saveFeedback;

    var report = $('syEfSaveReport');
    if (report) report.addEventListener('click', function () {
      window.setTimeout(function () {
        if ($('syEfReportOutcome') && $('syEfReportOutcome').value === 'done') {
          $('syEfFeedbackTitle').textContent = '这项任务完成了，接下来还有多少精力？';
          $('syEfFeedbackPrompt').textContent = '完成任务后花几秒汇报一下，系统会用真实反馈调整后面的安排。';
          $('syEfQuickProgress').value = '已完成';
          var d = account(), p = d && d.plannerSettings || {}, active = p.activeSession || {};
          if (active.taskId && $('syEfCurrentTask')) $('syEfCurrentTask').value = String(active.taskId);
          $('syEfFeedbackDock').classList.add('is-open');
        }
      }, 80);
    });
  }

  function renderFixed() {
    var el = $('syEfFixedList'); if (!el) return;
    var d = account() || {}, p = d.plannerSettings || {}, list = Array.isArray(p.fixedEvents) ? p.fixedEvents : [];
    if (!list.length) { el.innerHTML = '<div class="sy-ef-extra-muted">还没有固定事项。先加入课程、实战营、会议、吃饭或睡眠等不可随意挪动的安排。</div>'; return; }
    el.innerHTML = list.slice().sort(function(a,b){return toMinutes(a.start)-toMinutes(b.start);}).map(function (x) {
      var active = x.active !== false;
      return '<article class="sy-ef-fixed-row"><div class="sy-ef-fixed-time">'+esc(x.start)+'–'+esc(x.end)+'</div><div><div class="sy-ef-fixed-title">'+esc(x.name)+'</div><div class="sy-ef-fixed-meta">'+esc(x.category||'固定事项')+' · '+(x.repeat==='daily'?'每天':x.repeat==='weekdays'?'工作日':x.repeat==='weekly'?'每周':'仅指定日期')+' · '+(x.required?'必须保留':'可协商调整')+' · '+(active?'已启用':'已停用')+'</div></div><div class="sy-ef-extra-actions"><button class="sy-ef-extra-btn" data-fixed-action="edit" data-id="'+esc(x.id)+'" type="button">编辑</button><button class="sy-ef-extra-btn" data-fixed-action="toggle" data-id="'+esc(x.id)+'" type="button">'+(active?'停用':'启用')+'</button><button class="sy-ef-extra-btn" data-fixed-action="delete" data-id="'+esc(x.id)+'" type="button">删除</button></div></article>';
    }).join('');
  }

  function sessionInfo(d) {
    var p = d.plannerSettings || {}, s = p.activeSession || d.activeTimer || (d.smartPlanner && d.smartPlanner.active) || {};
    var raw = s.startedAt || s.startAt || s.runningSince || s.startedAtMs || s.startTime || s.started_at || 0;
    var start = typeof raw === 'string' && !/^\d{10,13}$/.test(raw) ? Date.parse(raw) : Number(raw);
    if (start > 0 && start < 1e11) start *= 1000;
    if (!start || start > Date.now() || !s) return null;
    var id = s.taskId || s.id || window.__SYTaskWorkspaceSelectedTaskId || '';
    var task = tasks(d).find(function (t) { return String(t.id || t.taskId) === String(id); });
    return {start:start, id:String(id||''), name:task ? taskName(task) : (s.taskName || '当前任务')};
  }

  function saveFeedback() {
    var d = account(); if (!d) return;
    var p = settings(d), score10 = Math.max(1,Math.min(10,Number($('syEfQuickEnergy').value)||5)), mood = $('syEfQuickMood').value, progress = $('syEfQuickProgress').value;
    var sel = $('syEfCurrentTask'), taskId = sel && sel.value || (p.activeSession && p.activeSession.taskId) || '';
    var task = tasks(d).find(function(t){return String(t.id || t.taskId) === String(taskId);});
    var now = Date.now(), mapped = Math.max(1,Math.min(5,Math.round(score10/2)));
    d.energyHistory = Array.isArray(d.energyHistory) ? d.energyHistory : [];
    d.energyHistory.push({id:'energy-'+now,date:today(),at:now,hour:new Date(now).getHours(),score:mapped,score10:score10,source:'任务过程主动反馈',mood:mood,taskId:String(taskId||''),taskName:task?taskName(task):'',progress:progress});
    d.energyHistory = d.energyHistory.slice(-500);
    p.currentEnergyScore = mapped;
    p.currentEnergyLevel = mapped >= 4 ? 'high' : mapped <= 2 ? 'low' : 'medium';
    p.energyLevelUpdatedAt = now;
    p.lastCognitiveCheckin = {at:now,score:mapped,score10:score10,mood:mood,taskId:String(taskId||''),taskName:task?taskName(task):''};
    if (score10 <= 4 || mood === '有点疲惫' || mood === '读不进去' || mood === '需要休息') {
      d.fatigueLog = Array.isArray(d.fatigueLog) ? d.fatigueLog : [];
      d.fatigueLog.push({at:now,score:mapped,score10:score10,category:'任务过程反馈',reason:mood,taskId:String(taskId||''),taskName:task?taskName(task):''});
      d.fatigueLog = d.fatigueLog.slice(-200);
    }
    appendEvent(d,'任务过程反馈',(task?taskName(task):'当前任务')+' · 精力 '+score10+'/10 · '+mood+' · '+progress,{taskId:String(taskId||''),energy10:score10,mood:mood,progress:progress});
    p.lastEnergyPromptAt = now;
    save(d);

    var msg = $('syEfQuickFeedbackResult');
    if (score10 <= 3 || mood === '需要休息' || mood === '读不进去') {
      if (msg) msg.textContent = '已记录。建议先离屏恢复 10–20 分钟；暂不继续高认知任务。恢复后再重排，别让一个卡点拖垮后半天。';
      var a = $('syEfFatigueAdvice'); if (a) a.textContent = '最近反馈：精力 '+score10+'/10，'+mood+'。先保存断点、安排恢复，再决定下一项。';
    } else if (mood === '遇到困难' || progress === '卡点') {
      if (msg) msg.textContent = '已记录卡点。先限定 10–15 分钟解决一个最小问题；仍未推进就转交 AI 工作区或顺延，不无限死磕。';
    } else {
      if (msg) msg.textContent = '已记录真实状态。后续排期会参考这条反馈；若任务已完成，可继续汇报或重排下一项。';
    }
    $('syEfFeedbackDock').classList.remove('is-open');
    if ($('syEfEnergy10')) $('syEfEnergy10').value = String(score10);
    if ($('syEfMood')) $('syEfMood').value = mood;
    var planner = $('energy-left-planner');
    if (planner) planner.dispatchEvent(new Event('change',{bubbles:true}));
    var d2 = account() || {}, p2 = d2.plannerSettings || {};
    if (p2.activeSession && (mood === '需要休息' || mood === '读不进去' || score10 <= 3)) {
      p2.activeSession.needsRecovery = true; p2.activeSession.lastFeedbackAt = now; save(d2);
    }
    if (typeof window.__SYRefreshComfortPlan === 'function') { try { window.__SYRefreshComfortPlan(); } catch (e) {} }
    var replan = $('syEfReplanAfterInterrupt');
    if (score10 <= 3 || mood === '需要休息' || mood === '读不进去') {
      var fixedStatus = $('syEfInterruptStatus');
      if (fixedStatus) fixedStatus.textContent = '精力偏低已记录。点击“按当前状态重新排期”先保护恢复时间，再安排剩余任务。';
    }
    renderFixed();
  }

  function isDone(t) { return !!(t && (t.done || t.completed || t.completedAt || t.status === 'done' || t.status === 'completed')); }
  function taskKey(t) { return String(t && (t.id || t.taskId || t.name || t.title) || ''); }
  function openFeedback(title, prompt, taskId, progress) {
    if (!$('syEfFeedbackDock')) return;
    $('syEfFeedbackTitle').textContent = title;
    $('syEfFeedbackPrompt').textContent = prompt;
    if (taskId && $('syEfCurrentTask')) $('syEfCurrentTask').value = String(taskId);
    if (progress && $('syEfQuickProgress')) $('syEfQuickProgress').value = progress;
    $('syEfFeedbackDock').classList.add('is-open');
  }
  function monitor() {
    var d = account(); if (!d) return;
    var p = settings(d), now = Date.now(), allTasks = tasks(d), newlyDone = [];
    allTasks.forEach(function(t) {
      var k = taskKey(t); if (!k) return;
      var done = isDone(t);
      if (done && !knownDone[k]) newlyDone.push(t);
      knownDone[k] = done;
    });
    if (newlyDone.length && document.visibilityState === 'visible' && !$('syEfFeedbackDock').classList.contains('is-open')) {
      var completed = newlyDone[newlyDone.length-1], tid = completed.id || completed.taskId || '';
      p.lastEnergyPromptAt = now; save(d);
      openFeedback('这项任务完成了，接下来还有多少精力？','刚完成：'+taskName(completed)+'。汇报一下现在的状态，避免把前一项的耗能带进下一项。',tid,'已完成');
      return;
    }
    var session = sessionInfo(d);
    if (!session) return;
    var elapsed = now - session.start, last = Number(p.lastEnergyPromptAt || 0);
    var nextDue = Math.max(session.start + 30*60000, last ? last + 30*60000 : 0);
    if (elapsed >= 30*60000 && now >= nextDue && document.visibilityState === 'visible' && !$('syEfFeedbackDock').classList.contains('is-open')) {
      p.lastEnergyPromptAt = now; save(d);
      openFeedback('这段任务已经进行一会儿了，精力还够吗？','当前任务：'+session.name+'。花几秒汇报精力；如果卡住或疲惫，可以直接说，不需要硬扛。',session.id,'进行中');
    }
  }

  function boot() {
    if (!injectUI()) {
      var tries = 0, retry = window.setInterval(function () {
        tries++;
        if (injectUI() || tries > 30) window.clearInterval(retry);
      }, 500);
      return;
    }
    (tasks(account() || {})).forEach(function(t){ var k=taskKey(t); if(k) knownDone[k]=isDone(t); });
    window.setInterval(monitor, 60000);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') monitor(); });
    var hub = $('syEfHub');
    if (hub) {
      hub.addEventListener('click', function (e) {
        var b = e.target.closest('[data-ef-tab]');
        if (b && b.dataset.efTab !== 'today') $('syEfFeedbackDock').classList.remove('is-open');
      });
    }
    monitor();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();