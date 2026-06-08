/* RobTop — модуль «Виш-лист» (родной, серверный: своя таблица wishlist_items + api.php).
   Поведение 1:1 с прежним прототипом. Сервер — через sdk.api (action.php → диспетчер → modules/wishlist/api.php),
   офлайн/демо — localStorage. UI монтируется в root; шторки добавляются в body и снимаются при unmount.
   Тексты — через sdk.t/sdk.plural/sdk.formatDate (язык en/ru/lv); словарь — в MESSAGES ниже. */
(function(){
  "use strict";

  /* =================== ЛОКАЛИЗАЦИЯ (en/ru/lv) =================== */
  var MESSAGES={
    en:{ wishlist:{
      title:"Wishlist", subtitle:"My wish list",
      hud:{ cLbl:"wishes", rLbl:"bought" },
      tab:{ want:"Want", thinking:"Thinking", bought:"Bought" },
      empty:{ want:{h:"Empty so far",p:"Tap “Want!” below and add your first wish."},
        thinking:{h:"“Thinking” section",p:"Wishes you're unsure about go here. Tap “Changed mind” on a card."},
        bought:{h:"“Bought” section",p:"Bought wishes go here. Tap “Bought” on a card."} },
      hist:{ created:"Added", changed_mind:"Changed mind", purchased:"Bought", back_to_want:"Want again", edited:"Edited" },
      btn:{ bought:"Bought", thinking:"Changed mind", want:"Want!", backWant:"Want again" },
      chip:{ changedMind:"changed ×{n}", purchased:"bought ×{n}", days:{one:"in {n} day", other:"in {n} days"} },
      aria:{ fav:"Really want", stats:"Stats" },
      badge:{ bought:"Bought" }, link:{ open:"Open link" },
      detail:{ changedMind:"times changed mind", purchased:"times bought", returned:"times returned", edited:"times edited",
        note:"Why I want it", favOn:"Really want", favOff:"Mark", edit:"Edit", historyTitle:"Wish history" },
      purchase:{ q:"Really bought?", qAgain:"Confirm the purchase again", no:"Not yet", yes:"Yes, bought it! 🎉", yesAgain:"Sure? Tap again ✅" },
      stats:{ title:"Wish stats", total:"wishes total", boughtNow:"fulfilled now", purchases:"purchases total",
        changedMind:"times changed mind", favorites:"★ really want", avgDays:"avg days to buy",
        fickle:"Most fickle wish: <b>{name}</b> (changed ×{n})" },
      form:{ newWish:"New wish", editWish:"Edit wish", addPhoto:"Add photo", replacePhoto:"Replace photo",
        titleLabel:"Title", titlePh:"e.g. LEGO set", noteLabel:"Why do you want it?", optional:"(optional)",
        notePh:"e.g. I'll build robots", linkLabel:"Link" },
      toast:{ saved:"Saved", needTitle:"Enter a wish title", added:"Wish added! 🍒", addFailed:"Couldn't add",
        addFailedOffline:"Couldn't add (offline)", movedThinking:"Moved to “Thinking”", movedWant:"Back to “Want”!",
        deleted:"Wish deleted", congrats:"Congrats! Wish fulfilled 🎉", photoFailed:"Couldn't upload photo",
        photoFailedOffline:"Couldn't upload photo (offline)", noServer:"No server connection — change not saved",
        demoMode:"Demo mode: server unavailable" },
      seed:{ lego:{title:"LEGO Technic set",note:"I'll build robots and cars"}, scooter:{title:"Stunt scooter"},
        book:{title:"Dinosaur book"}, headphones:{title:"Wireless headphones",note:"Listen to music outside"}, ball:{title:"Football"} },
      share:{ aria:"Share the wishlist", ariaFriends:"Friends' wishlists",
        shTitle:"Share the wishlist", frTitle:"Friends' wishlists",
        frEmpty:"No one has shared a wishlist with you yet.",
        linkHint:"Anyone with this link can see your wishlist:",
        copy:"Copy link", copied:"Copied",
        grantTitle:"Who can see it", grantPh:"Friend's nickname", grantBtn:"Share",
        grantEmpty:"You haven't shared with anyone yet.", granted:"Now {name} can see your wishlist!",
        revoke:"Remove access", revoked:"Access removed",
        askText:"Sharing needs permission from your parent {name}. Send them a request?",
        askBtn:"Ask my parent", askSent:"Request sent to your parent 📨", askToo:"You already asked recently — wait a bit",
        noParentText:"You don't have a parent in the app yet. Invite them in Settings — sharing works only with their permission.",
        openSettings:"Open Settings", demoOnly:"Works only on the server",
        errUser:"User not found", errGrant:"Can't share with this user", loadFail:"Couldn't load" }
    }},
    ru:{ wishlist:{
      title:"Виш-лист", subtitle:"Список моих желаний",
      hud:{ cLbl:"желаний", rLbl:"куплено" },
      tab:{ want:"Хочу", thinking:"Думаю", bought:"Купил" },
      empty:{ want:{h:"Пока пусто",p:"Нажми «Хочу!» внизу и добавь своё первое желание."},
        thinking:{h:"Раздел «Думаю»",p:"Сюда попадают желания, в которых ты не уверен. Нажми «Передумал» на карточке."},
        bought:{h:"Раздел «Купил»",p:"Сюда попадают купленные желания. Отметь «Куплено» на карточке."} },
      hist:{ created:"Добавлено", changed_mind:"Передумал", purchased:"Куплено", back_to_want:"Снова хочу", edited:"Изменено" },
      btn:{ bought:"Куплено", thinking:"Передумал", want:"Хочу!", backWant:"Снова хочу" },
      chip:{ changedMind:"передумал ×{n}", purchased:"куплено ×{n}", days:{one:"за {n} день", few:"за {n} дня", many:"за {n} дней"} },
      aria:{ fav:"Очень хочу", stats:"Статистика" },
      badge:{ bought:"Куплено" }, link:{ open:"Открыть ссылку" },
      detail:{ changedMind:"раз передумал", purchased:"раз куплено", returned:"раз вернул", edited:"раз менял",
        note:"Почему хочу", favOn:"Очень хочу", favOff:"Отметить", edit:"Изменить", historyTitle:"История желания" },
      purchase:{ q:"Точно купили?", qAgain:"Подтверди покупку ещё раз", no:"Ещё нет", yes:"Да, купили! 🎉", yesAgain:"Точно? Нажми ещё раз ✅" },
      stats:{ title:"Статистика желаний", total:"всего желаний", boughtNow:"исполнено сейчас", purchases:"всего покупок",
        changedMind:"раз передумал", favorites:"★ очень хочу", avgDays:"ср. дней до покупки",
        fickle:"Самое непостоянное желание: <b>{name}</b> (передумал ×{n})" },
      form:{ newWish:"Новое желание", editWish:"Изменить желание", addPhoto:"Добавить фото", replacePhoto:"Заменить фото",
        titleLabel:"Название", titlePh:"Например: Конструктор LEGO", noteLabel:"Почему хочешь?", optional:"(необязательно)",
        notePh:"Например: буду строить роботов", linkLabel:"Ссылка" },
      toast:{ saved:"Сохранено", needTitle:"Напиши название желания", added:"Желание добавлено! 🍒", addFailed:"Не удалось добавить",
        addFailedOffline:"Не удалось добавить (нет связи)", movedThinking:"Перенесено в «Думаю»", movedWant:"Снова в «Хочу»!",
        deleted:"Желание удалено", congrats:"Поздравляю! Желание исполнилось 🎉", photoFailed:"Не удалось загрузить фото",
        photoFailedOffline:"Не удалось загрузить фото (нет связи)", noServer:"Нет связи с сервером — изменение не сохранено",
        demoMode:"Демо-режим: сервер недоступен" },
      seed:{ lego:{title:"Конструктор LEGO Технік",note:"Буду строить роботов и машины"}, scooter:{title:"Самокат трюковой"},
        book:{title:"Книга про динозавров"}, headphones:{title:"Беспроводные наушники",note:"Слушать музыку на улице"}, ball:{title:"Футбольный мяч"} },
      share:{ aria:"Поделиться виш-листом", ariaFriends:"Виш-листы друзей",
        shTitle:"Поделиться виш-листом", frTitle:"Виш-листы друзей",
        frEmpty:"Пока никто не поделился с тобой виш-листом.",
        linkHint:"Любой, у кого есть эта ссылка, увидит твой виш-лист:",
        copy:"Скопировать ссылку", copied:"Скопировано",
        grantTitle:"Кому открыт доступ", grantPh:"Никнейм друга", grantBtn:"Поделиться",
        grantEmpty:"Ты ещё ни с кем не поделился.", granted:"Теперь {name} видит твой виш-лист!",
        revoke:"Убрать доступ", revoked:"Доступ убран",
        askText:"Чтобы делиться, нужно разрешение родителя {name}. Отправить просьбу?",
        askBtn:"Попросить родителя", askSent:"Просьба отправлена родителю 📨", askToo:"Ты уже просил недавно — подожди немного",
        noParentText:"У тебя в приложении пока нет родителя. Пригласи его в Настройках — делиться можно только с его разрешения.",
        openSettings:"Открыть настройки", demoOnly:"Работает только на сервере",
        errUser:"Пользователь не найден", errGrant:"С этим пользователем поделиться нельзя", loadFail:"Не удалось загрузить" }
    }},
    lv:{ wishlist:{
      title:"Vēlmju saraksts", subtitle:"Mans vēlmju saraksts",
      hud:{ cLbl:"vēlmes", rLbl:"nopirkts" },
      tab:{ want:"Gribu", thinking:"Domāju", bought:"Nopirku" },
      empty:{ want:{h:"Pagaidām tukšs",p:"Nospied “Gribu!” lejā un pievieno savu pirmo vēlmi."},
        thinking:{h:"Sadaļa “Domāju”",p:"Šeit nonāk vēlmes, par kurām neesi pārliecināts. Nospied “Pārdomāju” uz kartītes."},
        bought:{h:"Sadaļa “Nopirku”",p:"Šeit nonāk nopirktās vēlmes. Atzīmē “Nopirkts” uz kartītes."} },
      hist:{ created:"Pievienots", changed_mind:"Pārdomāju", purchased:"Nopirkts", back_to_want:"Atkal gribu", edited:"Mainīts" },
      btn:{ bought:"Nopirkts", thinking:"Pārdomāju", want:"Gribu!", backWant:"Atkal gribu" },
      chip:{ changedMind:"pārdomāju ×{n}", purchased:"nopirkts ×{n}", days:{zero:"{n} dienās", one:"{n} dienā", other:"{n} dienās"} },
      aria:{ fav:"Ļoti gribu", stats:"Statistika" },
      badge:{ bought:"Nopirkts" }, link:{ open:"Atvērt saiti" },
      detail:{ changedMind:"reizes pārdomāju", purchased:"reizes nopirkts", returned:"reizes atgriezu", edited:"reizes mainīju",
        note:"Kāpēc gribu", favOn:"Ļoti gribu", favOff:"Atzīmēt", edit:"Mainīt", historyTitle:"Vēlmes vēsture" },
      purchase:{ q:"Tiešām nopirkts?", qAgain:"Apstiprini pirkumu vēlreiz", no:"Vēl nē", yes:"Jā, nopirku! 🎉", yesAgain:"Tiešām? Nospied vēlreiz ✅" },
      stats:{ title:"Vēlmju statistika", total:"vēlmes kopā", boughtNow:"izpildīts tagad", purchases:"pirkumi kopā",
        changedMind:"reizes pārdomāju", favorites:"★ ļoti gribu", avgDays:"vid. dienas līdz pirkumam",
        fickle:"Nepastāvīgākā vēlme: <b>{name}</b> (pārdomāju ×{n})" },
      form:{ newWish:"Jauna vēlme", editWish:"Mainīt vēlmi", addPhoto:"Pievienot foto", replacePhoto:"Nomainīt foto",
        titleLabel:"Nosaukums", titlePh:"Piem.: LEGO komplekts", noteLabel:"Kāpēc to gribi?", optional:"(neobligāti)",
        notePh:"Piem.: būvēšu robotus", linkLabel:"Saite" },
      toast:{ saved:"Saglabāts", needTitle:"Ieraksti vēlmes nosaukumu", added:"Vēlme pievienota! 🍒", addFailed:"Neizdevās pievienot",
        addFailedOffline:"Neizdevās pievienot (nav savienojuma)", movedThinking:"Pārvietots uz “Domāju”", movedWant:"Atkal “Gribu”!",
        deleted:"Vēlme izdzēsta", congrats:"Apsveicu! Vēlme piepildīta 🎉", photoFailed:"Neizdevās augšupielādēt foto",
        photoFailedOffline:"Neizdevās augšupielādēt foto (nav savienojuma)", noServer:"Nav savienojuma ar serveri — izmaiņas nesaglabātas",
        demoMode:"Demo režīms: serveris nav pieejams" },
      seed:{ lego:{title:"LEGO Technic komplekts",note:"Būvēšu robotus un mašīnas"}, scooter:{title:"Triku skrejritenis"},
        book:{title:"Grāmata par dinozauriem"}, headphones:{title:"Bezvadu austiņas",note:"Klausīties mūziku ārā"}, ball:{title:"Futbola bumba"} },
      share:{ aria:"Dalīties ar vēlmju sarakstu", ariaFriends:"Draugu vēlmju saraksti",
        shTitle:"Dalīties ar vēlmju sarakstu", frTitle:"Draugu vēlmju saraksti",
        frEmpty:"Neviens vēl nav padalījies ar tevi.",
        linkHint:"Ikviens ar šo saiti redzēs tavu vēlmju sarakstu:",
        copy:"Kopēt saiti", copied:"Nokopēts",
        grantTitle:"Kam ir piekļuve", grantPh:"Drauga segvārds", grantBtn:"Dalīties",
        grantEmpty:"Tu vēl ne ar vienu neesi padalījies.", granted:"Tagad {name} redz tavu sarakstu!",
        revoke:"Noņemt piekļuvi", revoked:"Piekļuve noņemta",
        askText:"Lai dalītos, vajadzīga vecāka {name} atļauja. Nosūtīt lūgumu?",
        askBtn:"Palūgt vecākam", askSent:"Lūgums nosūtīts vecākam 📨", askToo:"Tu nesen jau lūdzi — uzgaidi mazliet",
        noParentText:"Tev lietotnē vēl nav vecāka. Uzaicini viņu Iestatījumos — dalīties var tikai ar viņa atļauju.",
        openSettings:"Atvērt iestatījumus", demoOnly:"Darbojas tikai serverī",
        errUser:"Lietotājs nav atrasts", errGrant:"Ar šo lietotāju dalīties nevar", loadFail:"Neizdevās ielādēt" }
    }}
  };

  var IC={
    cherry:'<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="7.5" cy="17" r="3.6"/><circle cx="15.7" cy="17.6" r="3.6"/><path d="M8 14.4C9 8.4 13 5 18.4 3.8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M16.1 14.6C16.7 9.4 15 6 12 3.9" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M18.4 3.8c1-1.1 2.7-1.1 3.6.3-1.5.5-2.5.4-3.6-.3z"/></svg>',
    check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
    heart:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-8-4.6-10.3-9.2C.2 8.7 1.7 5.5 4.8 5.1 6.8 4.8 8.5 6 9.4 7.3l.6 1 .6-1C11.5 6 13.2 4.8 15.2 5.1c3.1.4 4.6 3.6 3.1 6.7C20 16.4 12 21 12 21z"/></svg>',
    think:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 19a5.5 5.5 0 1 1 4-9.9A4 4 0 1 1 18 14H9.5z"/><circle cx="6" cy="21" r="1.2" fill="currentColor" stroke="none"/></svg>',
    back2:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-1"/></svg>',
    link:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/></svg>',
    badge:'<svg viewBox="0 0 24 24" fill="none" style="stroke:var(--on-bright)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
    edit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>',
    clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    star:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l2.7 5.7 6.3.8-4.6 4.4 1.2 6.2L12 17.8 6.4 20.1l1.2-6.2L3 9.5l6.3-.8z"/></svg>',
    starO:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 3.6l2.6 5.4 6 .8-4.4 4.2 1.1 6L12 17.4 6.7 20l1.1-6L3.4 9.8l6-.8z"/></svg>'
  };
  var BACK_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
  var STATS_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 20V10M12 20V4M19 20v-7"/></svg>';
  var SHARE_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="M8.4 10.8l7.2-3.7M8.4 13.2l7.2 3.7"/></svg>';
  var FRIENDS_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8.6" r="3.1"/><path d="M3.6 19c1.1-2.8 3-4.2 5.4-4.2s4.3 1.4 5.4 4.2"/><circle cx="17.2" cy="9.6" r="2.5"/><path d="M15.8 14.9c2.1.2 3.7 1.4 4.6 3.5"/></svg>';
  var TITLE_CHERRY='<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="7.5" cy="17" r="3.6"/><circle cx="15.7" cy="17.6" r="3.6"/><path d="M8 14.4C9 8.4 13 5 18.4 3.8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M16.1 14.6C16.7 9.4 15 6 12 3.9" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M18.4 3.8c1-1.1 2.7-1.1 3.6.3-1.5.5-2.5.4-3.6-.3z"/></svg>';

  /* эмодзи событий истории (язык-нейтральны); тексты — sdk.t("hist.<type>") */
  var HL_EMOJI={ created:"➕", changed_mind:"🤔", purchased:"🎉", back_to_want:"↩️", edited:"✏️" };

  var STORAGE_KEY="robtop_wishlist_v1";
  var sdk=null, root=null, demo=true, fabCtl=null, ovWrap=null, onKey=null;
  var state={items:[],events:[]};
  var currentTab="want", editingId=null, formPhoto=null, pendingPurchaseId=null, detailId=null, undoFn=null;
  var E={};

  /* ----- helpers ----- */
  function uid(){ return RobTop.util.uid(); }
  function esc(s){ return RobTop.util.esc(s); }
  function t(k,p){ return sdk.t(k,p); }
  function normUrl(u){ u=(u||"").trim(); if(!u) return ""; if(!/^https?:\/\//i.test(u)) u="https://"+u; return u; }
  function fmtDate(ts){ return sdk.formatDate(ts); }
  function daysBetween(a,b){ return Math.max(0,Math.round((b-a)/86400000)); }
  function findItem(id){ for(var i=0;i<state.items.length;i++){ if(state.items[i].id===id) return state.items[i]; } return null; }
  function findIdx(id){ for(var i=0;i<state.items.length;i++){ if(state.items[i].id===id) return i; } return -1; }

  /* ----- storage (demo) ----- */
  function load(){ try{ var r=localStorage.getItem(STORAGE_KEY); if(r) return JSON.parse(r); }catch(e){} return null; }
  function save(){ try{ localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); }catch(e){} }
  function logEvent(type,payload){ state.events.push({id:uid(),type:type,payload:payload||{},at:Date.now()}); if(state.events.length>800) state.events.splice(0,state.events.length-800); }

  /* ----- per-item history ----- */
  function pushHistory(item,type){ if(!item.history) item.history=[]; item.history.push({type:type,at:Date.now()}); logEvent(type,{itemId:item.id,title:item.title}); }
  function itemCounts(item){
    var c={created:0,changedMind:0,purchased:0,returned:0,edited:0};
    (item.history||[]).forEach(function(h){
      if(h.type==="changed_mind")c.changedMind++; else if(h.type==="purchased")c.purchased++;
      else if(h.type==="back_to_want")c.returned++; else if(h.type==="edited")c.edited++; else if(h.type==="created")c.created++;
    });
    return c;
  }

  /* ----- seed / normalize ----- */
  function seed(){
    var now=Date.now(),d=86400000,h=3600000;
    return { version:2, items:[
      {id:uid(),title:t("seed.lego.title"),link:"https://www.lego.com",photo:null,icon:"🧱",note:t("seed.lego.note"),favorite:false,status:"want",createdAt:now-6*d,updatedAt:now-3*d,boughtAt:null,
        history:[{type:"created",at:now-6*d},{type:"changed_mind",at:now-4*d},{type:"back_to_want",at:now-3*d}]},
      {id:uid(),title:t("seed.scooter.title"),link:"",photo:null,icon:"🛴",note:"",favorite:true,status:"want",createdAt:now-1*d,updatedAt:now-1*d,boughtAt:null,
        history:[{type:"created",at:now-1*d}]},
      {id:uid(),title:t("seed.book.title"),link:"",photo:null,icon:"🦕",note:"",favorite:false,status:"want",createdAt:now-5*h,updatedAt:now-5*h,boughtAt:null,
        history:[{type:"created",at:now-5*h}]},
      {id:uid(),title:t("seed.headphones.title"),link:"",photo:null,icon:"🎧",note:t("seed.headphones.note"),favorite:false,status:"thinking",createdAt:now-3*d,updatedAt:now-12*h,boughtAt:null,
        history:[{type:"created",at:now-3*d},{type:"changed_mind",at:now-12*h}]},
      {id:uid(),title:t("seed.ball.title"),link:"",photo:null,icon:"⚽",note:"",favorite:false,status:"bought",createdAt:now-9*d,updatedAt:now-4*d,boughtAt:now-4*d,
        history:[{type:"created",at:now-9*d},{type:"purchased",at:now-6*d},{type:"back_to_want",at:now-5*d},{type:"purchased",at:now-4*d}]}
    ], events:[] };
  }
  function normalize(s){
    if(!s.items) s.items=[]; if(!s.events) s.events=[];
    s.items.forEach(function(it){
      if(typeof it.favorite!=="boolean") it.favorite=false;
      if(it.note==null) it.note="";
      if(!Array.isArray(it.history)){
        it.history=[{type:"created",at:it.createdAt||Date.now()}];
        if(it.boughtAt) it.history.push({type:"purchased",at:it.boughtAt});
      }
    });
    s.version=2; return s;
  }

  /* ----- server bridge (через sdk) ----- */
  function commit(action){ if(demo){ save(); return; } sdk.api.post("action.php",action).catch(function(){ sdk.ui.toast(t("toast.noServer")); }); }
  function undoCommit(snap,undoType){ if(demo){ save(); return; } var it=snap.data; sdk.api.post("action.php",{type:"undo",itemId:it.id,data:{undoType:undoType,status:it.status,favorite:!!it.favorite,boughtAt:it.boughtAt||null,deleted:false}}).catch(function(){}); }
  function track(type,itemId,data){ if(demo) return; sdk.api.post("action.php",{type:type,itemId:itemId||null,data:data||null}).catch(function(){}); }

  /* ----- counts & hud ----- */
  function counts(){ var c={want:0,thinking:0,bought:0}; state.items.forEach(function(i){ if(c[i.status]!=null) c[i.status]++; }); return c; }
  function updateHud(){ var c=counts(),total=c.want+c.thinking+c.bought; sdk.ui.hud({left:t("tab.want").toLowerCase()+': <b>'+c.want+'</b>', cNum:total, cLbl:t("hud.cLbl"), rNum:c.bought, rLbl:t("hud.rLbl")}); }

  /* ----- cards ----- */
  function cardImage(item){
    if(item.photo) return '<div class="card-img" style="background-image:url(\''+item.photo+'\')"></div>';
    var inner=item.icon?'<span class="ph-emoji">'+item.icon+'</span>':'<span class="ph-cherry">'+IC.cherry+'</span>';
    return '<div class="card-img placeholder">'+inner+'</div>';
  }
  function actionsFor(item){
    var id=item.id;
    if(item.status==="want") return '<button class="btn btn-bought" data-action="bought" data-id="'+id+'">'+IC.check+' '+esc(t("btn.bought"))+'</button><button class="btn btn-think" data-action="thinking" data-id="'+id+'">'+IC.think+' '+esc(t("btn.thinking"))+'</button>';
    if(item.status==="thinking") return '<button class="btn btn-want" data-action="want" data-id="'+id+'">'+IC.heart+' '+esc(t("btn.want"))+'</button><button class="btn btn-bought" data-action="bought" data-id="'+id+'">'+IC.check+' '+esc(t("btn.bought"))+'</button>';
    return '<button class="btn btn-ghost" data-action="want" data-id="'+id+'">'+IC.back2+' '+esc(t("btn.backWant"))+'</button>';
  }
  function cardHTML(item){
    var co=itemCounts(item),chips="";
    if(co.changedMind>0) chips+='<span class="chip mind">'+IC.think+' '+esc(t("chip.changedMind",{n:co.changedMind}))+'</span>';
    if(co.purchased>0) chips+='<span class="chip buy">'+IC.check+' '+esc(t("chip.purchased",{n:co.purchased}))+'</span>';
    if(item.status==="bought"&&item.boughtAt){ var dd=daysBetween(item.createdAt,item.boughtAt); chips+='<span class="chip time">'+IC.clock+' '+esc(sdk.plural(dd,"chip.days"))+'</span>'; }
    var chipsHTML=chips?'<div class="chips">'+chips+'</div>':"";
    var notePrev=item.note?'<div class="note-prev">'+esc(item.note)+'</div>':"";
    var link=normUrl(item.link);
    var linkHTML=link?'<a class="card-link" href="'+esc(link)+'" target="_blank" rel="noopener">'+IC.link+' '+esc(t("link.open"))+'</a>':"";
    var boughtBadge=item.status==="bought"?'<div class="bought-badge">'+IC.badge+' '+esc(t("badge.bought"))+'</div>':"";
    return '<article class="card'+(item.status==="bought"?" shine":"")+'" data-id="'+item.id+'">'
      +cardImage(item)+boughtBadge
      +'<button class="fav-btn'+(item.favorite?" on":"")+'" data-action="fav" data-id="'+item.id+'" aria-label="'+esc(t("aria.fav"))+'">'+(item.favorite?IC.star:IC.starO)+'</button>'
      +'<div class="card-body"><h3 class="card-title">'+esc(item.title)+'</h3>'+chipsHTML+notePrev+linkHTML
      +'<div class="card-actions">'+actionsFor(item)+'</div></div></article>';
  }
  function render(){
    var c=counts();
    ["want","thinking","bought"].forEach(function(k){ var b=E.tabs.querySelector('[data-count="'+k+'"]'); if(b) b.textContent=c[k]; });
    Array.prototype.forEach.call(E.tabs.querySelectorAll(".tab"),function(tb){ tb.classList.toggle("active",tb.getAttribute("data-tab")===currentTab); });
    var items=state.items.filter(function(i){ return i.status===currentTab; });
    if(currentTab==="want") items.sort(function(a,b){ if((b.favorite?1:0)!==(a.favorite?1:0)) return (b.favorite?1:0)-(a.favorite?1:0); return b.updatedAt-a.updatedAt; });
    else if(currentTab==="bought") items.sort(function(a,b){ return (b.boughtAt||b.updatedAt)-(a.boughtAt||a.updatedAt); });
    else items.sort(function(a,b){ return b.updatedAt-a.updatedAt; });
    if(!items.length){ E.list.innerHTML='<div class="empty"><div class="empty-ic">'+IC.cherry+'</div><h3>'+esc(t("empty."+currentTab+".h"))+'</h3><p>'+esc(t("empty."+currentTab+".p"))+'</p></div>'; }
    else E.list.innerHTML=items.map(cardHTML).join("");
    updateHud();
  }
  function setTab(tb){ currentTab=tb; E.wl.setAttribute("data-tab",tb); render(); }

  /* ----- actions ----- */
  function handleAction(action,id){
    if(action==="fav") return toggleFav(id);
    if(action==="bought") return confirmPurchase(id);
    if(action==="thinking") return moveItem(id,"thinking");
    if(action==="want") return moveItem(id,"want");
    if(action==="edit") return openEdit(id);
    if(action==="delete") return deleteItem(id);
    if(action==="detail") return openDetail(id);
  }
  function toggleFav(id){ var it=findItem(id); if(!it) return; it.favorite=!it.favorite; it.updatedAt=Date.now(); commit({type:"favorite",itemId:id,data:{on:it.favorite}}); render(); if(detailId===id) renderDetail(id); sdk.ui.haptics(8); }

  function snapshot(item){ return {idx:findIdx(item.id),data:JSON.parse(JSON.stringify(item))}; }
  function restore(s){ var i=findIdx(s.data.id); if(i>=0) state.items[i]=s.data; else state.items.splice(Math.min(s.idx,state.items.length),0,s.data); if(demo) save(); render(); }

  function moveItem(id,to){
    var item=findItem(id); if(!item||item.status===to) return;
    var snap=snapshot(item),from=item.status;
    item.status=to; item.updatedAt=Date.now();
    if(from==="bought"&&to!=="bought") item.boughtAt=null;
    var act=(to==="thinking"?"changed_mind":"back_to_want");
    pushHistory(item, act);
    commit({type:act,itemId:id}); if(detailId===id) closeDetail(); render();
    var msg=to==="thinking"?t("toast.movedThinking"):t("toast.movedWant");
    undoFn=function(){ restore(snap); undoCommit(snap,act); }; sdk.ui.toast(msg,t("common.undo"),undoFn); sdk.ui.haptics(8);
  }
  function deleteItem(id){
    var idx=findIdx(id); if(idx<0) return; var item=state.items[idx];
    var snap={idx:idx,data:JSON.parse(JSON.stringify(item))};
    state.items.splice(idx,1);
    commit({type:"delete",itemId:id}); if(detailId===id) closeDetail(); render();
    undoFn=function(){ restore(snap); undoCommit(snap,"deleted"); }; sdk.ui.toast(t("toast.deleted"),t("common.undo"),undoFn); sdk.ui.haptics(12);
  }

  /* ----- purchase (double confirm + celebration) ----- */
  function confirmPurchase(id){
    var item=findItem(id); if(!item) return; pendingPurchaseId=id;
    var pb=E.purchaseBody;
    var media=item.photo?'<div style="width:64px;height:64px;border-radius:16px;background-size:cover;background-position:center;margin:0 auto 6px;background-image:url(\''+item.photo+'\')"></div>':'<div class="pc-emoji">'+(item.icon||"🎉")+'</div>';
    pb.innerHTML=media
      +'<div class="pc-q">'+esc(t("purchase.q"))+'</div>'
      +'<div class="pc-name">'+esc(item.title)+'</div>'
      +'<div class="sheet-actions"><button class="btn btn-cancel" id="wlPcNo">'+esc(t("purchase.no"))+'</button><button class="btn btn-celebrate" id="wlPcYes">'+esc(t("purchase.yes"))+'</button></div>';
    E.purchaseOverlay.classList.add("show");
    var armed=false,armT=null,yes=pb.querySelector("#wlPcYes"),q=pb.querySelector(".pc-q");
    pb.querySelector("#wlPcNo").onclick=closePurchase;
    yes.onclick=function(){
      if(!armed){ armed=true; yes.textContent=t("purchase.yesAgain"); yes.classList.add("armed"); q.textContent=t("purchase.qAgain"); sdk.ui.haptics(12);
        clearTimeout(armT); armT=setTimeout(function(){ armed=false; yes.textContent=t("purchase.yes"); yes.classList.remove("armed"); q.textContent=t("purchase.q"); },4000); return; }
      clearTimeout(armT); doPurchase(pendingPurchaseId);
    };
  }
  function closePurchase(){ E.purchaseOverlay.classList.remove("show"); pendingPurchaseId=null; }
  function doPurchase(id){
    var item=findItem(id); if(!item) return;
    item.status="bought"; item.boughtAt=Date.now(); item.updatedAt=Date.now();
    pushHistory(item,"purchased");
    commit({type:"purchased",itemId:id}); closePurchase(); closeDetail(); setTab("bought");
    sdk.ui.confetti(); sdk.ui.chime(); sdk.ui.haptics([25,40,25,40,70]);
    sdk.ui.toast(t("toast.congrats"));
  }

  /* ----- detail sheet ----- */
  function renderDetail(id){
    var item=findItem(id); if(!item) return;
    var co=itemCounts(item);
    var link=normUrl(item.link);
    var counts4=''
      +'<div class="dstat mind'+(co.changedMind?'':' zero')+'"><div class="n">'+co.changedMind+'</div><div class="l">'+esc(t("detail.changedMind"))+'</div></div>'
      +'<div class="dstat buy'+(co.purchased?'':' zero')+'"><div class="n">'+co.purchased+'</div><div class="l">'+esc(t("detail.purchased"))+'</div></div>'
      +'<div class="dstat ret'+(co.returned?'':' zero')+'"><div class="n">'+co.returned+'</div><div class="l">'+esc(t("detail.returned"))+'</div></div>'
      +'<div class="dstat edit'+(co.edited?'':' zero')+'"><div class="n">'+co.edited+'</div><div class="l">'+esc(t("detail.edited"))+'</div></div>';
    var hist=(item.history||[]).slice().sort(function(a,b){ return b.at-a.at; });
    var tl=hist.map(function(h){ var em=HL_EMOJI[h.type]||"•"; var label=t("hist."+h.type,{fallback:h.type}); return '<div class="tl-row"><span class="tl-ic">'+em+'</span><span class="tl-tx">'+esc(label)+'</span><span class="tl-dt">'+fmtDate(h.at)+'</span></div>'; }).join("");
    var noteHTML=item.note?'<div class="d-note"><span class="lab">'+esc(t("detail.note"))+'</span>'+esc(item.note)+'</div>':"";
    var linkHTML=link?'<a class="card-link" href="'+esc(link)+'" target="_blank" rel="noopener" style="margin-top:12px">'+IC.link+' '+esc(t("link.open"))+'</a>':"";
    E.detailBody.innerHTML=
      '<div class="d-media">'+cardImage(item)+(item.status==="bought"?'<div class="bought-badge">'+IC.badge+' '+esc(t("badge.bought"))+'</div>':"")+'</div>'
      +'<h2 class="d-title">'+esc(item.title)+'</h2>'
      +'<div class="d-row">'
      +'<button class="d-fav'+(item.favorite?" on":"")+'" data-action="fav" data-id="'+item.id+'">'+(item.favorite?IC.star:IC.starO)+' '+esc(item.favorite?t("detail.favOn"):t("detail.favOff"))+'</button>'
      +'<button class="d-fav" data-action="edit" data-id="'+item.id+'">'+IC.edit+' '+esc(t("detail.edit"))+'</button>'
      +'</div>'
      +noteHTML+linkHTML
      +'<div class="d-sec-title">'+IC.clock+' '+esc(t("detail.historyTitle"))+'</div>'
      +'<div class="dgrid">'+counts4+'</div>'
      +'<div class="tl" style="margin-top:12px">'+tl+'</div>'
      +'<div class="card-actions" style="margin-top:18px">'+actionsFor(item)+'</div>'
      +'<div class="sheet-actions" style="margin-top:10px"><button class="btn btn-danger" data-action="delete" data-id="'+item.id+'">'+IC.trash+' '+esc(t("common.delete"))+'</button></div>';
  }
  function openDetail(id){ detailId=id; renderDetail(id); E.detailOverlay.classList.add("show"); track("viewed_detail",id,null); }
  function closeDetail(){ E.detailOverlay.classList.remove("show"); detailId=null; }

  /* ----- stats sheet ----- */
  function aggregate(){
    var ag={total:state.items.length,boughtNow:0,purchases:0,changedMind:0,favorites:0,sumDays:0,nDays:0,fickle:null};
    state.items.forEach(function(it){
      var c=itemCounts(it);
      if(it.status==="bought") ag.boughtNow++;
      ag.purchases+=c.purchased; ag.changedMind+=c.changedMind; if(it.favorite) ag.favorites++;
      if(it.status==="bought"&&it.boughtAt){ ag.sumDays+=daysBetween(it.createdAt,it.boughtAt); ag.nDays++; }
      if(c.changedMind>0&&(!ag.fickle||c.changedMind>ag.fickle.n)) ag.fickle={name:it.title,n:c.changedMind};
    });
    ag.avgDays=ag.nDays?Math.round(ag.sumDays/ag.nDays):null; return ag;
  }
  function openStats(){
    track("viewed_stats",null,null);
    var a=aggregate();
    var html='<div class="sgrid">'
      +'<div class="scard c1"><div class="n">'+a.total+'</div><div class="l">'+esc(t("stats.total"))+'</div></div>'
      +'<div class="scard c2"><div class="n">'+a.boughtNow+'</div><div class="l">'+esc(t("stats.boughtNow"))+'</div></div>'
      +'<div class="scard c2"><div class="n">'+a.purchases+'</div><div class="l">'+esc(t("stats.purchases"))+'</div></div>'
      +'<div class="scard c3"><div class="n">'+a.changedMind+'</div><div class="l">'+esc(t("stats.changedMind"))+'</div></div>'
      +'<div class="scard c4"><div class="n">'+a.favorites+'</div><div class="l">'+esc(t("stats.favorites"))+'</div></div>'
      +'<div class="scard c2"><div class="n">'+(a.avgDays==null?"—":a.avgDays)+'</div><div class="l">'+esc(t("stats.avgDays"))+'</div></div>'
      +'</div>';
    if(a.fickle) html+='<div class="sline">'+t("stats.fickle",{name:esc(a.fickle.name),n:a.fickle.n})+'</div>';
    E.statsBody.innerHTML=html;
    E.statsOverlay.classList.add("show");
  }

  /* ----- ШАРИНГ (2026-06-07): публичная ссылка + доступы пользователям платформы -----
     Сервер: api/share.php. Делиться можно ТОЛЬКО если родитель включил флаг ребёнку.
     Нет флага + есть родитель → просьба родителю письмом (op=request).
     Нет флага + нет родителя → в Настройки (пригласить родителя; op=invite child_invite_parent).
     Демо-режим: только тост (нужен сервер). Ошибки HTTP мапим по коду из sdk.api. */
  function httpCode(e){ var m=/http (\d+)/.exec(e&&e.message||""); return m?+m[1]:0; }
  function openShare(){
    if(sdk.isDemo()){ sdk.ui.toast(t("share.demoOnly")); return; }
    var node=document.createElement("div");
    node.innerHTML='<h2>'+esc(t("share.shTitle"))+'</h2><div id="wlShBody"><p class="set-note">…</p></div>';
    var ctl=sdk.ui.sheet(node);
    var body=node.querySelector("#wlShBody");
    function load(){
      sdk.api.post("share.php",{op:"status"}).then(function(r){
        if(r&&r.ok) renderShare(body,r,ctl,load);
        else body.innerHTML='<p class="set-note">'+esc(t("share.loadFail"))+'</p>';
      }).catch(function(){ body.innerHTML='<p class="set-note">'+esc(t("share.loadFail"))+'</p>'; });
    }
    load();
  }
  function renderShare(body,st,ctl,reload){
    if(!st.enabled){
      if(st.hasParent){
        body.innerHTML='<p class="set-note">'+esc(t("share.askText",{name:st.parentNick||""}))+'</p>'
          +'<div class="sheet-actions"><button class="btn btn-primary" id="wlShAsk" style="flex:1">📨 '+esc(t("share.askBtn"))+'</button></div>';
        body.querySelector("#wlShAsk").onclick=function(){
          sdk.api.post("share.php",{op:"request",lang:sdk.i18n.get()})
            .then(function(r){
              // сервер может ответить 200 + ok:false (лимит почты) — не врём ребёнку
              if(r&&r.ok){ sdk.ui.toast(t("share.askSent")); ctl.close(); }
              else sdk.ui.toast(t("share.askToo"));
            })
            .catch(function(e){ sdk.ui.toast(httpCode(e)===429?t("share.askToo"):t("toast.noServer")); });
        };
      } else {
        body.innerHTML='<p class="set-note">'+esc(t("share.noParentText"))+'</p>'
          +'<div class="sheet-actions"><button class="btn btn-primary" id="wlShSet" style="flex:1">'+esc(t("share.openSettings"))+'</button></div>';
        body.querySelector("#wlShSet").onclick=function(){
          ctl.close(); sdk.ui.back(); // закрыть модуль, затем настройки (раздел «Мой родитель»)
          if(window.RobTop&&window.RobTop._shell&&window.RobTop._shell.openSettings) window.RobTop._shell.openSettings();
        };
      }
      return;
    }
    var grants=st.grants||[];
    var rows=grants.length?grants.map(function(g){
      return '<div class="acct-row"><span class="nm">'+esc(g.nickname)+'</span>'
        +'<button class="hbtn" data-rm="'+g.id+'" aria-label="'+esc(t("share.revoke"))+'" title="'+esc(t("share.revoke"))+'" style="width:34px;height:34px;color:var(--red-soft)">✕</button></div>';
    }).join(""):'<p class="set-note">'+esc(t("share.grantEmpty"))+'</p>';
    body.innerHTML='<p class="set-note">'+esc(t("share.linkHint"))+'</p>'
      +'<div class="invlink">'+esc(st.url||"")+'</div>'
      +'<button class="btn btn-primary" id="wlShCopy" style="width:100%;margin-top:10px">'+esc(t("share.copy"))+'</button>'
      +'<div class="store-section">'+esc(t("share.grantTitle"))+'</div>'
      +'<input class="set-in" id="wlShNick" type="text" placeholder="'+esc(t("share.grantPh"))+'" autocomplete="off" data-1p-ignore data-lpignore="true" data-bwignore>'
      +'<div class="sheet-actions"><button class="btn btn-primary" id="wlShGrant" style="flex:1">'+esc(t("share.grantBtn"))+'</button></div>'
      +'<div id="wlShGrants">'+rows+'</div>';
    body.querySelector("#wlShCopy").onclick=function(){
      try{ if(navigator.clipboard) navigator.clipboard.writeText(st.url||""); }catch(e){}
      sdk.ui.toast(t("share.copied")); sdk.ui.haptics(8);
    };
    body.querySelector("#wlShGrant").onclick=function(){
      var nick=(body.querySelector("#wlShNick").value||"").trim(); if(!nick) return;
      sdk.api.post("share.php",{op:"grant",nickname:nick})
        .then(function(r){ sdk.ui.toast(t("share.granted",{name:(r&&r.nickname)||nick})); reload(); })
        .catch(function(e){ sdk.ui.toast(httpCode(e)===404?t("share.errUser"):t("share.errGrant")); });
    };
    Array.prototype.forEach.call(body.querySelectorAll("[data-rm]"),function(b){
      b.onclick=function(){
        sdk.api.post("share.php",{op:"revoke",id:parseInt(b.getAttribute("data-rm"),10)})
          .then(function(){ sdk.ui.toast(t("share.revoked")); reload(); })
          .catch(function(){ sdk.ui.toast(t("toast.noServer")); });
      };
    });
  }
  function openFriends(){
    if(sdk.isDemo()){ sdk.ui.toast(t("share.demoOnly")); return; }
    var node=document.createElement("div");
    node.innerHTML='<h2>'+esc(t("share.frTitle"))+'</h2><div id="wlFrBody"><p class="set-note">…</p></div>';
    sdk.ui.sheet(node);
    var body=node.querySelector("#wlFrBody");
    sdk.api.post("share.php",{op:"shared_with_me"}).then(function(r){
      var list=(r&&r.lists)||[];
      if(!list.length){ body.innerHTML='<p class="set-note">'+esc(t("share.frEmpty"))+'</p>'; return; }
      body.innerHTML=list.map(function(x){
        return '<a class="acct-row" style="text-decoration:none" href="w.html?u='+encodeURIComponent(x.nickname)+'" target="_blank" rel="noopener">'
          +'<span class="nm">'+esc(x.nickname)+'</span><span class="rl">👁</span></a>';
      }).join("");
    }).catch(function(){ body.innerHTML='<p class="set-note">'+esc(t("share.loadFail"))+'</p>'; });
  }

  /* ----- add/edit sheet ----- */
  function showPreview(src){ if(src){ E.photoPick.classList.add("has-photo"); E.ppreview.style.backgroundImage="url('"+src+"')"; } else { E.photoPick.classList.remove("has-photo"); E.ppreview.style.backgroundImage=""; } }
  function setFormPhoto(d){ formPhoto=d||null; showPreview(formPhoto); }
  function uploadPhoto(dataUrl){
    E.photoPick.classList.add("uploading");
    sdk.media.upload(dataUrl,"wishlist").then(function(res){ E.photoPick.classList.remove("uploading"); if(res&&res.path){ formPhoto=res.path; } else { formPhoto=null; sdk.ui.toast(t("toast.photoFailed")); } }).catch(function(){ E.photoPick.classList.remove("uploading"); formPhoto=null; sdk.ui.toast(t("toast.photoFailedOffline")); });
  }
  function openAdd(){ editingId=null; E.sheetTitle.textContent=t("form.newWish"); E.title.value=""; E.link.value=""; E.note.value=""; setFormPhoto(null); E.overlay.classList.add("show"); setTimeout(function(){ E.title.focus(); },250); }
  function openEdit(id){ var it=findItem(id); if(!it) return; closeDetail(); editingId=id; E.sheetTitle.textContent=t("form.editWish"); E.title.value=it.title||""; E.link.value=it.link||""; E.note.value=it.note||""; setFormPhoto(it.photo||null); E.overlay.classList.add("show"); }
  function closeSheet(){ E.overlay.classList.remove("show"); }
  function saveSheet(){
    var title=E.title.value.trim();
    if(!title){ E.title.focus(); E.title.style.borderColor="var(--pink)"; sdk.ui.toast(t("toast.needTitle")); return; }
    var link=E.link.value.trim(),note=E.note.value.trim();
    if(editingId){
      var it=findItem(editingId);
      if(it){ it.title=title; it.link=link; it.note=note; it.photo=formPhoto; if(formPhoto) it.icon=null; it.updatedAt=Date.now(); pushHistory(it,"edited"); commit({type:"edited",itemId:editingId,data:{title:title,note:note,link:link,photo:formPhoto,icon:it.icon}}); }
      render(); closeSheet(); sdk.ui.toast(t("toast.saved"));
    }else if(demo){
      var now=Date.now(),neu={id:uid(),title:title,link:link,note:note,photo:formPhoto,icon:null,favorite:false,status:"want",createdAt:now,updatedAt:now,boughtAt:null,history:[{type:"created",at:now}]};
      state.items.push(neu); logEvent("created",{itemId:neu.id,title:title});
      save(); closeSheet(); setTab("want"); sdk.ui.toast(t("toast.added"));
    }else{
      closeSheet();
      sdk.api.post("action.php",{type:"create",data:{title:title,note:note,link:link,photo:formPhoto,icon:null}})
        .then(function(res){ if(res&&res.item){ state.items.push(res.item); setTab("want"); sdk.ui.toast(t("toast.added")); } else sdk.ui.toast(t("toast.addFailed")); })
        .catch(function(){ sdk.ui.toast(t("toast.addFailedOffline")); });
    }
  }
  function handleFile(file){
    if(!file) return; var reader=new FileReader();
    reader.onload=function(ev){ var img=new Image();
      img.onload=function(){ var max=900,w=img.width,h=img.height; if(w>h&&w>max){ h=Math.round(h*max/w); w=max; } else if(h>=w&&h>max){ w=Math.round(w*max/h); h=max; }
        var dataUrl; try{ var cv=document.createElement("canvas"); cv.width=w; cv.height=h; cv.getContext("2d").drawImage(img,0,0,w,h); dataUrl=cv.toDataURL("image/jpeg",0.82); }catch(e){ dataUrl=ev.target.result; }
        showPreview(dataUrl); if(demo){ formPhoto=dataUrl; } else { uploadPhoto(dataUrl); } };
      img.onerror=function(){ var du=ev.target.result; showPreview(du); if(demo){ formPhoto=du; } else { uploadPhoto(du); } }; img.src=ev.target.result; };
    reader.readAsDataURL(file);
  }

  /* ----- DOM build ----- */
  function rootHTML(){
    return '<div class="wl" data-tab="want">'
      +'<nav class="tabs" id="wlTabs">'
        +'<button class="tab active" data-tab="want"><span class="t-label"><span class="dot"></span>'+esc(t("tab.want"))+'</span><span class="badge" data-count="want">0</span></button>'
        +'<button class="tab" data-tab="thinking"><span class="t-label"><span class="dot"></span>'+esc(t("tab.thinking"))+'</span><span class="badge" data-count="thinking">0</span></button>'
        +'<button class="tab" data-tab="bought"><span class="t-label"><span class="dot"></span>'+esc(t("tab.bought"))+'</span><span class="badge" data-count="bought">0</span></button>'
      +'</nav>'
      +'<main class="list" id="wlList" aria-live="polite"></main>'
    +'</div>';
  }
  function overlaysHTML(){
    return ''
    +'<div class="overlay" id="wlOverlay"><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="wlSheetTitle">'
      +'<div class="grip"></div><h2 id="wlSheetTitle">'+esc(t("form.newWish"))+'</h2>'
      +'<div class="photo-pick" id="wlPhotoPick"><div class="ppreview" id="wlPpreview"></div>'
        +'<svg viewBox="0 0 24 24" fill="none" style="stroke:var(--pink-soft)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h3l2-3h8l2 3h3v13H3z"/><circle cx="12" cy="13" r="4"/></svg>'
        +'<span>'+esc(t("form.addPhoto"))+'</span><span class="pp-edit">'+esc(t("form.replacePhoto"))+'</span></div>'
      +'<input type="file" id="wlPhotoInput" accept="image/*" hidden>'
      +'<div class="field"><label for="wlTitle">'+esc(t("form.titleLabel"))+'</label><input id="wlTitle" type="text" maxlength="60" placeholder="'+esc(t("form.titlePh"))+'" autocomplete="off"></div>'
      +'<div class="field"><label for="wlNote">'+esc(t("form.noteLabel"))+' <span class="opt">'+esc(t("form.optional"))+'</span></label><textarea id="wlNote" maxlength="200" placeholder="'+esc(t("form.notePh"))+'"></textarea></div>'
      +'<div class="field"><label for="wlLink">'+esc(t("form.linkLabel"))+' <span class="opt">'+esc(t("form.optional"))+'</span></label><input id="wlLink" type="text" inputmode="url" placeholder="https://..." autocomplete="off"></div>'
      +'<div class="sheet-actions"><button class="btn btn-cancel" id="wlCancel">'+esc(t("common.cancel"))+'</button><button class="btn btn-primary" id="wlSave">'+esc(t("common.save"))+'</button></div>'
    +'</div></div>'
    +'<div class="overlay" id="wlDetailOverlay"><div class="sheet detail" role="dialog" aria-modal="true"><div class="grip"></div><div id="wlDetailBody"></div></div></div>'
    +'<div class="overlay" id="wlPurchaseOverlay"><div class="sheet purchase" role="dialog" aria-modal="true"><div class="grip"></div><div id="wlPurchaseBody"></div></div></div>'
    +'<div class="overlay" id="wlStatsOverlay"><div class="sheet stats" role="dialog" aria-modal="true"><div class="grip"></div><h2>'+esc(t("stats.title"))+'</h2><div id="wlStatsBody"></div><div class="sheet-actions"><button class="btn btn-cancel" id="wlStatsClose" style="flex:1">'+esc(t("common.close"))+'</button></div></div></div>';
  }

  function grab(){
    E.wl=root.querySelector(".wl");
    E.tabs=root.querySelector("#wlTabs");
    E.list=root.querySelector("#wlList");
    E.overlay=ovWrap.querySelector("#wlOverlay");
    E.photoPick=ovWrap.querySelector("#wlPhotoPick");
    E.ppreview=ovWrap.querySelector("#wlPpreview");
    E.photoInput=ovWrap.querySelector("#wlPhotoInput");
    E.title=ovWrap.querySelector("#wlTitle");
    E.note=ovWrap.querySelector("#wlNote");
    E.link=ovWrap.querySelector("#wlLink");
    E.sheetTitle=ovWrap.querySelector("#wlSheetTitle");
    E.detailOverlay=ovWrap.querySelector("#wlDetailOverlay");
    E.detailBody=ovWrap.querySelector("#wlDetailBody");
    E.purchaseOverlay=ovWrap.querySelector("#wlPurchaseOverlay");
    E.purchaseBody=ovWrap.querySelector("#wlPurchaseBody");
    E.statsOverlay=ovWrap.querySelector("#wlStatsOverlay");
    E.statsBody=ovWrap.querySelector("#wlStatsBody");
  }
  function wire(){
    E.tabs.addEventListener("click",function(e){ var tb=e.target.closest(".tab"); if(tb) setTab(tb.getAttribute("data-tab")); });
    E.list.addEventListener("click",function(e){
      var btn=e.target.closest("[data-action]");
      if(btn){ handleAction(btn.getAttribute("data-action"),btn.getAttribute("data-id")); return; }
      if(e.target.closest("a")) return;
      var card=e.target.closest(".card"); if(card) openDetail(card.getAttribute("data-id"));
    });
    E.detailBody.addEventListener("click",function(e){ var btn=e.target.closest("[data-action]"); if(btn) handleAction(btn.getAttribute("data-action"),btn.getAttribute("data-id")); });
    ovWrap.querySelector("#wlSave").addEventListener("click",saveSheet);
    ovWrap.querySelector("#wlCancel").addEventListener("click",closeSheet);
    ovWrap.querySelector("#wlStatsClose").addEventListener("click",function(){ E.statsOverlay.classList.remove("show"); });
    E.overlay.addEventListener("click",function(e){ if(e.target===E.overlay) closeSheet(); });
    E.detailOverlay.addEventListener("click",function(e){ if(e.target===E.detailOverlay) closeDetail(); });
    E.purchaseOverlay.addEventListener("click",function(e){ if(e.target===E.purchaseOverlay) closePurchase(); });
    E.statsOverlay.addEventListener("click",function(e){ if(e.target===E.statsOverlay) E.statsOverlay.classList.remove("show"); });
    E.photoPick.addEventListener("click",function(){ E.photoInput.click(); });
    E.photoInput.addEventListener("change",function(e){ handleFile(e.target.files[0]); E.photoInput.value=""; });
    E.title.addEventListener("input",function(){ E.title.style.borderColor=""; });
    onKey=function(e){ if(e.key==="Escape"){ closeSheet(); closeDetail(); closePurchase(); E.statsOverlay.classList.remove("show"); } };
    document.addEventListener("keydown",onKey);
    [[E.overlay,closeSheet],[E.detailOverlay,closeDetail],[E.purchaseOverlay,closePurchase],[E.statsOverlay,function(){ E.statsOverlay.classList.remove("show"); }]].forEach(function(p){
      var ov=p[0],close=p[1],sheet=ov&&ov.querySelector(".sheet"); if(!sheet) return;
      var grip=sheet.querySelector(".grip"); if(grip) grip.addEventListener("click",close); sdk.ui.enableDrag(sheet,close);
    });
  }

  /* ----- boot ----- */
  function demoBoot(msg){ demo=true; var s=normalize(load()||seed()); state.items=s.items; state.events=s.events||[]; save(); render(); if(msg) sdk.ui.toast(msg); }
  function boot(){
    if(sdk.isDemo()){ demoBoot(); return; }
    sdk.api.get("state.php").then(function(res){ demo=false; state.items=(res&&res.items)||[]; state.events=[]; render(); track("opened_app",null,null); })
      .catch(function(){ if(window.RobTop&&window.RobTop._shell&&window.RobTop._shell.setDemo) window.RobTop._shell.setDemo(true); demoBoot(t("toast.demoMode")); });
  }

  function mount(rootEl, theSdk){
    sdk=theSdk; root=rootEl;
    currentTab="want"; editingId=null; formPhoto=null; pendingPurchaseId=null; detailId=null; undoFn=null; state={items:[],events:[]};
    var body=sdk.ui.frame({
      titleHtml:'<div class="wl-title"><span class="cic">'+TITLE_CHERRY+'</span> '+esc(t("title"))+'</div><div class="wl-sub">'+esc(t("subtitle"))+'</div>',
      backLabel:t("common.back"),
      actions:[
        { icon:FRIENDS_IC, id:"wlFriends", label:t("share.ariaFriends"), onClick:openFriends },
        { icon:SHARE_IC, id:"wlShare", label:t("share.aria"), onClick:openShare },
        { icon:"statsBars", id:"wlStats", label:t("aria.stats"), onClick:openStats }
      ]
    }).body;
    body.innerHTML=rootHTML();
    ovWrap=document.createElement("div"); ovWrap.className="wl-overlays"; ovWrap.innerHTML=overlaysHTML(); document.body.appendChild(ovWrap);
    grab(); wire();
    fabCtl=sdk.ui.fab(t("btn.want"), openAdd);
    boot();
  }
  function unmount(){
    if(onKey){ document.removeEventListener("keydown",onKey); onKey=null; }
    if(ovWrap&&ovWrap.parentNode){ ovWrap.parentNode.removeChild(ovWrap); } ovWrap=null;
    E={}; state={items:[],events:[]};
  }

  RobTop.register({ id:"wishlist", mount:mount, unmount:unmount, messages:MESSAGES });
})();
