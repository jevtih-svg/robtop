/* RobTop — модуль «Друзья». Ребёнок описывает своих друзей карточками: выбирает категорию
   тремя смайликами (добрый / так себе / злой), ставит оценку 1–5 звёзд «какой это друг»,
   пишет «как мы подружились» и при желании добавляет что-то ещё. Карточки лежат в двух
   разделах — «Открытые» и «Секретные» (друга можно сделать секретным и убрать с глаз).
   v1: личное, без кода и без чтения семьёй (это добавится отдельной версией); очков нет.
   Данные — generic-стор (sdk.data, коллекция friends), статус записи open|secret. */
(function(){
  "use strict";

  /* =================== ЛОКАЛИЗАЦИЯ (en/ru/lv) =================== */
  var MESSAGES={
    en:{ friends:{
      subtitle:"Tell about your friends",
      hudLeft:"My <b>friends</b>", hudCLbl:"friends", hudRLbl:"best (5★)",
      tabOpen:"Open", tabSecret:"Secret",
      emptyOpen:"No friends here yet. Tap “+ Add a friend”.",
      emptySecret:"No secret friends yet. Mark a friend secret to hide them here.",
      addFriend:"Add a friend", editTitle:"Edit friend", newTitle:"New friend",
      catLbl:"What is this friend like?",
      names:{ kind:"Kind", soso:"So-so", angry:"Grumpy" },
      nameLbl:"Friend's name", namePh:"e.g. Max",
      starsLbl:"How great a friend?",
      storyLbl:"How did you become friends?", storyPh:"e.g. We met at the playground",
      extraLbl:"Anything else (optional)", extraPh:"e.g. Loves dinosaurs",
      secretToggle:"Secret friend",
      needName:"Type a name first", needCat:"Pick what they're like",
      savedNew:"Friend added: {name}", savedEdit:"Friend saved: {name}", saveFailed:"Couldn't save",
      loadFailed:"Couldn't load friends",
      edit:"Edit", del:"Delete", toSecret:"Make secret", toOpen:"Make open",
      deleted:"Friend deleted", movedSecret:"Moved to Secret", movedOpen:"Moved to Open",
      noText:"(nothing yet)",
      statsTitle:"My friends", statsTotal:"Friends total", statsBest:"Best friends (5★)",
      parentNote:"Only the child fills in friends. You're viewing.",
      aria:{ stats:"Stats", secret:"Secret" }
    }},
    ru:{ friends:{
      subtitle:"Расскажи о своих друзьях",
      hudLeft:"Мои <b>друзья</b>", hudCLbl:"друзей", hudRLbl:"лучших (5★)",
      tabOpen:"Открытые", tabSecret:"Секретные",
      emptyOpen:"Здесь пока нет друзей. Нажми «+ Добавить друга».",
      emptySecret:"Секретных друзей пока нет. Сделай друга секретным, чтобы спрятать его сюда.",
      addFriend:"Добавить друга", editTitle:"Изменить друга", newTitle:"Новый друг",
      catLbl:"Какой это друг?",
      names:{ kind:"Добрый", soso:"Так себе", angry:"Злой" },
      nameLbl:"Имя друга", namePh:"например: Макс",
      starsLbl:"Насколько классный друг?",
      storyLbl:"Как вы подружились?", storyPh:"например: познакомились на площадке",
      extraLbl:"Ещё что-нибудь (по желанию)", extraPh:"например: обожает динозавров",
      secretToggle:"Секретный друг",
      needName:"Сначала введи имя", needCat:"Выбери, какой он",
      savedNew:"Друг добавлен: {name}", savedEdit:"Друг сохранён: {name}", saveFailed:"Не удалось сохранить",
      loadFailed:"Не удалось загрузить друзей",
      edit:"Изменить", del:"Удалить", toSecret:"В секретные", toOpen:"В открытые",
      deleted:"Друг удалён", movedSecret:"Перенесён в «Секретные»", movedOpen:"Перенесён в «Открытые»",
      noText:"(пока пусто)",
      statsTitle:"Мои друзья", statsTotal:"Всего друзей", statsBest:"Лучших друзей (5★)",
      parentNote:"Друзей заполняет ребёнок. Это просмотр.",
      aria:{ stats:"Статистика", secret:"Секрет" }
    }},
    lv:{ friends:{
      subtitle:"Pastāsti par saviem draugiem",
      hudLeft:"Mani <b>draugi</b>", hudCLbl:"draugi", hudRLbl:"labākie (5★)",
      tabOpen:"Atvērtie", tabSecret:"Slepenie",
      emptyOpen:"Šeit vēl nav draugu. Pieskaries “+ Pievienot draugu”.",
      emptySecret:"Slepeno draugu vēl nav. Padari draugu par slepenu, lai paslēptu šeit.",
      addFriend:"Pievienot draugu", editTitle:"Mainīt draugu", newTitle:"Jauns draugs",
      catLbl:"Kāds ir šis draugs?",
      names:{ kind:"Laipns", soso:"Tā un tā", angry:"Dusmīgs" },
      nameLbl:"Drauga vārds", namePh:"piemēram: Makss",
      starsLbl:"Cik lielisks draugs?",
      storyLbl:"Kā jūs sadraudzējāties?", storyPh:"piemēram: iepazināmies laukumā",
      extraLbl:"Vēl kaut kas (pēc izvēles)", extraPh:"piemēram: mīl dinozaurus",
      secretToggle:"Slepens draugs",
      needName:"Vispirms ievadi vārdu", needCat:"Izvēlies, kāds viņš ir",
      savedNew:"Draugs pievienots: {name}", savedEdit:"Draugs saglabāts: {name}", saveFailed:"Neizdevās saglabāt",
      loadFailed:"Neizdevās ielādēt draugus",
      edit:"Mainīt", del:"Dzēst", toSecret:"Uz slepeniem", toOpen:"Uz atvērtiem",
      deleted:"Draugs izdzēsts", movedSecret:"Pārvietots uz “Slepenie”", movedOpen:"Pārvietots uz “Atvērtie”",
      noText:"(pagaidām tukšs)",
      statsTitle:"Mani draugi", statsTotal:"Draugu kopā", statsBest:"Labākie draugi (5★)",
      parentNote:"Draugus aizpilda bērns. Šis ir skats.",
      aria:{ stats:"Statistika", secret:"Slepens" }
    }}
  };

  /* =================== ИКОНКИ =================== */
  /* назад/статистика — из общего реестра оболочки (sdk.ui.frame принимает имя иконки), SVG не дублируем */
  var FR_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8.5" r="3.1"/><path d="M3.6 19.2a5.4 5.4 0 0 1 10.8 0"/><path d="M15.5 5.6a3 3 0 0 1 .2 5.6"/><path d="M16.3 13.3a5.4 5.4 0 0 1 4.1 5.9"/></svg>';
  var LOCK_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
  var STAR_F='<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l2.7 5.7 6.3.8-4.6 4.4 1.2 6.2L12 17.8 6.4 20.1l1.2-6.2L3 9.5l6.3-.8z"/></svg>';
  var STAR_O='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 3l2.7 5.7 6.3.8-4.6 4.4 1.2 6.2L12 17.8 6.4 20.1l1.2-6.2L3 9.5l6.3-.8z"/></svg>';

  /* три смайлика-категории: добрый (мята), так себе (золото), злой (красный) — цвет в CSS f-<cat> */
  function faceSvg(extra){
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">'
      +'<circle cx="12" cy="12" r="9"/>'
      +'<circle cx="9" cy="10.4" r="1.05" fill="currentColor" stroke="none"/>'
      +'<circle cx="15" cy="10.4" r="1.05" fill="currentColor" stroke="none"/>'
      +extra+'</svg>';
  }
  var FACE={
    kind:  faceSvg('<path d="M8.4 14.4a4.2 4.2 0 0 0 7.2 0" stroke-linecap="round"/>'),
    soso:  faceSvg('<path d="M8.8 15h6.4" stroke-linecap="round"/>'),
    angry: faceSvg('<path d="M8.4 16.6a4.2 4.2 0 0 1 7.2 0" stroke-linecap="round"/><path d="M7.7 8.6l2.4 1.1M16.3 8.6l-2.4 1.1" stroke-linecap="round"/>')
  };
  var CATS=["kind","soso","angry"];

  /* =================== СОСТОЯНИЕ =================== */
  var sdk=null, root=null, E={}, items=[], currentTab="open", loaded=false, failed=false;

  function esc(s){ return RobTop.util.esc(s); }
  function t(k,p){ return sdk.t(k,p); }

  /* ----- данные ----- */
  function dataOf(it){ return (it&&it.data)||{}; }
  function catOf(it){ var c=dataOf(it).cat; return CATS.indexOf(c)>=0?c:"kind"; }
  function statusOf(it){ return it&&it.status==="secret"?"secret":"open"; }
  function starsOf(it){ var s=parseInt(dataOf(it).stars,10)||0; return s<0?0:(s>5?5:s); }
  function byTab(tab){ return items.filter(function(it){ return statusOf(it)===tab; }); }
  function findItem(id){ for(var i=0;i<items.length;i++){ if(String(items[i].id)===String(id)) return items[i]; } return null; }
  function sortItems(){ items.sort(function(a,b){ return (b.createdAt||0)-(a.createdAt||0); }); }

  function load(){
    sdk.data.list("friends").then(function(list){
      if(!root) return; // размонтирован, пока грузилось
      items=(list||[]); loaded=true; failed=false;
      sortItems(); render(); hud();
    }).catch(function(){ if(!root) return; items=[]; loaded=true; failed=true; render(); hud(); });
  }

  function counts(){ var c={kind:0,soso:0,angry:0,best:0}; items.forEach(function(it){ c[catOf(it)]++; if(starsOf(it)===5) c.best++; }); return c; }
  function hud(){ var c=counts(); sdk.ui.hud({ left:t("hudLeft"), cNum:items.length, cLbl:t("hudCLbl"), rNum:c.best, rLbl:t("hudRLbl") }); }

  /* ----- мелкие рендеры ----- */
  function starsRow(n, extra){
    var h='<div class="fr-stars ro '+(extra||"")+'">';
    for(var k=1;k<=5;k++){ h+='<span class="fr-star'+(k<=n?" on":"")+'">'+(k<=n?STAR_F:STAR_O)+'</span>'; }
    return h+'</div>';
  }
  function snippetOf(it){ var d=dataOf(it); return d.story||d.extra||t("noText"); }

  /* =================== ГЛАВНЫЙ ЭКРАН (вкладки + список) =================== */
  function render(){
    if(!root||!E.tabs||!E.list) return;
    var c={open:byTab("open").length, secret:byTab("secret").length};
    var ob=E.tabs.querySelector('[data-count="open"]'), sb=E.tabs.querySelector('[data-count="secret"]');
    if(ob) ob.textContent=c.open; if(sb) sb.textContent=c.secret;
    Array.prototype.forEach.call(E.tabs.querySelectorAll(".fr-tab"),function(tb){
      tb.classList.toggle("active",tb.getAttribute("data-tab")===currentTab);
    });
    var list=byTab(currentTab);
    if(!list.length){
      /* пока первый запрос в пути — спиннер, а не ложное «здесь пусто» */
      if(!loaded){ E.list.innerHTML='<div class="rt-loading"><div class="rt-spin"></div></div>'; return; }
      E.list.innerHTML='<div class="fr-empty">'+esc(failed?t("loadFailed"):(currentTab==="secret"?t("emptySecret"):t("emptyOpen")))+'</div>';
      return;
    }
    E.list.innerHTML=list.map(function(it){
      var d=dataOf(it), cat=catOf(it);
      return '<article class="fr-card" data-id="'+esc(it.id)+'">'
        +'<div class="fr-face-thumb f-'+cat+'">'+FACE[cat]+(statusOf(it)==="secret"?'<span class="fr-lock">'+LOCK_IC+'</span>':"")+'</div>'
        +'<div class="fr-m"><div class="fr-name">'+esc(d.name||"")+'</div>'
        +starsRow(starsOf(it),"mini")
        +'<div class="fr-snip">'+esc(snippetOf(it))+'</div></div></article>';
    }).join("");
  }
  function setTab(tab){ currentTab=tab; render(); }

  /* =================== ШТОРКА: КАРТОЧКА ДРУГА =================== */
  function openDetail(id){
    var it=findItem(id); if(!it) return;
    var d=dataOf(it), cat=catOf(it), canEdit=sdk.can("edit"), secret=statusOf(it)==="secret";
    var node=document.createElement("div"); node.className="fr-detail";
    var actions=canEdit
      ? '<div class="fr-dact"><button class="btn" data-act="edit">'+esc(t("edit"))+'</button>'
        +'<button class="btn" data-act="sec">'+(secret?(LOCK_IC+" "+esc(t("toOpen"))):(LOCK_IC+" "+esc(t("toSecret"))))+'</button></div>'
        +'<div class="fr-dact"><button class="btn btn-cancel" data-act="del">'+esc(t("del"))+'</button>'
        +'<button class="btn btn-primary" data-close>'+esc(t("common.close"))+'</button></div>'
      : '<div class="sheet-actions" style="margin-top:14px"><button class="btn btn-cancel" data-close style="flex:1">'+esc(t("common.close"))+'</button></div>';
    node.innerHTML='<div class="fr-faces solo"><span class="fr-face f-'+cat+' on">'+FACE[cat]+'</span></div>'
      +'<h2 class="fr-dname">'+esc(d.name||"")+(secret?' <span class="fr-dlock">'+LOCK_IC+'</span>':"")+'</h2>'
      +'<div class="fr-dcat">'+esc(t("names."+cat))+'</div>'
      +starsRow(starsOf(it))
      +(d.story?'<span class="fr-lbl">'+esc(t("storyLbl"))+'</span><div class="fr-text">'+esc(d.story)+'</div>':"")
      +(d.extra?'<span class="fr-lbl">'+esc(t("extraLbl"))+'</span><div class="fr-text">'+esc(d.extra)+'</div>':"")
      +((!d.story&&!d.extra)?'<div class="fr-text" style="text-align:center">'+esc(t("noText"))+'</div>':"")
      +actions;
    var sh=sdk.ui.sheet(node);
    node.querySelector("[data-close]").addEventListener("click",sh.close);
    if(canEdit){
      node.querySelector('[data-act="edit"]').addEventListener("click",function(){ sh.close(); openForm(it); });
      node.querySelector('[data-act="sec"]').addEventListener("click",function(){ sh.close(); toggleSecret(it); });
      node.querySelector('[data-act="del"]').addEventListener("click",function(){ sh.close(); removeFriend(it); });
    }
  }

  /* =================== ШТОРКА: ФОРМА (новый / правка) =================== */
  function facesPick(cat){
    var h='<div class="fr-faces pick">';
    CATS.forEach(function(key){
      h+='<button type="button" class="fr-face f-'+key+(cat===key?" on":"")+'" data-cat="'+key+'" aria-label="'+esc(t("names."+key))+'">'
        +FACE[key]+'<span class="fr-face-lbl">'+esc(t("names."+key))+'</span></button>';
    });
    return h+'</div>';
  }
  function starsPick(n){
    var h='<div class="fr-stars pick">';
    for(var k=1;k<=5;k++){ h+='<button type="button" class="fr-star'+(k<=n?" on":"")+'" data-star="'+k+'" aria-label="'+k+'">'+(k<=n?STAR_F:STAR_O)+'</button>'; }
    return h+'</div>';
  }
  function openForm(existing){
    if(!sdk.can("edit")) return;
    var d=existing?dataOf(existing):{};
    var st={ cat:existing?catOf(existing):null, stars:existing?starsOf(existing):0,
             secret:existing?(statusOf(existing)==="secret"):(currentTab==="secret") };
    var node=document.createElement("div"); node.className="fr-form";
    node.innerHTML='<h2>'+esc(existing?t("editTitle"):t("newTitle"))+'</h2>'
      +'<span class="fr-lbl">'+esc(t("catLbl"))+'</span>'+facesPick(st.cat)
      +'<label class="fr-lbl" for="frName">'+esc(t("nameLbl"))+'</label>'
      +'<input class="fr-in" id="frName" type="text" maxlength="60" placeholder="'+esc(t("namePh"))+'" value="'+esc(d.name||"")+'">'
      +'<span class="fr-lbl">'+esc(t("starsLbl"))+'</span>'+starsPick(st.stars)
      +'<label class="fr-lbl" for="frStory">'+esc(t("storyLbl"))+'</label>'
      +'<textarea class="fr-ta" id="frStory" maxlength="400" placeholder="'+esc(t("storyPh"))+'">'+esc(d.story||"")+'</textarea>'
      +'<label class="fr-lbl" for="frExtra">'+esc(t("extraLbl"))+'</label>'
      +'<textarea class="fr-ta" id="frExtra" maxlength="400" placeholder="'+esc(t("extraPh"))+'">'+esc(d.extra||"")+'</textarea>'
      +'<button type="button" class="fr-secret'+(st.secret?" on":"")+'" id="frSecret" aria-pressed="'+(st.secret?"true":"false")+'">'
        +'<span class="fr-secret-ic">'+LOCK_IC+'</span><span>'+esc(t("secretToggle"))+'</span><span class="fr-secret-dot"></span></button>'
      +'<div class="sheet-actions" style="margin-top:14px"><button class="btn btn-cancel" data-cancel>'+esc(t("common.cancel"))+'</button>'
      +'<button class="btn btn-primary" data-save>'+esc(t("common.save"))+'</button></div>';
    var sh=sdk.ui.sheet(node);
    // выбор категории
    node.querySelectorAll("[data-cat]").forEach(function(b){
      b.addEventListener("click",function(){ st.cat=b.getAttribute("data-cat");
        node.querySelectorAll("[data-cat]").forEach(function(x){ x.classList.toggle("on",x===b); });
        sdk.ui.haptics(6);
      });
    });
    // выбор звёзд
    node.querySelectorAll("[data-star]").forEach(function(b){
      b.addEventListener("click",function(){ st.stars=parseInt(b.getAttribute("data-star"),10)||0;
        node.querySelectorAll("[data-star]").forEach(function(x){ var on=(parseInt(x.getAttribute("data-star"),10)||0)<=st.stars;
          x.classList.toggle("on",on); x.innerHTML=on?STAR_F:STAR_O; });
        sdk.ui.haptics(6);
      });
    });
    // тумблер «секретный»
    node.querySelector("#frSecret").addEventListener("click",function(){ st.secret=!st.secret;
      this.classList.toggle("on",st.secret); this.setAttribute("aria-pressed",st.secret?"true":"false"); sdk.ui.haptics(6);
    });
    node.querySelector("[data-cancel]").addEventListener("click",sh.close);
    node.querySelector("[data-save]").addEventListener("click",function(){ saveForm(existing, st, node, sh); });
  }

  function saveForm(existing, st, node, sh){
    if(!sdk.can("edit")) return;
    var name=(node.querySelector("#frName").value||"").trim().slice(0,60);
    if(!name){ sdk.ui.toast(t("needName")); return; }
    if(CATS.indexOf(st.cat)<0){ sdk.ui.toast(t("needCat")); return; }
    var story=(node.querySelector("#frStory").value||"").trim().slice(0,400);
    var extra=(node.querySelector("#frExtra").value||"").trim().slice(0,400);
    var fields={ name:name, cat:st.cat, stars:st.stars, story:story, extra:extra };
    var wantStatus=st.secret?"secret":"open";
    if(existing){
      sdk.data.update("friends", existing.id, fields).then(function(){
        existing.data=Object.assign({}, existing.data, fields);
        var statusChanged=statusOf(existing)!==wantStatus;
        var after=function(){ if(!root) return; sh.close(); afterSave(name, st, false); };
        if(statusChanged){ existing.status=wantStatus; sdk.data.move("friends", existing.id, wantStatus).then(after, after); }
        else after();
      }).catch(function(){ sdk.ui.toast(t("saveFailed")); });
    }else{
      var payload=Object.assign({status:wantStatus}, fields);
      sdk.data.create("friends", payload).then(function(item){
        if(!root) return;
        if(item){ items.push(item); } else { load(); }
        sh.close(); afterSave(name, st, true);
      }).catch(function(){ sdk.ui.toast(t("saveFailed")); });
    }
  }
  function afterSave(name, st, isNew){
    currentTab=st.secret?"secret":"open";
    sdk.events.track("friend_added",{ cat:st.cat, stars:st.stars, secret:!!st.secret, edited:!isNew });
    sdk.ui.haptics(10);
    if(st.stars===5){ sdk.ui.confetti(); sdk.ui.chime(); }
    sdk.ui.toast(t(isNew?"savedNew":"savedEdit",{name:name}));
    sortItems(); render(); hud();
  }

  /* ----- секрет / открыто ----- */
  function toggleSecret(it){
    if(!sdk.can("edit")) return;
    var to=statusOf(it)==="secret"?"open":"secret";
    it.status=to;
    sdk.data.move("friends", it.id, to).catch(function(){});
    currentTab=to;
    sdk.ui.toast(to==="secret"?t("movedSecret"):t("movedOpen")); sdk.ui.haptics(8);
    sortItems(); render(); hud();
  }

  /* ----- удаление с отменой (мягкое) ----- */
  function removeFriend(it){
    if(!sdk.can("edit")) return;
    var idx=items.indexOf(it);
    items=items.filter(function(x){ return x!==it; });
    render(); hud();
    sdk.data.remove("friends", it.id).catch(function(){});
    sdk.ui.haptics(12);
    sdk.ui.toast(t("deleted"), t("common.undo"), function(){
      sdk.data.restore("friends", it.id).catch(function(){});
      if(idx<0||idx>items.length) items.push(it); else items.splice(idx,0,it);
      sortItems(); render(); hud();
    });
  }

  /* =================== ШТОРКА: СТАТИСТИКА =================== */
  function openStats(){
    sdk.events.track("viewed_stats",{});
    var c=counts(), rows="";
    CATS.forEach(function(key){
      rows+='<div class="fr-stat-row"><span class="fr-mini f-'+key+'">'+FACE[key]+'</span>'
        +'<div class="nm">'+esc(t("names."+key))+'</div><div class="n">'+c[key]+'</div></div>';
    });
    var node=document.createElement("div");
    node.innerHTML='<h2>'+esc(t("statsTitle"))+'</h2><div class="fr-stat-rows">'+rows+'</div>'
      +'<div class="fr-stat-sum"><span>'+esc(t("statsTotal"))+'</span><b>'+items.length+'</b></div>'
      +'<div class="fr-stat-sum"><span>'+esc(t("statsBest"))+'</span><b>'+c.best+'</b></div>'
      +'<div class="sheet-actions" style="margin-top:14px"><button class="btn btn-cancel" data-close style="flex:1">'+esc(t("common.close"))+'</button></div>';
    var sh=sdk.ui.sheet(node);
    node.querySelector("[data-close]").addEventListener("click",sh.close);
  }

  /* =================== mount / unmount =================== */
  function mount(rootEl, theSdk){
    sdk=theSdk; root=rootEl; items=[]; currentTab="open"; loaded=false; failed=false;
    var title=sdk.i18n.t("tile.friends"), canEdit=sdk.can("edit");
    var body=sdk.ui.frame({
      titleHtml:'<div class="fr-title"><span class="sic">'+FR_IC+'</span> '+esc(title)+'</div><div class="fr-sub">'+esc(t("subtitle"))+'</div>',
      backLabel:t("common.back"),
      actions:[{ icon:"stats", id:"frStats", label:t("aria.stats"), onClick:openStats }]
    }).body;
    body.innerHTML='<div class="fr">'
      +(canEdit?"":'<div class="fr-pnote">'+esc(t("parentNote"))+'</div>')
      +'<div class="fr-tabs" id="frTabs">'
        +'<button class="fr-tab active" data-tab="open">'+esc(t("tabOpen"))+' <span class="fr-tc" data-count="open">0</span></button>'
        +'<button class="fr-tab" data-tab="secret">'+LOCK_IC+' '+esc(t("tabSecret"))+' <span class="fr-tc" data-count="secret">0</span></button>'
      +'</div>'
      +'<div class="fr-list" id="frList"></div>'
    +'</div>';
    E.tabs=root.querySelector("#frTabs"); E.list=root.querySelector("#frList");
    sdk.on(root,"click",function(e){
      var tab=e.target.closest("[data-tab]");
      if(tab){ setTab(tab.getAttribute("data-tab")); return; }
      var card=e.target.closest(".fr-card");
      if(card){ openDetail(card.getAttribute("data-id")); return; }
    });
    if(canEdit) sdk.ui.fab(t("addFriend"), function(){ openForm(null); });
    render(); hud(); load();
  }
  function unmount(){ E={}; items=[]; root=null; currentTab="open"; loaded=false; failed=false; }

  /* живое обновление (sync v.52): подтянуть чужие/другие правки без выхода из модуля */
  function refresh(){ if(!root) return false; load(); return true; }

  RobTop.register({ id:"friends", mount:mount, unmount:unmount, messages:MESSAGES, refresh:refresh });
})();
