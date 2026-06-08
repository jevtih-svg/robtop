/* RobTop — модуль «Прогулка» (walk). Быстрая фиксация прогулки с собакой за 5–10 секунд:
   длительность (пресеты 10–60 мин или своя с цифровой клавиатуры) → оценка тремя смайликами
   (плохо/средне/хорошо, позитив всегда справа) либо «Позже» (сразу сохранить и выйти) →
   необязательные детали: отработанные команды (быстрые — с предыдущей прогулки), «Непослушание»
   (только в режиме «Щенок»), несколько фото. Запись «Позже» можно дооценить из истории.
   Очки: +meta.reward (настройка родителя в шторке настроек, деф. 10, 0 = выкл) за КАЖДУЮ
   созданную прогулку, reason walk_done, kind win (винстрик не трогает) — см. ГАЙД-очки.md.
   Данные — generic-стор: walk/entries (прогулки), walk/commands и walk/issues (свои варианты
   семьи), walk/meta (одна строка: {puppy, reward}). Родитель пишет в общий семейный пул
   (data.php скоупит роль parent на ребёнка семьи), автор записи — в data.author. */
(function(){
  "use strict";

  /* =================== ЛОКАЛИЗАЦИЯ (en/ru/lv) =================== */
  var MESSAGES={
    en:{ walk:{
      subtitle:"Family dog walks — everyone logs, everyone sees",
      hudLeft:"Dog <b>walk</b>", hudCLbl:"walks", hudRLbl:"minutes",
      durTitle:"How long was the walk?", durMin:"{n} min", durOther:"Other",
      numTitle:"How many minutes?",
      rateTitle:"How was the walk?", rateLater:"Later",
      rnames:{ sad:"Bad", mid:"Okay", happy:"Good" },
      dtTitle:"Walk details", dtHint:"Everything here is optional",
      timeLbl:"Walk time",
      behBtn:"Behaviour problem", behTitle:"What happened?", behWhen:"When did it happen?",
      behSavedToast:"Noted!", behNeedPick:"Pick what happened first",
      evtBtn:"Important event", evtTitle:"What kind of event?", evtWhen:"When?",
      evtNote:"Note", evtNotePh:"e.g. nails trimmed",
      evtSavedToast:"Event saved!", evtNeedPick:"Pick the event type first",
      addEvt:"My type", ownEvtTitle:"New event type",
      evt:{ vet:"Vet visit", birthday:"Birthday", vaccine:"Vaccination", groom:"Grooming" },
      cmdTitle:"Which commands did you practice today?",
      issTitle:"Any behaviour problems today?",
      addCmd:"My command", addIss:"My option",
      ownCmdTitle:"New command", ownIssTitle:"New option", ownPh:"Type a name…",
      dupToast:"Already in the list",
      photoTitle:"Photos", addPhoto:"Add photo", photoFailed:"Couldn't upload photo",
      photoRemoveTitle:"Remove this photo?",
      saveWalk:"Save walk",
      savedToast:"Walk saved!", laterToast:"Walk saved — rate it later!",
      saveFailed:"Couldn't save",
      historyTitle:"My walks", historyEmpty:"No walks yet. Tap the minutes above!",
      noRate:"Not rated yet", rateBtn:"Rate it",
      byAuthor:"Logged by {name}",
      setTitle:"Walk settings",
      puppyLbl:"Puppy mode", puppyHint:"Show the behaviour section",
      rewardLbl:"Points per walk", rewardHint:"0 — no points",
      cmd:{ stop:"Stop", heel:"Heel", come:"Come", sit:"Sit", stand:"Stand", down:"Down", here:"Here", wait:"Wait / stay", no:"No", noPull:"Don't pull", go:"Let's go" },
      iss:{ toilet:"Had an accident at home", floor:"Ate from the floor", leash:"Pulled off the leash", ignore:"Ignored commands" },
      aria:{ settings:"Walk settings", photo:"Photo", del:"Remove" }
    }, bank:{ r_walk_done:"Dog walk" }},
    ru:{ walk:{
      subtitle:"Семейные прогулки с собакой — пишут все, видят все",
      hudLeft:"Прогулка <b>с собакой</b>", hudCLbl:"прогулок", hudRLbl:"минут",
      durTitle:"Сколько гуляли?", durMin:"{n} мин", durOther:"Другое",
      numTitle:"Сколько минут?",
      rateTitle:"Как прошла прогулка?", rateLater:"Позже",
      rnames:{ sad:"Плохо", mid:"Средне", happy:"Хорошо" },
      dtTitle:"Детали прогулки", dtHint:"Здесь всё необязательно",
      timeLbl:"Время прогулки",
      behBtn:"Проблема с поведением", behTitle:"Что случилось?", behWhen:"Когда это случилось?",
      behSavedToast:"Записано!", behNeedPick:"Сначала выбери, что случилось",
      evtBtn:"Важное событие", evtTitle:"Какое событие?", evtWhen:"Когда?",
      evtNote:"Заметка", evtNotePh:"например: подстригли когти",
      evtSavedToast:"Событие записано!", evtNeedPick:"Сначала выбери тип события",
      addEvt:"Свой тип", ownEvtTitle:"Новый тип события",
      evt:{ vet:"Ветеринар", birthday:"День рождения", vaccine:"Прививка", groom:"Стрижка / груминг" },
      cmdTitle:"Какие команды сегодня отрабатывали?",
      issTitle:"Были ли сегодня проблемы с поведением?",
      addCmd:"Своя команда", addIss:"Свой вариант",
      ownCmdTitle:"Новая команда", ownIssTitle:"Новый вариант", ownPh:"Напиши название…",
      dupToast:"Такая уже есть",
      photoTitle:"Фотографии", addPhoto:"Добавить фото", photoFailed:"Не удалось загрузить фото",
      photoRemoveTitle:"Убрать это фото?",
      saveWalk:"Сохранить прогулку",
      savedToast:"Прогулка сохранена!", laterToast:"Прогулка сохранена — оценишь позже!",
      saveFailed:"Не удалось сохранить",
      historyTitle:"Мои прогулки", historyEmpty:"Прогулок пока нет. Нажми на минуты сверху!",
      noRate:"Пока без оценки", rateBtn:"Оценить",
      byAuthor:"Записал(а): {name}",
      setTitle:"Настройки прогулки",
      puppyLbl:"Режим «Щенок»", puppyHint:"Показывать раздел про поведение",
      rewardLbl:"Очков за прогулку", rewardHint:"0 — без очков",
      cmd:{ stop:"Стоп", heel:"Рядом", come:"Ко мне", sit:"Сидеть", stand:"Стоять", down:"Лежать", here:"Сюда", wait:"Жди / стой", no:"Нельзя", noPull:"Не тяни", go:"Пошли" },
      iss:{ toilet:"Сходила дома в туалет", floor:"Кушала с пола", leash:"Вырывалась с поводка", ignore:"Не прибегала на команды" },
      aria:{ settings:"Настройки прогулки", photo:"Фото", del:"Убрать" }
    }, bank:{ r_walk_done:"Прогулка с собакой" }},
    lv:{ walk:{
      subtitle:"Ģimenes pastaigas ar suni — raksta visi, redz visi",
      hudLeft:"Pastaiga <b>ar suni</b>", hudCLbl:"pastaigas", hudRLbl:"minūtes",
      durTitle:"Cik ilgi pastaigājāties?", durMin:"{n} min", durOther:"Cits",
      numTitle:"Cik minūtes?",
      rateTitle:"Kā gāja pastaigā?", rateLater:"Vēlāk",
      rnames:{ sad:"Slikti", mid:"Viduvēji", happy:"Labi" },
      dtTitle:"Pastaigas detaļas", dtHint:"Šeit viss nav obligāts",
      timeLbl:"Pastaigas laiks",
      behBtn:"Uzvedības problēma", behTitle:"Kas notika?", behWhen:"Kad tas notika?",
      behSavedToast:"Pierakstīts!", behNeedPick:"Vispirms izvēlies, kas notika",
      evtBtn:"Svarīgs notikums", evtTitle:"Kāds notikums?", evtWhen:"Kad?",
      evtNote:"Piezīme", evtNotePh:"piemēram: apgrieza nagus",
      evtSavedToast:"Notikums pierakstīts!", evtNeedPick:"Vispirms izvēlies notikuma veidu",
      addEvt:"Mans veids", ownEvtTitle:"Jauns notikuma veids",
      evt:{ vet:"Veterinārārsts", birthday:"Dzimšanas diena", vaccine:"Vakcinācija", groom:"Frizūra / kopšana" },
      cmdTitle:"Kuras komandas šodien trenējāt?",
      issTitle:"Vai šodien bija problēmas ar uzvedību?",
      addCmd:"Mana komanda", addIss:"Mans variants",
      ownCmdTitle:"Jauna komanda", ownIssTitle:"Jauns variants", ownPh:"Ieraksti nosaukumu…",
      dupToast:"Tāds jau ir sarakstā",
      photoTitle:"Fotogrāfijas", addPhoto:"Pievienot foto", photoFailed:"Neizdevās augšupielādēt foto",
      photoRemoveTitle:"Noņemt šo foto?",
      saveWalk:"Saglabāt pastaigu",
      savedToast:"Pastaiga saglabāta!", laterToast:"Pastaiga saglabāta — novērtēsi vēlāk!",
      saveFailed:"Neizdevās saglabāt",
      historyTitle:"Manas pastaigas", historyEmpty:"Pastaigu vēl nav. Pieskaries minūtēm augšā!",
      noRate:"Vēl nav novērtēta", rateBtn:"Novērtēt",
      byAuthor:"Pierakstīja: {name}",
      setTitle:"Pastaigas iestatījumi",
      puppyLbl:"Kucēna režīms", puppyHint:"Rādīt uzvedības sadaļu",
      rewardLbl:"Punkti par pastaigu", rewardHint:"0 — bez punktiem",
      cmd:{ stop:"Stop", heel:"Blakus", come:"Pie manis", sit:"Sēdi", stand:"Stāvi", down:"Guli", here:"Šeit", wait:"Gaidi", no:"Nedrīkst", noPull:"Nevelc", go:"Ejam" },
      iss:{ toilet:"Notika negadījums mājās", floor:"Ēda no grīdas", leash:"Rāvās no pavadas", ignore:"Neklausīja komandām" },
      aria:{ settings:"Pastaigas iestatījumi", photo:"Foto", del:"Noņemt" }
    }, bank:{ r_walk_done:"Pastaiga ar suni" }}
  };

  /* =================== константы =================== */
  var DUR=[10,20,30,40,50,60];
  var RATE_KEYS=["sad","mid","happy"];           // слева направо; позитив ВСЕГДА справа (спека)
  var SYS_CMD=["stop","heel","come","sit","stand","down","here","wait","no","noPull","go"];
  var SYS_ISS=["toilet","floor","leash","ignore"];
  var SYS_EVT=["vet","birthday","vaccine","groom"]; // важные события: ветеринар, ДР, прививка, груминг
  var PHOTO_MAX=10, REWARD_DEF=10, REWARD_STEP=5, REWARD_MAX=100;

  var BACK_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
  var GEAR_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 13.2a7.6 7.6 0 0 0 0-2.4l2-1.5-2-3.5-2.4.8a7.6 7.6 0 0 0-2-1.2L14.5 3h-5l-.5 2.4a7.6 7.6 0 0 0-2 1.2l-2.4-.8-2 3.5 2 1.5a7.6 7.6 0 0 0 0 2.4l-2 1.5 2 3.5 2.4-.8a7.6 7.6 0 0 0 2 1.2l.5 2.4h5l.5-2.4a7.6 7.6 0 0 0 2-1.2l2.4.8 2-3.5z"/></svg>';
  var CAM_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2L9 4.8h6L16.5 7h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="13" r="3.4"/></svg>';
  var PAW_IC='<svg viewBox="0 0 24 24" fill="currentColor"><ellipse cx="6.4" cy="10" rx="1.7" ry="2.3"/><ellipse cx="9.9" cy="7.3" rx="1.7" ry="2.4"/><ellipse cx="14.1" cy="7.3" rx="1.7" ry="2.4"/><ellipse cx="17.6" cy="10" rx="1.7" ry="2.3"/><path d="M12 11.2c2.9 0 5.3 2.1 5.7 4.8.3 1.9-1.1 3.4-3 3.4-1.3 0-1.9-.6-2.7-.6s-1.4.6-2.7.6c-1.9 0-3.3-1.5-3-3.4.4-2.7 2.8-4.8 5.7-4.8z"/></svg>';
  var WARN_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4.2L21 19.4H3z"/><path d="M12 10v4.4"/><circle cx="12" cy="16.9" r=".4" fill="currentColor" stroke="none"/></svg>';
  var STAR_IC='<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l2.7 5.7 6.3.8-4.6 4.4 1.2 6.2L12 17.8 6.4 20.1l1.2-6.2L3 9.5l6.3-.8z"/></svg>';

  /* три смайлика в стиле mood; цвет — в CSS по классу f-<key> */
  function faceSvg(mouth){
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">'
      +'<circle cx="12" cy="12" r="9"/>'
      +'<circle cx="9" cy="10.2" r="1.05" fill="currentColor" stroke="none"/>'
      +'<circle cx="15" cy="10.2" r="1.05" fill="currentColor" stroke="none"/>'
      +mouth+'</svg>';
  }
  var FACE={
    happy: faceSvg('<path d="M8.4 14.2a4.4 4.4 0 0 0 7.2 0" stroke-linecap="round"/>'),
    mid:   faceSvg('<path d="M8.8 15.2h6.4" stroke-linecap="round"/>'),
    sad:   faceSvg('<path d="M8.4 16.8a4.4 4.4 0 0 1 7.2 0" stroke-linecap="round"/>'),
    none:  faceSvg('<path d="M9.2 15.4h.01M12 15.4h.01M14.8 15.4h.01" stroke-linecap="round" stroke-width="2.2"/>')
  };

  /* =================== состояние =================== */
  var sdk=null, root=null, E={};
  var entries=[], behs=[], evts=[], cmds=[], iss=[], evtTypes=[], meta={id:null,puppy:1,reward:REWARD_DEF};
  var step="dur", cur=null, beh=null, ev=null, saving=false;

  function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];}); }
  function t(k,p){ return sdk.t(k,p); }
  function pad2(n){ return (n<10?"0":"")+n; }
  function dayKey(d){ d=d||new Date(); return d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate()); }
  function hhmm(d){ d=d||new Date(); return pad2(d.getHours())+":"+pad2(d.getMinutes()); }
  /* округление времени до БЛИЖАЙШИХ 15 минут (требование Джеффа): 08:37→08:30, 08:38→08:45, 23:55→23:45 (без перехода суток) */
  function r15(hm){
    var m=/^(\d{2}):(\d{2})$/.exec(String(hm||"")); if(!m) return hm;
    var tot=Math.round((+m[1]*60 + +m[2])/15)*15;
    if(tot>=1440) tot=1425;
    return pad2(Math.floor(tot/60))+":"+pad2(tot%60);
  }
  function hhmm15(){ return r15(hhmm()); }
  function blankCur(){ return {duration:0, rating:null, sel:{}, selIss:{}, photos:[], time:hhmm15(), editId:null}; }
  /* активная карта выбора непослушания: экран отдельного события (beh) или детали прогулки */
  function issMap(){ return (step==="beh"&&beh) ? beh.sel : (cur?cur.selIss:{}); }
  function timeOf(sel){ // прочитать введённое время HH:MM из input (округляется к 15 мин), фолбэк — текущее
    var el=E.main&&E.main.querySelector(sel), v=el?String(el.value||""):"";
    return /^\d{2}:\d{2}$/.test(v) ? r15(v) : hhmm15();
  }
  function dateOf(sel){ // прочитать дату YYYY-MM-DD из input, фолбэк — сегодня
    var el=E.main&&E.main.querySelector(sel), v=el?String(el.value||""):"";
    return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : dayKey();
  }
  function dataOf(it){ return (it&&it.data)||{}; }
  function rateOf(it){ var r=dataOf(it).rating; return RATE_KEYS.indexOf(r)>=0?r:null; }

  /* =================== данные =================== */
  function load(){
    Promise.all([
      sdk.data.list("entries"), sdk.data.list("commands"), sdk.data.list("issues"), sdk.data.list("meta"),
      sdk.data.list("behavior"), sdk.data.list("events"), sdk.data.list("eventTypes")
    ]).then(function(rr){
      if(!root) return;
      entries=(rr[0]||[]).filter(function(it){ return dataOf(it).duration>0; });
      entries.sort(function(a,b){ return (b.createdAt||0)-(a.createdAt||0); });
      behs=(rr[4]||[]).filter(function(it){ return (dataOf(it).issues||[]).length>0; });
      behs.sort(function(a,b){ return (b.createdAt||0)-(a.createdAt||0); });
      evts=(rr[5]||[]).filter(function(it){ return (dataOf(it).kinds||[]).length>0; });
      evts.sort(function(a,b){ return (b.createdAt||0)-(a.createdAt||0); });
      evtTypes=(rr[6]||[]).slice().sort(function(a,b){ return (a.createdAt||0)-(b.createdAt||0); });
      cmds=(rr[1]||[]).slice().sort(function(a,b){ return (a.createdAt||0)-(b.createdAt||0); });
      iss=(rr[2]||[]).slice().sort(function(a,b){ return (a.createdAt||0)-(b.createdAt||0); });
      var m=(rr[3]||[])[0];
      if(m){ meta={ id:m.id,
        puppy: dataOf(m).puppy==null ? 1 : (dataOf(m).puppy?1:0),
        reward: clampReward(dataOf(m).reward) }; }
      renderMain(); renderList(); hud();
    }).catch(function(){ if(!root) return; renderMain(); renderList(); hud(); });
  }
  function clampReward(v){
    var n=parseInt(v,10); if(isNaN(n)) n=REWARD_DEF;
    return Math.min(Math.max(n,0), REWARD_MAX);
  }
  function metaSave(patch){
    var data={ puppy:meta.puppy, reward:meta.reward };
    Object.keys(patch||{}).forEach(function(k){ data[k]=patch[k]; });
    meta.puppy=data.puppy; meta.reward=data.reward;
    if(meta.id!=null) return sdk.data.update("meta", meta.id, data);
    return sdk.data.create("meta", data).then(function(item){ if(item) meta.id=item.id; });
  }

  function hud(){
    var min=0; entries.forEach(function(it){ min+=parseInt(dataOf(it).duration,10)||0; });
    sdk.ui.hud({ left:t("hudLeft"), cNum:entries.length, cLbl:t("hudCLbl"), rNum:min, rLbl:t("hudRLbl") });
  }

  /* =================== подписи команд/вариантов =================== */
  /* id в записи: "s_<key>" — системные (переводятся), "u_<rowId>" — пользовательские */
  function cmdLabel(id){
    if(/^s_/.test(id)) return t("cmd."+id.slice(2));
    for(var i=0;i<cmds.length;i++){ if("u_"+cmds[i].id===id) return dataOf(cmds[i]).label||"?"; }
    return "?";
  }
  function issLabel(id){
    if(/^s_/.test(id)) return t("iss."+id.slice(2));
    for(var i=0;i<iss.length;i++){ if("u_"+iss[i].id===id) return dataOf(iss[i]).label||"?"; }
    return "?";
  }
  function evtLabel(id){
    if(/^s_/.test(id)) return t("evt."+id.slice(2));
    for(var i=0;i<evtTypes.length;i++){ if("u_"+evtTypes[i].id===id) return dataOf(evtTypes[i]).label||"?"; }
    return "?";
  }
  /* типы важных событий: системные в каноническом порядке + свои (по времени создания) */
  function evtOrder(){
    var all=SYS_EVT.map(function(k){ return "s_"+k; });
    evtTypes.forEach(function(r){ all.push("u_"+r.id); });
    return all;
  }
  /* порядок чипов команд: команды ПРЕДЫДУЩЕЙ прогулки → системные → пользовательские */
  function cmdOrder(){
    var prev=[], i;
    for(i=0;i<entries.length;i++){
      var c=dataOf(entries[i]).commands;
      if(c && c.length && entries[i].id!==(cur&&cur.editId)){ prev=c.slice(); break; }
    }
    var out=prev.slice(), seen={};
    prev.forEach(function(id){ seen[id]=1; });
    SYS_CMD.forEach(function(k){ if(!seen["s_"+k]){ out.push("s_"+k); seen["s_"+k]=1; } });
    cmds.forEach(function(r){ var id="u_"+r.id; if(!seen[id]){ out.push(id); seen[id]=1; } });
    return out;
  }
  /* порядок чипов непослушания: по частоте в истории, потом системный порядок */
  function issOrder(){
    var freq={};
    entries.forEach(function(it){ (dataOf(it).issues||[]).forEach(function(id){ freq[id]=(freq[id]||0)+1; }); });
    var all=SYS_ISS.map(function(k){ return "s_"+k; });
    iss.forEach(function(r){ all.push("u_"+r.id); });
    var base={}; all.forEach(function(id,ix){ base[id]=ix; });
    all.sort(function(a,b){ return (freq[b]||0)-(freq[a]||0) || base[a]-base[b]; });
    return all;
  }

  /* =================== главная карточка (мастер) =================== */
  function renderMain(){
    if(!root||!E.main) return;
    if(!sdk.can("edit")){ E.main.innerHTML=""; return; }
    if(step==="dur") return renderDur();
    if(step==="rate") return renderRate();
    if(step==="beh") return renderBeh();
    if(step==="evt") return renderEvt();
    renderDetails();
  }
  function renderDur(){
    var h='<div class="wk-card"><h3 class="wk-card-title">'+esc(t("durTitle"))+'</h3><div class="wk-durs">';
    DUR.forEach(function(n){ h+='<button type="button" class="wk-dur" data-dur="'+n+'">'+esc(t("durMin",{n:n}))+'</button>'; });
    h+='<button type="button" class="wk-dur other" id="wkDurOther">'+esc(t("durOther"))+'</button></div></div>';
    /* отдельные записи — НЕ часть прогулки (фидбек Джеффа): важное событие (всегда)
       и проблема с поведением (только режим «Щенок») */
    h+='<button type="button" class="wk-evtbtn" id="wkEvtBtn"><span class="ic">'+STAR_IC+'</span>'+esc(t("evtBtn"))+'</button>';
    if(meta.puppy) h+='<button type="button" class="wk-behbtn" id="wkBehBtn"><span class="ic">'+WARN_IC+'</span>'+esc(t("behBtn"))+'</button>';
    E.main.innerHTML=h;
  }
  /* экран отдельного события поведения: чипы вариантов + время (шаг 15 мин) + сохранить */
  function renderBeh(){
    var h='<div class="wk-card warn"><h3 class="wk-card-title">'+esc(t("behTitle"))+'</h3>'
      +chipsHtml(issOrder(), beh.sel, "iss")
      +'<div class="wk-sect">'+esc(t("behWhen"))+'</div>'
      +'<input type="time" class="wk-time" id="wkBehTime" step="900" value="'+esc(beh.time)+'">'
      +'<div class="wk-actions"><button type="button" class="btn btn-cancel" id="wkBehCancel">'+esc(t("common.cancel"))+'</button>'
      +'<button type="button" class="btn btn-primary" id="wkBehSave">'+esc(t("common.save"))+'</button></div></div>';
    E.main.innerHTML=h;
  }
  /* экран ВАЖНОГО события (вет, день рождения, прививка, груминг + свои типы):
     чипы типов + дата + время (шаг 15 мин) + заметка + сохранить */
  function renderEvt(){
    var h='<div class="wk-card gold"><h3 class="wk-card-title">'+esc(t("evtTitle"))+'</h3>'
      +chipsHtml(evtOrder(), ev.sel, "evt")
      +'<div class="wk-sect">'+esc(t("evtWhen"))+'</div>'
      +'<div class="wk-when">'
      +'<input type="date" class="wk-time" id="wkEvtDate" value="'+esc(ev.day)+'">'
      +'<input type="time" class="wk-time" id="wkEvtTime" step="900" value="'+esc(ev.time)+'">'
      +'</div>'
      +'<div class="wk-sect">'+esc(t("evtNote"))+'</div>'
      +'<input type="text" class="wk-note" id="wkEvtNote" maxlength="120" placeholder="'+esc(t("evtNotePh"))+'" value="'+esc(ev.note||"")+'">'
      +'<div class="wk-actions"><button type="button" class="btn btn-cancel" id="wkEvtCancel">'+esc(t("common.cancel"))+'</button>'
      +'<button type="button" class="btn btn-primary" id="wkEvtSave">'+esc(t("common.save"))+'</button></div></div>';
    E.main.innerHTML=h;
  }
  function facesHtml(extra){
    var h='<div class="wk-faces'+(extra?" "+extra:"")+'">';
    RATE_KEYS.forEach(function(key){
      var on=cur&&cur.rating===key;
      h+='<button type="button" class="wk-face f-'+key+(on?" on":"")+'" data-rate="'+key+'" aria-label="'+esc(t("rnames."+key))+'">'
        +FACE[key]+'<span class="nm">'+esc(t("rnames."+key))+'</span></button>';
    });
    return h+'</div>';
  }
  function renderRate(){
    E.main.innerHTML='<div class="wk-card"><h3 class="wk-card-title">'+esc(t("rateTitle"))+'</h3>'
      +facesHtml()
      +(cur&&cur.editId?'':'<div class="wk-later"><button type="button" class="btn btn-cancel" id="wkLater">'+esc(t("rateLater"))+'</button></div>')
      +'</div>';
  }
  function chipsHtml(order, selMap, kind){
    var cls=kind==="iss"?" warn":(kind==="evt"?" gold":"");
    var addId=kind==="cmd"?"wkAddCmd":(kind==="iss"?"wkAddIss":"wkAddEvt");
    var addLbl=kind==="cmd"?t("addCmd"):(kind==="iss"?t("addIss"):t("addEvt"));
    var h='<div class="wk-chips">';
    order.forEach(function(id){
      var lbl=kind==="cmd"?cmdLabel(id):(kind==="iss"?issLabel(id):evtLabel(id));
      h+='<button type="button" class="wk-chip'+cls+(selMap[id]?" on":"")+'" data-'+kind+'="'+esc(id)+'">'+esc(lbl)+'</button>';
    });
    h+='<button type="button" class="wk-chip add" id="'+addId+'">＋ '+esc(addLbl)+'</button></div>';
    return h;
  }
  function photosHtml(){
    var h='<div class="wk-photos">';
    cur.photos.forEach(function(src,ix){
      h+='<button type="button" class="wk-ph" data-ph="'+ix+'" aria-label="'+esc(t("aria.del"))+'" style="background-image:url(\''+esc(src)+'\')"><span>✕</span></button>';
    });
    if(cur.photos.length<PHOTO_MAX)
      h+='<button type="button" class="wk-ph addp" id="wkAddPhoto" aria-label="'+esc(t("addPhoto"))+'"><span class="pic">'+CAM_IC+'</span><span>'+esc(t("addPhoto"))+'</span></button>';
    return h+'</div>';
  }
  function renderDetails(){
    var h='<div class="wk-card"><h3 class="wk-card-title">'+esc(t("dtTitle"))+'</h3>'
      +'<p class="wk-hint">'+esc(t("dtHint"))+'</p>'
      +facesHtml("mini")
      +'<div class="wk-sect">'+esc(t("timeLbl"))+'</div>'
      +'<input type="time" class="wk-time" id="wkTime" step="900" value="'+esc(cur.time)+'">'
      +'<div class="wk-sect">'+esc(t("cmdTitle"))+'</div>'+chipsHtml(cmdOrder(), cur.sel, "cmd");
    if(meta.puppy) h+='<div class="wk-sect">'+esc(t("issTitle"))+'</div>'+chipsHtml(issOrder(), cur.selIss, "iss");
    h+='<div class="wk-sect">'+esc(t("photoTitle"))+'</div>'+photosHtml()
      +'<input type="file" id="wkPhotoInput" accept="image/*" multiple style="display:none">'
      +'<div class="wk-actions"><button type="button" class="btn btn-primary" id="wkSave">'+esc(t("saveWalk"))+'</button></div>'
      +'</div>';
    E.main.innerHTML=h;
    E.photoInput=E.main.querySelector("#wkPhotoInput");
    E.photoInput.addEventListener("change",function(e){
      var fl=e.target.files, i; for(i=0;i<fl.length;i++) handleFile(fl[i]);
      E.photoInput.value="";
    });
  }
  function updateFaces(){
    if(!E.main) return;
    var btns=E.main.querySelectorAll(".wk-faces [data-rate]");
    for(var i=0;i<btns.length;i++) btns[i].classList.toggle("on", btns[i].getAttribute("data-rate")===(cur&&cur.rating));
  }
  function refreshPhotos(){
    if(!E.main) return;
    var box=E.main.querySelector(".wk-photos");
    if(box){ var nb=document.createElement("div"); nb.innerHTML=photosHtml(); box.replaceWith(nb.firstChild); }
  }

  /* =================== фото (сжатие + демо dataUrl / сервер upload) =================== */
  function handleFile(file){
    if(!file || cur.photos.length>=PHOTO_MAX) return;
    var reader=new FileReader();
    reader.onload=function(ev){
      var img=new Image();
      img.onload=function(){
        var max=900,w=img.width,h=img.height;
        if(w>h&&w>max){ h=Math.round(h*max/w); w=max; } else if(h>=w&&h>max){ w=Math.round(w*max/h); h=max; }
        var dataUrl;
        try{ var cv=document.createElement("canvas"); cv.width=w; cv.height=h; cv.getContext("2d").drawImage(img,0,0,w,h); dataUrl=cv.toDataURL("image/jpeg",0.82); }
        catch(e){ dataUrl=ev.target.result; }
        addPhoto(dataUrl);
      };
      img.onerror=function(){ addPhoto(ev.target.result); };
      img.src=ev.target.result;
    };
    reader.readAsDataURL(file);
  }
  function addPhoto(dataUrl){
    if(cur.photos.length>=PHOTO_MAX) return;
    if(sdk.isDemo()){ cur.photos.push(dataUrl); refreshPhotos(); return; }
    var ix=cur.photos.push(dataUrl)-1; refreshPhotos();
    sdk.media.upload(dataUrl,"walk").then(function(res){
      if(res&&res.path){ cur.photos[ix]=res.path; refreshPhotos(); }
      else { cur.photos.splice(ix,1); refreshPhotos(); sdk.ui.toast(t("photoFailed")); }
    }).catch(function(){ cur.photos.splice(ix,1); refreshPhotos(); sdk.ui.toast(t("photoFailed")); });
  }

  /* =================== цифровая клавиатура «Другое» =================== */
  function openNumpad(){
    var val="";
    var node=document.createElement("div"); node.className="wk-numpad";
    function keys(){
      var h='<h2>'+esc(t("numTitle"))+'</h2><div class="wk-num-disp" id="wkNumDisp">–</div><div class="wk-num-grid">';
      [1,2,3,4,5,6,7,8,9].forEach(function(n){ h+='<button type="button" class="wk-num" data-n="'+n+'">'+n+'</button>'; });
      h+='<button type="button" class="wk-num bs" data-bs="1">⌫</button>'
        +'<button type="button" class="wk-num" data-n="0">0</button>'
        +'<button type="button" class="wk-num ok" data-ok="1">OK</button></div>';
      return h;
    }
    node.innerHTML=keys();
    var sh=sdk.ui.sheet(node);
    var disp=node.querySelector("#wkNumDisp");
    function show(){ disp.textContent = val==="" ? "–" : t("durMin",{n:val}); }
    node.addEventListener("click",function(e){
      var k=e.target.closest(".wk-num"); if(!k) return;
      if(k.getAttribute("data-bs")){ val=val.slice(0,-1); show(); return; }
      if(k.getAttribute("data-ok")){
        var n=parseInt(val,10);
        if(n>=1){ sh.close(); pickDur(n); }
        return;
      }
      if(val.length<3){ val+=k.getAttribute("data-n"); if(val==="0") val=""; show(); }
      sdk.ui.haptics(4);
    });
  }

  /* =================== сценарий =================== */
  function pickDur(n){
    cur=blankCur(); cur.duration=n;
    step="rate"; sdk.ui.haptics(8); renderMain();
  }
  function pickRate(key){
    if(!cur) return;
    cur.rating=key; sdk.ui.haptics(8);
    if(step==="rate"){ step="details"; renderMain(); }
    else updateFaces();
  }
  function selectedOf(map, order){ return order.filter(function(id){ return !!map[id]; }); }

  /* важное событие (вет, ДР, прививка, груминг, свои): сохранение; очков нет */
  function saveEvt(){
    if(!ev||saving) return;
    var kinds=selectedOf(ev.sel, evtOrder());
    if(!kinds.length){ sdk.ui.toast(t("evtNeedPick")); return; }
    saving=true;
    var noteEl=E.main&&E.main.querySelector("#wkEvtNote");
    var payload={ day:dateOf("#wkEvtDate"), time:timeOf("#wkEvtTime"), kinds:kinds,
      note:(noteEl?noteEl.value:"").trim().slice(0,120), author:(sdk.user&&sdk.user.name)||"" };
    sdk.data.create("events",payload).then(function(item){
      saving=false; if(!root) return;
      if(item) evts.unshift(item);
      sdk.events.track("walk_event",{kinds:kinds.length, hasNote:!!payload.note, day:payload.day});
      sdk.ui.haptics(10);
      ev=null; step="dur";
      sdk.ui.toast(t("evtSavedToast"));
      renderMain(); renderList();
    }).catch(function(){ saving=false; sdk.ui.toast(t("saveFailed")); });
  }

  /* отдельное событие поведения: сохранение (очков нет — это не «задание», просто факт для родителя) */
  function saveBeh(){
    if(!beh||saving) return;
    var issues=selectedOf(beh.sel, issOrder());
    if(!issues.length){ sdk.ui.toast(t("behNeedPick")); return; }
    saving=true;
    var payload={ day:dayKey(), time:timeOf("#wkBehTime"), issues:issues, author:(sdk.user&&sdk.user.name)||"" };
    sdk.data.create("behavior",payload).then(function(item){
      saving=false; if(!root) return;
      if(item) behs.unshift(item);
      sdk.events.track("walk_behavior",{issues:issues.length, time:payload.time});
      sdk.ui.haptics(10);
      beh=null; step="dur";
      sdk.ui.toast(t("behSavedToast"));
      renderMain(); renderList();
    }).catch(function(){ saving=false; sdk.ui.toast(t("saveFailed")); });
  }

  function saveLater(){
    if(!cur||saving) return; saving=true;
    var payload=entryPayload(null);
    sdk.data.create("entries",payload).then(function(item){
      saving=false; if(!root) return;
      afterCreate(item,payload,true);
      sdk.ui.back(); // спека: «Позже» → прогулка сохранена, возврат на главный экран
    }).catch(function(){ saving=false; sdk.ui.toast(t("saveFailed")); });
  }
  function save(){
    if(!cur||saving) return; saving=true;
    var commands=selectedOf(cur.sel, cmdOrder()), issues=meta.puppy?selectedOf(cur.selIss, issOrder()):[];
    cur.time=timeOf("#wkTime"); // время прогулки с экрана деталей (деф. — текущее)
    if(cur.editId!=null){ // дооценка записи «Позже»: очки НЕ начисляются повторно
      var patch={ rating:cur.rating, commands:commands, issues:issues, photos:cur.photos.slice(), time:cur.time };
      sdk.data.update("entries", cur.editId, patch).then(function(){
        saving=false; if(!root) return;
        for(var i=0;i<entries.length;i++){ if(String(entries[i].id)===String(cur.editId)){ entries[i].data=Object.assign({},entries[i].data,patch); break; } }
        sdk.events.track("walk_rated",{rating:cur.rating, commands:commands.length, issues:issues.length, photos:cur.photos.length});
        celebrate(cur.rating); resetToStart(t("savedToast"));
      }).catch(function(){ saving=false; sdk.ui.toast(t("saveFailed")); });
      return;
    }
    var payload=entryPayload({commands:commands, issues:issues});
    sdk.data.create("entries",payload).then(function(item){
      saving=false; if(!root) return;
      afterCreate(item,payload,false);
      celebrate(payload.rating); resetToStart(t("savedToast"));
    }).catch(function(){ saving=false; sdk.ui.toast(t("saveFailed")); });
  }
  function entryPayload(extra){
    var p={ day:dayKey(), time:cur.time||hhmm(), duration:cur.duration, rating:cur.rating,
      commands:(extra&&extra.commands)||[], issues:(extra&&extra.issues)||[],
      photos:cur.photos.slice(), author:(sdk.user&&sdk.user.name)||"" };
    return p;
  }
  function afterCreate(item,payload,later){
    if(item) entries.unshift(item);
    sdk.events.track("walk_saved",{ duration:payload.duration, rating:payload.rating,
      commands:payload.commands.length, issues:payload.issues.length, photos:payload.photos.length, later:!!later });
    if(meta.reward>0) sdk.points.add(meta.reward,"walk_done"); // kind win; винстрик не трогает (ГАЙД-очки.md)
    if(later) sdk.ui.toast(t("laterToast"));
  }
  function celebrate(rating){
    sdk.ui.haptics(10);
    if(rating==="happy"){ sdk.ui.confetti(); sdk.ui.chime(); }
  }
  function resetToStart(msg){
    cur=null; step="dur";
    if(msg) sdk.ui.toast(msg);
    renderMain(); renderList(); hud();
  }

  /* =================== свои команды / варианты =================== */
  function openOwn(kind){
    var node=document.createElement("div");
    node.innerHTML='<h2>'+esc(kind==="cmd"?t("ownCmdTitle"):(kind==="iss"?t("ownIssTitle"):t("ownEvtTitle")))+'</h2>'
      +'<div class="field"><input type="text" id="wkOwnInput" maxlength="40" placeholder="'+esc(t("ownPh"))+'"></div>'
      +'<div class="sheet-actions"><button class="btn btn-cancel" data-close>'+esc(t("common.cancel"))+'</button>'
      +'<button class="btn btn-primary" id="wkOwnSave">'+esc(t("common.save"))+'</button></div>';
    var sh=sdk.ui.sheet(node);
    node.querySelector("[data-close]").addEventListener("click",sh.close);
    var inp=node.querySelector("#wkOwnInput");
    setTimeout(function(){ try{ inp.focus(); }catch(e){} },50);
    node.querySelector("#wkOwnSave").addEventListener("click",function(){
      var label=(inp.value||"").trim().slice(0,40);
      if(!label) return;
      var list=kind==="cmd"?cmds:(kind==="iss"?iss:evtTypes), lc=label.toLowerCase(), i;
      for(i=0;i<list.length;i++){ if((dataOf(list[i]).label||"").toLowerCase()===lc){ sdk.ui.toast(t("dupToast")); return; } }
      var sys=kind==="cmd"?SYS_CMD:(kind==="iss"?SYS_ISS:SYS_EVT), ns=kind==="cmd"?"cmd.":(kind==="iss"?"iss.":"evt.");
      for(i=0;i<sys.length;i++){ if(t(ns+sys[i]).toLowerCase()===lc){ sdk.ui.toast(t("dupToast")); return; } }
      var coll=kind==="cmd"?"commands":(kind==="iss"?"issues":"eventTypes");
      sdk.data.create(coll,{label:label}).then(function(item){
        if(!root||!item) return;
        if(kind==="cmd"){ cmds.push(item); if(cur) cur.sel["u_"+item.id]=1; }
        else if(kind==="iss"){ iss.push(item); issMap()["u_"+item.id]=1; } // активная карта: детали прогулки или отдельное событие
        else { evtTypes.push(item); if(ev) ev.sel["u_"+item.id]=1; }
        sdk.events.track(kind==="cmd"?"walk_cmd_added":(kind==="iss"?"walk_iss_added":"walk_evtype_added"),{label:label});
        sh.close(); renderMain();
      }).catch(function(){ sdk.ui.toast(t("saveFailed")); });
    });
  }

  /* =================== настройки (щенок + очки) =================== */
  function openSettings(){
    var isParent=sdk.role==="parent"||sdk.isDemo();
    var node=document.createElement("div");
    var h='<h2>'+esc(t("setTitle"))+'</h2>'
      +'<button type="button" class="wk-setrow" id="wkPuppy"><span class="tx">'+esc(t("puppyLbl"))
      +'<span class="hint">'+esc(t("puppyHint"))+'</span></span>'
      +'<span class="wk-tgl'+(meta.puppy?" on":"")+'"></span></button>';
    if(isParent){
      h+='<div class="wk-setrow stat"><span class="tx">'+esc(t("rewardLbl"))
        +'<span class="hint">'+esc(t("rewardHint"))+'</span></span>'
        +'<span class="wk-step"><button type="button" class="wk-stepb" id="wkRewMinus">−</button>'
        +'<b id="wkRewVal">'+meta.reward+'</b>'
        +'<button type="button" class="wk-stepb" id="wkRewPlus">＋</button></span></div>';
    }
    h+='<div class="sheet-actions"><button class="btn btn-cancel" data-close style="flex:1">'+esc(t("common.close"))+'</button></div>';
    node.innerHTML=h;
    var sh=sdk.ui.sheet(node);
    node.querySelector("[data-close]").addEventListener("click",sh.close);
    node.querySelector("#wkPuppy").addEventListener("click",function(){
      var v=meta.puppy?0:1;
      metaSave({puppy:v}).then(function(){ if(!root) return; node.querySelector(".wk-tgl").classList.toggle("on",!!v); renderMain(); });
    });
    var minus=node.querySelector("#wkRewMinus"), plus=node.querySelector("#wkRewPlus"), val=node.querySelector("#wkRewVal");
    function bump(d){
      var v=clampReward(meta.reward+d);
      metaSave({reward:v}).then(function(){ if(val) val.textContent=String(v); });
    }
    if(minus) minus.addEventListener("click",function(){ bump(-REWARD_STEP); });
    if(plus) plus.addEventListener("click",function(){ bump(REWARD_STEP); });
  }

  /* =================== история =================== */
  function fmtDay(day){
    var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(day||"")); if(!m) return String(day||"");
    return sdk.formatDate(new Date(+m[1],+m[2]-1,+m[3],12,0,0), {weekday:"short", day:"numeric", month:"long"});
  }
  /* автор в строке истории: семейное приложение — видно, кто гулял/записал (фидбек Джеффа) */
  function authBit(d){ return d.author?esc(d.author):""; }
  function walkRowHtml(it){
    var d=dataOf(it), r=rateOf(it), ph=(d.photos&&d.photos[0])||null;
    var face=r?('<span class="wk-mini f-'+r+'">'+FACE[r]+'</span>'):('<span class="wk-mini f-none">'+FACE.none+'</span>');
    var thumb=ph?'<div class="wk-thumb" style="background-image:url(\''+esc(ph)+'\')"></div>'
      :'<div class="wk-thumb f-'+(r||"none")+'">'+(r?FACE[r]:FACE.none)+'</div>';
    var bits=[esc(t("durMin",{n:parseInt(d.duration,10)||0}))];
    if(r) bits.push(esc(t("rnames."+r))); else bits.push('<i>'+esc(t("noRate"))+'</i>');
    if(d.commands&&d.commands.length) bits.push(esc(String(d.commands.length))+" ✓");
    if(authBit(d)) bits.push(authBit(d));
    return '<div class="wk-row" data-id="'+esc(it.id)+'">'+thumb
      +'<div class="m"><div class="d">'+esc(fmtDay(d.day))+(d.time?' · '+esc(d.time):'')+'</div>'
      +'<div class="s">'+face+bits.join(" · ")+'</div></div></div>';
  }
  function behRowHtml(it){
    var d=dataOf(it), names=(d.issues||[]).map(issLabel);
    var txt=names.slice(0,2).join(", ")+(names.length>2?" +"+(names.length-2):"");
    if(authBit(d)) txt+=" · "+d.author;
    return '<div class="wk-row beh" data-bid="'+esc(it.id)+'"><div class="wk-thumb beh">'+WARN_IC+'</div>'
      +'<div class="m"><div class="d">'+esc(fmtDay(d.day))+(d.time?' · '+esc(d.time):'')+'</div>'
      +'<div class="s warn">'+esc(txt)+'</div></div></div>';
  }
  function evtRowHtml(it){
    var d=dataOf(it), names=(d.kinds||[]).map(evtLabel);
    var txt=names.join(", ")+(d.note?" · "+d.note:"")+(authBit(d)?" · "+d.author:"");
    return '<div class="wk-row evt" data-eid="'+esc(it.id)+'"><div class="wk-thumb evt">'+STAR_IC+'</div>'
      +'<div class="m"><div class="d">'+esc(fmtDay(d.day))+(d.time?' · '+esc(d.time):'')+'</div>'
      +'<div class="s gold">'+esc(txt)+'</div></div></div>';
  }
  /* единая лента: прогулки + события поведения + важные события, свежие сверху */
  function renderList(){
    if(!root||!E.list) return;
    var rows=entries.map(function(it){ return {at:it.createdAt||0, h:walkRowHtml(it)}; })
      .concat(behs.map(function(it){ return {at:it.createdAt||0, h:behRowHtml(it)}; }))
      .concat(evts.map(function(it){ return {at:it.createdAt||0, h:evtRowHtml(it)}; }));
    if(!rows.length){ E.list.innerHTML='<div class="wk-empty">'+esc(t("historyEmpty"))+'</div>'; return; }
    rows.sort(function(a,b){ return b.at-a.at; });
    E.list.innerHTML=rows.map(function(r){ return r.h; }).join("");
  }
  function openEvtDetail(id){
    var it=null; for(var i=0;i<evts.length;i++){ if(String(evts[i].id)===String(id)){ it=evts[i]; break; } }
    if(!it) return;
    var d=dataOf(it), node=document.createElement("div"); node.className="wk-detail";
    var h='<h2>'+esc(fmtDay(d.day))+(d.time?' · '+esc(d.time):'')+'</h2>'
      +'<div class="wk-sect">'+esc(t("evtTitle"))+'</div><div class="wk-chips ro">';
    (d.kinds||[]).forEach(function(k){ h+='<span class="wk-chip gold on">'+esc(evtLabel(k))+'</span>'; });
    h+='</div>';
    if(d.note) h+='<div class="wk-sect">'+esc(t("evtNote"))+'</div><p class="wk-det-note">'+esc(d.note)+'</p>';
    if(d.author) h+='<p class="wk-author">'+esc(t("byAuthor",{name:d.author}))+'</p>';
    h+='<div class="sheet-actions" style="margin-top:14px"><button class="btn btn-cancel" data-close style="flex:1">'+esc(t("common.close"))+'</button></div>';
    node.innerHTML=h;
    var sh=sdk.ui.sheet(node);
    node.querySelector("[data-close]").addEventListener("click",sh.close);
  }
  function openBehDetail(id){
    var it=null; for(var i=0;i<behs.length;i++){ if(String(behs[i].id)===String(id)){ it=behs[i]; break; } }
    if(!it) return;
    var d=dataOf(it), node=document.createElement("div"); node.className="wk-detail";
    var h='<h2>'+esc(fmtDay(d.day))+(d.time?' · '+esc(d.time):'')+'</h2>'
      +'<div class="wk-sect">'+esc(t("behTitle"))+'</div><div class="wk-chips ro">';
    (d.issues||[]).forEach(function(iid){ h+='<span class="wk-chip warn on">'+esc(issLabel(iid))+'</span>'; });
    h+='</div>';
    if(d.author) h+='<p class="wk-author">'+esc(t("byAuthor",{name:d.author}))+'</p>';
    h+='<div class="sheet-actions" style="margin-top:14px"><button class="btn btn-cancel" data-close style="flex:1">'+esc(t("common.close"))+'</button></div>';
    node.innerHTML=h;
    var sh=sdk.ui.sheet(node);
    node.querySelector("[data-close]").addEventListener("click",sh.close);
  }
  function openDetail(id){
    var it=null; for(var i=0;i<entries.length;i++){ if(String(entries[i].id)===String(id)){ it=entries[i]; break; } }
    if(!it) return;
    var d=dataOf(it), r=rateOf(it);
    var node=document.createElement("div"); node.className="wk-detail";
    var h='<h2>'+esc(fmtDay(d.day))+(d.time?' · '+esc(d.time):'')+'</h2>'
      +'<div class="wk-det-dur">'+esc(t("durMin",{n:parseInt(d.duration,10)||0}))+'</div>'
      +(r?'<div class="wk-faces solo"><span class="wk-face f-'+r+' on">'+FACE[r]+'<span class="nm">'+esc(t("rnames."+r))+'</span></span></div>'
         :'<div class="wk-det-norate">'+esc(t("noRate"))+'</div>');
    if(d.commands&&d.commands.length){
      h+='<div class="wk-sect">'+esc(t("cmdTitle"))+'</div><div class="wk-chips ro">';
      d.commands.forEach(function(cid){ h+='<span class="wk-chip on">'+esc(cmdLabel(cid))+'</span>'; });
      h+='</div>';
    }
    if(d.issues&&d.issues.length){
      h+='<div class="wk-sect">'+esc(t("issTitle"))+'</div><div class="wk-chips ro">';
      d.issues.forEach(function(iid){ h+='<span class="wk-chip on warn">'+esc(issLabel(iid))+'</span>'; });
      h+='</div>';
    }
    if(d.photos&&d.photos.length){
      h+='<div class="wk-det-photos">';
      d.photos.forEach(function(src){ h+='<div class="wk-bigphoto" style="background-image:url(\''+esc(src)+'\')"></div>'; });
      h+='</div>';
    }
    if(d.author) h+='<p class="wk-author">'+esc(t("byAuthor",{name:d.author}))+'</p>';
    h+='<div class="sheet-actions" style="margin-top:14px">'
      +(!r&&sdk.can("edit")?'<button class="btn btn-primary" id="wkRateNow">'+esc(t("rateBtn"))+'</button>':'')
      +'<button class="btn btn-cancel" data-close style="flex:1">'+esc(t("common.close"))+'</button></div>';
    node.innerHTML=h;
    var sh=sdk.ui.sheet(node);
    node.querySelector("[data-close]").addEventListener("click",sh.close);
    var rn=node.querySelector("#wkRateNow");
    if(rn) rn.addEventListener("click",function(){
      sh.close();
      cur=blankCur(); cur.editId=it.id; cur.duration=parseInt(d.duration,10)||0;
      if(/^\d{2}:\d{2}$/.test(String(d.time||""))) cur.time=r15(d.time); // время записи — в поле деталей (шаг 15 мин)
      (d.commands||[]).forEach(function(cid){ cur.sel[cid]=1; });
      (d.issues||[]).forEach(function(iid){ cur.selIss[iid]=1; });
      cur.photos=(d.photos||[]).slice();
      step="rate"; renderMain();
      window.scrollTo(0,0);
    });
  }

  /* =================== mount / unmount =================== */
  function mount(rootEl, theSdk){
    sdk=theSdk; root=rootEl; E={};
    entries=[]; behs=[]; evts=[]; cmds=[]; iss=[]; evtTypes=[]; meta={id:null,puppy:1,reward:REWARD_DEF};
    step="dur"; cur=null; beh=null; ev=null; saving=false;
    var title=sdk.i18n.t("tile.walk");
    var body=sdk.ui.frame({
      titleHtml:'<div class="wk-title"><span class="sic">'+PAW_IC+'</span> '+esc(title)+'</div><div class="wk-sub">'+esc(t("subtitle"))+'</div>',
      backLabel:t("common.back"),
      back:function(){
        if(step==="details"){ step="rate"; renderMain(); return; }
        if(step==="rate"){ step="dur"; cur=null; renderMain(); return; }
        if(step==="beh"){ step="dur"; beh=null; renderMain(); return; }
        if(step==="evt"){ step="dur"; ev=null; renderMain(); return; }
        sdk.ui.back();
      },
      actions:[{ icon:GEAR_IC, id:"wkGear", label:t("aria.settings"), onClick:openSettings }]
    }).body;
    body.innerHTML='<div class="wk">'
      +'<div id="wkMain"></div>'
      +'<div class="store-section">'+esc(t("historyTitle"))+'</div><div class="wk-list" id="wkList"></div>'
    +'</div>';
    E.main=root.querySelector("#wkMain"); E.list=root.querySelector("#wkList");
    /* root (#module-view) — постоянный узел оболочки: листенер обязателен к снятию в unmount,
       иначе при повторных открытиях модуля обработчики накапливаются (двойные тосты/тоглы) */
    E.onRootClick=function(e){
      var b;
      if(!sdk.can("edit")) {
        var row0=e.target.closest(".wk-row");
        if(row0){
          if(row0.getAttribute("data-bid")) openBehDetail(row0.getAttribute("data-bid"));
          else if(row0.getAttribute("data-eid")) openEvtDetail(row0.getAttribute("data-eid"));
          else openDetail(row0.getAttribute("data-id"));
        }
        return;
      }
      b=e.target.closest("[data-dur]"); if(b){ pickDur(parseInt(b.getAttribute("data-dur"),10)); return; }
      if(e.target.closest("#wkDurOther")){ openNumpad(); return; }
      if(e.target.closest("#wkBehBtn")){ beh={sel:{}, time:hhmm15()}; step="beh"; sdk.ui.haptics(8); renderMain(); return; }
      if(e.target.closest("#wkBehSave")){ saveBeh(); return; }
      if(e.target.closest("#wkBehCancel")){ beh=null; step="dur"; renderMain(); return; }
      if(e.target.closest("#wkEvtBtn")){ ev={sel:{}, day:dayKey(), time:hhmm15(), note:""}; step="evt"; sdk.ui.haptics(8); renderMain(); return; }
      if(e.target.closest("#wkEvtSave")){ saveEvt(); return; }
      if(e.target.closest("#wkEvtCancel")){ ev=null; step="dur"; renderMain(); return; }
      b=e.target.closest("[data-evt]"); if(b){ var ek=b.getAttribute("data-evt"); if(ev){ ev.sel[ek]=ev.sel[ek]?0:1; b.classList.toggle("on",!!ev.sel[ek]); sdk.ui.haptics(4); } return; }
      if(e.target.closest("#wkAddEvt")){ openOwn("evt"); return; }
      b=e.target.closest("[data-rate]"); if(b){ pickRate(b.getAttribute("data-rate")); return; }
      if(e.target.closest("#wkLater")){ saveLater(); return; }
      b=e.target.closest("[data-cmd]"); if(b){ var c=b.getAttribute("data-cmd"); if(cur){ cur.sel[c]=cur.sel[c]?0:1; b.classList.toggle("on",!!cur.sel[c]); sdk.ui.haptics(4); } return; }
      b=e.target.closest("[data-iss]"); if(b){ var ii=b.getAttribute("data-iss"), mp=issMap(); mp[ii]=mp[ii]?0:1; b.classList.toggle("on",!!mp[ii]); sdk.ui.haptics(4); return; }
      if(e.target.closest("#wkAddCmd")){ openOwn("cmd"); return; }
      if(e.target.closest("#wkAddIss")){ openOwn("iss"); return; }
      if(e.target.closest("#wkAddPhoto")){ if(E.photoInput) E.photoInput.click(); return; }
      b=e.target.closest("[data-ph]"); if(b){
        var ix=parseInt(b.getAttribute("data-ph"),10);
        sdk.ui.confirm({title:t("photoRemoveTitle"), ok:t("common.yes"), cancel:t("common.cancel")}).then(function(ok){
          if(ok&&cur){ cur.photos.splice(ix,1); refreshPhotos(); }
        });
        return;
      }
      if(e.target.closest("#wkSave")){ save(); return; }
      var row=e.target.closest(".wk-row");
      if(row){
        if(row.getAttribute("data-bid")) openBehDetail(row.getAttribute("data-bid"));
        else if(row.getAttribute("data-eid")) openEvtDetail(row.getAttribute("data-eid"));
        else openDetail(row.getAttribute("data-id"));
      }
    };
    root.addEventListener("click",E.onRootClick);
    renderMain(); renderList(); hud(); load();
  }
  function unmount(){
    if(root && E.onRootClick) root.removeEventListener("click",E.onRootClick);
    E={}; entries=[]; behs=[]; evts=[]; cmds=[]; iss=[]; evtTypes=[]; root=null;
    step="dur"; cur=null; beh=null; ev=null; saving=false; meta={id:null,puppy:1,reward:REWARD_DEF};
  }

  /* живое обновление (sync-поллер оболочки, v2026.06.07.47): общесемейный пул — прогулку
     брата/родителя видно сразу. Только в покое: не во время мастера (cur), форм
     поведения/события (beh/ev) и сохранения. Занят → false: shell повторит следующим
     тиком, обновление не теряется (фикс v2026.06.07.55). */
  function refresh(){
    if(!root) return true;                    // демонтирован
    if(saving || cur || beh || ev) return false; // мастер/форма/сохранение — позже
    load(); return true;
  }

  RobTop.register({ id:"walk", mount:mount, unmount:unmount, refresh:refresh, messages:MESSAGES });
})();
