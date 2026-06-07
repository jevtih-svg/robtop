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
  var ADMIN_DEMO_PIN="1234";
  var adminPin=null; // валидированный PIN администратора (в памяти сессии)

  /* ---- аккаунт (сессия accounts.php). null = ещё не проверяли. ---- */
  var acct=null;
  function isParent(){ return !!(acct && acct.authenticated && acct.user && acct.user.kind==="parent"); }
  function loadAccount(){
    if(demo){ acct={authenticated:false}; return Promise.resolve(acct); }
    return RT.API.post("accounts.php",{op:"me"}).then(function(r){
      acct=(r&&r.ok)?r:{authenticated:false};
      if(acct.authenticated && acct.user){
        RT._shell.user={ name:acct.user.nickname, role:(acct.user.kind==="parent"?"parent":"child") };
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
    cube:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/></svg>'
  };
  var TILE_ICON={ wishlist:"cherry", reverse:"reverse", mood:"smile", teeth:"tooth", guess:"quiz", names:"tag", days:"calendar", find:"search", museum:"museum", rating:"star", lost:"gem", bank:"bank" };
  var BACK_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 5.5L8 12l6.5 6.5"/></svg>';

  /* ---- встроенный список модулей (демо/фолбэк). name — фолбэк, отображается tile.<id> ---- */
  var DEFAULTS=[
    {id:"wishlist",name:"Wishlist",color:"#ff3db0",status:"active",source:"native",server:true,sort:10},
    {id:"reverse",name:"Words Backwards",color:"#ff7a3d",status:"active",source:"native",server:false,sort:20},
    {id:"mood",name:"Mood of the Day",color:"#ffd23b",status:"active",source:"native",sort:30},
    {id:"teeth",name:"Toothbrushing Timer",color:"#19e3ff",status:"active",source:"native",sort:40},
    {id:"guess",name:"Guess the Number",color:"#a64bff",status:"active",source:"native",sort:50},
    {id:"names",name:"Funny Names",color:"#38e8a0",status:"soon",source:"native",sort:60},
    {id:"days",name:"Day Counter",color:"#3b6bff",status:"soon",source:"native",sort:70},
    {id:"find",name:"Find the Object",color:"#19e3ff",status:"soon",source:"native",sort:80},
    {id:"museum",name:"Home Museum",color:"#c0a0ff",status:"soon",source:"native",sort:90},
    {id:"rating",name:"Day Rating",color:"#ffd23b",status:"active",source:"native",sort:100},
    {id:"lost",name:"Lost & Found",color:"#2bf0c0",status:"soon",source:"native",sort:110},
    {id:"bank",name:"Piggy Bank",color:"#ff4d6d",status:"active",source:"native",wide:true,sort:120}
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
      hudL,hudCnum,hudClbl,hudRnum,hudRlbl, settingsBody,
      storeOverlay, storeBody, gearBtn;

  /* ================= общие UI-сервисы ================= */
  function buzz(p){ try{ if(navigator.vibrate) navigator.vibrate(p); }catch(e){} }
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
  function hud(o){ o=o||{}; if(o.left!=null) hudL.innerHTML=o.left; if(o.cNum!=null) hudCnum.textContent=o.cNum; if(o.cLbl!=null) hudClbl.textContent=o.cLbl; if(o.rNum!=null) hudRnum.textContent=o.rNum; if(o.rLbl!=null) hudRlbl.textContent=o.rLbl; }
  function fab(label,onClick){
    fabEl.innerHTML='<span class="plus">+</span> '+esc(label||"");
    fabEl.setAttribute("aria-label", label||"");
    fabEl.classList.add("show"); fabEl.onclick=function(){ try{ if(onClick) onClick(); }catch(e){} };
    return { show:function(){ fabEl.classList.add("show"); }, hide:function(){ fabEl.classList.remove("show"); }, destroy:fabDestroy };
  }
  function fabDestroy(){ fabEl.classList.remove("show"); fabEl.onclick=null; fabEl.innerHTML=""; }
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
    function close(){ ov.classList.remove("show"); setTimeout(function(){ if(ov.parentNode) ov.parentNode.removeChild(ov); },200); }
    grip.addEventListener("click",close); enableDrag(sh,close);
    ov.addEventListener("click",function(e){ if(e.target===ov) close(); });
    return { close:close, overlay:ov, sheet:sh };
  }

  function setDemo(b){ demo=b; RT._shell.demo=b; body.classList.toggle("demo",b); }

  /* ================= ВИДЫ ================= */
  function moduleViewEl(){ return moduleView; }
  function hideParent(){ if(parentView) parentView.classList.remove("active"); }
  function hideSettings(){ if(settingsView) settingsView.classList.remove("active"); }
  /* «домой» для РОДИТЕЛЯ = дашборд (а не детские плитки): один шов, через который
     возвращаются и RT.close() из модуля, и boot(). Детский путь не меняется. */
  function showHome(){
    if(!demo && isParent() && RT.Parent){ showParent(); return; }
    body.setAttribute("data-view","home"); if(lockView) lockView.classList.remove("active"); hideParent(); hideSettings(); moduleView.classList.remove("active"); homeView.classList.add("active"); window.scrollTo(0,0); fabDestroy(); homeHud();
  }
  function showModule(){ body.setAttribute("data-view","module"); if(lockView) lockView.classList.remove("active"); hideParent(); hideSettings(); homeView.classList.remove("active"); moduleView.classList.add("active"); window.scrollTo(0,0); }
  /* родительский дашборд (core/parent.js); read-only поверхность вместо детского дома */
  function showParent(){
    body.setAttribute("data-view","parent");
    if(lockView) lockView.classList.remove("active");
    homeView.classList.remove("active"); moduleView.classList.remove("active"); hideSettings();
    if(parentView) parentView.classList.add("active");
    window.scrollTo(0,0); fabDestroy();
    if(RT.Parent) RT.Parent.show();
  }

  /* ---- экран входа (lock): на сервере без сессии приложение закрыто ---- */
  function showLock(loading){
    body.setAttribute("data-view","lock");
    homeView.classList.remove("active"); moduleView.classList.remove("active"); hideParent(); hideSettings();
    lockView.classList.add("active");
    renderLock(loading);
    window.scrollTo(0,0);
  }
  function renderLock(loading){
    var head='<div class="hometop"><h1 class="brand">Rob<b>Top</b></h1>'
      +'<div class="tagline">'+esc(t("lock.hint"))+'</div></div>';
    if(loading){ lockView.innerHTML=head+'<p class="set-note" style="text-align:center">'+esc(t("account.loading"))+'</p>'; return; }
    lockView.innerHTML=head
      +'<div class="lockform">'
      +'<p class="set-note">'+esc(t("account.loginHint"))+'</p>'
      +'<input class="set-in" id="lockLogin" type="text" placeholder="'+esc(t("account.loginPh"))+'" autocomplete="username">'
      +'<input class="set-in" id="lockPass" type="password" placeholder="'+esc(t("account.passPh"))+'" autocomplete="current-password">'
      +'<button class="btn btn-primary" id="lockIn">'+esc(t("account.signIn"))+'</button>'
      +'<button class="btn btn-cancel" id="lockReg" style="flex:none">'+esc(t("reg.link"))+'</button>'
      +'</div>';
    var lg=lockView.querySelector("#lockLogin"), ps=lockView.querySelector("#lockPass");
    var go=function(){ loginFlow((lg.value||"").trim(), ps.value||"", lockView.querySelector(".lockform")); };
    lockView.querySelector("#lockIn").onclick=go;
    lockView.querySelector("#lockReg").onclick=renderLockRegister;
    ps.addEventListener("keydown",function(e){ if(e.key==="Enter") go(); });
    setTimeout(function(){ lg.focus(); },150);
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
        toast(t("account.welcome",{name:nick}));
        setTimeout(function(){ location.reload(); },500);
      }).catch(function(){ toast(t("reg.fail")); });
    };
    setTimeout(function(){ lockView.querySelector("#regNick").focus(); },150);
  }
  /* общий поток входа: успех → reload (меняется rt_user_id); 1234 → обязательная смена в target */
  function loginFlow(loginV, passV, forceTarget){
    if(!loginV||!passV){ toast(t("account.badLogin")); return; }
    RT.API.post("accounts.php",{op:"login",login:loginV,password:passV}).then(function(r){
      if(!(r&&r.ok&&r.user)){ toast(t("account.badLogin")); return; }
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
  function tileHtml(m){
    var soon=m.status!=="active";
    return '<button class="tile'+(soon?' soon':' active')+(m.wide?' wide':'')+'" style="--c:'+(m.color||"#19e3ff")+'" data-mod="'+esc(m.id)+'">'
      +(soon?'<span class="lock">'+ICONS.lock+'</span>':'<span class="ring"></span>')
      +'<span class="ic">'+iconHtml(m)+'</span>'
      +'<span class="txt"><span class="nm">'+esc(modName(m))+'</span><span class="st">'+(soon?esc(t("tile.status.soon")):esc(t("tile.status.open")))+'</span></span>'
      +'</button>';
  }
  /* активные плитки всегда сверху; группа «скоро» — ниже, за разделителем */
  function renderHome(){
    var act=[], soon=[];
    RT._registry.forEach(function(m){ (m.status==="active"?act:soon).push(m); });
    appsEl.innerHTML=act.map(tileHtml).join("")
      +(soon.length?'<div class="apps-sep">'+esc(t("home.soonSep"))+'</div>'+soon.map(tileHtml).join(""):"");
    homeHud();
  }

  /* ================= РЕЕСТР ================= */
  function mergeOverrides(list){
    var ov=getOverrides();
    list.forEach(function(m){ var o=ov[m.id]; if(o){ if(o.enabled!=null) m.enabled=o.enabled; if(o.sort!=null) m.sort=o.sort; } });
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

  /* ================= НАСТРОЙКИ (отдельный экран; «приложения» — родителю, PIN как fallback) ================= */
  function authKey(){ return demo?"demo":(acct===null?"loading":(acct.authenticated?("in:"+(acct.user&&acct.user.id)):"out")); }
  function isSettingsOpen(){ return body.getAttribute("data-view")==="settings"; }
  function openSettings(){
    if(isSettingsOpen()) return;
    renderSettings();
    body.setAttribute("data-view","settings");
    homeView.classList.remove("active"); moduleView.classList.remove("active"); hideParent();
    if(lockView) lockView.classList.remove("active");
    settingsView.classList.add("active");
    window.scrollTo(0,0); fabDestroy();
    if(!demo){ var k=authKey(); loadAccount().then(function(){
      if(isSettingsOpen() && authKey()!==k) renderSettings();
    }); }
  }
  /* назад из настроек: showHome сам уводит родителя на дашборд */
  function closeSettings(){ if(!isSettingsOpen()) return; showHome(); }

  /* блок «Аккаунт» в настройках: статус + вход/выход (вход меняет rt_user_id на сервере, поэтому после
     успеха перезагружаем страницу — чистое состояние реестра и данных, без частичных перерисовок) */
  function accountSectionHtml(){
    var out='<div class="store-section">'+esc(t("account.title"))+'</div>';
    if(demo) return out+'<p class="set-note">'+esc(t("account.demoNote"))+'</p>';
    if(acct===null) return out+'<p class="set-note">'+esc(t("account.loading"))+'</p>';
    if(acct.authenticated && acct.user){
      var u=acct.user, role=(u.kind==="parent")?t("account.roleParent"):t("account.roleChild");
      return out
        +'<div class="acct-row"><span class="nm">'+esc(u.nickname)+'</span><span class="rl">'+esc(role)+'</span></div>';
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
  }
  /* обязательная смена одноразового 1234 (target: settingsBody или форма на lock-экране) */
  function renderForcePass(target){
    target=target||settingsBody;
    target.innerHTML='<h2>'+esc(t("account.changeTitle"))+'</h2>'
      +'<p class="set-note">'+esc(t("account.changeHint"))+'</p>'
      +'<input class="set-in" id="npIn" type="password" placeholder="'+esc(t("account.newPassPh"))+'" autocomplete="new-password">'
      +'<div class="sheet-actions"><button class="btn btn-primary" id="npSave" style="flex:1">'+esc(t("account.saveCont"))+'</button></div>';
    var inp=target.querySelector("#npIn");
    target.querySelector("#npSave").onclick=function(){
      var v=inp.value||"";
      if(v.length<4||v==="1234"){ toast(t("account.weakPass")); return; }
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
  function loadFamily(){
    var box=settingsBody.querySelector("#famBox"); if(!box) return;
    famApi({op:"members"}).then(function(r){
      var kids=(r&&r.children)||[];
      var rows=kids.map(function(k){
        var blocked=(k.status==="disabled");
        return '<button class="acct-row" data-kid="'+k.id+'" data-nick="'+esc(k.nickname)+'" data-blocked="'+(blocked?1:0)+'">'
          +'<span class="nm">'+esc(k.nickname)+'</span>'
          +'<span class="rl'+(blocked?' off':'')+'">'+esc(blocked?t("family.blocked"):t("account.roleChild"))+'</span></button>';
      }).join("");
      box.innerHTML=(rows||'<p class="set-note">'+esc(t("family.empty"))+'</p>')
        +'<div class="store-install" id="famAdd">＋ '+esc(t("family.addChild"))+'</div>'
        +'<div class="store-install" id="famInvite">✉ '+esc(t("family.invite"))+'</div>';
      Array.prototype.forEach.call(box.querySelectorAll("[data-kid]"),function(b){
        b.onclick=function(){ openChildSheet(parseInt(b.getAttribute("data-kid"),10), b.getAttribute("data-nick"), b.getAttribute("data-blocked")==="1"); };
      });
      box.querySelector("#famAdd").onclick=openAddChild;
      box.querySelector("#famInvite").onclick=openInviteParent;
    }).catch(function(){ box.innerHTML='<p class="set-note">'+esc(t("common.failed"))+'</p>'; });
  }
  function openChildSheet(id,nick,blocked){
    var node=document.createElement("div");
    node.innerHTML='<h2>'+esc(nick)+'</h2>'
      +'<div class="store-install" id="kidReset">🔑 '+esc(t("family.resetPass"))+'</div>'
      +'<div class="store-install" id="kidBlock">'+(blocked?'✅ '+esc(t("family.unblock")):'⛔ '+esc(t("family.block")))+'</div>'
      +'<div class="sheet-actions"><button class="btn btn-cancel" id="kidClose" style="flex:1">'+esc(t("common.close"))+'</button></div>';
    var ctl=sheet(node);
    node.querySelector("#kidClose").onclick=ctl.close;
    node.querySelector("#kidReset").onclick=function(){
      confirm({title:t("family.resetPass"), text:t("family.resetConfirm",{name:nick}), ok:t("common.yes"), cancel:t("common.cancel")}).then(function(ok){
        if(!ok) return;
        famApi({op:"reset_child",child_id:id}).then(function(){ ctl.close(); toast(t("family.resetDone",{name:nick})); })
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
      +'<input class="set-in" id="kidNick" type="text" placeholder="'+esc(t("family.nickPh"))+'">'
      +'<div class="sheet-actions"><button class="btn btn-cancel" id="kidCancel" style="flex:0 0 38%">'+esc(t("common.cancel"))+'</button>'
      +'<button class="btn btn-primary" id="kidGo" style="flex:1">'+esc(t("family.addBtn"))+'</button></div>'
      +'<div id="kidOut"></div>';
    var ctl=sheet(node);
    node.querySelector("#kidCancel").onclick=ctl.close;
    node.querySelector("#kidGo").onclick=function(){
      var nick=(node.querySelector("#kidNick").value||"").trim(); if(!nick) return;
      famApi({op:"add_child",nickname:nick}).then(function(){
        node.querySelector("#kidOut").innerHTML='<p class="set-note" style="color:#ffe08a">'+esc(t("family.created",{name:nick}))+'</p>';
        loadFamily();
      }).catch(function(){ toast(t("family.nickTaken")); });
    };
    setTimeout(function(){ node.querySelector("#kidNick").focus(); },150);
  }
  function openInviteParent(){
    var node=document.createElement("div");
    node.innerHTML='<h2>'+esc(t("family.invite"))+'</h2>'
      +'<p class="set-note">'+esc(t("family.inviteHint"))+'</p>'
      +'<input class="set-in" id="invEmail" type="email" placeholder="Email">'
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
      }).catch(function(){ toast(t("common.failed")); });
    };
    setTimeout(function(){ node.querySelector("#invEmail").focus(); },150);
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
      +friendSectionHtml()
      +(showManage
        ? '<div class="store-section">'+esc(t("store.title"))+'</div>'
          +'<div class="store-install" id="settingsManage">⚙ '+esc(t("settings.manageApps"))+'</div>'
        : '')
      +'<div class="store-section">'+esc(t("settings.language"))+'</div>'
      +'<div class="lang-seg">'+langBtns+'</div>'
      +signOutHtml()
      +'</div>';
    settingsBody=settingsView.querySelector("#settingsBody");
    settingsView.querySelector("#settingsBack").onclick=closeSettings;
    wireAccountSection();
    if(settingsBody.querySelector("#famBox")) loadFamily();
    var fr=settingsBody.querySelector("#friendInvite");
    if(fr) fr.onclick=openInviteFriend;
    settingsBody.querySelector(".lang-seg").addEventListener("click",function(e){
      var b=e.target.closest("[data-lang]"); if(!b) return;
      I.set(b.getAttribute("data-lang")); buzz(6);
    });
    var mng=settingsBody.querySelector("#settingsManage");
    if(mng) mng.onclick=openStore; // магазин — шторкой поверх настроек, «назад» остаётся логичным
  }

  /* ================= МАГАЗИН / АДМИН ================= */
  function allModules(){
    if(demo) return Promise.resolve(allModulesDemo());
    return RT.API.get("modules.php?all=1").then(function(r){ return (r&&r.modules)||[]; }).catch(function(){ return allModulesDemo(); });
  }
  function adminCall(path, bodyObj){
    if(demo) return Promise.resolve({ok:true,demo:true});
    // родительская сессия авторизует сама (бэкенд rt_admin_gate); PIN шлём только если вводили (fallback)
    return RT.API.post(path, Object.assign(adminPin?{pin:adminPin}:{}, bodyObj||{}));
  }
  function openStore(){ adminPin=null; renderStore(); storeOverlay.classList.add("show"); }
  function closeStore(){ storeOverlay.classList.remove("show"); }

  function renderStore(){
    if(!adminPin && !isParent()){
      storeBody.innerHTML='<h2>'+esc(t("store.title"))+'</h2>'
        +'<p style="text-align:center;color:#cfe0ff;font-weight:600;margin:0 0 4px">'+esc(t("store.adminNote"))+'</p>'
        +'<div class="pin-row"><input id="adminPinIn" type="password" inputmode="numeric" placeholder="PIN" autocomplete="off"><button class="btn btn-primary" id="adminPinBtn" style="flex:0 0 40%">'+esc(t("common.enter"))+'</button></div>';
      var inp=document.getElementById("adminPinIn"), btn=document.getElementById("adminPinBtn");
      function tryUnlock(){
        var v=(inp.value||"").trim(); if(!v) return;
        if(demo){ if(v===ADMIN_DEMO_PIN){ adminPin=v; renderStore(); } else toast(t("err.bad_pin")); return; }
        RT.API.post("store/enable.php",{pin:v,verify:1}).then(function(r){ if(r&&r.ok){ adminPin=v; renderStore(); } else toast(t("err.bad_pin")); }).catch(function(){ toast(t("err.bad_pin")); });
      }
      btn.onclick=tryUnlock; inp.addEventListener("keydown",function(e){ if(e.key==="Enter") tryUnlock(); });
      setTimeout(function(){ inp.focus(); },200);
      return;
    }
    allModules().then(function(list){
      list.sort(function(a,b){ return (a.sort||0)-(b.sort||0); });
      var rows=list.map(function(m,i){
        var ic=iconHtml(m);
        var sub=(m.source==="installed"?t("store.srcInstalled"):t("store.srcBuiltin"))+(m.status==="soon"?t("store.soonSuffix"):"")+(m.version?" · v"+esc(m.version):"");
        return '<div class="store-row" style="--c:'+(m.color||"#19e3ff")+'" data-id="'+esc(m.id)+'">'
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
    adminCall("store/enable.php",{id:id,enabled:on?1:0}).then(function(r){ if(r&&r.ok) refreshAfterAdmin(); else toast(t("store.failPin")); });
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
    hudL=document.getElementById("hudL"); hudCnum=document.getElementById("hudCnum"); hudClbl=document.getElementById("hudClbl"); hudRnum=document.getElementById("hudRnum"); hudRlbl=document.getElementById("hudRlbl");
    settingsView=document.getElementById("settings");
    storeOverlay=document.getElementById("storeOverlay"); storeBody=document.getElementById("storeBody"); gearBtn=document.getElementById("gearBtn");
  }
  function wire(){
    appsEl.addEventListener("click",function(e){ var t=e.target.closest("[data-mod]"); if(t) RT.open(t.getAttribute("data-mod")); });
    gearBtn.addEventListener("click",openSettings);
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
    toast:toast, buzz:buzz, chime:chime, hud:hud, fab:fab, fabDestroy:fabDestroy,
    confirm:confirm, sheet:sheet, enableDrag:enableDrag, setDemo:setDemo,
    /* для родительского дашборда (core/parent.js): настройки, иконки плиток, роль */
    openSettings:openSettings, iconHtml:iconHtml, isParent:isParent,
    demoBundle:function(id){ return RT._shell_demoBundle(id); }
  };

  function boot(){
    cacheDom(); wire();
    I.apply(document);                 // перевести статический DOM под активный язык
    I.onChange(onLocaleChange);        // реагировать на смену языка
    RT._shell.demo=demo; body.classList.toggle("demo",demo);
    if(demo){ showHome(); loadRegistry(); loadAccount(); return; } // file:// — демо без входа
    // СЕРВЕР: приложение закрыто до входа. Сначала проверяем сессию, плитки не показываем.
    showLock(true);
    loadAccount().then(function(a){
      if(a && a.authenticated){
        if(a.user && a.user.mustChangePassword){ showLock(true); renderForcePass(lockView); return; }
        showHome(); loadRegistry();
      } else {
        renderLock(false); // форма входа
      }
    });
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot); else boot();
})(window.RobTop);
