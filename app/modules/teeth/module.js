/* RobTop — модуль «Таймер чистки зубов».
   Клиентский модуль на универсальном хранилище (sdk.data). Интеграция с очками — через sdk.points.
   2-минутный таймер с кольцом прогресса и спокойным звуком, +10 очков за полную чистку,
   серия (streak), история, напоминания, родительская панель (PIN). */
(function(){
  "use strict";

  var DURATION=120;               // секунд (2 минуты)
  var C=2*Math.PI*100;            // длина окружности кольца (r=100)
  var BACK_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
  var PARENT_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>';

  var sdk=null, root=null, E={}, sessions=[], meta=null, metaId=null;
  var running=false, remaining=DURATION, timerId=null, audio=null, reminderTimers=[], curSheet=null;

  function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];}); }
  function pad2(n){ return (n<10?"0":"")+n; }
  function fmtTime(sec){ sec=Math.max(0,Math.round(sec)); return Math.floor(sec/60)+":"+pad2(sec%60); }
  function dstr(d){ return d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate()); }
  function todayStr(){ return dstr(new Date()); }
  function nowHM(){ var d=new Date(); return pad2(d.getHours())+":"+pad2(d.getMinutes()); }
  function plural(n,one,few,many){ var m=Math.abs(n)%100,m1=m%10; if(m>10&&m<20) return many; if(m1>1&&m1<5) return few; if(m1===1) return one; return many; }
  function humanDate(s){ try{ var p=String(s).split("-"); return new Intl.DateTimeFormat("ru-RU",{day:"numeric",month:"long"}).format(new Date(+p[0],+p[1]-1,+p[2])); }catch(e){ return s||""; } }

  /* ----- статистика ----- */
  function streak(set){
    var today=new Date(), y=new Date(today.getTime()-86400000);
    if(!set[dstr(today)] && !set[dstr(y)]) return 0;
    var d=new Date(set[dstr(today)]?today:y), n=0;
    while(set[dstr(d)]){ n++; d=new Date(d.getTime()-86400000); }
    return n;
  }
  function stats(){
    var done=0,skip=0,dates={};
    sessions.forEach(function(it){ var d=it.data||{}; if(d.status==="done"){ done++; if(d.date) dates[d.date]=1; } else if(d.status==="skipped") skip++; });
    var manual=(meta&&typeof meta.manualPoints==="number")?meta.manualPoints:0;
    return { done:done, skip:skip, points:done*10+manual, streak:streak(dates) };
  }

  /* ----- звук (спокойный пад) ----- */
  function startAudio(){
    try{
      var AC=window.AudioContext||window.webkitAudioContext; if(!AC) return;
      audio=new AC(); if(audio.state==="suspended") audio.resume();
      var g=audio.createGain(); g.gain.value=0.05; g.connect(audio.destination);
      audio._osc=[196,261.63,329.63].map(function(f){ var o=audio.createOscillator(); o.type="sine"; o.frequency.value=f; var og=audio.createGain(); og.gain.value=0.5; o.connect(og); og.connect(g); o.start(); return o; });
    }catch(e){}
  }
  function stopAudio(){ try{ if(audio){ if(audio._osc) audio._osc.forEach(function(o){ try{o.stop();}catch(e){} }); audio.close(); audio=null; } }catch(e){} }

  /* ----- кольцо/таймер ----- */
  function ringSVG(progress){
    var off=C*(1-progress);
    return '<svg class="tt-ring" width="230" height="230" viewBox="0 0 230 230" aria-hidden="true">'
      +'<defs><linearGradient id="ttgrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3df0c0"/><stop offset="1" stop-color="#19e3ff"/></linearGradient></defs>'
      +'<circle class="track" cx="115" cy="115" r="100" fill="none" stroke-width="14"/>'
      +'<circle class="prog" id="ttProg" cx="115" cy="115" r="100" fill="none" stroke-width="14" stroke-dasharray="'+C.toFixed(2)+'" stroke-dashoffset="'+off.toFixed(2)+'"/></svg>';
  }
  function renderStageIdle(){
    E.stage.innerHTML='<div class="tt-ring-wrap">'+ringSVG(0)
      +'<div class="tt-center"><div class="tt-emoji">🪥</div><div class="tt-count">'+fmtTime(DURATION)+'</div><div class="tt-state">2 минуты чистим</div></div></div>'
      +'<button class="tt-start" id="ttStart">Начать чистку</button>';
    E.stage.querySelector("#ttStart").onclick=start;
  }
  function renderStageRunning(){
    E.stage.innerHTML='<div class="tt-ring-wrap">'+ringSVG(0)
      +'<div class="tt-center"><div class="tt-count" id="ttCount">'+fmtTime(DURATION)+'</div><div class="tt-state">Чистим зубки…</div></div></div>'
      +'<button class="tt-cancel" id="ttCancel">Отменить</button>';
    E.prog=E.stage.querySelector("#ttProg"); E.count=E.stage.querySelector("#ttCount");
    E.stage.querySelector("#ttCancel").onclick=cancel;
  }
  function start(){
    if(running) return; running=true; remaining=DURATION; renderStageRunning(); startAudio();
    sdk.ui.haptics(10); sdk.events.track("started",{});
    var startMs=Date.now();
    timerId=setInterval(function(){
      var el=(Date.now()-startMs)/1000; remaining=Math.max(0,DURATION-el);
      var prog=Math.min(1,el/DURATION);
      if(E.prog) E.prog.style.strokeDashoffset=(C*(1-prog)).toFixed(2);
      if(E.count) E.count.textContent=fmtTime(Math.ceil(remaining));
      if(remaining<=0) finish();
    },200);
  }
  function stopTimer(){ if(timerId){ clearInterval(timerId); timerId=null; } stopAudio(); running=false; }
  function finish(){
    stopTimer();
    sdk.ui.confetti(); sdk.ui.chime(); sdk.ui.haptics([25,40,25,40,70]);
    sdk.ui.toast("Отлично! Чистка завершена 🎉");
    sdk.points.add(10,"teeth");
    sdk.data.create("sessions",{date:todayStr(),time:nowHM(),status:"done",points:10}).then(function(){ return reloadSessions(); }).then(function(){ renderStageIdle(); refresh(); });
  }
  function cancel(){
    if(!running) return;
    stopTimer();
    sdk.ui.toast("Чистка прервана — очки не начислены");
    sdk.data.create("sessions",{date:todayStr(),time:nowHM(),status:"skipped",points:0}).then(function(){ return reloadSessions(); }).then(function(){ renderStageIdle(); refresh(); });
  }

  /* ----- данные ----- */
  function reloadSessions(){ return sdk.data.list("sessions").then(function(list){ sessions=(list||[]).slice().sort(function(a,b){ return (b.createdAt||0)-(a.createdAt||0); }); }); }
  function loadMeta(){
    return sdk.data.list("meta").then(function(list){
      if(list&&list.length){ metaId=list[0].id; meta=Object.assign({morning:"07:30",evening:"20:30",manualPoints:0}, list[0].data||{}); return; }
      return sdk.data.create("meta",{morning:"07:30",evening:"20:30",manualPoints:0}).then(function(it){ metaId=it&&it.id; meta={morning:"07:30",evening:"20:30",manualPoints:0}; });
    });
  }

  /* ----- рендер ----- */
  function refresh(){
    var s=stats();
    E.info.innerHTML='<span class="tt-chip reward">Награда: <b>+10</b></span>'
      +'<span class="tt-chip streak">Серия: <b>'+s.streak+'</b> '+plural(s.streak,"день","дня","дней")+'</span>'
      +'<span class="tt-chip points">Очки: <b>'+s.points+'</b></span>';
    sdk.ui.hud({ left:'🦷 <b>зубки</b>', cNum:s.streak, cLbl:"серия", rNum:s.points, rLbl:"очки" });
    renderList();
  }
  function renderList(){
    if(!sessions.length){ E.list.innerHTML='<div style="color:#6f80a6;font-weight:600;font-size:14px;text-align:center;padding:14px">Пока нет чисток. Нажми «Начать чистку».</div>'; return; }
    E.list.innerHTML=sessions.slice(0,30).map(function(it){
      var d=it.data||{}; var ok=d.status==="done";
      return '<div class="tt-row"><div class="when">'+esc(humanDate(d.date))+'<small>'+esc(d.time||"")+'</small></div>'
        +'<span class="tt-status '+(ok?"done":"skip")+'">'+(ok?"Выполнено":"Пропущено")+'</span></div>';
    }).join("");
  }

  /* ----- напоминания (best-effort, пока приложение открыто) ----- */
  function clearReminders(){ reminderTimers.forEach(clearTimeout); reminderTimers=[]; }
  function scheduleOne(hhmm){
    if(!hhmm) return; var p=String(hhmm).split(":"); if(p.length<2) return;
    var now=new Date(), t=new Date(); t.setHours(+p[0], +p[1], 0, 0);
    var ms=t-now; if(ms<=0 || ms>24*3600*1000) return;
    var morning=(+p[0]<12);
    reminderTimers.push(setTimeout(function(){ try{ new Notification("RobTop", { body: morning?"Пора почистить зубы!":"Не забудь вечернюю чистку зубов." }); }catch(e){} }, ms));
  }
  function applyReminders(){ try{ if(!("Notification" in window) || Notification.permission!=="granted" || !meta) return; clearReminders(); scheduleOne(meta.morning); scheduleOne(meta.evening); }catch(e){} }
  function enableReminders(){
    if(!("Notification" in window)){ sdk.ui.toast("Уведомления не поддерживаются"); return; }
    Notification.requestPermission().then(function(perm){ if(perm==="granted"){ applyReminders(); sdk.ui.toast("Напоминания включены"); } else sdk.ui.toast("Уведомления запрещены в браузере"); });
  }

  /* ----- родительская панель ----- */
  function openParentGate(){
    var box=document.createElement("div");
    box.innerHTML='<h2>Родителям</h2><p style="text-align:center;color:#cfe0ff;font-weight:600;margin:0 0 4px">Введите PIN родителя.</p>'
      +'<div class="pin-row"><input id="ttPin" type="password" inputmode="numeric" placeholder="PIN" autocomplete="off"><button class="btn btn-primary" id="ttPinBtn" style="flex:0 0 40%">Войти</button></div>';
    var ctl=sdk.ui.sheet(box); curSheet=ctl;
    var inp=box.querySelector("#ttPin"), btn=box.querySelector("#ttPinBtn");
    function go(){ var v=(inp.value||"").trim(); if(!v) return; sdk.admin.verify(v).then(function(ok){ if(ok){ ctl.close(); openParent(); } else sdk.ui.toast("Неверный PIN"); }); }
    btn.onclick=go; inp.addEventListener("keydown",function(e){ if(e.key==="Enter") go(); });
    setTimeout(function(){ inp.focus(); },200);
  }
  function openParent(){
    var s=stats();
    var box=document.createElement("div");
    box.innerHTML='<h2>Родителям</h2>'
      +'<div class="tt-pgrid"><div class="tt-pstat"><div class="n">'+s.done+'</div><div class="l">выполнено</div></div>'
        +'<div class="tt-pstat"><div class="n">'+s.skip+'</div><div class="l">пропущено</div></div>'
        +'<div class="tt-pstat"><div class="n">'+s.points+'</div><div class="l">очки</div></div></div>'
      +'<div class="store-section">Очки вручную</div>'
      +'<div class="tt-adjust"><button class="tt-pm" data-adj="-10">−</button><div class="pv" id="ttPV">'+s.points+'</div><button class="tt-pm" data-adj="10">+</button></div>'
      +'<div class="store-section">Напоминания</div>'
      +'<div class="tt-times"><div class="field"><label>Утро</label><input type="time" id="ttMorning" value="'+esc(meta.morning)+'"></div>'
        +'<div class="field"><label>Вечер</label><input type="time" id="ttEvening" value="'+esc(meta.evening)+'"></div></div>'
      +'<div class="sheet-actions" style="margin-top:12px"><button class="btn btn-cancel" id="ttRemind" style="flex:1">Включить напоминания</button></div>'
      +'<div class="tt-note">Напоминание сработает, пока приложение открыто. Для фоновых уведомлений добавь приложение на экран «Домой».</div>';
    var ctl=sdk.ui.sheet(box); curSheet=ctl;
    box.querySelectorAll("[data-adj]").forEach(function(b){ b.onclick=function(){ adjust(parseInt(b.getAttribute("data-adj"),10)); var pv=box.querySelector("#ttPV"); if(pv) pv.textContent=stats().points; }; });
    var mor=box.querySelector("#ttMorning"), eve=box.querySelector("#ttEvening");
    mor.onchange=function(){ setTime("morning",mor.value); };
    eve.onchange=function(){ setTime("evening",eve.value); };
    box.querySelector("#ttRemind").onclick=enableReminders;
  }
  function adjust(delta){
    meta.manualPoints=(meta.manualPoints||0)+delta;
    if(metaId) sdk.data.update("meta",metaId,{manualPoints:meta.manualPoints});
    sdk.points.add(delta,"teeth_manual");
    refresh();
  }
  function setTime(which,val){ if(!val) return; meta[which]=val; if(metaId){ var p={}; p[which]=val; sdk.data.update("meta",metaId,p); } clearReminders(); applyReminders(); }

  /* ----- каркас ----- */
  function buildSkeleton(){
    root.innerHTML='<div class="teeth">'
      +'<div class="tt-header"><button class="back" id="ttBack" aria-label="Назад">'+BACK_IC+'</button>'
        +'<div class="tt-head-main"><div class="tt-title">Таймер чистки зубов</div><div class="tt-sub">Чисти 2 минуты — получай очки</div></div>'
        +'<button class="hbtn" id="ttParent" aria-label="Родителям">'+PARENT_IC+'</button></div>'
      +'<div class="tt-stage" id="ttStage"></div>'
      +'<div class="tt-info" id="ttInfo"></div>'
      +'<div class="store-section">История чисток</div><div class="tt-list" id="ttList"></div>'
    +'</div>';
    E.stage=root.querySelector("#ttStage"); E.info=root.querySelector("#ttInfo"); E.list=root.querySelector("#ttList");
    root.querySelector("#ttBack").onclick=function(){ sdk.ui.back(); };
    root.querySelector("#ttParent").onclick=openParentGate;
    renderStageIdle();
  }

  function mount(rootEl, theSdk){
    sdk=theSdk; root=rootEl; sessions=[]; meta={morning:"07:30",evening:"20:30",manualPoints:0}; metaId=null;
    running=false; remaining=DURATION; reminderTimers=[]; curSheet=null;
    buildSkeleton();
    Promise.resolve().then(loadMeta).then(reloadSessions).then(function(){ refresh(); applyReminders(); }).catch(function(){ refresh(); });
  }
  function unmount(){
    stopTimer(); clearReminders();
    if(curSheet&&curSheet.close){ try{ curSheet.close(); }catch(e){} } curSheet=null;
    E={}; sessions=[];
  }

  RobTop.register({ id:"teeth", mount:mount, unmount:unmount });
})();
