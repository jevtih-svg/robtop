/* RobTop — ОПОВЕЩЕНИЯ (ядро оболочки). Канон — ГАЙД-оповещения.md.
   Поверхности: колокольчик с бейджем (в ШАПКЕ вверху справа на всех экранах; absolute
   с v.67 — уезжает со скроллом, не висит над контентом; на главном ребёнка И дашборде
   родителя — кластер [🔔][⚙] в одном хроме с глобальной шестерёнкой (v.65), прячется
   вместе с HUD и на lock/в демо),
   центр оповещений (шторка снизу: список, «прочитать все», тумблер Web Push),
   всплывающие баннеры как в iOS (поверх всего, тап = переход, свайп вверх = закрыть),
   бейджи непрочитанного у ДРУГИХ аккаунтов устройства (настройки и lock, op peek).

   Данные: api/notify.php; «новое пришло» ловит sync-поллер оболочки (r.ntf {n,m} из
   api/sync.php) → RT.Notify.sync(). Текст оповещения собирается ЗДЕСЬ по ключу
   ntf.ev.<src>.<type> (+params), потому что словари модулей грузятся только при их
   открытии, а центр должен показывать всё и сразу. Фолбэк: params.text → ntf.generic.

   Переход (link): {module:"bank"} | {module:"wishlist",item:"12"} — открыть модуль
   (модуль может объявить опциональный хук link(link, sdk) в register, см. loader.js);
   {view:"ticket",id:5} — переписка тикета; {view:"settings"|"shared"} — настройки.

   Web Push (PWA): sw.js регистрируется ТОЛЬКО при включении тумблера; пуш — «звонок»
   без payload (сервер api/_push.php), текст показывает sw.js. На iOS пуши работают
   только из приложения, добавленного на экран «Домой» — даём подсказку. */
window.RobTop = window.RobTop || {};
(function(RT){
  "use strict";
  var I = RT.i18n;

  /* =================== СЛОВАРИ (en/ru/lv) =================== */
  I.add({
  en:{ ntf:{
    title:"Notifications", empty:"Nothing here yet", readAll:"Mark all as read",
    allRead:"All caught up!", open:"Notifications", app:"RobTop",
    generic:"News from {app}", gone:"This app is not available now",
    push:{ row:"Notifications on this device",
      ios:"To get notifications, add RobTop to your Home Screen (Share → Add to Home Screen)",
      denied:"Notifications are blocked in browser settings", fail:"Couldn't enable notifications",
      onToast:"Device notifications are on", offToast:"Device notifications are off" },
    ev:{
      tickets:{ reply:"Support replied: “{subject}”", closed:"Ticket “{subject}” is closed" },
      /* задания: с миграции 024 шлёт движок sdk.tasks (src "tasks", link → модуль «Задания»);
         дубль в bank.* живёт для СТАРЫХ сохранённых строк (src "bank") */
      tasks:{
        task_new:"New task “{title}” — +{n} points",
        task_claim:"{name} says “{title}” is done — check it",
        task_done:"{name} finished “{title}” (+{n})",
        task_approved:"“{title}” approved — +{n} points!" },
      bank:{
        task_new:"New task “{title}” — +{n} points",
        task_claim:"{name} says “{title}” is done — check it",
        task_done:"{name} finished “{title}” (+{n})",
        task_approved:"“{title}” approved — +{n} points!",
        points_given:"+{n} points from parents",
        points_taken:"−{n} points (parents)",
        penalty:"⚠️ Penalty −{n}",
        daily_bonus:"+5 — all tasks of the day!" },
      wishlist:{
        share_request:"{child} asks to publish their wishlist",
        share_grant:"{child} shared their wishlist with you" },
      chat:{
        message:"{name}: {text}",
        photo:"{name} sent a photo 📷" },
      find:{
        pending:"{name} sent a photo to check — “{desc}”",
        correct:"Find the Object: correct! +{n}",
        wrong:"Find the Object: not counted −{n}",
        bonus:"Difficulty bonus +{n}!" }
    }
  }},
  ru:{ ntf:{
    title:"Оповещения", empty:"Пока пусто", readAll:"Прочитать все",
    allRead:"Все прочитаны!", open:"Оповещения", app:"RobTop",
    generic:"Новость из «{app}»", gone:"Это приложение сейчас недоступно",
    push:{ row:"Уведомления на этом устройстве",
      ios:"Чтобы получать уведомления, добавь RobTop на экран «Домой» (Поделиться → На экран «Домой»)",
      denied:"Уведомления запрещены в настройках браузера", fail:"Не получилось включить уведомления",
      onToast:"Уведомления на устройстве включены", offToast:"Уведомления на устройстве выключены" },
    ev:{
      tickets:{ reply:"Поддержка ответила: «{subject}»", closed:"Обращение «{subject}» закрыто" },
      tasks:{
        task_new:"Новое задание «{title}» — +{n} очков",
        task_claim:"{name}: «{title}» сделано — проверь!",
        task_done:"{name} выполнил(а) задание «{title}» (+{n})",
        task_approved:"«{title}» подтверждено — +{n} очков!" },
      bank:{
        task_new:"Новое задание «{title}» — +{n} очков",
        task_claim:"{name}: «{title}» сделано — проверь!",
        task_done:"{name} выполнил(а) задание «{title}» (+{n})",
        task_approved:"«{title}» подтверждено — +{n} очков!",
        points_given:"+{n} очков от родителей",
        points_taken:"−{n} очков (родители)",
        penalty:"⚠️ Штраф −{n}",
        daily_bonus:"+5 — все задания дня!" },
      wishlist:{
        share_request:"{child} просит включить публичный виш-лист",
        share_grant:"{child} открыл(а) тебе свой виш-лист" },
      chat:{
        message:"{name}: {text}",
        photo:"{name} прислал(а) фото 📷" },
      find:{
        pending:"{name}: фото на проверку — «{desc}»",
        correct:"Найти предмет: верно! +{n}",
        wrong:"Найти предмет: не засчитано −{n}",
        bonus:"Бонус за сложность +{n}!" }
    }
  }},
  lv:{ ntf:{
    title:"Paziņojumi", empty:"Pagaidām tukšs", readAll:"Atzīmēt visus kā izlasītus",
    allRead:"Viss izlasīts!", open:"Paziņojumi", app:"RobTop",
    generic:"Jaunums no “{app}”", gone:"Šī lietotne šobrīd nav pieejama",
    push:{ row:"Paziņojumi šajā ierīcē",
      ios:"Lai saņemtu paziņojumus, pievieno RobTop sākuma ekrānam (Kopīgot → Pievienot sākuma ekrānam)",
      denied:"Paziņojumi ir bloķēti pārlūka iestatījumos", fail:"Neizdevās ieslēgt paziņojumus",
      onToast:"Ierīces paziņojumi ieslēgti", offToast:"Ierīces paziņojumi izslēgti" },
    ev:{
      tickets:{ reply:"Atbalsts atbildēja: “{subject}”", closed:"Pieteikums “{subject}” ir slēgts" },
      tasks:{
        task_new:"Jauns uzdevums “{title}” — +{n} punkti",
        task_claim:"{name}: “{title}” izpildīts — pārbaudi!",
        task_done:"{name} izpildīja uzdevumu “{title}” (+{n})",
        task_approved:"“{title}” apstiprināts — +{n} punkti!" },
      bank:{
        task_new:"Jauns uzdevums “{title}” — +{n} punkti",
        task_claim:"{name}: “{title}” izpildīts — pārbaudi!",
        task_done:"{name} izpildīja uzdevumu “{title}” (+{n})",
        task_approved:"“{title}” apstiprināts — +{n} punkti!",
        points_given:"+{n} punkti no vecākiem",
        points_taken:"−{n} punkti (vecāki)",
        penalty:"⚠️ Sods −{n}",
        daily_bonus:"+5 — visi dienas uzdevumi!" },
      wishlist:{
        share_request:"{child} lūdz publicēt savu vēlmju sarakstu",
        share_grant:"{child} padalījās ar savu vēlmju sarakstu" },
      chat:{
        message:"{name}: {text}",
        photo:"{name} atsūtīja foto 📷" },
      find:{
        pending:"{name}: foto pārbaudei — “{desc}”",
        correct:"Atrodi priekšmetu: pareizi! +{n}",
        wrong:"Atrodi priekšmetu: netika ieskaitīts −{n}",
        bonus:"Grūtības bonuss +{n}!" }
    }
  }}
  });

  /* =================== СОСТОЯНИЕ =================== */
  var bellEl=null, badgeEl=null, bannersEl=null;
  var ready=false, seenMax=-1, unreadN=0, banQueue=[], banShown=0;
  var BELL_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9.8a6 6 0 0 1 12 0c0 4.2 1.8 5.6 1.8 5.6H4.2S6 14 6 9.8z"/><path d="M10 18.6a2.2 2.2 0 0 0 4 0"/></svg>';
  var IC_FALLBACK={ tickets:"🛟", system:"🔔" };
  var IOS=/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
  var STANDALONE=(window.matchMedia&&window.matchMedia("(display-mode: standalone)").matches)||!!navigator.standalone;

  function shell(){ return RT._shell||{}; }
  function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];}); }
  function api(b){ return RT.API.post("notify.php", b); }

  /* =================== ТЕКСТ/ИКОНКА =================== */
  function appName(src){ return I.t("tile."+src,{fallback:I.t("ntf.app")}); }
  function text(n){
    var p=n.params||{};
    var s=I.t("ntf.ev."+n.src+"."+n.type, Object.assign({fallback:""}, p));
    if(!s) s=p.text?String(p.text):I.t("ntf.generic",{app:appName(n.src)});
    if(p.note) s+=" · "+p.note;
    return s;
  }
  function iconHtml(src){
    var meta=RT.metaFor?RT.metaFor(src):null;
    if(meta && shell().iconHtml) return shell().iconHtml(meta);
    return IC_FALLBACK[src]||BELL_SVG;
  }
  function srcColor(src){
    var meta=RT.metaFor?RT.metaFor(src):null;
    return (meta&&meta.color)||"";
  }
  function when(ts){
    if(!ts) return "";
    return I.formatDate(ts,{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
  }

  /* =================== БЕЙДЖ =================== */
  function badge(n){
    unreadN=Math.max(0,parseInt(n,10)||0);
    if(badgeEl){ badgeEl.textContent=unreadN>9?"9+":String(unreadN); }
    if(bellEl){ bellEl.classList.toggle("has", unreadN>0); }
    try{ /* бейдж на иконке установленной PWA, где поддерживается */
      if(navigator.setAppBadge){ if(unreadN) navigator.setAppBadge(unreadN); else navigator.clearAppBadge&&navigator.clearAppBadge(); }
    }catch(e){}
  }

  /* =================== ПЕРЕХОД ПО ССЫЛКЕ =================== */
  function navigate(link){
    if(!link) return false;
    if(link.module){
      var meta=RT.metaFor?RT.metaFor(link.module):null;
      if(!meta||meta.status!=="active"||meta.enabled===0){ if(shell().toast) shell().toast(I.t("ntf.gone")); return false; }
      if(RT.current && RT.current()===link.module){
        var m=RT.modules[link.module];
        if(m&&m.def&&typeof m.def.link==="function"){ try{ m.def.link(link, m.sdk); }catch(e){} }
      } else {
        RT._pendingLink=link;
        RT.open(link.module);
      }
      return true;
    }
    if(link.view==="ticket"&&shell().openTicket){ shell().openTicket(parseInt(link.id,10)||0); return true; }
    if((link.view==="settings"||link.view==="shared")&&shell().openSettings){ shell().openSettings(); return true; }
    return false;
  }

  function markRead(id){
    api({op:"read",id:id}).catch(function(){});
    badge(unreadN-1);
  }

  /* =================== БАННЕРЫ (iOS-стиль) =================== */
  function banner(item){
    if(banShown>=2){ if(banQueue.length<6) banQueue.push(item); return; }
    banShown++;
    var el=document.createElement("div");
    el.className="ntf-banner"; el.setAttribute("role","status");
    var c=srcColor(item.src); if(c) el.style.setProperty("--c",c);
    el.innerHTML='<span class="ntf-ic">'+iconHtml(item.src)+'</span>'
      +'<span class="ntf-tx"><span class="app">'+esc(appName(item.src))+'</span>'
      +'<span class="msg">'+esc(text(item))+'</span></span>';
    bannersEl.appendChild(el);
    requestAnimationFrame(function(){ el.classList.add("in"); });
    if(shell().buzz) shell().buzz(8);
    var gone=false;
    function dismiss(){
      if(gone) return; gone=true;
      el.classList.remove("in");
      setTimeout(function(){
        if(el.parentNode) el.parentNode.removeChild(el);
        banShown--; var nx=banQueue.shift(); if(nx) banner(nx);
      },300);
    }
    el.addEventListener("click",function(){
      if(!item.read){ item.read=true; markRead(item.id); }
      navigate(item.link); dismiss();
    });
    var ty=null;
    el.addEventListener("touchstart",function(e){ ty=e.touches[0].clientY; },{passive:true});
    el.addEventListener("touchmove",function(e){
      if(ty!=null && ty-e.touches[0].clientY>28){ ty=null; dismiss(); }
    },{passive:true});
    setTimeout(dismiss,6000);
  }

  function fetchNew(since){
    api({op:"list"}).then(function(r){
      if(!(r&&r.ok&&r.items)) return;
      var fresh=r.items.filter(function(it){ return !it.read && it.id>since; });
      fresh.reverse();                          /* старые → новые, как приходили */
      fresh.slice(0,3).forEach(banner);
    }).catch(function(){});
  }

  /* sync-тик оболочки: r.ntf = {n: непрочитанных, m: max id непрочитанного} */
  function sync(fp){
    if(!ready||!fp) return;
    badge(fp.n);
    var m=parseInt(fp.m,10)||0;
    if(seenMax>=0 && m>seenMax && !document.hidden) fetchNew(seenMax);
    if(m>seenMax) seenMax=m;
  }

  /* =================== ЦЕНТР (шторка) =================== */
  function rowHtml(it){
    var c=srcColor(it.src);
    return '<button type="button" class="ntf-row'+(it.read?'':' unread')+'"'
      +(c?' style="--c:'+esc(c)+'"':'')+' data-ntf="'+it.id+'">'
      +(it.read?'':'<span class="ntf-dot"></span>')
      +'<span class="ntf-ic">'+iconHtml(it.src)+'</span>'
      +'<span class="ntf-tx"><span class="msg">'+esc(text(it))+'</span>'
      +'<span class="when">'+esc(appName(it.src))+' · '+esc(when(it.createdAt))+'</span></span>'
      +'</button>';
  }
  function openCenter(){
    if(!ready||!shell().sheet) return;
    var node=document.createElement("div");
    node.innerHTML='<h2>'+esc(I.t("ntf.title"))+'</h2>'
      +'<button class="btn btn-cancel ntf-readall" id="ntfReadAll" style="display:none">'+esc(I.t("ntf.readAll"))+'</button>'
      +'<div class="ntf-list" id="ntfList"><p class="set-note" style="text-align:center">…</p></div>'
      +'<div class="ntf-push" id="ntfPushRow" style="display:none"><span class="lbl" id="ntfPushLbl"></span>'
      +'<button class="toggle" id="ntfPushTgl" type="button" aria-label="push"></button></div>'
      +'<div class="sheet-actions"><button class="btn btn-cancel" id="ntfClose" style="flex:1">'+esc(I.t("common.close"))+'</button></div>';
    var ctl=shell().sheet(node);
    node.querySelector("#ntfClose").onclick=ctl.close;
    var listEl=node.querySelector("#ntfList"), allBtn=node.querySelector("#ntfReadAll");
    var items=[];
    function paint(){
      listEl.innerHTML=items.length
        ? items.map(rowHtml).join("")
        : '<p class="ntf-empty">'+esc(I.t("ntf.empty"))+'</p>';
      allBtn.style.display=items.some(function(it){ return !it.read; })?"":"none";
    }
    api({op:"list"}).then(function(r){
      items=(r&&r.items)||[];
      if(items.length) seenMax=Math.max(seenMax, items[0].id);
      paint();
    }).catch(function(){ listEl.innerHTML='<p class="ntf-empty">'+esc(I.t("common.failed"))+'</p>'; });
    listEl.addEventListener("click",function(e){
      var b=e.target.closest("[data-ntf]"); if(!b) return;
      var id=parseInt(b.getAttribute("data-ntf"),10), it=null;
      items.forEach(function(x){ if(x.id===id) it=x; });
      if(!it) return;
      if(!it.read){ it.read=true; markRead(id); }
      if(it.link && navigate(it.link)) ctl.close(); else paint();
    });
    allBtn.onclick=function(){
      api({op:"read_all"}).then(function(){
        items.forEach(function(x){ x.read=true; });
        badge(0); paint();
        if(shell().toast) shell().toast(I.t("ntf.allRead"));
      }).catch(function(){ if(shell().toast) shell().toast(I.t("common.failed")); });
    };
    wirePush(node);
  }

  /* =================== WEB PUSH (PWA) =================== */
  function b64uToU8(s){
    s=String(s).replace(/-/g,"+").replace(/_/g,"/");
    var pad=s.length%4; if(pad) s+="====".slice(pad);
    var raw=atob(s), a=new Uint8Array(raw.length);
    for(var i=0;i<raw.length;i++) a[i]=raw.charCodeAt(i);
    return a;
  }
  function wirePush(node){
    var row=node.querySelector("#ntfPushRow"), lbl=node.querySelector("#ntfPushLbl"), tgl=node.querySelector("#ntfPushTgl");
    if(!row) return;
    if(!("serviceWorker" in navigator)||!window.PushManager||!window.Notification){
      /* iOS Safari во вкладке пушей не умеет — подсказываем поставить на «Домой» */
      if(IOS&&!STANDALONE){ row.style.display=""; row.classList.add("hint"); lbl.textContent=I.t("ntf.push.ios"); tgl.style.display="none"; }
      return;
    }
    RT.API.post("push.php",{op:"key"}).then(function(r){
      if(!(r&&r.ok&&r.key)) return;             /* сервер без VAPID-ключей — пушей нет */
      var KEY=r.key, sub=null, mine=false, busy=false;
      row.style.display="";
      function paint(){ lbl.textContent=I.t("ntf.push.row"); tgl.classList.toggle("on", mine); }
      paint();
      navigator.serviceWorker.getRegistration().then(function(reg){
        return reg?reg.pushManager.getSubscription():null;
      }).then(function(s){
        sub=s;
        if(!s) return;
        return RT.API.post("push.php",{op:"status",endpoint:s.endpoint}).then(function(st){
          mine=!!(st&&st.mine); paint();
        });
      }).catch(function(){});
      function enable(){
        if(Notification.permission==="denied"){ shell().toast(I.t("ntf.push.denied")); return; }
        busy=true;
        Notification.requestPermission().then(function(p){
          if(p!=="granted"){ busy=false; shell().toast(I.t("ntf.push.denied")); return; }
          navigator.serviceWorker.register("sw.js?lang="+I.get()+"&v="+encodeURIComponent(window.RT_VER||"1"))
            .then(function(){ return navigator.serviceWorker.ready; })
            .then(function(reg){
              return reg.pushManager.getSubscription().then(function(s){
                return s||reg.pushManager.subscribe({userVisibleOnly:true, applicationServerKey:b64uToU8(KEY)});
              });
            })
            .then(function(s){
              sub=s; var j=s.toJSON?s.toJSON():{};
              return RT.API.post("push.php",{op:"subscribe",endpoint:s.endpoint,keys:(j&&j.keys)||{},lang:I.get()});
            })
            .then(function(){ busy=false; mine=true; paint(); shell().toast(I.t("ntf.push.onToast")); })
            .catch(function(){ busy=false; shell().toast(I.t("ntf.push.fail")); });
        });
      }
      function disable(){
        busy=true;
        var p=sub?RT.API.post("push.php",{op:"unsubscribe",endpoint:sub.endpoint}).catch(function(){}):Promise.resolve();
        p.then(function(){
          var u=sub?sub.unsubscribe():Promise.resolve();
          Promise.resolve(u).catch(function(){}).then(function(){
            busy=false; sub=null; mine=false; paint(); shell().toast(I.t("ntf.push.offToast"));
          });
        });
      }
      tgl.onclick=function(){ if(busy) return; if(mine) disable(); else enable(); };
    }).catch(function(){});
  }

  /* =================== БЕЙДЖИ АККАУНТОВ УСТРОЙСТВА (op peek) =================== */
  function decorateAccounts(root){
    try{
      if(RT.isDemo&&RT.isDemo()) return;
      if(!root) return;
      var rows=root.querySelectorAll("[data-devrow]"); if(!rows.length) return;
      var accs=[]; try{ accs=JSON.parse(localStorage.getItem("rt_accounts")||"[]"); }catch(e){ accs=[]; }
      var tokById={}; accs.forEach(function(a){ if(a&&a.id!=null&&a.tok) tokById[a.id]=a.tok; });
      var toks=[];
      Array.prototype.forEach.call(rows,function(r){
        var id=parseInt(r.getAttribute("data-devrow"),10);
        if(tokById[id]) toks.push(tokById[id]);
      });
      if(!toks.length) return;
      api({op:"peek",tokens:toks}).then(function(res){
        if(!(res&&res.ok&&res.accounts)) return;
        var byUser={}; res.accounts.forEach(function(a){ byUser[a.user]=a.unread; });
        Array.prototype.forEach.call(rows,function(r){
          if(!r.parentNode) return;             /* список могли перерисовать */
          var id=parseInt(r.getAttribute("data-devrow"),10), n=byUser[id];
          var old=r.querySelector(".ntf-acct"); if(old) old.parentNode.removeChild(old);
          if(!n) return;
          var host=r.querySelector(".acct-go")||r;
          var sp=document.createElement("span"); sp.className="ntf-acct";
          sp.textContent=n>9?"9+":String(n);
          host.appendChild(sp);
        });
      }).catch(function(){});
    }catch(e){}
  }

  /* =================== BOOT =================== */
  function ensureDom(){
    if(bellEl) return;
    bellEl=document.createElement("button");
    bellEl.type="button"; bellEl.className="ntf-bell"; bellEl.id="ntfBell";
    bellEl.setAttribute("aria-label", I.t("ntf.open"));
    bellEl.innerHTML=BELL_SVG+'<span class="ntf-badge"></span>';
    badgeEl=bellEl.querySelector(".ntf-badge");
    bellEl.addEventListener("click",openCenter);
    document.body.appendChild(bellEl);
    bannersEl=document.createElement("div");
    bannersEl.className="ntf-banners"; bannersEl.id="ntfBanners";
    document.body.appendChild(bannersEl);
  }
  /* зовёт shell после успешного входа (в демо не зовётся — колокольчика нет) */
  function boot(){
    if(ready||(RT.isDemo&&RT.isDemo())) return;
    ensureDom();
    ready=true;
    api({op:"list"}).then(function(r){
      var items=(r&&r.items)||[];
      seenMax=items.length?items[0].id:0;
      badge(items.filter(function(x){ return !x.read; }).length);
    }).catch(function(){ seenMax=0; });
  }
  /* модуль спрятал HUD (полноэкранная сцена) — прячем и колокольчик (класс на body ставит shell) */
  function hide(b){ if(bellEl) bellEl.classList.toggle("ntf-hide", !!b); }

  RT.Notify={ boot:boot, sync:sync, open:openCenter, navigate:navigate,
              decorateAccounts:decorateAccounts, hide:hide };
})(window.RobTop);
