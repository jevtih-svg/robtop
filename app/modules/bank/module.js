/* RobTop — модуль «Копилка». Свинка с пунктами на боку, огонёк-винстрик, история
   транзакций (вкладки «Задания»/«Родители») и родительская панель начисления за PIN.
   Сам ничего не считает — читает леджер через sdk.points (движок в core/sdk.js, политика — ГАЙД-очки.md). */
(function(){
  "use strict";

  var MESSAGES={
    en:{ bank:{
      title:"Piggy Bank", subtitle:"Your points for games and tasks",
      ptsWord:"points", streakLabel:"win streak",
      tabApps:"Quests", tabParents:"Parents",
      emptyApps:"Nothing yet — play and earn points!",
      emptyParents:"Parent tasks and rewards will show up here",
      txCount:{one:"{n} entry",other:"{n} entries"},
      hudPts:"points", hudStreak:"streak",
      loadFail:"Could not load the piggy bank", retry:"Try again",
      r_teeth:"Teeth brushing", r_teeth_manual:"Parent adjustment",
      r_guess_win:"Guess the Number — win", r_guess_wrong:"Guess the Number — wrong",
      r_guess_timeout:"Guess the Number — out of time",
      r_streak_bonus:"Streak bonus 🔥", r_parent_give:"From parents", r_parent_take:"Taken by parents",
      r_task_done:"Parent task done", r_task_fail:"Task not done", r_daily_bonus:"All tasks of the day!",
      r_spend:"Shop", r_other:"Points",
      parentTitle:"Parent panel", parentGateNote:"Enter the parent PIN",
      balanceNow:"in the bank", streakNow:"win streak",
      secTasks:"Parent tasks", btnTaskDone:"✓ Task done +10", btnTaskFail:"✗ Task not done −10",
      taskFailHint:"burns the streak fire", btnDailyBonus:"★ All tasks today +5",
      secCustom:"Custom amount", amountPh:"How many", notePh:"What for (child will see it)",
      btnGive:"Give", btnTake:"Take", needAmount:"Enter a number first", doneToast:"Done!",
      streakToast:"Win streak: {n} 🔥", bonusToast:"Streak bonus +{n}!"
    }},
    ru:{ bank:{
      title:"Копилка", subtitle:"Твои пункты за игры и задания",
      ptsWord:"пункты", streakLabel:"винстрик",
      tabApps:"Задания", tabParents:"Родители",
      emptyApps:"Пока пусто — играй и зарабатывай пункты!",
      emptyParents:"Здесь появятся задания и награды от родителей",
      txCount:{one:"{n} запись",few:"{n} записи",many:"{n} записей"},
      hudPts:"пунктов", hudStreak:"винстрик",
      loadFail:"Не получилось загрузить копилку", retry:"Попробовать ещё",
      r_teeth:"Чистка зубов", r_teeth_manual:"Поправка родителя",
      r_guess_win:"Угадай число — победа", r_guess_wrong:"Угадай число — не отгадал",
      r_guess_timeout:"Угадай число — не успел",
      r_streak_bonus:"Бонус серии 🔥", r_parent_give:"От родителей", r_parent_take:"Снято родителями",
      r_task_done:"Задание выполнено", r_task_fail:"Задание не выполнено", r_daily_bonus:"Все задания дня!",
      r_spend:"Магазин", r_other:"Пункты",
      parentTitle:"Панель родителя", parentGateNote:"Введи родительский PIN",
      balanceNow:"в копилке", streakNow:"винстрик",
      secTasks:"Задания от родителей", btnTaskDone:"✓ Задание выполнено +10", btnTaskFail:"✗ Задание не выполнено −10",
      taskFailHint:"сжигает огонёк", btnDailyBonus:"★ Все задания дня +5",
      secCustom:"Произвольная сумма", amountPh:"Сколько", notePh:"За что (увидит ребёнок)",
      btnGive:"Начислить", btnTake:"Снять", needAmount:"Сначала введи число", doneToast:"Готово!",
      streakToast:"Винстрик: {n} 🔥", bonusToast:"Бонус серии +{n}!"
    }},
    lv:{ bank:{
      title:"Krājkase", subtitle:"Tavi punkti par spēlēm un uzdevumiem",
      ptsWord:"punkti", streakLabel:"uzvaru sērija",
      tabApps:"Uzdevumi", tabParents:"Vecāki",
      emptyApps:"Vēl tukšs — spēlē un krāj punktus!",
      emptyParents:"Šeit parādīsies vecāku uzdevumi un balvas",
      txCount:{zero:"{n} ierakstu",one:"{n} ieraksts",other:"{n} ieraksti"},
      hudPts:"punkti", hudStreak:"sērija",
      loadFail:"Neizdevās ielādēt krājkasi", retry:"Mēģināt vēlreiz",
      r_teeth:"Zobu tīrīšana", r_teeth_manual:"Vecāku korekcija",
      r_guess_win:"Uzmini skaitli — uzvara", r_guess_wrong:"Uzmini skaitli — nepareizi",
      r_guess_timeout:"Uzmini skaitli — laiks beidzās",
      r_streak_bonus:"Sērijas bonuss 🔥", r_parent_give:"No vecākiem", r_parent_take:"Vecāki noņēma",
      r_task_done:"Uzdevums izpildīts", r_task_fail:"Uzdevums nav izpildīts", r_daily_bonus:"Visi dienas uzdevumi!",
      r_spend:"Veikals", r_other:"Punkti",
      parentTitle:"Vecāku panelis", parentGateNote:"Ievadi vecāku PIN",
      balanceNow:"krājkasē", streakNow:"uzvaru sērija",
      secTasks:"Vecāku uzdevumi", btnTaskDone:"✓ Uzdevums izpildīts +10", btnTaskFail:"✗ Nav izpildīts −10",
      taskFailHint:"nodzēš uguntiņu", btnDailyBonus:"★ Visi dienas uzdevumi +5",
      secCustom:"Brīva summa", amountPh:"Cik daudz", notePh:"Par ko (bērns redzēs)",
      btnGive:"Pieskaitīt", btnTake:"Noņemt", needAmount:"Vispirms ievadi skaitli", doneToast:"Gatavs!",
      streakToast:"Uzvaru sērija: {n} 🔥", bonusToast:"Sērijas bonuss +{n}!"
    }}
  };

  var BACK_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
  var PARENT_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>';
  var FLAME_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c4.4 0 7.5-2.9 7.5-6.8 0-2.9-1.7-5.2-3.4-7C14.3 6.3 13.2 4.4 13.4 2c-3.2 1.9-4.6 4.5-4.4 7 .1 1.3-1 1.6-1.7.7-.4-.5-.7-1.1-.8-1.9C4.7 9.4 4 11.6 4 13.6 4 18 7.6 22 12 22z"/><path d="M12 22c-1.9 0-3.4-1.5-3.4-3.4 0-1.6 1-2.7 2-3.9.6-.7 1-1.4 1.2-2.2 1.4 1.2 3.6 3.1 3.6 5.8 0 2-1.5 3.7-3.4 3.7z"/></svg>';
  /* свинка-копилка (вид сбоку, по эскизу Артёма): тело, голова с пятачком, ушко,
     ножки, хвостик-петелька, прорезь сверху и монетка над ней */
  var PIG_IC='<svg viewBox="0 0 210 150" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">'
    +'<ellipse cx="98" cy="84" rx="64" ry="46"/>'
    +'<circle cx="156" cy="66" r="25"/>'
    +'<path d="M163 43l9-13 6 15"/>'
    +'<circle cx="160" cy="60" r="2.6" fill="currentColor" stroke="none"/>'
    +'<ellipse cx="179" cy="72" rx="6.5" ry="8.5"/>'
    +'<circle cx="177.5" cy="69.5" r="1.3" fill="currentColor" stroke="none"/>'
    +'<circle cx="177.5" cy="75.5" r="1.3" fill="currentColor" stroke="none"/>'
    +'<path d="M56 124v12"/><path d="M84 129v10"/><path d="M114 129v10"/><path d="M140 121v13"/>'
    +'<path d="M34 80c-9-3-14 4-9 10 4 5 11 2 9-4"/>'
    +'<path d="M80 41l28-5" class="bk-slot"/>'
    +'<g class="bk-coin"><circle cx="94" cy="16" r="10"/><path d="M94 11v10M89 16h10"/></g>'
    +'</svg>';

  var sdk=null, root=null, alive=false, busy=false, curSheet=null;
  var E={}, PE=null;
  var S={ balance:0, streak:0, items:[], tab:"apps", loaded:false, err:false };
  var PARENT_KINDS={ parent:1, task_done:1, task_fail:1, daily_bonus:1, manual:1, bonus:1 };
  var KNOWN_R={ teeth:1, teeth_manual:1, guess_win:1, guess_wrong:1, guess_timeout:1, streak_bonus:1,
                parent_give:1, parent_take:1, task_done:1, task_fail:1, daily_bonus:1, spend:1 };
  var LIST_CAP=60;

  function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]; }); }
  function t(k,p){ return sdk.t(k,p); }
  function plural(n,k,p){ return sdk.plural(n,k,p); }

  function kindOf(d){
    if(d && d.kind) return String(d.kind);
    if(d && d.reason==="teeth_manual") return "manual";
    return ((d && parseInt(d.n,10))||0) >= 0 ? "win" : "loss";
  }
  function tabOf(d){ return PARENT_KINDS[kindOf(d)] ? "parents" : "apps"; }
  function labelOf(d){
    if(d && d.note) return String(d.note);
    var r=(d && d.reason) ? String(d.reason) : "";
    if(KNOWN_R[r]) return t("r_"+r);
    /* модуль-источник может доложить свой ключ bank.r_<reason> через messages */
    if(r){ var k="bank.r_"+r, s=sdk.i18n.t(k); if(s && s!==k) return s; return r.replace(/_/g," "); }
    return t("r_other");
  }
  function fmtWhen(ts){
    if(!ts) return "";
    var d=new Date(ts), hh=d.getHours(), mm=d.getMinutes();
    return sdk.formatDate(ts,{day:"numeric",month:"short"})+" · "+hh+":"+(mm<10?"0":"")+mm;
  }

  /* ---------- данные ---------- */
  function load(){
    sdk.points.summary().then(function(s){
      if(!alive) return;
      S.balance=s.balance; S.streak=s.streak; S.loaded=true; S.err=false;
      S.items=s.items.slice().sort(function(a,b){ return (b.createdAt||0)-(a.createdAt||0); });
      render();
    }).catch(function(){
      if(!alive) return;
      S.err=true; S.loaded=true; render();
    });
  }

  /* ---------- рендер ---------- */
  function render(){
    if(!alive) return;
    E.pts.textContent = S.err ? "…" : S.balance;
    E.flameN.textContent = S.streak;
    E.flame.classList.toggle("off", !(S.streak>0));
    sdk.ui.hud({ left:t("title"), cNum:(S.err?0:S.balance), cLbl:t("hudPts"), rNum:S.streak, rLbl:t("hudStreak") });
    renderList();
    if(PE){ PE.bal.textContent=S.balance; PE.str.textContent=S.streak; }
  }
  function renderList(){
    var box=E.list;
    if(S.err){
      box.innerHTML='<div class="bk-empty"><p>'+esc(t("loadFail"))+'</p><button class="btn btn-cancel" id="bkRetry">'+esc(t("retry"))+'</button></div>';
      var rb=box.querySelector("#bkRetry"); if(rb) rb.onclick=function(){ S.err=false; E.pts.textContent="…"; load(); };
      return;
    }
    var rows=[], i, it, d;
    for(i=0;i<S.items.length;i++){ it=S.items[i]; d=it.data||{}; if(tabOf(d)===S.tab) rows.push(it); }
    if(!rows.length){
      box.innerHTML='<div class="bk-empty"><p>'+esc(t(S.tab==="apps"?"emptyApps":"emptyParents"))+'</p></div>';
      return;
    }
    var html='<div class="bk-count">'+esc(plural(rows.length,"txCount",{n:rows.length}))+'</div>', n;
    for(i=0;i<rows.length && i<LIST_CAP;i++){
      it=rows[i]; d=it.data||{}; n=parseInt(d.n,10)||0;
      html+='<div class="bk-row"><div class="bk-badge '+(n>=0?"plus":"minus")+'">'+(n>=0?"+":"−")+Math.abs(n)+'</div>'
        +'<div class="bk-row-main"><div class="bk-row-t">'+esc(labelOf(d))+'</div>'
        +'<div class="bk-row-d">'+esc(fmtWhen(it.createdAt))+'</div></div></div>';
    }
    box.innerHTML=html;
  }

  /* ---------- родительская панель ---------- */
  function openParentGate(){
    if(sdk.role==="parent"){ openParent(); return; } /* родительская сессия: без PIN (§4.10) */
    var box=document.createElement("div");
    box.innerHTML='<h2>'+esc(t("parentTitle"))+'</h2>'
      +'<p style="text-align:center;color:#cfe0ff;font-weight:600;margin:0 0 4px">'+esc(t("parentGateNote"))+'</p>'
      +'<div class="pin-row"><input id="bkPin" type="password" inputmode="numeric" placeholder="PIN" autocomplete="off">'
      +'<button class="btn btn-primary" id="bkPinBtn" style="flex:0 0 40%">'+esc(t("common.enter"))+'</button></div>';
    var ctl=sdk.ui.sheet(box); curSheet=ctl;
    var inp=box.querySelector("#bkPin"), btn=box.querySelector("#bkPinBtn");
    function go(){ var v=(inp.value||"").trim(); if(!v) return;
      sdk.admin.verify(v).then(function(ok){ if(ok){ ctl.close(); openParent(); } else sdk.ui.toast(t("err.bad_pin")); }); }
    btn.onclick=go; inp.addEventListener("keydown",function(e){ if(e.key==="Enter") go(); });
    setTimeout(function(){ inp.focus(); },200);
  }
  function openParent(){
    var box=document.createElement("div");
    box.innerHTML='<h2>'+esc(t("parentTitle"))+'</h2>'
      +'<div class="bk-pgrid">'
        +'<div class="bk-pstat"><div class="n" id="bkPBal">'+S.balance+'</div><div class="l">'+esc(t("balanceNow"))+'</div></div>'
        +'<div class="bk-pstat"><div class="n" id="bkPStr">'+S.streak+'</div><div class="l">'+esc(t("streakNow"))+'</div></div></div>'
      +'<div class="store-section">'+esc(t("secTasks"))+'</div>'
      +'<div class="bk-pbtns">'
        +'<button class="btn btn-primary" data-op="done">'+esc(t("btnTaskDone"))+'</button>'
        +'<button class="btn btn-cancel" data-op="fail">'+esc(t("btnTaskFail"))+' <span class="bk-hint">'+esc(t("taskFailHint"))+'</span></button>'
        +'<button class="btn btn-cancel" data-op="daily">'+esc(t("btnDailyBonus"))+'</button></div>'
      +'<div class="store-section">'+esc(t("secCustom"))+'</div>'
      +'<div class="bk-custom"><input type="number" id="bkAmt" inputmode="numeric" placeholder="'+esc(t("amountPh"))+'">'
      +'<input type="text" id="bkNote" maxlength="60" placeholder="'+esc(t("notePh"))+'"></div>'
      +'<div class="sheet-actions"><button class="btn btn-cancel" data-op="take">'+esc(t("btnTake"))+'</button>'
      +'<button class="btn btn-primary" data-op="give">'+esc(t("btnGive"))+'</button></div>';
    var ctl=sdk.ui.sheet(box); curSheet=ctl;
    PE={ bal:box.querySelector("#bkPBal"), str:box.querySelector("#bkPStr") };
    function val(){ return parseInt((box.querySelector("#bkAmt").value||"").trim(),10)||0; }
    function note(){ return (box.querySelector("#bkNote").value||"").trim(); }
    box.querySelectorAll("[data-op]").forEach(function(b){
      b.onclick=function(){
        var op=b.getAttribute("data-op"), n, v;
        if(busy) return;
        if(op==="done"){ n=[10,"task_done",{kind:"task_done",src:"parent"}]; }
        else if(op==="fail"){ n=[-10,"task_fail",{kind:"task_fail",src:"parent"}]; }
        else if(op==="daily"){ n=[5,"daily_bonus",{kind:"daily_bonus",src:"parent"}]; }
        else {
          v=val();
          if(!v){ sdk.ui.toast(t("needAmount")); return; }
          n=[ op==="give"?Math.abs(v):-Math.abs(v), op==="give"?"parent_give":"parent_take",
              {kind:"parent",src:"parent",note:note()} ];
        }
        busy=true; b.disabled=true;
        sdk.points.add(n[0],n[1],n[2]).then(function(out){
          busy=false; b.disabled=false;
          if(!out || !out.ok){ sdk.ui.toast(t("loadFail")); return; }
          if(out.bonus) sdk.ui.toast(t("bonusToast",{n:out.bonus}));
          else if(out.streak!=null) sdk.ui.toast(t("streakToast",{n:out.streak}));
          else sdk.ui.toast(t("doneToast"));
          sdk.ui.haptics("light");
          load();
        });
      };
    });
  }

  /* ---------- каркас ---------- */
  function mount(rootEl, theSdk){
    sdk=theSdk; root=rootEl; alive=true; busy=false; curSheet=null; PE=null;
    S={ balance:0, streak:0, items:[], tab:"apps", loaded:false, err:false };
    root.innerHTML='<div class="bk">'
      +'<div class="bk-header"><button class="back" id="bkBack" aria-label="'+esc(t("common.back"))+'">'+BACK_IC+'</button>'
        +'<div class="bk-head-main"><div class="bk-title">'+esc(t("title"))+'</div><div class="bk-sub">'+esc(t("subtitle"))+'</div></div>'
        +'<button class="hbtn" id="bkParent" aria-label="'+esc(t("parentTitle"))+'">'+PARENT_IC+'</button></div>'
      +'<div class="bk-stage">'
        +'<div class="bk-flame off" id="bkFlame" title="'+esc(t("streakLabel"))+'">'+FLAME_IC
          +'<span class="bk-flame-n" id="bkFlameN">0</span><span class="bk-flame-l">'+esc(t("streakLabel"))+'</span></div>'
        +'<div class="bk-pig" id="bkPig">'+PIG_IC
          +'<div class="bk-pig-label">'+esc(t("ptsWord"))+': <b id="bkPts">…</b></div></div></div>'
      +'<nav class="bk-tabs" id="bkTabs">'
        +'<button class="bk-tab active" data-tab="apps">'+esc(t("tabApps"))+'</button>'
        +'<button class="bk-tab" data-tab="parents">'+esc(t("tabParents"))+'</button></nav>'
      +'<section class="bk-list" id="bkList"></section>'
      +'</div>';
    var el=root.querySelector(".bk");
    E={ pts:el.querySelector("#bkPts"), flame:el.querySelector("#bkFlame"), flameN:el.querySelector("#bkFlameN"),
        pig:el.querySelector("#bkPig"), tabs:el.querySelector("#bkTabs"), list:el.querySelector("#bkList") };
    el.querySelector("#bkBack").onclick=function(){ sdk.ui.back(); };
    el.querySelector("#bkParent").onclick=openParentGate;
    E.tabs.addEventListener("click",function(e){
      var b=e.target.closest(".bk-tab"); if(!b || !alive) return;
      S.tab=b.getAttribute("data-tab");
      E.tabs.querySelectorAll(".bk-tab").forEach(function(x){ x.classList.toggle("active",x===b); });
      renderList();
    });
    E.pig.addEventListener("click",function(){
      if(!alive) return;
      E.pig.classList.remove("wobble"); void E.pig.offsetWidth; E.pig.classList.add("wobble");
      sdk.ui.haptics("light"); sdk.ui.chime();
    });
    load();
  }
  function unmount(){
    alive=false; busy=false;
    if(curSheet && curSheet.close){ try{ curSheet.close(); }catch(e){} }
    curSheet=null; PE=null; E={};
  }

  RobTop.register({ id:"bank", mount:mount, unmount:unmount, messages:MESSAGES });
})();
