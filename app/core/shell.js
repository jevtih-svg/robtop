/* RobTop — оболочка (shell): главный экран, общие UI-сервисы, роутер, настройки, магазин приложений.
   Модули монтируются в #module-view через loader. Источник правды по модулям — registry.php
   (на сервере) либо встроенный список + localStorage (демо/офлайн).
   Все тексты — через RobTop.i18n (язык: en/ru/lv). Имена плиток: ключи tile.<id>. */
window.RobTop = window.RobTop || {};
(function(RT){
  "use strict";
  var I=RT.i18n;
  function t(k,p){ return I.t(k,p); }
  var SERVER=(location.protocol==="http:"||location.protocol==="https:");
  var demo=!SERVER;

  /* ---- аккаунт (сессия accounts.php). null = ещё не проверяли. ---- */
  var acct=null;
  function isParent(){ return !!(acct && acct.authenticated && acct.user && acct.user.kind==="parent"); }
  function loadAccount(){
    if(demo){ acct={authenticated:false}; return Promise.resolve(acct); }
    return RT.API.post("accounts.php",{op:"me"}).then(function(r){
      acct=(r&&r.ok)?r:{authenticated:false};
      if(acct.authenticated && acct.user){
        RT._shell.user={ id:acct.user.id, name:acct.user.nickname, role:(acct.user.kind==="parent"?"parent":"child") };
        ensureDeviceToken(acct.user); // самолечение: текущий аккаунт всегда в списке устройства
        // тема аккаунта (users.theme): применить визуально (RTTheme сам кэширует в rt_theme)
        if(acct.user.theme && window.RTTheme) RTTheme.set(acct.user.theme);
      }
      return acct;
    }).catch(function(){ acct={authenticated:false}; return acct; });
  }

  function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];}); }
  /* локализованное имя плитки/модуля (нативные — из tile.<id>, установленные — из манифеста) */
  function modName(m){ return t("tile."+m.id, {fallback:m.name||m.id}); }
  /* текст ошибки из ответа сервера: переводим по коду err.<code>, иначе message/фолбэк */
  function errMsg(r, fallbackKey){
    if(r&&r.error) return t("err."+r.error, {fallback:(r.message||r.error), name:r.name});
    return t(fallbackKey||"common.failed");
  }

  /* ---- иконки плиток (по id модуля) ---- */
  var ICONS={
    cherry:'<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="7.5" cy="17" r="3.6"/><circle cx="15.7" cy="17.6" r="3.6"/><path d="M8 14.4C9 8.4 13 5 18.4 3.8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M16.1 14.6C16.7 9.4 15 6 12 3.9" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M18.4 3.8c1-1.1 2.7-1.1 3.6.3-1.5.5-2.5.4-3.6-.3z"/></svg>',
    smile:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><circle cx="9" cy="10.2" r="1.05" fill="currentColor" stroke="none"/><circle cx="15" cy="10.2" r="1.05" fill="currentColor" stroke="none"/><path d="M8.4 14.4a4.2 4.2 0 0 0 7.2 0" stroke-linecap="round"/></svg>',
    tooth:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"><path d="M6 4.2c2 0 2.2 1.4 6 1.4s4-1.4 6-1.4 3 2 2.5 6-1 9.4-2.6 9.4-1.4-5-3.4-5-2 5-3.5 5-2-5.4-2.5-9.4S4 4.2 6 4.2z"/></svg>',
    quiz:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><path d="M9.4 9.6a2.6 2.6 0 1 1 3.7 2.4c-.95.45-1.6 1-1.6 2.1" stroke-linecap="round"/><circle cx="11.5" cy="17" r="1" fill="currentColor" stroke="none"/></svg>',
    tag:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 12V5a1 1 0 0 1 1-1h7l8 8-8 8z"/><circle cx="8.4" cy="8.4" r="1.4" fill="currentColor" stroke="none"/></svg>',
    reverse:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8.5h12l-3.2-3.2M20 15.5H8l3.2 3.2"/></svg>',
    calendar:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 9.2h17M8 3.2v3.6M16 3.2v3.6" stroke-linecap="round"/></svg>',
    search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="11" cy="11" r="6"/><path d="M15.5 15.5L20 20"/></svg>',
    museum:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.2l9-5 9 5M5 9.2v7.8M19 9.2v7.8M9 9.2v7.8M15 9.2v7.8M3.4 20.2h17.2"/></svg>',
    star:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l2.7 5.7 6.3.8-4.6 4.4 1.2 6.2L12 17.8 6.4 20.1l1.2-6.2L3 9.5l6.3-.8z"/></svg>',
    gem:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M6 3.2h12l3 5-9 12.6L3 8.2z"/><path d="M3 8.2h18M9 3.2l-3 5 6 12.6 6-12.6-3-5"/></svg>',
    bank:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="6.6" rx="7" ry="3"/><path d="M5 6.6v6.4c0 1.7 3.1 3 7 3s7-1.3 7-3V6.6"/><path d="M5 13c0 1.7 3.1 3 7 3s7-1.3 7-3"/></svg>',
    lock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="5" y="11" width="14" height="9" rx="2.2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    paw:'<svg viewBox="0 0 24 24" fill="currentColor"><ellipse cx="6.4" cy="10" rx="1.7" ry="2.3"/><ellipse cx="9.9" cy="7.3" rx="1.7" ry="2.4"/><ellipse cx="14.1" cy="7.3" rx="1.7" ry="2.4"/><ellipse cx="17.6" cy="10" rx="1.7" ry="2.3"/><path d="M12 11.2c2.9 0 5.3 2.1 5.7 4.8.3 1.9-1.1 3.4-3 3.4-1.3 0-1.9-.6-2.7-.6s-1.4.6-2.7.6c-1.9 0-3.3-1.5-3-3.4.4-2.7 2.8-4.8 5.7-4.8z"/></svg>',
    snake:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3.6 5.6h9.9a3.2 3.2 0 0 1 0 6.4H7.4a3.2 3.2 0 0 0 0 6.4h7.2"/><circle cx="16.8" cy="18.4" r="2.5" fill="currentColor" stroke="none"/><path d="M19.6 18.4l2.2-1.1M19.6 18.4l2.2 1.1" stroke-width="1.6"/></svg>',
    cube:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/></svg>',
    gift:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="9" width="16" height="11" rx="1.6"/><path d="M4 12.5h16M12 9v11"/><path d="M12 9c-4 0-5.4-2-4.6-3.6C8.2 3.8 11 4.6 12 9zM12 9c4 0 5.4-2 4.6-3.6C15.8 3.8 13 4.6 12 9z"/></svg>',
    chat:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.6a7.6 7.6 0 0 1-7.6 7.6c-1.3 0-2.5-.3-3.6-.9L4.4 19.6l1.3-5A7.6 7.6 0 1 1 21 11.6z"/><circle cx="9.6" cy="11.6" r="1" fill="currentColor" stroke="none"/><circle cx="13.4" cy="11.6" r="1" fill="currentColor" stroke="none"/><circle cx="17.2" cy="11.6" r="1" fill="currentColor" stroke="none"/></svg>',
    friends:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8.5" r="3.1"/><path d="M3.6 19.2a5.4 5.4 0 0 1 10.8 0"/><path d="M15.5 5.6a3 3 0 0 1 .2 5.6"/><path d="M16.3 13.3a5.4 5.4 0 0 1 4.1 5.9"/></svg>'
  };
  var TILE_ICON={ wishlist:"cherry", reverse:"reverse", mood:"smile", teeth:"tooth", guess:"quiz", names:"tag", days:"calendar", find:"search", museum:"museum", rating:"star", friends:"friends", lost:"gem", walk:"paw", snake:"snake", bank:"bank", shop:"gift", chat:"chat" };
  var BACK_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 5.5L8 12l6.5 6.5"/></svg>';

  /* ---- встроенный список модулей (демо/фолбэк). name — фолбэк, отображается tile.<id> ---- */
  var DEFAULTS=[
    {id:"wishlist",name:"Wishlist",color:"#ff3db0",status:"active",source:"native",server:true,sort:10},
    {id:"reverse",name:"Words Backwards",color:"#ff7a3d",status:"active",source:"native",server:false,sort:20},
    {id:"mood",name:"Mood of the Day",color:"#ffd23b",status:"active",source:"native",sort:30},
    {id:"teeth",name:"Toothbrushing Timer",color:"#19e3ff",status:"active",source:"native",sort:40},
    {id:"guess",name:"Guess the Number",color:"#a64bff",status:"active",source:"native",sort:50},
    {id:"names",name:"Funny Names",color:"#38e8a0",status:"active",source:"native",sort:60},
    {id:"days",name:"Day Counter",color:"#3b6bff",status:"active",source:"native",sort:70},
    {id:"find",name:"Find the Object",color:"#19e3ff",status:"active",source:"native",sort:80},
    {id:"museum",name:"Home Museum",color:"#c0a0ff",status:"soon",source:"native",sort:90},
    {id:"rating",name:"Day Rating",color:"#ffd23b",status:"active",source:"native",sort:100},
    {id:"friends",name:"Friends",color:"#c08bff",status:"active",source:"native",sort:105},
    {id:"lost",name:"Lost & Found",color:"#2bf0c0",status:"soon",source:"native",sort:110},
    {id:"walk",name:"Dog Walk",color:"#38e8a0",status:"active",source:"native",sort:115},
    {id:"snake",name:"Snake",color:"#19e3ff",status:"active",source:"native",sort:117},
    {id:"bank",name:"Piggy Bank",color:"#ff4d6d",status:"active",source:"native",wide:true,sort:120},
    {id:"shop",name:"Shop",color:"#ff2bd6",status:"active",source:"native",sort:130},
    {id:"chat",name:"Chat",color:"#3b6bff",status:"active",source:"native",server:true,sort:135}
  ];

  /* ---- localStorage помощники (демо) ---- */
  function lsGet(k,def){ try{ var r=localStorage.getItem(k); return r?JSON.parse(r):def; }catch(e){ return def; } }
  function lsSet(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }
  function getOverrides(){ return lsGet("robtop_modreg",{}); }
  function setOverrides(o){ lsSet("robtop_modreg",o); }
  function getInstalled(){ return lsGet("robtop_installed",{}); }
  function setInstalled(o){ lsSet("robtop_installed",o); }

  /* ---- DOM ---- */
  var body, appsEl, homeView, moduleView, lockView, parentView, settingsView, fabEl, toastEl, demoBadge,
      hudEl,hudL,hudCnum,hudClbl,hudRnum,hudRlbl, settingsBody,
      storeOverlay, storeBody, gearBtn, kidBarEl, notifView, homeJgl=null;

  /* ================= общие UI-сервисы ================= */
  /* prefers-reduced-motion гасит и вибрацию (аудит 2026-06-10): меньше движения = меньше сенсорики */
  var REDUCE_MOTION=!!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  function buzz(p){ if(REDUCE_MOTION) return; try{ if(navigator.vibrate) navigator.vibrate(p); }catch(e){} }
  var actx=null;
  function chime(){
    try{
      var AC=window.AudioContext||window.webkitAudioContext; if(!AC) return;
      actx=actx||new AC(); if(actx.state==="suspended") actx.resume();
      var notes=[523.25,659.25,783.99,1046.5];
      for(var i=0;i<notes.length;i++){
        var o=actx.createOscillator(),g=actx.createGain(),tt=actx.currentTime+i*0.09;
        o.type="triangle"; o.frequency.value=notes[i];
        g.gain.setValueAtTime(0,tt); g.gain.linearRampToValueAtTime(0.11,tt+0.02); g.gain.exponentialRampToValueAtTime(0.0001,tt+0.5);
        o.connect(g); g.connect(actx.destination); o.start(tt); o.stop(tt+0.55);
      }
    }catch(e){}
  }
  var toastT=null;
  function hideToast(){ toastEl.classList.remove("show"); }
  function toast(msg,actLabel,actFn){
    /* пока виден «✓ Готово» режима перестановки, низ занят — тост уезжает наверх (.top),
       иначе подсказка «Перетащи…» ложилась ровно на пилюлю */
    toastEl.classList.toggle("top", !!document.querySelector(".jgl-done"));
    toastEl.innerHTML='<span>'+esc(msg)+'</span>'+(actLabel?'<button class="toast-act" type="button">'+esc(actLabel)+'</button>':"");
    toastEl.classList.toggle("has-act",!!actLabel); toastEl.classList.add("show");
    if(actLabel){ var b=toastEl.querySelector(".toast-act"); b.onclick=function(){ try{ if(actFn) actFn(); }catch(e){} hideToast(); }; }
    clearTimeout(toastT); toastT=setTimeout(hideToast, actLabel?6000:2200);
  }
  function enableDrag(sheet, close){
    var startY=0, dy=0, dragging=false;
    sheet.addEventListener("touchstart",function(e){ if(sheet.scrollTop>2){ dragging=false; return; } startY=e.touches[0].clientY; dy=0; dragging=true; sheet.style.transition="none"; },{passive:true});
    sheet.addEventListener("touchmove",function(e){ if(!dragging) return; dy=e.touches[0].clientY-startY; if(dy>0){ if(e.cancelable) e.preventDefault(); sheet.style.transform="translateY("+dy+"px)"; } },{passive:false});
    sheet.addEventListener("touchend",function(){ if(!dragging) return; dragging=false; sheet.style.transition="transform .22s ease"; if(dy>120){ sheet.style.transform="translateY(100%)"; setTimeout(function(){ sheet.style.transform=""; sheet.style.transition=""; close(); },200); } else { sheet.style.transform=""; setTimeout(function(){ sheet.style.transition=""; },220); } });
  }
  /* hud({hidden:true}) прячет HUD на время полноэкранных сцен модуля (игра в змейке);
     ЛЮБОЙ обычный вызов hud(values) снимает скрытие — чужой модуль не унаследует спрятанный HUD. */
  function hud(o){ o=o||{}; if(hudEl) hudEl.classList.toggle("hud-off", o.hidden===true); if(RT.Notify) RT.Notify.hide(o.hidden===true); if(kidBarEl && o.hidden!=null) kidBarEl.classList.toggle("rt-bar-hide", o.hidden===true); if(o.left!=null) hudL.innerHTML=o.left; if(o.cNum!=null) hudCnum.textContent=o.cNum; if(o.cLbl!=null) hudClbl.textContent=o.cLbl; if(o.rNum!=null) hudRnum.textContent=o.rNum; if(o.rLbl!=null) hudRlbl.textContent=o.rLbl; }
  /* ---- скрытый реордер (long-press ~0.55с → jiggle + drag): главный экран и дашборд ----
     Никакого видимого UI до жеста: удержал элемент — режим «дрожания», тащишь — порядок
     меняется, отпустил — onCommit(ids) сохраняет. Выход — плавающая кнопка ✓ или навигация
     (вызвать .exit()). Делегировано на container, переживает перерисовку innerHTML.

     iOS-КРИТИЧНО (фикс 2026-06-07 по багам Джеффа «призрак прилип / дёргается / выделяет текст»):
     1) Элемент-ЦЕЛЬ тача нельзя перемещать по DOM (insertBefore) или прятать display:none во
        время жеста — WebKit молча убивает поток pointer-событий: pointerup не приходит, драг
        «умирает», а следующий startDrag перезаписывал ghost, оставляя старый призрак на экране.
        Теперь src на время драга уходит из потока классом .jgl-hold (fixed за экраном, но
        ОСТАЁТСЯ в DOM), по сетке двигается слот-клон, а src возвращается на место слота одним
        replaceChild на отпускании.
     2) Вся DOM/transform-работа — в rAF-цикле (события только пишут координаты), призраку CSS
        глушит transition (клон .tile наследовал transform .14s — отсюда «резинка»), автоскролл
        плавный покадровый, перестановка слота только при пересечении центра цели.
     3) Контейнер получает класс .jgl-zone: user-select/touch-callout выключены ПОСТОЯННО —
        иначе за 550мс удержания iOS успевает начать выделение текста/показать лупу.
     Страховки: killGhosts() сметает все .jgl-ghost в документе, startDrag закрывает
     «застрявший» прошлый драг, window-листенеры мёртвого жеста не копятся (gcleanup),
     pointercancel откатывает без сохранения. */
  function makeJiggle(container, opts){
    var itemSel=opts.items, idAttr=opts.idAttr||"data-mod", skipSel=opts.skip||null;
    var mode=false, src=null, slot=null, ghost=null, sx=0, sy=0, lx=0, ly=0,
        pressT=null, donePill=null, suppress=false, gcleanup=null, rafOn=false;
    container.classList.add("jgl-zone");
    function items(){ return Array.prototype.slice.call(container.querySelectorAll(itemSel)); }
    function killGhosts(){
      Array.prototype.forEach.call(document.querySelectorAll(".jgl-ghost"),function(g){
        if(g.parentNode) g.parentNode.removeChild(g);
      });
      ghost=null;
    }
    function enter(){
      if(mode) return; mode=true;
      container.classList.add("jgl");
      items().forEach(function(el){ el.classList.add("jgl-on"); });
      buzz([14,40,14]);
      donePill=document.createElement("button"); donePill.type="button"; donePill.className="jgl-done";
      donePill.textContent="✓ "+t("common.done");
      donePill.addEventListener("click",function(){ exit(); });
      document.body.appendChild(donePill);
      toast(t("reorder.hint"));
    }
    function exit(){
      if(!mode) return; mode=false;
      endDrag(false);
      container.classList.remove("jgl");
      items().forEach(function(el){ el.classList.remove("jgl-on","jgl-src"); });
      if(donePill&&donePill.parentNode) donePill.parentNode.removeChild(donePill);
      donePill=null;
    }
    function startDrag(el,x,y){
      if(src) endDrag(false); // прошлый драг не закрылся (умер поток событий) — тихо закрыть
      killGhosts();
      src=el; sx=x; sy=y; lx=x; ly=y;
      var r=el.getBoundingClientRect();
      ghost=el.cloneNode(true);
      ghost.classList.add("jgl-ghost"); ghost.classList.remove("jgl-on","jgl-src");
      ghost.style.width=r.width+"px"; ghost.style.height=r.height+"px";
      ghost.style.left=r.left+"px"; ghost.style.top=r.top+"px";
      document.body.appendChild(ghost);
      slot=el.cloneNode(true);                  // видимый «слот»: двигается по сетке ВМЕСТО src
      slot.classList.add("jgl-src"); slot.classList.remove("jgl-on");
      slot.removeAttribute(idAttr);             // чтобы слот не попал в onCommit
      slot.style.pointerEvents="none";
      el.parentNode.insertBefore(slot,el.nextSibling);
      el.classList.add("jgl-hold");             // вне потока, но в DOM (iOS, см. шапку)
      buzz(12);
      if(!rafOn){ rafOn=true; requestAnimationFrame(frame); }
    }
    /* весь драг в rAF: transform призрака, плавный автоскролл у краёв, перестановка слота */
    function frame(){
      if(!ghost){ rafOn=false; return; }
      ghost.style.transform="translate3d("+(lx-sx)+"px,"+(ly-sy)+"px,0) scale(1.05)";
      if(ly<80) window.scrollBy(0,-9); else if(ly>window.innerHeight-80) window.scrollBy(0,9);
      try{ reorder(); }catch(e){} // сбой перестановки не должен убивать rAF-цикл (призрак бы «завис»)
      requestAnimationFrame(frame);
    }
    function reorder(){
      if(!slot) return;
      var el=document.elementFromPoint(lx,ly); el=el&&el.closest?el.closest(itemSel):null;
      if(!el||el===slot||el===src||!container.contains(el)) return;
      var r=el.getBoundingClientRect();
      /* слот двигаем только при пересечении центра цели (диагональная сумма работает и в
         сетке 2 колонки, и на широких плитках) — нет дребезга на границах */
      var after=((ly-(r.top+r.height/2))+(lx-(r.left+r.width/2)))>0;
      if(after){ if(el.nextSibling!==slot) el.parentNode.insertBefore(slot,el.nextSibling); }
      else if(slot.nextSibling!==el) el.parentNode.insertBefore(slot,el);
    }
    function endDrag(commit){
      killGhosts();
      var was=src, sl=slot; src=null; slot=null;
      if(was) was.classList.remove("jgl-hold","jgl-src");
      if(sl&&sl.parentNode){
        if(was) sl.parentNode.replaceChild(was,sl); // src встаёт на место слота
        else sl.parentNode.removeChild(sl);
      }
      /* контейнер мог перерисоваться посреди жеста (innerHTML) — слот/src выброшены вместе
         со старым DOM, коммитить нечего */
      if(commit&&was&&container.contains(was)&&opts.onCommit)
        opts.onCommit(items().map(function(el){ return el.getAttribute(idAttr); }));
    }
    container.addEventListener("pointerdown",function(e){
      if(e.button) return; // только основная кнопка/палец
      /* skip-элементы (бейдж глаза): не драг, не вход в режим — обычный клик пройдёт сам */
      if(skipSel && e.target.closest(skipSel)) return;
      suppress=false;      // новый жест — прошлое подавление клика не «залипает»
      var el=e.target.closest(itemSel); if(!el||!container.contains(el)) return;
      if(gcleanup) gcleanup(); // листенеры умершего жеста не копим
      var pid=e.pointerId, x0=e.clientX, y0=e.clientY; lx=x0; ly=y0;
      function mv(e2){
        if(e2.pointerId!==pid) return; lx=e2.clientX; ly=e2.clientY;
        if(src) return; // DOM-работа в rAF-цикле; событие только пишет координаты
        if(Math.abs(lx-x0)>12||Math.abs(ly-y0)>12){ clearTimeout(pressT); pressT=null; if(!mode) cleanup(); }
      }
      function up(e2){
        if(e2.pointerId!==pid) return;
        clearTimeout(pressT); pressT=null;
        if(src){ suppress=true; endDrag(e2.type==="pointerup"); } // cancel = откат без сохранения
        cleanup();
      }
      function cleanup(){ window.removeEventListener("pointermove",mv); window.removeEventListener("pointerup",up); window.removeEventListener("pointercancel",up); gcleanup=null; }
      gcleanup=cleanup;
      window.addEventListener("pointermove",mv); window.addEventListener("pointerup",up); window.addEventListener("pointercancel",up);
      if(mode){ suppress=true; startDrag(el,x0,y0); }
      else pressT=setTimeout(function(){ pressT=null; suppress=true; enter(); startDrag(el,lx,ly); },550);
    });
    /* блокировка нативного скролла, когда уже тащим (режим мог включиться посреди жеста) */
    container.addEventListener("touchmove",function(e){ if(src) e.preventDefault(); },{passive:false});
    container.addEventListener("contextmenu",function(e){ if(mode||pressT) e.preventDefault(); });
    /* capture: в режиме клики по элементам не «открывают» их; первый клик после жеста гасим;
       skip-элементы (глаз скрытия) пропускаются к своим обработчикам */
    container.addEventListener("click",function(e){
      if(skipSel && e.target.closest(skipSel)) return;
      if(suppress){ suppress=false; e.stopPropagation(); e.preventDefault(); return; }
      if(mode&&e.target.closest(itemSel)){ e.stopPropagation(); e.preventDefault(); }
    },true);
    /* refresh(): после перерисовки innerHTML внутри активного режима заново навесить
       классы на свежие узлы (скрытие/показ плитки перерисовывает контейнер, режим живёт) */
    function refresh(){ if(!mode) return; items().forEach(function(el){ el.classList.add("jgl-on"); }); }
    return { exit:exit, active:function(){ return mode; }, refresh:refresh };
  }
  function fab(label,onClick){
    fabEl.innerHTML='<span class="plus">+</span> '+esc(label||"");
    fabEl.setAttribute("aria-label", label||"");
    fabEl.classList.add("show"); fabEl.onclick=function(){ try{ if(onClick) onClick(); }catch(e){} };
    return { show:function(){ fabEl.classList.add("show"); }, hide:function(){ fabEl.classList.remove("show"); }, destroy:fabDestroy };
  }
  function fabDestroy(){ fabEl.classList.remove("show"); fabEl.onclick=null; fabEl.innerHTML=""; }

  /* ===== HDR_ICONS — общий реестр иконок ШАПКИ модулей (раньше дублировались в КАЖДОМ модуле).
     ВАЖНО: имя НЕ ICONS — выше уже есть var ICONS (иконки ПЛИТОК); коллизия имён её затирала. ===== */
  var HDR_ICONS={
    back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    stats:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 20v-6M12 20V8M19 20V4"/></svg>',
    statsBars:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 20V10M12 20V4M19 20v-7"/></svg>',
    parent:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>',
    plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>'
  };
  /* ===== frame(opts) — ЕДИНАЯ рамка экрана модуля (guardrails; канон ГАЙД-UI-guardrails.md).
     Строит .rt-hdr (‹ назад · заголовок · действия) в #module-view и возвращает .rt-body,
     КУДА модуль кладёт контент. Модуль больше НЕ рисует свою шапку. opts:
       title     — простой текстовый заголовок, ЛИБО
       titleHtml — готовая разметка заголовка (модуль сохраняет своё оформление: иконка/подзаголовок);
       back      — true(деф)|false|function (своя обработка; деф = RT.close);
       backLabel — aria кнопки назад (деф common.back);
       actions   — [{icon:'stats'|'statsBars'|'parent'|'plus'|<svg-строка>, label, onClick, id, className}],
                   falsy-элементы пропускаются. Возврат: { body, header, actions(el) }. */
  function frame(opts){
    opts=opts||{};
    var view=moduleView; view.innerHTML="";
    var hdr=document.createElement("header"); hdr.className="rt-hdr";
    if(opts.back!==false){
      var bk=document.createElement("button"); bk.type="button"; bk.className="back rt-back";
      bk.setAttribute("aria-label", opts.backLabel || t("common.back")); bk.innerHTML=HDR_ICONS.back;
      bk.addEventListener("click", typeof opts.back==="function" ? opts.back : function(){ RT.close(); });
      hdr.appendChild(bk);
    }
    var main=document.createElement("div"); main.className="rt-head-main";
    if(opts.titleHtml!=null) main.innerHTML=opts.titleHtml;
    else { var h=document.createElement("div"); h.className="rt-title"; h.textContent=opts.title||""; main.appendChild(h); }
    hdr.appendChild(main);
    var acts=document.createElement("div"); acts.className="rt-actions";
    (opts.actions||[]).forEach(function(a){
      if(!a) return;
      var btn=document.createElement("button"); btn.type="button"; btn.className="hbtn"+(a.className?(" "+a.className):"");
      btn.innerHTML=HDR_ICONS[a.icon]||a.icon||"";
      if(a.label) btn.setAttribute("aria-label", a.label);
      if(a.id) btn.id=a.id;
      if(a.onClick) btn.addEventListener("click", a.onClick);
      acts.appendChild(btn);
    });
    /* rightHtml — произвольная разметка справа в шапке (не иконка-кнопка): напр. баланс в Магазине */
    if(opts.rightHtml) acts.insertAdjacentHTML("beforeend", opts.rightHtml);
    hdr.appendChild(acts);
    var body=document.createElement("div"); body.className="rt-body";
    view.appendChild(hdr); view.appendChild(body);
    return { body:body, header:hdr, actions:acts };
  }

  function confirm(opts){
    opts=opts||{};
    return new Promise(function(resolve){
      var ov=document.createElement("div"); ov.className="overlay show";
      ov.innerHTML='<div class="sheet" role="dialog"><div class="grip"></div><h2>'+esc(opts.title||t("common.confirmTitle"))+'</h2>'+(opts.text?'<p style="text-align:center;color:#cfe0ff;font-weight:600;margin:0 0 6px">'+esc(opts.text)+'</p>':'')+'<div class="sheet-actions"><button class="btn btn-cancel" data-no>'+esc(opts.cancel||t("common.cancel"))+'</button><button class="btn btn-primary" data-yes>'+esc(opts.ok||t("common.yes"))+'</button></div></div>';
      document.body.appendChild(ov);
      function done(v){ ov.classList.remove("show"); setTimeout(function(){ if(ov.parentNode) ov.parentNode.removeChild(ov); },200); resolve(v); }
      ov.querySelector("[data-yes]").onclick=function(){ done(true); };
      ov.querySelector("[data-no]").onclick=function(){ done(false); };
      ov.addEventListener("click",function(e){ if(e.target===ov) done(false); });
    });
  }
  function sheet(node){
    var ov=document.createElement("div"); ov.className="overlay show";
    var sh=document.createElement("div"); sh.className="sheet"; sh.setAttribute("role","dialog");
    var grip=document.createElement("div"); grip.className="grip"; sh.appendChild(grip);
    sh.appendChild(node); ov.appendChild(sh); document.body.appendChild(ov);
    function close(){
      ov.classList.remove("show");
      setTimeout(function(){
        if(ov.parentNode) ov.parentNode.removeChild(ov);
        if(document.documentElement.classList.contains("kb-open")) return;
        rtForceFullViewport();
      },220);
    }
    grip.addEventListener("click",close); enableDrag(sh,close);
    ov.addEventListener("click",function(e){ if(e.target===ov) close(); });
    return { close:close, overlay:ov, sheet:sh };
  }
  function restoreViewportAfterModule(){
    try{
      var ae=document.activeElement;
      if(ae && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(ae.tagName)) ae.blur();
    }catch(e){}
    try{
      document.documentElement.style.setProperty("--kb","0px");
      document.documentElement.classList.remove("kb-open");
      var r=document.getElementById("root"); if(r) r.style.minHeight="";
    }catch(e){}
    requestAnimationFrame(function(){
      rtForceFullViewport();
      setTimeout(rtForceFullViewport,260);
    });
  }

  function setDemo(b){ demo=b; RT._shell.demo=b; body.classList.toggle("demo",b); }

  /* ================= ВИДЫ ================= */
  function moduleViewEl(){ return moduleView; }
  function hideParent(){ if(parentView) parentView.classList.remove("active"); }
  function hideSettings(){ if(settingsView) settingsView.classList.remove("active"); }
  function hideNotif(){ if(notifView) notifView.classList.remove("active"); }
  /* экран оповещений (вкладка NOTIFICATIONS единого меню, Ф2): контент рисует core/notify.js */
  function showNotifications(){
    if(RT.Notify && RT.Notify.renderInto && notifView) RT.Notify.renderInto(notifView);
    body.setAttribute("data-view","notifications");
    if(lockView) lockView.classList.remove("active"); hideParent(); hideSettings();
    homeView.classList.remove("active"); moduleView.classList.remove("active");
    if(notifView) notifView.classList.add("active");
    window.scrollTo(0,0); fabDestroy(); setNavActive();
  }
  /* ---- память экрана: обновление страницы возвращает туда же (rt_screen) ----
     Пишем при каждом переходе; на буте читаем ДО первого showHome (иначе затрётся). */
  function screenSave(st){ try{ lsSet("rt_screen",st); }catch(e){} }

  /* «домой» для РОДИТЕЛЯ = дашборд (а не детские плитки): один шов, через который
     возвращаются и RT.close() из модуля, и boot(). Детский путь не меняется. */
  function showHome(){
    screenSave({v:"home"});
    if(!demo && isParent() && RT.Parent){ showParent(); return; }
    body.setAttribute("data-view","home"); if(lockView) lockView.classList.remove("active"); hideParent(); hideSettings(); hideNotif(); moduleView.classList.remove("active"); homeView.classList.add("active"); window.scrollTo(0,0); fabDestroy(); homeHud(); setNavActive();
  }
  function showModule(){ screenSave({v:"module",id:RT._current||null}); body.setAttribute("data-view","module"); if(lockView) lockView.classList.remove("active"); hideParent(); hideSettings(); hideNotif(); homeView.classList.remove("active"); moduleView.classList.add("active"); if(kidBarEl) kidBarEl.classList.remove("rt-bar-hide"); window.scrollTo(0,0); setNavActive(); }
  /* родительский дашборд (core/parent.js); read-only поверхность вместо детского дома */
  function showParent(){
    body.setAttribute("data-view","parent");
    if(lockView) lockView.classList.remove("active");
    homeView.classList.remove("active"); moduleView.classList.remove("active"); hideSettings(); hideNotif();
    if(parentView) parentView.classList.add("active");
    window.scrollTo(0,0); if(parentView) parentView.scrollTop=0; fabDestroy();
    if(RT.Parent) RT.Parent.show();
    if(parentView) parentView.scrollTop=0;
    setNavActive(); /* подсветить активную вкладку (apps/bank/chat) единого меню */
  }

  /* ---- экран входа (lock): на сервере без сессии приложение закрыто ---- */
  function showLock(loading){
    body.setAttribute("data-view","lock");
    homeView.classList.remove("active"); moduleView.classList.remove("active"); hideParent(); hideSettings(); hideNotif();
    lockView.classList.add("active");
    renderLock(loading);
    window.scrollTo(0,0);
  }
  /* SEC 2026-06-09: сессия истекла на защищённом эндпоинте (401) → вернуть на экран входа,
     а не молча падать или показывать кэш/DEFAULTS. Зовётся из RT.API (sdk.js) и syncTick. */
  RT._on401=function(){
    if(demo) return;
    if(body && body.getAttribute("data-view")==="lock") return; // уже на входе — без зацикливания
    acct={authenticated:false};
    syncStop();
    showLock(false);
  };
  /* ---- мульти-аккаунты устройства: localStorage rt_accounts = [{id,nick,kind,tok}] ----
     Токен переключения выдаёт сервер при входе (op login/register_parent → switchToken),
     обменивается на свежую сессию op switch. «Выйти» аккаунт с устройства НЕ убирает —
     убирает ✕ в настройках (op switch_revoke). Блокировка на сервере закрывает switch. */
  function devAccounts(){ return lsGet("rt_accounts",[]); }
  function devUpsert(u,tok){
    if(!u||!tok) return;
    var l=devAccounts().filter(function(a){ return a.id!==u.id; });
    l.push({id:u.id,nick:u.nickname,kind:u.kind,tok:tok});
    lsSet("rt_accounts",l);
  }
  function devRemove(id){ lsSet("rt_accounts",devAccounts().filter(function(a){ return a.id!==id; })); }
  /* Самолечение списка устройства: если ТЕКУЩЕЙ сессии нет в rt_accounts (вход был до фичи,
     или сессия с посадочной приглашения) — выписываем ей токен через op switch_token, иначе
     после переключения на другой аккаунт вернуться к этому будет не к чему (баг заказчика).
     Заодно освежаем ник/роль, если их сменили. Повторных запросов нет: токен выписывается
     только когда записи нет. */
  var ensureBusy=false;
  function ensureDeviceToken(u){
    try{
      var l=devAccounts(), hit=null;
      l.forEach(function(a){ if(a.id===u.id) hit=a; });
      if(hit){
        if(hit.nick!==u.nickname || hit.kind!==u.kind){ hit.nick=u.nickname; hit.kind=u.kind; lsSet("rt_accounts",l); }
        return;
      }
      if(ensureBusy) return;
      ensureBusy=true;
      RT.API.post("accounts.php",{op:"switch_token"}).then(function(r){
        ensureBusy=false;
        if(r&&r.ok&&r.switchToken) devUpsert(u,r.switchToken);
      }).catch(function(){ ensureBusy=false; });
    }catch(e){}
  }
  function devSwitch(a,onFail){
    RT.API.post("accounts.php",{op:"switch",token:a.tok}).then(function(r){
      if(!(r&&r.ok&&r.user)){ throw new Error("bad"); }
      toast(t("account.welcome",{name:r.user.nickname}));
      setTimeout(function(){ location.reload(); },300);
    }).catch(function(){
      devRemove(a.id); toast(t("account.switchGone")); if(onFail) onFail();
    });
  }
  function devRowsHtml(excludeId){
    var saved=devAccounts().filter(function(a){ return a.id!==excludeId; });
    if(!saved.length) return '';
    return saved.map(function(a){
      var role=(a.kind==="parent")?t("account.roleParent"):t("account.roleChild");
      return '<div class="acct-row acct-dev" data-devrow="'+a.id+'">'
        +'<button class="acct-go" data-sw="'+a.id+'"><span class="nm">'+esc(a.nick)+'</span><span class="rl">'+esc(role)+'</span></button>'
        +'<button class="acct-x" data-rm="'+a.id+'" aria-label="✕" title="'+esc(t("account.removeDev"))+'">✕</button>'
        +'</div>';
    }).join("");
  }
  function wireDevRows(root,onFail,withRemove){
    Array.prototype.forEach.call(root.querySelectorAll("[data-sw]"),function(btn){
      btn.onclick=function(){
        var id=parseInt(btn.getAttribute("data-sw"),10);
        var a=devAccounts().filter(function(x){ return x.id===id; })[0];
        if(a) devSwitch(a,onFail);
      };
    });
    Array.prototype.forEach.call(root.querySelectorAll("[data-rm]"),function(btn){
      if(!withRemove){ btn.style.display="none"; return; }
      btn.onclick=function(){
        var id=parseInt(btn.getAttribute("data-rm"),10);
        var a=devAccounts().filter(function(x){ return x.id===id; })[0];
        if(!a) return;
        confirm({title:t("account.removeDev"), text:t("account.removeConfirm",{name:a.nick}), ok:t("common.yes"), cancel:t("common.cancel")}).then(function(ok){
          if(!ok) return;
          RT.API.post("accounts.php",{op:"switch_revoke",token:a.tok}).catch(function(){});
          devRemove(id); toast(t("account.removedDev",{name:a.nick})); if(onFail) onFail();
        });
      };
    });
  }

  function renderLock(loading){
    var head='<div class="hometop"><h1 class="brand">Rob<b>Top</b></h1>'
      +'<div class="tagline">'+esc(t("lock.hint"))+'</div></div>';
    if(loading){ lockView.innerHTML=head+'<p class="set-note" style="text-align:center">'+esc(t("account.loading"))+'</p>'; return; }
    var saved=devRowsHtml(0);
    lockView.innerHTML=head
      +'<div class="lockform">'
      +(saved?'<p class="set-note" style="text-align:center;font-weight:800">'+esc(t("lock.title"))+'</p>'+saved
        +'<p class="set-note" style="margin-top:10px">'+esc(t("account.orPassword"))+'</p>':'')
      +(!saved?'<p class="set-note">'+esc(t("account.loginHint"))+'</p>':'')
      +'<input class="set-in" id="lockLogin" type="text" placeholder="'+esc(t("account.loginPh"))+'" autocomplete="username">'
      +'<input class="set-in" id="lockPass" type="password" placeholder="'+esc(t("account.passPh"))+'" autocomplete="current-password">'
      +'<button class="btn btn-primary" id="lockIn">'+esc(t("account.signIn"))+'</button>'
      +'<button class="btn btn-cancel" id="lockReg" style="flex:none">'+esc(t("reg.link"))+'</button>'
      +'<button class="lock-link" id="lockForgot">'+esc(t("account.forgot"))+'</button>'
      +'</div>';
    var lg=lockView.querySelector("#lockLogin"), ps=lockView.querySelector("#lockPass");
    var go=function(){ loginFlow((lg.value||"").trim(), ps.value||"", lockView.querySelector(".lockform")); };
    lockView.querySelector("#lockIn").onclick=go;
    lockView.querySelector("#lockReg").onclick=renderLockRegister;
    lockView.querySelector("#lockForgot").onclick=renderLockForgot;
    ps.addEventListener("keydown",function(e){ if(e.key==="Enter") go(); });
    wireDevRows(lockView,function(){ renderLock(false); },false); // на локе без ✕ — убирают в настройках
    if(RT.Notify) RT.Notify.decorateAccounts(lockView); // бейджи непрочитанного у аккаунтов (op peek)
    if(!saved) setTimeout(function(){ lg.focus(); },150);
  }
  /* «Забыли пароль?» прямо на lock-экране (раньше только в family.html).
     Только для родителя: детям пароль сбрасывает родитель. Op forgot всегда отвечает ok. */
  function renderLockForgot(){
    lockView.innerHTML='<div class="hometop"><h1 class="brand">Rob<b>Top</b></h1>'
      +'<div class="tagline">'+esc(t("account.forgot"))+'</div></div>'
      +'<div class="lockform">'
      +'<p class="set-note">'+esc(t("account.forgotHint"))+'</p>'
      +'<input class="set-in" id="fpEmail" type="email" placeholder="Email" autocomplete="email">'
      +'<button class="btn btn-primary" id="fpGo">'+esc(t("account.forgotSend"))+'</button>'
      +'<button class="btn btn-cancel" id="fpBack" style="flex:none">'+esc(t("common.back"))+'</button>'
      +'</div>';
    lockView.querySelector("#fpBack").onclick=function(){ renderLock(false); };
    lockView.querySelector("#fpGo").onclick=function(){
      var em=(lockView.querySelector("#fpEmail").value||"").trim(); if(!em) return;
      RT.API.post("accounts.php",{op:"forgot",email:em,lang:I.get()}).catch(function(){}).then(function(){
        toast(t("account.forgotSent")); renderLock(false);
      });
    };
    setTimeout(function(){ lockView.querySelector("#fpEmail").focus(); },150);
  }
  /* регистрация нового родителя прямо с lock-экрана (создаёт НОВУЮ семью) */
  function renderLockRegister(){
    lockView.innerHTML='<div class="hometop"><h1 class="brand">Rob<b>Top</b></h1>'
      +'<div class="tagline">'+esc(t("reg.title"))+'</div></div>'
      +'<div class="lockform">'
      +'<p class="set-note">'+esc(t("reg.hint"))+'</p>'
      +'<input class="set-in" id="regNick" type="text" placeholder="'+esc(t("reg.nickPh"))+'" autocomplete="username">'
      +'<input class="set-in" id="regEmail" type="email" placeholder="Email" autocomplete="email">'
      +'<input class="set-in" id="regPass" type="password" placeholder="'+esc(t("account.passPh"))+'" autocomplete="new-password">'
      +'<button class="btn btn-primary" id="regGo">'+esc(t("reg.btn"))+'</button>'
      +'<button class="btn btn-cancel" id="regBack" style="flex:none">'+esc(t("common.back"))+'</button>'
      +'</div>';
    lockView.querySelector("#regBack").onclick=function(){ renderLock(false); };
    lockView.querySelector("#regGo").onclick=function(){
      var nick=(lockView.querySelector("#regNick").value||"").trim();
      var em=(lockView.querySelector("#regEmail").value||"").trim();
      var pw=lockView.querySelector("#regPass").value||"";
      if(!nick||!em||!pw||pw.length<4){ toast(t("reg.fail")); return; }
      RT.API.post("accounts.php",{op:"register_parent",nickname:nick,email:em,password:pw}).then(function(r){
        if(!(r&&r.ok)){ toast(t("reg.fail")); return; }
        if(r.user&&r.switchToken) devUpsert(r.user,r.switchToken); // запомнить на устройстве
        toast(t("account.welcome",{name:nick}));
        setTimeout(function(){ location.reload(); },500);
      }).catch(function(){ toast(t("reg.fail")); });
    };
    setTimeout(function(){ lockView.querySelector("#regNick").focus(); },150);
  }
  /* общий поток входа: успех → reload (меняется rt_user_id); временный пароль → обязательная смена в target */
  function loginFlow(loginV, passV, forceTarget){
    if(!loginV||!passV){ toast(t("account.badLogin")); return; }
    RT.API.post("accounts.php",{op:"login",login:loginV,password:passV}).then(function(r){
      if(!(r&&r.ok&&r.user)){ toast(t("account.badLogin")); return; }
      if(r.switchToken) devUpsert(r.user,r.switchToken); // запомнить аккаунт на устройстве (мульти-вход)
      if(r.user.mustChangePassword){ renderForcePass(forceTarget); return; }
      toast(t("account.welcome",{name:r.user.nickname}));
      setTimeout(function(){ location.reload(); },500);
    }).catch(function(){ toast(t("account.badLogin")); });
  }

  function iconHtml(m){
    if(m.source==="installed" && m.icon && /\.(svg|png|jpe?g|webp|gif)$/i.test(m.icon)) return '<img src="apps/'+esc(m.id)+'/'+esc(m.icon)+'" alt="">';
    var key=TILE_ICON[m.id]; return ICONS[key]||ICONS.cube;
  }
  function homeHud(){
    var total=RT._registry.length, active=0;
    RT._registry.forEach(function(m){ if(m.status==="active") active++; });
    hud({ left:'RobTop · <b>beta</b>', cNum:total, cLbl:t("hud.apps"), rNum:active, rLbl:t("hud.available") });
  }
  /* бейдж-глаз скрытия/показа: рисуется на каждой активной плитке/карточке, но CSS
     показывает его ТОЛЬКО в режиме перестановки (.jgl .jgl-eye). span, не button —
     плитка сама <button>, вложенные кнопки невалидны. makeJiggle пропускает клики
     по нему (opts.skip), обработчик — у владельца контейнера (делегирование). */
  var EYE_ON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 12C4.2 7.9 7.8 5.2 12 5.2s7.8 2.7 9.5 6.8c-1.7 4.1-5.3 6.8-9.5 6.8S4.2 16.1 2.5 12z"/><circle cx="12" cy="12" r="3.1"/></svg>',
      EYE_OFF='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 12C4.2 7.9 7.8 5.2 12 5.2s7.8 2.7 9.5 6.8c-1.7 4.1-5.3 6.8-9.5 6.8S4.2 16.1 2.5 12z"/><circle cx="12" cy="12" r="3.1"/><path d="M4 4l16 16"/></svg>';
  function jglEye(hidden){
    return '<span class="jgl-eye" role="button" aria-label="'+esc(t(hidden?"reorder.show":"reorder.hide"))+'">'
      +(hidden?EYE_ON:EYE_OFF)+'</span>';
  }
  function tileHtml(m,i){
    var soon=m.status!=="active";
    /* --ti — индекс для каскадного входа (.apps.intro .tile, ui.css); map() передаёт его сам */
    return '<button class="tile'+(soon?' soon':' active')+(m.wide?' wide':'')+(!soon&&m.hidden?' hid':'')+'" style="--c:'+esc(m.color||"#19e3ff")+';--ti:'+(i>0?i:0)+'" data-mod="'+esc(m.id)+'">'
      +(soon?'<span class="lock">'+ICONS.lock+'</span>':'<span class="ring"></span>')
      +'<span class="ic">'+iconHtml(m)+'</span>'
      +'<span class="txt"><span class="nm">'+esc(modName(m))+'</span><span class="st">'+(soon?esc(t("tile.status.soon")):esc(t("tile.status.open")))+'</span></span>'
      +(soon?'':jglEye(!!m.hidden))
      +'</button>';
  }
  /* активные плитки всегда сверху; скрытые — за разделителем «Скрытые» (виден только в
     режиме перестановки); группа «скоро» — ниже, за своим разделителем.
     keepJgl=true (скрытие/показ плитки): режим перестановки НЕ сбрасывается —
     после innerHTML заново навешиваем классы (homeJgl.refresh). */
  var homeIntroDone=false, homeIntroT=null; // каскадный вход плиток — один раз за загрузку приложения
  function renderHome(keepJgl){
    /* перерисовка внутри окна каскада (sync/язык) не должна переигрывать вход:
       снимаем .intro ДО замены innerHTML (ревью 2026-06-10) */
    if(homeIntroDone && appsEl.classList.contains("intro")){
      clearTimeout(homeIntroT); appsEl.classList.remove("intro");
    }
    var keep=keepJgl && homeJgl && homeJgl.active();
    if(homeJgl && !keep) homeJgl.exit(); // обычная перерисовка сбрасывает режим перестановки
    var act=[], soon=[], hid=[];
    RT._registry.forEach(function(m){
      if(m.id==="bank"||m.id==="chat") return; /* BANK/CHAT — вкладки нижнего меню, НЕ плитки (Ф4) */
      if(m.status!=="active"){ soon.push(m); return; }
      (m.hidden?hid:act).push(m);
    });
    /* индекс каскада сквозной через группы: «скоро»-плитки продолжают волну, а не стартуют с нуля */
    appsEl.innerHTML=act.map(tileHtml).join("")
      +(hid.length?'<div class="apps-sep hidsep">'+esc(t("reorder.hidden"))+'</div>'+hid.map(function(m,i){ return tileHtml(m,act.length+i); }).join(""):"")
      +(soon.length?'<div class="apps-sep">'+esc(t("home.soonSep"))+'</div>'+soon.map(function(m,i){ return tileHtml(m,act.length+hid.length+i); }).join(""):"");
    homeHud();
    if(keep) homeJgl.refresh();
    /* .intro живёт только на первом рендере: перерисовки (sync/язык/реордер) сетку не переигрывают */
    if(!homeIntroDone && !keep){
      homeIntroDone=true; appsEl.classList.add("intro");
      homeIntroT=setTimeout(function(){ appsEl.classList.remove("intro"); },1200);
    }
  }

  /* ================= РЕЕСТР ================= */
  /* Личный порядок плиток (скрытый реордер): пересортировать RT._registry по ids
     (неизвестные — после, в прежнем порядке) и сохранить: демо → localStorage-overrides,
     сервер → accounts.php op tile_order (на аккаунт; registry.php применит при загрузке). */
  function applyTileOrder(ids){
    var idx={}; ids.forEach(function(id,i){ idx[id]=i; });
    var list=RT._registry.slice(), n=ids.length;
    list.forEach(function(m,i){ m._k=(idx[m.id]!=null)?idx[m.id]:n+i; });
    list.sort(function(a,b){ return a._k-b._k; });
    list.forEach(function(m){ delete m._k; });
    RT.setRegistry(list);
    if(demo){
      var ov=getOverrides();
      list.forEach(function(m,i){ ov[m.id]=Object.assign({},ov[m.id],{sort:(i+1)*10}); });
      setOverrides(ov);
      return Promise.resolve({ok:true});
    }
    return RT.API.post("accounts.php",{op:"tile_order",order:ids})
      .catch(function(){ toast(t("common.failed")); });
  }
  /* Личные скрытые плитки (глаз в режиме перестановки, миграция 022): ids — ПОЛНЫЙ список
     скрытых. Обновить флаги в реестре, перерисовать главный с СОХРАНЕНИЕМ режима и
     сохранить: демо → localStorage-overrides, сервер → accounts.php op tile_hidden
     (на аккаунт; registry.php вернёт флаг hidden при загрузке). Дашборд родителя
     перерисовывает сам вызывающий (core/parent.js) — тоже с сохранением режима. */
  function applyTileHidden(ids){
    var idx={}; (ids||[]).forEach(function(id){ idx[id]=1; });
    RT._registry.forEach(function(m){ m.hidden=idx[m.id]?1:0; });
    RT.setRegistry(RT._registry);
    renderHome(true);
    if(demo){
      var ov=getOverrides();
      RT._registry.forEach(function(m){ ov[m.id]=Object.assign({},ov[m.id],{hidden:idx[m.id]?1:0}); });
      setOverrides(ov);
      return Promise.resolve({ok:true});
    }
    return RT.API.post("accounts.php",{op:"tile_hidden",hidden:ids})
      .catch(function(){ toast(t("common.failed")); });
  }
  /* тап по глазу на главном экране: последнюю видимую активную плитку скрыть нельзя —
     иначе не на чем сделать long-press, чтобы вернуть скрытое */
  function toggleTileHidden(id){
    var m=null, vis=0;
    RT._registry.forEach(function(x){ if(x.id===id) m=x; if(x.status==="active"&&!x.hidden) vis++; });
    if(!m) return;
    if(!m.hidden && vis<=1){ toast(t("reorder.lastNo")); return; }
    m.hidden=m.hidden?0:1;
    var ids=[]; RT._registry.forEach(function(x){ if(x.hidden) ids.push(x.id); });
    applyTileHidden(ids);
  }
  function mergeOverrides(list){
    var ov=getOverrides();
    list.forEach(function(m){ var o=ov[m.id]; if(o){ if(o.enabled!=null) m.enabled=o.enabled; if(o.sort!=null) m.sort=o.sort; if(o.hidden!=null) m.hidden=o.hidden; } });
    return list;
  }
  function allModulesDemo(){
    var list=DEFAULTS.map(function(m){ return Object.assign({enabled:1},m); });
    var inst=getInstalled();
    Object.keys(inst).forEach(function(id){
      var man=inst[id].manifest||{};
      list.push({id:id,name:man.name||id,color:man.color||"#19e3ff",status:man.status||"active",source:"installed",server:false,icon:man.icon||null,enabled:1,sort:man.sort||500});
    });
    mergeOverrides(list);
    list.sort(function(a,b){ return (a.sort||0)-(b.sort||0); });
    return list;
  }
  function visible(list){ return list.filter(function(m){ return m.enabled!==0; }); }

  /* после обновления реестра перерисовать и родительский дашборд (если открыт):
     закрывает гонку «parent.php ответил раньше registry.php» и обновляет дашборд
     после вкл/выкл модулей в магазине */
  function refreshParentIfActive(){ if(RT.Parent && body.getAttribute("data-view")==="parent") RT.Parent.render(); }
  function loadRegistry(){
    if(demo){ RT.setRegistry(visible(allModulesDemo())); renderHome(); return Promise.resolve(); }
    return RT.API.get("registry.php").then(function(res){
      var list=(res&&res.modules)||[]; if(!list.length) list=visible(DEFAULTS.map(function(m){return Object.assign({},m);}));
      RT.setRegistry(list); renderHome(); refreshParentIfActive();
    }).catch(function(){ RT.setRegistry(visible(DEFAULTS.map(function(m){return Object.assign({},m);}))); renderHome(); refreshParentIfActive(); });
  }

  /* ================= НАСТРОЙКИ (отдельный экран; «приложения» — только родителю) ================= */
  function authKey(){ return demo?"demo":(acct===null?"loading":(acct.authenticated?("in:"+(acct.user&&acct.user.id)):"out")); }
  function isSettingsOpen(){ return body.getAttribute("data-view")==="settings"; }
  function openSettings(){
    if(isSettingsOpen()) return;
    if(homeJgl) homeJgl.exit(); // уходим с главного — режим перестановки закрыт
    /* НЕ сохраняем экран настроек в rt_screen: настройки — служебный экран, перезапуск/возврат
       должен открывать дом/дашборд (или восстановленный модуль), а не настройки (фидбек Джеффа). */
    renderSettings();
    body.setAttribute("data-view","settings");
    homeView.classList.remove("active"); moduleView.classList.remove("active"); hideParent(); hideNotif();
    if(lockView) lockView.classList.remove("active");
    settingsView.classList.add("active");
    window.scrollTo(0,0); fabDestroy(); setNavActive();
    if(!demo){ var k=authKey(); loadAccount().then(function(){
      if(isSettingsOpen() && authKey()!==k) renderSettings();
    }); }
  }
  /* назад из настроек: showHome сам уводит родителя на дашборд */
  function closeSettings(){ if(!isSettingsOpen()) return; showHome(); }

  /* ---- ЕДИНОЕ НИЖНЕЕ МЕНЮ (#kidBar.rt-nav): маршрутизация 5 вкладок (ПЛАН-нижнее-меню.md).
     BANK/CHAT — у ОБЕИХ ролей открывают САМ модуль (RT.open), без гейтов (Ф4). APPS — сетка
     (ребёнок showHome / родитель дашборд RT.Parent.setTab("apps")). NOTIFICATIONS — экран (Ф2),
     SETTINGS — настройки. Видно на всех экранах. ---- */
  function parentMode(){ return !demo && isParent() && !!RT.Parent; }
  function closeModuleIfAny(){ if(RT.current()){ if(RT.closeCurrent) RT.closeCurrent(); else RT.close(); } }
  function navTo(tab){
    /* ВАЖНО: уходя с открытого модуля на оповещения/настройки, его НАДО размонтировать
       (RT.closeCurrent), иначе слой Чата #chApp/оверлеи залипают поверх (фидбек Джеффа). */
    if(tab==="notifications"){ closeModuleIfAny(); showNotifications(); return; }
    if(tab==="settings"){ closeModuleIfAny(); openSettings(); return; }
    if(tab==="bank"){ if(RT.current()!=="bank") RT.open("bank"); else setNavActive(); return; }
    if(tab==="chat"){ if(RT.current()!=="chat") RT.open("chat"); else setNavActive(); return; }
    /* apps */
    if(parentMode()){
      if(RT.current()) RT.close();                                    /* закрыть открытый модуль → showParent */
      else if(body.getAttribute("data-view")!=="parent") showParent();
      if(RT.Parent.setTab) RT.Parent.setTab("apps");
    } else {
      if(RT.current()) RT.close(); else showHome();
    }
    setNavActive();
  }
  function setNavActive(){
    if(!kidBarEl) return;
    var v=body.getAttribute("data-view"), cur=RT.current(), act;
    if(v==="notifications") act="notifications";
    else if(v==="settings") act="settings";
    else if(cur==="bank") act="bank";
    else if(cur==="chat") act="chat";
    else if(parentMode() && v==="parent") act=(RT.Parent.tab && RT.Parent.tab()) || "apps";
    else act="apps"; /* дом и любой другой открытый модуль → APPS */
    Array.prototype.forEach.call(kidBarEl.querySelectorAll(".rt-nav-b"),function(b){
      b.classList.toggle("on", b.getAttribute("data-nav")===act);
    });
  }
  /* бейдж непрочитанного на вкладку NOTIFICATIONS (зовёт core/notify.js при изменении счётчика) */
  function navBadge(n){
    var el=document.getElementById("rtNavBadge"); if(!el) return;
    n=parseInt(n,10)||0;
    if(n>0){ el.textContent=n>9?"9+":String(n); el.hidden=false; } else { el.hidden=true; }
  }

  /* блок «Аккаунт» в настройках: статус + вход/выход (вход меняет rt_user_id на сервере, поэтому после
     успеха перезагружаем страницу — чистое состояние реестра и данных, без частичных перерисовок) */
  function accountSectionHtml(){
    var out='<div class="store-section">'+esc(t("account.title"))+'</div>';
    if(demo) return out+'<p class="set-note">'+esc(t("account.demoNote"))+'</p>';
    if(acct===null) return out+'<p class="set-note">'+esc(t("account.loading"))+'</p>';
    if(acct.authenticated && acct.user){
      var u=acct.user, role=(u.kind==="parent")?t("account.roleParent"):t("account.roleChild");
      var others=devRowsHtml(u.id);
      return out
        +'<div class="acct-row"><span class="nm">'+esc(u.nickname)+'</span><span class="rl">'+esc(role)+'</span></div>'
        +(others?'<div class="store-section">'+esc(t("account.deviceList"))+'</div>'+others:'')
        +'<div class="store-install" id="acctAdd">＋ '+esc(t("account.addAccount"))+'</div>'
        +'<div id="acctAddBox" style="display:none">'
        +'<p class="set-note">'+esc(t("account.addHint"))+'</p>'
        +'<input class="set-in" id="acctLogin" type="text" placeholder="'+esc(t("account.loginPh"))+'" autocomplete="username">'
        +'<input class="set-in" id="acctPass" type="password" placeholder="'+esc(t("account.passPh"))+'" autocomplete="current-password">'
        +'<div class="sheet-actions"><button class="btn btn-primary" id="acctIn" style="flex:1">'+esc(t("account.signIn"))+'</button></div>'
        +'</div>';
    }
    return out
      +'<p class="set-note">'+esc(t("account.loginHint"))+' '+esc(t("account.guestNote"))+'</p>'
      +'<input class="set-in" id="acctLogin" type="text" placeholder="'+esc(t("account.loginPh"))+'" autocomplete="username">'
      +'<input class="set-in" id="acctPass" type="password" placeholder="'+esc(t("account.passPh"))+'" autocomplete="current-password">'
      +'<div class="sheet-actions"><button class="btn btn-primary" id="acctIn" style="flex:1">'+esc(t("account.signIn"))+'</button></div>';
  }
  function wireAccountSection(){
    var outBtn=settingsBody.querySelector("#acctOut");
    if(outBtn) outBtn.onclick=function(){
      RT.API.post("accounts.php",{op:"logout"}).catch(function(){}).then(function(){
        toast(t("account.signedOut")); setTimeout(function(){ location.reload(); },400);
      });
    };
    var inBtn=settingsBody.querySelector("#acctIn");
    if(inBtn){
      var lg=settingsBody.querySelector("#acctLogin"), ps=settingsBody.querySelector("#acctPass");
      var doLogin=function(){ loginFlow((lg.value||"").trim(), ps.value||"", settingsBody); };
      inBtn.onclick=doLogin;
      ps.addEventListener("keydown",function(e){ if(e.key==="Enter") doLogin(); });
    }
    // мульти-аккаунты: переключение, ✕ с устройства, тумблер формы «добавить»
    wireDevRows(settingsBody,function(){ renderSettings(); },true);
    if(RT.Notify) RT.Notify.decorateAccounts(settingsBody); // бейджи непрочитанного (op peek)
    var addBtn=settingsBody.querySelector("#acctAdd");
    if(addBtn) addBtn.onclick=function(){
      var box=settingsBody.querySelector("#acctAddBox");
      var open=box.style.display!=="none";
      box.style.display=open?"none":"";
      if(!open) setTimeout(function(){ var f=box.querySelector("#acctLogin"); if(f) f.focus(); },100);
    };
  }
  /* обязательная смена одноразового пароля (target: settingsBody или форма на lock-экране) */
  function renderForcePass(target){
    target=target||settingsBody;
    target.innerHTML='<h2>'+esc(t("account.changeTitle"))+'</h2>'
      +'<p class="set-note">'+esc(t("account.changeHint"))+'</p>'
      +'<input class="set-in" id="npIn" type="password" placeholder="'+esc(t("account.newPassPh"))+'" autocomplete="new-password">'
      +'<div class="sheet-actions"><button class="btn btn-primary" id="npSave" style="flex:1">'+esc(t("account.saveCont"))+'</button></div>';
    var inp=target.querySelector("#npIn");
    target.querySelector("#npSave").onclick=function(){
      var v=inp.value||"";
      if(v.length<4){ toast(t("account.weakPass")); return; }
      RT.API.post("accounts.php",{op:"set_password",new_password:v}).then(function(){
        location.reload();
      }).catch(function(){ toast(t("common.failed")); });
    };
    setTimeout(function(){ inp.focus(); },150);
  }

  /* ===== СЕМЬЯ в настройках (только родитель): дети, сброс, блокировка, добавить, пригласить ===== */
  function famApi(bodyObj){ return RT.API.post("accounts.php", bodyObj); }
  function famSectionHtml(){
    if(demo || !isParent()) return '';
    return '<div class="store-section">'+esc(t("family.title"))+'</div>'
      +'<div id="famBox"><p class="set-note">'+esc(t("account.loading"))+'</p></div>';
  }
  /* Полный центр семьи (2026-06-07, слияние с консолью family.html):
     родители семьи, дети (гость-пилюля у provisional), добавить/пригласить,
     отправленные приглашения с отзывом и новой ссылкой. */
  function loadFamily(){
    var box=settingsBody.querySelector("#famBox"); if(!box) return;
    famApi({op:"members"}).then(function(r){
      var meId=(acct&&acct.user)?acct.user.id:0;
      var parents=((r&&r.members)||[]).filter(function(m){ return m.kind==="parent"; });
      var kids=(r&&r.children)||[];
      var html="";
      if(parents.length){
        html+='<div class="fam-sub">'+esc(t("family.parents"))+'</div>'
          +parents.map(function(p){
            var role=(p.role==="owner")?t("family.roleOwner"):t("account.roleParent");
            return '<div class="acct-row"><span class="nm">'+esc(p.nickname)+(p.id===meId?' · '+esc(t("family.you")):'')+'</span>'
              +'<span class="rl">'+esc(role)+'</span></div>';
          }).join("");
      }
      html+='<div class="fam-sub">'+esc(t("family.kids"))+'</div>';
      html+=kids.length?kids.map(function(k){
        var blocked=(k.status==="disabled"), guest=(k.type==="provisional");
        return '<button class="acct-row" data-kid="'+k.id+'" data-nick="'+esc(k.nickname)+'" data-blocked="'+(blocked?1:0)+'">'
          +'<span class="nm">'+esc(k.nickname)+'</span>'
          +(guest?'<span class="rl warn">'+esc(t("family.guest"))+'</span>':'')
          +'<span class="rl'+(blocked?' off':'')+'">'+esc(blocked?t("family.blocked"):t("account.roleChild"))+'</span></button>';
      }).join(""):'<p class="set-note">'+esc(t("family.empty"))+'</p>';
      html+='<div class="store-install" id="famAdd">＋ '+esc(t("family.addChild"))+'</div>'
        +'<div class="store-install" id="famInvite">✉ '+esc(t("family.invite"))+'</div>'
        +'<div class="fam-sub">'+esc(t("family.invites"))+'</div>'
        +'<div id="famInv"><p class="set-note">'+esc(t("account.loading"))+'</p></div>';
      box.innerHTML=html;
      Array.prototype.forEach.call(box.querySelectorAll("[data-kid]"),function(b){
        b.onclick=function(){ openChildSheet(parseInt(b.getAttribute("data-kid"),10), b.getAttribute("data-nick"), b.getAttribute("data-blocked")==="1"); };
      });
      box.querySelector("#famAdd").onclick=openAddChild;
      box.querySelector("#famInvite").onclick=openInviteParent;
      loadInvites();
    }).catch(function(){ box.innerHTML='<p class="set-note">'+esc(t("common.failed"))+'</p>'; });
  }
  /* отправленные приглашения: статус, отозвать, новая ссылка (resend) */
  function invStatusPill(st){
    var cls=(st==="pending")?" warn":(st==="accepted"?"":" off");
    return '<span class="rl'+cls+'">'+esc(t("family.st."+st,{fallback:st}))+'</span>';
  }
  function loadInvites(){
    var box=settingsBody?settingsBody.querySelector("#famInv"):null; if(!box) return;
    famApi({op:"invites"}).then(function(r){
      var list=(r&&r.invites)||[];
      if(!list.length){ box.innerHTML='<p class="set-note">'+esc(t("family.invitesEmpty"))+'</p>'; return; }
      box.innerHTML=list.map(function(i){
        var tp=t("family.invType."+i.type,{fallback:i.type});
        return '<div class="acct-row"><span class="nm">'+esc(tp)
          +(i.email?'<span class="fam-em">'+esc(i.email)+'</span>':'')+'</span>'
          +invStatusPill(i.status)
          +(i.status==="pending"
            ? '<button class="hbtn" data-resend="'+i.id+'" aria-label="'+esc(t("family.resend"))+'" style="width:34px;height:34px">↻</button>'
              +'<button class="hbtn" data-revoke="'+i.id+'" aria-label="'+esc(t("family.revoke"))+'" style="width:34px;height:34px;color:#ffb3c0">✕</button>'
            : '')
          +'</div>';
      }).join("");
      Array.prototype.forEach.call(box.querySelectorAll("[data-revoke]"),function(b){
        b.onclick=function(){
          confirm({title:t("family.revoke"),ok:t("common.yes"),cancel:t("common.cancel")}).then(function(ok){
            if(!ok) return;
            famApi({op:"invite_action",id:parseInt(b.getAttribute("data-revoke"),10),action:"revoke"})
              .then(function(){ toast(t("family.revoked")); loadInvites(); })
              .catch(function(){ toast(t("common.failed")); });
          });
        };
      });
      Array.prototype.forEach.call(box.querySelectorAll("[data-resend]"),function(b){
        b.onclick=function(){
          famApi({op:"invite_action",id:parseInt(b.getAttribute("data-resend"),10),action:"resend",lang:I.get()})
            .then(function(r2){ showLinkSheet(t("family.resendDone"), r2&&r2.link); loadInvites(); })
            .catch(function(){ toast(t("common.failed")); });
        };
      });
    }).catch(function(){ box.innerHTML='<p class="set-note">'+esc(t("common.failed"))+'</p>'; });
  }
  /* общая шторка «вот ссылка» (resend и т.п.) */
  function showLinkSheet(title, link){
    var node=document.createElement("div");
    node.innerHTML='<h2>'+esc(title)+'</h2>'
      +'<p class="set-note">'+esc(t("family.linkHint"))+'</p>'
      +'<div class="invlink">'+esc(link||"")+'</div>'
      +'<button class="btn btn-primary" id="lkCopy" style="width:100%;margin-top:10px">'+esc(t("family.copy"))+'</button>'
      +'<div class="sheet-actions"><button class="btn btn-cancel" id="lkClose" style="flex:1">'+esc(t("common.close"))+'</button></div>';
    var ctl=sheet(node);
    node.querySelector("#lkClose").onclick=ctl.close;
    node.querySelector("#lkCopy").onclick=function(){
      try{ if(navigator.clipboard) navigator.clipboard.writeText(link||""); }catch(e){}
      toast(t("family.copied"));
    };
  }
  function openChildSheet(id,nick,blocked){
    var node=document.createElement("div");
    node.innerHTML='<h2>'+esc(nick)+'</h2>'
      +'<div class="store-install" id="kidReset">🔑 '+esc(t("family.resetPass"))+'</div>'
      +'<div class="store-install" id="kidTransfer">👪 '+esc(t("family.transfer"))+'</div>'
      +'<div class="store-install" id="kidShare" style="display:none"></div>'
      +'<div class="invlink" id="kidShareUrl" style="display:none"></div>'
      +'<div class="store-install" id="kidBlock">'+(blocked?'✅ '+esc(t("family.unblock")):'⛔ '+esc(t("family.block")))+'</div>'
      +'<div class="sheet-actions"><button class="btn btn-cancel" id="kidClose" style="flex:1">'+esc(t("common.close"))+'</button></div>';
    var ctl=sheet(node);
    node.querySelector("#kidClose").onclick=ctl.close;
    node.querySelector("#kidTransfer").onclick=function(){ ctl.close(); openTransferChild(id,nick); };
    /* Публичный виш-лист (2026-06-07): включает ТОЛЬКО primary-родитель или родитель семьи
       (сервер share.php op=set; provisional кнопку не видит — canToggle=false). */
    (function(){
      var row=node.querySelector("#kidShare"), urlEl=node.querySelector("#kidShareUrl");
      RT.API.post("share.php",{op:"get",child_id:id}).then(function(r){
        if(!(r&&r.ok&&r.canToggle)) return;
        var on=!!r.enabled;
        function paint(){
          row.innerHTML=(on?'🌐 ':'🔒 ')+esc(t("family.share"))+': <b style="color:'+(on?'#3df0c0':'#ffb3c0')+'">'+esc(on?t("family.shareOn"):t("family.shareOff"))+'</b>';
          if(on && r.url){ urlEl.textContent=r.url; urlEl.style.display=""; } else { urlEl.style.display="none"; }
        }
        paint(); row.style.display="";
        row.onclick=function(){
          var to=!on;
          confirm({title:t("family.share"),
                   text:to?t("family.shareConfirmOn",{name:nick}):t("family.shareConfirmOff",{name:nick}),
                   ok:t("common.yes"), cancel:t("common.cancel")}).then(function(okc){
            if(!okc) return;
            RT.API.post("share.php",{op:"set",child_id:id,enabled:to?1:0}).then(function(){
              on=to; paint(); toast(to?t("family.shareOnDone"):t("family.shareOffDone"));
            }).catch(function(){ toast(t("common.failed")); });
          });
        };
      }).catch(function(){});
    })();
    node.querySelector("#kidReset").onclick=function(){
      confirm({title:t("family.resetPass"), text:t("family.resetConfirm",{name:nick}), ok:t("common.yes"), cancel:t("common.cancel")}).then(function(ok){
        if(!ok) return;
        famApi({op:"reset_child",child_id:id}).then(function(r){ ctl.close(); toast(t("family.resetDone",{name:nick, pass:(r&&r.temp_password)||""})); })
          .catch(function(){ toast(t("common.failed")); });
      });
    };
    node.querySelector("#kidBlock").onclick=function(){
      var toBlocked=!blocked;
      confirm({title:toBlocked?t("family.block"):t("family.unblock"),
               text:toBlocked?t("family.blockConfirm",{name:nick}):t("family.unblockConfirm",{name:nick}),
               ok:t("common.yes"), cancel:t("common.cancel")}).then(function(ok){
        if(!ok) return;
        famApi({op:"set_child_status",child_id:id,status:toBlocked?"disabled":"active"}).then(function(){
          ctl.close(); toast(toBlocked?t("family.blockDone",{name:nick}):t("family.unblockDone",{name:nick})); loadFamily();
        }).catch(function(){ toast(t("common.failed")); });
      });
    };
  }
  function openAddChild(){
    var node=document.createElement("div");
    node.innerHTML='<h2>'+esc(t("family.addChild"))+'</h2>'
      +'<p class="set-note">'+esc(t("family.addHint"))+'</p>'
      +'<input class="set-in" id="kidNick" type="text" placeholder="'+esc(t("family.nickPh"))+'" autocomplete="off" data-1p-ignore data-lpignore="true" data-bwignore>'
      +'<div class="sheet-actions"><button class="btn btn-cancel" id="kidCancel" style="flex:0 0 38%">'+esc(t("common.cancel"))+'</button>'
      +'<button class="btn btn-primary" id="kidGo" style="flex:1">'+esc(t("family.addBtn"))+'</button></div>'
      +'<div id="kidOut"></div>';
    var ctl=sheet(node);
    node.querySelector("#kidCancel").onclick=ctl.close;
    node.querySelector("#kidGo").onclick=function(){
      var nick=(node.querySelector("#kidNick").value||"").trim(); if(!nick) return;
      famApi({op:"add_child",nickname:nick}).then(function(r){
        node.querySelector("#kidOut").innerHTML='<p class="set-note" style="color:#ffe08a">'+esc(t("family.created",{name:nick, pass:(r&&r.temp_password)||""}))+'</p>';
        loadFamily();
      }).catch(function(){ toast(t("family.nickTaken")); });
    };
    setTimeout(function(){ node.querySelector("#kidNick").focus(); },150);
  }
  function openInviteParent(){
    var node=document.createElement("div");
    node.innerHTML='<h2>'+esc(t("family.invite"))+'</h2>'
      +'<p class="set-note">'+esc(t("family.inviteHint"))+'</p>'
      +'<input class="set-in" id="invEmail" type="email" placeholder="Email" autocomplete="off" data-1p-ignore data-lpignore="true" data-bwignore>'
      +'<div class="sheet-actions"><button class="btn btn-cancel" id="invCancel" style="flex:0 0 38%">'+esc(t("common.cancel"))+'</button>'
      +'<button class="btn btn-primary" id="invGo" style="flex:1">'+esc(t("family.inviteBtn"))+'</button></div>'
      +'<div id="invOut"></div>';
    var ctl=sheet(node);
    node.querySelector("#invCancel").onclick=ctl.close;
    node.querySelector("#invGo").onclick=function(){
      var em=(node.querySelector("#invEmail").value||"").trim(); if(!em) return;
      famApi({op:"invite",type:"co_parent",email:em,lang:I.get()}).then(function(r){
        node.querySelector("#invOut").innerHTML='<p class="set-note">'+esc(t("family.linkHint"))+'</p>'
          +'<div class="invlink">'+esc(r.link||"")+'</div>'
          +'<button class="btn btn-primary" id="invCopy" style="width:100%;margin-top:10px">'+esc(t("family.copy"))+'</button>';
        node.querySelector("#invCopy").onclick=function(){
          try{ if(navigator.clipboard) navigator.clipboard.writeText(r.link||""); }catch(e){}
          toast(t("family.copied"));
        };
        loadInvites();
      }).catch(function(){ toast(t("common.failed")); });
    };
    setTimeout(function(){ node.querySelector("#invEmail").focus(); },150);
  }

  /* передать ребёнка настоящему родителю (transfer_child): email → ссылка-приглашение;
     после принятия у ребёнка появляется своя семья, провизорная опека рвётся (сервер) */
  function openTransferChild(id,nick){
    var node=document.createElement("div");
    node.innerHTML='<h2>'+esc(t("family.transfer"))+' · '+esc(nick)+'</h2>'
      +'<p class="set-note">'+esc(t("family.transferHint"))+'</p>'
      +'<input class="set-in" id="trEmail" type="email" placeholder="Email">'
      +'<div class="sheet-actions"><button class="btn btn-cancel" id="trCancel" style="flex:0 0 38%">'+esc(t("common.cancel"))+'</button>'
      +'<button class="btn btn-primary" id="trGo" style="flex:1">'+esc(t("friend.makeLink"))+'</button></div>'
      +'<div id="trOut"></div>';
    var ctl=sheet(node);
    node.querySelector("#trCancel").onclick=ctl.close;
    node.querySelector("#trGo").onclick=function(){
      var em=(node.querySelector("#trEmail").value||"").trim(); if(!em) return;
      famApi({op:"invite",type:"transfer_child",email:em,target_child_id:id,lang:I.get()}).then(function(r){
        node.querySelector("#trOut").innerHTML='<p class="set-note">'+esc(t("family.linkHint"))+'</p>'
          +'<div class="invlink">'+esc(r.link||"")+'</div>'
          +'<button class="btn btn-primary" id="trCopy" style="width:100%;margin-top:10px">'+esc(t("family.copy"))+'</button>';
        node.querySelector("#trCopy").onclick=function(){
          try{ if(navigator.clipboard) navigator.clipboard.writeText(r.link||""); }catch(e){}
          toast(t("family.copied"));
        };
        loadInvites();
      }).catch(function(){ toast(t("common.failed")); });
    };
    setTimeout(function(){ node.querySelector("#trEmail").focus(); },150);
  }

  /* ===== МОЙ РОДИТЕЛЬ в настройках (только ребёнок, 2026-06-07) =====
     Есть primary-родитель → показываем его, управление у него. Нет — ребёнок зовёт СВОЕГО
     родителя по email (invite type=child_invite_parent); живое приглашение можно отозвать
     и позвать заново. После принятия у ребёнка своя семья, провизорная опека рвётся (сервер). */
  function myParentSectionHtml(){
    if(demo || !acct || !acct.authenticated || !acct.user || acct.user.kind!=="child") return '';
    return '<div class="store-section">'+esc(t("myparent.title"))+'</div>'
      +'<div id="mpBox"><p class="set-note">'+esc(t("account.loading"))+'</p></div>';
  }
  function loadMyParent(){
    var box=settingsBody?settingsBody.querySelector("#mpBox"):null; if(!box) return;
    RT.API.post("accounts.php",{op:"parent_status"}).then(function(r){
      if(!(r&&r.ok)){ box.innerHTML='<p class="set-note">'+esc(t("common.failed"))+'</p>'; return; }
      if(r.hasParent){
        box.innerHTML='<div class="acct-row"><span class="nm">'+esc(r.parentNick||"")+'</span><span class="rl">'+esc(t("account.roleParent"))+'</span></div>'
          +'<p class="set-note">'+esc(t("myparent.managed"))+'</p>';
        return;
      }
      if(r.pending){
        box.innerHTML='<p class="set-note">'+esc(t("myparent.pendingHint"))+'</p>'
          +'<div class="acct-row"><span class="nm">'+esc(r.pending.email||"")+'</span>'
          +'<span class="rl warn">'+esc(t("family.st.pending"))+'</span>'
          +'<button class="hbtn" id="mpRevoke" aria-label="'+esc(t("family.revoke"))+'" title="'+esc(t("family.revoke"))+'" style="width:34px;height:34px;color:#ffb3c0">✕</button></div>';
        box.querySelector("#mpRevoke").onclick=function(){
          confirm({title:t("family.revoke"),ok:t("common.yes"),cancel:t("common.cancel")}).then(function(ok){
            if(!ok) return;
            RT.API.post("accounts.php",{op:"invite_action",id:r.pending.id,action:"revoke"})
              .then(function(){ toast(t("myparent.revoked")); loadMyParent(); })
              .catch(function(){ toast(t("common.failed")); });
          });
        };
        return;
      }
      box.innerHTML='<p class="set-note">'+esc(t("myparent.hint"))+'</p>'
        +'<input class="set-in" id="mpEmail" type="email" placeholder="Email" autocomplete="off" data-1p-ignore data-lpignore="true" data-bwignore>'
        +'<div class="sheet-actions"><button class="btn btn-primary" id="mpGo" style="flex:1">'+esc(t("myparent.inviteBtn"))+'</button></div>';
      box.querySelector("#mpGo").onclick=function(){
        var em=(box.querySelector("#mpEmail").value||"").trim(); if(!em) return;
        RT.API.post("accounts.php",{op:"invite",type:"child_invite_parent",email:em,lang:I.get()}).then(function(r2){
          box.innerHTML='<p class="set-note" style="color:#ffe08a">'+esc(t("myparent.sent"))+'</p>'
            +'<p class="set-note">'+esc(t("family.linkHint"))+'</p>'
            +'<div class="invlink">'+esc((r2&&r2.link)||"")+'</div>'
            +'<button class="btn btn-primary" id="mpCopy" style="width:100%;margin-top:10px">'+esc(t("family.copy"))+'</button>';
          box.querySelector("#mpCopy").onclick=function(){
            try{ if(navigator.clipboard) navigator.clipboard.writeText((r2&&r2.link)||""); }catch(e){}
            toast(t("family.copied"));
          };
        }).catch(function(e){
          toast(/http 409/.test((e&&e.message)||"")?t("myparent.conflict"):t("common.failed"));
        });
      };
    }).catch(function(){ box.innerHTML='<p class="set-note">'+esc(t("common.failed"))+'</p>'; });
  }

  /* ===== ПОДЕЛИЛИСЬ СО МНОЙ (только родитель; у ребёнка этот список — в самом Виш-листе 👥) ===== */
  function sharedSectionHtml(){
    if(demo || !isParent()) return '';
    return '<div class="store-section">'+esc(t("shared.title"))+'</div>'
      +'<div id="sharedBox"><p class="set-note">'+esc(t("account.loading"))+'</p></div>';
  }
  function loadShared(){
    var box=settingsBody?settingsBody.querySelector("#sharedBox"):null; if(!box) return;
    RT.API.post("share.php",{op:"shared_with_me"}).then(function(r){
      var list=(r&&r.lists)||[];
      if(!list.length){ box.innerHTML='<p class="set-note">'+esc(t("shared.empty"))+'</p>'; return; }
      box.innerHTML=list.map(function(x){
        return '<a class="acct-row" style="text-decoration:none" href="w.html?u='+encodeURIComponent(x.nickname)+'" target="_blank" rel="noopener">'
          +'<span class="nm">'+esc(x.nickname)+'</span><span class="rl">👁</span></a>';
      }).join("");
    }).catch(function(){ box.innerHTML='<p class="set-note">'+esc(t("common.failed"))+'</p>'; });
  }

  /* ===== ПОМОЩЬ: «Сообщить о проблеме» + мои обращения (тикеты, 2026-06-07) =====
     Видят ВСЕ вошедшие (ребёнок и родитель); сервер — api/tickets.php, ответы админа
     приходят сюда же (флаг unread). В демо секции нет (тикеты только на сервере). */
  function helpSectionHtml(){
    if(demo || !(acct && acct.authenticated)) return '';
    return '<div class="store-section">'+esc(t("helpdesk.title"))+'</div>'
      +'<div class="store-install" id="helpReport">🛟 '+esc(t("helpdesk.report"))+'</div>'
      +'<div id="helpBox"></div>';
  }
  function loadTickets(){
    var box=settingsBody?settingsBody.querySelector("#helpBox"):null; if(!box) return;
    RT.API.post("tickets.php",{op:"list"}).then(function(r){
      var list=(r&&r.tickets)||[];
      if(!list.length){ box.innerHTML=''; return; }
      box.innerHTML='<p class="set-note">'+esc(t("helpdesk.mine"))+'</p>'+list.map(function(x){
        return '<button type="button" class="acct-row tk-row" data-tk="'+x.id+'">'
          +(x.unread?'<span class="tk-dot" aria-label="'+esc(t("helpdesk.newReply"))+'"></span>':'')
          +'<span class="nm">'+esc(x.subject)+'</span>'
          +'<span class="rl'+(x.status==="open"?'':' off')+'">'+esc(x.status==="open"?t("helpdesk.stOpen"):t("helpdesk.stClosed"))+'</span></button>';
      }).join("");
      Array.prototype.forEach.call(box.querySelectorAll("[data-tk]"),function(bn){
        bn.onclick=function(){ openTicketThread(parseInt(bn.getAttribute("data-tk"),10)); };
      });
    }).catch(function(){ box.innerHTML='<p class="set-note">'+esc(t("common.failed"))+'</p>'; });
  }
  /* шторка нового обращения; source: "settings" или "module:<id>" (кнопка под «Добавить фото») */
  function openTicketReport(source){
    var node=document.createElement("div");
    node.innerHTML='<h2>'+esc(t("helpdesk.report"))+'</h2>'
      +'<p class="set-note" style="text-align:center">'+esc(t("helpdesk.hint"))+'</p>'
      +'<textarea class="set-in tk-text" id="tkText" rows="4" maxlength="2000" placeholder="'+esc(t("helpdesk.ph"))+'"></textarea>'
      +'<div class="sheet-actions"><button class="btn btn-cancel" id="tkCancel" style="flex:0 0 38%">'+esc(t("common.cancel"))+'</button>'
      +'<button class="btn btn-primary" id="tkSend" style="flex:1">'+esc(t("helpdesk.send"))+'</button></div>';
    var ctl=sheet(node), ta=node.querySelector("#tkText"), btn=node.querySelector("#tkSend");
    node.querySelector("#tkCancel").onclick=ctl.close;
    btn.onclick=function(){
      var v=(ta.value||"").trim();
      if(v.length<3){ toast(t("helpdesk.tooShort")); return; }
      btn.disabled=true;
      RT.API.post("tickets.php",{op:"create",text:v,source:source||"settings"}).then(function(){
        ctl.close(); buzz(8); toast(t("helpdesk.sent"));
        if(isSettingsOpen()) loadTickets();
      }).catch(function(e){
        btn.disabled=false;
        toast(/http 429/.test((e&&e.message)||"")?t("helpdesk.tooMany"):t("common.failed"));
      });
    };
    setTimeout(function(){ ta.focus(); },150);
  }
  /* переписка по обращению: сообщения (мои справа, поддержка слева) + ответ + «проблема решена» */
  function openTicketThread(id){
    RT.API.post("tickets.php",{op:"view",id:id}).then(function(r){
      if(!(r&&r.ok&&r.ticket)){ toast(t("common.failed")); return; }
      var tk=r.ticket, open=tk.status==="open";
      var msgs=(r.messages||[]).map(function(m){
        return '<div class="tk-msg'+(m.admin?' adm':'')+'">'
          +'<div class="who">'+esc(m.admin?t("helpdesk.support"):t("helpdesk.you"))+'</div>'
          +'<div class="body">'+esc(m.body)+'</div>'
          +'<div class="when">'+esc(String(m.created||"").slice(0,16))+'</div></div>';
      }).join("");
      var node=document.createElement("div");
      node.innerHTML='<h2>'+esc(t("helpdesk.threadTitle"))+'</h2>'
        +'<p class="set-note" style="text-align:center">'+esc(open?t("helpdesk.stOpen"):t("helpdesk.stClosed"))+'</p>'
        +'<div class="tk-thread">'+msgs+'</div>'
        +'<textarea class="set-in tk-text" id="tkReply" rows="3" maxlength="2000" placeholder="'+esc(t("helpdesk.replyPh"))+'"></textarea>'
        +(open?'':'<p class="set-note">'+esc(t("helpdesk.reopenHint"))+'</p>')
        +'<div class="sheet-actions">'
        +(open?'<button class="btn btn-cancel" id="tkSolve" style="flex:0 0 44%">'+esc(t("helpdesk.solve"))+'</button>':'')
        +'<button class="btn btn-primary" id="tkGo" style="flex:1">'+esc(t("helpdesk.reply"))+'</button></div>';
      var ctl=sheet(node);
      var th=node.querySelector(".tk-thread"); th.scrollTop=th.scrollHeight;
      node.querySelector("#tkGo").onclick=function(){
        var v=(node.querySelector("#tkReply").value||"").trim();
        if(v.length<3){ toast(t("helpdesk.tooShort")); return; }
        RT.API.post("tickets.php",{op:"reply",id:id,text:v}).then(function(){
          ctl.close(); toast(t("helpdesk.sent"));
          if(isSettingsOpen()) loadTickets();
        }).catch(function(){ toast(t("common.failed")); });
      };
      var sv=node.querySelector("#tkSolve");
      if(sv) sv.onclick=function(){
        confirm({title:t("helpdesk.solveConfirm"),ok:t("common.yes"),cancel:t("common.cancel")}).then(function(ok){
          if(!ok) return;
          RT.API.post("tickets.php",{op:"close",id:id}).then(function(){
            ctl.close(); toast(t("helpdesk.solved"));
            if(isSettingsOpen()) loadTickets();
          }).catch(function(){ toast(t("common.failed")); });
        });
      };
      if(isSettingsOpen()) loadTickets(); // сервер снял unread — обновить точки в списке
    }).catch(function(){ toast(t("common.failed")); });
  }
  /* кнопка «Сообщить о проблеме» ПОД КАЖДОЙ кнопкой «Добавить фото» (заказ Джеффа):
     shell дорисовывает её после известных фото-кнопок модулей (wishlist/mood/rating/walk) —
     сами модули не трогаем; вставка идемпотентна, повторные рендеры переживает MutationObserver. */
  var TK_PHOTO_SEL="#wlPhotoPick,#mdPhotoPick,#rdPhotoPick,#wkAddPhoto,#shPhotoPick";
  function injectReportBtns(){
    if(demo || !(acct && acct.authenticated)) return;
    var picks=document.querySelectorAll(TK_PHOTO_SEL);
    Array.prototype.forEach.call(picks,function(p){
      var n=p.nextElementSibling;
      if(n && n.classList && n.classList.contains("tk-report")) return;
      var bb=document.createElement("button");
      bb.type="button"; bb.className="tk-report";
      bb.textContent="🛟 "+t("helpdesk.report");
      bb.onclick=function(ev){
        ev.preventDefault(); ev.stopPropagation();
        openTicketReport(RT.current()?("module:"+RT.current()):"settings");
      };
      p.parentNode.insertBefore(bb,p.nextSibling);
    });
  }

  /* ===== ДРУЗЬЯ в настройках (только ребёнок): пригласить друга по ссылке (без email) ===== */
  function friendSectionHtml(){
    if(demo || !acct || !acct.authenticated || !acct.user || acct.user.kind!=="child") return '';
    return '<div class="store-section">'+esc(t("friend.title"))+'</div>'
      +'<p class="set-note">'+esc(t("friend.hint"))+'</p>'
      +'<div class="store-install" id="friendInvite">🎈 '+esc(t("friend.invite"))+'</div>';
  }
  function openInviteFriend(){
    var node=document.createElement("div");
    node.innerHTML='<h2>'+esc(t("friend.invite"))+'</h2>'
      +'<p class="set-note">'+esc(t("friend.sheetHint"))+'</p>'
      +'<div class="sheet-actions"><button class="btn btn-cancel" id="frCancel" style="flex:0 0 38%">'+esc(t("common.cancel"))+'</button>'
      +'<button class="btn btn-primary" id="frGo" style="flex:1">'+esc(t("friend.makeLink"))+'</button></div>'
      +'<div id="frOut"></div>';
    var ctl=sheet(node);
    node.querySelector("#frCancel").onclick=ctl.close;
    node.querySelector("#frGo").onclick=function(){
      famApi({op:"invite",type:"child_to_child",lang:I.get()}).then(function(r){
        node.querySelector("#frOut").innerHTML='<p class="set-note">'+esc(t("friend.sendHint"))+'</p>'
          +'<div class="invlink">'+esc(r.link||"")+'</div>'
          +'<button class="btn btn-primary" id="frCopy" style="width:100%;margin-top:10px">'+esc(t("family.copy"))+'</button>';
        node.querySelector("#frCopy").onclick=function(){
          try{ if(navigator.clipboard) navigator.clipboard.writeText(r.link||""); }catch(e){}
          toast(t("family.copied"));
        };
      }).catch(function(){ toast(t("common.failed")); });
    };
  }

  /* ===== ТЕМА ОФОРМЛЕНИЯ (2026-06-07): выбирает себе КАЖДЫЙ аккаунт (ребёнок и родитель).
     Реестр и визуальное применение — core/bg.js (RTTheme: body[data-theme] + канвас + кэш
     rt_theme); хранение на аккаунте — accounts.php op set_theme (users.theme, миграция 016).
     В демо (file://) тема живёт только в кэше устройства. ===== */
  function themeSectionHtml(){
    if(!window.RTTheme) return '';
    var cur=RTTheme.get();
    var cards=RTTheme.list().map(function(th){
      var p=th.preview||{};
      var dots=(p.dots||[]).map(function(c,i){
        return '<i style="color:'+c+';background:'+c+';left:'+(11+i*19)+'px;top:'+(19+(i%2)*10)+'px"></i>';
      }).join("");
      return '<button class="theme-card'+(th.id===cur?' on':'')+'" data-theme-pick="'+th.id+'">'
        +'<span class="mark">✓</span>'
        +'<span class="prev" style="background:'+(p.bg||"#111")+'">'+dots+'</span>'
        +'<span class="nm">'+esc(t("theme."+th.id))+'</span>'
        +'</button>';
    }).join("");
    return '<div class="store-section">'+esc(t("settings.theme"))+'</div>'
      +'<div class="theme-grid">'+cards+'</div>';
  }
  function wireThemeSection(){
    var grid=settingsBody?settingsBody.querySelector(".theme-grid"):null; if(!grid) return;
    grid.addEventListener("click",function(e){
      var b=e.target.closest("[data-theme-pick]"); if(!b || !window.RTTheme) return;
      var id=b.getAttribute("data-theme-pick");
      if(id===RTTheme.get()) return;
      RTTheme.set(id); buzz(6);
      Array.prototype.forEach.call(grid.querySelectorAll(".theme-card"),function(c){
        c.classList.toggle("on", c.getAttribute("data-theme-pick")===id);
      });
      if(!demo && acct && acct.authenticated){
        if(acct.user) acct.user.theme=id;
        RT.API.post("accounts.php",{op:"set_theme",theme:id})
          .catch(function(){ toast(t("common.failed")); });
      }
    });
  }

  /* «Выйти» — один раз, внизу экрана, отдельно от данных аккаунта */
  function signOutHtml(){
    if(demo || !(acct && acct.authenticated)) return '';
    return '<button class="btn btn-danger set-out" id="acctOut">'+esc(t("account.signOut"))+'</button>';
  }
  function renderSettings(){
    var cur=I.get();
    var langBtns=I.supported.map(function(code){
      return '<button'+(code===cur?' class="on"':'')+' data-lang="'+code+'">'+esc(I.native(code))+'</button>';
    }).join("");
    var showManage = demo || isParent(); // ребёнок управление приложениями НЕ видит
    settingsView.innerHTML='<div class="set-top">'
      +'<button class="back" id="settingsBack" aria-label="'+esc(t("common.back"))+'">'+BACK_SVG+'</button>'
      +'<h1>'+esc(t("settings.title"))+'</h1></div>'
      +'<div id="settingsBody">'
      +accountSectionHtml()
      +famSectionHtml()
      +sharedSectionHtml()
      +myParentSectionHtml()
      +friendSectionHtml()
      +helpSectionHtml()
      +(showManage
        ? '<div class="store-section">'+esc(t("store.title"))+'</div>'
          +'<div class="store-install" id="settingsManage">⚙ '+esc(t("settings.manageApps"))+'</div>'
        : '')
      +'<div class="store-section">'+esc(t("settings.language"))+'</div>'
      +'<div class="lang-seg">'+langBtns+'</div>'
      +themeSectionHtml()
      +signOutHtml()
      +'<div class="set-ver">RobTop '+esc(window.RT_VER?("v"+window.RT_VER):"")+'</div>'
      +'</div>';
    settingsBody=settingsView.querySelector("#settingsBody");
    settingsView.querySelector("#settingsBack").onclick=closeSettings;
    wireAccountSection();
    if(settingsBody.querySelector("#famBox")) loadFamily();
    if(settingsBody.querySelector("#mpBox")) loadMyParent();
    if(settingsBody.querySelector("#sharedBox")) loadShared();
    var fr=settingsBody.querySelector("#friendInvite");
    if(fr) fr.onclick=openInviteFriend;
    var hr=settingsBody.querySelector("#helpReport");
    if(hr) hr.onclick=function(){ openTicketReport("settings"); };
    if(settingsBody.querySelector("#helpBox")) loadTickets();
    settingsBody.querySelector(".lang-seg").addEventListener("click",function(e){
      var b=e.target.closest("[data-lang]"); if(!b) return;
      I.set(b.getAttribute("data-lang")); buzz(6);
    });
    wireThemeSection();
    var mng=settingsBody.querySelector("#settingsManage");
    if(mng) mng.onclick=openStore; // магазин — шторкой поверх настроек, «назад» остаётся логичным
  }

  /* ================= МАГАЗИН / АДМИН ================= */
  function allModules(){
    if(demo) return Promise.resolve(allModulesDemo());
    return RT.API.get("modules.php?all=1").then(function(r){ return (r&&r.modules)||[]; }).catch(function(){ return allModulesDemo(); });
  }
  /* PIN-система упразднена (2026-06-07): право управлять приложениями даёт ТОЛЬКО
     родительская сессия (бэкенд rt_admin_gate); демо открыто как песочница. */
  function adminCall(path, bodyObj){
    if(demo) return Promise.resolve({ok:true,demo:true});
    return RT.API.post(path, bodyObj||{});
  }
  function openStore(){ renderStore(); storeOverlay.classList.add("show"); }
  function closeStore(){ storeOverlay.classList.remove("show"); }

  function renderStore(){
    if(!demo && !isParent()){ // защитная ветка: ребёнок сюда не попадает из UI
      storeBody.innerHTML='<h2>'+esc(t("store.title"))+'</h2>'
        +'<p style="text-align:center;color:#cfe0ff;font-weight:600;margin:0 0 4px">'+esc(t("store.adminNote"))+'</p>'
        +'<div class="sheet-actions"><button class="btn btn-cancel" id="storeCloseBtn2" style="flex:1">'+esc(t("common.close"))+'</button></div>';
      document.getElementById("storeCloseBtn2").onclick=closeStore;
      return;
    }
    allModules().then(function(list){
      list.sort(function(a,b){ return (a.sort||0)-(b.sort||0); });
      var rows=list.map(function(m,i){
        var ic=iconHtml(m);
        var sub=(m.source==="installed"?t("store.srcInstalled"):t("store.srcBuiltin"))+(m.status==="soon"?t("store.soonSuffix"):"")+(m.version?" · v"+esc(m.version):"");
        return '<div class="store-row" style="--c:'+esc(m.color||"#19e3ff")+'" data-id="'+esc(m.id)+'">'
          +'<span class="si">'+ic+'</span>'
          +'<span class="smeta"><div class="snm">'+esc(modName(m))+'</div><div class="ssub">'+sub+'</div></span>'
          +'<button class="hbtn" data-act="up" aria-label="'+esc(t("store.up"))+'" style="width:36px;height:36px">▲</button>'
          +'<button class="hbtn" data-act="down" aria-label="'+esc(t("store.down"))+'" style="width:36px;height:36px">▼</button>'
          +(m.source==="installed"?'<button class="hbtn" data-act="uninstall" aria-label="'+esc(t("store.remove"))+'" style="width:36px;height:36px;color:#ffb3c0">✕</button>':'')
          +'<button class="toggle'+(m.enabled!==0?" on":"")+'" data-act="toggle" aria-label="'+esc(t("store.toggle"))+'"></button>'
          +'</div>';
      }).join("");
      storeBody.innerHTML='<h2>'+esc(t("store.title"))+'</h2>'
        +'<div class="store-section">'+esc(t("store.installed"))+'</div>'
        +'<div class="store-list" id="storeList">'+rows+'</div>'
        +'<div class="store-section">'+esc(t("store.installApp"))+'</div>'
        +'<div class="store-install" id="storeInstall">'+esc(t("store.pickBundle"))+'</div>'
        +'<input type="file" id="bundleInput" accept=".json,application/json" hidden>'
        +'<div class="sheet-actions"><button class="btn btn-cancel" id="storeCloseBtn" style="flex:1">'+esc(t("common.close"))+'</button></div>';
      document.getElementById("storeCloseBtn").onclick=closeStore;
      var listEl=document.getElementById("storeList");
      listEl.addEventListener("click",function(e){
        var btn=e.target.closest("[data-act]"); if(!btn) return;
        var row=e.target.closest(".store-row"); var id=row.getAttribute("data-id"); var act=btn.getAttribute("data-act");
        if(act==="toggle") storeToggle(id, !row.querySelector(".toggle").classList.contains("on"));
        else if(act==="up") storeReorder(id,-1);
        else if(act==="down") storeReorder(id,1);
        else if(act==="uninstall") storeUninstall(id);
      });
      var inst=document.getElementById("storeInstall"), bi=document.getElementById("bundleInput");
      inst.onclick=function(){ bi.click(); };
      bi.onchange=function(){ var f=bi.files[0]; bi.value=""; if(f) readBundle(f); };
    });
  }
  function refreshAfterAdmin(){ renderStore(); loadRegistry(); }

  function storeToggle(id, on){
    if(demo){ var ov=getOverrides(); ov[id]=Object.assign({},ov[id],{enabled:on?1:0}); setOverrides(ov); refreshAfterAdmin(); return; }
    adminCall("store/enable.php",{id:id,enabled:on?1:0}).then(function(r){ if(r&&r.ok) refreshAfterAdmin(); else toast(errMsg(r,"common.failed")); });
  }
  function storeReorder(id, dir){
    if(demo){
      var list=allModulesDemo(); var i=list.findIndex(function(m){return m.id===id;}); var j=i+dir; if(i<0||j<0||j>=list.length) return;
      var a=list[i],b=list[j]; var ov=getOverrides();
      var sa=a.sort||0, sb=b.sort||0; ov[a.id]=Object.assign({},ov[a.id],{sort:sb}); ov[b.id]=Object.assign({},ov[b.id],{sort:sa}); setOverrides(ov); refreshAfterAdmin(); return;
    }
    adminCall("store/reorder.php",{id:id,dir:dir}).then(function(r){ if(r&&r.ok) refreshAfterAdmin(); });
  }
  function storeUninstall(id){
    confirm({title:t("store.uninstallTitle"),text:t("store.uninstallText"),ok:t("common.delete"),cancel:t("common.cancel")}).then(function(ok){
      if(!ok) return;
      if(demo){ var inst=getInstalled(); delete inst[id]; setInstalled(inst); var ov=getOverrides(); delete ov[id]; setOverrides(ov); refreshAfterAdmin(); toast(t("common.removed")); return; }
      adminCall("store/uninstall.php",{id:id}).then(function(r){ if(r&&r.ok){ refreshAfterAdmin(); toast(t("common.removed")); } else toast(errMsg(r,"common.failed")); });
    });
  }
  function readBundle(file){
    var fr=new FileReader();
    fr.onload=function(){
      var bundle; try{ bundle=JSON.parse(fr.result); }catch(e){ toast(t("err.bundle_not_json")); return; }
      if(!bundle.manifest||!bundle.manifest.id||!bundle.files){ toast(t("err.bundle_no_manifest")); return; }
      if(!/^[a-z0-9_-]{2,40}$/.test(bundle.manifest.id)){ toast(t("err.bad_id")); return; }
      var bad=Object.keys(bundle.files).some(function(n){ return /\.(php|phtml|phar|cgi|pl|py|sh)$/i.test(n); });
      if(bad){ toast(t("err.server_code_denied")); return; }
      if(demo){
        var inst=getInstalled(); inst[bundle.manifest.id]={manifest:bundle.manifest, files:bundle.files}; setInstalled(inst);
        refreshAfterAdmin(); toast(t("store.installedToast",{name:(bundle.manifest.name||bundle.manifest.id)})); return;
      }
      adminCall("store/install.php",{manifest:bundle.manifest, files:bundle.files}).then(function(r){ if(r&&r.ok){ refreshAfterAdmin(); toast(t("store.installedToast",{name:(bundle.manifest.name||bundle.manifest.id)})); } else toast(errMsg(r,"err.install_failed")); }).catch(function(){ toast(t("err.install_error")); });
    };
    fr.readAsText(file);
  }
  RT._shell_demoBundle=function(id){ var inst=getInstalled(); return inst[id]||null; };

  /* ================= ЖИВОЕ ОБНОВЛЕНИЕ (sync, v2026.06.07.47) =================
     Чужие изменения (задание родителя, прогулка брата, ответ поддержки, вкл/выкл плитки)
     раньше появлялись только после перезагрузки. Теперь оболочка опрашивает api/sync.php
     (лёгкий отпечаток изменений, без данных) каждые SYNC_MS — ТОЛЬКО при видимой вкладке —
     и сразу при возврате в приложение (visibilitychange). WebSocket/SSE на shared-хостинге
     не живут, поэтому поллинг — самое простое надёжное решение.
     Реакции на смену отпечатков:
       reg  → loadRegistry() (плитки главного экрана; дашборд перерисует refreshParentIfActive);
       data → refresh() активного модуля (опциональный хук контракта RobTop.register),
              RT.Parent.refresh() на дашборде, loadTickets() в открытых настройках;
       ver  → тост «Доступно обновление → Обновить» (раз на версию за сессию).
     Защита: при открытой шторке/фокусе в поле ввода НИЧЕГО не трогаем и отпечатки
     НЕ сдвигаем — изменение подхватит следующий тик, когда форма закроется.
     Интервал (v2026.06.07.52): 12с ощущались медленно (фидбек Джеффа) → 4с. Это ~15 крошечных
     запросов в минуту с устройства ТОЛЬКО при видимой вкладке; sync.php — лёгкие индексные
     агрегаты (idx_scope по user_id), для семейного масштаба незаметно. */
  var SYNC_MS=4000, syncTimer=null, syncBusy=false, syncLast=0, syncSeen=null, syncVerShown=null;
  function syncFormOpen(){
    var ae=document.activeElement;
    if(ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) return true;
    /* режим перестановки (✓ на экране): loadRegistry/перерисовка выбила бы из режима —
       в т.ч. от СВОЕГО ЖЕ сохранения порядка/скрытия; отложить до выхода из режима */
    if(document.querySelector(".jgl-done")) return true;
    return !!document.querySelector(".overlay.show");
  }
  /* Применить data-изменение к видимым поверхностям. Возвращает false, если КТО-ТО
     отложил обновление (хук модуля вернул false: busy/шторка/мастер; дашборд уже грузится) —
     тогда отпечаток data НЕ сдвигается и следующий тик повторит. Иначе изменение,
     пришедшее в «занятый» модуль, терялось навсегда — баг подтверждения заданий
     Копилки (v2026.06.07.55). Хук без возврата (undefined) = применено. */
  function syncApply(){
    var ok=true, id=RT.current();
    if(id){
      var m=RT.modules[id];
      if(m && m.def && typeof m.def.refresh==="function"){
        try{ if(m.def.refresh()===false) ok=false; }catch(e){}
      }
    }
    if(RT.Parent && body.getAttribute("data-view")==="parent"){
      if(RT.Parent.refresh()===false) ok=false;
    }
    if(isSettingsOpen()) loadTickets();
    return ok;
  }
  /* перезагрузка со СБРОСОМ кэша входной страницы. iOS standalone-PWA «возрождает» старый снимок
     index.html, и обычный location.reload() может отдать его же из кэша (в браузере no-cache
     перепроверяется и работает, в PWA — нет). Навигация на URL с НОВЫМ ?v=<версия> = другой адрес →
     гарантированно свежий index.html. Query приложение не читает (роутинг дефолтный) — параметр
     безвреден. Фолбэк — обычный reload, если replace недоступен. */
  function reloadFresh(ver){
    try{
      var v=ver||window.RT_VER||(""+Date.now());
      location.replace(location.pathname+"?v="+encodeURIComponent(v));
    }catch(e){ try{ location.reload(); }catch(e2){} }
  }
  function syncTick(){
    if(demo || document.hidden || syncBusy) return;
    syncBusy=true; syncLast=Date.now();
    fetch("api/sync.php",{headers:{"Accept":"application/json"},cache:"no-store"})
      .then(function(r){ if(r.status===401){ if(RT._on401) RT._on401(); throw new Error("401"); } if(!r.ok) throw new Error("http"); return r.json(); })
      .then(function(r){
        syncBusy=false;
        if(!(r && r.ok)) return;
        /* оповещения — ДО гейта формы: баннер/бейдж ничего не трогают под руками пользователя */
        if(r.ntf && RT.Notify) RT.Notify.sync(r.ntf);
        if(r.ver && window.RT_VER && r.ver!==window.RT_VER && syncVerShown!==r.ver){
          syncVerShown=r.ver;
          toast(t("sync.newVer"), t("sync.reload"), function(){ reloadFresh(r.ver); });
        }
        if(!syncSeen){ syncSeen={data:r.data, reg:r.reg}; return; } // первый тик — запомнить базу
        var dataChanged=(r.data!==syncSeen.data), regChanged=(r.reg!==syncSeen.reg);
        if(!dataChanged && !regChanged) return;
        if(syncFormOpen()) return;            // форма открыта — отложить до следующего тика
        if(regChanged){ loadRegistry(); syncSeen.reg=r.reg; }
        /* data-отпечаток сдвигается ТОЛЬКО если все видимые поверхности применили
           обновление; отложенное (модуль занят, дашборд грузится) повторится */
        if(dataChanged && syncApply()!==false) syncSeen.data=r.data;
      })
      .catch(function(){ syncBusy=false; });
  }
  function syncStop(){ if(syncTimer){ clearInterval(syncTimer); syncTimer=null; } }
  function syncStart(){
    if(demo || syncTimer) return;
    syncTimer=setInterval(syncTick, SYNC_MS);
    document.addEventListener("visibilitychange",function(){
      if(!document.hidden && Date.now()-syncLast>1200) syncTick(); // вернулись — проверить сразу
    });
    syncTick();
  }

  /* ================= BOOT ================= */
  function cacheDom(){
    body=document.body;
    appsEl=document.getElementById("apps");
    homeView=document.getElementById("home");
    moduleView=document.getElementById("module-view");
    lockView=document.getElementById("lock");
    parentView=document.getElementById("parent");
    fabEl=document.getElementById("fab");
    toastEl=document.getElementById("toast");
    demoBadge=document.getElementById("demoBadge");
    hudEl=document.getElementById("hud"); hudL=document.getElementById("hudL"); hudCnum=document.getElementById("hudCnum"); hudClbl=document.getElementById("hudClbl"); hudRnum=document.getElementById("hudRnum"); hudRlbl=document.getElementById("hudRlbl");
    settingsView=document.getElementById("settings");
    storeOverlay=document.getElementById("storeOverlay"); storeBody=document.getElementById("storeBody"); gearBtn=document.getElementById("gearBtn");
    kidBarEl=document.getElementById("kidBar");
    notifView=document.getElementById("notifications");
  }
  function wire(){
    appsEl.addEventListener("click",function(e){
      /* глаз скрытия (виден только в режиме перестановки) — раньше открытия плитки */
      var eye=e.target.closest(".jgl-eye");
      if(eye){ var h=eye.closest("[data-mod]"); if(h) toggleTileHidden(h.getAttribute("data-mod")); return; }
      var t=e.target.closest("[data-mod]"); if(t) RT.open(t.getAttribute("data-mod"));
    });
    /* скрытый реордер плиток (только активные; «скоро» и скрытые не двигаются) */
    homeJgl=makeJiggle(appsEl,{ items:".tile:not(.soon):not(.hid)", skip:".jgl-eye", onCommit:applyTileOrder });
    gearBtn.addEventListener("click",openSettings);
    /* детский нижний бар: «Домой» закрывает модуль (как кнопка назад в шапке), ⚙ открывает настройки */
    if(kidBarEl){
      /* единое нижнее меню: делегируем клики по вкладкам (data-nav) в navTo */
      kidBarEl.addEventListener("click",function(e){
        var b=e.target.closest("[data-nav]"); if(b) navTo(b.getAttribute("data-nav"));
      });
    }
    if(RT.Notify) RT.Notify.onBadge=navBadge; /* бейдж непрочитанного на вкладку оповещений */
    storeOverlay.addEventListener("click",function(e){ if(e.target===storeOverlay) closeStore(); });
    var sg=storeOverlay.querySelector(".grip"); if(sg) sg.addEventListener("click",closeStore);
    enableDrag(storeOverlay.querySelector(".sheet"), closeStore);
    /* Escape закрывает слои по одному: магазин → настройки → модуль */
    document.addEventListener("keydown",function(e){
      if(e.key!=="Escape") return;
      if(storeOverlay.classList.contains("show")){ closeStore(); return; }
      if(isSettingsOpen()){ closeSettings(); return; }
      if(RT.current()) RT.close();
    });
    /* тикеты: дорисовывать «Сообщить о проблеме» под фото-кнопками модулей при любом рендере
       (вставка идемпотентна — наблюдатель не зацикливается) */
    try{ new MutationObserver(function(){ injectReportBtns(); }).observe(document.body,{childList:true,subtree:true}); }catch(e){}
  }

  /* смена языка: перевести статический DOM, перерисовать главный экран и открытые шторки */
  function onLocaleChange(){
    I.apply(document);
    renderHome();
    if(lockView && lockView.classList.contains("active")) renderLock(false);
    if(isSettingsOpen()) renderSettings();
    if(storeOverlay && storeOverlay.classList.contains("show")) renderStore();
    if(RT.Parent && body.getAttribute("data-view")==="parent") RT.Parent.render();
  }

  RT._shell={
    user:{name:"Артём", role:"child"}, demo:demo, tokens:{},
    moduleView:moduleViewEl, showHome:showHome, showModule:showModule,
    toast:toast, buzz:buzz, chime:chime, hud:hud, fab:fab, fabDestroy:fabDestroy, frame:frame,
    confirm:confirm, sheet:sheet, enableDrag:enableDrag, setDemo:setDemo,
    /* для родительского дашборда (core/parent.js): настройки, иконки плиток, роль,
       скрытый реордер (makeJiggle) + сохранение личного порядка (applyTileOrder) +
       личное скрытие плиток (applyTileHidden) и бейдж-глаз (jglEye) */
    openSettings:openSettings, iconHtml:iconHtml, isParent:isParent, icons:HDR_ICONS,
    makeJiggle:makeJiggle, applyTileOrder:applyTileOrder,
    applyTileHidden:applyTileHidden, jglEye:jglEye,
    /* для оповещений (core/notify.js): открыть переписку тикета из ссылки {view:"ticket",id} */
    openTicket:function(id){ openSettings(); openTicketThread(id); },
    demoBundle:function(id){ return RT._shell_demoBundle(id); },
    /* модулям, которые блокируют прокрутку тела (chat: html.ch-lock) и/или гоняют клавиатуру:
       iOS-PWA после такого оставляет layout-вьюпорт КОРОЧЕ экрана → fixed-бар застревает выше
       реального низа, под ним native-полоса = «щель». Зовётся при размонтировании, чтобы
       заново развернуть вьюпорт на полную высоту (та же механика, что на load/pageshow). */
    fixViewport:rtForceFullViewport,
    restoreViewportAfterModule:restoreViewportAfterModule
  };

  /* Восстановить экран после обновления страницы (память rt_screen).
     savedSt читается в boot ДО первого showHome — он пишет {v:home} и затёр бы сохранённое.
     Модуль возвращаем только если он существует, активен и включён; иначе тихо остаёмся дома. */
  function restoreScreen(savedSt){
    try{
      if(!savedSt || !savedSt.v || savedSt.v==="home") return;
      if(savedSt.v==="settings") return; // настройки НЕ восстанавливаем (+ чистит старый кэш): остаёмся на доме/дашборде
      if(savedSt.v==="module" && savedSt.id){
        var ok=false;
        RT._registry.forEach(function(m){ if(m.id===savedSt.id && m.status==="active" && m.enabled!==0) ok=true; });
        if(ok) RT.open(savedSt.id); else screenSave({v:"home"});
      }
    }catch(e){}
  }

  function boot(){
    cacheDom(); wire();
    I.apply(document);                 // перевести статический DOM под активный язык
    I.onChange(onLocaleChange);        // реагировать на смену языка
    RT._shell.demo=demo; body.classList.toggle("demo",demo);
    var savedSt=lsGet("rt_screen",null); // память экрана: читать ДО первого showHome
    if(demo){ showHome(); loadRegistry().then(function(){ restoreScreen(savedSt); }); loadAccount(); return; } // file:// — демо без входа
    // СЕРВЕР: приложение закрыто до входа. Сначала проверяем сессию, плитки не показываем.
    showLock(true);
    loadAccount().then(function(a){
      if(a && a.authenticated){
        if(a.user && a.user.mustChangePassword){ showLock(true); renderForcePass(lockView); return; }
        showHome(); loadRegistry().then(function(){ restoreScreen(savedSt); }); syncStart(); // живое обновление — только для вошедших
        if(RT.Notify) RT.Notify.boot(); // оповещения: колокольчик, бейдж, баннеры
      } else {
        /* Незалогиненных встречает ЛЕНДИНГ (landing.html), форма входа — по кнопке
           «Войти» с лендинга (index.html#login). Редирект только с канонических
           адресов: на SPA-под-путях rewrite отдаёт index.html, и относительный
           landing.html зациклился бы. */
        if(location.hash!=="#login" && /(\/|\/index\.html)$/.test(location.pathname)){ location.replace("landing.html"); return; }
        renderLock(false); // форма входа
      }
    });
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot); else boot();

  /* iOS standalone (PWA): на 1-м кадре layout-вьюпорт КОРОЧЕ экрана (innerHeight 873 при screen 932;
     замерено на устройстве). Нижний бар (fixed bottom:0) стоит у низа короткого вьюпорта, а полоса
     ПОД ним — нативная, страница её не закрашивает (поэтому ни заливка, ни цвет html не помогали).
     Ключ (наблюдение Джеффа): ПРОКРУЧИВАЕМЫЕ экраны (модули) разворачивают вьюпорт сами, а статичный
     родительский ДОМ — нет (его контент влезает ровно, скролла нет). Значит триггер — прокручиваемость.
     Чиним так же: временно делаем страницу ВЫШЕ экрана → она становится прокручиваемой → iOS
     разворачивает вьюпорт на полную высоту. Как только вьюпорт дорос — снимаем подпорку (без
     постоянного лишнего скролла). screen.height доступен сразу (в отличие от коротких CSS-единиц). */
  /* onDone (необязательно) — вызывается, когда вьюпорт развернулся (или по страховочному таймауту).
     Зовущие на load/pageshow передают Event (не функцию) — onDone там просто не сработает. Нужен
     модулям, которые на время разворота снимают свой scroll-lock и должны вернуть его ПОСЛЕ (chat). */
  function rtForceFullViewport(onDone){
    function fin(){ if(typeof onDone==="function") try{ onDone(); }catch(e){} }
    var root=document.getElementById("root"); if(!root){ fin(); return; }
    if(window.innerHeight>=screen.height-2){ root.style.minHeight=""; fin(); return; } // уже полный
    var vv=window.visualViewport, done=false;
    function reset(){ if(done) return; done=true; root.style.minHeight=""; if(vv) vv.removeEventListener("resize",settle); fin(); }
    function settle(){ if(window.innerHeight>=screen.height-2) reset(); }
    root.style.minHeight=(screen.height+120)+"px"; // подпорка: страница выше экрана → прокручиваемая
    try{ window.scrollTo(0,2); }catch(e){}
    requestAnimationFrame(function(){ try{ window.scrollTo(0,0); }catch(e){} });
    if(vv) vv.addEventListener("resize",settle);
    setTimeout(reset,4000); // страховка: снять подпорку даже если вьюпорт так и не дорос
  }
  window.addEventListener("load", rtForceFullViewport);
  window.addEventListener("pageshow", rtForceFullViewport);
  window.addEventListener("orientationchange", function(){ setTimeout(rtForceFullViewport,350); });

  /* ===== Клавиатура iOS перекрывала нижние шторки (.overlay/.sheet якорятся к низу).
     Поднимаем их над клавиатурой через VisualViewport: --kb = высота клавиатуры (CSS
     лифтит оверлей и ужимает шторку), плюс держим фокусное поле в зоне видимости.
     App-wide: компонент шторки общий у родителя и детских модулей. ===== */
  (function(){
    var vv=window.visualViewport; if(!vv) return;
    var root=document.documentElement;
    function kbH(){ return Math.max(0, window.innerHeight - vv.height - vv.offsetTop); }
    function applyKb(){
      var h=kbH();
      root.style.setProperty("--kb", h+"px");
      root.classList.toggle("kb-open", h>80);
      if(h>80){
        var el=document.activeElement;
        if(el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)){
          try{ el.scrollIntoView({block:"center"}); }catch(e){}
        }
      }
    }
    vv.addEventListener("resize", applyKb);
    vv.addEventListener("scroll", applyKb);
    document.addEventListener("focusin", applyKb);
    document.addEventListener("focusout", function(){ setTimeout(applyKb,60); });
  })();

})(window.RobTop);
