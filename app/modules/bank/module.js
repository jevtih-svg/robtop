/* RobTop — модуль «Копилка». Свинка с пунктами на боку, огонёк-винстрик, история
   транзакций (вкладки «Задания»/«Родители») и родительская панель начислений (только роль parent; в демо открыта).
   ЗАДАНИЯ ОТ РОДИТЕЛЕЙ (2026-06-07, v.26): коллекция bank/tasks в generic-сторе.
   Родитель создаёт задание (название, очки, тип): «повторяющееся» — ребёнок жмёт «Сделал!»
   → статус pending → родитель подтверждает (✓ = очки kind=task_done через sdk.points, задание
   возвращается в active) или возвращает (↩ = без очков, без штрафа — решение Джеффа);
   «одноразовое» — очки начисляются ребёнку СРАЗУ при отметке (решение Джеффа), статус done.
   Сумма очков — у каждого задания своя (деф. +10, канон ГАЙД-очки.md §4).
   ВИНСТРИК (2026-06-07, v1.2.0): серия дней подряд с хотя бы одним выполненным заданием;
   выводится движком из леджера (день без задания — огонёк гаснет сам). Кнопка-огонёк с «i»
   открывает объяснение для ребёнка (openStreakInfo, простые правила + пример недели).
   ПУНКТСТРИК (2026-06-07, v1.3.0, поверх винстрика): чип ⚡ справа сверху — плюсы подряд
   без единого минуса (любой kind), минус сбрасывает в 0; считает движок (plusStreak),
   объяснение для ребёнка — openPlusInfo (свой «i»). Бонусов не даёт, капа нет.
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
      parentTitle:"Parent panel", parentOnly:"Only for a signed-in parent.",
      balanceNow:"in the bank", streakNow:"win streak",
      secBonus:"Bonus", btnDailyBonus:"★ All tasks today +5",
      infoTitle:"What is the fire? 🔥",
      infoIntro:"The fire is your streak of days with parent tasks.",
      infoRule1:"Do at least one parent task in a day — the fire burns, and the number grows: +1 for every day in a row.",
      infoRule2:"Skip a whole day without tasks — the fire goes out, and the count starts over from 0.",
      infoRule3:"The bigger the fire, the bigger the gift: every finished task brings a bonus of “fire − 1” extra points.",
      infoExTitle:"Example week",
      infoEx1:"Mon — did a task → fire 1, no bonus yet",
      infoEx2:"Tue — did a task → fire 2, bonus +1",
      infoEx3:"Wed — did a task → fire 3, bonus +2",
      infoEx4:"Thu — no tasks at all → the fire is out, 0",
      infoEx5:"Fri — did a task → fire 1 again",
      infoMax:"The biggest fire is 21 — then every task gives +20 bonus points!",
      infoGames:"Games give points too, but only parent tasks light the fire.",
      plusLabel:"points streak",
      pinfoTitle:"What is the points streak? ⚡",
      pinfoIntro:"The points streak counts your pluses in a row, without a single minus.",
      pinfoRule1:"Every green plus row (a win, a task, a bonus) makes the streak grow by 1.",
      pinfoRule2:"Get a minus (lost a game or points were taken) — the streak burns down to 0.",
      pinfoRule3:"The next plus starts the count again: 1, 2, 3…",
      pinfoExTitle:"Example",
      pinfoEx1:"+10 teeth brushing → streak 1",
      pinfoEx2:"+10 parent task → streak 2",
      pinfoEx3:"+1 streak bonus → streak 3",
      pinfoEx4:"−5 wrong guess → the streak is out, 0",
      pinfoEx5:"+10 task → streak 1 again",
      pinfoNote:"No limit — see how long you can keep it!",
      pinfoVs:"The fire 🔥 counts days with tasks. The points streak ⚡ counts pluses in a row. They live separately.",
      secCustom:"Custom amount", amountPh:"How many", notePh:"What for (child will see it)",
      btnGive:"Give", btnTake:"Take", needAmount:"Enter a number first", doneToast:"Done!",
      streakToast:"Win streak: {n} 🔥", bonusToast:"Streak bonus +{n}!",
      btnAddTask:"+ New task", btnIDid:"I did it!",
      chipPending:"waiting for check ⏳", chipDone:"done ✓",
      typeRecur:"Repeating", typeOnce:"One-time",
      metaRecur:"🔁 repeats", metaOnce:"1× one-time", doneTimes:"done ×{n}",
      approveBtn:"✓ +{n}", declineA11y:"Return without points",
      claimToast:"Sent to parents for checking!", returnedToast:"Returned without points",
      newTask:"New task", editTask:"Edit task",
      taskTitlePh:"What needs to be done", taskPtsLbl:"Points for completion",
      deleteTask:"Delete task", confirmDel:"Delete the task “{t}”?",
      needTitle:"Write the task name first"
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
      parentTitle:"Панель родителя", parentOnly:"Доступно родителю после входа в свой аккаунт.",
      balanceNow:"в копилке", streakNow:"винстрик",
      secBonus:"Бонус", btnDailyBonus:"★ Все задания дня +5",
      infoTitle:"Что такое огонёк? 🔥",
      infoIntro:"Огонёк — это твоя серия дней с заданиями от родителей.",
      infoRule1:"Сделай хотя бы одно задание за день — огонёк горит, и число растёт: +1 за каждый день подряд.",
      infoRule2:"Пропустил целый день без заданий — огонёк гаснет, и счёт начинается заново с 0.",
      infoRule3:"Чем больше огонёк, тем больше подарок: за каждое выполненное задание даётся бонус «огонёк − 1» пунктов.",
      infoExTitle:"Пример недели",
      infoEx1:"Пн — сделал задание → огонёк 1, бонуса пока нет",
      infoEx2:"Вт — сделал задание → огонёк 2, бонус +1",
      infoEx3:"Ср — сделал задание → огонёк 3, бонус +2",
      infoEx4:"Чт — заданий совсем не было → огонёк погас, 0",
      infoEx5:"Пт — сделал задание → огонёк снова 1",
      infoMax:"Самый большой огонёк — 21: тогда каждое задание даёт +20 бонусом!",
      infoGames:"Игры тоже дают пункты, но огонёк зажигают только задания родителей.",
      plusLabel:"пунктстрик",
      pinfoTitle:"Что такое пунктстрик? ⚡",
      pinfoIntro:"Пунктстрик — это сколько плюсов подряд ты получил без единого минуса.",
      pinfoRule1:"Каждая зелёная строка с плюсом (победа, задание, бонус) делает пунктстрик больше на 1.",
      pinfoRule2:"Получил минус (проиграл или сняли пункты) — пунктстрик сгорает в 0.",
      pinfoRule3:"Следующий плюс начинает счёт заново: 1, 2, 3…",
      pinfoExTitle:"Пример",
      pinfoEx1:"+10 чистка зубов → пунктстрик 1",
      pinfoEx2:"+10 задание родителей → пунктстрик 2",
      pinfoEx3:"+1 бонус серии → пунктстрик 3",
      pinfoEx4:"−5 не отгадал число → пунктстрик погас, 0",
      pinfoEx5:"+10 задание → пунктстрик снова 1",
      pinfoNote:"Предела нет — проверь, сколько продержишься!",
      pinfoVs:"Огонёк 🔥 считает дни с заданиями. Пунктстрик ⚡ считает плюсы подряд. Они живут отдельно.",
      secCustom:"Произвольная сумма", amountPh:"Сколько", notePh:"За что (увидит ребёнок)",
      btnGive:"Начислить", btnTake:"Снять", needAmount:"Сначала введи число", doneToast:"Готово!",
      streakToast:"Винстрик: {n} 🔥", bonusToast:"Бонус серии +{n}!",
      btnAddTask:"+ Новое задание", btnIDid:"Сделал!",
      chipPending:"ждёт проверки ⏳", chipDone:"выполнено ✓",
      typeRecur:"Повторяющееся", typeOnce:"Одноразовое",
      metaRecur:"🔁 повторяется", metaOnce:"1× одноразовое", doneTimes:"сделано ×{n}",
      approveBtn:"✓ +{n}", declineA11y:"Вернуть без очков",
      claimToast:"Отправлено родителям на проверку!", returnedToast:"Вернул без очков",
      newTask:"Новое задание", editTask:"Изменить задание",
      taskTitlePh:"Что нужно сделать", taskPtsLbl:"Очков за выполнение",
      deleteTask:"Удалить задание", confirmDel:"Удалить задание «{t}»?",
      needTitle:"Сначала напиши название"
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
      parentTitle:"Vecāku panelis", parentOnly:"Pieejams vecākam pēc pieslēgšanās savā kontā.",
      balanceNow:"krājkasē", streakNow:"uzvaru sērija",
      secBonus:"Bonuss", btnDailyBonus:"★ Visi dienas uzdevumi +5",
      infoTitle:"Kas ir uguntiņa? 🔥",
      infoIntro:"Uguntiņa ir tava dienu sērija ar vecāku uzdevumiem.",
      infoRule1:"Izpildi vismaz vienu uzdevumu dienā — uguntiņa deg, un skaitlis aug: +1 par katru dienu pēc kārtas.",
      infoRule2:"Izlaid veselu dienu bez uzdevumiem — uguntiņa nodziest, un skaits sākas no jauna ar 0.",
      infoRule3:"Jo lielāka uguntiņa, jo lielāka dāvana: katrs izpildītais uzdevums dod bonusu «uguntiņa − 1» punkti.",
      infoExTitle:"Nedēļas piemērs",
      infoEx1:"Pr — izpildīji uzdevumu → uguntiņa 1, bonusa vēl nav",
      infoEx2:"Ot — izpildīji uzdevumu → uguntiņa 2, bonuss +1",
      infoEx3:"Tr — izpildīji uzdevumu → uguntiņa 3, bonuss +2",
      infoEx4:"Ce — uzdevumu nebija → uguntiņa nodzisa, 0",
      infoEx5:"Pk — izpildīji uzdevumu → uguntiņa atkal 1",
      infoMax:"Lielākā uguntiņa ir 21 — tad katrs uzdevums dod +20 bonusā!",
      infoGames:"Spēles arī dod punktus, bet uguntiņu iededz tikai vecāku uzdevumi.",
      plusLabel:"punktu sērija",
      pinfoTitle:"Kas ir punktu sērija? ⚡",
      pinfoIntro:"Punktu sērija skaita tavus plusus pēc kārtas bez neviena mīnusa.",
      pinfoRule1:"Katra zaļā plus rinda (uzvara, uzdevums, bonuss) palielina sēriju par 1.",
      pinfoRule2:"Saņēmi mīnusu (zaudēji spēlē vai punktus noņēma) — sērija nodziest uz 0.",
      pinfoRule3:"Nākamais pluss sāk skaitu no jauna: 1, 2, 3…",
      pinfoExTitle:"Piemērs",
      pinfoEx1:"+10 zobu tīrīšana → sērija 1",
      pinfoEx2:"+10 vecāku uzdevums → sērija 2",
      pinfoEx3:"+1 sērijas bonuss → sērija 3",
      pinfoEx4:"−5 neuzminēji skaitli → sērija nodzisa, 0",
      pinfoEx5:"+10 uzdevums → sērija atkal 1",
      pinfoNote:"Limita nav — pārbaudi, cik ilgi noturēsies!",
      pinfoVs:"Uguntiņa 🔥 skaita dienas ar uzdevumiem. Punktu sērija ⚡ skaita plusus pēc kārtas. Tās dzīvo atsevišķi.",
      secCustom:"Brīva summa", amountPh:"Cik daudz", notePh:"Par ko (bērns redzēs)",
      btnGive:"Pieskaitīt", btnTake:"Noņemt", needAmount:"Vispirms ievadi skaitli", doneToast:"Gatavs!",
      streakToast:"Uzvaru sērija: {n} 🔥", bonusToast:"Sērijas bonuss +{n}!",
      btnAddTask:"+ Jauns uzdevums", btnIDid:"Izdarīju!",
      chipPending:"gaida pārbaudi ⏳", chipDone:"izpildīts ✓",
      typeRecur:"Atkārtojas", typeOnce:"Vienreizējs",
      metaRecur:"🔁 atkārtojas", metaOnce:"1× vienreizējs", doneTimes:"izpildīts ×{n}",
      approveBtn:"✓ +{n}", declineA11y:"Atgriezt bez punktiem",
      claimToast:"Nosūtīts vecākiem pārbaudei!", returnedToast:"Atgriezts bez punktiem",
      newTask:"Jauns uzdevums", editTask:"Mainīt uzdevumu",
      taskTitlePh:"Kas jāizdara", taskPtsLbl:"Punkti par izpildi",
      deleteTask:"Dzēst uzdevumu", confirmDel:"Dzēst uzdevumu “{t}”?",
      needTitle:"Vispirms uzraksti nosaukumu"
    }}
  };

  var BACK_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
  var PARENT_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>';
  var FLAME_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c4.4 0 7.5-2.9 7.5-6.8 0-2.9-1.7-5.2-3.4-7C14.3 6.3 13.2 4.4 13.4 2c-3.2 1.9-4.6 4.5-4.4 7 .1 1.3-1 1.6-1.7.7-.4-.5-.7-1.1-.8-1.9C4.7 9.4 4 11.6 4 13.6 4 18 7.6 22 12 22z"/><path d="M12 22c-1.9 0-3.4-1.5-3.4-3.4 0-1.6 1-2.7 2-3.9.6-.7 1-1.4 1.2-2.2 1.4 1.2 3.6 3.1 3.6 5.8 0 2-1.5 3.7-3.4 3.7z"/></svg>';
  var BOLT_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4.6 13.4h6L9.8 22l8.6-11.4h-6L13 2z"/></svg>';
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
  var S={ balance:0, streak:0, items:[], tasks:[], tab:"apps", loaded:false, err:false };
  var PARENT_KINDS={ parent:1, task_done:1, task_fail:1, daily_bonus:1, manual:1, bonus:1 };
  var KNOWN_R={ teeth:1, teeth_manual:1, guess_win:1, guess_wrong:1, guess_timeout:1, streak_bonus:1,
                parent_give:1, parent_take:1, task_done:1, task_fail:1, daily_bonus:1, spend:1 };
  var LIST_CAP=60;
  var TASK_W={ pending:0, active:1, done:2 };

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
    Promise.all([ sdk.points.summary(), sdk.data.list("tasks") ]).then(function(rr){
      if(!alive) return;
      var s=rr[0];
      S.balance=s.balance; S.streak=s.streak; S.plus=s.plusStreak||0; S.loaded=true; S.err=false;
      S.items=s.items.slice().sort(function(a,b){ return (b.createdAt||0)-(a.createdAt||0); });
      S.tasks=rr[1]||[];
      render();
    }).catch(function(){
      if(!alive) return;
      S.err=true; S.loaded=true; render();
    });
  }

  /* ---------- задания от родителей (bank/tasks) ----------
     Строка module_data: status active|pending|done; data {title, points, type recur|once,
     timesDone?, lastDoneAt?, claimedAt?, doneAt?}. Очки — ТОЛЬКО через sdk.points (канон). */
  function parentCtl(){ return sdk.role==="parent" || sdk.isDemo(); }
  function kidCtl(){ return sdk.role!=="parent" || sdk.isDemo(); }
  function taskOf(id){
    for(var i=0;i<S.tasks.length;i++) if(String(S.tasks[i].id)===String(id)) return S.tasks[i];
    return null;
  }
  function taskPts(tk){ var n=parseInt(tk.data&&tk.data.points,10); return n>0?n:10; }
  function actionable(){
    var c=0, i, st;
    for(i=0;i<S.tasks.length;i++){
      st=S.tasks[i].status;
      if(sdk.role==="parent" ? st==="pending" : st==="active") c++;
    }
    return c;
  }

  function claimTask(tk){ /* ребёнок: «Сделал!» */
    if(busy) return; busy=true;
    var pts=taskPts(tk), title=(tk.data&&tk.data.title)||"";
    if((tk.data&&tk.data.type)==="once"){
      /* одноразовое: очки сразу (решение Джеффа), kind task_done двигает винстрик */
      sdk.points.add(pts,"task_done",{kind:"task_done",src:"bank",note:title}).then(function(out){
        if(!out || !out.ok){ busy=false; sdk.ui.toast(t("loadFail")); return; }
        sdk.data.move("tasks",tk.id,"done").then(function(){
          return sdk.data.update("tasks",tk.id,{doneAt:Date.now()});
        }).catch(function(){}).then(function(){
          busy=false;
          if(out.bonus) sdk.ui.toast(t("bonusToast",{n:out.bonus}));
          else if(out.streak!=null) sdk.ui.toast(t("streakToast",{n:out.streak}));
          else sdk.ui.toast(t("doneToast"));
          sdk.ui.confetti(); sdk.ui.haptics("light");
          load();
        });
      });
      return;
    }
    /* повторяющееся: на проверку родителю */
    sdk.data.move("tasks",tk.id,"pending").then(function(){
      return sdk.data.update("tasks",tk.id,{claimedAt:Date.now()});
    }).then(function(){
      busy=false; sdk.ui.toast(t("claimToast")); sdk.ui.haptics("light"); load();
    }).catch(function(){ busy=false; sdk.ui.toast(t("loadFail")); load(); });
  }

  function approveTask(tk){ /* родитель: подтвердить — очки + задание дальше по типу */
    if(busy) return; busy=true;
    var pts=taskPts(tk), title=(tk.data&&tk.data.title)||"", once=(tk.data&&tk.data.type)==="once";
    sdk.points.add(pts,"task_done",{kind:"task_done",src:"parent",note:title}).then(function(out){
      if(!out || !out.ok){ busy=false; sdk.ui.toast(t("loadFail")); return; }
      var fin = once
        ? sdk.data.move("tasks",tk.id,"done").then(function(){
            return sdk.data.update("tasks",tk.id,{doneAt:Date.now(),claimedAt:null});
          })
        : sdk.data.update("tasks",tk.id,{
            timesDone:((tk.data&&parseInt(tk.data.timesDone,10))||0)+1,
            lastDoneAt:Date.now(), claimedAt:null
          }).then(function(){ return sdk.data.move("tasks",tk.id,"active"); });
      fin.catch(function(){}).then(function(){
        busy=false;
        if(out.bonus) sdk.ui.toast(t("bonusToast",{n:out.bonus}));
        else if(out.streak!=null) sdk.ui.toast(t("streakToast",{n:out.streak}));
        else sdk.ui.toast(t("doneToast"));
        sdk.ui.haptics("light");
        load();
      });
    });
  }

  function declineTask(tk){ /* родитель: вернуть без очков и без штрафа (решение Джеффа) */
    if(busy) return; busy=true;
    sdk.data.move("tasks",tk.id,"active").then(function(){
      return sdk.data.update("tasks",tk.id,{claimedAt:null});
    }).then(function(){
      busy=false; sdk.ui.toast(t("returnedToast")); load();
    }).catch(function(){ busy=false; sdk.ui.toast(t("loadFail")); load(); });
  }

  function deleteTask(tk){
    sdk.ui.confirm({ title:t("confirmDel",{t:(tk.data&&tk.data.title)||""}),
                     ok:t("common.delete"), cancel:t("common.cancel") }).then(function(yes){
      if(!yes || busy) return; busy=true;
      sdk.data.remove("tasks",tk.id).then(function(){ busy=false; load(); })
        .catch(function(){ busy=false; sdk.ui.toast(t("loadFail")); });
    });
  }

  function openTaskSheet(tk){ /* создание/правка задания (родитель) */
    var d=(tk&&tk.data)||{}, typ=(d.type==="once")?"once":"recur";
    var box=document.createElement("div");
    box.innerHTML='<h2>'+esc(t(tk?"editTask":"newTask"))+'</h2>'
      +'<div class="bk-tform">'
        +'<input type="text" id="bkTTitle" maxlength="60" placeholder="'+esc(t("taskTitlePh"))+'" value="'+esc(d.title||"")+'">'
        +'<label class="bk-tlbl" for="bkTPts">'+esc(t("taskPtsLbl"))+'</label>'
        +'<input type="number" id="bkTPts" inputmode="numeric" min="1" max="1000" value="'+(parseInt(d.points,10)>0?parseInt(d.points,10):10)+'">'
        +'<div class="bk-types">'
          +'<button class="bk-type'+(typ==="recur"?" on":"")+'" data-t="recur">🔁 '+esc(t("typeRecur"))+'</button>'
          +'<button class="bk-type'+(typ==="once"?" on":"")+'" data-t="once">1× '+esc(t("typeOnce"))+'</button>'
        +'</div>'
      +'</div>'
      +'<div class="sheet-actions">'
        +(tk?'<button class="btn btn-cancel" id="bkTDel">'+esc(t("deleteTask"))+'</button>'
            :'<button class="btn btn-cancel" data-close>'+esc(t("common.cancel"))+'</button>')
        +'<button class="btn btn-primary" id="bkTSave">'+esc(t("common.save"))+'</button>'
      +'</div>';
    var ctl=sdk.ui.sheet(box); curSheet=ctl;
    var cls=box.querySelector("[data-close]"); if(cls) cls.onclick=function(){ ctl.close(); };
    box.querySelectorAll(".bk-type").forEach(function(b){
      b.onclick=function(){
        typ=b.getAttribute("data-t");
        box.querySelectorAll(".bk-type").forEach(function(x){ x.classList.toggle("on",x===b); });
      };
    });
    box.querySelector("#bkTSave").onclick=function(){
      if(busy) return;
      var title=(box.querySelector("#bkTTitle").value||"").trim();
      if(!title){ sdk.ui.toast(t("needTitle")); return; }
      var pts=parseInt(box.querySelector("#bkTPts").value,10);
      if(!(pts>0)) pts=10; if(pts>1000) pts=1000;
      busy=true;
      var op = tk
        ? sdk.data.update("tasks",tk.id,{title:title,points:pts,type:typ})
        : sdk.data.create("tasks",{title:title,points:pts,type:typ,status:"active"});
      op.then(function(){
        busy=false; ctl.close(); sdk.ui.toast(t("doneToast")); load();
      }).catch(function(){ busy=false; sdk.ui.toast(t("loadFail")); });
    };
    var del=box.querySelector("#bkTDel");
    if(del) del.onclick=function(){ ctl.close(); deleteTask(tk); };
  }

  function tasksHtml(){ /* блок заданий в начале вкладки «Родители» */
    var isP=parentCtl(), isK=kidCtl();
    var list=S.tasks.filter(function(x){
      if(x.status==="done") return isP;           /* выполненные одноразовые видит родитель */
      return x.status==="active"||x.status==="pending";
    });
    list.sort(function(a,b){
      return ((TASK_W[a.status]!=null?TASK_W[a.status]:9)-(TASK_W[b.status]!=null?TASK_W[b.status]:9))
        || ((b.createdAt||0)-(a.createdAt||0));
    });
    var h="";
    if(isP) h+='<button class="btn btn-cancel bk-addtask" data-act="add">'+esc(t("btnAddTask"))+'</button>';
    for(var i=0;i<list.length;i++){
      var tk=list[i], d=tk.data||{}, pts=taskPts(tk), once=(d.type==="once");
      var meta=esc(once?t("metaOnce"):t("metaRecur"));
      var n=parseInt(d.timesDone,10)||0;
      if(!once && n) meta+=' · '+esc(t("doneTimes",{n:n}));
      var act="";
      if(tk.status==="pending"){
        if(isP) act+='<button class="bk-tbtn ok" data-act="ok" data-tid="'+esc(tk.id)+'">'+esc(t("approveBtn",{n:pts}))+'</button>'
                   +'<button class="bk-tbtn no" data-act="no" data-tid="'+esc(tk.id)+'" aria-label="'+esc(t("declineA11y"))+'">↩</button>';
        else act+='<span class="bk-chip">'+esc(t("chipPending"))+'</span>';
      } else if(tk.status==="active"){
        if(isK) act+='<button class="bk-tbtn do" data-act="claim" data-tid="'+esc(tk.id)+'">'+esc(t("btnIDid"))+'</button>';
        if(isP) act+='<button class="bk-tbtn x" data-act="del" data-tid="'+esc(tk.id)+'" aria-label="'+esc(t("deleteTask"))+'">✕</button>';
      } else { /* done */
        act+='<span class="bk-chip ok">'+esc(t("chipDone"))+'</span>';
        if(isP) act+='<button class="bk-tbtn x" data-act="del" data-tid="'+esc(tk.id)+'" aria-label="'+esc(t("deleteTask"))+'">✕</button>';
      }
      var editable=isP && tk.status==="active";
      h+='<div class="bk-task st-'+esc(tk.status)+'"'
        +(editable?' data-act="edit" data-tid="'+esc(tk.id)+'" role="button" tabindex="0"':'')+'>'
        +'<div class="bk-badge plus">+'+pts+'</div>'
        +'<div class="bk-task-main"><div class="bk-task-t">'+esc(d.title||"")+'</div>'
        +'<div class="bk-task-m">'+meta+'</div></div>'
        +'<div class="bk-tact">'+act+'</div></div>';
    }
    return h;
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

  /* ---------- рендер ---------- */
  function render(){
    if(!alive) return;
    E.pts.textContent = S.err ? "…" : S.balance;
    E.flameN.textContent = S.streak;
    E.flame.classList.toggle("off", !(S.streak>0));
    E.plusN.textContent = S.plus;
    E.plus.classList.toggle("off", !(S.plus>0));
    sdk.ui.hud({ left:t("title"), cNum:(S.err?0:S.balance), cLbl:t("hudPts"), rNum:S.streak, rLbl:t("hudStreak") });
    var an=S.err?0:actionable();
    if(E.tabN){ E.tabN.textContent=an; E.tabN.hidden=!(an>0); }
    renderList();
    if(PE){ PE.bal.textContent=S.balance; PE.str.textContent=S.streak; if(PE.plus) PE.plus.textContent=S.plus; }
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
    var html="";
    if(S.tab==="parents") html+=tasksHtml();
    if(!rows.length){
      if(!html) html='<div class="bk-empty"><p>'+esc(t(S.tab==="apps"?"emptyApps":"emptyParents"))+'</p></div>';
      box.innerHTML=html;
      return;
    }
    html+='<div class="bk-count">'+esc(plural(rows.length,"txCount",{n:rows.length}))+'</div>';
    var n;
    for(i=0;i<rows.length && i<LIST_CAP;i++){
      it=rows[i]; d=it.data||{}; n=parseInt(d.n,10)||0;
      html+='<div class="bk-row"><div class="bk-badge '+(n>=0?"plus":"minus")+'">'+(n>=0?"+":"−")+Math.abs(n)+'</div>'
        +'<div class="bk-row-main"><div class="bk-row-t">'+esc(labelOf(d))+'</div>'
        +'<div class="bk-row-d">'+esc(fmtWhen(it.createdAt))+'</div></div></div>';
    }
    box.innerHTML=html;
  }

  /* ---------- «что такое огонёк?» — объяснение для ребёнка (кнопка-огонёк с «i») ---------- */
  function openStreakInfo(){
    var box=document.createElement("div");
    box.innerHTML='<h2>'+esc(t("infoTitle"))+'</h2>'
      +'<div class="bk-info">'
        +'<p class="bk-info-intro">'+esc(t("infoIntro"))+'</p>'
        +'<div class="bk-info-rule"><span class="ic">🔥</span><p>'+esc(t("infoRule1"))+'</p></div>'
        +'<div class="bk-info-rule"><span class="ic">💨</span><p>'+esc(t("infoRule2"))+'</p></div>'
        +'<div class="bk-info-rule"><span class="ic">🎁</span><p>'+esc(t("infoRule3"))+'</p></div>'
        +'<div class="store-section">'+esc(t("infoExTitle"))+'</div>'
        +'<ul class="bk-info-ex">'
          +'<li>'+esc(t("infoEx1"))+'</li>'
          +'<li>'+esc(t("infoEx2"))+'</li>'
          +'<li>'+esc(t("infoEx3"))+'</li>'
          +'<li class="out">'+esc(t("infoEx4"))+'</li>'
          +'<li>'+esc(t("infoEx5"))+'</li></ul>'
        +'<p class="bk-info-note">'+esc(t("infoMax"))+'</p>'
        +'<p class="bk-info-note dim">'+esc(t("infoGames"))+'</p>'
      +'</div>'
      +'<div class="sheet-actions"><button class="btn btn-primary" data-close>'+esc(t("common.done"))+'</button></div>';
    var ctl=sdk.ui.sheet(box); curSheet=ctl;
    box.querySelector("[data-close]").onclick=function(){ ctl.close(); };
  }

  /* ---------- «что такое пунктстрик?» — объяснение для ребёнка (чип ⚡ с «i») ---------- */
  function openPlusInfo(){
    var box=document.createElement("div");
    box.innerHTML='<h2>'+esc(t("pinfoTitle"))+'</h2>'
      +'<div class="bk-info">'
        +'<p class="bk-info-intro">'+esc(t("pinfoIntro"))+'</p>'
        +'<div class="bk-info-rule plus"><span class="ic">⚡</span><p>'+esc(t("pinfoRule1"))+'</p></div>'
        +'<div class="bk-info-rule plus"><span class="ic">💨</span><p>'+esc(t("pinfoRule2"))+'</p></div>'
        +'<div class="bk-info-rule plus"><span class="ic">🔁</span><p>'+esc(t("pinfoRule3"))+'</p></div>'
        +'<div class="store-section">'+esc(t("pinfoExTitle"))+'</div>'
        +'<ul class="bk-info-ex plus">'
          +'<li>'+esc(t("pinfoEx1"))+'</li>'
          +'<li>'+esc(t("pinfoEx2"))+'</li>'
          +'<li>'+esc(t("pinfoEx3"))+'</li>'
          +'<li class="out">'+esc(t("pinfoEx4"))+'</li>'
          +'<li>'+esc(t("pinfoEx5"))+'</li></ul>'
        +'<p class="bk-info-note plus">'+esc(t("pinfoNote"))+'</p>'
        +'<p class="bk-info-note dim">'+esc(t("pinfoVs"))+'</p>'
      +'</div>'
      +'<div class="sheet-actions"><button class="btn btn-primary" data-close>'+esc(t("common.done"))+'</button></div>';
    var ctl=sdk.ui.sheet(box); curSheet=ctl;
    box.querySelector("[data-close]").onclick=function(){ ctl.close(); };
  }

  /* ---------- родительская панель ----------
     PIN упразднён (2026-06-07): панель открывает роль parent из сессии; демо — песочница без гейта.
     Ребёнку кнопка не рендерится (parentAllowed), тост — защитная ветка. */
  function parentAllowed(){ return sdk.role==="parent" || sdk.isDemo(); }
  function openParentGate(){
    if(parentAllowed()){ openParent(); return; }
    sdk.ui.toast(t("parentOnly"));
  }
  function openParent(){
    var box=document.createElement("div");
    box.innerHTML='<h2>'+esc(t("parentTitle"))+'</h2>'
      +'<div class="bk-pgrid">'
        +'<div class="bk-pstat"><div class="n" id="bkPBal">'+S.balance+'</div><div class="l">'+esc(t("balanceNow"))+'</div></div>'
        +'<div class="bk-pstat"><div class="n" id="bkPStr">'+S.streak+'</div><div class="l">'+esc(t("streakNow"))+'</div></div>'
        +'<div class="bk-pstat"><div class="n" id="bkPPlus">'+S.plus+'</div><div class="l">'+esc(t("plusLabel"))+'</div></div></div>'
      +'<div class="store-section">'+esc(t("secBonus"))+'</div>'
      +'<div class="bk-pbtns">'
        +'<button class="btn btn-cancel" data-op="daily">'+esc(t("btnDailyBonus"))+'</button></div>'
      +'<div class="store-section">'+esc(t("secCustom"))+'</div>'
      +'<div class="bk-custom"><input type="number" id="bkAmt" inputmode="numeric" placeholder="'+esc(t("amountPh"))+'">'
      +'<input type="text" id="bkNote" maxlength="60" placeholder="'+esc(t("notePh"))+'"></div>'
      +'<div class="sheet-actions"><button class="btn btn-cancel" data-op="take">'+esc(t("btnTake"))+'</button>'
      +'<button class="btn btn-primary" data-op="give">'+esc(t("btnGive"))+'</button></div>';
    var ctl=sdk.ui.sheet(box); curSheet=ctl;
    PE={ bal:box.querySelector("#bkPBal"), str:box.querySelector("#bkPStr"), plus:box.querySelector("#bkPPlus") };
    function val(){ return parseInt((box.querySelector("#bkAmt").value||"").trim(),10)||0; }
    function note(){ return (box.querySelector("#bkNote").value||"").trim(); }
    box.querySelectorAll("[data-op]").forEach(function(b){
      b.onclick=function(){
        var op=b.getAttribute("data-op"), n, v;
        if(busy) return;
        if(op==="daily"){ n=[5,"daily_bonus",{kind:"daily_bonus",src:"parent"}]; }
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
    S={ balance:0, streak:0, plus:0, items:[], tasks:[], tab:"apps", loaded:false, err:false };
    root.innerHTML='<div class="bk">'
      +'<div class="bk-header"><button class="back" id="bkBack" aria-label="'+esc(t("common.back"))+'">'+BACK_IC+'</button>'
        +'<div class="bk-head-main"><div class="bk-title">'+esc(t("title"))+'</div><div class="bk-sub">'+esc(t("subtitle"))+'</div></div>'
        +(parentAllowed()?'<button class="hbtn" id="bkParent" aria-label="'+esc(t("parentTitle"))+'">'+PARENT_IC+'</button>':'')+'</div>'
      +'<div class="bk-stage">'
        +'<button class="bk-flame off" id="bkFlame" aria-label="'+esc(t("infoTitle"))+'">'+FLAME_IC
          +'<span class="bk-flame-n" id="bkFlameN">0</span><span class="bk-flame-l">'+esc(t("streakLabel"))+'</span>'
          +'<span class="bk-flame-i" aria-hidden="true">i</span></button>'
        +'<button class="bk-plus off" id="bkPlus" aria-label="'+esc(t("pinfoTitle"))+'">'+BOLT_IC
          +'<span class="bk-flame-n" id="bkPlusN">0</span><span class="bk-flame-l">'+esc(t("plusLabel"))+'</span>'
          +'<span class="bk-flame-i" aria-hidden="true">i</span></button>'
        +'<div class="bk-pig" id="bkPig">'+PIG_IC
          +'<div class="bk-pig-label">'+esc(t("ptsWord"))+': <b id="bkPts">…</b></div></div></div>'
      +'<nav class="bk-tabs" id="bkTabs">'
        +'<button class="bk-tab active" data-tab="apps">'+esc(t("tabApps"))+'</button>'
        +'<button class="bk-tab" data-tab="parents">'+esc(t("tabParents"))
          +'<span class="bk-tab-n" id="bkTabN" hidden>0</span></button></nav>'
      +'<section class="bk-list" id="bkList"></section>'
      +'</div>';
    var el=root.querySelector(".bk");
    E={ pts:el.querySelector("#bkPts"), flame:el.querySelector("#bkFlame"), flameN:el.querySelector("#bkFlameN"),
        plus:el.querySelector("#bkPlus"), plusN:el.querySelector("#bkPlusN"),
        pig:el.querySelector("#bkPig"), tabs:el.querySelector("#bkTabs"), list:el.querySelector("#bkList"),
        tabN:el.querySelector("#bkTabN") };
    el.querySelector("#bkBack").onclick=function(){ sdk.ui.back(); };
    E.flame.onclick=openStreakInfo;
    E.plus.onclick=openPlusInfo;
    var pb=el.querySelector("#bkParent"); if(pb) pb.onclick=openParentGate;
    E.tabs.addEventListener("click",function(e){
      var b=e.target.closest(".bk-tab"); if(!b || !alive) return;
      S.tab=b.getAttribute("data-tab");
      E.tabs.querySelectorAll(".bk-tab").forEach(function(x){ x.classList.toggle("active",x===b); });
      renderList();
    });
    /* делегат кликов по заданиям: узел #bkList пересоздаётся при каждом mount — листенер не копится */
    E.list.addEventListener("click", onListClick);
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

  /* живое обновление (sync-поллер оболочки, v2026.06.07.47): чужие изменения — задание
     от родителя, начисление с другого устройства — подтягиваются без перезахода.
     Не дёргаем во время своей операции (busy) и при открытой шторке (curSheet). */
  function refresh(){ if(alive && !busy && !curSheet) load(); }

  RobTop.register({ id:"bank", mount:mount, unmount:unmount, refresh:refresh, messages:MESSAGES });
})();
