/* RobTop — модуль «Слова наоборот».
   Демонстрирует контракт: чистый клиент, данные через универсальное хранилище (sdk.data),
   без единой правки ядра. Переворачивает слово и хранит историю.
   Тексты — через sdk.t (язык en/ru/lv); озвучка — на языке интерфейса (sdk.i18n.speechLang). */
(function(){
  "use strict";

  /* =================== ЛОКАЛИЗАЦИЯ (en/ru/lv) =================== */
  var MESSAGES={
    en:{ reverse:{
      title:"Words Backwards", subtitle:"Type a word — I'll flip it",
      hudLeft:"Words <b>backwards</b>", hudCLbl:"in history", hudRLbl:"words",
      outEmpty:"Type a word — I'll show it backwards",
      listEmpty:"Empty so far. Flip a word and tap “Save”.",
      inPh:"e.g. hello", speak:"🔊 Speak", sectionHistory:"History", ariaSpeak:"Speak",
      toast:{ needWord:"Type a word first", ttsUnsupported:"Speech isn't supported on this device",
        ttsFailed:"Couldn't speak", saved:"Saved: {word}", saveFailed:"Couldn't save", deleteFailed:"Couldn't delete" }
    }},
    ru:{ reverse:{
      title:"Слова наоборот", subtitle:"Введи слово — переверну его",
      hudLeft:"Слова <b>наоборот</b>", hudCLbl:"в истории", hudRLbl:"слов",
      outEmpty:"Напиши слово — покажу его задом наперёд",
      listEmpty:"Пока пусто. Переверни слово и нажми «Сохранить».",
      inPh:"Например: привет", speak:"🔊 Озвучить", sectionHistory:"История", ariaSpeak:"Озвучить",
      toast:{ needWord:"Сначала введи слово", ttsUnsupported:"Озвучка не поддерживается на этом устройстве",
        ttsFailed:"Не удалось озвучить", saved:"Сохранено: {word}", saveFailed:"Не удалось сохранить", deleteFailed:"Не удалось удалить" }
    }},
    lv:{ reverse:{
      title:"Vārdi otrādi", subtitle:"Ieraksti vārdu — apgriezīšu to",
      hudLeft:"Vārdi <b>otrādi</b>", hudCLbl:"vēsturē", hudRLbl:"vārdi",
      outEmpty:"Ieraksti vārdu — parādīšu to otrādi",
      listEmpty:"Pagaidām tukšs. Apgriez vārdu un nospied “Saglabāt”.",
      inPh:"Piem.: sveiki", speak:"🔊 Nolasīt", sectionHistory:"Vēsture", ariaSpeak:"Nolasīt",
      toast:{ needWord:"Vispirms ieraksti vārdu", ttsUnsupported:"Runa šajā ierīcē netiek atbalstīta",
        ttsFailed:"Neizdevās nolasīt", saved:"Saglabāts: {word}", saveFailed:"Neizdevās saglabāt", deleteFailed:"Neizdevās dzēst" }
    }}
  };

  var BACK_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
  var sdk=null, root=null, items=[], E={};

  function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];}); }
  function t(k,p){ return sdk.t(k,p); }
  function reverseStr(s){ return Array.from(String(s||"")).reverse().join(""); }

  /* ----- озвучка (Web Speech API) на языке интерфейса ----- */
  function localeVoice(){ try{ var lc=sdk.i18n.get(), vs=window.speechSynthesis.getVoices()||[]; for(var i=0;i<vs.length;i++){ if(String(vs[i].lang||"").toLowerCase().indexOf(lc)===0) return vs[i]; } }catch(e){} return null; }
  function speak(text){
    text=(text||"").trim(); if(!text){ sdk.ui.toast(t("toast.needWord")); return; }
    if(!("speechSynthesis" in window) || typeof window.SpeechSynthesisUtterance==="undefined"){ sdk.ui.toast(t("toast.ttsUnsupported")); return; }
    try{
      window.speechSynthesis.cancel();
      var u=new window.SpeechSynthesisUtterance(text);
      u.lang=sdk.i18n.speechLang(); u.rate=0.85; u.pitch=1.05;
      var v=localeVoice(); if(v) u.voice=v;
      window.speechSynthesis.speak(u); sdk.ui.haptics(6);
    }catch(e){ sdk.ui.toast(t("toast.ttsFailed")); }
  }

  function hud(){ sdk.ui.hud({ left:t("hudLeft"), cNum:items.length, cLbl:t("hudCLbl"), rNum:items.length, rLbl:t("hudRLbl") }); }

  function renderOut(){
    var v=(E.in.value||"").trim();
    if(!v){ E.out.className="rev-out empty"; E.out.textContent=t("outEmpty"); return; }
    E.out.className="rev-out"; E.out.textContent=reverseStr(v);
  }
  function renderList(){
    if(!E.list) return; // модуль мог быть размонтирован, пока грузилась история
    if(!items.length){ E.list.innerHTML='<div style="color:var(--muted-dim);font-weight:600;font-size:14px;text-align:center;padding:14px">'+esc(t("listEmpty"))+'</div>'; hud(); return; }
    E.list.innerHTML=items.map(function(it){
      var d=it.data||{};
      return '<div class="rev-row" data-id="'+esc(it.id)+'"><div class="w">'+esc(d.reversed||"")+'<small>'+esc(d.text||"")+'</small></div>'
        +'<button class="say" data-say="'+esc(d.reversed||"")+'" aria-label="'+esc(t("ariaSpeak"))+'">🔊</button>'
        +'<button class="del" data-del="'+esc(it.id)+'" aria-label="'+esc(t("common.delete"))+'">✕</button></div>';
    }).join("");
    hud();
  }
  function loadHistory(){
    sdk.data.list("history").then(function(list){
      items=(list||[]).slice().sort(function(a,b){ return (b.createdAt||0)-(a.createdAt||0); });
      renderList();
    }).catch(function(){ items=[]; renderList(); });
  }
  function saveCurrent(){
    var v=(E.in.value||"").trim(); if(!v){ E.in.focus(); return; }
    var rec={text:v, reversed:reverseStr(v)};
    sdk.data.create("history", rec).then(function(item){
      if(item){ items.unshift(item); } else { loadHistory(); }
      renderList(); sdk.ui.haptics(8); sdk.ui.toast(t("toast.saved",{word:rec.reversed}));
      E.in.value=""; renderOut(); E.in.focus();
    }).catch(function(){ sdk.ui.toast(t("toast.saveFailed")); });
  }
  function del(id){
    sdk.data.remove("history", id).then(function(){
      items=items.filter(function(x){ return String(x.id)!==String(id); }); renderList(); sdk.ui.haptics(10);
    }).catch(function(){ sdk.ui.toast(t("toast.deleteFailed")); });
  }

  function mount(rootEl, theSdk){
    sdk=theSdk; root=rootEl; items=[];
    root.innerHTML='<div class="rev">'
      +'<div class="rev-header"><button class="back" id="revBack" aria-label="'+esc(t("common.back"))+'">'+BACK_IC+'</button>'
      +'<div><div class="rev-title">'+esc(t("title"))+'</div><div class="rev-sub">'+esc(t("subtitle"))+'</div></div></div>'
      +'<div class="rev-card"><input class="rev-in" id="revIn" type="text" maxlength="60" placeholder="'+esc(t("inPh"))+'" autocomplete="off"><div class="rev-out empty" id="revOut">'+esc(t("outEmpty"))+'</div></div>'
      +'<div class="sheet-actions" style="margin-top:14px"><button class="btn" id="revSpeak" style="flex:0 0 46%">'+esc(t("speak"))+'</button><button class="btn btn-primary" id="revSave">'+esc(t("common.save"))+'</button></div>'
      +'<div class="store-section">'+esc(t("sectionHistory"))+'</div><div class="rev-list" id="revList"></div>'
    +'</div>';
    E.in=root.querySelector("#revIn"); E.out=root.querySelector("#revOut"); E.list=root.querySelector("#revList");
    root.querySelector("#revBack").addEventListener("click",function(){ sdk.ui.back(); });
    E.in.addEventListener("input",renderOut);
    E.in.addEventListener("keydown",function(e){ if(e.key==="Enter") saveCurrent(); });
    root.querySelector("#revSave").addEventListener("click",saveCurrent);
    root.querySelector("#revSpeak").addEventListener("click",function(){ speak(reverseStr((E.in.value||"").trim())); });
    E.list.addEventListener("click",function(e){
      var sb=e.target.closest("[data-say]"); if(sb){ speak(sb.getAttribute("data-say")); return; }
      var b=e.target.closest("[data-del]"); if(b) del(b.getAttribute("data-del"));
    });
    renderOut(); hud(); loadHistory();
    setTimeout(function(){ if(E.in) E.in.focus(); },250);
  }
  function unmount(){ try{ if(window.speechSynthesis) window.speechSynthesis.cancel(); }catch(e){} E={}; items=[]; }

  RobTop.register({ id:"reverse", mount:mount, unmount:unmount, messages:MESSAGES });
})();
