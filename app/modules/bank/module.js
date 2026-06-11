/* RobTop — модуль «Копилка». ДВА ВИДА по роли (v1.10.0, 2026-06-09): РЕБЁНОК — свинка с
   пунктами, огонёк-винстрик и чип-пунктстрик (геймификация); РОДИТЕЛЬ — экран управления
   БЕЗ свинки/стриков: баланс + кнопки (Начислить/Штраф) прямо на экране (иконка-
   человек и шторка-панель убраны), плюс создание заданий и очередь проверок во вкладке.
   ДВЕ ВКЛАДКИ у обеих ролей: «Задания» (управление) и «История» (ЕДИНЫЙ лог ВСЕХ транзакций,
   без разделения игры/родители). Вид выбирается parentCtl() = роль parent или демо.
   ЗАДАНИЯ (v1.9.0, слияние 2026-06-09): ОБЩИЙ движок sdk.tasks (отдельная таблица tasks +
   api/tasks.php, канон — ГАЙД-задания.md). Копилка — ЕДИНСТВЕННЫЙ полный UI заданий после
   удаления модуля «Задания» (заказ Джеффа: модуль избыточен). Вкладка «Задания» (по умолчанию)
   = полное секционное управление: РОДИТЕЛЬ — «Ждут проверки» (предложения детей + проверки
   выполнения) / «Активные» / «Выполнено» + создание/правка; РЕБЁНОК — «Сделать» / «На проверке»
   / «Выполнено» + «Предложить задание» (логирует дело со своей оценкой, родитель правит очки в
   шторке-ревью и одобряет/отклоняет). Своей логики заданий не держит — всё в движке sdk.tasks.
   ВСЕ выполнения идут через подтверждение родителя (универсально, и once, и recur):
   ребёнок «Сделал!» → pending → родитель ✓ (очки kind=task_done через sdk.points; recur →
   назад в active, once → done) или ↩ (без очков). Предложения ребёнка (origin=child, голубой
   акцент): родитель одобряет как есть (✓+N) или отклоняет (✕, исчезает) — тонкая правка
   очков и «Предложить задание» живут в модуле «Задания». Сумма у каждого своя (деф. +10).
   ВИНСТРИК (2026-06-07, v1.2.0): серия дней подряд с хотя бы одним выполненным заданием;
   выводится движком из леджера (день без задания — огонёк гаснет сам). Кнопка-огонёк с «i»
   открывает объяснение для ребёнка (openStreakInfo, простые правила + пример недели).
   ПУНКТСТРИК (2026-06-07, v1.3.0, поверх винстрика): чип ⚡ справа сверху — плюсы подряд
   без единого минуса (любой kind), минус сбрасывает в 0; считает движок (plusStreak),
   объяснение для ребёнка — openPlusInfo (свой «i»). Бонусов не даёт, капа нет.
   ШТРАФ (2026-06-07, v1.6.0, заказ Джеффа): именованный минус reason=parent_penalty
   (kind=parent) — кнопка «⚠️ Штраф» в панели родителя и на дашборде (core/parent.js);
   причина ОБЯЗАТЕЛЬНА (ребёнок в истории видит «Штраф: причина», labelOf), оповещение
   ntf.ev.bank.penalty; как любой минус, сбрасывает пунктстрик, винстрик не трогает.
   Сам ничего не считает — читает леджер через sdk.points (движок в core/sdk.js, политика — ГАЙД-очки.md). */
(function(){
  "use strict";

  var MESSAGES={
    en:{ bank:{
      title:"Piggy Bank", subtitle:"Your points for games and tasks",
      ptsWord:"points", streakLabel:"win streak",
      tabTasks:"Tasks", tabLog:"History",
      emptyLog:"No points yet — play games and do tasks!",
      subParent:"Manage points and tasks",
      mgrAdd:"+ Add points", mgrFine:"⚠️ Fine",
      assignments:"Assignments", assignmentsN:"Assignments · {n} waiting", backHistory:"History",
      giveTitle:"Add points", penTitle:"Fine",
      txCount:{one:"{n} entry",other:"{n} entries"},
      fltAll:"All", fltTasks:"Tasks", fltGames:"Games", fltApps:"Apps", fltParents:"Parents", fltShop:"Shop", moreLog:"Show more",
      hudPts:"points", hudStreak:"streak",
      loadFail:"Could not load the piggy bank", retry:"Try again",
      r_teeth:"Teeth brushing", r_teeth_manual:"Parent adjustment",
      r_guess_win:"Guess the Number — win", r_guess_wrong:"Guess the Number — wrong",
      r_guess_timeout:"Guess the Number — out of time",
      r_streak_bonus:"Streak bonus 🔥", r_parent_give:"From parents", r_parent_take:"Taken by parents",
      r_parent_penalty:"Penalty",
      r_task_done:"Parent task done", r_task_fail:"Task not done", r_daily_bonus:"All tasks of the day!",
      r_spend:"Shop", r_spend_refund:"Shop — points returned", r_other:"Points",
      earnedAll:"earned all time: {n}",
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
      btnGive:"Give", btnPen:"⚠️ Penalty", needAmount:"Enter a number first",
      needNote:"Write what the penalty is for", doneToast:"Done!",
      streakToast:"Win streak: {n} 🔥", bonusToast:"Streak bonus +{n}!",
      btnAddTask:"+ New task", btnPropose:"+ Log a task", btnIDid:"I did it!", btnReview:"Review",
      secReview:"Needs review", secActive:"Active & recurring", secTodo:"To do",
      secWaiting:"Waiting for check", secDone:"Done",
      chipPending:"waiting for check ⏳", chipDone:"done ✓",
      chipProposed:"proposed +{n}", propTag:"kid's idea", tagProposal:"my idea", denyA11y:"Decline proposal",
      typeRecur:"Repeating", typeOnce:"One-time",
      metaRecur:"🔁 repeats", metaOnce:"1× one-time", doneTimes:"done ×{n}", doneOn:"done {d}",
      approveBtn:"✓ +{n}", declineA11y:"Return without points",
      claimToast:"Sent to parents for checking!", returnedToast:"Returned without points",
      deniedToast:"Proposal declined", proposedToast:"Sent to your parents!",
      proposeTitle:"Log a task you did", proposeTitlePh:"What did you do?",
      proposePtsLbl:"How many points, you think?", proposeHint:"A parent will check it and decide.", proposeSend:"Propose",
      reviewTitle:"Review proposal", reviewPtsLbl:"Points for this", approveAdj:"Approve +{n}", denyBtn:"Decline",
      emptyKid:"No tasks yet — ask your parents, or log one you did!", emptyParent:"No tasks yet. Create the first one!",
      newTask:"New task", editTask:"Edit task",
      taskTitlePh:"What needs to be done", taskPtsLbl:"Points for completion",
      deleteTask:"Delete task", confirmDel:"Delete the task “{t}”?",
      needTitle:"Write the task name first"
    }},
    ru:{ bank:{
      title:"Копилка", subtitle:"Твои пункты за игры и задания",
      ptsWord:"пункты", streakLabel:"винстрик",
      tabTasks:"Задания", tabLog:"История",
      emptyLog:"Пунктов пока нет — играй и выполняй задания!",
      subParent:"Управляй очками и заданиями",
      mgrAdd:"+ Начислить", mgrFine:"⚠️ Штраф",
      assignments:"Назначения", assignmentsN:"Назначения · {n} ждут", backHistory:"История",
      giveTitle:"Начислить пункты", penTitle:"Штраф",
      txCount:{one:"{n} запись",few:"{n} записи",many:"{n} записей"},
      fltAll:"Все", fltTasks:"Задания", fltGames:"Игры", fltApps:"Приложения", fltParents:"Родители", fltShop:"Магазин", moreLog:"Показать ещё",
      hudPts:"пунктов", hudStreak:"винстрик",
      loadFail:"Не получилось загрузить копилку", retry:"Попробовать ещё",
      r_teeth:"Чистка зубов", r_teeth_manual:"Поправка родителя",
      r_guess_win:"Угадай число — победа", r_guess_wrong:"Угадай число — не отгадал",
      r_guess_timeout:"Угадай число — не успел",
      r_streak_bonus:"Бонус серии 🔥", r_parent_give:"От родителей", r_parent_take:"Снято родителями",
      r_parent_penalty:"Штраф",
      r_task_done:"Задание выполнено", r_task_fail:"Задание не выполнено", r_daily_bonus:"Все задания дня!",
      r_spend:"Магазин", r_spend_refund:"Магазин — возврат пунктов", r_other:"Пункты",
      earnedAll:"заработано за всё время: {n}",
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
      btnGive:"Начислить", btnPen:"⚠️ Штраф", needAmount:"Сначала введи число",
      needNote:"Сначала напиши, за что штраф", doneToast:"Готово!",
      streakToast:"Винстрик: {n} 🔥", bonusToast:"Бонус серии +{n}!",
      btnAddTask:"+ Новое задание", btnPropose:"+ Предложить задание", btnIDid:"Сделал!", btnReview:"Проверить",
      secReview:"Ждут проверки", secActive:"Активные и повторяющиеся", secTodo:"Сделать",
      secWaiting:"На проверке", secDone:"Выполнено",
      chipPending:"ждёт проверки ⏳", chipDone:"выполнено ✓",
      chipProposed:"предложено +{n}", propTag:"предложил ребёнок", tagProposal:"моё", denyA11y:"Отклонить предложение",
      typeRecur:"Повторяющееся", typeOnce:"Одноразовое",
      metaRecur:"🔁 повторяется", metaOnce:"1× одноразовое", doneTimes:"сделано ×{n}", doneOn:"выполнено {d}",
      approveBtn:"✓ +{n}", declineA11y:"Вернуть без очков",
      claimToast:"Отправлено родителям на проверку!", returnedToast:"Вернул без очков",
      deniedToast:"Предложение отклонено", proposedToast:"Отправлено родителям!",
      proposeTitle:"Залогируй своё дело", proposeTitlePh:"Что ты сделал(а)?",
      proposePtsLbl:"Сколько очков, по-твоему?", proposeHint:"Родитель проверит и решит.", proposeSend:"Предложить",
      reviewTitle:"Проверить предложение", reviewPtsLbl:"Очки за это", approveAdj:"Одобрить +{n}", denyBtn:"Отклонить",
      emptyKid:"Заданий пока нет — попроси родителей или предложи своё!", emptyParent:"Заданий пока нет. Создай первое!",
      newTask:"Новое задание", editTask:"Изменить задание",
      taskTitlePh:"Что нужно сделать", taskPtsLbl:"Очков за выполнение",
      deleteTask:"Удалить задание", confirmDel:"Удалить задание «{t}»?",
      needTitle:"Сначала напиши название"
    }},
    lv:{ bank:{
      title:"Krājkase", subtitle:"Tavi punkti par spēlēm un uzdevumiem",
      ptsWord:"punkti", streakLabel:"uzvaru sērija",
      tabTasks:"Uzdevumi", tabLog:"Vēsture",
      emptyLog:"Punktu vēl nav — spēlē un pildi uzdevumus!",
      subParent:"Pārvaldi punktus un uzdevumus",
      mgrAdd:"+ Pieskaitīt", mgrFine:"⚠️ Sods",
      assignments:"Uzdevumi", assignmentsN:"Uzdevumi · {n} gaida", backHistory:"Vēsture",
      giveTitle:"Pieskaitīt punktus", penTitle:"Sods",
      txCount:{zero:"{n} ierakstu",one:"{n} ieraksts",other:"{n} ieraksti"},
      fltAll:"Visi", fltTasks:"Uzdevumi", fltGames:"Spēles", fltApps:"Lietotnes", fltParents:"Vecāki", fltShop:"Veikals", moreLog:"Rādīt vairāk",
      hudPts:"punkti", hudStreak:"sērija",
      loadFail:"Neizdevās ielādēt krājkasi", retry:"Mēģināt vēlreiz",
      r_teeth:"Zobu tīrīšana", r_teeth_manual:"Vecāku korekcija",
      r_guess_win:"Uzmini skaitli — uzvara", r_guess_wrong:"Uzmini skaitli — nepareizi",
      r_guess_timeout:"Uzmini skaitli — laiks beidzās",
      r_streak_bonus:"Sērijas bonuss 🔥", r_parent_give:"No vecākiem", r_parent_take:"Vecāki noņēma",
      r_parent_penalty:"Sods",
      r_task_done:"Uzdevums izpildīts", r_task_fail:"Uzdevums nav izpildīts", r_daily_bonus:"Visi dienas uzdevumi!",
      r_spend:"Veikals", r_spend_refund:"Veikals — punkti atgriezti", r_other:"Punkti",
      earnedAll:"nopelnīts pavisam: {n}",
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
      btnGive:"Pieskaitīt", btnPen:"⚠️ Sods", needAmount:"Vispirms ievadi skaitli",
      needNote:"Vispirms uzraksti, par ko sods", doneToast:"Gatavs!",
      streakToast:"Uzvaru sērija: {n} 🔥", bonusToast:"Sērijas bonuss +{n}!",
      btnAddTask:"+ Jauns uzdevums", btnPropose:"+ Piedāvāt uzdevumu", btnIDid:"Izdarīju!", btnReview:"Pārbaudīt",
      secReview:"Gaida pārbaudi", secActive:"Aktīvie un atkārtotie", secTodo:"Jāizdara",
      secWaiting:"Pārbaudē", secDone:"Izpildīts",
      chipPending:"gaida pārbaudi ⏳", chipDone:"izpildīts ✓",
      chipProposed:"piedāvāts +{n}", propTag:"bērna ideja", tagProposal:"mans", denyA11y:"Noraidīt piedāvājumu",
      typeRecur:"Atkārtojas", typeOnce:"Vienreizējs",
      metaRecur:"🔁 atkārtojas", metaOnce:"1× vienreizējs", doneTimes:"izpildīts ×{n}", doneOn:"izpildīts {d}",
      approveBtn:"✓ +{n}", declineA11y:"Atgriezt bez punktiem",
      claimToast:"Nosūtīts vecākiem pārbaudei!", returnedToast:"Atgriezts bez punktiem",
      deniedToast:"Piedāvājums noraidīts", proposedToast:"Nosūtīts vecākiem!",
      proposeTitle:"Pieraksti savu darbu", proposeTitlePh:"Ko tu izdarīji?",
      proposePtsLbl:"Cik punktu, tavuprāt?", proposeHint:"Vecāks pārbaudīs un izlems.", proposeSend:"Piedāvāt",
      reviewTitle:"Pārbaudīt piedāvājumu", reviewPtsLbl:"Punkti par to", approveAdj:"Apstiprināt +{n}", denyBtn:"Noraidīt",
      emptyKid:"Uzdevumu vēl nav — palūdz vecākiem vai piedāvā savu!", emptyParent:"Uzdevumu vēl nav. Izveido pirmo!",
      newTask:"Jauns uzdevums", editTask:"Mainīt uzdevumu",
      taskTitlePh:"Kas jāizdara", taskPtsLbl:"Punkti par izpildi",
      deleteTask:"Dzēst uzdevumu", confirmDel:"Dzēst uzdevumu “{t}”?",
      needTitle:"Vispirms uzraksti nosaukumu"
    }}
  };

  /* иконки шапки (стрелка «назад» и т.п.) живут в общем реестре sdk.icons — локальных копий нет;
     ниже только уникальные SVG модуля (огонёк, молния, свинка, чеклист) */
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
  /* иконка-чеклист для пустого состояния вкладки «Задания» (порт из модуля tasks) */
  var CLIP_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="14" height="16" rx="2.5"/><path d="M9 5V4a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 4v1"/><path d="M9 13l2.2 2.2 4.3-4.7"/></svg>';

  var sdk=null, root=null, alive=false, busy=false, curSheet=null;
  var E={};
  var S={ balance:0, streak:0, items:[], tasks:[], tab:"tasks", assign:false, logType:"all", logShown:60, loaded:false, err:false };
  var KNOWN_R={ teeth:1, teeth_manual:1, guess_win:1, guess_wrong:1, guess_timeout:1, streak_bonus:1,
                parent_give:1, parent_take:1, parent_penalty:1, task_done:1, task_fail:1, daily_bonus:1, spend:1, spend_refund:1 };
  var LIST_STEP=60;
  var DONE_CAP=50;          /* лог «Выполнено» во вкладке «Задания» */

  function esc(s){ return RobTop.util.esc(s); }
  function t(k,p){ return sdk.t(k,p); }
  function plural(n,k,p){ return sdk.plural(n,k,p); }

  function labelOf(d){
    /* штраф (2026-06-07): всегда явное слово «Штраф», причина — после двоеточия */
    if(d && d.reason==="parent_penalty") return t("r_parent_penalty")+(d.note?": "+String(d.note):"");
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
  function fmtDay(ts){ return ts ? sdk.formatDate(ts,{day:"numeric",month:"short"}) : ""; }

  /* ---------- данные ---------- */
  function load(){
    Promise.all([ sdk.points.summary(), sdk.tasks.list() ]).then(function(rr){
      if(!alive) return;
      var s=rr[0];
      S.balance=s.balance; S.streak=s.streak; S.plus=s.plusStreak||0; S.loaded=true; S.err=false;
      /* заработано за всё время = сумма всех ПЛЮСОВ леджера КРОМЕ kind=spend:
         траты Магазина баланс уменьшают, но заработанное не прячут (решение Джеффа
         2026-06-07); возврат покупки (spend_refund, kind=spend) — не заработок */
      var earned=0, ei, ed;
      for(ei=0;ei<s.items.length;ei++){
        ed=s.items[ei].data||{}; var ev=parseInt(ed.n,10)||0;
        if(ev>0 && ed.kind!=="spend") earned+=ev;
      }
      S.earned=earned;
      S.items=s.items.slice().sort(function(a,b){ return (b.createdAt||0)-(a.createdAt||0); });
      S.tasks=rr[1]||[];
      render();
    }).catch(function(){
      if(!alive) return;
      S.err=true; S.loaded=true; render();
    });
  }

  /* ---------- задания от родителей: ОБЩИЙ движок sdk.tasks (ГАЙД-задания.md) ----------
     Плоский контракт: {id, title, points, type recur|once, status active|pending|done,
     timesDone, …}. Очки и оповещения — ВНУТРИ движка; модуль только рендерит и зовёт. */
  function parentCtl(){ return sdk.role==="parent" || sdk.isDemo(); }   /* экран управления (родитель/демо); иначе детский геймифицированный вид */
  function taskOf(id){
    for(var i=0;i<S.tasks.length;i++) if(String(S.tasks[i].id)===String(id)) return S.tasks[i];
    return null;
  }
  function taskPts(tk){ var n=parseInt(tk.points,10); return n>0?n:10; }
  function actionable(){
    var c=0, i, st, mgr=parentCtl();
    for(i=0;i<S.tasks.length;i++){
      st=S.tasks[i].status;
      if(mgr ? st==="pending" : st==="active") c++;
    }
    return c;
  }

  function claimTask(tk){ /* ребёнок: «Сделал!» → на проверку родителю (универсальное подтверждение) */
    if(busy) return; busy=true;
    sdk.tasks.claim(tk).then(function(out){
      busy=false;
      sdk.ui.toast(t(out && out.ok ? "claimToast" : "loadFail"));
      if(out && out.ok) sdk.ui.haptics("light");
      load();
    });
  }

  function approveTask(tk, pts){ /* родитель: подтвердить (+опц. поправка очков для предложения ребёнка) */
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

  function declineTask(tk){ /* родитель: вернуть проверку выполнения в active (без очков) */
    if(busy) return; busy=true;
    sdk.tasks.decline(tk).then(function(out){
      busy=false;
      sdk.ui.toast(t(out && out.ok ? "returnedToast" : "loadFail"));
      load();
    });
  }

  function denyTask(tk){ /* родитель: отклонить предложение ребёнка (исчезает) — поток предложений в Копилке тоже работает */
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

  function openTaskSheet(tk){ /* создание/правка задания (родитель) */
    var typ=(tk && tk.type==="once")?"once":"recur";
    var box=document.createElement("div");
    box.innerHTML='<h2>'+esc(t(tk?"editTask":"newTask"))+'</h2>'
      +'<div class="bk-tform">'
        +'<input type="text" id="bkTTitle" maxlength="60" placeholder="'+esc(t("taskTitlePh"))+'" value="'+esc(tk?tk.title:"")+'">'
        +'<label class="bk-tlbl" for="bkTPts">'+esc(t("taskPtsLbl"))+'</label>'
        +'<input type="number" id="bkTPts" inputmode="numeric" min="1" max="1000" value="'+(tk && tk.points>0?tk.points:10)+'">'
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
      /* оповещение о НОВОМ задании шлёт сам движок (task_new) */
      var op = tk
        ? sdk.tasks.update(tk.id,{title:title,points:pts,type:typ})
        : sdk.tasks.create({title:title,points:pts,type:typ});
      op.then(function(out){
        busy=false;
        if(!out || !out.ok){ sdk.ui.toast(t("loadFail")); return; }
        ctl.close(); sdk.ui.toast(t("doneToast"));
        load();
      });
    };
    var del=box.querySelector("#bkTDel");
    if(del) del.onclick=function(){ ctl.close(); deleteTask(tk); };
  }

  function openProposeSheet(){ /* ребёнок: залогировать сделанное дело со своей оценкой очков */
    var box=document.createElement("div");
    box.innerHTML='<h2>'+esc(t("proposeTitle"))+'</h2>'
      +'<div class="bk-tform">'
        +'<input type="text" id="bkPTitle" maxlength="60" placeholder="'+esc(t("proposeTitlePh"))+'">'
        +'<label class="bk-tlbl" for="bkPPts">'+esc(t("proposePtsLbl"))+'</label>'
        +'<input type="number" id="bkPPts" inputmode="numeric" min="1" max="1000" value="10">'
      +'</div>'
      +'<p class="bk-thint">'+esc(t("proposeHint"))+'</p>'
      +'<div class="sheet-actions"><button class="btn btn-cancel" data-close>'+esc(t("common.cancel"))+'</button>'
        +'<button class="btn btn-primary" id="bkPSend">'+esc(t("proposeSend"))+'</button></div>';
    var ctl=sdk.ui.sheet(box); curSheet=ctl;
    box.querySelector("[data-close]").onclick=function(){ ctl.close(); };
    box.querySelector("#bkPSend").onclick=function(){
      if(busy) return;
      var ttl=(box.querySelector("#bkPTitle").value||"").trim();
      if(!ttl){ sdk.ui.toast(t("needTitle")); return; }
      var pts=parseInt(box.querySelector("#bkPPts").value,10);
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
      +'<div class="bk-review">'
        +'<div class="bk-rv-title">'+esc(tk.title||"")+'</div>'
        +'<label class="bk-tlbl" for="bkRvPts">'+esc(t("reviewPtsLbl"))+'</label>'
        +'<input type="number" id="bkRvPts" inputmode="numeric" min="1" max="1000" value="'+(tk.points>0?tk.points:10)+'">'
      +'</div>'
      +'<div class="sheet-actions"><button class="btn btn-cancel" id="bkRvDeny">'+esc(t("denyBtn"))+'</button>'
        +'<button class="btn btn-primary" id="bkRvOk">'+esc(t("approveAdj",{n:tk.points||10}))+'</button></div>';
    var ctl=sdk.ui.sheet(box); curSheet=ctl;
    var inp=box.querySelector("#bkRvPts"), ok=box.querySelector("#bkRvOk");
    inp.oninput=function(){ var n=parseInt(inp.value,10); ok.textContent=t("approveAdj",{n:(n>0?Math.min(n,1000):10)}); };
    box.querySelector("#bkRvDeny").onclick=function(){ ctl.close(); denyTask(tk); };
    ok.onclick=function(){
      var n=parseInt(inp.value,10); if(!(n>0)) n=10; if(n>1000) n=1000;
      ctl.close(); approveTask(tk, n);
    };
  }

  /* ---------- вкладка «Задания»: полное управление (стопка секций, порт модуля tasks) ---------- */
  function bucket(){ /* разложить задания по корзинам */
    var b={ review:[], active:[], done:[], todo:[], waiting:[] }, i, tk;
    for(i=0;i<S.tasks.length;i++){
      tk=S.tasks[i];
      if(tk.status==="pending"){ b.review.push(tk); b.waiting.push(tk); }
      else if(tk.status==="active"){ b.active.push(tk); }
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
  function metaLine(tk){
    var once=(tk.type==="once"), m=esc(once?t("metaOnce"):t("metaRecur"));
    if(!once && tk.timesDone) m+=' · '+esc(t("doneTimes",{n:tk.timesDone}));
    return m;
  }
  function taskCard(tk, kind){ /* kind: review|active|done|todo|waiting */
    var pts=taskPts(tk), prop=(tk.origin==="child"), act="", sub="", cls="";
    if(kind==="review"){
      if(prop){
        /* предложение ребёнка: родитель открывает шторку-ревью (правит очки), одобряет или отклоняет */
        cls=" prop"; sub='<span class="bk-tag">'+esc(t("propTag"))+'</span> '+esc(t("chipProposed",{n:pts}));
        act='<button class="bk-tbtn ok" data-act="review" data-tid="'+esc(tk.id)+'">'+esc(t("btnReview"))+'</button>';
      } else {
        sub=metaLine(tk);
        act='<button class="bk-tbtn ok" data-act="ok" data-tid="'+esc(tk.id)+'">'+esc(t("approveBtn",{n:pts}))+'</button>'
           +'<button class="bk-tbtn no" data-act="no" data-tid="'+esc(tk.id)+'" aria-label="'+esc(t("declineA11y"))+'">↩</button>';
      }
    } else if(kind==="active"){
      sub=metaLine(tk);
      act='<button class="bk-tbtn x" data-act="del" data-tid="'+esc(tk.id)+'" aria-label="'+esc(t("deleteTask"))+'">✕</button>';
    } else if(kind==="todo"){
      sub=metaLine(tk);
      act='<button class="bk-tbtn do" data-act="claim" data-tid="'+esc(tk.id)+'">'+esc(t("btnIDid"))+'</button>';
    } else if(kind==="waiting"){
      sub=prop?('<span class="bk-tag">'+esc(t("tagProposal"))+'</span> '+esc(t("chipProposed",{n:pts}))):metaLine(tk);
      act='<span class="bk-chip">'+esc(t("chipPending"))+'</span>';
    } else { /* done */
      sub=tk.doneAt?esc(t("doneOn",{d:fmtDay(tk.doneAt)})):metaLine(tk);
      act='<span class="bk-chip ok">'+esc(t("chipDone"))+'</span>';
      if(parentCtl()) act+='<button class="bk-tbtn x" data-act="del" data-tid="'+esc(tk.id)+'" aria-label="'+esc(t("deleteTask"))+'">✕</button>';
    }
    /* активную карточку родитель может тапнуть для правки */
    var editable=(kind==="active" && parentCtl());
    return '<div class="bk-task st-'+esc(tk.status)+cls+'"'
      +(editable?' data-act="edit" data-tid="'+esc(tk.id)+'" role="button" tabindex="0"':'')+'>'
      +'<div class="bk-badge plus">+'+pts+'</div>'
      +'<div class="bk-task-main"><div class="bk-task-t">'+esc(tk.title||"")+'</div>'
      +'<div class="bk-task-m">'+sub+'</div></div>'
      +'<div class="bk-tact">'+act+'</div></div>';
  }
  function section(titleKey, list, kind){
    if(!list.length) return "";
    var h='<div class="bk-sec"><div class="bk-sec-h"><span>'+esc(t(titleKey))+'</span><span class="bk-sec-n">'+list.length+'</span></div>';
    for(var i=0;i<list.length;i++) h+=taskCard(list[i],kind);
    return h+'</div>';
  }
  function renderTasks(){ /* вкладка «Задания»: родитель/ребёнок (в демо — родительский вид) */
    var box=E.list, b=bucket(), h="";
    if(parentCtl()){
      h+='<div class="bk-asgn-top"><button class="btn btn-cancel" data-act="backlog">'+esc(t("backHistory"))+'</button></div>';
      h+='<button class="btn btn-cancel bk-addtask" data-act="add">'+esc(t("btnAddTask"))+'</button>';
      h+=section("secReview", b.review, "review");
      h+=section("secActive", b.active, "active");
      h+=section("secDone", b.done.slice(0,DONE_CAP), "done");
      if(!b.review.length && !b.active.length && !b.done.length)
        h+='<div class="bk-empty"><div class="bk-empty-ic">'+CLIP_IC+'</div><p>'+esc(t("emptyParent"))+'</p></div>';
    } else {
      h+='<button class="btn btn-cancel bk-addtask" data-act="propose">'+esc(t("btnPropose"))+'</button>';
      h+=section("secTodo", b.todo, "todo");
      h+=section("secWaiting", b.waiting, "waiting");
      h+=section("secDone", b.done.slice(0,DONE_CAP), "done");
      if(!b.todo.length && !b.waiting.length && !b.done.length)
        h+='<div class="bk-empty"><div class="bk-empty-ic">'+CLIP_IC+'</div><p>'+esc(t("emptyKid"))+'</p></div>';
    }
    box.innerHTML=h;
  }
  function onListClick(e){
    if(!alive) return;
    var b=e.target.closest("[data-act]"); if(!b || !E.list.contains(b)) return;
    var act=b.getAttribute("data-act");
    if(act==="add"){ openTaskSheet(null); return; }
    if(act==="propose"){ openProposeSheet(); return; }
    if(act==="backlog"){ S.assign=false; render(); return; }
    if(act==="morelog"){ S.logShown+=LIST_STEP; renderList(); return; }
    var tk=taskOf(b.getAttribute("data-tid")); if(!tk) return;
    if(act==="edit"){ openTaskSheet(tk); }
    else if(act==="claim"){ claimTask(tk); }
    else if(act==="ok"){ approveTask(tk); }
    else if(act==="no"){ declineTask(tk); }
    else if(act==="review"){ openReviewSheet(tk); }
    else if(act==="deny"){ denyTask(tk); }
    else if(act==="del"){ deleteTask(tk); }
  }

  /* ---------- рендер ---------- */
  function render(){
    if(!alive) return;
    if(parentCtl()){                                  /* экран управления: только баланс */
      if(E.mgrBal) E.mgrBal.textContent = S.err ? "…" : S.balance;
      sdk.ui.hud({ left:t("title"), cNum:(S.err?0:S.balance), cLbl:t("hudPts") });
    } else {                                          /* детский вид: свинка + стрики */
      if(E.pts) E.pts.textContent = S.err ? "…" : S.balance;
      if(E.earned){ E.earned.textContent = S.err ? "" : t("earnedAll",{n:S.earned||0}); E.earned.hidden = !!S.err; }
      if(E.flameN){ E.flameN.textContent=S.streak; E.flame.classList.toggle("off", !(S.streak>0)); }
      if(E.plusN){ E.plusN.textContent=S.plus; E.plus.classList.toggle("off", !(S.plus>0)); }
      sdk.ui.hud({ left:t("title"), cNum:(S.err?0:S.balance), cLbl:t("hudPts"), rNum:S.streak, rLbl:t("hudStreak") });
    }
    var an=S.err?0:actionable();
    if(E.tabN){ E.tabN.textContent=an; E.tabN.hidden=!(an>0); }
    if(E.assignBtn){
      E.assignBtn.textContent=an>0?t("assignmentsN",{n:an}):t("assignments");
      E.assignBtn.classList.toggle("attention", an>0);
    }
    renderList();
  }
  function renderList(){
    var box=E.list;
    if(S.err){
      box.innerHTML='<div class="bk-empty"><p>'+esc(t("loadFail"))+'</p><button class="btn btn-cancel" id="bkRetry">'+esc(t("retry"))+'</button></div>';
      var rb=box.querySelector("#bkRetry"); if(rb) rb.onclick=function(){ S.err=false; load(); };
      return;
    }
    if(parentCtl() && S.assign){ renderTasks(); return; } /* родительские назначения живут отдельно от лога */
    if(!parentCtl() && S.tab==="tasks"){ renderTasks(); return; }   /* детская вкладка заданий */
    /* вкладка «История»: ЕДИНЫЙ лог ВСЕХ транзакций, фильтры по типу, догрузка порциями */
    var rows=filteredItems(), html="", i, it, d, n, types=["all","tasks","games","apps","parents","shop"];
    if(!rows.length){
      box.innerHTML=logFilters(types)+'<div class="bk-empty"><p>'+esc(t("emptyLog"))+'</p></div>';
      return;
    }
    html+=logFilters(types)+'<div class="bk-count">'+esc(plural(rows.length,"txCount",{n:rows.length}))+'</div>';
    for(i=0;i<rows.length && i<S.logShown;i++){
      it=rows[i]; d=it.data||{}; n=parseInt(d.n,10)||0;
      html+='<div class="bk-row"><div class="bk-badge '+(n>=0?"plus":"minus")+'">'+(n>=0?"+":"−")+Math.abs(n)+'</div>'
        +'<div class="bk-row-main"><div class="bk-row-t">'+esc(labelOf(d))+'</div>'
        +'<div class="bk-row-d">'+esc(fmtWhen(it.createdAt))+'</div></div></div>';
    }
    if(rows.length>S.logShown) html+='<button class="btn btn-cancel bk-morelog" data-act="morelog">'+esc(t("moreLog"))+'</button>';
    box.innerHTML=html;
  }
  function logKind(d){
    d=d||{};
    if(d.kind==="task_done"||d.kind==="bonus"||d.kind==="daily_bonus"||d.reason==="task_fail") return "tasks";
    if(d.kind==="parent"||d.kind==="manual") return "parents";
    if(d.kind==="spend") return "shop";
    if(d.src==="guess"||d.src==="snake"||/^guess_/.test(d.reason||"")||/^snake_/.test(d.reason||"")) return "games";
    return "apps";
  }
  function filteredItems(){
    var all=S.items||[], typ=S.logType||"all";
    if(typ==="all") return all;
    return all.filter(function(it){ return logKind((it&&it.data)||{})===typ; });
  }
  function logFilters(types){
    return '<div class="bk-filters">'+types.map(function(x){
      return '<button type="button" class="'+(S.logType===x?"on":"")+'" data-filter="'+x+'">'+esc(t("flt"+x.charAt(0).toUpperCase()+x.slice(1)))+'</button>';
    }).join("")+'</div>';
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

  /* ---------- действия родителя (прямо на экране управления; шторка-панель и иконка-человек убраны 2026-06-09) ----------
     op: give (+N) | pen (штраф −N, причина обязательна). */
  function pointsResult(out, op, amt, note){
    if(!out || !out.ok){ sdk.ui.toast(t("loadFail")); return false; }
    if(out.bonus) sdk.ui.toast(t("bonusToast",{n:out.bonus}));
    else if(out.streak!=null) sdk.ui.toast(t("streakToast",{n:out.streak}));
    else sdk.ui.toast(t("doneToast"));
    sdk.ui.haptics("light");
    if(sdk.notify){
      sdk.notify.send("child", op==="pen"?"penalty":(op==="give"?"points_given":"points_taken"),
            {params:{n:Math.abs(amt),note:note||""},link:{module:"bank"}});
    }
    return true;
  }
  function openPointsSheet(op){ /* give|pen — сумма (+ причина для штрафа) */
    var titleKey = op==="pen"?"penTitle":"giveTitle";
    var doLbl = op==="pen"?"mgrFine":"mgrAdd";
    var box=document.createElement("div");
    box.innerHTML='<h2>'+esc(t(titleKey))+'</h2>'
      +'<div class="bk-custom"><input type="number" id="bkAmt" inputmode="numeric" placeholder="'+esc(t("amountPh"))+'">'
        +'<input type="text" id="bkNote" maxlength="60" placeholder="'+esc(t("notePh"))+'"></div>'
      +'<div class="sheet-actions"><button class="btn btn-cancel" data-close>'+esc(t("common.cancel"))+'</button>'
        +'<button class="btn btn-primary'+(op==="pen"?" bk-pen":"")+'" id="bkPDo">'+esc(t(doLbl))+'</button></div>';
    var ctl=sdk.ui.sheet(box); curSheet=ctl;
    box.querySelector("[data-close]").onclick=function(){ ctl.close(); };
    box.querySelector("#bkPDo").onclick=function(){
      if(busy) return;
      var v=parseInt((box.querySelector("#bkAmt").value||"").trim(),10)||0;
      var note=(box.querySelector("#bkNote").value||"").trim();
      if(!v){ sdk.ui.toast(t("needAmount")); return; }
      if(op==="pen" && !note){ sdk.ui.toast(t("needNote")); return; }
      var n = op==="pen" ? [ -Math.abs(v), "parent_penalty", {kind:"parent",src:"parent",note:note} ]
            :              [  Math.abs(v), "parent_give",    {kind:"parent",src:"parent",note:note} ];
      busy=true;
      sdk.points.add(n[0],n[1],n[2]).then(function(out){
        busy=false;
        if(pointsResult(out, op, n[0], note)){ ctl.close(); load(); }
      }).catch(function(){
        busy=false;
        sdk.ui.toast(t("loadFail"));
      });
    };
  }

  /* ---------- каркас ---------- */
  function mount(rootEl, theSdk){
    sdk=theSdk; root=rootEl; alive=true; busy=false; curSheet=null;
    var mgr=parentCtl();
    S={ balance:0, streak:0, plus:0, items:[], tasks:[], tab:(mgr?"log":"tasks"), assign:false, logType:"all", logShown:LIST_STEP, loaded:false, err:false };
    /* guardrails: шапку строит общая рамка (sdk.ui.frame); модуль наполняет только body. Иконки-действия в шапке нет. */
    var body=sdk.ui.frame({
      titleHtml:'<div class="bk-title">'+esc(t("title"))+'</div><div class="bk-sub">'+esc(t(mgr?"subParent":"subtitle"))+'</div>',
      backLabel:t("common.back"),
      actions:[]
    }).body;
    var stage = mgr
      ? '<div class="bk-mgr">'
          +'<div class="bk-mgr-bal"><span class="l">'+esc(t("balanceNow"))+'</span><b id="bkMgrBal">…</b></div>'
          +'<div class="bk-mgr-btns">'
            +'<button class="btn btn-primary" data-op="give">'+esc(t("mgrAdd"))+'</button>'
            +'<button class="btn btn-cancel bk-pen" data-op="pen">'+esc(t("mgrFine"))+'</button>'
          +'</div></div>'
      : '<div class="bk-stage">'
          +'<button class="bk-flame off" id="bkFlame" aria-label="'+esc(t("infoTitle"))+'">'+FLAME_IC
            +'<span class="bk-flame-n" id="bkFlameN">0</span><span class="bk-flame-l">'+esc(t("streakLabel"))+'</span>'
            +'<span class="bk-flame-i" aria-hidden="true">i</span></button>'
          +'<button class="bk-plus off" id="bkPlus" aria-label="'+esc(t("pinfoTitle"))+'">'+BOLT_IC
            +'<span class="bk-flame-n" id="bkPlusN">0</span><span class="bk-flame-l">'+esc(t("plusLabel"))+'</span>'
            +'<span class="bk-flame-i" aria-hidden="true">i</span></button>'
          +'<div class="bk-pig" id="bkPig">'+PIG_IC
            +'<div class="bk-pig-label">'+esc(t("ptsWord"))+': <b id="bkPts">…</b></div></div>'
          +'<div class="bk-earned" id="bkEarned" hidden></div>';
    body.innerHTML='<div class="bk">'+stage
      +(mgr?'<button class="btn btn-cancel bk-assign" id="bkAssign">'+esc(t("assignments"))+'</button>'
        :'<nav class="bk-tabs" id="bkTabs">'
          +'<button class="bk-tab active" data-tab="tasks">'+esc(t("tabTasks"))
            +'<span class="bk-tab-n" id="bkTabN" hidden>0</span></button>'
          +'<button class="bk-tab" data-tab="log">'+esc(t("tabLog"))+'</button></nav>')
      +'<section class="bk-list" id="bkList"></section>'
      +'</div>';
    var el=body.querySelector(".bk");
    E={ tabs:el.querySelector("#bkTabs"), list:el.querySelector("#bkList"), tabN:el.querySelector("#bkTabN"), assignBtn:el.querySelector("#bkAssign") };
    if(mgr){
      E.mgrBal=el.querySelector("#bkMgrBal");
      el.querySelectorAll(".bk-mgr-btns [data-op]").forEach(function(b){
        b.onclick=function(){ openPointsSheet(b.getAttribute("data-op")); };
      });
      if(E.assignBtn) E.assignBtn.onclick=function(){ S.assign=true; render(); };
    } else {
      E.pts=el.querySelector("#bkPts"); E.flame=el.querySelector("#bkFlame"); E.flameN=el.querySelector("#bkFlameN");
      E.plus=el.querySelector("#bkPlus"); E.plusN=el.querySelector("#bkPlusN");
      E.pig=el.querySelector("#bkPig"); E.earned=el.querySelector("#bkEarned");
      E.flame.onclick=openStreakInfo;
      E.plus.onclick=openPlusInfo;
      E.pig.addEventListener("click",function(){
        if(!alive) return;
        E.pig.classList.remove("wobble"); void E.pig.offsetWidth; E.pig.classList.add("wobble");
        sdk.ui.haptics("light"); sdk.ui.chime();
      });
    }
    if(E.tabs) E.tabs.addEventListener("click",function(e){
      var b=e.target.closest(".bk-tab"); if(!b || !alive) return;
      S.tab=b.getAttribute("data-tab");
      if(S.tab==="log") S.logShown=LIST_STEP;
      E.tabs.querySelectorAll(".bk-tab").forEach(function(x){ x.classList.toggle("active",x===b); });
      renderList();
    });
    E.list.addEventListener("click",function(e){
      var f=e.target.closest("[data-filter]"); if(!f || !E.list.contains(f)) return;
      S.logType=f.getAttribute("data-filter")||"all"; S.logShown=LIST_STEP; renderList();
    });
    /* делегат кликов по заданиям: узел #bkList пересоздаётся при каждом mount — листенер не копится */
    E.list.addEventListener("click", onListClick);
    load();
  }
  function unmount(){
    alive=false; busy=false;
    if(curSheet && curSheet.close){ try{ curSheet.close(); }catch(e){} }
    curSheet=null; E={};
  }

  /* живое обновление (sync-поллер оболочки, v2026.06.07.47): чужие изменения — задание
     от родителя, начисление с другого устройства — подтягиваются без перезахода.
     Занят (своя операция busy / открытая шторка curSheet) → вернуть false: shell
     НЕ сдвинет отпечаток и повторит следующим тиком — обновление не теряется
     (фикс v2026.06.07.55: раньше изменение, пришедшее в занятый модуль, пропадало). */
  function refresh(){
    if(!alive) return true;             // демонтирован — изменение не для нас
    if(busy || curSheet) return false;  // занят — повторить позже
    load(); return true;
  }
  function link(){
    if(parentCtl()){
      S.assign=true;
      render();
    }
  }

  RobTop.register({ id:"bank", mount:mount, unmount:unmount, refresh:refresh, link:link, messages:MESSAGES });
})();
