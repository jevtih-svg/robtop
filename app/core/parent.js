/* RobTop — РОДИТЕЛЬСКИЙ ЭКРАН (read-only дашборд, ядро оболочки).
   Показывается ТОЛЬКО родительской сессии вместо детского главного экрана.

   Поверхности: Обзор (HUD, график активности, карточки приложений, заметки) ·
   ЭКРАН ПРИЛОЖЕНИЯ (тап по карточке: контент ребёнка + последние события, кнопка
   «назад») · Виш-лист ребёнка (вкладка) · Журнал (бесконечная прокрутка).

   Принципы (фидбек заказчика 2026-06-07):
   - Метрики считают только ОСМЫСЛЕННЫЕ действия ребёнка (isDomain): без login'ов,
     без viewed_ и opened_, без generic-дублей создания записей у модулей с
     доменными событиями, без bank и accounts. Никаких «292 события» из шума.
   - По тапу на приложение родитель видит КОНТЕНТ ребёнка (оценки с текстами,
     настроения, раунды, слова, чистки), события — вторичны, внизу экрана.
   - Таббар живёт в <body> (index.html #pdTabs), НЕ внутри #parent: у .view.active
     заполненная анимация с transform, и Chrome делает секцию containing block —
     fixed-таббар внутри неё прилипал к низу длинного списка, а не экрана.
   - Журнал: человеческие формулировки, чанки по 80 + «Показать ещё»/автоподгрузка
     при прокрутке; старше первой страницы — догрузка с сервера (?before=id).

   Данные: GET api/parent.php (скоуп ребёнка на сервере, гейт rt_require_parent).
   Контракт для НОВЫХ модулей (Шаг 4а гайда): журнальный текст — ключ
   parent.ev.<module>.<type>; без ключа — generic. Неизвестный модуль автоматически
   получает generic-сводку, generic-контент и место в фильтрах. */
window.RobTop = window.RobTop || {};
(function(RT){
  "use strict";
  var I=RT.i18n;

  /* =================== СЛОВАРИ (en/ru/lv) =================== */
  I.add({
  en:{ parent:{
    badge:"View only", lastSeen:"last activity: {x}", never:"no activity yet",
    refresh:"Refresh", switchChild:"Choose a child", close:"Close",
    noChild:{ h:"No children yet", p:"Add a child in Settings → Family — their wishlist, stats and activity log will appear here." , btn:"Open Settings"},
    loadFail:"Couldn't load the data", retry:"Retry",
    tab:{ overview:"Overview", wishlist:"Wishlist", journal:"Log" },
    period:{ d7:"7 days", d30:"30 days" },
    hud:{ acts:{one:"action",other:"actions"}, days:{one:"active day",other:"active days"}, points:"points total" },
    sect:{ activity:"Activity by day", byApp:"Apps", insights:"Notes" },
    sum:{ wishlist:"{total} wishes · {want} want · {bought} bought",
      teeth:"streak: {n} 🔥 · {c} in period", rating:"average: {avg}★ · {c} rated",
      mood:"most often: {e} {name} ×{c}", reverse:"{c} words reversed", guess:"guessed {w} of {c}",
      bank:"{p} points total · streak {s} 🔥", bankTasks:"⏳ waiting for check: {n}",
      generic:{one:"{n} action in period",other:"{n} actions in period"}, none:"no activity in period" },
    ins:{ streak:"Brushing streak: {n} days in a row", bought:"Wish fulfilled: “{t}” 🎉",
      peak:{ morning:"Most active in the morning (7–11)", day:"Most active in the daytime (11–17)", evening:"Most active in the evening (17–22)" } },
    m:{ lastEvents:"Recent events", openJournal:"App log", empty:"Nothing here yet.",
      noText:"no comment", liked:"Liked: {x}", walkAdd:"🐾 Log a walk" },
    give:{ btn:"⭐ Give points", title:"Give points", customPh:"How many", notePh:"What for? (the child will see it)",
      submit:"Give +{n}", needAmount:"Enter the amount", needNote:"Write what it's for",
      done:"+{n} points added", fail:"Couldn't save, try again" },
    g:{ win:"guessed it", wrong:"missed", timeout:"time ran out" },
    wl:{ banner:"View mode. Only {name} can make changes.",
      want:"Want", thinking:"Thinking", bought:"Bought", empty:"Nothing in this section.",
      chipChanged:"changed ×{n}", chipDays:{one:"in {n} day",other:"in {n} days"}, chipLink:"link",
      note:"Why I want it", openLink:"Open link", histTitle:"Wish history",
      hist:{ created:"Added", changed_mind:"Changed mind", purchased:"Bought", back_to_want:"Want again", edited:"Edited" },
      cnt:{ changed:"changed mind", bought:"bought", returned:"returned" },
      ro:"View only — only {name} edits", close:"Close", fullPhoto:"Open full photo" },
    j:{ all:"All", count:{one:"{n} event in {d} days",other:"{n} events in {d} days"},
      today:"Today", yesterday:"Yesterday", empty:"No events yet.", more:"Show more", loading:"Loading…" },
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
    noChild:{ h:"Детей пока нет", p:"Добавь ребёнка в Настройках → Семья — здесь появятся его виш-лист, статистика и журнал.", btn:"Открыть настройки"},
    loadFail:"Не удалось загрузить данные", retry:"Повторить",
    tab:{ overview:"Обзор", wishlist:"Виш-лист", journal:"Журнал" },
    period:{ d7:"7 дней", d30:"30 дней" },
    hud:{ acts:{one:"действие",few:"действия",many:"действий"}, days:{one:"активный день",few:"активных дня",many:"активных дней"}, points:"очков всего" },
    sect:{ activity:"Активность по дням", byApp:"Приложения", insights:"Заметки" },
    sum:{ wishlist:"{total} желаний · {want} хочу · {bought} куплено",
      teeth:"серия: {n} 🔥 · {c} за период", rating:"средняя: {avg}★ · {c} оценок",
      mood:"чаще всего: {e} {name} ×{c}", reverse:"{c} слов перевёрнуто", guess:"угадано {w} из {c}",
      bank:"{p} пунктов всего · винстрик {s} 🔥", bankTasks:"⏳ ждут проверки: {n}",
      generic:{one:"{n} действие за период",few:"{n} действия за период",many:"{n} действий за период"}, none:"нет активности за период" },
    ins:{ streak:"Серия чистки зубов: {n} дней подряд", bought:"Исполнено желание: «{t}» 🎉",
      peak:{ morning:"Самое активное время — утро (7–11)", day:"Самое активное время — день (11–17)", evening:"Самое активное время — вечер (17–22)" } },
    m:{ lastEvents:"Последние события", openJournal:"Журнал приложения", empty:"Пока пусто.",
      noText:"без комментария", liked:"Понравилось: {x}", walkAdd:"🐾 Записать прогулку" },
    give:{ btn:"⭐ Начислить очки", title:"Начислить очки", customPh:"Сколько", notePh:"За что? (увидит ребёнок)",
      submit:"Начислить +{n}", needAmount:"Введи сумму", needNote:"Напиши, за что",
      done:"+{n} пунктов начислено", fail:"Не получилось сохранить, попробуй ещё раз" },
    g:{ win:"угадал", wrong:"не угадал", timeout:"время вышло" },
    wl:{ banner:"Режим просмотра. Изменения может вносить только {name}.",
      want:"Хочу", thinking:"Думаю", bought:"Купил", empty:"В этом разделе пусто.",
      chipChanged:"передумал ×{n}", chipDays:{one:"за {n} день",few:"за {n} дня",many:"за {n} дней"}, chipLink:"ссылка",
      note:"Почему хочу", openLink:"Открыть ссылку", histTitle:"История желания",
      hist:{ created:"Добавлено", changed_mind:"Передумал", purchased:"Куплено", back_to_want:"Снова хочу", edited:"Изменено" },
      cnt:{ changed:"раз передумал", bought:"раз куплено", returned:"раз вернул" },
      ro:"Только просмотр — редактирует {name}", close:"Закрыть", fullPhoto:"Открыть фото полностью" },
    j:{ all:"Все", count:{one:"{n} событие за {d} дней",few:"{n} события за {d} дней",many:"{n} событий за {d} дней"},
      today:"Сегодня", yesterday:"Вчера", empty:"Событий пока нет.", more:"Показать ещё", loading:"Загрузка…" },
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
    noChild:{ h:"Bērnu vēl nav", p:"Pievieno bērnu Iestatījumos → Ģimene — šeit parādīsies viņa vēlmju saraksts, statistika un žurnāls.", btn:"Atvērt iestatījumus"},
    loadFail:"Neizdevās ielādēt datus", retry:"Mēģināt vēlreiz",
    tab:{ overview:"Pārskats", wishlist:"Vēlmju saraksts", journal:"Žurnāls" },
    period:{ d7:"7 dienas", d30:"30 dienas" },
    hud:{ acts:{zero:"darbību",one:"darbība",other:"darbības"}, days:{zero:"aktīvu dienu",one:"aktīva diena",other:"aktīvas dienas"}, points:"punkti kopā" },
    sect:{ activity:"Aktivitāte pa dienām", byApp:"Lietotnes", insights:"Piezīmes" },
    sum:{ wishlist:"{total} vēlmes · {want} gribu · {bought} nopirkts",
      teeth:"sērija: {n} 🔥 · {c} periodā", rating:"vidēji: {avg}★ · {c} vērtējumi",
      mood:"visbiežāk: {e} {name} ×{c}", reverse:"{c} vārdi apgriezti", guess:"uzminēti {w} no {c}",
      bank:"{p} punkti kopā · sērija {s} 🔥", bankTasks:"⏳ gaida pārbaudi: {n}",
      generic:{zero:"{n} darbību periodā",one:"{n} darbība periodā",other:"{n} darbības periodā"}, none:"perioda aktivitātes nav" },
    ins:{ streak:"Zobu tīrīšanas sērija: {n} dienas pēc kārtas", bought:"Vēlme piepildīta: “{t}” 🎉",
      peak:{ morning:"Aktīvākais laiks — rīts (7–11)", day:"Aktīvākais laiks — diena (11–17)", evening:"Aktīvākais laiks — vakars (17–22)" } },
    m:{ lastEvents:"Pēdējie notikumi", openJournal:"Lietotnes žurnāls", empty:"Vēl nekā nav.",
      noText:"bez komentāra", liked:"Patika: {x}", walkAdd:"🐾 Pierakstīt pastaigu" },
    give:{ btn:"⭐ Piešķirt punktus", title:"Piešķirt punktus", customPh:"Cik daudz", notePh:"Par ko? (bērns redzēs)",
      submit:"Piešķirt +{n}", needAmount:"Ievadi summu", needNote:"Uzraksti, par ko",
      done:"+{n} punkti pieskaitīti", fail:"Neizdevās saglabāt, mēģini vēlreiz" },
    g:{ win:"uzminēja", wrong:"neuzminēja", timeout:"laiks beidzās" },
    wl:{ banner:"Skatīšanās režīms. Izmaiņas var veikt tikai {name}.",
      want:"Gribu", thinking:"Domāju", bought:"Nopirku", empty:"Šajā sadaļā nekā nav.",
      chipChanged:"pārdomāju ×{n}", chipDays:{zero:"{n} dienās",one:"{n} dienā",other:"{n} dienās"}, chipLink:"saite",
      note:"Kāpēc gribu", openLink:"Atvērt saiti", histTitle:"Vēlmes vēsture",
      hist:{ created:"Pievienots", changed_mind:"Pārdomāju", purchased:"Nopirkts", back_to_want:"Atkal gribu", edited:"Mainīts" },
      cnt:{ changed:"reizes pārdomāja", bought:"reizes nopirkts", returned:"reizes atgrieza" },
      ro:"Tikai skatīšanās — rediģē {name}", close:"Aizvērt", fullPhoto:"Atvērt foto pilnā izmērā" },
    j:{ all:"Visi", count:{zero:"{n} notikumu {d} dienās",one:"{n} notikums {d} dienās",other:"{n} notikumi {d} dienās"},
      today:"Šodien", yesterday:"Vakar", empty:"Notikumu vēl nav.", more:"Rādīt vairāk", loading:"Ielādē…" },
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
  var S={ data:null, childId:null, loading:false, error:false,
          tab:"overview", mod:null, period:7, wseg:"want", jfilter:"all",
          jshown:80, jMoreBusy:false };
  var PAGE=80;

  /* ---- запомненный выбор ребёнка (фикс: обновление страницы сбрасывало на первого) ----
     Ключ устройства; если ребёнок стал недоступен (смена семьи) — 403 и откат на первого. */
  var CHILD_KEY="rt_parent_child";
  function savedChild(){ try{ var v=parseInt(localStorage.getItem(CHILD_KEY)||"",10); return v>0?v:null; }catch(e){ return null; } }
  function saveChild(id){ try{ if(id) localStorage.setItem(CHILD_KEY,String(id)); else localStorage.removeItem(CHILD_KEY); }catch(e){} }

  var NOISE={ opened_app:1, opened_module:1, viewed_detail:1, viewed_stats:1 };
  var SKIP_MOD={ bank:1, admin:1 };
  var WL_DOMAIN={ created:1, changed_mind:1, purchased:1, back_to_want:1, edited:1, favorite:1, unfavorite:1, deleted:1, restored:1,
    share_request:1, share_grant:1, share_revoke:1 }; /* шаринг: действия РЕБЁНКА — домен */
  /* тумблер шаринга включает РОДИТЕЛЬ — в журнале виден, но детским действием не считается */
  var WL_PARENT_EV={ share_enabled:1, share_disabled:1 };
  var GEN_DOMAIN={ created:1, edited:1, moved:1, favorite:1, unfavorite:1, deleted:1, restored:1 };
  var SECTC={ want:"#ff3db0", thinking:"#a64bff", bought:"#2bf0c0" };
  var HISTC={ created:"#19e3ff", changed_mind:"#a64bff", purchased:"#2bf0c0", back_to_want:"#ff3db0", edited:"#ffd23b" };
  var MOOD_E={ happy:"😀", mid:"😐", sad:"😢" };
  var ACCT_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="8.4" r="3.6"/><path d="M5 19.5c1.4-3.2 4-4.8 7-4.8s5.6 1.6 7 4.8" stroke-linecap="round"/></svg>';

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
    if(off===0) return t("parent.j.today");
    if(off===1) return t("parent.j.yesterday");
    return I.formatDate(dateForOff(off), {day:"numeric",month:"long"});
  }
  function fmtDayShort(off){ return I.formatDate(dateForOff(off), {day:"numeric",month:"short"}); }
  function hhmm(ts){ var d=new Date(ts); var h=d.getHours(), m=d.getMinutes(); return (h<10?"0":"")+h+":"+(m<10?"0":"")+m; }
  function stars(n){ var s=""; for(var i=0;i<n;i++) s+="★"; return s; }
  /* "YYYY-MM-DD" модулей rating/mood → локализованная дата */
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
    if(id==="accounts") return ACCT_ICON;
    var sh=RT._shell||{};
    if(sh.iconHtml && RT.metaFor(id)) return sh.iconHtml(RT.metaFor(id));
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/></svg>';
  }
  function activeMods(){
    return (RT._registry||[]).filter(function(m){ return m.status==="active" && !SKIP_MOD[m.id]; });
  }

  /* ---- ОСМЫСЛЕННОЕ действие ребёнка (для метрик): без шума и без дублей ----
     У модулей с доменными событиями generic-дубли (created entries/rounds и т.п.)
     не считаются. Неизвестный модуль считается по generic-записям (его сигнал). */
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
  /* видимость в ленте журнала: домен + «Вошёл в приложение» + тумблер шаринга (родитель) */
  function inJournal(e){
    if(e.module==="accounts") return e.type==="login";
    if(e.module==="wishlist" && WL_PARENT_EV[e.type]===1) return true;
    return isDomain(e);
  }

  /* ---- текст события журнала: parent.ev.<module>.<type> → generic → type ---- */
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

  /* =================== агрегаты (только домен-события) =================== */
  function agg(){
    var days=S.period;
    var evs=(S.data&&S.data.events)||[];
    var per=[], perDay={}, perMod={}, hours={};
    for(var i=0;i<evs.length;i++){
      var e=evs[i];
      if(!isDomain(e)) continue;
      var off=dayOff(e.at);
      if(off>=days) continue;
      per.push(e);
      perDay[off]=(perDay[off]||0)+1;
      perMod[e.module]=(perMod[e.module]||0)+1;
      var h=new Date(e.at).getHours(); hours[h]=(hours[h]||0)+1;
    }
    var activeDays=0; for(var k in perDay) if(perDay.hasOwnProperty(k)) activeDays++;
    /* серия зубов: дни с завершённой чисткой подряд, начиная с сегодня (или со вчера) */
    var td={};
    for(i=0;i<evs.length;i++){ var x=evs[i];
      if(x.module==="teeth" && x.type==="created" && x.to!=="skipped" && x.meta && x.meta.collection==="sessions") td[dayOff(x.at)]=1; }
    var streak=0, st=td[0]?0:1;
    if(td[st]){ for(var d=st; d<365 && td[d]; d++) streak++; }
    /* пик времени суток */
    var b={morning:0,day:0,evening:0};
    for(var hh in hours){ if(!hours.hasOwnProperty(hh)) continue; var hn=+hh, c=hours[hh];
      if(hn>=7&&hn<11) b.morning+=c; else if(hn>=11&&hn<17) b.day+=c; else if(hn>=17&&hn<22) b.evening+=c; }
    var peak="evening", best=-1;
    for(var pk in b){ if(b.hasOwnProperty(pk) && b[pk]>best){ best=b[pk]; peak=pk; } }
    /* оценка дня */
    var sum=0,cnt=0;
    for(i=0;i<per.length;i++){ if(per[i].module==="rating"&&per[i].meta&&per[i].meta.stars){ sum+=+per[i].meta.stars; cnt++; } }
    /* настроение */
    var mc={},topMood=null;
    for(i=0;i<per.length;i++){ if(per[i].module==="mood"&&per[i].meta&&per[i].meta.mood){ var mm=per[i].meta.mood; mc[mm]=(mc[mm]||0)+1; } }
    for(var mk in mc){ if(mc.hasOwnProperty(mk)&&(topMood===null||mc[mk]>mc[topMood])) topMood=mk; }
    /* последняя покупка в периоде (events отсортированы DESC) */
    var buy=null;
    for(i=0;i<per.length;i++){ if(per[i].module==="wishlist"&&per[i].type==="purchased"){ buy=per[i]; break; } }
    var words=0,gW=0,gC=0,teethN=0;
    for(i=0;i<per.length;i++){
      if(per[i].module==="reverse") words++;
      if(per[i].module==="guess"){ gC++; if(per[i].meta&&per[i].meta.result==="win") gW++; }
      if(per[i].module==="teeth"&&per[i].to!=="skipped") teethN++;
    }
    return { per:per, perDay:perDay, perMod:perMod, activeDays:activeDays, streak:streak, peak:peak,
      avg:cnt?(sum/cnt).toFixed(1):null, rated:cnt, topMood:topMood, topMoodN:topMood?mc[topMood]:0,
      buy:buy, words:words, guessWin:gW, guessCnt:gC, teethN:teethN };
  }

  /* =================== рендер =================== */
  function kidName(){ return (S.data&&S.data.child&&S.data.child.nickname)||""; }
  /* задания Копилки, ждущие подтверждения родителя (bank/tasks, status=pending) */
  function bankPending(){
    var rows=(S.data&&S.data.content&&S.data.content.bank)||[], n=0, i;
    for(i=0;i<rows.length;i++) if(rows[i].collection==="tasks" && rows[i].status==="pending") n++;
    return n;
  }

  function topbarHtml(){
    var last=S.data&&S.data.lastActivityAt;
    var lastTxt=last
      ? t("parent.lastSeen",{x:(dayOff(last)===0?t("parent.j.today").toLowerCase():I.formatDate(last,{day:"numeric",month:"short"}))+" "+hhmm(last)})
      : t("parent.never");
    var many=S.data&&S.data.children&&S.data.children.length>1;
    return '<div class="pd-top">'
      +'<button class="pd-kid" id="pdKid"'+(many?'':' disabled')+'>'
      +'<span class="ava">🧑‍🚀</span><span class="ktx"><span class="nm">'+esc(kidName())+(many?' ▾':'')+'</span>'
      +'<span class="st">'+esc(lastTxt)+'</span></span></button>'
      +'<span class="pd-badge">👁 '+esc(t("parent.badge"))+'</span>'
      +'<button class="hbtn" id="pdRefresh" aria-label="'+esc(t("parent.refresh"))+'">↻</button>'
      +'<button class="hbtn" id="pdGear" aria-label="'+esc(t("settings.open"))+'">⚙</button>'
      +'</div>';
  }
  /* шапка экрана приложения: назад + иконка + имя */
  function modHeadHtml(id){
    return '<div class="pd-top pd-mhead">'
      +'<button class="back" id="pdBack" aria-label="'+esc(t("common.back"))+'">'
      +'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 5.5L8 12l6.5 6.5"/></svg></button>'
      +'<span class="mic" style="--mc:'+esc(modColor(id))+'">'+modIcon(id)+'</span>'
      +'<span class="mttl">'+esc(modName(id))+'</span>'
      +'<span class="pd-badge">👁 '+esc(t("parent.badge"))+'</span>'
      +'</div>';
  }
  /* таббар рисуется в #pdTabs на уровне <body> (см. шапку файла) */
  function renderTabs(){
    var bar=tabsEl(); if(!bar) return;
    function b(id,svg,label){
      var on=(S.tab===id && !S.mod);
      return '<button data-tab="'+id+'"'+(on?' class="on"':'')+'>'+svg+'<span>'+esc(label)+'</span></button>';
    }
    bar.innerHTML=b("overview",'<svg viewBox="0 0 24 24"><path d="M4 19V10M10 19V5M16 19v-7M21 19H3"/></svg>',t("parent.tab.overview"))
      +b("wishlist",'<svg viewBox="0 0 24 24"><circle cx="9" cy="16" r="4"/><circle cx="17" cy="17" r="3.2"/><path d="M9 12c.5-4 2-6.5 5-8.5M17 13.8C17 9 15.5 6 14 3.5M14 3.5c2 .2 4-.3 5.5-1.5"/></svg>',t("parent.tab.wishlist"))
      +b("journal",'<svg viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1.3"/><circle cx="3.5" cy="12" r="1.3"/><circle cx="3.5" cy="18" r="1.3"/></svg>',t("parent.tab.journal"));
  }

  /* ---------- ОБЗОР ---------- */
  function overviewHtml(){
    var a=agg();
    var data=S.data||{};
    var h='<div class="pd-seg" id="pdPeriod">'
      +'<button data-p="7"'+(S.period===7?' class="on"':'')+'>'+esc(t("parent.period.d7"))+'</button>'
      +'<button data-p="30"'+(S.period===30?' class="on"':'')+'>'+esc(t("parent.period.d30"))+'</button></div>';
    h+='<div class="pd-hud">'
      +'<div class="h"><div class="n">'+a.per.length+'</div><div class="l">'+esc(I.plural(a.per.length,"parent.hud.acts").replace(/\{n\}\s*/,"").replace(/^\d+\s*/,""))+'</div></div>'
      +'<div class="h"><div class="n">'+a.activeDays+'</div><div class="l">'+esc(I.plural(a.activeDays,"parent.hud.days").replace(/\{n\}\s*/,"").replace(/^\d+\s*/,""))+'</div></div>'
      +'<div class="h"><div class="n">'+(data.points||0)+'</div><div class="l">'+esc(t("parent.hud.points"))+'</div></div></div>';
    /* начисление очков родителем: шторка с быстрыми суммами (пишет в леджер Копилки) */
    h+='<button class="btn btn-primary" id="pdGive" style="flex:none;width:100%;margin:10px 0 0">'+esc(t("parent.give.btn"))+'</button>';
    /* график: ряд баров + отдельный ряд подписей; считаются только домен-события */
    var n=S.period, max=1, d, bars="", labels="";
    for(d=0;d<n;d++) if((a.perDay[d]||0)>max) max=a.perDay[d];
    for(d=n-1;d>=0;d--){
      var c=a.perDay[d]||0, hh=Math.max(3,Math.round(c/max*74));
      bars+='<div class="c'+(d===0?' today':'')+'">'+(c>0?'<div class="b" style="height:'+hh+'px"></div>':'<div class="z"></div>')+'</div>';
      var lbl="";
      if(n===7) lbl=I.formatDate(dateForOff(d),{weekday:"short"});
      else if(d%5===0) lbl=fmtDayShort(d).replace(/\.$/,"");
      labels+='<div class="d'+(d===0?' today':'')+'">'+esc(lbl)+'</div>';
    }
    h+='<div class="pd-sect">'+esc(t("parent.sect.activity"))+'</div><div class="pd-card">'
      +'<div class="pd-chart">'+bars+'</div><div class="pd-chart-x">'+labels+'</div></div>';
    /* приложения: осмысленная строка по каждому (карточки = единственный блок) */
    var items=(data.items||[]), wWant=0,wBought=0;
    items.forEach(function(w){ if(w.status==="want")wWant++; if(w.status==="bought")wBought++; });
    h+='<div class="pd-sect">'+esc(t("parent.sect.byApp"))+'</div>';
    activeMods().forEach(function(m){
      var line;
      if(m.id==="wishlist") line=t("parent.sum.wishlist",{total:items.length,want:wWant,bought:wBought});
      else if(m.id==="teeth") line=a.teethN?t("parent.sum.teeth",{n:a.streak,c:a.teethN}):t("parent.sum.none");
      else if(m.id==="rating") line=a.rated?t("parent.sum.rating",{avg:a.avg,c:a.rated}):t("parent.sum.none");
      else if(m.id==="mood") line=a.topMood?t("parent.sum.mood",{e:MOOD_E[a.topMood]||"🙂",name:t("parent.mood."+a.topMood,{fallback:a.topMood}),c:a.topMoodN}):t("parent.sum.none");
      else if(m.id==="reverse") line=a.words?t("parent.sum.reverse",{c:a.words}):t("parent.sum.none");
      else if(m.id==="guess") line=a.guessCnt?t("parent.sum.guess",{w:a.guessWin,c:a.guessCnt}):t("parent.sum.none");
      else { var cc=a.perMod[m.id]||0; line=cc?I.plural(cc,"parent.sum.generic"):t("parent.sum.none"); }
      h+='<button class="pd-mcard" data-mod="'+esc(m.id)+'" style="--mc:'+esc(modColor(m.id))+'">'
        +'<span class="ic">'+modIcon(m.id)+'</span>'
        +'<span class="tx"><span class="t1">'+esc(modName(m.id))+'</span><span class="t2">'+esc(line)+'</span></span>'
        +'<svg class="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>'
        +'</button>';
    });
    /* Копилка: спец-карточка (bank в SKIP_MOD — скрыт из метрик/журнала, но родителю нужен
       вход к заданиям и подтверждениям). Тап открывает САМ модуль через RobTop.open —
       прецедент walk: родитель видит то же, что ребёнок, плюс свои кнопки (задания, панель).
       Строка: «⏳ ждут проверки: N» (bank/tasks из content), иначе пункты+винстрик. */
    if(RT.metaFor && RT.metaFor("bank")){
      var pend=bankPending();
      var bline=pend>0 ? t("parent.sum.bankTasks",{n:pend})
                       : t("parent.sum.bank",{p:(data.points||0),s:(data.streak||0)});
      h+='<button class="pd-mcard" data-mod="bank" style="--mc:'+esc(modColor("bank"))+'">'
        +'<span class="ic">'+modIcon("bank")+'</span>'
        +'<span class="tx"><span class="t1">'+esc(modName("bank"))+'</span><span class="t2">'+esc(bline)+'</span></span>'
        +'<svg class="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>'
        +'</button>';
    }
    /* заметки */
    var ins=[];
    if(a.streak>=3) ins.push({e:"🔥",x:t("parent.ins.streak",{n:a.streak})});
    if(a.buy) ins.push({e:"🎉",x:t("parent.ins.bought",{t:a.buy.title||""})});
    if(a.per.length) ins.push({e:a.peak==="morning"?"🌅":(a.peak==="day"?"🌤":"🌙"),x:t("parent.ins.peak."+a.peak)});
    if(ins.length){
      h+='<div class="pd-sect">'+esc(t("parent.sect.insights"))+'</div><div class="pd-card">';
      ins.forEach(function(i2){ h+='<div class="pd-ins"><span class="e">'+i2.e+'</span><span class="x">'+esc(i2.x)+'</span></div>'; });
      h+='</div>';
    }
    return h;
  }

  /* ---------- ЭКРАН ПРИЛОЖЕНИЯ: контент ребёнка + последние события ---------- */
  function contentRows(modId){
    var all=(S.data&&S.data.content&&S.data.content[modId])||[];
    return all;
  }
  function quoteHtml(d){
    var out="";
    if(d.why) out+='<span class="pd-quote">«'+esc(d.why)+'»</span>';
    if(d.liked) out+='<span class="pd-quote">'+esc(t("parent.m.liked",{x:d.liked}))+'</span>';
    return out;
  }
  function photoHtml(d){
    return d.photo?'<span class="pd-cphoto" style="background-image:url(\''+esc(d.photo)+'\')"></span>':"";
  }
  function crow(icon, main, sub, right, extra){
    return '<div class="pd-crow"><span class="ci">'+icon+'</span>'
      +'<span class="cx"><span class="c1">'+main+'</span>'+(sub?'<span class="c2">'+sub+'</span>':'')+(extra||'')+'</span>'
      +(right?'<span class="ct">'+right+'</span>':'')+'</div>';
  }
  function moduleContentHtml(id){
    var rows=contentRows(id), h="";
    if(!rows.length) return '<div class="pd-empty">'+esc(t("parent.m.empty"))+'</div>';
    if(id==="rating"){
      rows.forEach(function(r){ var d=r.data||{};
        h+=crow('<b class="gold">'+stars(+d.stars||0)+'</b>',
          esc(fmtDayStr(d.day)), quoteHtml(d)?'':'<i class="pd-dim">'+esc(t("parent.m.noText"))+'</i>',
          photoHtml(d), quoteHtml(d));
      });
      return h;
    }
    if(id==="mood"){
      rows.forEach(function(r){ var d=r.data||{};
        var mk=d.mood||"mid";
        h+=crow('<b class="emo">'+(MOOD_E[mk]||"🙂")+'</b>',
          esc(t("parent.mood."+mk,{fallback:mk}))+' · '+esc(fmtDayStr(d.day)),
          quoteHtml(d)?'':'<i class="pd-dim">'+esc(t("parent.m.noText"))+'</i>',
          photoHtml(d), quoteHtml(d));
      });
      return h;
    }
    if(id==="guess"){
      rows.forEach(function(r){ var d=r.data||{};
        var res=(d.result==="win")?"win":(d.result==="timeout"?"timeout":"wrong");
        var ic=(res==="win")?'<b class="okc">✓</b>':(res==="timeout"?'<b class="dimc">⌛</b>':'<b class="badc">✗</b>');
        h+=crow(ic, esc(String(d.expr||"?"))+' = '+esc(String(d.ans!=null?d.ans:"?")),
          esc(t("parent.g."+res))+(d.picked!=null?' · '+esc(String(d.picked)):''),
          esc((d.date||"")+(d.time?(" · "+d.time):"")) , '');
      });
      return h;
    }
    if(id==="reverse"){
      rows.forEach(function(r){ var d=r.data||{};
        h+=crow('<b class="dimc">⇄</b>', esc(d.text||"")+' → <b>'+esc(d.reversed||"")+'</b>', '', esc(I.formatDate(r.createdAt,{day:"numeric",month:"short"})), '');
      });
      return h;
    }
    if(id==="teeth"){
      rows.forEach(function(r){ var d=r.data||{};
        var done=(d.status!=="skipped");
        h+=crow(done?'<b class="okc">✓</b>':'<b class="badc">—</b>',
          esc(t(done?"parent.ev.teeth.done":"parent.ev.teeth.skipped")),
          '', esc((d.date||"")+(d.time?(" · "+d.time):"")), '');
      });
      return h;
    }
    /* неизвестный модуль: первая строковая «суть» записи + дата */
    rows.forEach(function(r){ var d=r.data||{}, txt="";
      for(var k in d){ if(d.hasOwnProperty(k)&&typeof d[k]==="string"&&d[k].length&&d[k].length<=80&&k!=="photo"){ txt=d[k]; break; } }
      h+=crow('<b class="dimc">•</b>', esc(txt||r.collection), '', esc(I.formatDate(r.createdAt,{day:"numeric",month:"short"})), '');
    });
    return h;
  }
  function moduleHtml(id){
    var a=agg(), line;
    if(id==="teeth") line=a.teethN?t("parent.sum.teeth",{n:a.streak,c:a.teethN}):"";
    else if(id==="rating") line=a.rated?t("parent.sum.rating",{avg:a.avg,c:a.rated}):"";
    else if(id==="mood") line=a.topMood?t("parent.sum.mood",{e:MOOD_E[a.topMood]||"🙂",name:t("parent.mood."+a.topMood,{fallback:a.topMood}),c:a.topMoodN}):"";
    else if(id==="reverse") line=a.words?t("parent.sum.reverse",{c:a.words}):"";
    else if(id==="guess") line=a.guessCnt?t("parent.sum.guess",{w:a.guessWin,c:a.guessCnt}):"";
    else line="";
    /* walk: родитель может записать прогулку сам — открывается обычный модуль walk
       (детский мастер); data.php скоупит запись родителя в общий пул ребёнка */
    var walkBtn=(id==="walk" && RT.metaFor && RT.metaFor("walk"))
      ? '<button class="btn btn-primary" id="pdWalkAdd" style="flex:none;width:100%;margin:2px 0 10px">'+esc(t("parent.m.walkAdd"))+'</button>' : "";
    var h= walkBtn + (line?'<div class="pd-robanner" style="margin-top:2px">'+esc(line)+'</div>':"");
    h+=moduleContentHtml(id);
    /* последние события модуля — вторичный блок */
    var evs=((S.data&&S.data.events)||[]).filter(function(e){ return e.module===id && inJournal(e); }).slice(0,10);
    if(evs.length){
      h+='<div class="pd-sect">'+esc(t("parent.m.lastEvents"))+'</div>';
      evs.forEach(function(e){
        h+='<div class="pd-ev" style="--mc:'+esc(modColor(id))+'">'
          +'<span class="ic">'+modIcon(id)+'</span>'
          +'<span class="tx"><span class="t1">'+esc(evText(e))+'</span><span class="t2">'+esc(fmtDay(dayOff(e.at)))+'</span></span>'
          +'<span class="tm">'+hhmm(e.at)+'</span></div>';
      });
      h+='<button class="btn btn-cancel pd-openj" id="pdOpenJournal" style="flex:none;width:100%">'+esc(t("parent.m.openJournal"))+'</button>';
    }
    return h;
  }

  /* ---------- ВИШ-ЛИСТ ---------- */
  function chipsFor(w){
    var cm=0,i;
    for(i=0;i<w.history.length;i++) if(w.history[i].type==="changed_mind") cm++;
    var h='<span class="pd-chip">'+esc(t("parent.wl.hist.created"))+' · '+esc(I.formatDate(w.createdAt,{day:"numeric",month:"short"}))+'</span>';
    if(cm) h+='<span class="pd-chip cm">'+esc(t("parent.wl.chipChanged",{n:cm}))+'</span>';
    if(w.status==="bought"&&w.boughtAt){
      var dd=Math.max(1,Math.round((startOfDay(w.boughtAt)-startOfDay(w.createdAt))/86400000));
      h+='<span class="pd-chip buy">'+esc(I.plural(dd,"parent.wl.chipDays"))+'</span>';
    }
    if(w.link) h+='<span class="pd-chip lnk">🔗 '+esc(t("parent.wl.chipLink"))+'</span>';
    return h;
  }
  function wishlistHtml(){
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

  /* ---------- ЖУРНАЛ (чанки + автоподгрузка) ---------- */
  function journalAll(){
    var evs=(S.data&&S.data.events)||[];
    return evs.filter(function(e){
      if(!inJournal(e)) return false;
      if(S.jfilter!=="all"&&e.module!==S.jfilter) return false;
      return true;
    });
  }
  function journalHtml(){
    var h='<div class="pd-fchips" id="pdJf">';
    h+='<button data-f="all"'+(S.jfilter==="all"?' class="on"':'')+'>'+esc(t("parent.j.all"))+'</button>';
    activeMods().forEach(function(m){
      h+='<button data-f="'+esc(m.id)+'" style="--mc:'+esc(modColor(m.id))+'"'+(S.jfilter===m.id?' class="on"':'')+'>'
        +'<span class="dot"></span>'+esc(modName(m.id))+'</button>';
    });
    h+='</div>';
    var list=journalAll();
    var nTxt=I.plural(list.length,"parent.j.count",{d:(S.data&&S.data.days)||30});
    if(S.data&&S.data.eventsHasMore) nTxt+=" +";
    h+='<div class="pd-jcount">'+esc(nTxt)+'</div>';
    if(!list.length) h+='<div class="pd-empty">'+esc(t("parent.j.empty"))+'</div>';
    var shown=list.slice(0,S.jshown), lastD=-1;
    shown.forEach(function(e){
      var off=dayOff(e.at);
      if(off!==lastD){ h+='<div class="pd-dayhdr">'+esc(fmtDay(off))+'</div>'; lastD=off; }
      var clickable=(e.module==="wishlist"&&e.itemId!=null);
      var tag=clickable?"button":"div";
      h+='<'+tag+' class="pd-ev" style="--mc:'+esc(modColor(e.module))+'"'+(clickable?' data-w="'+e.itemId+'"':'')+'>'
        +'<span class="ic">'+modIcon(e.module)+'</span>'
        +'<span class="tx"><span class="t1">'+esc(evText(e))+'</span><span class="t2">'+esc(modName(e.module))+'</span></span>'
        +'<span class="tm">'+hhmm(e.at)+'</span></'+tag+'>';
    });
    var moreLocal=list.length>S.jshown, moreServer=!!(S.data&&S.data.eventsHasMore);
    if(moreLocal||moreServer){
      h+='<button class="btn btn-cancel pd-morebtn" id="pdMore" style="flex:none;width:100%">'
        +esc(S.jMoreBusy?t("parent.j.loading"):t("parent.j.more"))+'</button>';
    }
    return h;
  }
  /* догрузка журнала: сначала локальные чанки, затем сервер (?before=) */
  function moreJournal(){
    if(S.jMoreBusy) return;
    var list=journalAll();
    if(list.length>S.jshown){ S.jshown+=PAGE; render(); return; }
    if(!(S.data&&S.data.eventsHasMore)) return;
    var evs=S.data.events||[];
    var last=evs.length?evs[evs.length-1].id:0;
    if(!last){ S.data.eventsHasMore=false; render(); return; }
    S.jMoreBusy=true; render();
    var url="parent.php?days=30&before="+encodeURIComponent(last)+(S.childId?("&child="+encodeURIComponent(S.childId)):"");
    RT.API.get(url).then(function(r){
      S.jMoreBusy=false;
      if(r&&r.ok&&r.events){
        S.data.events=evs.concat(r.events);
        S.data.eventsHasMore=!!r.eventsHasMore;
        S.jshown+=PAGE;
      } else { S.data.eventsHasMore=false; }
      render();
    }).catch(function(){ S.jMoreBusy=false; render(); });
  }
  /* автоподгрузка при прокрутке к низу (журнал, без открытого экрана модуля) */
  function onScroll(){
    if(!active()||S.tab!=="journal"||S.mod||S.jMoreBusy) return;
    var doc=document.documentElement;
    var bottom=(window.scrollY||doc.scrollTop||0)+window.innerHeight;
    if(doc.scrollHeight-bottom<400){
      var list=journalAll();
      if(list.length>S.jshown || (S.data&&S.data.eventsHasMore)) moreJournal();
    }
  }

  /* ---------- деталь желания (read-only, через общий sheet оболочки) ---------- */
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
    /* фото кликабельно: открывает ПОЛНОЕ изображение во весь экран (лайтбокс) */
    var ph=w.photo
      ? '<span class="ph" data-full="'+esc(w.photo)+'" role="button" tabindex="0" aria-label="'+esc(t("parent.wl.fullPhoto"))+'" style="background-image:url(\''+esc(w.photo)+'\')"></span>'
      : '<span class="ph emo">'+esc(w.icon||"🍒")+'</span>';
    var h='<div class="pd-dhead" style="--sc:'+SECTC[w.status]+'">'+ph
      +'<div><h2 style="text-align:left;margin:0 0 6px">'+(w.favorite?'<span style="color:var(--gold)">★</span> ':'')+esc(w.title||"")+'</h2>'
      +'<span class="pd-pill">'+esc(t("parent.wl."+w.status))+'</span></div></div>';
    if(w.note) h+='<div class="pd-dnote"><b>'+esc(t("parent.wl.note"))+'</b>'+esc(w.note)+'</div>';
    if(w.link) h+='<a class="pd-dlink" href="'+esc(w.link)+'" target="_blank" rel="noopener">🔗 '+esc(t("parent.wl.openLink"))+'</a>';
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

  /* ---------- лайтбокс: полноэкранный просмотр фото желания (тап по фото в детали) ---------- */
  function openLightbox(src){
    if(!src) return;
    var ov=document.createElement("div");
    ov.className="pd-lightbox";
    ov.innerHTML='<img alt="">';
    ov.querySelector("img").src=src;
    document.body.appendChild(ov);
    function close(){ if(ov.parentNode) ov.parentNode.removeChild(ov); document.removeEventListener("keydown",onK); }
    function onK(ev){ if(ev.key==="Escape") close(); }
    ov.addEventListener("click",close);
    document.addEventListener("keydown",onK);
  }

  /* ---------- начисление очков родителем (быстрые суммы + произвольная) ----------
     Пишет ТОЛЬКО через движок sdk.points (ГАЙД-очки.md §8.3): транзакция
     {n:+N, reason:"parent_give", kind:"parent", note} — винстрик не трогает,
     история видна ребёнку в Копилке (вкладка «Родители»), note перебивает подпись.
     Серверный путь: data.php → bank/points; роль parent скоупится на ребёнка
     СЕМЬИ (rt_family_child_uid, общий пул — как walk), миграция 010 разрешает
     edit роли parent в манифесте bank. */
  var _bsdk=null, giveBusy=false;
  function bankSdk(){ if(!_bsdk) _bsdk=RT.createSdk({id:"bank"}); return _bsdk; }
  function openGive(){
    var AMTS=[10,20,25,50];
    var node=document.createElement("div");
    var h='<h2>'+esc(t("parent.give.title"))+'</h2>';
    h+='<div class="pd-gamts" id="pdGA">';
    AMTS.forEach(function(a,i){ h+='<button type="button" data-a="'+a+'"'+(i===0?' class="on"':'')+'>+'+a+'</button>'; });
    h+='<button type="button" data-a="0">+…</button></div>';
    h+='<div class="field" id="pdGCW" style="display:none"><input type="number" id="pdGC" inputmode="numeric" min="1" max="9999" placeholder="'+esc(t("parent.give.customPh"))+'"></div>';
    h+='<div class="field"><input type="text" id="pdGN" maxlength="60" placeholder="'+esc(t("parent.give.notePh"))+'"></div>';
    h+='<div class="sheet-actions"><button class="btn btn-cancel" data-close style="flex:1">'+esc(t("parent.close"))+'</button>'
      +'<button class="btn btn-primary" id="pdGGo" style="flex:1.4">'+esc(t("parent.give.submit",{n:AMTS[0]}))+'</button></div>';
    node.innerHTML=h;
    var ctl=RT._shell.sheet(node);
    node.querySelector("[data-close]").onclick=ctl.close;
    var amt=AMTS[0], custom=false;
    var cw=node.querySelector("#pdGCW"), ci=node.querySelector("#pdGC"),
        ni=node.querySelector("#pdGN"), go=node.querySelector("#pdGGo");
    function val(){ return custom ? Math.max(0,parseInt((ci.value||"").trim(),10)||0) : amt; }
    function lbl(){ var n=val(); go.textContent=t("parent.give.submit",{n:n||"…"}); }
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
      /* fire-and-forget по гайду нельзя: родителю нужен результат; add никогда не reject */
      bankSdk().points.add(n,"parent_give",{kind:"parent",src:"parent",note:note}).then(function(out){
        giveBusy=false; go.disabled=false;
        if(!out || !out.ok){ RT._shell.toast(t("parent.give.fail")); return; }
        ctl.close();
        RT._shell.toast(t("parent.give.done",{n:n}));
        fetchData(S.childId); /* обновить HUD очков */
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

  /* =================== сборка экрана =================== */
  function render(){
    var root=el(); if(!root) return;
    /* скрытый реордер карточек «По приложениям» (long-press → jiggle, как плитки ребёнка):
       вешается один раз (делегирование переживает innerHTML), порядок — личный, на аккаунт
       родителя (RT._shell.applyTileOrder → accounts.php op tile_order) */
    if(!root.__jgl && RT._shell && RT._shell.makeJiggle){
      root.__jgl=RT._shell.makeJiggle(root,{ items:".pd-mcard", onCommit:function(ids){ RT._shell.applyTileOrder(ids); } });
    }
    if(root.__jgl) root.__jgl.exit(); // перерисовка сбрасывает режим перестановки
    renderTabs();
    if(S.loading){
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
      root.innerHTML='<div class="pd-wrap">'+topbarNoChild()
        +'<div class="pd-empty" style="padding-top:40px"><b style="display:block;font-size:16px;color:#fff;margin-bottom:8px">'+esc(t("parent.noChild.h"))+'</b>'
        +esc(t("parent.noChild.p"))+'</div>'
        +'<div style="text-align:center;margin-top:14px"><button class="btn btn-primary" id="pdSet" style="max-width:260px;margin:0 auto">'+esc(t("parent.noChild.btn"))+'</button></div></div>';
      var sb=root.querySelector("#pdSet"); if(sb) sb.onclick=function(){ if(RT._shell.openSettings) RT._shell.openSettings(); };
      var g2=root.querySelector("#pdGear2"); if(g2) g2.onclick=function(){ if(RT._shell.openSettings) RT._shell.openSettings(); };
      return;
    }
    if(!S.data){ root.innerHTML=""; return; }
    var head, body;
    if(S.mod){ head=modHeadHtml(S.mod); body=moduleHtml(S.mod); }
    else {
      head=topbarHtml();
      body= S.tab==="overview" ? overviewHtml() : (S.tab==="wishlist" ? wishlistHtml() : journalHtml());
    }
    root.innerHTML='<div class="pd-wrap">'+head+'<div class="pd-body">'+body+'</div></div>';
    wire(root);
  }
  function topbarNoChild(){
    return '<div class="pd-top"><span class="pd-badge">👁 '+esc(t("parent.badge"))+'</span>'
      +'<button class="hbtn" id="pdGear2" aria-label="'+esc(t("settings.open"))+'" style="margin-left:auto">⚙</button></div>';
  }
  function wire(root){
    var back=root.querySelector("#pdBack");
    if(back) back.onclick=function(){ S.mod=null; render(); window.scrollTo(0,0); };
    var oj=root.querySelector("#pdOpenJournal");
    if(oj) oj.onclick=function(){ S.jfilter=S.mod; S.mod=null; S.tab="journal"; S.jshown=PAGE; render(); window.scrollTo(0,0); };
    var wa=root.querySelector("#pdWalkAdd");
    if(wa) wa.onclick=function(){ if(RT.open) RT.open("walk"); };
    var gv=root.querySelector("#pdGive");
    if(gv) gv.onclick=openGive;
    var g=root.querySelector("#pdGear");
    if(g) g.onclick=function(){ if(RT._shell.openSettings) RT._shell.openSettings(); };
    var rf=root.querySelector("#pdRefresh"); if(rf) rf.onclick=function(){ fetchData(S.childId); };
    var kid=root.querySelector("#pdKid"); if(kid&&!kid.disabled) kid.onclick=openChildSwitch;
    var per=root.querySelector("#pdPeriod");
    if(per) Array.prototype.forEach.call(per.querySelectorAll("[data-p]"),function(b){
      b.onclick=function(){ S.period=parseInt(b.getAttribute("data-p"),10)||7; render(); };
    });
    Array.prototype.forEach.call(root.querySelectorAll(".pd-mcard"),function(b){
      b.onclick=function(){
        var id=b.getAttribute("data-mod");
        if(id==="bank"){ if(RT.open) RT.open("bank"); return; } /* модуль с заданиями, как walk */
        if(id==="wishlist"){ S.tab="wishlist"; render(); }
        else { S.mod=id; render(); }
        window.scrollTo(0,0);
      };
    });
    var ws=root.querySelector("#pdWseg");
    if(ws) Array.prototype.forEach.call(ws.querySelectorAll("[data-s]"),function(b){
      b.onclick=function(){ S.wseg=b.getAttribute("data-s"); render(); };
    });
    Array.prototype.forEach.call(root.querySelectorAll(".pd-wcard"),function(b){
      b.onclick=function(){ openDetail(b.getAttribute("data-w")); };
    });
    var jf=root.querySelector("#pdJf");
    if(jf) Array.prototype.forEach.call(jf.querySelectorAll("[data-f]"),function(b){
      b.onclick=function(){ S.jfilter=b.getAttribute("data-f"); S.jshown=PAGE; render(); window.scrollTo(0,0); };
    });
    Array.prototype.forEach.call(root.querySelectorAll("button.pd-ev"),function(b){
      b.onclick=function(){ openDetail(b.getAttribute("data-w")); };
    });
    var mr=root.querySelector("#pdMore"); if(mr) mr.onclick=moreJournal;
  }

  /* таббар: делегированный клик вешается один раз (элемент живёт в <body>) */
  function wireTabs(){
    var bar=tabsEl(); if(!bar||bar.__pdWired) return;
    bar.__pdWired=true;
    bar.addEventListener("click",function(e){
      var b=e.target.closest("[data-tab]"); if(!b) return;
      S.mod=null; S.tab=b.getAttribute("data-tab"); S.jshown=PAGE;
      render(); window.scrollTo(0,0);
    });
  }

  /* =================== данные =================== */
  function fetchData(childId){
    S.loading=true; S.error=false; render();
    var url="parent.php?days=30"+(childId?("&child="+encodeURIComponent(childId)):"");
    RT.API.get(url).then(function(r){
      S.loading=false;
      if(!(r&&r.ok)){ S.error=true; render(); return; }
      if(r.events&&r.events.sort) r.events.sort(function(a,b){ return b.at-a.at; }); // не полагаемся на порядок сервера
      S.data=r; S.childId=r.child?r.child.id:null;
      saveChild(S.childId); /* помним выбор между перезагрузками */
      S.jshown=PAGE;
      render();
    }).catch(function(err){
      /* сохранённый/запрошенный ребёнок недоступен → сброс и откат на первого */
      if(childId && err && /^http 403/.test(err.message||"")){ saveChild(null); fetchData(null); return; }
      S.loading=false; S.error=true; render();
    });
  }

  window.addEventListener("scroll", onScroll, {passive:true});

  /* =================== публичный интерфейс =================== */
  RT.Parent={
    /* показать дашборд (вызывает shell.showParent после переключения вида) */
    show: function(){
      wireTabs();
      if(!S.data && !S.loading) fetchData(savedChild());
      else render();
    },
    render: render,
    refresh: function(){ fetchData(S.childId); },
    moreJournal: moreJournal,
    active: active
  };
})(window.RobTop);
