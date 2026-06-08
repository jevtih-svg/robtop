/* RobTop — модуль «Задания». ГЛАВНЫЙ хаб всего, что связано с заданиями (канон —
   ГАЙД-задания.md). Общий сервис: отдельная таблица tasks, движок sdk.tasks; блок
   «Задания» в Копилке — лёгкое зеркало того же источника (Копилка = кошелёк).

   РОДИТЕЛЬ (стопка секций): «Ждут проверки» (очередь — выполнения детей + ИХ предложения),
   «Активные и повторяющиеся», «Выполнено» (лог). Создаёт/правит/удаляет задания,
   подтверждает/возвращает выполнение, проверяет предложения ребёнка (правит очки/отклоняет).
   РЕБЁНОК: «Сделать», «На проверке», «Выполнено». Жмёт «Сделал!» (→ на проверку родителю),
   «Предложить задание» — логирует сделанное дело со своей оценкой очков, родитель решает.
   Двусторонние оповещения шлёт движок. Вся логика — в sdk.tasks; модуль только рендерит. */
(function(){
  "use strict";

  var MESSAGES={
    en:{ tasks:{
      subParent:"Everything tasks — assign, review, reward",
      subKid:"Your tasks — do them, earn points, log your own",
      emptyKid:"No tasks yet — ask your parents, or log one you did!",
      emptyParent:"No tasks yet. Create the first one!",
      hudReview:"to review", hudActive:"active", hudDo:"to do", hudWait:"waiting",
      loadFail:"Could not load the tasks", retry:"Try again",
      secReview:"Needs review", secActive:"Active & recurring", secTodo:"To do",
      secWaiting:"Waiting for check", secDone:"Done",
      btnAddTask:"+ New task", btnPropose:"+ Log a task", btnIDid:"I did it!",
      btnReview:"Review", approveBtn:"✓ +{n}", declineA11y:"Return without points",
      chipWaiting:"waiting for check ⏳", chipDone:"done ✓", chipProposed:"proposed +{n}",
      tagProposal:"my idea", proposeSend:"Propose",
      typeRecur:"Repeating", typeOnce:"One-time",
      metaRecur:"🔁 repeats", metaOnce:"1× one-time", doneTimes:"done ×{n}", doneOn:"done {d}",
      claimToast:"Sent to your parents for checking!", returnedToast:"Sent back — try again",
      deniedToast:"Proposal declined", proposedToast:"Sent to your parents!",
      doneToast:"Done!", streakToast:"Win streak: {n} 🔥", bonusToast:"Streak bonus +{n}!",
      newTask:"New task", editTask:"Edit task",
      taskTitlePh:"What needs to be done", taskPtsLbl:"Points for completion",
      proposeTitle:"Log a task you did", proposeTitlePh:"What did you do?",
      proposePtsLbl:"How many points, you think?", proposeHint:"A parent will check it and decide.",
      reviewTitle:"Review proposal", reviewPtsLbl:"Points for this",
      approveAdj:"Approve +{n}", denyBtn:"Decline",
      deleteTask:"Delete task", confirmDel:"Delete the task “{t}”?",
      needTitle:"Write the task name first"
    }},
    ru:{ tasks:{
      subParent:"Всё о заданиях — назначай, проверяй, награждай",
      subKid:"Твои задания — делай, зарабатывай, предлагай свои",
      emptyKid:"Заданий пока нет — попроси родителей или предложи своё!",
      emptyParent:"Заданий пока нет. Создай первое!",
      hudReview:"на проверке", hudActive:"активных", hudDo:"сделать", hudWait:"ждут",
      loadFail:"Не получилось загрузить задания", retry:"Попробовать ещё",
      secReview:"Ждут проверки", secActive:"Активные и повторяющиеся", secTodo:"Сделать",
      secWaiting:"На проверке", secDone:"Выполнено",
      btnAddTask:"+ Новое задание", btnPropose:"+ Предложить задание", btnIDid:"Сделал!",
      btnReview:"Проверить", approveBtn:"✓ +{n}", declineA11y:"Вернуть без очков",
      chipWaiting:"ждёт проверки ⏳", chipDone:"выполнено ✓", chipProposed:"предложено +{n}",
      tagProposal:"моё", proposeSend:"Предложить",
      typeRecur:"Повторяющееся", typeOnce:"Одноразовое",
      metaRecur:"🔁 повторяется", metaOnce:"1× одноразовое", doneTimes:"сделано ×{n}", doneOn:"выполнено {d}",
      claimToast:"Отправлено родителям на проверку!", returnedToast:"Вернули — попробуй ещё",
      deniedToast:"Предложение отклонено", proposedToast:"Отправлено родителям!",
      doneToast:"Готово!", streakToast:"Винстрик: {n} 🔥", bonusToast:"Бонус серии +{n}!",
      newTask:"Новое задание", editTask:"Изменить задание",
      taskTitlePh:"Что нужно сделать", taskPtsLbl:"Очков за выполнение",
      proposeTitle:"Залогируй своё дело", proposeTitlePh:"Что ты сделал(а)?",
      proposePtsLbl:"Сколько очков, по-твоему?", proposeHint:"Родитель проверит и решит.",
      reviewTitle:"Проверить предложение", reviewPtsLbl:"Очки за это",
      approveAdj:"Одобрить +{n}", denyBtn:"Отклонить",
      deleteTask:"Удалить задание", confirmDel:"Удалить задание «{t}»?",
      needTitle:"Сначала напиши название"
    }},
    lv:{ tasks:{
      subParent:"Viss par uzdevumiem — uzdod, pārbaudi, apbalvo",
      subKid:"Tavi uzdevumi — pildi, krāj, piedāvā savus",
      emptyKid:"Uzdevumu vēl nav — palūdz vecākiem vai piedāvā savu!",
      emptyParent:"Uzdevumu vēl nav. Izveido pirmo!",
      hudReview:"pārbaudē", hudActive:"aktīvi", hudDo:"jāizdara", hudWait:"gaida",
      loadFail:"Neizdevās ielādēt uzdevumus", retry:"Mēģināt vēlreiz",
      secReview:"Gaida pārbaudi", secActive:"Aktīvie un atkārtotie", secTodo:"Jāizdara",
      secWaiting:"Pārbaudē", secDone:"Izpildīts",
      btnAddTask:"+ Jauns uzdevums", btnPropose:"+ Piedāvāt uzdevumu", btnIDid:"Izdarīju!",
      btnReview:"Pārbaudīt", approveBtn:"✓ +{n}", declineA11y:"Atgriezt bez punktiem",
      chipWaiting:"gaida pārbaudi ⏳", chipDone:"izpildīts ✓", chipProposed:"piedāvāts +{n}",
      tagProposal:"mans", proposeSend:"Piedāvāt",
      typeRecur:"Atkārtojas", typeOnce:"Vienreizējs",
      metaRecur:"🔁 atkārtojas", metaOnce:"1× vienreizējs", doneTimes:"izpildīts ×{n}", doneOn:"izpildīts {d}",
      claimToast:"Nosūtīts vecākiem pārbaudei!", returnedToast:"Atgriezts — pamēģini vēlreiz",
      deniedToast:"Piedāvājums noraidīts", proposedToast:"Nosūtīts vecākiem!",
      doneToast:"Gatavs!", streakToast:"Uzvaru sērija: {n} 🔥", bonusToast:"Sērijas bonuss +{n}!",
      newTask:"Jauns uzdevums", editTask:"Mainīt uzdevumu",
      taskTitlePh:"Kas jāizdara", taskPtsLbl:"Punkti par izpildi",
      proposeTitle:"Pieraksti savu darbu", proposeTitlePh:"Ko tu izdarīji?",
      proposePtsLbl:"Cik punktu, tavuprāt?", proposeHint:"Vecāks pārbaudīs un izlems.",
      reviewTitle:"Pārbaudīt piedāvājumu", reviewPtsLbl:"Punkti par to",
      approveAdj:"Apstiprināt +{n}", denyBtn:"Noraidīt",
      deleteTask:"Dzēst uzdevumu", confirmDel:"Dzēst uzdevumu “{t}”?",
      needTitle:"Vispirms uzraksti nosaukumu"
    }}
  };

  var CLIP_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="14" height="16" rx="2.5"/><path d="M9 5V4a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 4v1"/><path d="M9 13l2.2 2.2 4.3-4.7"/></svg>';

  var sdk=null, root=null, alive=false, busy=false, curSheet=null;
  var E={};
  var S={ tasks:[], loaded:false, err:false };
  var DONE_CAP=50;

  function esc(s){ return RobTop.util.esc(s); }
  function t(k,p){ return sdk.t(k,p); }
  function title(){ return sdk.i18n.t("tile.tasks"); /* готовый перевод плитки */ }
  function isParent(){ return sdk.role==="parent" || sdk.isDemo(); }
  function isKid(){ return sdk.role!=="parent" || sdk.isDemo(); }
  function taskOf(id){
    for(var i=0;i<S.tasks.length;i++) if(String(S.tasks[i].id)===String(id)) return S.tasks[i];
    return null;
  }
  function fmtDay(ts){ return ts ? sdk.formatDate(ts,{day:"numeric",month:"short"}) : ""; }

  /* ---------- данные: только sdk.tasks ---------- */
  function load(){
    sdk.tasks.list().then(function(items){
      if(!alive) return;
      S.tasks=items||[]; S.loaded=true; S.err=false;
      render();
    }).catch(function(){
      if(!alive) return;
      S.err=true; S.loaded=true; render();
    });
  }

  /* ---------- действия (вся логика — в движке) ---------- */
  function claimTask(tk){ /* ребёнок: «Сделал!» → на проверку */
    if(busy) return; busy=true;
    sdk.tasks.claim(tk).then(function(out){
      busy=false;
      sdk.ui.toast(t(out && out.ok ? "claimToast" : "loadFail"));
      if(out && out.ok) sdk.ui.haptics("light");
      load();
    });
  }
  function approveTask(tk, pts){ /* родитель: подтвердить (+опц. поправка очков) */
    if(busy) return; busy=true;
    sdk.tasks.approve(tk, pts).then(function(out){
      busy=false;
      if(!out || !out.ok){ sdk.ui.toast(t("loadFail")); load(); return; }
      if(out.bonus) sdk.ui.toast(t("bonusToast",{n:out.bonus}));
      else if(out.streak!=null) sdk.ui.toast(t("streakToast",{n:out.streak}));
      else sdk.ui.toast(t("doneToast"));
      sdk.ui.haptics("light");
      load();
    });
  }
  function declineTask(tk){ /* родитель: вернуть проверку выполнения */
    if(busy) return; busy=true;
    sdk.tasks.decline(tk).then(function(out){
      busy=false;
      sdk.ui.toast(t(out && out.ok ? "returnedToast" : "loadFail"));
      load();
    });
  }
  function denyTask(tk){ /* родитель: отклонить предложение ребёнка (исчезает) */
    if(busy) return; busy=true;
    sdk.tasks.deny(tk).then(function(out){
      busy=false;
      sdk.ui.toast(t(out && out.ok ? "deniedToast" : "loadFail"));
      load();
    });
  }
  function deleteTask(tk){
    sdk.ui.confirm({ title:t("confirmDel",{t:tk.title||""}),
                     ok:t("common.delete"), cancel:t("common.cancel") }).then(function(yes){
      if(!yes || busy) return; busy=true;
      sdk.tasks.remove(tk.id).then(function(out){
        busy=false;
        if(!out || !out.ok) sdk.ui.toast(t("loadFail"));
        load();
      });
    });
  }

  /* ---------- шторки ---------- */
  function openTaskSheet(tk){ /* создание/правка задания (родитель) */
    var typ=(tk && tk.type==="once")?"once":"recur";
    var box=document.createElement("div");
    box.innerHTML='<h2>'+esc(t(tk?"editTask":"newTask"))+'</h2>'
      +'<div class="tsk-form">'
        +'<input type="text" id="tskTitle" maxlength="60" placeholder="'+esc(t("taskTitlePh"))+'" value="'+esc(tk?tk.title:"")+'">'
        +'<label class="tsk-lbl" for="tskPts">'+esc(t("taskPtsLbl"))+'</label>'
        +'<input type="number" id="tskPts" inputmode="numeric" min="1" max="1000" value="'+(tk && tk.points>0?tk.points:10)+'">'
        +'<div class="tsk-types">'
          +'<button class="tsk-type'+(typ==="recur"?" on":"")+'" data-t="recur">🔁 '+esc(t("typeRecur"))+'</button>'
          +'<button class="tsk-type'+(typ==="once"?" on":"")+'" data-t="once">1× '+esc(t("typeOnce"))+'</button>'
        +'</div>'
      +'</div>'
      +'<div class="sheet-actions">'
        +(tk?'<button class="btn btn-cancel" id="tskDel">'+esc(t("deleteTask"))+'</button>'
            :'<button class="btn btn-cancel" data-close>'+esc(t("common.cancel"))+'</button>')
        +'<button class="btn btn-primary" id="tskSave">'+esc(t("common.save"))+'</button>'
      +'</div>';
    var ctl=sdk.ui.sheet(box); curSheet=ctl;
    var cls=box.querySelector("[data-close]"); if(cls) cls.onclick=function(){ ctl.close(); };
    box.querySelectorAll(".tsk-type").forEach(function(b){
      b.onclick=function(){
        typ=b.getAttribute("data-t");
        box.querySelectorAll(".tsk-type").forEach(function(x){ x.classList.toggle("on",x===b); });
      };
    });
    box.querySelector("#tskSave").onclick=function(){
      if(busy) return;
      var ttl=(box.querySelector("#tskTitle").value||"").trim();
      if(!ttl){ sdk.ui.toast(t("needTitle")); return; }
      var pts=parseInt(box.querySelector("#tskPts").value,10);
      if(!(pts>0)) pts=10; if(pts>1000) pts=1000;
      busy=true;
      var op = tk
        ? sdk.tasks.update(tk.id,{title:ttl,points:pts,type:typ})
        : sdk.tasks.create({title:ttl,points:pts,type:typ});
      op.then(function(out){
        busy=false;
        if(!out || !out.ok){ sdk.ui.toast(t("loadFail")); return; }
        ctl.close(); sdk.ui.toast(t("doneToast"));
        load();
      });
    };
    var del=box.querySelector("#tskDel");
    if(del) del.onclick=function(){ ctl.close(); deleteTask(tk); };
  }

  function openProposeSheet(){ /* ребёнок: залогировать сделанное дело */
    var box=document.createElement("div");
    box.innerHTML='<h2>'+esc(t("proposeTitle"))+'</h2>'
      +'<div class="tsk-form">'
        +'<input type="text" id="tskTitle" maxlength="60" placeholder="'+esc(t("proposeTitlePh"))+'">'
        +'<label class="tsk-lbl" for="tskPts">'+esc(t("proposePtsLbl"))+'</label>'
        +'<input type="number" id="tskPts" inputmode="numeric" min="1" max="1000" value="10">'
      +'</div>'
      +'<p class="tsk-hint">'+esc(t("proposeHint"))+'</p>'
      +'<div class="sheet-actions"><button class="btn btn-cancel" data-close>'+esc(t("common.cancel"))+'</button>'
        +'<button class="btn btn-primary" id="tskSend">'+esc(t("proposeSend"))+'</button></div>';
    var ctl=sdk.ui.sheet(box); curSheet=ctl;
    box.querySelector("[data-close]").onclick=function(){ ctl.close(); };
    box.querySelector("#tskSend").onclick=function(){
      if(busy) return;
      var ttl=(box.querySelector("#tskTitle").value||"").trim();
      if(!ttl){ sdk.ui.toast(t("needTitle")); return; }
      var pts=parseInt(box.querySelector("#tskPts").value,10);
      if(!(pts>0)) pts=10; if(pts>1000) pts=1000;
      busy=true;
      sdk.tasks.propose({title:ttl,points:pts}).then(function(out){
        busy=false;
        if(!out || !out.ok){ sdk.ui.toast(t("loadFail")); return; }
        ctl.close(); sdk.ui.toast(t("proposedToast")); sdk.ui.haptics("light");
        load();
      });
    };
  }

  function openReviewSheet(tk){ /* родитель: проверить предложение ребёнка (правка очков + одобрить/отклонить) */
    var box=document.createElement("div");
    box.innerHTML='<h2>'+esc(t("reviewTitle"))+'</h2>'
      +'<div class="tsk-review">'
        +'<div class="tsk-rv-title">'+esc(tk.title||"")+'</div>'
        +'<label class="tsk-lbl" for="tskPts">'+esc(t("reviewPtsLbl"))+'</label>'
        +'<input type="number" id="tskPts" inputmode="numeric" min="1" max="1000" value="'+(tk.points>0?tk.points:10)+'">'
      +'</div>'
      +'<div class="sheet-actions"><button class="btn btn-cancel" id="tskDeny">'+esc(t("denyBtn"))+'</button>'
        +'<button class="btn btn-primary" id="tskOk">'+esc(t("approveAdj",{n:tk.points||10}))+'</button></div>';
    var ctl=sdk.ui.sheet(box); curSheet=ctl;
    var inp=box.querySelector("#tskPts"), ok=box.querySelector("#tskOk");
    inp.oninput=function(){ var n=parseInt(inp.value,10); ok.textContent=t("approveAdj",{n:(n>0?Math.min(n,1000):10)}); };
    box.querySelector("#tskDeny").onclick=function(){ ctl.close(); denyTask(tk); };
    ok.onclick=function(){
      var n=parseInt(inp.value,10); if(!(n>0)) n=10; if(n>1000) n=1000;
      ctl.close(); approveTask(tk, n);
    };
  }

  /* ---------- рендер ---------- */
  function bucket(){ /* разложить задания по корзинам */
    var b={ review:[], active:[], done:[], todo:[], waiting:[] }, i, tk;
    for(i=0;i<S.tasks.length;i++){
      tk=S.tasks[i];
      if(tk.status==="pending"){ b.review.push(tk); b.waiting.push(tk); }
      else if(tk.status==="active"){ b.active.push(tk); b.todo.push(tk); }
      else if(tk.status==="done"){ b.done.push(tk); }
    }
    /* очередь проверки: предложения детей (origin=child) — первыми, затем по свежести */
    b.review.sort(function(a,c){
      var pa=(a.origin==="child")?0:1, pc=(c.origin==="child")?0:1;
      return pa-pc || ((c.claimedAt||c.createdAt||0)-(a.claimedAt||a.createdAt||0));
    });
    b.waiting.sort(function(a,c){ return (c.claimedAt||c.createdAt||0)-(a.claimedAt||a.createdAt||0); });
    b.active.sort(function(a,c){ return (c.createdAt||0)-(a.createdAt||0); });
    b.todo=b.active.slice();
    b.done.sort(function(a,c){ return (c.doneAt||c.updatedAt||0)-(a.doneAt||a.updatedAt||0); });
    return b;
  }
  function render(){
    if(!alive) return;
    var b=bucket();
    if(isParent()) sdk.ui.hud({ left:title(), cNum:b.review.length, cLbl:t("hudReview"), rNum:b.active.length, rLbl:t("hudActive") });
    else sdk.ui.hud({ left:title(), cNum:b.todo.length, cLbl:t("hudDo"), rNum:b.waiting.length, rLbl:t("hudWait") });
    renderList(b);
  }
  function metaLine(tk){
    var once=(tk.type==="once"), m=esc(once?t("metaOnce"):t("metaRecur"));
    if(!once && tk.timesDone) m+=' · '+esc(t("doneTimes",{n:tk.timesDone}));
    return m;
  }
  function card(tk, kind){ /* kind: review|active|done|todo|waiting */
    var pts=tk.points||10, prop=(tk.origin==="child"), act="", sub="", cls="";
    if(kind==="review"){
      if(prop){
        cls=" prop"; sub='<span class="tsk-tag">'+esc(t("tagProposal"))+'</span> '+esc(t("chipProposed",{n:pts}));
        act='<button class="tsk-btn ok" data-act="review" data-tid="'+esc(tk.id)+'">'+esc(t("btnReview"))+'</button>';
      } else {
        sub=metaLine(tk);
        act='<button class="tsk-btn ok" data-act="ok" data-tid="'+esc(tk.id)+'">'+esc(t("approveBtn",{n:pts}))+'</button>'
           +'<button class="tsk-btn no" data-act="no" data-tid="'+esc(tk.id)+'" aria-label="'+esc(t("declineA11y"))+'">↩</button>';
      }
    } else if(kind==="active"){
      sub=metaLine(tk);
      act='<button class="tsk-btn x" data-act="del" data-tid="'+esc(tk.id)+'" aria-label="'+esc(t("deleteTask"))+'">✕</button>';
    } else if(kind==="todo"){
      sub=metaLine(tk);
      act='<button class="tsk-btn do" data-act="claim" data-tid="'+esc(tk.id)+'">'+esc(t("btnIDid"))+'</button>';
    } else if(kind==="waiting"){
      sub=prop?('<span class="tsk-tag">'+esc(t("tagProposal"))+'</span> '+esc(t("chipProposed",{n:pts}))):metaLine(tk);
      act='<span class="tsk-chip">'+esc(t("chipWaiting"))+'</span>';
    } else { /* done */
      sub=tk.doneAt?esc(t("doneOn",{d:fmtDay(tk.doneAt)})):metaLine(tk);
      act='<span class="tsk-chip ok">'+esc(t("chipDone"))+'</span>';
      if(isParent()) act+='<button class="tsk-btn x" data-act="del" data-tid="'+esc(tk.id)+'" aria-label="'+esc(t("deleteTask"))+'">✕</button>';
    }
    /* активную карточку родителя можно тапнуть для правки */
    var editable=(kind==="active" && isParent());
    return '<div class="tsk-card st-'+esc(tk.status)+cls+'"'
      +(editable?' data-act="edit" data-tid="'+esc(tk.id)+'" role="button" tabindex="0"':'')+'>'
      +'<div class="tsk-badge'+(kind==="done"?" dim":"")+'">+'+pts+'</div>'
      +'<div class="tsk-main"><div class="tsk-t">'+esc(tk.title||"")+'</div>'
      +'<div class="tsk-m">'+sub+'</div></div>'
      +'<div class="tsk-act">'+act+'</div></div>';
  }
  function section(titleKey, list, kind){
    if(!list.length) return "";
    var h='<div class="tsk-sec"><div class="tsk-sec-h"><span>'+esc(t(titleKey))+'</span><span class="tsk-sec-n">'+list.length+'</span></div>';
    for(var i=0;i<list.length;i++) h+=card(list[i],kind);
    return h+'</div>';
  }
  function renderList(b){
    var box=E.list;
    if(S.err){
      box.innerHTML='<div class="tsk-empty"><p>'+esc(t("loadFail"))+'</p><button class="btn btn-cancel" id="tskRetry">'+esc(t("retry"))+'</button></div>';
      var rb=box.querySelector("#tskRetry"); if(rb) rb.onclick=function(){ S.err=false; load(); };
      return;
    }
    var h="";
    if(isParent()){
      h+='<button class="btn btn-primary tsk-add" data-act="add">'+esc(t("btnAddTask"))+'</button>';
      h+=section("secReview", b.review, "review");
      h+=section("secActive", b.active, "active");
      h+=section("secDone", b.done.slice(0,DONE_CAP), "done");
      if(!b.review.length && !b.active.length && !b.done.length)
        h+='<div class="tsk-empty"><div class="tsk-empty-ic">'+CLIP_IC+'</div><p>'+esc(t("emptyParent"))+'</p></div>';
    } else {
      h+='<button class="btn btn-primary tsk-add" data-act="propose">'+esc(t("btnPropose"))+'</button>';
      h+=section("secTodo", b.todo, "todo");
      h+=section("secWaiting", b.waiting, "waiting");
      h+=section("secDone", b.done.slice(0,DONE_CAP), "done");
      if(!b.todo.length && !b.waiting.length && !b.done.length)
        h+='<div class="tsk-empty"><div class="tsk-empty-ic">'+CLIP_IC+'</div><p>'+esc(t("emptyKid"))+'</p></div>';
    }
    box.innerHTML=h;
  }
  function onListClick(e){
    if(!alive) return;
    var b=e.target.closest("[data-act]"); if(!b || !E.list.contains(b)) return;
    var act=b.getAttribute("data-act");
    if(act==="add"){ openTaskSheet(null); return; }
    if(act==="propose"){ openProposeSheet(); return; }
    var tk=taskOf(b.getAttribute("data-tid")); if(!tk) return;
    if(act==="edit"){ openTaskSheet(tk); }
    else if(act==="claim"){ claimTask(tk); }
    else if(act==="ok"){ approveTask(tk); }
    else if(act==="no"){ declineTask(tk); }
    else if(act==="review"){ openReviewSheet(tk); }
    else if(act==="del"){ deleteTask(tk); }
  }

  /* ---------- каркас ---------- */
  function mount(rootEl, theSdk){
    sdk=theSdk; root=rootEl; alive=true; busy=false; curSheet=null;
    S={ tasks:[], loaded:false, err:false };
    var body=sdk.ui.frame({
      titleHtml:'<div class="tsk-title">'+esc(title())+'</div><div class="tsk-sub">'+esc(t(isParent()?"subParent":"subKid"))+'</div>',
      backLabel:t("common.back"),
      actions:[{ icon:CLIP_IC, className:"rt-deco" }]
    }).body;
    body.innerHTML='<div class="tsk"><section class="tsk-list" id="tskList"></section></div>';
    var el=body.querySelector(".tsk");
    E={ list:el.querySelector("#tskList") };
    /* делегат кликов: узел #tskList пересоздаётся при каждом mount — листенер не копится */
    E.list.addEventListener("click", onListClick);
    load();
  }
  function unmount(){
    alive=false; busy=false;
    if(curSheet && curSheet.close){ try{ curSheet.close(); }catch(e){} }
    curSheet=null; E={};
  }

  /* живое обновление: новое задание/предложение/«Сделал!»/подтверждение с другого
     устройства подтягиваются без перезахода. Занят (busy/шторка) → false, shell повторит. */
  function refresh(){
    if(!alive) return true;
    if(busy || curSheet) return false;
    load(); return true;
  }

  RobTop.register({ id:"tasks", mount:mount, unmount:unmount, refresh:refresh, messages:MESSAGES });
})();
