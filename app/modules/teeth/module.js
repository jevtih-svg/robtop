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

  /* ----- плейлист (награда после чистки) -----
     Файлы лежат на сервере в media/music/ (вне Git, заливаются по FTP).
     Здесь хранятся только имена (код в Git). Порядок = порядок в массиве. */
  var MUSIC_DIR="media/music/";
  var PLAYLIST=[
    "ES_100 Times - Jones Meadow",
    "ES_And Then I Met You... - Matt Large",
    "ES_Beneath Quiet Stars - nothanks",
    "ES_Big Spoon (Instrumental Version) - Roof",
    "ES_Blood Eye - Cospe",
    "ES_Bright Future - Killrude",
    "ES_Close To Water - Ealot",
    "ES_Gatinha (Molife Remix) - Cornelio",
    "ES_Granular Details - Nebulae ",
    "ES_Guru Meditation - Bitwraith",
    "ES_It Happens Sometimes - Ceen",
    "ES_Melting Sun - Ealot",
    "ES_Moorlands - Ealot",
    "ES_Not Leaving without You - Matt Large",
    "ES_Only in Dreams - Ealot",
    "ES_Powerlines - Jones Meadow",
    "ES_Reap - Bjurman",
    "ES_Rhythmania 2 - August Wilhelmsson",
    "ES_Sippin - Cospe",
    "ES_Some Downtime - Paisley Pink",
    "ES_Spellbinding - Ealot",
    "ES_Squeezing Lime (Instrumental Version) - Sandro",
    "ES_Swerve - Molife",
    "ES_The Farmhouse - Silver Maple",
    "ES_Vale - dreem",
    "ES_When I Get Sober (Instrumental Version) - waykap",
    "ES_linne - bomull"
  ];
  function trackSrc(i){ return MUSIC_DIR+encodeURIComponent(PLAYLIST[i]+".mp3"); }
  function trackTitle(i){ return String(PLAYLIST[i]||"").replace(/^ES_/,"").replace(/\s+$/,"").trim() || ("Трек "+(i+1)); }

  var SKIP_IC='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5.5v13l9-6.5zM16.5 5H19v14h-2.5z"/></svg>';
  /* иконки для вкладок «История»/«Музыка» и списка треков */
  var NOTE_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18V5l10-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/></svg>';
  var CLOCK_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
  var CHECK_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>';
  var STAR_O_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.6l2.6 5.4 6 .8-4.4 4.2 1.1 6L12 17.4 6.7 20l1.1-6L3.4 9.8l6-.8z"/></svg>';
  var PV_PLAY='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>';
  var PV_PAUSE='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h3.4v14H7zM13.6 5H17v14h-3.4z"/></svg>';

  var sdk=null, root=null, E={}, sessions=[], meta=null, metaId=null;
  var running=false, remaining=DURATION, timerId=null, audio=null, reminderTimers=[], curSheet=null;
  var player=null, playing=false, curTrack=0;
  /* вкладки (История | Музыка), фильтр истории и НЕЗАВИСИМЫЙ плеер-превью для вкладки «Музыка».
     Превью не трогает звук во время чистки — это отдельная зона плеера (player/start/finish). */
  var tab="history", histFilter="all";
  var previewAudio=null, previewIdx=-1, previewPlaying=false;

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

  /* ----- музыка во время чистки (нативный HTML5 Audio, дружелюбно к мобильным) -----
     Трек из плейлиста играет все 2 минуты чистки вместо звука-пада.
     Старт идёт из обработчика клика по «Начать чистку» — это жест пользователя,
     поэтому play() разрешён даже на мобильных. */
  function ensurePlayer(){
    if(!player){ player=new Audio(); player.preload="none"; player.loop=false; }
    return player;
  }
  function stopMusic(){ try{ if(player){ player.pause(); } }catch(e){} playing=false; }
  function setTrack(i, autoplay){
    curTrack=((i%PLAYLIST.length)+PLAYLIST.length)%PLAYLIST.length;
    ensurePlayer(); player.src=trackSrc(curTrack); playing=false;
    if(E.npName) E.npName.textContent=trackTitle(curTrack);
    if(autoplay) playTrack();
  }
  function playTrack(){
    ensurePlayer();
    var pr=player.play();
    if(pr&&pr.then){ pr.then(function(){ playing=true; }).catch(function(){ playing=false; sdk.ui.toast("Нажми «Начать чистку» ещё раз, чтобы включить музыку"); }); }
    else { playing=true; }
  }
  /* индекс трека для ЭТОЙ чистки + куда сдвинуть указатель для следующей */
  function pickTrackForSession(){
    var idx, len=PLAYLIST.length;
    if(meta&&meta.shuffle){ idx=Math.floor(Math.random()*len); }
    else { idx=((meta&&typeof meta.trackIndex==="number")?meta.trackIndex:0)%len; if(idx<0) idx=0; }
    persistTrackIndex((idx+1)%len);
    return idx;
  }
  function skipTrack(){
    var len=PLAYLIST.length, next;
    if(meta&&meta.shuffle){ next=len>1?(curTrack+1+Math.floor(Math.random()*(len-1)))%len:curTrack; }
    else { next=(curTrack+1)%len; persistTrackIndex((next+1)%len); }
    sdk.ui.haptics(8);
    setTrack(next, true);
  }
  function persistTrackIndex(v){ if(meta){ meta.trackIndex=v; if(metaId) sdk.data.update("meta",metaId,{trackIndex:v}); } }

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
      +'<div class="tt-nowplaying"><span class="tt-np-label">🎵</span><span class="tt-np-name" id="ttNpName"></span>'
        +'<button class="tt-np-skip" id="ttNpSkip" aria-label="Другой трек">'+SKIP_IC+'</button></div>'
      +'<button class="tt-cancel" id="ttCancel">Отменить</button>';
    E.prog=E.stage.querySelector("#ttProg"); E.count=E.stage.querySelector("#ttCount"); E.npName=E.stage.querySelector("#ttNpName");
    E.stage.querySelector("#ttNpSkip").onclick=skipTrack;
    E.stage.querySelector("#ttCancel").onclick=cancel;
  }
  function start(){
    if(running) return; running=true; remaining=DURATION; renderStageRunning();
    curTrack=pickTrackForSession(); setTrack(curTrack, true);
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
  function stopTimer(){ if(timerId){ clearInterval(timerId); timerId=null; } stopMusic(); running=false; }
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
  function metaDefaults(){ return {morning:"07:30",evening:"20:30",manualPoints:0,trackIndex:0,shuffle:false}; }
  function loadMeta(){
    return sdk.data.list("meta").then(function(list){
      if(list&&list.length){ metaId=list[0].id; meta=Object.assign(metaDefaults(), list[0].data||{}); return; }
      return sdk.data.create("meta",metaDefaults()).then(function(it){ metaId=it&&it.id; meta=metaDefaults(); });
    });
  }

  /* ----- рендер ----- */
  function refresh(){
    var s=stats();
    E.info.innerHTML='<span class="tt-chip reward">Награда: <b>+10</b></span>'
      +'<span class="tt-chip streak">Серия: <b>'+s.streak+'</b> '+plural(s.streak,"день","дня","дней")+'</span>'
      +'<span class="tt-chip points">Очки: <b>'+s.points+'</b></span>';
    sdk.ui.hud({ left:'🦷 <b>зубки</b>', cNum:s.streak, cLbl:"серия", rNum:s.points, rLbl:"очки" });
    renderHistory(); renderMusic();
  }

  /* ----- вкладки: Таймер сверху, ниже История | Музыка ----- */
  function setTab(t){
    tab=t;
    if(E.history) E.history.hidden=(t!=="history");
    if(E.music) E.music.hidden=(t!=="music");
    if(E.tabs) Array.prototype.forEach.call(E.tabs.querySelectorAll(".tt-tab"),function(b){ b.classList.toggle("active", b.getAttribute("data-tab")===t); });
    if(t!=="music") stopPreview();
    if(t==="history") renderHistory(); else renderMusic();
    sdk.ui.haptics(6);
  }

  /* ----- История с фильтром (как вкладки в виш-листе: фильтруют список по статусу) ----- */
  function histCounts(){
    var c={all:sessions.length,done:0,skipped:0};
    sessions.forEach(function(it){ var st=(it.data&&it.data.status)||it.status; if(st==="done")c.done++; else if(st==="skipped")c.skipped++; });
    return c;
  }
  function histEmpty(){
    if(histFilter==="done") return "Ещё нет выполненных чисток. Доведи таймер до конца — запись появится здесь.";
    if(histFilter==="skipped") return "Нет пропущенных чисток. Так держать! 💪";
    return "Пока нет чисток. Нажми «Начать чистку».";
  }
  function setHistFilter(f){ histFilter=f; renderHistory(); sdk.ui.haptics(6); }
  function renderHistory(){
    var c=histCounts(), map={all:c.all,done:c.done,skipped:c.skipped};
    if(E.filter){
      Array.prototype.forEach.call(E.filter.querySelectorAll(".tt-fchip"),function(b){
        var f=b.getAttribute("data-f"), n=b.querySelector(".n"); if(n) n.textContent=map[f];
        b.classList.toggle("active", f===histFilter);
      });
    }
    if(!E.list) return;
    var rows=sessions.filter(function(it){ if(histFilter==="all") return true; var st=(it.data&&it.data.status)||it.status; return st===histFilter; });
    if(!rows.length){ E.list.innerHTML='<div class="tt-empty">'+histEmpty()+'</div>'; return; }
    E.list.innerHTML=rows.slice(0,60).map(function(it){
      var d=it.data||{}; var ok=(d.status||it.status)==="done";
      return '<div class="tt-row"><div class="when">'+esc(humanDate(d.date))+'<small>'+esc(d.time||"")+'</small></div>'
        +'<span class="tt-status '+(ok?"done":"skip")+'">'+(ok?"Выполнено":"Пропущено")+'</span></div>';
    }).join("");
  }

  /* ----- Музыка: выбор трека (что заиграет следующим) + прослушивание -----
     Звёздочка пишет выбор в СУЩЕСТВУЮЩИЙ указатель meta.trackIndex (его читает pickTrackForSession),
     поэтому выбранный трек заиграет на следующей чистке.
     Кнопка ▶: ВНЕ чистки — превью на отдельном previewAudio (плеер чистки не трогает);
     ВО ВРЕМЯ чистки — переключает ЖИВОЙ трек плеера (setTrack), чтобы не звучало два трека сразу. */
  function selIdx(){ var i=(meta&&typeof meta.trackIndex==="number")?(meta.trackIndex%PLAYLIST.length):0; return i<0?0:i; }
  function ensurePreview(){
    if(!previewAudio){ previewAudio=new Audio(); previewAudio.preload="none";
      previewAudio.addEventListener("ended",function(){ previewPlaying=false; previewIdx=-1; if(tab==="music") renderMusic(); }); }
    return previewAudio;
  }
  function stopPreview(){ try{ if(previewAudio){ previewAudio.pause(); } }catch(e){} previewPlaying=false; previewIdx=-1; }
  function previewToggle(i){
    /* во время активной чистки переключаем ЖИВОЙ трек плеера, без параллельного превью */
    if(running){
      stopPreview();
      if(i!==curTrack || !playing){ setTrack(i, true); }
      renderMusic(); sdk.ui.haptics(8);
      return;
    }
    ensurePreview();
    if(previewPlaying && previewIdx===i){ stopPreview(); renderMusic(); sdk.ui.haptics(6); return; }
    previewIdx=i; previewAudio.src=trackSrc(i);
    var pr=previewAudio.play();
    if(pr&&pr.then){ pr.then(function(){ previewPlaying=true; renderMusic(); }).catch(function(){ previewPlaying=false; previewIdx=-1; renderMusic(); sdk.ui.toast("Нажми ещё раз, чтобы послушать"); }); }
    else { previewPlaying=true; renderMusic(); }
    sdk.ui.haptics(8);
  }
  function pickTrack(i){
    if(meta){ meta.trackIndex=i; if(metaId) sdk.data.update("meta",metaId,{trackIndex:i}); }
    renderMusic(); sdk.ui.haptics(10);
    sdk.ui.toast((meta&&meta.shuffle) ? ("Отмечен трек: "+trackTitle(i)+" (выключи случайный порядок, чтобы он играл)") : ("Следующим заиграет: "+trackTitle(i)));
  }
  function renderMusic(){
    if(!E.musicList) return;
    var sel=selIdx(), shuffle=!!(meta&&meta.shuffle);
    if(E.mhint) E.mhint.innerHTML=NOTE_IC+' '+(running
        ? 'Идёт чистка. Нажми на трек, чтобы переключить музыку прямо сейчас.'
        : (shuffle?'Сейчас случайный порядок треков. Выбор отметит трек, но играть он будет вразнобой.'
                 :'Выбери трек — он заиграет на следующей чистке. ▶ послушать.'));
    E.musicList.innerHTML=PLAYLIST.map(function(_,i){
      var on=(i===sel && !shuffle);
      var live=(running && i===curTrack);                       // трек, который звучит во время чистки
      var previewing=(!running && previewPlaying && i===previewIdx);
      var note=live?' · играет сейчас':((on && !running)?' · играет следующим':'');
      return '<div class="tt-mrow'+(on?" sel":"")+(live?" live":"")+'" data-i="'+i+'">'
        +'<button class="tt-mplay'+((previewing||live)?" playing":"")+'" data-act="prev" data-i="'+i+'" aria-label="'+(previewing?"Пауза":(live?"Играет сейчас":"Слушать"))+'">'+(previewing?PV_PAUSE:PV_PLAY)+'</button>'
        +'<div class="tt-minfo"><div class="tt-mnum">Трек '+(i+1)+note+'</div><div class="tt-mname">'+esc(trackTitle(i))+'</div></div>'
        +'<button class="tt-mpick'+(on?" on":"")+'" data-act="pick" data-i="'+i+'" aria-label="Выбрать">'+(on?CHECK_IC:STAR_O_IC)+'</button>'
        +'</div>';
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
      +'<div class="store-section">Музыка-награда</div>'
      +'<label class="tt-toggle"><span>Случайный порядок треков</span><input type="checkbox" id="ttShuffle"'+(meta.shuffle?' checked':'')+'><span class="tt-switch"></span></label>'
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
    var shuf=box.querySelector("#ttShuffle");
    if(shuf) shuf.onchange=function(){ meta.shuffle=!!shuf.checked; if(metaId) sdk.data.update("meta",metaId,{shuffle:meta.shuffle}); sdk.ui.toast(meta.shuffle?"Случайный порядок включён":"Треки по очереди"); };
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
      +'<nav class="tt-tabs" id="ttTabs">'
        +'<button class="tt-tab active" data-tab="history">'+CLOCK_IC+'<span>История</span></button>'
        +'<button class="tt-tab" data-tab="music">'+NOTE_IC+'<span>Музыка</span></button>'
      +'</nav>'
      +'<section class="tt-panel" id="ttHistory">'
        +'<div class="tt-filter" id="ttFilter">'
          +'<button class="tt-fchip active" data-f="all"><span class="t">Все</span><span class="n">0</span></button>'
          +'<button class="tt-fchip" data-f="done"><span class="t">Выполнено</span><span class="n">0</span></button>'
          +'<button class="tt-fchip" data-f="skipped"><span class="t">Пропущено</span><span class="n">0</span></button>'
        +'</div>'
        +'<div class="tt-list" id="ttList"></div>'
      +'</section>'
      +'<section class="tt-panel" id="ttMusic" hidden>'
        +'<div class="tt-mhint" id="ttMhint"></div>'
        +'<div class="tt-music" id="ttMusicList"></div>'
      +'</section>'
    +'</div>';
    E.stage=root.querySelector("#ttStage"); E.info=root.querySelector("#ttInfo");
    E.tabs=root.querySelector("#ttTabs"); E.history=root.querySelector("#ttHistory"); E.music=root.querySelector("#ttMusic");
    E.filter=root.querySelector("#ttFilter"); E.list=root.querySelector("#ttList");
    E.mhint=root.querySelector("#ttMhint"); E.musicList=root.querySelector("#ttMusicList");
    root.querySelector("#ttBack").onclick=function(){ sdk.ui.back(); };
    root.querySelector("#ttParent").onclick=openParentGate;
    E.tabs.addEventListener("click",function(e){ var t=e.target.closest(".tt-tab"); if(t) setTab(t.getAttribute("data-tab")); });
    E.filter.addEventListener("click",function(e){ var b=e.target.closest(".tt-fchip"); if(b) setHistFilter(b.getAttribute("data-f")); });
    E.music.addEventListener("click",function(e){ var b=e.target.closest("[data-act]"); if(!b) return; var i=parseInt(b.getAttribute("data-i"),10); if(isNaN(i)) return; if(b.getAttribute("data-act")==="prev") previewToggle(i); else pickTrack(i); });
    E.stage.addEventListener("click", stopPreview, true);
    setTab("history");
    renderStageIdle();
  }

  function mount(rootEl, theSdk){
    sdk=theSdk; root=rootEl; sessions=[]; meta=metaDefaults(); metaId=null;
    running=false; remaining=DURATION; reminderTimers=[]; curSheet=null;
    player=null; playing=false; curTrack=0;
    tab="history"; histFilter="all"; previewAudio=null; previewIdx=-1; previewPlaying=false;
    buildSkeleton();
    Promise.resolve().then(loadMeta).then(reloadSessions).then(function(){ refresh(); applyReminders(); }).catch(function(){ refresh(); });
  }
  function unmount(){
    stopTimer(); clearReminders(); stopMusic(); stopPreview();
    try{ if(player){ player.src=""; player=null; } }catch(e){} playing=false;
    try{ if(previewAudio){ previewAudio.src=""; previewAudio=null; } }catch(e){}
    if(curSheet&&curSheet.close){ try{ curSheet.close(); }catch(e){} } curSheet=null;
    E={}; sessions=[];
  }

  RobTop.register({ id:"teeth", mount:mount, unmount:unmount });
})();
