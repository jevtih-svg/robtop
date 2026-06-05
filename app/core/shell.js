/* RobTop — оболочка (shell): главный экран, общие UI-сервисы, роутер, магазин приложений.
   Модули монтируются в #module-view через loader. Источник правды по модулям — registry.php
   (на сервере) либо встроенный список + localStorage (демо/офлайн). */
window.RobTop = window.RobTop || {};
(function(RT){
  "use strict";
  var SERVER=(location.protocol==="http:"||location.protocol==="https:");
  var demo=!SERVER;
  var ADMIN_DEMO_PIN="1234";
  var adminPin=null; // валидированный PIN администратора (в памяти сессии)

  function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];}); }

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

  /* ---- встроенный список модулей (демо/фолбэк) ---- */
  var DEFAULTS=[
    {id:"wishlist",name:"Виш-лист",color:"#ff3db0",status:"active",source:"native",server:true,sort:10},
    {id:"reverse",name:"Слова наоборот",color:"#ff7a3d",status:"active",source:"native",server:false,sort:20},
    {id:"mood",name:"Настроение дня",color:"#ffd23b",status:"soon",source:"native",sort:30},
    {id:"teeth",name:"Таймер зубов",color:"#19e3ff",status:"soon",source:"native",sort:40},
    {id:"guess",name:"Угадай число",color:"#a64bff",status:"soon",source:"native",sort:50},
    {id:"names",name:"Смешные имена",color:"#38e8a0",status:"soon",source:"native",sort:60},
    {id:"days",name:"Счётчик дней",color:"#3b6bff",status:"soon",source:"native",sort:70},
    {id:"find",name:"Найти предмет",color:"#19e3ff",status:"soon",source:"native",sort:80},
    {id:"museum",name:"Домашний музей",color:"#c0a0ff",status:"soon",source:"native",sort:90},
    {id:"rating",name:"Оценка дня",color:"#ffd23b",status:"soon",source:"native",sort:100},
    {id:"lost",name:"Бюро находок",color:"#2bf0c0",status:"soon",source:"native",sort:110},
    {id:"bank",name:"Копилка",color:"#ff4d6d",status:"soon",source:"native",wide:true,sort:120}
  ];

  /* ---- localStorage помощники (демо) ---- */
  function lsGet(k,def){ try{ var r=localStorage.getItem(k); return r?JSON.parse(r):def; }catch(e){ return def; } }
  function lsSet(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }
  function getOverrides(){ return lsGet("robtop_modreg",{}); }
  function setOverrides(o){ lsSet("robtop_modreg",o); }
  function getInstalled(){ return lsGet("robtop_installed",{}); }
  function setInstalled(o){ lsSet("robtop_installed",o); }

  /* ---- DOM ---- */
  var body, appsEl, homeView, moduleView, fabEl, toastEl, demoBadge,
      hudL,hudCnum,hudClbl,hudRnum,hudRlbl, storeOverlay, storeBody, gearBtn;

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
    fabEl.classList.add("show"); fabEl.onclick=function(){ try{ if(onClick) onClick(); }catch(e){} };
    return { show:function(){ fabEl.classList.add("show"); }, hide:function(){ fabEl.classList.remove("show"); }, destroy:fabDestroy };
  }
  function fabDestroy(){ fabEl.classList.remove("show"); fabEl.onclick=null; fabEl.innerHTML=""; }
  function confirm(opts){
    opts=opts||{};
    return new Promise(function(resolve){
      var ov=document.createElement("div"); ov.className="overlay show";
      ov.innerHTML='<div class="sheet" role="dialog"><div class="grip"></div><h2>'+esc(opts.title||"Подтвердить?")+'</h2>'+(opts.text?'<p style="text-align:center;color:#cfe0ff;font-weight:600;margin:0 0 6px">'+esc(opts.text)+'</p>':'')+'<div class="sheet-actions"><button class="btn btn-cancel" data-no>'+esc(opts.cancel||"Отмена")+'</button><button class="btn btn-primary" data-yes>'+esc(opts.ok||"Да")+'</button></div></div>';
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
  function showHome(){ body.setAttribute("data-view","home"); moduleView.classList.remove("active"); homeView.classList.add("active"); window.scrollTo(0,0); fabDestroy(); homeHud(); }
  function showModule(){ body.setAttribute("data-view","module"); homeView.classList.remove("active"); moduleView.classList.add("active"); window.scrollTo(0,0); }

  function iconHtml(m){
    if(m.source==="installed" && m.icon && /\.(svg|png|jpe?g|webp|gif)$/i.test(m.icon)) return '<img src="apps/'+esc(m.id)+'/'+esc(m.icon)+'" alt="">';
    var key=TILE_ICON[m.id]; return ICONS[key]||ICONS.cube;
  }
  function homeHud(){
    var total=RT._registry.length, active=0;
    RT._registry.forEach(function(m){ if(m.status==="active") active++; });
    hud({ left:'RobTop · <b>beta</b>', cNum:total, cLbl:"приложений", rNum:active, rLbl:"доступно" });
  }
  function renderHome(){
    appsEl.innerHTML=RT._registry.map(function(m){
      var soon=m.status!=="active";
      return '<button class="tile'+(soon?' soon':' active')+(m.wide?' wide':'')+'" style="--c:'+(m.color||"#19e3ff")+'" data-mod="'+esc(m.id)+'">'
        +(soon?'<span class="lock">'+ICONS.lock+'</span>':'<span class="ring"></span>')
        +'<span class="ic">'+iconHtml(m)+'</span>'
        +'<span class="txt"><span class="nm">'+esc(m.name)+'</span><span class="st">'+(soon?'Скоро':'Открыть')+'</span></span>'
        +'</button>';
    }).join("");
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

  function loadRegistry(){
    if(demo){ RT.setRegistry(visible(allModulesDemo())); renderHome(); return Promise.resolve(); }
    return RT.API.get("registry.php").then(function(res){
      var list=(res&&res.modules)||[]; if(!list.length) list=visible(DEFAULTS.map(function(m){return Object.assign({},m);}));
      RT.setRegistry(list); renderHome();
    }).catch(function(){ RT.setRegistry(visible(DEFAULTS.map(function(m){return Object.assign({},m);}))); renderHome(); });
  }

  /* ================= МАГАЗИН / АДМИН ================= */
  function allModules(){
    if(demo) return Promise.resolve(allModulesDemo());
    return RT.API.get("modules.php?all=1").then(function(r){ return (r&&r.modules)||[]; }).catch(function(){ return allModulesDemo(); });
  }
  function adminCall(path, bodyObj){
    if(demo) return Promise.resolve({ok:true,demo:true});
    return RT.API.post(path, Object.assign({pin:adminPin}, bodyObj||{}));
  }
  function openStore(){ adminPin=null; renderStore(); storeOverlay.classList.add("show"); }
  function closeStore(){ storeOverlay.classList.remove("show"); }

  function renderStore(){
    if(!adminPin){
      storeBody.innerHTML='<h2>Приложения</h2>'
        +'<p style="text-align:center;color:#cfe0ff;font-weight:600;margin:0 0 4px">Управление приложениями — для родителя.</p>'
        +'<div class="pin-row"><input id="adminPinIn" type="password" inputmode="numeric" placeholder="PIN" autocomplete="off"><button class="btn btn-primary" id="adminPinBtn" style="flex:0 0 40%">Войти</button></div>';
      var inp=document.getElementById("adminPinIn"), btn=document.getElementById("adminPinBtn");
      function tryUnlock(){
        var v=(inp.value||"").trim(); if(!v) return;
        if(demo){ if(v===ADMIN_DEMO_PIN){ adminPin=v; renderStore(); } else toast("Неверный PIN"); return; }
        RT.API.post("store/enable.php",{pin:v,verify:1}).then(function(r){ if(r&&r.ok){ adminPin=v; renderStore(); } else toast("Неверный PIN"); }).catch(function(){ toast("Неверный PIN"); });
      }
      btn.onclick=tryUnlock; inp.addEventListener("keydown",function(e){ if(e.key==="Enter") tryUnlock(); });
      setTimeout(function(){ inp.focus(); },200);
      return;
    }
    allModules().then(function(list){
      list.sort(function(a,b){ return (a.sort||0)-(b.sort||0); });
      var rows=list.map(function(m,i){
        var ic=iconHtml(m);
        var sub=(m.source==="installed"?"установлено":"встроено")+(m.status==="soon"?" · скоро":"")+(m.version?" · v"+esc(m.version):"");
        return '<div class="store-row" style="--c:'+(m.color||"#19e3ff")+'" data-id="'+esc(m.id)+'">'
          +'<span class="si">'+ic+'</span>'
          +'<span class="smeta"><div class="snm">'+esc(m.name)+'</div><div class="ssub">'+sub+'</div></span>'
          +'<button class="hbtn" data-act="up" aria-label="Выше" style="width:36px;height:36px">▲</button>'
          +'<button class="hbtn" data-act="down" aria-label="Ниже" style="width:36px;height:36px">▼</button>'
          +(m.source==="installed"?'<button class="hbtn" data-act="uninstall" aria-label="Удалить" style="width:36px;height:36px;color:#ffb3c0">✕</button>':'')
          +'<button class="toggle'+(m.enabled!==0?" on":"")+'" data-act="toggle" aria-label="Вкл/выкл"></button>'
          +'</div>';
      }).join("");
      storeBody.innerHTML='<h2>Приложения</h2>'
        +'<div class="store-section">Установленные</div>'
        +'<div class="store-list" id="storeList">'+rows+'</div>'
        +'<div class="store-section">Установить приложение</div>'
        +'<div class="store-install" id="storeInstall">📦 Выбрать бандл (.robtop.json)</div>'
        +'<input type="file" id="bundleInput" accept=".json,application/json" hidden>'
        +'<div class="sheet-actions"><button class="btn btn-cancel" id="storeCloseBtn" style="flex:1">Закрыть</button></div>';
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
    adminCall("store/enable.php",{id:id,enabled:on?1:0}).then(function(r){ if(r&&r.ok) refreshAfterAdmin(); else toast("Не удалось (PIN?)"); });
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
    confirm({title:"Удалить приложение?",text:"Данные и события сохранятся.",ok:"Удалить",cancel:"Отмена"}).then(function(ok){
      if(!ok) return;
      if(demo){ var inst=getInstalled(); delete inst[id]; setInstalled(inst); var ov=getOverrides(); delete ov[id]; setOverrides(ov); refreshAfterAdmin(); toast("Удалено"); return; }
      adminCall("store/uninstall.php",{id:id}).then(function(r){ if(r&&r.ok){ refreshAfterAdmin(); toast("Удалено"); } else toast("Не удалось"); });
    });
  }
  function readBundle(file){
    var fr=new FileReader();
    fr.onload=function(){
      var bundle; try{ bundle=JSON.parse(fr.result); }catch(e){ toast("Битый бандл (не JSON)"); return; }
      if(!bundle.manifest||!bundle.manifest.id||!bundle.files){ toast("В бандле нет manifest/files"); return; }
      if(!/^[a-z0-9_-]{2,40}$/.test(bundle.manifest.id)){ toast("Неверный id приложения"); return; }
      var bad=Object.keys(bundle.files).some(function(n){ return /\.(php|phtml|phar|cgi|pl|py|sh)$/i.test(n); });
      if(bad){ toast("Серверный код в бандле запрещён"); return; }
      if(demo){
        var inst=getInstalled(); inst[bundle.manifest.id]={manifest:bundle.manifest, files:bundle.files}; setInstalled(inst);
        refreshAfterAdmin(); toast("Установлено: "+(bundle.manifest.name||bundle.manifest.id)); return;
      }
      adminCall("store/install.php",{manifest:bundle.manifest, files:bundle.files}).then(function(r){ if(r&&r.ok){ refreshAfterAdmin(); toast("Установлено"); } else toast((r&&r.error)||"Не удалось установить"); }).catch(function(){ toast("Ошибка установки"); });
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
    fabEl=document.getElementById("fab");
    toastEl=document.getElementById("toast");
    demoBadge=document.getElementById("demoBadge");
    hudL=document.getElementById("hudL"); hudCnum=document.getElementById("hudCnum"); hudClbl=document.getElementById("hudClbl"); hudRnum=document.getElementById("hudRnum"); hudRlbl=document.getElementById("hudRlbl");
    storeOverlay=document.getElementById("storeOverlay"); storeBody=document.getElementById("storeBody"); gearBtn=document.getElementById("gearBtn");
  }
  function wire(){
    appsEl.addEventListener("click",function(e){ var t=e.target.closest("[data-mod]"); if(t) RT.open(t.getAttribute("data-mod")); });
    gearBtn.addEventListener("click",openStore);
    storeOverlay.addEventListener("click",function(e){ if(e.target===storeOverlay) closeStore(); });
    var sg=storeOverlay.querySelector(".grip"); if(sg) sg.addEventListener("click",closeStore);
    enableDrag(storeOverlay.querySelector(".sheet"), closeStore);
    document.addEventListener("keydown",function(e){ if(e.key==="Escape"){ closeStore(); if(RT.current()) RT.close(); } });
  }

  RT._shell={
    user:{name:"Артём", role:"child"}, demo:demo, tokens:{},
    moduleView:moduleViewEl, showHome:showHome, showModule:showModule,
    toast:toast, buzz:buzz, chime:chime, hud:hud, fab:fab, fabDestroy:fabDestroy,
    confirm:confirm, sheet:sheet, enableDrag:enableDrag, setDemo:setDemo,
    demoBundle:function(id){ return RT._shell_demoBundle(id); }
  };

  function boot(){
    cacheDom(); wire();
    RT._shell.demo=demo; body.classList.toggle("demo",demo);
    showHome();
    loadRegistry();
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot); else boot();
})(window.RobTop);
