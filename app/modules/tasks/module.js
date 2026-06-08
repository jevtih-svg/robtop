/* RobTop — модуль «Задания». Полноэкранный UI общего сервиса заданий от родителей
   (отдельная таблица tasks, api/tasks.php; канон — ГАЙД-задания.md).
   ЗЕРКАЛО блока заданий Копилки: один источник правды, вся логика — в движке sdk.tasks
   (core/sdk.js): claim/approve сами начисляют очки (sdk.points) и шлют оповещения.
   Модуль ничего не считает и не хранит — только рендерит и зовёт движок.
   Ребёнок: «Сделал!» (одноразовое — очки сразу, повторяющееся — на проверку родителю).
   Родитель: создать/править/удалить задание, подтвердить (✓ очки) или вернуть (↩ без очков).
   Выполненные одноразовые видит только родитель (как в Копилке). Live-sync: хук refresh(). */
(function(){
  "use strict";

  var MESSAGES={
    en:{ tasks:{
      subtitle:"Parent tasks — do them and earn points",
      emptyKid:"No tasks yet — ask your parents to make one!",
      emptyParent:"No tasks yet. Create the first one!",
      hudDo:"to do", hudCheck:"checking",
      loadFail:"Could not load the tasks", retry:"Try again",
      btnAddTask:"+ New task", btnIDid:"I did it!",
      chipPending:"waiting for check ⏳", chipDone:"done ✓",
      typeRecur:"Repeating", typeOnce:"One-time",
      metaRecur:"🔁 repeats", metaOnce:"1× one-time", doneTimes:"done ×{n}",
      approveBtn:"✓ +{n}", declineA11y:"Return without points",
      claimToast:"Sent to parents for checking!", returnedToast:"Returned without points",
      doneToast:"Done!", streakToast:"Win streak: {n} 🔥", bonusToast:"Streak bonus +{n}!",
      newTask:"New task", editTask:"Edit task",
      taskTitlePh:"What needs to be done", taskPtsLbl:"Points for completion",
      deleteTask:"Delete task", confirmDel:"Delete the task “{t}”?",
      needTitle:"Write the task name first"
    }},
    ru:{ tasks:{
      subtitle:"Задания от родителей — делай и зарабатывай пункты",
      emptyKid:"Заданий пока нет — попроси родителей придумать!",
      emptyParent:"Заданий пока нет. Создай первое!",
      hudDo:"сделать", hudCheck:"на проверке",
      loadFail:"Не получилось загрузить задания", retry:"Попробовать ещё",
      btnAddTask:"+ Новое задание", btnIDid:"Сделал!",
      chipPending:"ждёт проверки ⏳", chipDone:"выполнено ✓",
      typeRecur:"Повторяющееся", typeOnce:"Одноразовое",
      metaRecur:"🔁 повторяется", metaOnce:"1× одноразовое", doneTimes:"сделано ×{n}",
      approveBtn:"✓ +{n}", declineA11y:"Вернуть без очков",
      claimToast:"Отправлено родителям на проверку!", returnedToast:"Вернул без очков",
      doneToast:"Готово!", streakToast:"Винстрик: {n} 🔥", bonusToast:"Бонус серии +{n}!",
      newTask:"Новое задание", editTask:"Изменить задание",
      taskTitlePh:"Что нужно сделать", taskPtsLbl:"Очков за выполнение",
      deleteTask:"Удалить задание", confirmDel:"Удалить задание «{t}»?",
      needTitle:"Сначала напиши название"
    }},
    lv:{ tasks:{
      subtitle:"Vecāku uzdevumi — pildi un krāj punktus",
      emptyKid:"Uzdevumu vēl nav — palūdz vecākiem izdomāt!",
      emptyParent:"Uzdevumu vēl nav. Izveido pirmo!",
      hudDo:"jāizdara", hudCheck:"pārbaudē",
      loadFail:"Neizdevās ielādēt uzdevumus", retry:"Mēģināt vēlreiz",
      btnAddTask:"+ Jauns uzdevums", btnIDid:"Izdarīju!",
      chipPending:"gaida pārbaudi ⏳", chipDone:"izpildīts ✓",
      typeRecur:"Atkārtojas", typeOnce:"Vienreizējs",
      metaRecur:"🔁 atkārtojas", metaOnce:"1× vienreizējs", doneTimes:"izpildīts ×{n}",
      approveBtn:"✓ +{n}", declineA11y:"Atgriezt bez punktiem",
      claimToast:"Nosūtīts vecākiem pārbaudei!", returnedToast:"Atgriezts bez punktiem",
      doneToast:"Gatavs!", streakToast:"Uzvaru sērija: {n} 🔥", bonusToast:"Sērijas bonuss +{n}!",
      newTask:"Jauns uzdevums", editTask:"Mainīt uzdevumu",
      taskTitlePh:"Kas jāizdara", taskPtsLbl:"Punkti par izpildi",
      deleteTask:"Dzēst uzdevumu", confirmDel:"Dzēst uzdevumu “{t}”?",
      needTitle:"Vispirms uzraksti nosaukumu"
    }}
  };

  var BACK_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
  var CLIP_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="14" height="16" rx="2.5"/><path d="M9 5V4a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 4v1"/><path d="M9 13l2.2 2.2 4.3-4.7"/></svg>';

  var sdk=null, root=null, alive=false, busy=false, curSheet=null;
  var E={};
  var S={ tasks:[], loaded:false, err:false };
  var TASK_W={ pending:0, active:1, done:2 };

  function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]; }); }
  function t(k,p){ return sdk.t(k,p); }
  function title(){ return sdk.i18n.t("tile.tasks"); /* готовый перевод плитки */ }
  function parentCtl(){ return sdk.role==="parent" || sdk.isDemo(); }
  function kidCtl(){ return sdk.role!=="parent" || sdk.isDemo(); }
  function taskOf(id){
    for(var i=0;i<S.tasks.length;i++) if(String(S.tasks[i].id)===String(id)) return S.tasks[i];
    return null;
  }

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
  function claimTask(tk){ /* ребёнок: «Сделал!» */
    if(busy) return; busy=true;
    sdk.tasks.claim(tk).then(function(out){
      busy=false;
      if(!out || !out.ok){ sdk.ui.toast(t("loadFail")); load(); return; }
      if(out.once){
        if(out.bonus) sdk.ui.toast(t("bonusToast",{n:out.bonus}));
        else if(out.streak!=null) sdk.ui.toast(t("streakToast",{n:out.streak}));
        else sdk.ui.toast(t("doneToast"));
        sdk.ui.confetti();
      } else sdk.ui.toast(t("claimToast"));
      sdk.ui.haptics("light");
      load();
    });
  }
  function approveTask(tk){ /* родитель: подтвердить (движок начислит очки) */
    if(busy) return; busy=true;
    sdk.tasks.approve(tk).then(function(out){
      busy=false;
      if(!out || !out.ok){ sdk.ui.toast(t("loadFail")); load(); return; }
      if(out.bonus) sdk.ui.toast(t("bonusToast",{n:out.bonus}));
      else if(out.streak!=null) sdk.ui.toast(t("streakToast",{n:out.streak}));
      else sdk.ui.toast(t("doneToast"));
      sdk.ui.haptics("light");
      load();
    });
  }
  function declineTask(tk){ /* родитель: вернуть без очков */
    if(busy) return; busy=true;
    sdk.tasks.decline(tk).then(function(out){
      busy=false;
      sdk.ui.toast(t(out && out.ok ? "returnedToast" : "loadFail"));
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

  /* ---------- рендер ---------- */
  function counts(){
    var a=0, p=0, i, st;
    for(i=0;i<S.tasks.length;i++){
      st=S.tasks[i].status;
      if(st==="active") a++; else if(st==="pending") p++;
    }
    return {active:a, pending:p};
  }
  function render(){
    if(!alive) return;
    var c=counts();
    sdk.ui.hud({ left:title(), cNum:c.active, cLbl:t("hudDo"), rNum:c.pending, rLbl:t("hudCheck") });
    renderList();
  }
  function renderList(){
    var box=E.list, isP=parentCtl(), isK=kidCtl();
    if(S.err){
      box.innerHTML='<div class="tsk-empty"><p>'+esc(t("loadFail"))+'</p><button class="btn btn-cancel" id="tskRetry">'+esc(t("retry"))+'</button></div>';
      var rb=box.querySelector("#tskRetry"); if(rb) rb.onclick=function(){ S.err=false; load(); };
      return;
    }
    var list=S.tasks.filter(function(x){
      if(x.status==="done") return isP;           /* выполненные одноразовые видит родитель (как в Копилке) */
      return x.status==="active"||x.status==="pending";
    });
    list.sort(function(a,b){
      return ((TASK_W[a.status]!=null?TASK_W[a.status]:9)-(TASK_W[b.status]!=null?TASK_W[b.status]:9))
        || ((b.createdAt||0)-(a.createdAt||0));
    });
    var h="";
    if(isP) h+='<button class="btn btn-cancel tsk-add" data-act="add">'+esc(t("btnAddTask"))+'</button>';
    if(!list.length){
      h+='<div class="tsk-empty"><div class="tsk-empty-ic">'+CLIP_IC+'</div><p>'+esc(t(isP?"emptyParent":"emptyKid"))+'</p></div>';
      box.innerHTML=h;
      return;
    }
    for(var i=0;i<list.length;i++){
      var tk=list[i], pts=tk.points||10, once=(tk.type==="once");
      var meta=esc(once?t("metaOnce"):t("metaRecur"));
      if(!once && tk.timesDone) meta+=' · '+esc(t("doneTimes",{n:tk.timesDone}));
      var act="";
      if(tk.status==="pending"){
        if(isP) act+='<button class="tsk-btn ok" data-act="ok" data-tid="'+esc(tk.id)+'">'+esc(t("approveBtn",{n:pts}))+'</button>'
                   +'<button class="tsk-btn no" data-act="no" data-tid="'+esc(tk.id)+'" aria-label="'+esc(t("declineA11y"))+'">↩</button>';
        else act+='<span class="tsk-chip">'+esc(t("chipPending"))+'</span>';
      } else if(tk.status==="active"){
        if(isK) act+='<button class="tsk-btn do" data-act="claim" data-tid="'+esc(tk.id)+'">'+esc(t("btnIDid"))+'</button>';
        if(isP) act+='<button class="tsk-btn x" data-act="del" data-tid="'+esc(tk.id)+'" aria-label="'+esc(t("deleteTask"))+'">✕</button>';
      } else { /* done */
        act+='<span class="tsk-chip ok">'+esc(t("chipDone"))+'</span>';
        if(isP) act+='<button class="tsk-btn x" data-act="del" data-tid="'+esc(tk.id)+'" aria-label="'+esc(t("deleteTask"))+'">✕</button>';
      }
      var editable=isP && tk.status==="active";
      h+='<div class="tsk-card st-'+esc(tk.status)+'"'
        +(editable?' data-act="edit" data-tid="'+esc(tk.id)+'" role="button" tabindex="0"':'')+'>'
        +'<div class="tsk-badge">+'+pts+'</div>'
        +'<div class="tsk-main"><div class="tsk-t">'+esc(tk.title||"")+'</div>'
        +'<div class="tsk-m">'+meta+'</div></div>'
        +'<div class="tsk-act">'+act+'</div></div>';
    }
    box.innerHTML=h;
  }
  function onListClick(e){
    if(!alive) return;
    var b=e.target.closest("[data-act]"); if(!b || !E.list.contains(b)) return;
    var act=b.getAttribute("data-act");
    if(act==="add"){ openTaskSheet(null); return; }
    var tk=taskOf(b.getAttribute("data-tid")); if(!tk) return;
    if(act==="edit"){ openTaskSheet(tk); }
    else if(act==="claim"){ claimTask(tk); }
    else if(act==="ok"){ approveTask(tk); }
    else if(act==="no"){ declineTask(tk); }
    else if(act==="del"){ deleteTask(tk); }
  }

  /* ---------- каркас ---------- */
  function mount(rootEl, theSdk){
    sdk=theSdk; root=rootEl; alive=true; busy=false; curSheet=null;
    S={ tasks:[], loaded:false, err:false };
    root.innerHTML='<div class="tsk">'
      +'<div class="tsk-header"><button class="back" id="tskBack" aria-label="'+esc(t("common.back"))+'">'+BACK_IC+'</button>'
        +'<div class="tsk-head-main"><div class="tsk-title">'+esc(title())+'</div>'
        +'<div class="tsk-sub">'+esc(t("subtitle"))+'</div></div>'
        +'<div class="tsk-head-ic">'+CLIP_IC+'</div></div>'
      +'<section class="tsk-list" id="tskList"></section>'
      +'</div>';
    var el=root.querySelector(".tsk");
    E={ list:el.querySelector("#tskList") };
    el.querySelector("#tskBack").onclick=function(){ sdk.ui.back(); };
    /* делегат кликов: узел #tskList пересоздаётся при каждом mount — листенер не копится */
    E.list.addEventListener("click", onListClick);
    load();
  }
  function unmount(){
    alive=false; busy=false;
    if(curSheet && curSheet.close){ try{ curSheet.close(); }catch(e){} }
    curSheet=null; E={};
  }

  /* живое обновление (sync-поллер оболочки): чужие изменения — новое задание от родителя,
     «Сделал!» с другого устройства — подтягиваются без перезахода. Занят (своя операция
     busy / открытая шторка curSheet) → false: shell повторит следующим тиком. */
  function refresh(){
    if(!alive) return true;
    if(busy || curSheet) return false;
    load(); return true;
  }

  RobTop.register({ id:"tasks", mount:mount, unmount:unmount, refresh:refresh, messages:MESSAGES });
})();
