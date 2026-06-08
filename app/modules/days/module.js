/* RobTop — модуль «Счётчик дней». Ребёнок создаёт отсчёты до важных событий
   (поездка, день рождения, Новый год): выбирает дату и название, по желанию — значок-эмодзи
   и пару слов. На карточке-календарике крупно показано, сколько дней осталось до события;
   каждый день в 00:00 (время устройства) число пересчитывается (−1). В день события —
   «Сегодня! 🎉», после — отсчёт уезжает в «Завершённые». Очков нет — это спокойная
   утилита-календарь. Данные — generic-стор (sdk.data, коллекция events):
   { title, date: "YYYY-MM-DD", emoji, note }. */
(function(){
  "use strict";

  /* =================== ЛОКАЛИЗАЦИЯ (en/ru/lv) =================== */
  var MESSAGES={
    en:{ days:{
      subtitle:"How many days until something fun?",
      hudLeft:"Day <b>counter</b>", hudCLbl:"countdowns", hudRLbl:"soonest",
      emptyTitle:"No countdowns yet", emptyHint:"Pick a date and count the days down to it!",
      addBtn:"New event", createTitle:"New countdown", editTitle:"Edit countdown",
      nameLbl:"What are you waiting for?", namePh:"e.g. Trip of the year",
      emojiLbl:"Pick an icon", dateLbl:"Choose the date",
      noteLbl:"A few words (optional)", notePh:"e.g. We fly to the sea!",
      save:"Save", create:"Create",
      needName:"Give your event a name", needDate:"Choose a date", needFuture:"Pick today or a future date",
      today:"Today!", reached:"The day has come! 🎉",
      leftWord:{ one:"day", other:"days" },
      leftLong:{ one:"{n} day left", other:"{n} days left" },
      passedLong:{ one:"was {n} day ago", other:"was {n} days ago" },
      activeSec:"Coming up", doneSec:"Finished",
      edit:"Edit", del:"Delete", delConfirm:"Delete this countdown?",
      deleted:"Deleted", restore:"Undo",
      savedToast:"Countdown saved", saveFailed:"Couldn't save",
      parentNote:"Only the child sets countdowns. You're viewing."
    }},
    ru:{ days:{
      subtitle:"Сколько дней до чего-то приятного?",
      hudLeft:"Счётчик <b>дней</b>", hudCLbl:"отсчётов", hudRLbl:"ближайший",
      emptyTitle:"Отсчётов пока нет", emptyHint:"Выбери дату и считай дни до неё!",
      addBtn:"Новое событие", createTitle:"Новый отсчёт", editTitle:"Изменить отсчёт",
      nameLbl:"Чего ты ждёшь?", namePh:"например: Путешествие года",
      emojiLbl:"Выбери значок", dateLbl:"Выбери дату",
      noteLbl:"Пара слов (по желанию)", notePh:"например: летим на море!",
      save:"Сохранить", create:"Создать",
      needName:"Назови событие", needDate:"Выбери дату", needFuture:"Выбери сегодня или будущую дату",
      today:"Сегодня!", reached:"День настал! 🎉",
      leftWord:{ one:"день", few:"дня", many:"дней", other:"дней" },
      leftLong:{ one:"остался {n} день", few:"осталось {n} дня", many:"осталось {n} дней", other:"осталось {n} дней" },
      passedLong:{ one:"был {n} день назад", few:"было {n} дня назад", many:"было {n} дней назад", other:"было {n} дней назад" },
      activeSec:"Скоро", doneSec:"Завершённые",
      edit:"Изменить", del:"Удалить", delConfirm:"Удалить этот отсчёт?",
      deleted:"Удалено", restore:"Вернуть",
      savedToast:"Отсчёт сохранён", saveFailed:"Не удалось сохранить",
      parentNote:"Отсчёты создаёт ребёнок. Это просмотр."
    }},
    lv:{ days:{
      subtitle:"Cik dienu līdz kaut kam jaukam?",
      hudLeft:"Dienu <b>skaitītājs</b>", hudCLbl:"atskaites", hudRLbl:"tuvākais",
      emptyTitle:"Atskaišu vēl nav", emptyHint:"Izvēlies datumu un skaiti dienas līdz tam!",
      addBtn:"Jauns notikums", createTitle:"Jauna atskaite", editTitle:"Mainīt atskaiti",
      nameLbl:"Ko tu gaidi?", namePh:"piemēram: Gada ceļojums",
      emojiLbl:"Izvēlies ikonu", dateLbl:"Izvēlies datumu",
      noteLbl:"Daži vārdi (pēc izvēles)", notePh:"piemēram: lidojam uz jūru!",
      save:"Saglabāt", create:"Izveidot",
      needName:"Nosauc notikumu", needDate:"Izvēlies datumu", needFuture:"Izvēlies šodienu vai nākotnes datumu",
      today:"Šodien!", reached:"Diena ir klāt! 🎉",
      leftWord:{ zero:"dienu", one:"diena", other:"dienas" },
      leftLong:{ zero:"atlikušas {n} dienu", one:"atlikusi {n} diena", other:"atlikušas {n} dienas" },
      passedLong:{ zero:"bija pirms {n} dienām", one:"bija pirms {n} dienas", other:"bija pirms {n} dienām" },
      activeSec:"Drīzumā", doneSec:"Pabeigtie",
      edit:"Mainīt", del:"Dzēst", delConfirm:"Dzēst šo atskaiti?",
      deleted:"Izdzēsts", restore:"Atsaukt",
      savedToast:"Atskaite saglabāta", saveFailed:"Neizdevās saglabāt",
      parentNote:"Atskaites veido bērns. Šis ir skats."
    }}
  };

  var BACK_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
  var CAL_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 9.2h17M8 3.2v3.6M16 3.2v3.6" stroke-linecap="round"/></svg>';

  var EMOJI=["🎉","✈️","🎂","🎄","🏖️","🎮","🎁","🚀","⭐","🐶","🍦","⚽"];
  var DEFAULT_EMOJI="🎉";

  var sdk=null, root=null, E={}, items=[], timer=null, fabH=null, lastSig="", lastToday={};
  function blankForm(){ return {open:false, id:null, title:"", date:"", emoji:DEFAULT_EMOJI, note:""}; }
  var form=blankForm();

  function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];}); }
  function t(k,p){ return sdk.t(k,p); }

  /* ----- дни ----- */
  function pad2(n){ return (n<10?"0":"")+n; }
  function dayKey(d){ d=d||new Date(); return d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate()); }
  function parseDate(s){ var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s||"")); return m?new Date(+m[1],+m[2]-1,+m[3]):null; }
  function daysTo(s){ // календарных дней от сегодня (время устройства) до даты; 0 — сегодня, <0 — прошло
    var tgt=parseDate(s); if(!tgt) return 0;
    var now=new Date(), t0=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    return Math.round((tgt-t0)/86400000);
  }
  function fmtDate(s){ var d=parseDate(s); if(!d) return String(s||"");
    return sdk.formatDate(new Date(d.getFullYear(),d.getMonth(),d.getDate(),12,0,0), {day:"numeric", month:"long", year:"numeric"}); }
  function sig(){ return dayKey(); }

  /* ----- данные ----- */
  function byId(id){ for(var i=0;i<items.length;i++){ if(String(items[i].id)===String(id)) return items[i]; } return null; }
  function dnum(it){ var d=parseDate((it.data||{}).date); return d?d.getTime():0; }
  function todaySet(){ var s={}; items.forEach(function(it){ if(daysTo((it.data||{}).date)===0) s[it.id]=1; }); return s; }
  function load(){
    sdk.data.list("events").then(function(list){
      if(!root) return;
      items=(list||[]).filter(function(it){ return it&&it.data&&it.data.date; });
      renderAll();
    }).catch(function(){ if(!root) return; items=[]; renderAll(); });
  }

  function hud(){
    var act=0, soon=null;
    items.forEach(function(it){ var n=daysTo((it.data||{}).date); if(n>=0){ act++; if(soon===null||n<soon) soon=n; } });
    sdk.ui.hud({ left:t("hudLeft"), cNum:act, cLbl:t("hudCLbl"), rNum:(soon===null?0:soon), rLbl:t("hudRLbl") });
  }

  /* =================== РЕНДЕР =================== */
  function renderAll(){
    lastSig=sig(); lastToday=todaySet();
    renderState(); renderLists(); hud(); syncFab();
  }

  function renderState(){
    if(!E.state) return;
    if(!sdk.can("edit")){ E.state.innerHTML='<div class="dy-note">'+esc(t("parentNote"))+'</div>'; return; }
    if(form.open){ renderForm(); return; }
    if(!items.length){
      E.state.innerHTML='<div class="dy-empty"><div class="dy-empty-emo">📅</div>'
        +'<h3 class="dy-empty-title">'+esc(t("emptyTitle"))+'</h3>'
        +'<p class="dy-empty-hint">'+esc(t("emptyHint"))+'</p>'
        +'<button class="btn btn-primary dy-empty-btn" id="dyAdd">'+esc(t("addBtn"))+'</button></div>';
      return;
    }
    E.state.innerHTML="";
  }

  function renderForm(){
    if(!E.state) return;
    var emos=EMOJI.map(function(e){ return '<button type="button" class="dy-emo'+(form.emoji===e?" on":"")+'" data-emo="'+esc(e)+'">'+e+'</button>'; }).join("");
    E.state.innerHTML='<div class="dy-card-form">'
      +'<h3 class="dy-form-title">'+esc(form.id?t("editTitle"):t("createTitle"))+'</h3>'
      +'<label class="dy-lbl" for="dyName">'+esc(t("nameLbl"))+'</label>'
      +'<input class="dy-in" id="dyName" type="text" maxlength="60" placeholder="'+esc(t("namePh"))+'" value="'+esc(form.title||"")+'">'
      +'<label class="dy-lbl">'+esc(t("emojiLbl"))+'</label><div class="dy-emos">'+emos+'</div>'
      +'<label class="dy-lbl" for="dyDate">'+esc(t("dateLbl"))+'</label>'
      +'<input class="dy-in" id="dyDate" type="date"'+(form.id?"":' min="'+esc(dayKey())+'"')+' value="'+esc(form.date||"")+'">'
      +'<label class="dy-lbl" for="dyNote">'+esc(t("noteLbl"))+'</label>'
      +'<textarea class="dy-ta" id="dyNote" maxlength="120" placeholder="'+esc(t("notePh"))+'">'+esc(form.note||"")+'</textarea>'
      +'<div class="dy-form-actions"><button class="btn btn-cancel" id="dyCancel">'+esc(t("common.cancel"))+'</button>'
      +'<button class="btn btn-primary" id="dySave">'+esc(form.id?t("save"):t("create"))+'</button></div></div>';
  }
  function updateEmoSel(){
    if(!E.state) return; var btns=E.state.querySelectorAll(".dy-emo");
    for(var i=0;i<btns.length;i++){ btns[i].classList.toggle("on", btns[i].getAttribute("data-emo")===form.emoji); }
  }

  function card(it, archived){
    var d=it.data||{}, n=daysTo(d.date), emo=d.emoji||"📅";
    var leafNum = archived ? "·" : (n===0 ? "🎉" : String(n));
    var phrase = archived ? sdk.plural(-n,"passedLong",{n:-n})
               : (n===0 ? t("reached") : sdk.plural(n,"leftLong",{n:n}));
    return '<button class="dy-card'+(n===0&&!archived?" is-today":"")+(archived?" is-done":"")+'" data-id="'+esc(it.id)+'">'
      +'<div class="dy-leaf"><span class="dy-leaf-top">'+esc(emo)+'</span><span class="dy-leaf-num">'+esc(leafNum)+'</span></div>'
      +'<div class="dy-body"><div class="dy-title">'+esc(d.title||"")+'</div>'
      +'<div class="dy-phrase">'+esc(phrase)+'</div>'
      +'<div class="dy-date">'+esc(fmtDate(d.date))+'</div></div></button>';
  }

  function renderLists(){
    var act=[], done=[];
    items.forEach(function(it){ if(daysTo((it.data||{}).date)>=0) act.push(it); else done.push(it); });
    act.sort(function(a,b){ return dnum(a)-dnum(b); });   // ближайшие сверху
    done.sort(function(a,b){ return dnum(b)-dnum(a); });  // недавно прошедшие сверху
    if(E.actSec) E.actSec.style.display=act.length?"":"none";
    if(E.list) E.list.innerHTML=act.map(function(it){ return card(it,false); }).join("");
    if(E.doneSec) E.doneSec.style.display=done.length?"":"none";
    if(E.done) E.done.innerHTML=done.map(function(it){ return card(it,true); }).join("");
  }

  function syncFab(){
    if(!fabH) return;
    if(sdk.can("edit") && !form.open && items.length) fabH.show(); else fabH.hide();
  }
  function focusName(){ var el=E.state&&E.state.querySelector("#dyName"); if(el){ try{ el.focus(); }catch(e){} } }

  /* =================== ДЕЙСТВИЯ =================== */
  function openCreate(){ if(!sdk.can("edit")) return; form={open:true,id:null,title:"",date:"",emoji:DEFAULT_EMOJI,note:""}; renderAll(); focusName(); }
  function openEdit(id){ var it=byId(id); if(!it) return; var d=it.data||{};
    form={open:true,id:it.id,title:d.title||"",date:d.date||"",emoji:d.emoji||DEFAULT_EMOJI,note:d.note||""}; renderAll(); focusName(); }
  function cancelForm(){ form=blankForm(); renderAll(); }

  function save(){
    if(!sdk.can("edit")) return;
    var nameEl=E.state.querySelector("#dyName"), dateEl=E.state.querySelector("#dyDate"), noteEl=E.state.querySelector("#dyNote");
    var title=(nameEl?nameEl.value:"").trim().slice(0,60);
    var date=(dateEl?dateEl.value:"").trim();
    var note=(noteEl?noteEl.value:"").trim().slice(0,120);
    if(!title){ sdk.ui.toast(t("needName")); if(nameEl) try{ nameEl.focus(); }catch(e){} return; }
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){ sdk.ui.toast(t("needDate")); return; }
    if(!form.id && daysTo(date)<0){ sdk.ui.toast(t("needFuture")); return; }
    var payload={ title:title, date:date, emoji:form.emoji||"", note:note }, edited=!!form.id, p;
    if(form.id){
      var ex=byId(form.id);
      p=sdk.data.update("events", form.id, payload).then(function(){ if(ex) ex.data=Object.assign({},ex.data,payload); });
    }else{
      p=sdk.data.create("events", payload).then(function(item){ if(item){ items.push(item); } else { return load(); } });
    }
    p.then(function(){
      if(!root) return;
      sdk.events.track("days_set",{date:date, edited:edited});
      form=blankForm(); sdk.ui.haptics(10); sdk.ui.toast(t("savedToast"));
      renderAll();
    }).catch(function(){ sdk.ui.toast(t("saveFailed")); });
  }

  function removeEvent(id){
    var it=byId(id); if(!it) return;
    sdk.ui.confirm({ title:t("delConfirm"), ok:t("del"), cancel:t("common.cancel") }).then(function(ok){
      if(!ok||!root) return;
      sdk.data.remove("events", id);
      items=items.filter(function(x){ return String(x.id)!==String(id); });
      renderAll();
      sdk.ui.toast(t("deleted"), t("restore"), function(){
        sdk.data.restore("events", id).then(function(){ if(!root) return; if(!byId(id)) items.push(it); renderAll(); });
      });
    });
  }

  function openDetail(id){
    var it=byId(id); if(!it) return;
    var d=it.data||{}, n=daysTo(d.date), canEdit=sdk.can("edit");
    var big = n===0 ? esc(t("today"))
            : (n>0 ? '<b>'+n+'</b> '+esc(sdk.plural(n,"leftWord",{n:n})) : esc(sdk.plural(-n,"passedLong",{n:-n})));
    var phrase = n>0 ? sdk.plural(n,"leftLong",{n:n}) : (n===0 ? t("reached") : "");
    var node=document.createElement("div"); node.className="dy-detail";
    node.innerHTML='<div class="dy-detail-emo">'+esc(d.emoji||"📅")+'</div>'
      +'<h2>'+esc(d.title||"")+'</h2>'
      +'<div class="dy-detail-big">'+big+'</div>'
      +(phrase?'<div class="dy-detail-phrase">'+esc(phrase)+'</div>':"")
      +'<div class="dy-detail-date">'+esc(fmtDate(d.date))+'</div>'
      +(d.note?'<p class="dy-detail-note">'+esc(d.note)+'</p>':"")
      +(canEdit
        ? '<div class="sheet-actions" style="margin-top:16px"><button class="btn btn-danger" data-del>'+esc(t("del"))+'</button><button class="btn btn-primary" data-edit>'+esc(t("edit"))+'</button></div>'
        : '<div class="sheet-actions" style="margin-top:16px"><button class="btn btn-cancel" data-close style="flex:1">'+esc(t("common.close"))+'</button></div>');
    var sh=sdk.ui.sheet(node);
    var bDel=node.querySelector("[data-del]"), bEd=node.querySelector("[data-edit]"), bCl=node.querySelector("[data-close]");
    if(bCl) bCl.addEventListener("click",sh.close);
    if(bEd) bEd.addEventListener("click",function(){ sh.close(); openEdit(id); });
    if(bDel) bDel.addEventListener("click",function(){ sh.close(); removeEvent(id); });
  }

  function onClick(e){
    var emo=e.target.closest("[data-emo]");
    if(emo){ if(!form.open) return; form.emoji=emo.getAttribute("data-emo"); updateEmoSel(); sdk.ui.haptics(6); return; }
    if(e.target.closest("#dySave")){ save(); return; }
    if(e.target.closest("#dyCancel")){ cancelForm(); return; }
    if(e.target.closest("#dyAdd")){ openCreate(); return; }
    var c=e.target.closest(".dy-card"); if(c){ openDetail(c.getAttribute("data-id")); }
  }

  /* ----- тик: смена календарного дня (00:00) → пересчёт; событие, ставшее «сегодня», — салют ----- */
  function tick(){
    if(!root || form.open) return;
    if(sig()===lastSig) return;
    var prev=lastToday, now=todaySet(), fresh=false, k;
    for(k in now){ if(now.hasOwnProperty(k) && !prev[k]){ fresh=true; break; } }
    renderAll();
    if(fresh){ sdk.ui.confetti(); sdk.ui.chime(); }
  }

  /* =================== mount / unmount =================== */
  function mount(rootEl, theSdk){
    sdk=theSdk; root=rootEl; items=[]; form=blankForm(); fabH=null;
    var title=sdk.i18n.t("tile.days");
    var body=sdk.ui.frame({
      titleHtml:'<div class="day-title"><span class="sic">'+CAL_IC+'</span> '+esc(title)+'</div><div class="day-sub">'+esc(t("subtitle"))+'</div>',
      backLabel:t("common.back")
    }).body;
    body.innerHTML='<div class="day">'
      +'<div id="dyState"></div>'
      +'<div class="store-section" id="dyActiveSec">'+esc(t("activeSec"))+'</div>'
      +'<div class="day-list" id="dyList"></div>'
      +'<div class="store-section" id="dyDoneSec">'+esc(t("doneSec"))+'</div>'
      +'<div class="day-list" id="dyDone"></div></div>';
    E.state=root.querySelector("#dyState"); E.list=root.querySelector("#dyList"); E.done=root.querySelector("#dyDone");
    E.actSec=root.querySelector("#dyActiveSec"); E.doneSec=root.querySelector("#dyDoneSec");
    root.addEventListener("click",onClick);
    if(sdk.can("edit")) fabH=sdk.ui.fab(t("addBtn"), openCreate);
    renderAll(); load();
    timer=setInterval(tick, 30000);
  }
  function unmount(){
    if(timer){ clearInterval(timer); timer=null; }
    if(fabH){ try{ fabH.destroy(); }catch(e){} fabH=null; }
    E={}; items=[]; root=null; form=blankForm(); lastSig=""; lastToday={};
  }

  RobTop.register({ id:"days", mount:mount, unmount:unmount, messages:MESSAGES });
})();
