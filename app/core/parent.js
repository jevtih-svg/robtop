/* RobTop — РОДИТЕЛЬСКОЕ ПРИЛОЖЕНИЕ v2 (переосмысление, 2026-06-08).
   Показывается ТОЛЬКО родительской сессии вместо детского главного экрана.

   ИДЕЯ (фидбек Джеффа): родитель видит то же, что ребёнок, но «расширенное».
   Домашний экран = СЕТКА ПЛИТОК как у ребёнка (те же .tile) + чипы детей сверху +
   баланс очков + «Начислить»/«Штраф». Тап по плитке-трекеру открывает ОБЛАСТЬ приложения
   (статистика этого приложения + записи ребёнка с КЛИКАБЕЛЬНОЙ деталью + последние события).
   Статистика живёт ВНУТРИ приложений, отдельного агрегатного дашборда больше нет.

   УБРАНО из v1: график «Активность по дням», фильтр 7/30, HUD действий/дней, блок «Заметки»,
   отдельная вкладка «Журнал» (по клику не было деталей — теперь деталь в области приложения).
   Виш-лист из нижней вкладки стал обычной плиткой-областью.

   НИЖНЯЯ НАВИГАЦИЯ (выбор Джеффа): Приложения / Копилка / Чат. Копилка и Чат — ежедневные
   инструменты родителя, открывают САМ модуль (RobTop.open), как делали карточки в v1.

   ИГРЫ (snake/guess/reverse/names) скрыты по умолчанию: hiddenParent (миграция 025,
   user_prefs.hidden_tiles_parent). Вернуть/спрятать любую плитку — «глазом» в режиме
   перестановки (long-press), как у ребёнка. Сетка/плитки/«глаз»/«Скрытые» — это штатные
   .tile/.jgl-eye оболочки (ui.css), новых стилей минимум (чипы + карточка очков, инжект ниже).

   Данные: GET api/parent.php (скоуп ребёнка на сервере, гейт rt_require_parent).
   Контракт областей пока захардкожен здесь (AREA_MODS); план вынести в module.parent.* —
   в ПЛАН-родитель-v2.md. Открытые вопросы (вкл/выкл приложения ребёнку, семьи в Настройках) —
   следующий этап. */
window.RobTop = window.RobTop || {};
(function(RT){
  "use strict";
  var I=RT.i18n;

  /* =================== СЛОВАРИ (en/ru/lv) =================== */
  I.add({
  en:{ parent:{
    badge:"View only", lastSeen:"last activity: {x}", never:"no activity yet",
    refresh:"Refresh", switchChild:"Choose a child", close:"Close",
    noChild:{ h:"No children yet", p:"Add a child in Settings → Family — their wishlist, stats and activity will appear here." , btn:"Open Settings"},
    loadFail:"Couldn't load the data", retry:"Retry",
    nav:{ apps:"Apps", bank:"Bank", chat:"Chat" },
    areaSect:{ stat:"Stats", content:"Child's entries", recent:"Recent" },
    st:{ streak:"streak", period:"in total", avg:"average", rated:"rated", often:"most often", recs:"entries",
      want:"want", thinking:"thinking", bought:"bought", walks:"walks", points:"points" },
    openApp:"Open app", points:"points",
    sum:{ wishlist:"{want} want · {bought} bought",
      teeth:"streak {n} 🔥", rating:"avg {avg}★", mood:"most {e}", reverse:"{c} words", guess:"{w} of {c}",
      walk:"{c} walks", names:"fun names", snake:"snake", bank:"{p} pts · {s} 🔥",
      tasks:"⏳ {n} waiting", tasksNone:"{n} active", shop:"🛍 {n} to approve", shopNone:"{n} prizes",
      chat:"open chat", none:"open" },
    m:{ lastEvents:"Recent events", empty:"Nothing here yet.",
      noText:"no comment", liked:"Liked: {x}", walkAdd:"🐾 Log a walk" },
    give:{ btn:"⭐ Give points", title:"Give points", customPh:"How many", notePh:"What for? (the child will see it)",
      submit:"Give +{n}", needAmount:"Enter the amount", needNote:"Write what it's for",
      done:"+{n} points added", fail:"Couldn't save, try again" },
    pen:{ btn:"⚠️ Penalty", title:"Penalty", submit:"Take −{n}", done:"−{n} points taken" },
    g:{ win:"guessed it", wrong:"missed", timeout:"time ran out" },
    wl:{ banner:"View mode. Only {name} can make changes.",
      want:"Want", thinking:"Thinking", bought:"Bought", empty:"Nothing in this section.",
      chipChanged:"changed ×{n}", chipDays:{one:"in {n} day",other:"in {n} days"}, chipLink:"link",
      note:"Why I want it", openLink:"Open link", histTitle:"Wish history",
      hist:{ created:"Added", changed_mind:"Changed mind", purchased:"Bought", back_to_want:"Want again", edited:"Edited" },
      cnt:{ changed:"changed mind", bought:"bought", returned:"returned" },
      ro:"View only — only {name} edits", close:"Close", fullPhoto:"Open full photo" },
    mood:{ happy:"Happy", mid:"So-so", sad:"Sad" },
    acct:"sign-in",
    ev:{
      accounts:{ login:"Signed in to the app" },
      wishlist:{ created:"Added a wish: “{t}”", changed_mind:"Changed mind: “{t}”", purchased:"“{t}” — bought! 🎉",
        back_to_want:"Wants “{t}” again", edited:"Edited the wish “{t}”", favorite:"Marked ★ “{t}”",
        unfavorite:"Removed ★ “{t}”", deleted:"Removed the wish “{t}”", restored:"Brought back “{t}”", undo:"Undid an action",
        share_request:"Asked to allow wishlist sharing 📨", share_grant:"Shared the wishlist with “{t}”",
        share_revoke:"Removed wishlist access from “{t}”",
        share_enabled:"Parent {n} enabled the public wishlist 🌐", share_disabled:"Parent {n} disabled the public wishlist 🔒" },
      teeth:{ done:"Brushed teeth · +10", skipped:"Skipped brushing", started:"Started brushing" },
      rating:{ day_rated:"Rated the day: {stars}" },
      mood:{ mood_set:"Mood of the day: {e} {name}" },
      reverse:{ created:"Reversed a word" },
      guess:{ win:"Guess the Number: guessed it! +10", wrong:"Guess the Number: wrong answer −5", timeout:"Guess the Number: time ran out −5" },
      generic:{ created:"Added an entry", edited:"Edited an entry", moved:"Moved an entry", favorite:"Marked a favorite",
        unfavorite:"Removed a favorite", deleted:"Removed an entry", restored:"Restored an entry", undo:"Undid an action" }
    }
  }},
  ru:{ parent:{
    badge:"Только просмотр", lastSeen:"последняя активность: {x}", never:"активности ещё не было",
    refresh:"Обновить", switchChild:"Выбрать ребёнка", close:"Закрыть",
    noChild:{ h:"Детей пока нет", p:"Добавь ребёнка в Настройках → Семья — здесь появятся его виш-лист, статистика и активность.", btn:"Открыть настройки"},
    loadFail:"Не удалось загрузить данные", retry:"Повторить",
    nav:{ apps:"Приложения", bank:"Копилка", chat:"Чат" },
    areaSect:{ stat:"Статистика", content:"Записи ребёнка", recent:"Последнее" },
    st:{ streak:"винстрик", period:"всего", avg:"средняя", rated:"оценок", often:"чаще всего", recs:"записей",
      want:"хочу", thinking:"думаю", bought:"куплено", walks:"прогулок", points:"очков" },
    openApp:"Открыть приложение", points:"очков всего",
    sum:{ wishlist:"{want} хочу · {bought} куплено",
      teeth:"серия {n} 🔥", rating:"средняя {avg}★", mood:"чаще {e}", reverse:"{c} слов", guess:"{w} из {c}",
      walk:"{c} прогулок", names:"смешные имена", snake:"змейка", bank:"{p} оч · {s} 🔥",
      tasks:"⏳ {n} ждут проверки", tasksNone:"{n} активных", shop:"🛍 {n} на подтверждении", shopNone:"{n} призов",
      chat:"открыть чат", none:"открыть" },
    m:{ lastEvents:"Последние события", empty:"Пока пусто.",
      noText:"без комментария", liked:"Понравилось: {x}", walkAdd:"🐾 Записать прогулку" },
    give:{ btn:"⭐ Начислить очки", title:"Начислить очки", customPh:"Сколько", notePh:"За что? (увидит ребёнок)",
      submit:"Начислить +{n}", needAmount:"Введи сумму", needNote:"Напиши, за что",
      done:"+{n} пунктов начислено", fail:"Не получилось сохранить, попробуй ещё раз" },
    pen:{ btn:"⚠️ Штраф", title:"Штраф", submit:"Снять −{n}", done:"−{n} пунктов снято" },
    g:{ win:"угадал", wrong:"не угадал", timeout:"время вышло" },
    wl:{ banner:"Режим просмотра. Изменения может вносить только {name}.",
      want:"Хочу", thinking:"Думаю", bought:"Купил", empty:"В этом разделе пусто.",
      chipChanged:"передумал ×{n}", chipDays:{one:"за {n} день",few:"за {n} дня",many:"за {n} дней"}, chipLink:"ссылка",
      note:"Почему хочу", openLink:"Открыть ссылку", histTitle:"История желания",
      hist:{ created:"Добавлено", changed_mind:"Передумал", purchased:"Куплено", back_to_want:"Снова хочу", edited:"Изменено" },
      cnt:{ changed:"раз передумал", bought:"раз куплено", returned:"раз вернул" },
      ro:"Только просмотр — редактирует {name}", close:"Закрыть", fullPhoto:"Открыть фото полностью" },
    mood:{ happy:"Весёлое", mid:"Среднее", sad:"Грустное" },
    acct:"вход",
    ev:{
      accounts:{ login:"Вошёл в приложение" },
      wishlist:{ created:"Добавил желание «{t}»", changed_mind:"Передумал: «{t}»", purchased:"«{t}» — куплено! 🎉",
        back_to_want:"Снова хочет «{t}»", edited:"Изменил желание «{t}»", favorite:"Отметил ★ «{t}»",
        unfavorite:"Снял ★ «{t}»", deleted:"Удалил желание «{t}»", restored:"Вернул «{t}»", undo:"Отменил действие",
        share_request:"Попросил разрешить делиться виш-листом 📨", share_grant:"Поделился виш-листом с «{t}»",
        share_revoke:"Убрал доступ к виш-листу у «{t}»",
        share_enabled:"Родитель {n} включил публичный виш-лист 🌐", share_disabled:"Родитель {n} выключил публичный виш-лист 🔒" },
      teeth:{ done:"Почистил зубы · +10", skipped:"Пропустил чистку", started:"Начал чистку зубов" },
      rating:{ day_rated:"Оценил день: {stars}" },
      mood:{ mood_set:"Настроение дня: {e} {name}" },
      reverse:{ created:"Перевернул слово" },
      guess:{ win:"Угадай число: угадал! +10", wrong:"Угадай число: не угадал −5", timeout:"Угадай число: время вышло −5" },
      generic:{ created:"Добавил запись", edited:"Изменил запись", moved:"Переместил запись", favorite:"Отметил избранное",
        unfavorite:"Снял избранное", deleted:"Удалил запись", restored:"Восстановил запись", undo:"Отменил действие" }
    }
  }},
  lv:{ parent:{
    badge:"Tikai skatīšanās", lastSeen:"pēdējā aktivitāte: {x}", never:"aktivitātes vēl nav",
    refresh:"Atjaunot", switchChild:"Izvēlēties bērnu", close:"Aizvērt",
    noChild:{ h:"Bērnu vēl nav", p:"Pievieno bērnu Iestatījumos → Ģimene — šeit parādīsies viņa vēlmju saraksts, statistika un aktivitāte.", btn:"Atvērt iestatījumus"},
    loadFail:"Neizdevās ielādēt datus", retry:"Mēģināt vēlreiz",
    nav:{ apps:"Lietotnes", bank:"Krājkase", chat:"Čats" },
    areaSect:{ stat:"Statistika", content:"Bērna ieraksti", recent:"Pēdējie" },
    st:{ streak:"sērija", period:"kopā", avg:"vidēji", rated:"vērtējumi", often:"visbiežāk", recs:"ieraksti",
      want:"gribu", thinking:"domāju", bought:"nopirkts", walks:"pastaigas", points:"punkti" },
    openApp:"Atvērt lietotni", points:"punkti kopā",
    sum:{ wishlist:"{want} gribu · {bought} nopirkts",
      teeth:"sērija {n} 🔥", rating:"vidēji {avg}★", mood:"biežāk {e}", reverse:"{c} vārdi", guess:"{w} no {c}",
      walk:"{c} pastaigas", names:"smieklīgi vārdi", snake:"čūska", bank:"{p} p · {s} 🔥",
      tasks:"⏳ {n} gaida", tasksNone:"{n} aktīvi", shop:"🛍 {n} apstiprināt", shopNone:"{n} balvas",
      chat:"atvērt čatu", none:"atvērt" },
    m:{ lastEvents:"Pēdējie notikumi", empty:"Vēl nekā nav.",
      noText:"bez komentāra", liked:"Patika: {x}", walkAdd:"🐾 Pierakstīt pastaigu" },
    give:{ btn:"⭐ Piešķirt punktus", title:"Piešķirt punktus", customPh:"Cik daudz", notePh:"Par ko? (bērns redzēs)",
      submit:"Piešķirt +{n}", needAmount:"Ievadi summu", needNote:"Uzraksti, par ko",
      done:"+{n} punkti pieskaitīti", fail:"Neizdevās saglabāt, mēģini vēlreiz" },
    pen:{ btn:"⚠️ Sods", title:"Sods", submit:"Noņemt −{n}", done:"−{n} punkti noņemti" },
    g:{ win:"uzminēja", wrong:"neuzminēja", timeout:"laiks beidzās" },
    wl:{ banner:"Skatīšanās režīms. Izmaiņas var veikt tikai {name}.",
      want:"Gribu", thinking:"Domāju", bought:"Nopirku", empty:"Šajā sadaļā nekā nav.",
      chipChanged:"pārdomāju ×{n}", chipDays:{zero:"{n} dienās",one:"{n} dienā",other:"{n} dienās"}, chipLink:"saite",
      note:"Kāpēc gribu", openLink:"Atvērt saiti", histTitle:"Vēlmes vēsture",
      hist:{ created:"Pievienots", changed_mind:"Pārdomāju", purchased:"Nopirkts", back_to_want:"Atkal gribu", edited:"Mainīts" },
      cnt:{ changed:"reizes pārdomāja", bought:"reizes nopirkts", returned:"reizes atgrieza" },
      ro:"Tikai skatīšanās — rediģē {name}", close:"Aizvērt", fullPhoto:"Atvērt foto pilnā izmērā" },
    mood:{ happy:"Priecīgs", mid:"Vidējs", sad:"Skumjš" },
    acct:"pieslēgšanās",
    ev:{
      accounts:{ login:"Pieslēdzās lietotnei" },
      wishlist:{ created:"Pievienoja vēlmi “{t}”", changed_mind:"Pārdomāja: “{t}”", purchased:"“{t}” — nopirkts! 🎉",
        back_to_want:"Atkal grib “{t}”", edited:"Mainīja vēlmi “{t}”", favorite:"Atzīmēja ★ “{t}”",
        unfavorite:"Noņēma ★ “{t}”", deleted:"Dzēsa vēlmi “{t}”", restored:"Atgrieza “{t}”", undo:"Atcēla darbību",
        share_request:"Palūdza atļauju dalīties ar vēlmju sarakstu 📨", share_grant:"Padalījās ar vēlmju sarakstu ar “{t}”",
        share_revoke:"Noņēma vēlmju saraksta piekļuvi “{t}”",
        share_enabled:"Vecāks {n} ieslēdza publisko vēlmju sarakstu 🌐", share_disabled:"Vecāks {n} izslēdza publisko vēlmju sarakstu 🔒" },
      teeth:{ done:"Iztīrīja zobus · +10", skipped:"Izlaida tīrīšanu", started:"Sāka tīrīt zobus" },
      rating:{ day_rated:"Novērtēja dienu: {stars}" },
      mood:{ mood_set:"Dienas garastāvoklis: {e} {name}" },
      reverse:{ created:"Apgrieza vārdu" },
      guess:{ win:"Uzmini skaitli: uzminēja! +10", wrong:"Uzmini skaitli: neuzminēja −5", timeout:"Uzmini skaitli: laiks beidzās −5" },
      generic:{ created:"Pievienoja ierakstu", edited:"Mainīja ierakstu", moved:"Pārvietoja ierakstu", favorite:"Atzīmēja izlasi",
        unfavorite:"Noņēma izlasi", deleted:"Dzēsa ierakstu", restored:"Atjaunoja ierakstu", undo:"Atcēla darbību" }
    }
  }}
  });

  /* =================== состояние =================== */
  var S={ data:null, childId:null, loading:false, error:false, tab:"apps", mod:null, wseg:"want" };

  /* запомненный выбор ребёнка (фикс: обновление страницы сбрасывало на первого) */
  var CHILD_KEY="rt_parent_child";
  function savedChild(){ try{ var v=parseInt(localStorage.getItem(CHILD_KEY)||"",10); return v>0?v:null; }catch(e){ return null; } }
  function saveChild(id){ try{ if(id) localStorage.setItem(CHILD_KEY,String(id)); else localStorage.removeItem(CHILD_KEY); }catch(e){} }

  var NOISE={ opened_app:1, opened_module:1, viewed_detail:1, viewed_stats:1 };
  var SKIP_MOD={ bank:1, admin:1, tickets:1, chat:1 }; /* bank/chat — в нижней навигации; tickets/admin — не метрика */
  var WL_DOMAIN={ created:1, changed_mind:1, purchased:1, back_to_want:1, edited:1, favorite:1, unfavorite:1, deleted:1, restored:1,
    share_request:1, share_grant:1, share_revoke:1 };
  var WL_PARENT_EV={ share_enabled:1, share_disabled:1 };
  var GEN_DOMAIN={ created:1, edited:1, moved:1, favorite:1, unfavorite:1, deleted:1, restored:1 };
  var SECTC={ want:"#ff3db0", thinking:"#a64bff", bought:"#2bf0c0" };
  var HISTC={ created:"#19e3ff", changed_mind:"#a64bff", purchased:"#2bf0c0", back_to_want:"#ff3db0", edited:"#ffd23b" };
  var MOOD_E={ happy:"😀", mid:"😐", sad:"😢" };

  /* игры скрыты в дашборде по умолчанию; области открываются для трекеров, остальные — RobTop.open */
  var GAMES={ snake:1, guess:1, reverse:1, names:1 };
  var AREA_MODS={ wishlist:1, teeth:1, rating:1, mood:1, walk:1 };

  function t(k,p){ return I.t(k,p); }
  function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];}); }
  function tIf(k,p){ var o={}; if(p) for(var x in p) o[x]=p[x]; o.fallback=""; return I.t(k,o); }
  function el(){ return document.getElementById("parent"); }
  function tabsEl(){ return document.getElementById("pdTabs"); }
  function active(){ return document.body.getAttribute("data-view")==="parent"; }

  /* ---- дни/время ---- */
  function startOfDay(ts){ var d=new Date(ts); d.setHours(0,0,0,0); return d.getTime(); }
  function dayOff(ts){ return Math.max(0, Math.round((startOfDay(Date.now())-startOfDay(ts))/86400000)); }
  function dateForOff(off){ var d=new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()-off); return d; }
  function fmtDay(off){
    if(off===0) return t("parent.j.today",{fallback:"Сегодня"});
    if(off===1) return t("parent.j.yesterday",{fallback:"Вчера"});
    return I.formatDate(dateForOff(off), {day:"numeric",month:"long"});
  }
  function hhmm(ts){ var d=new Date(ts); var h=d.getHours(), m=d.getMinutes(); return (h<10?"0":"")+h+":"+(m<10?"0":"")+m; }
  function stars(n){ var s=""; for(var i=0;i<n;i++) s+="★"; return s; }
  function fmtDayStr(dayStr){
    if(!dayStr) return "";
    var p=String(dayStr).split("-");
    if(p.length!==3) return String(dayStr);
    return I.formatDate(new Date(+p[0], +p[1]-1, +p[2], 12), {day:"numeric",month:"short"});
  }

  /* ---- модули: имя/цвет/иконка из реестра оболочки ---- */
  function meta(id){ return RT.metaFor(id) || {id:id, name:id, color:"#19e3ff"}; }
  function modName(id){ if(id==="accounts") return t("parent.acct"); var m=meta(id); return t("tile."+id,{fallback:m.name||id}); }
  function modColor(id){ if(id==="accounts") return "#19e3ff"; return meta(id).color||"#19e3ff"; }
  function modIcon(id){
    var sh=RT._shell||{};
    if(sh.iconHtml && RT.metaFor(id)) return sh.iconHtml(RT.metaFor(id));
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/></svg>';
  }
  /* активные модули (без bank/chat/admin/tickets) — кандидаты в сетку дашборда */
  function gridMods(){
    return (RT._registry||[]).filter(function(m){ return m.status==="active" && !SKIP_MOD[m.id]; });
  }

  /* ---- скрытые в дашборде (hiddenParent; NULL → дефолт «игры скрыты») ---- */
  function effHidden(){
    var hp=S.data&&S.data.hiddenParent, set={};
    if(Object.prototype.toString.call(hp)==="[object Array]"){ for(var i=0;i<hp.length;i++) set[hp[i]]=1; }
    else { for(var g in GAMES) if(GAMES.hasOwnProperty(g)) set[g]=1; }
    return set;
  }

  /* ---- осмысленное действие ребёнка (для статистики/«Последнего») ---- */
  function isDomain(e){
    if(SKIP_MOD[e.module] || e.module==="accounts") return false;
    if(NOISE[e.type]) return false;
    var coll=e.meta&&e.meta.collection;
    switch(e.module){
      case "wishlist": return WL_DOMAIN[e.type]===1;
      case "teeth":    return e.type==="created" && coll==="sessions";
      case "rating":   return e.type==="day_rated";
      case "mood":     return e.type==="mood_set";
      case "guess":    return e.type==="round_played";
      case "reverse":  return e.type==="created" && coll==="history";
      default:         return GEN_DOMAIN[e.type]===1 && coll!=="meta";
    }
  }
  function inJournal(e){
    if(e.module==="accounts") return e.type==="login";
    if(e.module==="wishlist" && WL_PARENT_EV[e.type]===1) return true;
    return isDomain(e);
  }
  function evText(e){
    var p={ t:e.title||"", title:e.title||"" };
    var key="parent.ev."+e.module+"."+e.type;
    if(e.module==="teeth" && e.type==="created") key="parent.ev.teeth."+((e.to==="skipped")?"skipped":"done");
    if(e.module==="guess" && e.type==="round_played"){
      var r=(e.meta&&e.meta.result)||"wrong";
      key="parent.ev.guess."+(r==="win"?"win":(r==="timeout"?"timeout":"wrong"));
    }
    if(e.module==="rating" && e.type==="day_rated"){ var st=(e.meta&&+e.meta.stars)||0; p.stars=stars(st)+" "+st; }
    if(e.module==="mood" && e.type==="mood_set"){
      var mk=(e.meta&&e.meta.mood)||"mid";
      p.e=MOOD_E[mk]||"🙂"; p.name=t("parent.mood."+mk,{fallback:mk});
    }
    if(e.module==="wishlist" && WL_PARENT_EV[e.type]===1) p.n=(e.meta&&e.meta.by_nick)||"";
    var s=tIf(key,p);
    if(!s) s=tIf("parent.ev.generic."+e.type,p);
    if(!s) s=e.type;
    return s;
  }

  /* =================== агрегаты (по всем доменным событиям окна) =================== */
  function agg(){
    var evs=(S.data&&S.data.events)||[];
    var per=[], perMod={};
    for(var i=0;i<evs.length;i++){
      var e=evs[i];
      if(!isDomain(e)) continue;
      per.push(e);
      perMod[e.module]=(perMod[e.module]||0)+1;
    }
    /* серия зубов: дни с завершённой чисткой подряд, начиная с сегодня (или со вчера) */
    var td={};
    for(i=0;i<evs.length;i++){ var x=evs[i];
      if(x.module==="teeth" && x.type==="created" && x.to!=="skipped" && x.meta && x.meta.collection==="sessions") td[dayOff(x.at)]=1; }
    var streak=0, st=td[0]?0:1;
    if(td[st]){ for(var d=st; d<365 && td[d]; d++) streak++; }
    var sum=0,cnt=0;
    for(i=0;i<per.length;i++){ if(per[i].module==="rating"&&per[i].meta&&per[i].meta.stars){ sum+=+per[i].meta.stars; cnt++; } }
    var mc={},topMood=null;
    for(i=0;i<per.length;i++){ if(per[i].module==="mood"&&per[i].meta&&per[i].meta.mood){ var mm=per[i].meta.mood; mc[mm]=(mc[mm]||0)+1; } }
    for(var mk in mc){ if(mc.hasOwnProperty(mk)&&(topMood===null||mc[mk]>mc[topMood])) topMood=mk; }
    var words=0,gW=0,gC=0,teethN=0,walkN=0,moodN=0;
    for(i=0;i<per.length;i++){
      if(per[i].module==="reverse") words++;
      if(per[i].module==="guess"){ gC++; if(per[i].meta&&per[i].meta.result==="win") gW++; }
      if(per[i].module==="teeth"&&per[i].to!=="skipped") teethN++;
      if(per[i].module==="walk") walkN++;
      if(per[i].module==="mood") moodN++;
    }
    return { per:per, perMod:perMod, streak:streak,
      avg:cnt?(sum/cnt).toFixed(1):null, rated:cnt, topMood:topMood, topMoodN:topMood?mc[topMood]:0,
      words:words, guessWin:gW, guessCnt:gC, teethN:teethN, walkN:walkN, moodN:moodN };
  }

  function kidName(){ return (S.data&&S.data.child&&S.data.child.nickname)||""; }
  function bankPending(){ return (S.data && parseInt(S.data.tasksPending,10)) || 0; }
  function shopStats(){
    var rows=(S.data&&S.data.content&&S.data.content.shop)||[], pend=0, items=0, i;
    for(i=0;i<rows.length;i++){
      if(rows[i].collection==="orders" && rows[i].status==="pending") pend++;
      if(rows[i].collection==="items") items++;
    }
    return { pend:pend, items:items };
  }
  function wlCounts(){
    var items=(S.data&&S.data.items)||[], c={want:0,thinking:0,bought:0};
    items.forEach(function(w){ if(c[w.status]!=null) c[w.status]++; });
    return c;
  }

  /* строка статуса под плиткой (как .st у ребёнка, но осмысленная для родителя) */
  function statusLine(id){
    var a=agg();
    if(id==="wishlist"){ var c=wlCounts(); return t("parent.sum.wishlist",{want:c.want,bought:c.bought}); }
    if(id==="teeth")  return a.teethN?t("parent.sum.teeth",{n:a.streak}):t("parent.sum.none");
    if(id==="rating") return a.rated?t("parent.sum.rating",{avg:a.avg}):t("parent.sum.none");
    if(id==="mood")   return a.topMood?t("parent.sum.mood",{e:MOOD_E[a.topMood]||"🙂"}):t("parent.sum.none");
    if(id==="walk")   return a.walkN?t("parent.sum.walk",{c:a.walkN}):t("parent.sum.none");
    if(id==="tasks"){ var p=bankPending(); return p>0?t("parent.sum.tasks",{n:p}):t("parent.sum.tasksNone",{n:""}).replace(/\s+$/,""); }
    if(id==="shop"){ var ss=shopStats(); return ss.pend>0?t("parent.sum.shop",{n:ss.pend}):t("parent.sum.shopNone",{n:ss.items}); }
    if(id==="reverse") return a.words?t("parent.sum.reverse",{c:a.words}):t("parent.sum.none");
    if(id==="guess")  return a.guessCnt?t("parent.sum.guess",{w:a.guessWin,c:a.guessCnt}):t("parent.sum.none");
    if(id==="names")  return t("parent.sum.names");
    if(id==="snake")  return t("parent.sum.snake");
    return t("parent.sum.none");
  }

  /* =================== инжект минимального CSS (чипы + карточка очков + стат-боксы) =================== */
  function injectCss(){
    if(document.getElementById("pdv-css")) return;
    var s=document.createElement("style"); s.id="pdv-css";
    s.textContent=
      ".pdv-top{padding-top:6px}"+
      /* выбор ребёнка на домашнем — пилюля-дропдаун .pdv-kidsw (стиль ниже, после .pd-kidsw),
         открывает шторку выбора. Заменила горизонтальный скролл-ряд чипов, в котором выбранный
         ребёнок уезжал за правый край ("в невидимую линию"). */
      ".pdv-one{display:flex;align-items:center;gap:11px;padding:2px 2px 2px}"+
      ".pdv-one .av{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;font-size:22px;font-weight:800;color:#04212b;"+
        "background:linear-gradient(150deg,#5fd0ff,#a86bff)}"+
      ".pdv-one .nm{font-family:var(--font-display);font-size:19px;color:#fff}"+
      ".pdv-one .sb{font-size:11px;color:var(--mint);font-weight:700;margin-top:3px}"+
      ".pdv-pts{display:flex;align-items:center;gap:13px;margin:12px 0 0;padding:14px 16px;border-radius:18px;"+
        "background:linear-gradient(150deg,rgba(255,77,109,.16),rgba(255,43,214,.1));border:1.5px solid rgba(255,77,109,.4);box-shadow:0 0 26px -12px var(--red)}"+
      ".pdv-pts .pig{font-size:28px}"+
      ".pdv-pts .n{font-family:var(--font-display);font-size:29px;color:#fff;line-height:1;text-shadow:0 0 16px rgba(255,77,109,.55)}"+
      ".pdv-pts .l{font-size:11px;font-weight:800;letter-spacing:.4px;text-transform:uppercase;color:var(--red);margin-top:4px}"+
      ".pdv-pts .strk{margin-left:auto;text-align:right;font-size:13px;font-weight:800;color:var(--gold)}"+
      ".pdv-act{display:flex;gap:9px;margin:11px 0 4px}"+
      ".pdv-stats{display:flex;gap:9px;margin-bottom:4px}"+
      ".pdv-stats .s{flex:1;text-align:center;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.1);border-radius:15px;padding:13px 6px 10px}"+
      ".pdv-stats .s .n{font-family:var(--font-display);font-size:24px;color:#fff;line-height:1}"+
      ".pdv-stats .s .l{font-size:10px;font-weight:800;letter-spacing:.3px;text-transform:uppercase;color:var(--muted);margin-top:6px}"+
      ".pd-kidsw{margin-left:auto;display:flex;align-items:center;gap:6px;padding:5px 10px 5px 5px;border-radius:999px;cursor:pointer;"+
        "background:rgba(255,255,255,.05);border:1.5px solid rgba(255,255,255,.12);font-family:inherit}"+
      ".pd-kidsw .a{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:12px;color:#04212b;background:linear-gradient(150deg,#5fd0ff,#a86bff)}"+
      ".pd-kidsw .nm{font-weight:800;font-size:12.5px;color:#dbe6ff}"+
      /* домашний вариант пилюли: крупнее (как заголовок), слева, не на всю ширину */
      ".pdv-kidsw{display:inline-flex;margin-left:0;padding:6px 15px 6px 6px;gap:10px}"+
      ".pdv-kidsw .a{width:38px;height:38px;font-size:16px}"+
      ".pdv-kidsw .nm{font-family:var(--font-display);font-weight:400;font-size:18px;color:#fff}"+
      ".pdv-kidsw .cv{color:var(--muted);font-size:13px;align-self:center}"+
      /* верх контента не должен лезть под статус-бар и кластер [🔔][⚙] (как у .pd-top) */
      "body[data-view=\"parent\"] .pdv-top{padding-top:calc(30px + env(safe-area-inset-top));padding-right:100px}"+
      /* контент должен прокручиваться полностью над фиксированным таббаром (.pd-tabbar) */
      "body[data-view=\"parent\"] .pd-wrap{padding-bottom:calc(104px + env(safe-area-inset-bottom))}"+
      ".pdv-secttl{font-family:var(--font-display);font-size:20px;color:#fff;margin:0;line-height:1.1}"+
      ".pdv-launch{display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center;padding:26px 18px;margin-top:6px;"+
        "background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:18px}"+
      ".pdv-launch .em{font-size:46px;line-height:1}"+
      ".pdv-launch .ti{font-family:var(--font-display);font-size:18px;color:#fff}"+
      ".pdv-launch .sb{font-size:13px;color:var(--muted);font-weight:600;max-width:260px;line-height:1.5}";
    document.head.appendChild(s);
  }
  function initial(name){ name=(name||"").trim(); return name?name.charAt(0).toUpperCase():"🙂"; }

  /* =================== ДОМАШНИЙ ЭКРАН (вкладка «Приложения») =================== */
  function topHtml(){
    var kids=(S.data&&S.data.children)||[];
    var last=S.data&&S.data.lastActivityAt;
    var lastTxt=last
      ? t("parent.lastSeen",{x:(dayOff(last)===0?fmtDay(0).toLowerCase():I.formatDate(last,{day:"numeric",month:"short"}))+" "+hhmm(last)})
      : t("parent.never");
    var h='<div class="pdv-top">';
    if(kids.length>1){
      /* пилюля текущего ребёнка → тап открывает шторку выбора (openChildSwitch).
         id="pdKidSw" уже привязан в wire() — отдельный обработчик не нужен. */
      h+='<button class="pd-kidsw pdv-kidsw" id="pdKidSw" aria-label="'+esc(t("parent.switchChild"))+'">'
        +'<span class="a">'+esc(initial(kidName()))+'</span>'
        +'<span class="nm">'+esc(kidName())+'</span>'
        +'<span class="cv">▾</span></button>';
    } else {
      h+='<div class="pdv-one"><span class="av">'+esc(initial(kidName()))+'</span><div><div class="nm">'+esc(kidName())+'</div>'
        +'<div class="sb">👁 '+esc(t("parent.badge"))+'</div></div></div>';
    }
    h+='<div class="pd-substatus" style="font-size:11px;color:var(--muted);font-weight:700;margin:6px 2px 0">'+esc(lastTxt)+'</div>';
    h+='</div>';
    return h;
  }
  function homeHtml(){
    var data=S.data||{};
    var h=topHtml();
    /* баланс очков + начислить/штраф (остаются на домашнем по фидбеку Джеффа) */
    h+='<div class="pdv-pts"><span class="pig">🐷</span><div><div class="n">'+(data.points||0)+'</div><div class="l">'+esc(t("parent.points"))+'</div></div>'
      +'<div class="strk">🔥 '+(data.streak||0)+'</div></div>';
    h+='<div class="pdv-act">'
      +'<button class="btn btn-primary" id="pdGive" style="flex:1.5">'+esc(t("parent.give.btn"))+'</button>'
      +'<button class="btn btn-cancel" id="pdPen" style="flex:1">'+esc(t("parent.pen.btn"))+'</button></div>';
    /* сетка плиток — как у ребёнка (.apps/.tile); игры скрыты по умолчанию */
    var hidSet=effHidden(), vis=[], hid=[];
    gridMods().forEach(function(m){ (hidSet[m.id]?hid:vis).push(m); });
    h+='<div class="apps" id="pdApps">';
    vis.forEach(function(m){ h+=tileHtml(m,false); });
    if(hid.length){
      h+='<div class="apps-sep hidsep">'+esc(t("reorder.hidden",{fallback:"Скрытые"}))+'</div>';
      hid.forEach(function(m){ h+=tileHtml(m,true); });
    }
    h+='</div>';
    return h;
  }
  /* плитка-родитель: разметка как shell.tileHtml (та же CSS + jiggle + «глаз») */
  function tileHtml(m,hidden){
    var sh=RT._shell||{};
    var eye=sh.jglEye?sh.jglEye(!!hidden):"";
    return '<button class="tile active'+(hidden?' hid':'')+'" style="--c:'+esc(modColor(m.id))+'" data-mod="'+esc(m.id)+'">'
      +'<span class="ring"></span>'
      +'<span class="ic">'+modIcon(m.id)+'</span>'
      +'<span class="txt"><span class="nm">'+esc(modName(m.id))+'</span><span class="st">'+esc(statusLine(m.id))+'</span></span>'
      +eye
      +'</button>';
  }

  /* =================== ОБЛАСТЬ приложения =================== */
  function areaHeadHtml(id){
    var kids=(S.data&&S.data.children)||[];
    var sw=kids.length>1
      ? '<button class="pd-kidsw" id="pdKidSw"><span class="a">'+esc(initial(kidName()))+'</span><span class="nm">'+esc(kidName())+'</span><span style="color:var(--muted)">▾</span></button>'
      : '';
    return '<div class="pd-top pd-mhead">'
      +'<button class="back" id="pdBack" aria-label="'+esc(t("common.back",{fallback:"Назад"}))+'">'
      +'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 5.5L8 12l6.5 6.5"/></svg></button>'
      +'<span class="mic" style="--mc:'+esc(modColor(id))+'">'+modIcon(id)+'</span>'
      +'<span class="mttl">'+esc(modName(id))+'</span>'+sw+'</div>';
  }
  function statBox(n,l){ return '<div class="s"><div class="n">'+esc(String(n))+'</div><div class="l">'+esc(l)+'</div></div>'; }
  function statHtml(id){
    var a=agg(), s="";
    if(id==="teeth")  s=statBox(a.streak+" 🔥",t("parent.st.streak"))+statBox(a.teethN,t("parent.st.period"));
    else if(id==="rating") s=statBox((a.avg||"—")+"★",t("parent.st.avg"))+statBox(a.rated,t("parent.st.rated"));
    else if(id==="mood")  s=statBox(a.topMood?(MOOD_E[a.topMood]||"🙂"):"—",t("parent.st.often"))+statBox(a.moodN,t("parent.st.recs"));
    else if(id==="walk")  s=statBox(a.walkN,t("parent.st.walks"));
    else if(id==="wishlist"){ var c=wlCounts(); s=statBox(c.want,t("parent.st.want"))+statBox(c.thinking,t("parent.st.thinking"))+statBox(c.bought,t("parent.st.bought")); }
    if(!s) return "";
    return '<div class="pd-sect">'+esc(t("parent.areaSect.stat"))+'</div><div class="pdv-stats">'+s+'</div>';
  }
  function contentRows(modId){ return (S.data&&S.data.content&&S.data.content[modId])||[]; }
  function quoteHtml(d){
    var out="";
    if(d.why) out+='<span class="pd-quote">«'+esc(d.why)+'»</span>';
    if(d.liked) out+='<span class="pd-quote">'+esc(t("parent.m.liked",{x:d.liked}))+'</span>';
    return out;
  }
  function crow(icon, main, sub, right, extra, det){
    var tag=det?"button":"div";
    return '<'+tag+' class="pd-crow"'+(det?' data-det="'+esc(det)+'"':'')+'><span class="ci">'+icon+'</span>'
      +'<span class="cx"><span class="c1">'+main+'</span>'+(sub?'<span class="c2">'+sub+'</span>':'')+(extra||'')+'</span>'
      +(right?'<span class="ct">'+right+'</span>':'')
      +(det?'<svg class="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>':'')
      +'</'+tag+'>';
  }
  function contentHtml(id){
    var rows=contentRows(id), h="";
    if(!rows.length) return '<div class="pd-empty">'+esc(t("parent.m.empty"))+'</div>';
    if(id==="rating"){
      rows.forEach(function(r,i){ var d=r.data||{};
        h+=crow('<b class="gold">'+stars(+d.stars||0)+'</b>', esc(fmtDayStr(d.day)),
          quoteHtml(d)?'':'<i class="pd-dim">'+esc(t("parent.m.noText"))+'</i>', "", quoteHtml(d), "rating:"+i);
      });
      return h;
    }
    if(id==="mood"){
      rows.forEach(function(r,i){ var d=r.data||{}; var mk=d.mood||"mid";
        h+=crow('<b class="emo">'+(MOOD_E[mk]||"🙂")+'</b>',
          esc(t("parent.mood."+mk,{fallback:mk}))+' · '+esc(fmtDayStr(d.day)),
          quoteHtml(d)?'':'<i class="pd-dim">'+esc(t("parent.m.noText"))+'</i>', "", quoteHtml(d), "mood:"+i);
      });
      return h;
    }
    if(id==="teeth"){
      rows.forEach(function(r){ var d=r.data||{}; var done=(d.status!=="skipped");
        h+=crow(done?'<b class="okc">✓</b>':'<b class="badc">—</b>',
          esc(t(done?"parent.ev.teeth.done":"parent.ev.teeth.skipped")), '',
          esc((d.date||"")+(d.time?(" · "+d.time):"")), '', null);
      });
      return h;
    }
    /* walk и неизвестные: первая строковая суть + дата */
    rows.forEach(function(r){ var d=r.data||{}, txt="";
      for(var k in d){ if(d.hasOwnProperty(k)&&typeof d[k]==="string"&&d[k].length&&d[k].length<=80&&k!=="photo"){ txt=d[k]; break; } }
      h+=crow('<b class="dimc">•</b>', esc(txt||r.collection), '', esc(I.formatDate(r.createdAt,{day:"numeric",month:"short"})), '', null);
    });
    return h;
  }
  function recentHtml(id){
    var evs=((S.data&&S.data.events)||[]).filter(function(e){ return e.module===id && inJournal(e); }).slice(0,8);
    if(!evs.length) return "";
    var h='<div class="pd-sect">'+esc(t("parent.areaSect.recent"))+'</div>';
    evs.forEach(function(e){
      h+='<div class="pd-ev" style="--mc:'+esc(modColor(id))+'">'
        +'<span class="ic">'+modIcon(id)+'</span>'
        +'<span class="tx"><span class="t1">'+esc(evText(e))+'</span><span class="t2">'+esc(fmtDay(dayOff(e.at)))+'</span></span>'
        +'<span class="tm">'+hhmm(e.at)+'</span></div>';
    });
    return h;
  }
  function areaHtml(id){
    if(id==="wishlist") return statHtml(id)+wishlistBody();
    var h=statHtml(id);
    if(id==="walk" && RT.metaFor && RT.metaFor("walk"))
      h+='<button class="btn btn-primary" id="pdWalkAdd" style="flex:none;width:100%;margin:2px 0 12px">'+esc(t("parent.m.walkAdd"))+'</button>';
    h+='<div class="pd-sect">'+esc(t("parent.areaSect.content"))+'</div>'+contentHtml(id);
    h+=recentHtml(id);
    return h;
  }

  /* ---------- ВИШ-ЛИСТ как область (сегменты + карточки + деталь) ---------- */
  function chipsFor(w){
    var cm=0,i;
    for(i=0;i<w.history.length;i++) if(w.history[i].type==="changed_mind") cm++;
    var h='<span class="pd-chip">'+esc(t("parent.wl.hist.created"))+' · '+esc(I.formatDate(w.createdAt,{day:"numeric",month:"short"}))+'</span>';
    if(cm) h+='<span class="pd-chip cm">'+esc(t("parent.wl.chipChanged",{n:cm}))+'</span>';
    if(w.link) h+='<span class="pd-chip lnk">🔗 '+esc(t("parent.wl.chipLink"))+'</span>';
    return h;
  }
  function wishlistBody(){
    var items=(S.data&&S.data.items)||[];
    var counts={want:0,thinking:0,bought:0};
    items.forEach(function(w){ if(counts[w.status]!=null) counts[w.status]++; });
    var h='<div class="pd-robanner">👁 <span>'+esc(t("parent.wl.banner",{name:kidName()}))+'</span></div>';
    h+='<div class="pd-wseg" id="pdWseg">';
    ["want","thinking","bought"].forEach(function(s){
      h+='<button data-s="'+s+'" style="--sc:'+SECTC[s]+'"'+(S.wseg===s?' class="on"':'')+'>'
        +esc(t("parent.wl."+s))+'<span class="c">'+counts[s]+'</span></button>';
    });
    h+='</div>';
    var list=items.filter(function(w){ return w.status===S.wseg; });
    list.sort(function(a,b){ return ((b.favorite?1:0)-(a.favorite?1:0)) || (b.createdAt-a.createdAt); });
    if(!list.length) h+='<div class="pd-empty">'+esc(t("parent.wl.empty"))+'</div>';
    list.forEach(function(w){
      var ph=w.photo
        ? '<span class="ph" style="background-image:url(\''+esc(w.photo)+'\')"></span>'
        : '<span class="ph emo">'+esc(w.icon||"🍒")+'</span>';
      h+='<button class="pd-wcard" data-w="'+esc(w.id)+'" style="--sc:'+SECTC[w.status]+'">'+ph
        +'<span class="tx"><span class="t1">'+(w.favorite?'<span class="fav">★</span>':'')+esc(w.title||"")+'</span>'
        +(w.note?'<span class="nt">'+esc(w.note)+'</span>':'')
        +'<span class="pd-chips">'+chipsFor(w)+'</span></span>'
        +'</button>';
    });
    return h;
  }

  /* ---------- деталь желания (read-only через общий sheet оболочки) ---------- */
  function openDetail(id){
    var items=(S.data&&S.data.items)||[], w=null, i;
    for(i=0;i<items.length;i++) if(String(items[i].id)===String(id)) w=items[i];
    if(!w) return;
    var cm=0,bu=0,rt2=0;
    for(i=0;i<w.history.length;i++){
      if(w.history[i].type==="changed_mind")cm++;
      if(w.history[i].type==="purchased")bu++;
      if(w.history[i].type==="back_to_want")rt2++;
    }
    var node=document.createElement("div");
    var ph=w.photo
      ? '<span class="ph" data-full="'+esc(w.photo)+'" role="button" tabindex="0" aria-label="'+esc(t("parent.wl.fullPhoto"))+'" style="background-image:url(\''+esc(w.photo)+'\')"></span>'
      : '<span class="ph emo">'+esc(w.icon||"🍒")+'</span>';
    var h='<div class="pd-dhead" style="--sc:'+SECTC[w.status]+'">'+ph
      +'<div><h2 style="text-align:left;margin:0 0 6px">'+(w.favorite?'<span style="color:var(--gold)">★</span> ':'')+esc(w.title||"")+'</h2>'
      +'<span class="pd-pill">'+esc(t("parent.wl."+w.status))+'</span></div></div>';
    if(w.note) h+='<div class="pd-dnote"><b>'+esc(t("parent.wl.note"))+'</b>'+esc(w.note)+'</div>';
    if(w.link){ var pdLnk=/^https?:\/\//i.test(w.link)?w.link:("https://"+w.link); /* SEC 2026-06-09: не пускаем javascript:/data: — родитель открывает ссылку ребёнка */
      h+='<a class="pd-dlink" href="'+esc(pdLnk)+'" target="_blank" rel="noopener">🔗 '+esc(t("parent.wl.openLink"))+'</a>'; }
    h+='<div class="pd-dcnt">'
      +'<span class="h"><span class="n">'+cm+'</span><span class="l">'+esc(t("parent.wl.cnt.changed"))+'</span></span>'
      +'<span class="h"><span class="n">'+bu+'</span><span class="l">'+esc(t("parent.wl.cnt.bought"))+'</span></span>'
      +'<span class="h"><span class="n">'+rt2+'</span><span class="l">'+esc(t("parent.wl.cnt.returned"))+'</span></span></div>';
    h+='<div class="pd-sect" style="margin-top:14px">'+esc(t("parent.wl.histTitle"))+'</div><div class="pd-tl">';
    w.history.slice().reverse().forEach(function(x){
      h+='<div class="row" style="--tc:'+(HISTC[x.type]||"#fff")+'"><span class="dot"></span>'
        +'<span class="x">'+esc(t("parent.wl.hist."+x.type,{fallback:x.type}))+'</span>'
        +'<span class="d">'+esc(I.formatDate(x.at,{day:"numeric",month:"short"}))+'</span></div>';
    });
    h+='</div><div class="sheet-actions"><button class="btn btn-cancel" data-close style="flex:1">'+esc(t("parent.wl.close"))+'</button></div>'
      +'<div class="pd-ronote">👁 '+esc(t("parent.wl.ro",{name:kidName()}))+'</div>';
    node.innerHTML=h;
    var ctl=(RT._shell&&RT._shell.sheet)?RT._shell.sheet(node):null;
    var cb=node.querySelector("[data-close]");
    if(cb&&ctl) cb.onclick=ctl.close;
    var phEl=node.querySelector("[data-full]");
    if(phEl){
      phEl.onclick=function(){ openLightbox(phEl.getAttribute("data-full")); };
      phEl.onkeydown=function(ev){ if(ev.key==="Enter"||ev.key===" "){ ev.preventDefault(); openLightbox(phEl.getAttribute("data-full")); } };
    }
  }
  /* деталь записи трекера (оценка/настроение) — чинит «бесполезный журнал»: деталь видна */
  function openContentDetail(key){
    var p=key.split(":"), mod=p[0], idx=+p[1];
    var row=contentRows(mod)[idx]; if(!row) return;
    var d=row.data||{};
    var node=document.createElement("div"), h="";
    if(mod==="rating"){
      h='<h2>'+esc(modName("rating"))+'</h2>'
        +'<div style="text-align:center;font-size:30px;color:var(--gold);letter-spacing:3px">'+stars(+d.stars||0)+'</div>'
        +'<div style="text-align:center;color:var(--muted);font-weight:700;margin:4px 0 12px">'+esc(fmtDayStr(d.day))+'</div>';
    } else if(mod==="mood"){
      var mk=d.mood||"mid";
      h='<h2>'+esc(modName("mood"))+'</h2>'
        +'<div style="text-align:center;font-size:44px">'+(MOOD_E[mk]||"🙂")+'</div>'
        +'<div style="text-align:center;color:#fff;font-weight:800">'+esc(t("parent.mood."+mk,{fallback:mk}))+'</div>'
        +'<div style="text-align:center;color:var(--muted);font-weight:700;margin:3px 0 12px">'+esc(fmtDayStr(d.day))+'</div>';
    } else { return; }
    if(d.photo) h+='<div class="pd-dnote" style="padding:0;overflow:hidden"><div style="height:170px;background:#0b0a1e center/cover no-repeat;background-image:url(\''+esc(d.photo)+'\')"></div></div>';
    h+='<div class="pd-dnote"><b>'+esc(t("parent.wl.note"))+'</b>'+(d.why?esc(d.why):'<i style="color:#6f80a6">'+esc(t("parent.m.noText"))+'</i>')+'</div>';
    h+='<div class="sheet-actions"><button class="btn btn-cancel" data-close style="flex:1">'+esc(t("parent.close"))+'</button></div>';
    node.innerHTML=h;
    var ctl=(RT._shell&&RT._shell.sheet)?RT._shell.sheet(node):null;
    var cb=node.querySelector("[data-close]"); if(cb&&ctl) cb.onclick=ctl.close;
  }
  function openLightbox(src){
    if(!src) return;
    var ov=document.createElement("div"); ov.className="pd-lightbox"; ov.innerHTML='<img alt="">';
    ov.querySelector("img").src=src; document.body.appendChild(ov);
    function close(){ if(ov.parentNode) ov.parentNode.removeChild(ov); document.removeEventListener("keydown",onK); }
    function onK(ev){ if(ev.key==="Escape") close(); }
    ov.addEventListener("click",close); document.addEventListener("keydown",onK);
  }

  /* ---------- начисление очков / штраф родителем ---------- */
  var _bsdk=null, giveBusy=false;
  function bankSdk(){ if(!_bsdk) _bsdk=RT.createSdk({id:"bank"}); return _bsdk; }
  function openGive(){ openPoints(false); }
  function openPen(){ openPoints(true); }
  function openPoints(pen){
    var AMTS=pen?[5,10,20,50]:[10,20,25,50], sg=pen?"−":"+", K=pen?"parent.pen.":"parent.give.";
    var node=document.createElement("div");
    var h='<h2>'+esc(t(K+"title"))+'</h2>';
    h+='<div class="pd-gamts" id="pdGA">';
    AMTS.forEach(function(a,i){ h+='<button type="button" data-a="'+a+'"'+(i===0?' class="on"':'')+'>'+sg+a+'</button>'; });
    h+='<button type="button" data-a="0">'+sg+'…</button></div>';
    h+='<div class="field" id="pdGCW" style="display:none"><input type="number" id="pdGC" inputmode="numeric" min="1" max="9999" placeholder="'+esc(t("parent.give.customPh"))+'"></div>';
    h+='<div class="field"><input type="text" id="pdGN" maxlength="60" placeholder="'+esc(t("parent.give.notePh"))+'"></div>';
    h+='<div class="sheet-actions"><button class="btn btn-cancel" data-close style="flex:1">'+esc(t("parent.close"))+'</button>'
      +'<button class="btn btn-primary" id="pdGGo" style="flex:1.4">'+esc(t(K+"submit",{n:AMTS[0]}))+'</button></div>';
    node.innerHTML=h;
    var ctl=RT._shell.sheet(node);
    node.querySelector("[data-close]").onclick=ctl.close;
    var amt=AMTS[0], custom=false;
    var cw=node.querySelector("#pdGCW"), ci=node.querySelector("#pdGC"),
        ni=node.querySelector("#pdGN"), go=node.querySelector("#pdGGo");
    function val(){ return custom ? Math.max(0,parseInt((ci.value||"").trim(),10)||0) : amt; }
    function lbl(){ var n=val(); go.textContent=t(K+"submit",{n:n||"…"}); }
    Array.prototype.forEach.call(node.querySelectorAll("#pdGA [data-a]"),function(b){
      b.onclick=function(){
        Array.prototype.forEach.call(node.querySelectorAll("#pdGA [data-a]"),function(x){ x.classList.toggle("on",x===b); });
        var a=parseInt(b.getAttribute("data-a"),10)||0;
        custom=(a===0); cw.style.display=custom?"":"none";
        if(custom) ci.focus(); else amt=a;
        lbl();
      };
    });
    ci.oninput=lbl;
    go.onclick=function(){
      if(giveBusy) return;
      var n=val();
      if(!n){ RT._shell.toast(t("parent.give.needAmount")); if(custom) ci.focus(); return; }
      var note=(ni.value||"").trim();
      if(!note){ RT._shell.toast(t("parent.give.needNote")); ni.focus(); return; }
      giveBusy=true; go.disabled=true;
      bankSdk().points.add(pen?-n:n, pen?"parent_penalty":"parent_give",
        {kind:"parent",src:"parent",note:note}).then(function(out){
        giveBusy=false; go.disabled=false;
        if(!out || !out.ok){ RT._shell.toast(t("parent.give.fail")); return; }
        ctl.close();
        RT._shell.toast(t(K+"done",{n:n}));
        RT.API.post("notify.php",{op:"send",to:"child",child:S.childId||0,src:"bank",
          type:pen?"penalty":"points_given",params:{n:n,note:note},link:{module:"bank"}}).catch(function(){});
        fetchData(S.childId);
      });
    };
  }

  function openChildSwitch(){
    var kids=(S.data&&S.data.children)||[];
    if(kids.length<2) return;
    var node=document.createElement("div");
    var h='<h2>'+esc(t("parent.switchChild"))+'</h2>';
    kids.forEach(function(k){
      h+='<button class="acct-row" data-kid="'+k.id+'"><span class="nm">'+esc(k.nickname)+'</span>'
        +(k.id===(S.data.child&&S.data.child.id)?'<span class="rl">✓</span>':'')+'</button>';
    });
    h+='<div class="sheet-actions"><button class="btn btn-cancel" data-close style="flex:1">'+esc(t("parent.close"))+'</button></div>';
    node.innerHTML=h;
    var ctl=RT._shell.sheet(node);
    node.querySelector("[data-close]").onclick=ctl.close;
    Array.prototype.forEach.call(node.querySelectorAll("[data-kid]"),function(b){
      b.onclick=function(){ ctl.close(); fetchData(parseInt(b.getAttribute("data-kid"),10)); };
    });
  }

  /* =================== ВКЛАДКА «Копилка» (на месте, таббар остаётся) =================== */
  function bankSection(){
    var data=S.data||{}, pend=bankPending();
    var h='<div class="pdv-top"><div class="pdv-secttl">'+esc(modName("bank"))+'</div>'
      +'<div class="pd-substatus" style="font-size:11px;color:var(--muted);font-weight:700;margin:6px 2px 0">'+esc(kidName())+'</div></div>';
    h+='<div class="pdv-pts"><span class="pig">🐷</span><div><div class="n">'+(data.points||0)+'</div><div class="l">'+esc(t("parent.points"))+'</div></div>'
      +'<div class="strk">🔥 '+(data.streak||0)+'</div></div>';
    h+='<div class="pdv-act">'
      +'<button class="btn btn-primary" id="pdGive" style="flex:1.5">'+esc(t("parent.give.btn"))+'</button>'
      +'<button class="btn btn-cancel" id="pdPen" style="flex:1">'+esc(t("parent.pen.btn"))+'</button></div>';
    if(pend>0)
      h+='<button class="btn btn-cancel" id="pdOpenTasks" style="width:100%;justify-content:flex-start;margin-top:10px">⏳ '+esc(t("parent.sum.tasks",{n:pend}))+'</button>';
    h+='<button class="btn btn-primary" id="pdOpenBank" style="width:100%;margin-top:10px">'+esc(modName("bank"))+' →</button>';
    return h;
  }

  /* =================== ВКЛАДКА «Чат» (на месте; сам мессенджер открывается полноэкранно) =================== */
  function chatSection(){
    var h='<div class="pdv-top"><div class="pdv-secttl">'+esc(modName("chat"))+'</div></div>';
    h+='<div class="pdv-launch"><span class="em">💬</span>'
      +'<span class="ti">'+esc(modName("chat"))+'</span>'
      +'<span class="sb">'+esc(t("parent.sum.chat"))+'</span>'
      +'<button class="btn btn-primary" id="pdOpenChat" style="max-width:240px">'+esc(modName("chat"))+' →</button></div>';
    return h;
  }

  /* =================== нижняя навигация (Приложения / Копилка / Чат) =================== */
  function renderTabs(){
    var bar=tabsEl(); if(!bar) return;
    function b(id,svg,label,on){
      return '<button data-ptab="'+id+'"'+(on?' class="on"':'')+'>'+svg+'<span>'+esc(label)+'</span></button>';
    }
    bar.innerHTML=
      b("apps",'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',t("parent.nav.apps"),S.tab==="apps")
      +b("bank",'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M4 10h16l-1 9H5z"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',t("parent.nav.bank"),S.tab==="bank")
      +b("chat",'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M4 5h16v11H9l-4 3z"/></svg>',t("parent.nav.chat"),S.tab==="chat");
  }

  /* =================== сборка экрана =================== */
  function render(keepJgl){
    var root=el(); if(!root) return;
    injectCss();
    /* скрытый реордер/скрытие плиток (long-press → jiggle), как у ребёнка */
    if(!root.__jgl && RT._shell && RT._shell.makeJiggle){
      root.__jgl=RT._shell.makeJiggle(root,{ items:".tile.active:not(.hid)", skip:".jgl-eye", onCommit:function(ids){ RT._shell.applyTileOrder(ids); } });
    }
    var keepMode=keepJgl && root.__jgl && root.__jgl.active();
    if(root.__jgl && !keepMode) root.__jgl.exit();
    renderTabs();
    if(S.loading && !S.data){
      root.innerHTML='<div class="pd-wrap"><div class="pd-empty" style="padding-top:80px">…</div></div>';
      return;
    }
    if(S.error){
      root.innerHTML='<div class="pd-wrap"><div class="pd-empty" style="padding-top:60px">'+esc(t("parent.loadFail"))
        +'</div><div style="text-align:center"><button class="btn btn-primary" id="pdRetry" style="max-width:240px;margin:0 auto">'+esc(t("parent.retry"))+'</button></div></div>';
      var rb=root.querySelector("#pdRetry"); if(rb) rb.onclick=function(){ fetchData(S.childId); };
      return;
    }
    if(S.data && (!S.data.children || !S.data.children.length)){
      root.innerHTML='<div class="pd-wrap">'
        +'<div class="pd-empty" style="padding-top:70px"><b style="display:block;font-size:16px;color:#fff;margin-bottom:8px">'+esc(t("parent.noChild.h"))+'</b>'
        +esc(t("parent.noChild.p"))+'</div>'
        +'<div style="text-align:center;margin-top:14px"><button class="btn btn-primary" id="pdSet" style="max-width:260px;margin:0 auto">'+esc(t("parent.noChild.btn"))+'</button></div></div>';
      var sb=root.querySelector("#pdSet"); if(sb) sb.onclick=function(){ if(RT._shell.openSettings) RT._shell.openSettings(); };
      return;
    }
    if(!S.data){ root.innerHTML=""; return; }
    var head="", body;
    if(S.tab==="bank"){ body=bankSection(); }
    else if(S.tab==="chat"){ body=chatSection(); }
    else if(S.mod){ head=areaHeadHtml(S.mod); body=areaHtml(S.mod); }
    else { body=homeHtml(); }
    root.innerHTML='<div class="pd-wrap">'+head+'<div class="pd-body">'+body+'</div></div>';
    wire(root);
    if(keepMode) root.__jgl.refresh();
  }

  /* тап по «глазу» на плитке: скрытие/показ ЛИЧНО в дашборде (hiddenParent, op tile_hidden_parent) */
  function toggleCardHidden(id){
    var hidSet=effHidden();
    var cur={}; for(var k in hidSet) if(hidSet.hasOwnProperty(k)) cur[k]=1;
    var vis=0; gridMods().forEach(function(m){ if(!cur[m.id]) vis++; });
    if(!cur[id] && vis<=1){ if(RT._shell&&RT._shell.toast) RT._shell.toast(t("reorder.lastNo",{fallback:"Нельзя скрыть последнюю"})); return; }
    if(cur[id]) delete cur[id]; else cur[id]=1;
    var ids=[]; for(var x in cur) if(cur.hasOwnProperty(x)) ids.push(x);
    if(!S.data) S.data={}; S.data.hiddenParent=ids;            /* локально сразу */
    RT.API.post("accounts.php",{op:"tile_hidden_parent",hidden:ids}).catch(function(){}); /* персист */
    render(true);
  }

  function wire(root){
    var back=root.querySelector("#pdBack");
    if(back) back.onclick=function(){ S.mod=null; render(); window.scrollTo(0,0); };
    var wa=root.querySelector("#pdWalkAdd");
    if(wa) wa.onclick=function(){ if(RT.open) RT.open("walk"); };
    var gv=root.querySelector("#pdGive"); if(gv) gv.onclick=openGive;
    var pv=root.querySelector("#pdPen"); if(pv) pv.onclick=openPen;
    var sw=root.querySelector("#pdKidSw"); if(sw) sw.onclick=openChildSwitch;
    /* открыть полноэкранные модули из вкладок Копилка/Чат */
    var ob=root.querySelector("#pdOpenBank"); if(ob) ob.onclick=function(){ if(RT.open) RT.open("bank"); };
    var ot=root.querySelector("#pdOpenTasks"); if(ot) ot.onclick=function(){ if(RT.open) RT.open("tasks"); };
    var oc=root.querySelector("#pdOpenChat"); if(oc) oc.onclick=function(){ if(RT.open) RT.open("chat"); };
    /* плитки приложений */
    Array.prototype.forEach.call(root.querySelectorAll(".tile[data-mod]"),function(b){
      b.onclick=function(e){
        var id=b.getAttribute("data-mod");
        if(e && e.target && e.target.closest(".jgl-eye")){ toggleCardHidden(id); return; }
        if(AREA_MODS[id]){ S.mod=id; S.wseg="want"; render(); window.scrollTo(0,0); return; }
        if(RT.open) RT.open(id); /* tasks/shop/игры — открыть сам модуль */
      };
    });
    /* виш-лист: сегменты + карточки + деталь */
    var ws=root.querySelector("#pdWseg");
    if(ws) Array.prototype.forEach.call(ws.querySelectorAll("[data-s]"),function(b){
      b.onclick=function(){ S.wseg=b.getAttribute("data-s"); render(); };
    });
    Array.prototype.forEach.call(root.querySelectorAll(".pd-wcard"),function(b){
      b.onclick=function(){ openDetail(b.getAttribute("data-w")); };
    });
    /* деталь записи трекера */
    Array.prototype.forEach.call(root.querySelectorAll(".pd-crow[data-det]"),function(b){
      b.onclick=function(){ openContentDetail(b.getAttribute("data-det")); };
    });
  }

  /* нижняя навигация: делегированный клик (бар живёт в <body>) */
  function wireTabs(){
    var bar=tabsEl(); if(!bar||bar.__pdWired) return;
    bar.__pdWired=true;
    bar.addEventListener("click",function(e){
      var b=e.target.closest("[data-ptab]"); if(!b) return;
      /* Копилка/Чат теперь ВНУТРИ родителя (таббар остаётся): не уводим в модуль,
         меняем вкладку на месте. Сам модуль (полноэкранный) открывается по кнопке внутри. */
      S.tab=b.getAttribute("data-ptab"); S.mod=null; render(); window.scrollTo(0,0);
    });
  }

  /* =================== данные =================== */
  function fetchData(childId, silent){
    S.loading=true; S.error=false; if(!silent) render();
    var url="parent.php?days=30"+(childId?("&child="+encodeURIComponent(childId)):"");
    RT.API.get(url).then(function(r){
      S.loading=false;
      if(!(r&&r.ok)){ S.error=true; render(); return; }
      if(r.events&&r.events.sort) r.events.sort(function(a,b){ return b.at-a.at; });
      S.data=r; S.childId=r.child?r.child.id:null;
      saveChild(S.childId);
      render();
    }).catch(function(err){
      if(childId && err && /^http 403/.test(err.message||"")){ saveChild(null); fetchData(null); return; }
      S.loading=false; S.error=true; render();
    });
  }

  /* =================== публичный интерфейс (сохранён для shell/sdk/shop) =================== */
  RT.Parent={
    show: function(){
      wireTabs();
      if(!S.data && !S.loading){ fetchData(savedChild()); return; }
      render();
      if(!S.loading) fetchData(S.childId||savedChild(), true);
    },
    render: render,
    refresh: function(){ if(S.loading) return false; fetchData(S.childId, true); },
    moreJournal: function(){}, /* журнал убран — no-op для совместимости */
    active: active,
    childId: function(){ return S.childId || savedChild(); },
    children: function(){ return (S.data && S.data.children) || []; },
    /* ЕДИНОЕ НИЖНЕЕ МЕНЮ (shell.navTo, ПЛАН-нижнее-меню.md Ф3): дашборд переключает
       вкладки apps/bank/chat из общего бара (свой #pdTabs скрыт CSS). */
    setTab: function(tb){ if(tb && tb!==S.tab){ S.tab=tb; S.mod=null; render(); window.scrollTo(0,0); } },
    tab: function(){ return S.tab; }
  };
})(window.RobTop);
