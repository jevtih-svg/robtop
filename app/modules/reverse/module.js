/* RobTop — модуль «Слова наоборот».
   Демонстрирует контракт: чистый клиент, данные через универсальное хранилище (sdk.data),
   без единой правки ядра. Переворачивает слово и хранит историю. */
(function(){
  "use strict";
  var BACK_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
  var sdk=null, root=null, items=[], E={};

  function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];}); }
  function reverseStr(s){ return Array.from(String(s||"")).reverse().join(""); }

  function hud(){ sdk.ui.hud({ left:'Слова <b>наоборот</b>', cNum:items.length, cLbl:"в истории", rNum:items.length, rLbl:"слов" }); }

  function renderOut(){
    var v=(E.in.value||"").trim();
    if(!v){ E.out.className="rev-out empty"; E.out.textContent="Напиши слово — покажу его задом наперёд"; return; }
    E.out.className="rev-out"; E.out.textContent=reverseStr(v);
  }
  function renderList(){
    if(!items.length){ E.list.innerHTML='<div style="color:#6f80a6;font-weight:600;font-size:14px;text-align:center;padding:14px">Пока пусто. Переверни слово и нажми «Сохранить».</div>'; hud(); return; }
    E.list.innerHTML=items.map(function(it){
      var d=it.data||{};
      return '<div class="rev-row" data-id="'+esc(it.id)+'"><div class="w">'+esc(d.reversed||"")+'<small>'+esc(d.text||"")+'</small></div><button class="del" data-del="'+esc(it.id)+'" aria-label="Удалить">✕</button></div>';
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
      renderList(); sdk.ui.haptics(8); sdk.ui.toast("Сохранено: "+rec.reversed);
      E.in.value=""; renderOut(); E.in.focus();
    }).catch(function(){ sdk.ui.toast("Не удалось сохранить"); });
  }
  function del(id){
    sdk.data.remove("history", id).then(function(){
      items=items.filter(function(x){ return String(x.id)!==String(id); }); renderList(); sdk.ui.haptics(10);
    }).catch(function(){ sdk.ui.toast("Не удалось удалить"); });
  }

  function mount(rootEl, theSdk){
    sdk=theSdk; root=rootEl; items=[];
    root.innerHTML='<div class="rev">'
      +'<div class="rev-header"><button class="back" id="revBack" aria-label="Назад">'+BACK_IC+'</button>'
      +'<div><div class="rev-title">Слова наоборот</div><div class="rev-sub">Введи слово — переверну его</div></div></div>'
      +'<div class="rev-card"><input class="rev-in" id="revIn" type="text" maxlength="60" placeholder="Например: привет" autocomplete="off"><div class="rev-out empty" id="revOut">Напиши слово — покажу его задом наперёд</div></div>'
      +'<div class="sheet-actions" style="margin-top:14px"><button class="btn btn-primary" id="revSave" style="flex:1">Сохранить в историю</button></div>'
      +'<div class="store-section">История</div><div class="rev-list" id="revList"></div>'
    +'</div>';
    E.in=root.querySelector("#revIn"); E.out=root.querySelector("#revOut"); E.list=root.querySelector("#revList");
    root.querySelector("#revBack").addEventListener("click",function(){ sdk.ui.back(); });
    E.in.addEventListener("input",renderOut);
    E.in.addEventListener("keydown",function(e){ if(e.key==="Enter") saveCurrent(); });
    root.querySelector("#revSave").addEventListener("click",saveCurrent);
    E.list.addEventListener("click",function(e){ var b=e.target.closest("[data-del]"); if(b) del(b.getAttribute("data-del")); });
    renderOut(); hud(); loadHistory();
    setTimeout(function(){ if(E.in) E.in.focus(); },250);
  }
  function unmount(){ E={}; items=[]; }

  RobTop.register({ id:"reverse", mount:mount, unmount:unmount });
})();
