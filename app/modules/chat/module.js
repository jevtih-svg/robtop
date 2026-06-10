/* RobTop — модуль «Чат». Семейный мессенджер: переписки 1:1 и группы из членов семьи,
   текст + фото, оповещения на каждое сообщение (серверный rt_notify в modules/chat/api.php).
   Поверхности: список чатов → переписка (пузыри, день-разделители, композер с фото) → шторка
   «Новый чат» (выбор членов семьи, ≥2 — группа с названием). Родитель видит ВСЕ чаты семьи
   (чужие — read-only, секция «Все чаты семьи»). Живое обновление — хук refresh() (sync 4с).

   РАСКЛАДКА (v1.1.0, 2026-06-08 — переписана под нативный мессенджер):
   ─ Весь чат рисуется в СОБСТВЕННЫЙ слой <div id="chApp"> в <body>, А НЕ в .view-секцию.
     Причина та же, что у таббара родителя (index.html, .pd-tabbar): заполненная анимация
     .view.active (transform) делает секцию containing block — position:fixed внутри неё липнет
     к низу длинного списка, а не к экрану. Слой в <body> свободен от этого, и fixed работает.
   ─ Слой = position:fixed на весь экран; колонка flex: шапка (flex:none) / лента (flex:1,
     ЕДИНСТВЕННЫЙ скроллер) / композер (flex:none, прижат потоком к низу слоя). Тело страницы
     заблокировано (html.ch-lock) — нет дёрганья и баунса позади.
   ─ Клавиатура: visualViewport.height задаёт ВЫСОТУ слоя, offsetTop — translateY. Композер,
     будучи низом колонки, оказывается ровно над клавиатурой без зазора. Никаких transform'ов
     на самом композере (старый приём давал щель из скриншота).
   ─ Композер — contenteditable div (НЕ textarea): iOS Safari не рисует над ним панель формы
     (‹ › Готово). Только текст: вставка как plain-text, лимит 1000, плейсхолдер через :empty,
     Enter — отправка, Shift+Enter — перенос, IME-safe. Рост — CSS max-height, дальше скролл.

   РАСКЛАДКА (v1.3.0, 2026-06-09 — поведение «как WhatsApp»):
   ─ ПЕРЕПИСКА полноэкранная: renderThread добавляет слою класс .ch-thread (высота 100dvh, без
     резерва под нижний бар) и прячет нижнее меню через sdk.ui.hud({hidden:true}). Причина: при
     открытой клавиатуре iOS поднимает fixed-бар (bottom:0) НАД клавиатуру, и он накладывался на
     композер (баг со скриншота). Список чатов (renderList) — наоборот: бар ВИДЕН (это вкладка
     «Чат» нижнего меню), слой укорочен на --kidbar-total. Назад из треда → renderList вернёт бар.
   ─ КЛАВИАТУРА не гаснет при отправке: фокус удерживает preventDefault на pointerdown кнопок
     композера (#chComp .cbtn). iOS НЕ держит фокус синтетическим mousedown — поэтому ведущий
     слушатель именно pointerdown (mousedown оставлен фолбэком). + фолбэк-рефокус поля после send.
   КЛАВИАТУРА (v1.3.1, 2026-06-10 — следящий rAF-цикл вместо снимков):
   ─ Снимок visualViewport по одному событию ненадёжен в iOS-PWA: финальный resize после анимации
     клавиатуры/смены панели автодополнения иногда не приходит — слой замирал со старой высотой
     (композер «висел» выше клавиатуры, в зазоре светилась страница и маркер версии), а дискретные
     прыжки высоты читались как «статтер». Теперь события только БУДЯТ короткий rAF-цикл (kbKick/
     kbFrame): каждый кадр перечитывает vv, пишет стили только при изменении, продлевает себя пока
     значения едут и гаснет через KB_TAIL после затишья. reExpandViewport зовётся при расфокусе в
     ЛЮБОМ виде (раньше только в треде — «назад» с открытой клавиатурой оставлял редкую щель).
   ─ «ЩЕЛЬ» СНИЗУ ПОСЛЕ ЧАТА: html.ch-lock (overflow:hidden) + клавиатура схлопывают iOS-PWA
     layout-вьюпорт ниже экрана → нижний бар застревает выше реального низа. unmount зовёт
     sdk.ui.fixViewport() (= rtForceFullViewport оболочки) — заново разворачивает вьюпорт. */
(function(){
  "use strict";
  var MESSAGES={
    en:{ chat:{
      subtitle:"Family messenger",
      newChat:"New chat", familySec:"All family chats", you:"You",
      noMsgs:"No messages yet", first:"Write the first message!",
      noFamily:"Chat is for your family. Invite them in Settings → Family.",
      demo:"Chat needs a real account — it is off in demo mode.",
      deleted:"Message deleted", photoWord:"Photo",
      write:"Write a message…", send:"Send", addPhoto:"Add a photo",
      delTitle:"Delete this message?", delText:"Everyone will see “message deleted” instead.",
      delYes:"Delete", group:"Group", groupPh:"Group name",
      pickTitle:"Chat with whom?", startChat:"Start chat", createGroup:"Create group",
      needTitle:"Give the group a name", ro:"View only — you are not in this chat",
      members:"In chat: {names}", errSend:"Couldn't send, try again", errLoad:"Couldn't load, pull to retry",
      older:"Show earlier messages", uploadFail:"Photo didn't upload, try again",
      stSent:"Sent", stDelivered:"Delivered", stRead:"Read", readAt:"Read at {t}",
      infoTitle:"Message", infoClose:"Close"
    }},
    ru:{ chat:{
      subtitle:"Семейный мессенджер",
      newChat:"Новый чат", familySec:"Все чаты семьи", you:"Ты",
      noMsgs:"Пока нет сообщений", first:"Напиши первым!",
      noFamily:"Чат — для семьи. Пригласи её в Настройках → Семья.",
      demo:"Чату нужен настоящий аккаунт — в демо он выключен.",
      deleted:"Сообщение удалено", photoWord:"Фото",
      write:"Напиши сообщение…", send:"Отправить", addPhoto:"Добавить фото",
      delTitle:"Удалить сообщение?", delText:"Вместо него все увидят «сообщение удалено».",
      delYes:"Удалить", group:"Группа", groupPh:"Название группы",
      pickTitle:"С кем чат?", startChat:"Начать чат", createGroup:"Создать группу",
      needTitle:"Дай группе название", ro:"Только просмотр — ты не в этом чате",
      members:"В чате: {names}", errSend:"Не отправилось, попробуй ещё раз", errLoad:"Не загрузилось, попробуй ещё раз",
      older:"Показать сообщения раньше", uploadFail:"Фото не загрузилось, попробуй ещё раз",
      stSent:"Отправлено", stDelivered:"Доставлено", stRead:"Прочитано", readAt:"Прочитано в {t}",
      infoTitle:"Сообщение", infoClose:"Закрыть"
    }},
    lv:{ chat:{
      subtitle:"Ģimenes ziņotājs",
      newChat:"Jauns čats", familySec:"Visi ģimenes čati", you:"Tu",
      noMsgs:"Vēl nav ziņu", first:"Uzraksti pirmais!",
      noFamily:"Čats ir ģimenei. Uzaicini to Iestatījumos → Ģimene.",
      demo:"Čatam vajag īstu kontu — demo režīmā tas ir izslēgts.",
      deleted:"Ziņa izdzēsta", photoWord:"Foto",
      write:"Raksti ziņu…", send:"Sūtīt", addPhoto:"Pievienot foto",
      delTitle:"Dzēst šo ziņu?", delText:"Visi tās vietā redzēs “ziņa izdzēsta”.",
      delYes:"Dzēst", group:"Grupa", groupPh:"Grupas nosaukums",
      pickTitle:"Ar ko čatot?", startChat:"Sākt čatu", createGroup:"Izveidot grupu",
      needTitle:"Dod grupai nosaukumu", ro:"Tikai skatīšanās — tu neesi šajā čatā",
      members:"Čatā: {names}", errSend:"Neizdevās nosūtīt, mēģini vēlreiz", errLoad:"Neizdevās ielādēt, mēģini vēlreiz",
      older:"Rādīt agrākās ziņas", uploadFail:"Foto neielādējās, mēģini vēlreiz",
      stSent:"Nosūtīts", stDelivered:"Piegādāts", stRead:"Izlasīts", readAt:"Izlasīts {t}",
      infoTitle:"Ziņa", infoClose:"Aizvērt"
    }}
  };
  /* standalone-PWA (иконка на домашнем экране)? Только там iOS схлопывает layout-вьюпорт
     клавиатурой — reExpandViewport гейтится этим флагом */
  var RT_STANDALONE=!!(navigator.standalone || (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches));
  /* back/plus — из общего реестра иконок оболочки (RobTop._shell.icons), SVG не дублируем */
  var HI=(window.RobTop&&RobTop._shell&&RobTop._shell.icons)||{};
  var BACK_IC=HI.back||"";
  var PLUS_IC=HI.plus||"";
  var CAM_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8.5a2 2 0 0 1 2-2h2l1.4-2h5.2L16 6.5h2a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.4"/></svg>';
  var SEND_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l16-7-5 16-3.4-6.2z"/><path d="M20 5L11.6 14.8"/></svg>';
  var BUBBLE_E='💬';
  /* галочки статуса своих сообщений: ✓ sent, ✓✓ delivered/read (цвет задаёт CSS .ck-<status>) */
  var CHECK_ONE='<svg viewBox="0 0 14 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 6.5l3.3 3.3L12.5 2"/></svg>';
  var CHECK_TWO='<svg viewBox="0 0 20 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 6.5l3.3 3.3L10.5 2"/><path d="M7.5 6.5l3.3 3.3L18.5 2"/></svg>';
  var MAXLEN=1000;

  var sdk=null, root=null, E={}, S=null;
  /* персональный оттенок имени в группах — токены тем (без жёстких цветов) */
  var NAME_VARS=["--cyan","--magenta","--gold","--green","--purple","--orange"];

  function esc(s){ return RobTop.util.esc(s); }
  function t(k,p){ return sdk.t(k,p); }
  function api(type,payload){ return sdk.api.post("action.php", Object.assign({module:"chat", type:type}, payload||{})); }
  function alive(){ return !!(S && S.alive); }
  function nameVar(uid){ return "var("+NAME_VARS[Math.abs(parseInt(uid,10)||0)%NAME_VARS.length]+")"; }
  function kindEmoji(k){ return k==="parent"?"🧑":"🧒"; }
  function hhmm(ms){ var d=new Date(ms); function z(n){ return (n<10?"0":"")+n; } return z(d.getHours())+":"+z(d.getMinutes()); }
  function dayKey(ms){ var d=new Date(ms); return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate(); }
  function dayLabel(ms){ return sdk.formatDate(ms,{day:"numeric",month:"long"}); }
  function rowTime(ms){
    if(!ms) return "";
    return dayKey(ms)===dayKey(Date.now()) ? hhmm(ms) : sdk.formatDate(ms,{day:"numeric",month:"short"});
  }
  function threadById(id){ var i; for(i=0;i<S.threads.length;i++){ if(S.threads[i].id===id) return S.threads[i]; } return null; }
  function others(th){ return (th.members||[]).filter(function(m){ return m.id!==S.me; }); }
  function threadName(th){
    if(th.kind==="group") return th.title||t("group");
    var o=others(th); return o.length?o[0].name:t("group");
  }
  function threadEmoji(th){
    if(th.kind==="group") return "👥";
    var o=others(th)[0], r=o&&rosterById(o.id);
    return r?kindEmoji(r.kind):BUBBLE_E;
  }
  function rosterById(id){ var i; for(i=0;i<S.roster.length;i++){ if(S.roster[i].id===id) return S.roster[i]; } return null; }

  /* =================== ЗАГРУЗКА =================== */
  function loadThreads(){
    return api("threads").then(function(r){
      if(!alive() || !r || !r.ok) return r;
      S.family=!!r.family; S.me=r.me; S.isParent=!!r.isParent;
      S.roster=r.roster||[]; S.threads=r.threads||[]; S.loaded=true;
      return r;
    });
  }
  function loadMsgs(tid, before){
    var p=before?{itemId:tid, data:{before:before}}:{itemId:tid};
    return api("messages", p);
  }

  /* =================== СПИСОК ЧАТОВ =================== */
  function renderList(){
    if(!alive()) return;
    S.view="list"; S.tid=null;
    /* список чатов = вкладка нижнего меню (как «Чаты» в WhatsApp): бар ВИДЕН, слой укорочен
       на его высоту (без .ch-thread). Переписка же полноэкранная — бар прячется (см. renderThread). */
    if(E.app) E.app.classList.remove("ch-thread");
    if(sdk&&sdk.ui&&sdk.ui.hud) sdk.ui.hud({hidden:false});
    kbKick(); /* возврат из треда: цикл снимет инлайн-стили слоя и добьёт схлопнутый вьюпорт */
    var h='<div class="ch-head"><button class="back" id="chBack" aria-label="'+esc(sdk.i18n.t("common.back"))+'">'+BACK_IC+'</button>'
      +'<div class="ch-head-main"><div class="ch-title">'+BUBBLE_E+' '+esc(sdk.i18n.t("tile.chat"))+'</div>'
      +'<div class="ch-sub">'+esc(t("subtitle"))+'</div></div>'
      +(S.family&&sdk.can("edit")?'<button class="hbtn" id="chNew" aria-label="'+esc(t("newChat"))+'">'+PLUS_IC+'</button>':'')
      +'</div>';
    h+='<div class="ch-scroll" id="chScroll">';
    if(!S.loaded){ h+='<div class="ch-empty"><div class="e">⏳</div></div>'; }
    else if(!S.family){
      h+='<div class="ch-empty"><div class="e">👨‍👩‍👧</div><p>'+esc(t("noFamily"))+'</p></div>';
    } else {
      var mineRows=S.threads.filter(function(x){ return !x.ro; });
      var roRows=S.threads.filter(function(x){ return !!x.ro; });
      if(!mineRows.length && !roRows.length){
        h+='<div class="ch-empty"><div class="e">'+BUBBLE_E+'</div><p>'+esc(t("first"))+'</p>'
          +(sdk.can("edit")?'<button class="btn btn-primary" id="chNew2">'+esc(t("newChat"))+'</button>':'')+'</div>';
      } else {
        h+='<div class="ch-list">'+mineRows.map(rowHtml).join("")+'</div>';
        if(roRows.length){
          h+='<div class="ch-sec">👁 '+esc(t("familySec"))+'</div>'
            +'<div class="ch-list">'+roRows.map(rowHtml).join("")+'</div>';
        }
      }
    }
    h+='</div>';
    E.wrap.innerHTML=h;
    E.msgs=null; E.input=null; E.file=null;
  }
  function rowHtml(th){
    var last=th.last, prev;
    if(!last) prev='<span class="dim">'+esc(t("noMsgs"))+'</span>';
    else{
      var who=last.uid===S.me?t("you"):last.name;
      var txt=(last.photo?"📷 ":"")+(last.body||(last.photo?t("photoWord"):""));
      prev=esc(who)+": "+esc(txt);
    }
    return '<button class="ch-row" data-tid="'+th.id+'">'
      +'<span class="ava">'+threadEmoji(th)+'</span>'
      +'<span class="tx"><span class="t1">'+esc(threadName(th))+(th.ro?' <span class="ro-ic">👁</span>':'')+'</span>'
      +'<span class="t2">'+prev+'</span></span>'
      +'<span class="meta"><span class="tm">'+esc(rowTime(last?last.at:th.at))+'</span>'
      +(th.unread>0?'<span class="ch-badge">'+(th.unread>99?"99+":th.unread)+'</span>':'')
      +'</span></button>';
  }

  /* =================== ПЕРЕПИСКА =================== */
  function openThread(tid){
    var th=threadById(tid); if(!th){ renderList(); return; }
    S.view="thread"; S.tid=tid; S.msgs=[]; S.more=false; S.msgsLoaded=false; S.stick=true;
    th.unread=0;
    renderThread();
    loadMsgs(tid).then(function(r){
      if(!alive() || S.tid!==tid) return;
      if(r&&r.ok){ S.msgs=r.items||[]; S.readers=r.readers||[]; S.more=!!r.more; S.msgsLoaded=true; renderMsgs(); scrollBottom(); }
      else sdk.ui.toast(t("errLoad"));
    }).catch(function(){ if(alive()) sdk.ui.toast(t("errLoad")); });
  }
  function renderThread(){
    var th=threadById(S.tid); if(!th) return;
    /* переписка — ПОЛНОЭКРАННАЯ (как чат в WhatsApp): прячем нижнее меню (иначе при открытой
       клавиатуре fixed-бар всплывает над ней и накладывается на композер) и разворачиваем слой
       на всю высоту (.ch-thread = 100dvh, без резерва под бар). Назад → renderList вернёт бар. */
    if(E.app) E.app.classList.add("ch-thread");
    if(sdk&&sdk.ui&&sdk.ui.hud) sdk.ui.hud({hidden:true});
    var names=(th.members||[]).map(function(m){ return m.id===S.me?t("you"):m.name; });
    var sub=th.kind==="group" ? t("members",{names:names.join(", ")}) : t("subtitle");
    var h='<div class="ch-head"><button class="back" id="chToList" tabindex="-1" aria-label="'+esc(sdk.i18n.t("common.back"))+'">'+BACK_IC+'</button>'
      +'<span class="ava">'+threadEmoji(th)+'</span>'
      +'<div class="ch-head-main"><div class="ch-title">'+esc(threadName(th))+'</div>'
      +'<div class="ch-sub">'+esc(sub)+'</div></div></div>';
    if(th.ro) h+='<div class="ch-ro">👁 '+esc(t("ro"))+'</div>';
    h+='<div class="ch-msgs" id="chMsgs"></div>';
    if(!th.ro && sdk.can("edit")){
      /* tabindex="-1" на кнопках: чтобы поле было ЕДИНСТВЕННЫМ навигируемым элементом и
         клавиатура не рисовала стрелки «предыдущее/следующее поле». Файл-инпут НЕ держим в
         разметке постоянно (это второй <input> → клавиатура считает его полем и даёт стрелки):
         создаём его на лету по тапу камеры (openFilePicker). */
      h+='<div class="ch-comp" id="chComp">'
        +'<div class="ch-prev" id="chPrev" style="display:none"><img id="chPrevImg" alt=""><button class="px" id="chPrevX" tabindex="-1" aria-label="✕">✕</button></div>'
        +'<div class="ch-comp-row">'
        +'<button class="cbtn" id="chPhotoPick" tabindex="-1" aria-label="'+esc(t("addPhoto"))+'">'+CAM_IC+'</button>'
        +'<div id="chInput" class="ch-input" contenteditable="true" role="textbox" aria-multiline="true"'
          +' aria-label="'+esc(t("write"))+'" data-ph="'+esc(t("write"))+'"'
          +' enterkeyhint="send" inputmode="text" autocapitalize="sentences" autocorrect="on" spellcheck="true" translate="no"></div>'
        +'<button class="cbtn send off" id="chSend" tabindex="-1" aria-label="'+esc(t("send"))+'">'+SEND_IC+'</button>'
        +'</div>'
        +'</div>';
    }
    E.wrap.innerHTML=h;
    E.msgs=E.wrap.querySelector("#chMsgs");
    E.input=E.wrap.querySelector("#chInput");
    if(E.msgs) E.msgs.addEventListener("scroll",function(){ S.stick=nearBottom(); },{passive:true});
    if(E.input){
      E.input.addEventListener("beforeinput",onBeforeInput);
      E.input.addEventListener("input",onComposerInput);
      E.input.addEventListener("keydown",onComposerKey);
      E.input.addEventListener("paste",onComposerPaste);
    }
    renderMsgs();
    vpApply(); kbKick();
  }
  /* статус МОЕГО сообщения по маркерам читателей (S.readers): read = кто-то прочитал
     (last_read_id >= id); delivered = кто-то был в сети после отправки (seen_at >= времени) */
  function msgStatus(m){
    var rs=S.readers||[], i, read=false, deliv=false;
    for(i=0;i<rs.length;i++){
      if(rs[i].lri>=m.id) read=true;
      if(rs[i].sat && rs[i].sat>=m.at) deliv=true;
    }
    return read?"read":(deliv?"delivered":"sent");
  }
  function msgTick(m){
    var st=msgStatus(m);
    return '<span class="rtk rtk-'+st+'" aria-hidden="true">'+(st==="sent"?CHECK_ONE:CHECK_TWO)+'</span>';
  }
  function msgHtml(m, group){
    var mine=m.uid===S.me;
    if(m.del) return '<div class="msg sys'+(mine?" me":"")+'">🚫 '+esc(t("deleted"))+'</div>';
    var h='<div class="msg'+(mine?" me":"")+(m.photo?" ph":"")+'" data-mid="'+m.id+'"'+(mine?' data-mine="1"':'')+'>';
    if(!mine && group) h+='<div class="nm" style="color:'+nameVar(m.uid)+'">'+esc(m.name)+'</div>';
    if(m.photo) h+='<img src="'+esc(m.photo)+'" alt="'+esc(t("photoWord"))+'" loading="lazy" data-full="'+esc(m.photo)+'">';
    if(m.body) h+='<div class="bd">'+esc(m.body)+'</div>';
    h+='<div class="mt">'+esc(hhmm(m.at))+(mine?msgTick(m):"")+'</div></div>';
    return h;
  }
  function renderMsgs(){
    if(!E.msgs) return;
    var th=threadById(S.tid), group=th&&th.kind==="group";
    /* распорка с margin-top:auto прижимает редкие сообщения к низу, но НЕ обрезает верх
       при переполнении (в отличие от justify-content:flex-end — там не доскроллить вверх) */
    var h='<div class="ch-msgs-top"></div>', lastDay="", i, m;
    if(S.more) h+='<button class="ch-older" id="chOlder">'+esc(t("older"))+'</button>';
    if(S.msgsLoaded && !S.msgs.length) h+='<div class="ch-empty in"><div class="e">'+BUBBLE_E+'</div><p>'+esc(t("first"))+'</p></div>';
    for(i=0;i<S.msgs.length;i++){
      m=S.msgs[i];
      var dk=dayKey(m.at);
      if(dk!==lastDay){ lastDay=dk; h+='<div class="ch-day">'+esc(dayLabel(m.at))+'</div>'; }
      h+=msgHtml(m, group);
    }
    E.msgs.innerHTML=h;
    /* фото грузятся лениво и меняют высоту — держим низ, если пользователь и так внизу */
    var imgs=E.msgs.querySelectorAll(".msg img"), j;
    for(j=0;j<imgs.length;j++){ imgs[j].addEventListener("load",function(){ if(alive()&&S.stick) scrollBottom(); },{once:true}); }
  }

  /* единственный скроллер — лента (или список); НЕ окно (тело заблокировано) */
  function scrollBottom(){ var s=E.msgs; if(s){ try{ s.scrollTop=s.scrollHeight; }catch(e){} } }
  function nearBottom(){
    var s=E.msgs; if(!s) return true;
    return (s.scrollHeight - s.scrollTop - s.clientHeight) < 240;
  }

  /* ---- композер (contenteditable): только текст ---- */
  function composerText(){ return E.input ? (E.input.innerText||"").replace(/ /g," ") : ""; }
  function clearComposer(){ if(E.input){ E.input.innerHTML=""; if(document.activeElement===E.input) placeCaretEnd(); } updateSendState(); }
  function placeCaretEnd(){
    if(!E.input) return;
    try{ var r=document.createRange(); r.selectNodeContents(E.input); r.collapse(false);
      var sel=window.getSelection(); sel.removeAllRanges(); sel.addRange(r); }catch(e){}
  }
  /* блокируем ввод сверх лимита (печать); вставка режется в onComposerPaste */
  function onBeforeInput(e){
    if(!e.inputType || e.inputType.indexOf("insert")!==0) return;
    if(e.inputType==="insertFromPaste") return; /* обработаем в paste */
    var add=e.data?e.data.length:(e.inputType==="insertLineBreak"||e.inputType==="insertParagraph"?1:0);
    if(add>0 && E.input.innerText.length+add>MAXLEN) e.preventDefault();
  }
  function onComposerInput(){
    if(!E.input) return;
    /* contenteditable иногда оставляет <br>/<div> после очистки — нормализуем, чтобы :empty показал плейсхолдер */
    if(!E.input.textContent.replace(/​/g,"").trim()){ if(E.input.innerHTML!=="") E.input.innerHTML=""; }
    updateSendState();
    kbKick(); /* набор меняет панель автодополнения над клавиатурой → высота vv плывёт без resize-события */
  }
  function onComposerKey(e){
    if(e.key==="Enter" && !e.shiftKey && !(e.isComposing||e.keyCode===229)){
      e.preventDefault(); doSend();
    }
  }
  function onComposerPaste(e){
    e.preventDefault();
    var cd=e.clipboardData||window.clipboardData;
    var txt=cd?(cd.getData("text/plain")||""):"";
    if(!txt) return;
    var room=MAXLEN-E.input.innerText.length;
    if(room<=0) return;
    if(txt.length>room) txt=txt.slice(0,room);
    try{ document.execCommand("insertText",false,txt); }
    catch(e2){ E.input.appendChild(document.createTextNode(txt)); placeCaretEnd(); }
    onComposerInput();
  }
  function updateSendState(){
    var b=E.wrap?E.wrap.querySelector("#chSend"):null;
    if(!b) return;
    var has=(composerText().trim()!=="") || !!S.photo;
    b.classList.toggle("off", !has || !!S.sending);
    b.setAttribute("aria-disabled", (!has||S.sending)?"true":"false");
  }

  /* ---- отправка ---- */
  function doSend(){
    if(S.sending) return;
    var body=composerText().trim();
    var ph=S.photo;
    if(!body && !ph) return;
    S.sending=true; setSending(true);
    var p=ph ? sdk.media.upload(ph.dataUrl,"chat").then(function(r){
      if(!r || !r.path) throw new Error("upload");
      return r.path;
    }) : Promise.resolve(null);
    p.then(function(path){
      return api("send",{itemId:S.tid, data:{body:body, photo:path||undefined}});
    }).then(function(r){
      S.sending=false; if(!alive()) return;
      setSending(false);
      if(!(r&&r.ok&&r.item)){ sdk.ui.toast(t("errSend")); return; }
      clearComposer();
      clearPhoto();
      S.msgs.push(r.item);
      var th=threadById(S.tid);
      if(th){ th.last={uid:r.item.uid,name:r.item.name,body:r.item.body,photo:r.item.photo?1:0,at:r.item.at}; th.at=r.item.at; }
      S.stick=true; renderMsgs(); scrollBottom();
      /* клавиатура остаётся открытой (как в WhatsApp): фокус удержан pointerdown'ом на кнопке;
         фолбэк для Android/десктопа — если фокус всё же слетел, вернуть его в поле. */
      if(E.input && document.activeElement!==E.input){ try{ E.input.focus(); placeCaretEnd(); }catch(e){} }
      sdk.ui.haptics(6);
      sdk.events.track("message_sent_ui",{thread:S.tid, photo:r.item.photo?1:0});
    }).catch(function(e){
      S.sending=false; if(!alive()) return;
      setSending(false);
      sdk.ui.toast(t(String(e&&e.message)==="upload"?"uploadFail":"errSend"));
    });
  }
  function setSending(on){
    var b=E.wrap.querySelector("#chSend");
    if(b){ b.classList.toggle("busy",!!on); }
    updateSendState();
  }
  function pickPhoto(file){
    if(!file) return;
    var reader=new FileReader();
    reader.onload=function(ev){
      var img=new Image();
      img.onload=function(){
        var max=900,w=img.width,h=img.height;
        if(w>h&&w>max){ h=Math.round(h*max/w); w=max; } else if(h>=w&&h>max){ w=Math.round(w*max/h); h=max; }
        var dataUrl;
        try{ var cv=document.createElement("canvas"); cv.width=w; cv.height=h; cv.getContext("2d").drawImage(img,0,0,w,h); dataUrl=cv.toDataURL("image/jpeg",0.82); }
        catch(e){ dataUrl=ev.target.result; }
        if(!alive()) return;
        S.photo={dataUrl:dataUrl};
        var pv=E.wrap.querySelector("#chPrev"), pi=E.wrap.querySelector("#chPrevImg");
        if(pv&&pi){ pi.src=dataUrl; pv.style.display="flex"; }
        updateSendState();
      };
      img.src=ev.target.result;
    };
    reader.readAsDataURL(file);
  }
  function clearPhoto(){
    S.photo=null;
    var pv=E.wrap.querySelector("#chPrev"); if(pv) pv.style.display="none";
    updateSendState();
  }

  /* ---- лайтбокс фото: шторка оболочки (свой fixed внутри слоя ломается transform-сдвигом) ---- */
  function openLightbox(src){
    if(S.sheet) return;
    var node=document.createElement("div");
    node.innerHTML='<img class="ch-lbimg" src="'+esc(src)+'" alt="">';
    var sh=sdk.ui.sheet(node);
    S.sheet=sh; /* refresh() ждёт закрытия и сам видит снятый overlay */
    node.querySelector("img").addEventListener("click",function(){ S.sheet=null; try{ sh.close(); }catch(e){} });
  }

  /* ---- клавиатура (iOS/Android): слой повторяет visualViewport ----
     Слой #chApp = position:fixed. ВАЖНО (фикс «сообщения зависают выше» при закрытии и «лишнего
     отступа снизу»): высоту слоя задаём ТОЛЬКО когда поле в фокусе (клавиатура вероятно открыта) —
     тогда слой = видимый вьюпорт (visualViewport.height), низ = верх клавиатуры, offsetTop сдвигаем
     translateY'ем. Как только поле теряет фокус (клавиатуры нет), снимаем inline-высоту → слой на
     весь экран (CSS 100dvh), сообщения и композер возвращаются к самому низу без остаточной щели.
     Класс kb-open — по ФОКУСУ поля (syncKb), не по высоте (на Android resizes-content высотная
     эвристика давала 0). Тело страницы заблокировано html.ch-lock. */
  function syncKb(){ if(E.app) E.app.classList.toggle("kb-open", !!(E.input && document.activeElement===E.input)); }
  /* iOS-PWA: открытие/закрытие клавиатуры схлопывает LAYOUT-вьюпорт ниже экрана (innerHeight<screen).
     Тогда 100dvh треда короче экрана — композер не достаёт до низа («щель снизу», уходила только при
     ВЫХОДЕ из чата, где unmount зовёт fixViewport). Чиним на месте: разворачиваем вьюпорт через
     оболочечный fixViewport (подпорка-скролл). Ей нужна прокручиваемость тела — на время снимаем
     ch-lock и возвращаем в колбэке. #bg фиксирован, слой чата фиксирован → скролл тела невидим.
     Зовётся из vpApply (расфокус в треде); сам себя гасит, если вьюпорт уже полный или идёт разворот. */
  function reExpandViewport(){
    if(!alive() || S.reExpanding) return;
    /* схлопывание layout-вьюпорта — болезнь iOS-STANDALONE (PWA с иконки). В обычном браузере
       и на Android guard «вьюпорт полный» по screen.height всегда ложный (screen включает
       системные бары) — без этого гейта цикл fixViewport гонялся бы вхолостую на каждый mount/
       renderList (ревью 2026-06-10). */
    if(!RT_STANDALONE) return;
    if(!(sdk&&sdk.ui&&sdk.ui.fixViewport)) return;
    if(!(screen&&screen.height) || window.innerHeight>=screen.height-2) return; /* вьюпорт уже полный — нечего чинить */
    S.reExpanding=true;
    document.documentElement.classList.remove("ch-lock"); /* fixViewport разворачивает скроллом — тело должно быть прокручиваемо */
    sdk.ui.fixViewport(function(){
      if(alive()) document.documentElement.classList.add("ch-lock"); /* вернуть блок прокрутки тела за слоем */
      if(S) S.reExpanding=false;
    });
  }
  /* vpApply: применяет visualViewport к слою. Пишет стили ТОЛЬКО при изменении значений
     (кадровый цикл kbFrame зовёт её каждый кадр — без этого был бы layout-трэш) и возвращает,
     изменилось ли что-то (цикл по этому продлевает слежение). */
  function vpApply(){
    if(!alive() || !E.app) return false;
    var vv=window.visualViewport;
    var focused=!!(E.input && document.activeElement===E.input);
    var h="", tr="";
    if(vv && focused){
      h=Math.round(vv.height)+"px";
      var off=Math.round(vv.offsetTop||0);
      tr = off>0 ? "translateY("+off+"px)" : "";
    } /* нет фокуса → пустые инлайны = полный экран (CSS 100dvh) */
    var changed=(h!==S.apH)||(tr!==S.apTr);
    if(changed){ E.app.style.height=h; E.app.style.transform=tr; S.apH=h; S.apTr=tr; }
    /* клавиатуры нет: добить схлопнутый iOS-вьюпорт в ЛЮБОМ виде. Раньше — только в треде,
       и «назад» из переписки с открытой клавиатурой (blur догонял уже в списке, S.view="list")
       оставлял редкую «щель» снизу до выхода из чата (фидбек Джеффа 2026-06-10).
       reExpandViewport сам гасится, если вьюпорт полный или разворот уже идёт. */
    if(!focused) reExpandViewport();
    syncKb();
    /* доскролл при открытии делает focusin (таймаут 350мс) + kbFrame держит низ во время анимации */
    S.kbOpen=focused;
    return changed;
  }
  /* ---- следящий цикл клавиатуры (фикс 2026-06-10, фидбек Джеффа: «статтер» при выезде
     клавиатуры; редкий «композер выше курсора, виден маркер версии, зазор над клавиатурой»).
     Снимок vv по одному событию НЕНАДЁЖЕН в iOS-PWA: финальный resize после анимации клавиатуры
     (и смены панели автодополнения) иногда не приходит — слой замирал со старой высотой, между
     композером и клавиатурой светилась страница. Вместо снимков короткий rAF-цикл: каждый кадр
     перечитывает vv и применяет только изменения. Пока значения едут — цикл продлевает себя сам
     (слой движется ВМЕСТЕ с клавиатурой, рывка нет); затихли — гаснет через KB_TAIL мс, и
     пропущенное событие добирается следующим кадром, а не висит до выхода из чата. */
  var KB_TAIL=350;
  /* performance.now() (НЕ Date.now): монотонные часы — перевод системного времени на устройстве
     не оставит цикл крутиться часами (ревью 2026-06-10) */
  function kbNow(){ return (window.performance&&performance.now)?performance.now():Date.now(); }
  function kbKick(){
    if(!S || !alive()) return;
    S.kbUntil=kbNow()+KB_TAIL;
    if(!S.kbRaf) S.kbRaf=requestAnimationFrame(kbFrame);
  }
  function kbFrame(){
    if(!S) return;
    S.kbRaf=null;
    if(!alive() || !E.app) return;
    if(vpApply()){
      S.kbUntil=kbNow()+KB_TAIL; /* значения ещё меняются — следим дальше */
      if(S.stick && S.kbOpen) scrollBottom(); /* лента прилипла к низу — держим последнее сообщение видимым, пока слой едет */
    }
    if(kbNow()<S.kbUntil) S.kbRaf=requestAnimationFrame(kbFrame);
  }
  /* файл-инпут создаём НА ЛЕТУ (а не держим скрытый <input> в разметке): постоянный второй
     <input> клавиатура считает полем и рисует стрелки «пред./след.». Жест клика сохраняется. */
  function openFilePicker(){
    var inp=document.createElement("input");
    inp.type="file"; inp.accept="image/*";
    inp.style.cssText="position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0";
    inp.addEventListener("change",function(){
      if(inp.files && inp.files[0]) pickPhoto(inp.files[0]);
      if(inp.parentNode) inp.parentNode.removeChild(inp);
    });
    document.body.appendChild(inp);
    inp.click();
  }
  function kbSetup(){
    if(S.vv) return;
    S.vv=kbKick; /* события только БУДЯТ следящий цикл; применяет значения сам цикл (kbFrame) */
    if(window.visualViewport){
      window.visualViewport.addEventListener("resize",S.vv);
      window.visualViewport.addEventListener("scroll",S.vv);
    }
    window.addEventListener("orientationchange",S.vv);
  }
  function kbTeardown(){
    if(!S || !S.vv) return;
    if(window.visualViewport){
      window.visualViewport.removeEventListener("resize",S.vv);
      window.visualViewport.removeEventListener("scroll",S.vv);
    }
    window.removeEventListener("orientationchange",S.vv);
    S.vv=null;
    if(S.kbRaf){ try{ cancelAnimationFrame(S.kbRaf); }catch(e){} S.kbRaf=null; }
  }

  /* ---- удаление своего сообщения ---- */
  function askDelete(mid){
    sdk.ui.confirm({title:t("delTitle"), text:t("delText"), ok:t("delYes")}).then(function(yes){
      if(!yes || !alive()) return;
      api("msg_delete",{itemId:mid}).then(function(r){
        if(!alive()) return;
        if(r&&r.ok){
          var i; for(i=0;i<S.msgs.length;i++){ if(S.msgs[i].id===mid){ S.msgs[i].del=1; S.msgs[i].body=""; S.msgs[i].photo=null; } }
          renderMsgs();
        }
      }).catch(function(){});
    });
  }

  /* инфо о доставке/прочтении СВОЕГО сообщения + удаление (по long-press). 1:1 — одна строка,
     группа — по строке на участника (кроме меня) с его статусом и временем прочтения. */
  function openMsgInfo(mid){
    if(S.sheet) return;
    var m=null,i; for(i=0;i<S.msgs.length;i++){ if(S.msgs[i].id===mid){ m=S.msgs[i]; break; } }
    if(!m || m.del) return;
    var th=threadById(S.tid), group=th&&th.kind==="group", rs=S.readers||[];
    function row(name, st, rat){
      var ic=st==="sent"?CHECK_ONE:CHECK_TWO;
      var txt;
      if(st==="read") txt=group ? esc(name)+" · "+esc(t("stRead"))+" "+esc(hhmm(rat||m.at)) : esc(t("readAt",{t:hhmm(rat||m.at)}));
      else if(st==="delivered") txt=group ? esc(name)+" · "+esc(t("stDelivered")) : esc(t("stDelivered"));
      else txt=group ? esc(name)+" · "+esc(t("stSent")) : esc(t("stSent"));
      return '<div class="rcpt-row"><span class="rtk rtk-'+st+'">'+ic+'</span><span class="rcpt-tx">'+txt+'</span></div>';
    }
    var rowsH="";
    if(group){
      if(!rs.length) rowsH=row("", "sent", null);
      else rs.forEach(function(r){ rowsH+=row(r.name, r.lri>=m.id?"read":(r.sat&&r.sat>=m.at?"delivered":"sent"), r.rat); });
    } else {
      var r0=rs[0]; rowsH=row(r0?r0.name:"", msgStatus(m), r0?r0.rat:null);
    }
    var node=document.createElement("div");
    node.innerHTML='<h2>'+esc(t("infoTitle"))+'</h2><div class="rcpt-list">'+rowsH+'</div>'
      +'<div class="sheet-actions"><button class="btn btn-cancel" id="rcptClose">'+esc(t("infoClose"))+'</button>'
      +'<button class="btn ch-del" id="rcptDel">'+esc(t("delYes"))+'</button></div>';
    var sh=sdk.ui.sheet(node); S.sheet=sh;
    function close(){ S.sheet=null; try{ sh.close(); }catch(e){} }
    node.querySelector("#rcptClose").addEventListener("click",close);
    node.querySelector("#rcptDel").addEventListener("click",function(){ close(); askDelete(mid); });
  }

  /* =================== НОВЫЙ ЧАТ =================== */
  function openNewChat(){
    if(S.sheet) return;
    var sel={};
    var node=document.createElement("div");
    function listHtml(){
      return S.roster.filter(function(r){ return r.id!==S.me; }).map(function(r){
        return '<button class="ch-pick'+(sel[r.id]?" on":"")+'" data-uid="'+r.id+'">'
          +'<span class="ava">'+kindEmoji(r.kind)+'</span><span class="nm">'+esc(r.name)+'</span>'
          +'<span class="ck">'+(sel[r.id]?"✓":"")+'</span></button>';
      }).join("");
    }
    function selCount(){ return Object.keys(sel).length; }
    function sync(){
      node.querySelector(".ch-picks").innerHTML=listHtml();
      var n=selCount();
      var ti=node.querySelector("#chGroupTitle");
      ti.style.display=n>=2?"block":"none";
      var b=node.querySelector("#chCreate");
      b.disabled=n===0;
      b.textContent=n>=2?t("createGroup"):t("startChat");
    }
    node.innerHTML='<h2>'+esc(t("pickTitle"))+'</h2>'
      +'<div class="ch-picks"></div>'
      +'<input type="text" id="chGroupTitle" class="ch-ginput" maxlength="60" placeholder="'+esc(t("groupPh"))+'" style="display:none">'
      +'<div class="sheet-actions"><button class="btn btn-cancel" id="chCancel">'+esc(sdk.i18n.t("common.cancel"))+'</button>'
      +'<button class="btn btn-primary" id="chCreate" disabled>'+esc(t("startChat"))+'</button></div>';
    node.addEventListener("click",function(e){
      var p=e.target.closest(".ch-pick");
      if(p){ var id=parseInt(p.getAttribute("data-uid"),10); if(sel[id]) delete sel[id]; else sel[id]=1; sync(); }
    });
    var sh=sdk.ui.sheet(node);
    S.sheet=sh; /* grip/оверлей закрывают шторку мимо нас — refresh() сам видит снятый из DOM overlay */
    function closeSheet(){ S.sheet=null; try{ sh.close(); }catch(e){} }
    node.querySelector("#chCancel").addEventListener("click",closeSheet);
    node.querySelector("#chCreate").addEventListener("click",function(){
      var ids=Object.keys(sel).map(Number);
      if(!ids.length) return;
      var title="";
      if(ids.length>=2){
        title=(node.querySelector("#chGroupTitle").value||"").trim();
        if(!title){ sdk.ui.toast(t("needTitle")); return; }
      }
      var b=node.querySelector("#chCreate"); b.disabled=true;
      api("create",{data:{members:ids, title:title}}).then(function(r){
        closeSheet();
        if(!alive()) return;
        if(r&&r.ok&&r.thread){
          loadThreads().then(function(){ if(alive()) openThread(r.thread); });
        } else sdk.ui.toast(t("errSend"));
      }).catch(function(){ closeSheet(); if(alive()) sdk.ui.toast(t("errSend")); });
    });
    sync();
  }

  /* =================== ЖИВОЕ ОБНОВЛЕНИЕ =================== */
  function refresh(){
    if(!alive()) return true;
    if(S.sheet && !(S.sheet.overlay && S.sheet.overlay.parentNode)) S.sheet=null; /* шторку закрыли grip'ом/оверлеем */
    if(S.sending || S.sheet || S.photo) return false;
    if(composerText().trim()!=="") return false; /* черновик не затираем */
    if(S.view==="thread"){
      var tid=S.tid, stick=nearBottom();
      loadMsgs(tid).then(function(r){
        if(!alive() || S.tid!==tid || !(r&&r.ok)) return;
        var items=r.items||[], newReaders=r.readers||[];
        var oldLast=S.msgs.length?S.msgs[S.msgs.length-1].id:0;
        var newLast=items.length?items[items.length-1].id:0;
        var changed = items.length!==S.msgs.length || newLast!==oldLast || delCount(items)!==delCount(S.msgs);
        /* галочки прочтения меняются БЕЗ изменения списка сообщений — ловим отдельно */
        var rChanged = readersFp(newReaders)!==readersFp(S.readers);
        if(changed || rChanged){
          S.msgs=items; S.readers=newReaders; S.more=!!r.more; S.msgsLoaded=true;
          renderMsgs();
          if(newLast>oldLast && stick) scrollBottom();
        }
      }).catch(function(){});
      loadThreads().catch(function(){});
    } else {
      loadThreads().then(function(){ if(alive() && S.view==="list") renderList(); }).catch(function(){});
    }
    return true;
  }
  function delCount(arr){ var n=0,i; for(i=0;i<arr.length;i++) if(arr[i].del) n++; return n; }
  /* отпечаток маркеров читателей: меняется при чтении/появлении в сети → пере-рисовать галочки */
  function readersFp(rs){ return (rs||[]).map(function(r){ return r.uid+":"+r.lri+":"+(r.sat||0); }).join(","); }

  /* =================== MOUNT / UNMOUNT =================== */
  function mount(rootEl, theSdk){
    sdk=theSdk; root=rootEl;
    S={ alive:true, view:"list", tid:null, threads:[], roster:[], me:0, isParent:false,
        family:true, loaded:false, msgs:[], readers:[], more:false, msgsLoaded:false,
        sending:false, photo:null, sheet:null, pendingTid:null, vv:null, ty:null, stick:true, kbOpen:false,
        reExpanding:false, lpTimer:null, lpX:0, lpY:0, suppressClick:false,
        kbRaf:null, kbUntil:0, apH:"", apTr:"" /* следящий цикл клавиатуры + последние применённые стили слоя */ };
    E={};
    /* guardrails: детский бар «Домой» виден и в чате (универсально) — слой .ch-app укорочен на его
       высоту (module.css), композер сидит над баром; раньше тут было hud({hidden:true}), убрано.
       Старый HUD-счётчик и так скрыт CSS на экранах модулей; колокольчик закрыт слоем .ch-app. */

    /* слой чата живёт в <body>, НЕ в .view-секции (см. шапку файла). Снимаем возможный осколок. */
    var old=document.getElementById("chApp"); if(old&&old.parentNode) old.parentNode.removeChild(old);
    var app=document.createElement("div");
    app.id="chApp"; app.className="ch-app"; app.setAttribute("data-mod","chat");
    app.innerHTML='<div class="ch" id="chWrap"></div>';
    document.body.appendChild(app);
    E.app=app;
    E.wrap=app.querySelector("#chWrap");
    document.documentElement.classList.add("ch-lock"); /* блок прокрутки тела позади слоя */

    /* делегирование всех кликов — на слой (живёт всю жизнь модуля, слушатели не копятся) */
    E.app.addEventListener("click",function(e){
      if(S.suppressClick){ S.suppressClick=false; e.preventDefault(); e.stopPropagation(); return; } /* был long-press */
      if(e.target.closest("#chBack")){ sdk.ui.back(); return; }
      if(e.target.closest("#chToList")){ S.view="list"; S.tid=null; renderList(); loadThreads().then(function(){ if(alive()&&S.view==="list") renderList(); }).catch(function(){}); return; }
      if(e.target.closest("#chNew")||e.target.closest("#chNew2")){ openNewChat(); return; }
      var row=e.target.closest(".ch-row");
      if(row){ openThread(parseInt(row.getAttribute("data-tid"),10)); return; }
      if(e.target.closest("#chOlder")){
        var first=S.msgs.length?S.msgs[0].id:0;
        if(first){
          var sBefore=E.msgs?E.msgs.scrollHeight:0, tBefore=E.msgs?E.msgs.scrollTop:0;
          loadMsgs(S.tid,first).then(function(r){
            if(!alive()||!(r&&r.ok)) return;
            S.msgs=(r.items||[]).concat(S.msgs); if(r.readers) S.readers=r.readers; S.more=!!r.more; renderMsgs();
            if(E.msgs) E.msgs.scrollTop = tBefore + (E.msgs.scrollHeight - sBefore); /* держим место */
          }).catch(function(){});
        }
        return;
      }
      if(e.target.closest("#chPhotoPick")){ openFilePicker(); return; }
      if(e.target.closest("#chPrevX")){ clearPhoto(); return; }
      if(e.target.closest("#chSend")){ doSend(); return; }
      var img=e.target.closest(".msg img");
      if(img){ openLightbox(img.getAttribute("data-full")||img.src); return; }
      /* тап по своему сообщению больше НЕ удаляет (был риск случайного): статус прочтения и
         удаление — по long-press, см. pointer-слушатели ниже → openMsgInfo */
    });
    /* long-press по своему сообщению → инфо «доставлено/прочитано» + удаление (pointer = мышь+тач) */
    E.app.addEventListener("pointerdown",function(e){
      var msg=e.target.closest && e.target.closest('.msg[data-mine]');
      if(!msg || msg.classList.contains("sys")) return;
      var mid=parseInt(msg.getAttribute("data-mid"),10);
      S.lpX=e.clientX; S.lpY=e.clientY;
      if(S.lpTimer) clearTimeout(S.lpTimer);
      S.lpTimer=setTimeout(function(){ S.lpTimer=null; if(alive()){ S.suppressClick=true; sdk.ui.haptics&&sdk.ui.haptics(8); openMsgInfo(mid); } },480);
    });
    E.app.addEventListener("pointermove",function(e){
      if(S.lpTimer && (Math.abs(e.clientX-S.lpX)>10 || Math.abs(e.clientY-S.lpY)>10)){ clearTimeout(S.lpTimer); S.lpTimer=null; }
    });
    function cancelLp(){ if(S.lpTimer){ clearTimeout(S.lpTimer); S.lpTimer=null; } }
    E.app.addEventListener("pointerup",cancelLp);
    E.app.addEventListener("pointercancel",cancelLp);
    /* тап по кнопке композера НЕ должен уводить фокус с поля (иначе клавиатура гаснет при отправке —
       как в WhatsApp, она остаётся открытой). preventDefault держит фокус в contenteditable; click
       всё равно проходит. iOS Safari синтезирует mousedown с задержкой и НЕ гасит им фокус надёжно,
       поэтому ведущий слушатель — pointerdown (iOS поддерживает с 13): он бьёт раньше и держит фокус.
       mousedown оставлен как фолбэк для старых вебвью. Оба — на саму кнопку, НЕ на поле/ленту. */
    E.app.addEventListener("pointerdown",function(e){
      if(e.target.closest && e.target.closest("#chComp .cbtn")) e.preventDefault();
    });
    E.app.addEventListener("mousedown",function(e){
      if(e.target.closest && e.target.closest("#chComp .cbtn")) e.preventDefault();
    });
    /* свайп по ленте прячет клавиатуру (blur); свайп по самому композеру не считается */
    E.app.addEventListener("touchstart",function(e){ S.ty=e.touches&&e.touches[0]?e.touches[0].clientY:null; },{passive:true});
    E.app.addEventListener("touchmove",function(e){
      if(S.ty==null || !e.touches || !e.touches[0]) return;
      var ae=document.activeElement;
      if(!ae || ae.id!=="chInput") return;
      if(e.target && e.target.closest && e.target.closest("#chComp")) return;
      if(Math.abs(e.touches[0].clientY-S.ty)>28){ try{ ae.blur(); }catch(x){} S.ty=null; }
    },{passive:true});
    /* фокус в поле = клавиатура открыта → отметить kb-open (надёжнее любой высотной эвристики)
       и доскроллить к последним после выезда клавиатуры */
    E.app.addEventListener("focusin",function(e){
      if(e.target && e.target.id==="chInput"){
        if(E.app) E.app.classList.add("kb-open"); S.kbOpen=true;
        kbKick(); /* следящий цикл ведёт слой через ВСЮ анимацию клавиатуры (без рывка-снапа) */
        setTimeout(function(){ if(alive()) scrollBottom(); },350); /* допин ленты после выезда */
      }
    });
    E.app.addEventListener("focusout",function(e){
      if(e.target && e.target.id==="chInput"){
        /* задержка: при отправке фокус удерживается (mousedown preventDefault), ложного закрытия нет */
        setTimeout(function(){ if(alive() && document.activeElement!==E.input){ if(E.app) E.app.classList.remove("kb-open"); S.kbOpen=false; kbKick(); } },80);
      }
    });
    kbSetup();
    vpApply();

    if(sdk.isDemo()){
      E.wrap.innerHTML='<div class="ch-head"><button class="back" id="chBack" aria-label="'+esc(sdk.i18n.t("common.back"))+'">'+BACK_IC+'</button>'
        +'<div class="ch-head-main"><div class="ch-title">'+BUBBLE_E+' '+esc(sdk.i18n.t("tile.chat"))+'</div>'
        +'<div class="ch-sub">'+esc(t("subtitle"))+'</div></div></div>'
        +'<div class="ch-scroll"><div class="ch-empty"><div class="e">'+BUBBLE_E+'</div><p>'+esc(t("demo"))+'</p></div></div>';
      return;
    }
    renderList();
    loadThreads().then(function(){
      if(!alive()) return;
      if(S.pendingTid && threadById(S.pendingTid)){ var x=S.pendingTid; S.pendingTid=null; openThread(x); }
      else if(S.view==="list") renderList();
    }).catch(function(){ if(alive()){ S.loaded=true; renderList(); sdk.ui.toast(t("errLoad")); } });
  }
  function unmount(){
    if(S) S.alive=false;
    if(S && S.lpTimer){ clearTimeout(S.lpTimer); S.lpTimer=null; } /* long-press мог быть в полёте — иначе колбэк тронет S=null */
    kbTeardown(); /* visualViewport — глобальные слушатели, снять обязательно */
    if(S && S.sheet){ try{ S.sheet.close(); }catch(e){} S.sheet=null; }
    /* переписка прячет нижнее меню — вернуть его при выходе (на случай выхода прямо из треда) */
    if(sdk&&sdk.ui&&sdk.ui.hud){ try{ sdk.ui.hud({hidden:false}); }catch(e){} }
    document.documentElement.classList.remove("ch-lock"); /* тело снова прокручиваемо */
    if(E.app && E.app.parentNode) E.app.parentNode.removeChild(E.app); /* слой #chApp из <body> */
    /* iOS-PWA: ch-lock (overflow:hidden) + клавиатура могли схлопнуть layout-вьюпорт НИЖЕ экрана —
       тогда нижний бар (fixed bottom:0) застревает выше реального низа, под ним native-полоса = «щель»
       снизу, держится до перезагрузки. Тело снова прокручиваемо → просим оболочку заново развернуть
       вьюпорт на полную высоту (сразу + следующим кадром + с запасом: iOS пересчитывает асинхронно). */
    var fixVp=(sdk&&sdk.ui&&sdk.ui.fixViewport)?sdk.ui.fixViewport:null;
    if(fixVp){
      try{ fixVp(); }catch(e){}
      requestAnimationFrame(function(){ try{ fixVp(); }catch(e){} });
      setTimeout(function(){ try{ fixVp(); }catch(e){} },300);
    }
    S=null; E={};
  }
  /* тап по оповещению: открыть конкретную переписку (link {module:"chat", item:"<tid>"}) */
  function link(lk){
    if(!lk || !lk.item || !S) return;
    var tid=parseInt(lk.item,10); if(!tid) return;
    if(!S.loaded){ S.pendingTid=tid; return; }
    if(threadById(tid)) openThread(tid);
    else loadThreads().then(function(){ if(alive() && threadById(tid)) openThread(tid); }).catch(function(){});
  }

  RobTop.register({ id:"chat", mount:mount, unmount:unmount, refresh:refresh, link:link, messages:MESSAGES });
})();
