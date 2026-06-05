/* RobTop — модуль «Виш-лист» (родной, серверный: своя таблица wishlist_items + api.php).
   Поведение 1:1 с прежним прототипом. Сервер — через sdk.api (action.php → диспетчер → modules/wishlist/api.php),
   офлайн/демо — localStorage. UI монтируется в root; шторки добавляются в body и снимаются при unmount. */
(function(){
  "use strict";

  var IC={
    cherry:'<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="7.5" cy="17" r="3.6"/><circle cx="15.7" cy="17.6" r="3.6"/><path d="M8 14.4C9 8.4 13 5 18.4 3.8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M16.1 14.6C16.7 9.4 15 6 12 3.9" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M18.4 3.8c1-1.1 2.7-1.1 3.6.3-1.5.5-2.5.4-3.6-.3z"/></svg>',
    check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
    heart:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-8-4.6-10.3-9.2C.2 8.7 1.7 5.5 4.8 5.1 6.8 4.8 8.5 6 9.4 7.3l.6 1 .6-1C11.5 6 13.2 4.8 15.2 5.1c3.1.4 4.6 3.6 3.1 6.7C20 16.4 12 21 12 21z"/></svg>',
    think:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 19a5.5 5.5 0 1 1 4-9.9A4 4 0 1 1 18 14H9.5z"/><circle cx="6" cy="21" r="1.2" fill="currentColor" stroke="none"/></svg>',
    back2:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-1"/></svg>',
    link:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/></svg>',
    badge:'<svg viewBox="0 0 24 24" fill="none" stroke="#04231c" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
    edit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>',
    clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    star:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l2.7 5.7 6.3.8-4.6 4.4 1.2 6.2L12 17.8 6.4 20.1l1.2-6.2L3 9.5l6.3-.8z"/></svg>',
    starO:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 3.6l2.6 5.4 6 .8-4.4 4.2 1.1 6L12 17.4 6.7 20l1.1-6L3.4 9.8l6-.8z"/></svg>'
  };
  var BACK_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
  var STATS_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 20V10M12 20V4M19 20v-7"/></svg>';
  var TITLE_CHERRY='<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="7.5" cy="17" r="3.6"/><circle cx="15.7" cy="17.6" r="3.6"/><path d="M8 14.4C9 8.4 13 5 18.4 3.8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M16.1 14.6C16.7 9.4 15 6 12 3.9" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M18.4 3.8c1-1.1 2.7-1.1 3.6.3-1.5.5-2.5.4-3.6-.3z"/></svg>';

  var EMPTY={
    want:{h:"Пока пусто",p:"Нажми «Хочу!» внизу и добавь своё первое желание."},
    thinking:{h:"Раздел «Думаю»",p:"Сюда попадают желания, в которых ты не уверен. Нажми «Передумал» на карточке."},
    bought:{h:"Раздел «Купил»",p:"Сюда попадают купленные желания. Отметь «Куплено» на карточке."}
  };
  var HL={ created:{t:"Добавлено",e:"➕"}, changed_mind:{t:"Передумал",e:"🤔"}, purchased:{t:"Куплено",e:"🎉"}, back_to_want:{t:"Снова хочу",e:"↩️"}, edited:{t:"Изменено",e:"✏️"} };

  var STORAGE_KEY="robtop_wishlist_v1";
  var sdk=null, root=null, demo=true, fabCtl=null, ovWrap=null, onKey=null;
  var state={items:[],events:[]};
  var currentTab="want", editingId=null, formPhoto=null, pendingPurchaseId=null, detailId=null, undoFn=null;
  var E={};

  /* ----- helpers ----- */
  function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
  function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];}); }
  function normUrl(u){ u=(u||"").trim(); if(!u) return ""; if(!/^https?:\/\//i.test(u)) u="https://"+u; return u; }
  function fmtDate(ts){ try{ return new Intl.DateTimeFormat("ru-RU",{day:"numeric",month:"long"}).format(new Date(ts)); }catch(e){ return ""; } }
  function daysBetween(a,b){ return Math.max(0,Math.round((b-a)/86400000)); }
  function plural(n,one,few,many){ var m=Math.abs(n)%100,m1=m%10; if(m>10&&m<20) return many; if(m1>1&&m1<5) return few; if(m1===1) return one; return many; }
  function findItem(id){ for(var i=0;i<state.items.length;i++){ if(state.items[i].id===id) return state.items[i]; } return null; }
  function findIdx(id){ for(var i=0;i<state.items.length;i++){ if(state.items[i].id===id) return i; } return -1; }

  /* ----- storage (demo) ----- */
  function load(){ try{ var r=localStorage.getItem(STORAGE_KEY); if(r) return JSON.parse(r); }catch(e){} return null; }
  function save(){ try{ localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); }catch(e){} }
  function logEvent(type,payload){ state.events.push({id:uid(),type:type,payload:payload||{},at:Date.now()}); if(state.events.length>800) state.events.splice(0,state.events.length-800); }

  /* ----- per-item history ----- */
  function pushHistory(item,type){ if(!item.history) item.history=[]; item.history.push({type:type,at:Date.now()}); logEvent(type,{itemId:item.id,title:item.title}); }
  function itemCounts(item){
    var c={created:0,changedMind:0,purchased:0,returned:0,edited:0};
    (item.history||[]).forEach(function(h){
      if(h.type==="changed_mind")c.changedMind++; else if(h.type==="purchased")c.purchased++;
      else if(h.type==="back_to_want")c.returned++; else if(h.type==="edited")c.edited++; else if(h.type==="created")c.created++;
    });
    return c;
  }

  /* ----- seed / normalize ----- */
  function seed(){
    var now=Date.now(),d=86400000,h=3600000;
    return { version:2, items:[
      {id:uid(),title:"Конструктор LEGO Технік",link:"https://www.lego.com",photo:null,icon:"🧱",note:"Буду строить роботов и машины",favorite:false,status:"want",createdAt:now-6*d,updatedAt:now-3*d,boughtAt:null,
        history:[{type:"created",at:now-6*d},{type:"changed_mind",at:now-4*d},{type:"back_to_want",at:now-3*d}]},
      {id:uid(),title:"Самокат трюковой",link:"",photo:null,icon:"🛴",note:"",favorite:true,status:"want",createdAt:now-1*d,updatedAt:now-1*d,boughtAt:null,
        history:[{type:"created",at:now-1*d}]},
      {id:uid(),title:"Книга про динозавров",link:"",photo:null,icon:"🦕",note:"",favorite:false,status:"want",createdAt:now-5*h,updatedAt:now-5*h,boughtAt:null,
        history:[{type:"created",at:now-5*h}]},
      {id:uid(),title:"Беспроводные наушники",link:"",photo:null,icon:"🎧",note:"Слушать музыку на улице",favorite:false,status:"thinking",createdAt:now-3*d,updatedAt:now-12*h,boughtAt:null,
        history:[{type:"created",at:now-3*d},{type:"changed_mind",at:now-12*h}]},
      {id:uid(),title:"Футбольный мяч",link:"",photo:null,icon:"⚽",note:"",favorite:false,status:"bought",createdAt:now-9*d,updatedAt:now-4*d,boughtAt:now-4*d,
        history:[{type:"created",at:now-9*d},{type:"purchased",at:now-6*d},{type:"back_to_want",at:now-5*d},{type:"purchased",at:now-4*d}]}
    ], events:[] };
  }
  function normalize(s){
    if(!s.items) s.items=[]; if(!s.events) s.events=[];
    s.items.forEach(function(it){
      if(typeof it.favorite!=="boolean") it.favorite=false;
      if(it.note==null) it.note="";
      if(!Array.isArray(it.history)){
        it.history=[{type:"created",at:it.createdAt||Date.now()}];
        if(it.boughtAt) it.history.push({type:"purchased",at:it.boughtAt});
      }
    });
    s.version=2; return s;
  }

  /* ----- server bridge (через sdk) ----- */
  function commit(action){ if(demo){ save(); return; } sdk.api.post("action.php",action).catch(function(){ sdk.ui.toast("Нет связи с сервером — изменение не сохранено"); }); }
  function undoCommit(snap,undoType){ if(demo){ save(); return; } var it=snap.data; sdk.api.post("action.php",{type:"undo",itemId:it.id,data:{undoType:undoType,status:it.status,favorite:!!it.favorite,boughtAt:it.boughtAt||null,deleted:false}}).catch(function(){}); }
  function track(type,itemId,data){ if(demo) return; sdk.api.post("action.php",{type:type,itemId:itemId||null,data:data||null}).catch(function(){}); }

  /* ----- counts & hud ----- */
  function counts(){ var c={want:0,thinking:0,bought:0}; state.items.forEach(function(i){ if(c[i.status]!=null) c[i.status]++; }); return c; }
  function updateHud(){ var c=counts(),total=c.want+c.thinking+c.bought; sdk.ui.hud({left:'хочу: <b>'+c.want+'</b>', cNum:total, cLbl:"желаний", rNum:c.bought, rLbl:"куплено"}); }

  /* ----- cards ----- */
  function cardImage(item){
    if(item.photo) return '<div class="card-img" style="background-image:url(\''+item.photo+'\')"></div>';
    var inner=item.icon?'<span class="ph-emoji">'+item.icon+'</span>':'<span class="ph-cherry">'+IC.cherry+'</span>';
    return '<div class="card-img placeholder">'+inner+'</div>';
  }
  function actionsFor(item){
    var id=item.id;
    if(item.status==="want") return '<button class="btn btn-bought" data-action="bought" data-id="'+id+'">'+IC.check+' Куплено</button><button class="btn btn-think" data-action="thinking" data-id="'+id+'">'+IC.think+' Передумал</button>';
    if(item.status==="thinking") return '<button class="btn btn-want" data-action="want" data-id="'+id+'">'+IC.heart+' Хочу!</button><button class="btn btn-bought" data-action="bought" data-id="'+id+'">'+IC.check+' Куплено</button>';
    return '<button class="btn btn-ghost" data-action="want" data-id="'+id+'">'+IC.back2+' Снова хочу</button>';
  }
  function cardHTML(item){
    var co=itemCounts(item),chips="";
    if(co.changedMind>0) chips+='<span class="chip mind">'+IC.think+' передумал ×'+co.changedMind+'</span>';
    if(co.purchased>0) chips+='<span class="chip buy">'+IC.check+' куплено ×'+co.purchased+'</span>';
    if(item.status==="bought"&&item.boughtAt){ var dd=daysBetween(item.createdAt,item.boughtAt); chips+='<span class="chip time">'+IC.clock+' за '+dd+' '+plural(dd,"день","дня","дней")+'</span>'; }
    var chipsHTML=chips?'<div class="chips">'+chips+'</div>':"";
    var notePrev=item.note?'<div class="note-prev">'+esc(item.note)+'</div>':"";
    var link=normUrl(item.link);
    var linkHTML=link?'<a class="card-link" href="'+esc(link)+'" target="_blank" rel="noopener">'+IC.link+' Открыть ссылку</a>':"";
    var boughtBadge=item.status==="bought"?'<div class="bought-badge">'+IC.badge+' Куплено</div>':"";
    return '<article class="card'+(item.status==="bought"?" shine":"")+'" data-id="'+item.id+'">'
      +cardImage(item)+boughtBadge
      +'<button class="fav-btn'+(item.favorite?" on":"")+'" data-action="fav" data-id="'+item.id+'" aria-label="Очень хочу">'+(item.favorite?IC.star:IC.starO)+'</button>'
      +'<div class="card-body"><h3 class="card-title">'+esc(item.title)+'</h3>'+chipsHTML+notePrev+linkHTML
      +'<div class="card-actions">'+actionsFor(item)+'</div></div></article>';
  }
  function render(){
    var c=counts();
    ["want","thinking","bought"].forEach(function(k){ var b=E.tabs.querySelector('[data-count="'+k+'"]'); if(b) b.textContent=c[k]; });
    Array.prototype.forEach.call(E.tabs.querySelectorAll(".tab"),function(t){ t.classList.toggle("active",t.getAttribute("data-tab")===currentTab); });
    var items=state.items.filter(function(i){ return i.status===currentTab; });
    if(currentTab==="want") items.sort(function(a,b){ if((b.favorite?1:0)!==(a.favorite?1:0)) return (b.favorite?1:0)-(a.favorite?1:0); return b.updatedAt-a.updatedAt; });
    else if(currentTab==="bought") items.sort(function(a,b){ return (b.boughtAt||b.updatedAt)-(a.boughtAt||a.updatedAt); });
    else items.sort(function(a,b){ return b.updatedAt-a.updatedAt; });
    if(!items.length){ var e=EMPTY[currentTab]; E.list.innerHTML='<div class="empty"><div class="empty-ic">'+IC.cherry+'</div><h3>'+e.h+'</h3><p>'+e.p+'</p></div>'; }
    else E.list.innerHTML=items.map(cardHTML).join("");
    updateHud();
  }
  function setTab(t){ currentTab=t; E.wl.setAttribute("data-tab",t); render(); }

  /* ----- actions ----- */
  function handleAction(action,id){
    if(action==="fav") return toggleFav(id);
    if(action==="bought") return confirmPurchase(id);
    if(action==="thinking") return moveItem(id,"thinking");
    if(action==="want") return moveItem(id,"want");
    if(action==="edit") return openEdit(id);
    if(action==="delete") return deleteItem(id);
    if(action==="detail") return openDetail(id);
  }
  function toggleFav(id){ var it=findItem(id); if(!it) return; it.favorite=!it.favorite; it.updatedAt=Date.now(); commit({type:"favorite",itemId:id,data:{on:it.favorite}}); render(); if(detailId===id) renderDetail(id); sdk.ui.haptics(8); }

  function snapshot(item){ return {idx:findIdx(item.id),data:JSON.parse(JSON.stringify(item))}; }
  function restore(s){ var i=findIdx(s.data.id); if(i>=0) state.items[i]=s.data; else state.items.splice(Math.min(s.idx,state.items.length),0,s.data); if(demo) save(); render(); }

  function moveItem(id,to){
    var item=findItem(id); if(!item||item.status===to) return;
    var snap=snapshot(item),from=item.status;
    item.status=to; item.updatedAt=Date.now();
    if(from==="bought"&&to!=="bought") item.boughtAt=null;
    var act=(to==="thinking"?"changed_mind":"back_to_want");
    pushHistory(item, act);
    commit({type:act,itemId:id}); if(detailId===id) closeDetail(); render();
    var msg=to==="thinking"?"Перенесено в «Думаю»":"Снова в «Хочу»!";
    undoFn=function(){ restore(snap); undoCommit(snap,act); }; sdk.ui.toast(msg,"Отменить",undoFn); sdk.ui.haptics(8);
  }
  function deleteItem(id){
    var idx=findIdx(id); if(idx<0) return; var item=state.items[idx];
    var snap={idx:idx,data:JSON.parse(JSON.stringify(item))};
    state.items.splice(idx,1);
    commit({type:"delete",itemId:id}); if(detailId===id) closeDetail(); render();
    undoFn=function(){ restore(snap); undoCommit(snap,"deleted"); }; sdk.ui.toast("Желание удалено","Отменить",undoFn); sdk.ui.haptics(12);
  }

  /* ----- purchase (double confirm + celebration) ----- */
  function confirmPurchase(id){
    var item=findItem(id); if(!item) return; pendingPurchaseId=id;
    var pb=E.purchaseBody;
    var media=item.photo?'<div style="width:64px;height:64px;border-radius:16px;background-size:cover;background-position:center;margin:0 auto 6px;background-image:url(\''+item.photo+'\')"></div>':'<div class="pc-emoji">'+(item.icon||"🎉")+'</div>';
    pb.innerHTML=media
      +'<div class="pc-q">Точно купили?</div>'
      +'<div class="pc-name">'+esc(item.title)+'</div>'
      +'<div class="sheet-actions"><button class="btn btn-cancel" id="wlPcNo">Ещё нет</button><button class="btn btn-celebrate" id="wlPcYes">Да, купили! 🎉</button></div>';
    E.purchaseOverlay.classList.add("show");
    var armed=false,armT=null,yes=pb.querySelector("#wlPcYes"),q=pb.querySelector(".pc-q");
    pb.querySelector("#wlPcNo").onclick=closePurchase;
    yes.onclick=function(){
      if(!armed){ armed=true; yes.textContent="Точно? Нажми ещё раз ✅"; yes.classList.add("armed"); q.textContent="Подтверди покупку ещё раз"; sdk.ui.haptics(12);
        clearTimeout(armT); armT=setTimeout(function(){ armed=false; yes.textContent="Да, купили! 🎉"; yes.classList.remove("armed"); q.textContent="Точно купили?"; },4000); return; }
      clearTimeout(armT); doPurchase(pendingPurchaseId);
    };
  }
  function closePurchase(){ E.purchaseOverlay.classList.remove("show"); pendingPurchaseId=null; }
  function doPurchase(id){
    var item=findItem(id); if(!item) return;
    item.status="bought"; item.boughtAt=Date.now(); item.updatedAt=Date.now();
    pushHistory(item,"purchased");
    commit({type:"purchased",itemId:id}); closePurchase(); closeDetail(); setTab("bought");
    sdk.ui.confetti(); sdk.ui.chime(); sdk.ui.haptics([25,40,25,40,70]);
    sdk.ui.toast("Поздравляю! Желание исполнилось 🎉");
  }

  /* ----- detail sheet ----- */
  function renderDetail(id){
    var item=findItem(id); if(!item) return;
    var co=itemCounts(item);
    var link=normUrl(item.link);
    var counts4=''
      +'<div class="dstat mind'+(co.changedMind?'':' zero')+'"><div class="n">'+co.changedMind+'</div><div class="l">раз передумал</div></div>'
      +'<div class="dstat buy'+(co.purchased?'':' zero')+'"><div class="n">'+co.purchased+'</div><div class="l">раз куплено</div></div>'
      +'<div class="dstat ret'+(co.returned?'':' zero')+'"><div class="n">'+co.returned+'</div><div class="l">раз вернул</div></div>'
      +'<div class="dstat edit'+(co.edited?'':' zero')+'"><div class="n">'+co.edited+'</div><div class="l">раз менял</div></div>';
    var hist=(item.history||[]).slice().sort(function(a,b){ return b.at-a.at; });
    var tl=hist.map(function(h){ var m=HL[h.type]||{t:h.type,e:"•"}; return '<div class="tl-row"><span class="tl-ic">'+m.e+'</span><span class="tl-tx">'+m.t+'</span><span class="tl-dt">'+fmtDate(h.at)+'</span></div>'; }).join("");
    var noteHTML=item.note?'<div class="d-note"><span class="lab">Почему хочу</span>'+esc(item.note)+'</div>':"";
    var linkHTML=link?'<a class="card-link" href="'+esc(link)+'" target="_blank" rel="noopener" style="margin-top:12px">'+IC.link+' Открыть ссылку</a>':"";
    E.detailBody.innerHTML=
      '<div class="d-media">'+cardImage(item)+(item.status==="bought"?'<div class="bought-badge">'+IC.badge+' Куплено</div>':"")+'</div>'
      +'<h2 class="d-title">'+esc(item.title)+'</h2>'
      +'<div class="d-row">'
      +'<button class="d-fav'+(item.favorite?" on":"")+'" data-action="fav" data-id="'+item.id+'">'+(item.favorite?IC.star:IC.starO)+(item.favorite?" Очень хочу":" Отметить")+'</button>'
      +'<button class="d-fav" data-action="edit" data-id="'+item.id+'">'+IC.edit+' Изменить</button>'
      +'</div>'
      +noteHTML+linkHTML
      +'<div class="d-sec-title">'+IC.clock+' История желания</div>'
      +'<div class="dgrid">'+counts4+'</div>'
      +'<div class="tl" style="margin-top:12px">'+tl+'</div>'
      +'<div class="card-actions" style="margin-top:18px">'+actionsFor(item)+'</div>'
      +'<div class="sheet-actions" style="margin-top:10px"><button class="btn btn-danger" data-action="delete" data-id="'+item.id+'">'+IC.trash+' Удалить</button></div>';
  }
  function openDetail(id){ detailId=id; renderDetail(id); E.detailOverlay.classList.add("show"); track("viewed_detail",id,null); }
  function closeDetail(){ E.detailOverlay.classList.remove("show"); detailId=null; }

  /* ----- stats sheet ----- */
  function aggregate(){
    var t={total:state.items.length,boughtNow:0,purchases:0,changedMind:0,favorites:0,sumDays:0,nDays:0,fickle:null};
    state.items.forEach(function(it){
      var c=itemCounts(it);
      if(it.status==="bought") t.boughtNow++;
      t.purchases+=c.purchased; t.changedMind+=c.changedMind; if(it.favorite) t.favorites++;
      if(it.status==="bought"&&it.boughtAt){ t.sumDays+=daysBetween(it.createdAt,it.boughtAt); t.nDays++; }
      if(c.changedMind>0&&(!t.fickle||c.changedMind>t.fickle.n)) t.fickle={name:it.title,n:c.changedMind};
    });
    t.avgDays=t.nDays?Math.round(t.sumDays/t.nDays):null; return t;
  }
  function openStats(){
    track("viewed_stats",null,null);
    var a=aggregate();
    var html='<div class="sgrid">'
      +'<div class="scard c1"><div class="n">'+a.total+'</div><div class="l">всего желаний</div></div>'
      +'<div class="scard c2"><div class="n">'+a.boughtNow+'</div><div class="l">исполнено сейчас</div></div>'
      +'<div class="scard c2"><div class="n">'+a.purchases+'</div><div class="l">всего покупок</div></div>'
      +'<div class="scard c3"><div class="n">'+a.changedMind+'</div><div class="l">раз передумал</div></div>'
      +'<div class="scard c4"><div class="n">'+a.favorites+'</div><div class="l">★ очень хочу</div></div>'
      +'<div class="scard c2"><div class="n">'+(a.avgDays==null?"—":a.avgDays)+'</div><div class="l">ср. дней до покупки</div></div>'
      +'</div>';
    if(a.fickle) html+='<div class="sline">Самое непостоянное желание: <b>'+esc(a.fickle.name)+'</b> (передумал ×'+a.fickle.n+')</div>';
    E.statsBody.innerHTML=html;
    E.statsOverlay.classList.add("show");
  }

  /* ----- add/edit sheet ----- */
  function showPreview(src){ if(src){ E.photoPick.classList.add("has-photo"); E.ppreview.style.backgroundImage="url('"+src+"')"; } else { E.photoPick.classList.remove("has-photo"); E.ppreview.style.backgroundImage=""; } }
  function setFormPhoto(d){ formPhoto=d||null; showPreview(formPhoto); }
  function uploadPhoto(dataUrl){
    E.photoPick.classList.add("uploading");
    sdk.media.upload(dataUrl,"wishlist").then(function(res){ E.photoPick.classList.remove("uploading"); if(res&&res.path){ formPhoto=res.path; } else { formPhoto=null; sdk.ui.toast("Не удалось загрузить фото"); } }).catch(function(){ E.photoPick.classList.remove("uploading"); formPhoto=null; sdk.ui.toast("Не удалось загрузить фото (нет связи)"); });
  }
  function openAdd(){ editingId=null; E.sheetTitle.textContent="Новое желание"; E.title.value=""; E.link.value=""; E.note.value=""; setFormPhoto(null); E.overlay.classList.add("show"); setTimeout(function(){ E.title.focus(); },250); }
  function openEdit(id){ var it=findItem(id); if(!it) return; closeDetail(); editingId=id; E.sheetTitle.textContent="Изменить желание"; E.title.value=it.title||""; E.link.value=it.link||""; E.note.value=it.note||""; setFormPhoto(it.photo||null); E.overlay.classList.add("show"); }
  function closeSheet(){ E.overlay.classList.remove("show"); }
  function saveSheet(){
    var title=E.title.value.trim();
    if(!title){ E.title.focus(); E.title.style.borderColor="#ff3db0"; sdk.ui.toast("Напиши название желания"); return; }
    var link=E.link.value.trim(),note=E.note.value.trim();
    if(editingId){
      var it=findItem(editingId);
      if(it){ it.title=title; it.link=link; it.note=note; it.photo=formPhoto; if(formPhoto) it.icon=null; it.updatedAt=Date.now(); pushHistory(it,"edited"); commit({type:"edited",itemId:editingId,data:{title:title,note:note,link:link,photo:formPhoto,icon:it.icon}}); }
      render(); closeSheet(); sdk.ui.toast("Сохранено");
    }else if(demo){
      var now=Date.now(),neu={id:uid(),title:title,link:link,note:note,photo:formPhoto,icon:null,favorite:false,status:"want",createdAt:now,updatedAt:now,boughtAt:null,history:[{type:"created",at:now}]};
      state.items.push(neu); logEvent("created",{itemId:neu.id,title:title});
      save(); closeSheet(); setTab("want"); sdk.ui.toast("Желание добавлено! 🍒");
    }else{
      closeSheet();
      sdk.api.post("action.php",{type:"create",data:{title:title,note:note,link:link,photo:formPhoto,icon:null}})
        .then(function(res){ if(res&&res.item){ state.items.push(res.item); setTab("want"); sdk.ui.toast("Желание добавлено! 🍒"); } else sdk.ui.toast("Не удалось добавить"); })
        .catch(function(){ sdk.ui.toast("Не удалось добавить (нет связи)"); });
    }
  }
  function handleFile(file){
    if(!file) return; var reader=new FileReader();
    reader.onload=function(ev){ var img=new Image();
      img.onload=function(){ var max=900,w=img.width,h=img.height; if(w>h&&w>max){ h=Math.round(h*max/w); w=max; } else if(h>=w&&h>max){ w=Math.round(w*max/h); h=max; }
        var dataUrl; try{ var cv=document.createElement("canvas"); cv.width=w; cv.height=h; cv.getContext("2d").drawImage(img,0,0,w,h); dataUrl=cv.toDataURL("image/jpeg",0.82); }catch(e){ dataUrl=ev.target.result; }
        showPreview(dataUrl); if(demo){ formPhoto=dataUrl; } else { uploadPhoto(dataUrl); } };
      img.onerror=function(){ var du=ev.target.result; showPreview(du); if(demo){ formPhoto=du; } else { uploadPhoto(du); } }; img.src=ev.target.result; };
    reader.readAsDataURL(file);
  }

  /* ----- DOM build ----- */
  function rootHTML(){
    return '<div class="wl" data-tab="want">'
      +'<div class="wl-header">'
        +'<button class="back" id="wlBack" aria-label="Назад">'+BACK_IC+'</button>'
        +'<div class="wl-head-main"><div class="wl-title"><span class="cic">'+TITLE_CHERRY+'</span> Виш-лист</div><div class="wl-sub">Список моих желаний</div></div>'
        +'<button class="hbtn" id="wlStats" aria-label="Статистика">'+STATS_IC+'</button>'
      +'</div>'
      +'<nav class="tabs" id="wlTabs">'
        +'<button class="tab active" data-tab="want"><span class="t-label"><span class="dot"></span>Хочу</span><span class="badge" data-count="want">0</span></button>'
        +'<button class="tab" data-tab="thinking"><span class="t-label"><span class="dot"></span>Думаю</span><span class="badge" data-count="thinking">0</span></button>'
        +'<button class="tab" data-tab="bought"><span class="t-label"><span class="dot"></span>Купил</span><span class="badge" data-count="bought">0</span></button>'
      +'</nav>'
      +'<main class="list" id="wlList" aria-live="polite"></main>'
    +'</div>';
  }
  function overlaysHTML(){
    return ''
    +'<div class="overlay" id="wlOverlay"><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="wlSheetTitle">'
      +'<div class="grip"></div><h2 id="wlSheetTitle">Новое желание</h2>'
      +'<div class="photo-pick" id="wlPhotoPick"><div class="ppreview" id="wlPpreview"></div>'
        +'<svg viewBox="0 0 24 24" fill="none" stroke="#ff7ab8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h3l2-3h8l2 3h3v13H3z"/><circle cx="12" cy="13" r="4"/></svg>'
        +'<span>Добавить фото</span><span class="pp-edit">Заменить фото</span></div>'
      +'<input type="file" id="wlPhotoInput" accept="image/*" hidden>'
      +'<div class="field"><label for="wlTitle">Название</label><input id="wlTitle" type="text" maxlength="60" placeholder="Например: Конструктор LEGO" autocomplete="off"></div>'
      +'<div class="field"><label for="wlNote">Почему хочешь? <span class="opt">(необязательно)</span></label><textarea id="wlNote" maxlength="200" placeholder="Например: буду строить роботов"></textarea></div>'
      +'<div class="field"><label for="wlLink">Ссылка <span class="opt">(необязательно)</span></label><input id="wlLink" type="text" inputmode="url" placeholder="https://..." autocomplete="off"></div>'
      +'<div class="sheet-actions"><button class="btn btn-cancel" id="wlCancel">Отмена</button><button class="btn btn-primary" id="wlSave">Сохранить</button></div>'
    +'</div></div>'
    +'<div class="overlay" id="wlDetailOverlay"><div class="sheet detail" role="dialog" aria-modal="true"><div class="grip"></div><div id="wlDetailBody"></div></div></div>'
    +'<div class="overlay" id="wlPurchaseOverlay"><div class="sheet purchase" role="dialog" aria-modal="true"><div class="grip"></div><div id="wlPurchaseBody"></div></div></div>'
    +'<div class="overlay" id="wlStatsOverlay"><div class="sheet stats" role="dialog" aria-modal="true"><div class="grip"></div><h2>Статистика желаний</h2><div id="wlStatsBody"></div><div class="sheet-actions"><button class="btn btn-cancel" id="wlStatsClose" style="flex:1">Закрыть</button></div></div></div>';
  }

  function grab(){
    E.wl=root.querySelector(".wl");
    E.tabs=root.querySelector("#wlTabs");
    E.list=root.querySelector("#wlList");
    E.overlay=ovWrap.querySelector("#wlOverlay");
    E.photoPick=ovWrap.querySelector("#wlPhotoPick");
    E.ppreview=ovWrap.querySelector("#wlPpreview");
    E.photoInput=ovWrap.querySelector("#wlPhotoInput");
    E.title=ovWrap.querySelector("#wlTitle");
    E.note=ovWrap.querySelector("#wlNote");
    E.link=ovWrap.querySelector("#wlLink");
    E.sheetTitle=ovWrap.querySelector("#wlSheetTitle");
    E.detailOverlay=ovWrap.querySelector("#wlDetailOverlay");
    E.detailBody=ovWrap.querySelector("#wlDetailBody");
    E.purchaseOverlay=ovWrap.querySelector("#wlPurchaseOverlay");
    E.purchaseBody=ovWrap.querySelector("#wlPurchaseBody");
    E.statsOverlay=ovWrap.querySelector("#wlStatsOverlay");
    E.statsBody=ovWrap.querySelector("#wlStatsBody");
  }
  function wire(){
    root.querySelector("#wlBack").addEventListener("click",function(){ sdk.ui.back(); });
    root.querySelector("#wlStats").addEventListener("click",openStats);
    E.tabs.addEventListener("click",function(e){ var t=e.target.closest(".tab"); if(t) setTab(t.getAttribute("data-tab")); });
    E.list.addEventListener("click",function(e){
      var btn=e.target.closest("[data-action]");
      if(btn){ handleAction(btn.getAttribute("data-action"),btn.getAttribute("data-id")); return; }
      if(e.target.closest("a")) return;
      var card=e.target.closest(".card"); if(card) openDetail(card.getAttribute("data-id"));
    });
    E.detailBody.addEventListener("click",function(e){ var btn=e.target.closest("[data-action]"); if(btn) handleAction(btn.getAttribute("data-action"),btn.getAttribute("data-id")); });
    ovWrap.querySelector("#wlSave").addEventListener("click",saveSheet);
    ovWrap.querySelector("#wlCancel").addEventListener("click",closeSheet);
    ovWrap.querySelector("#wlStatsClose").addEventListener("click",function(){ E.statsOverlay.classList.remove("show"); });
    E.overlay.addEventListener("click",function(e){ if(e.target===E.overlay) closeSheet(); });
    E.detailOverlay.addEventListener("click",function(e){ if(e.target===E.detailOverlay) closeDetail(); });
    E.purchaseOverlay.addEventListener("click",function(e){ if(e.target===E.purchaseOverlay) closePurchase(); });
    E.statsOverlay.addEventListener("click",function(e){ if(e.target===E.statsOverlay) E.statsOverlay.classList.remove("show"); });
    E.photoPick.addEventListener("click",function(){ E.photoInput.click(); });
    E.photoInput.addEventListener("change",function(e){ handleFile(e.target.files[0]); E.photoInput.value=""; });
    E.title.addEventListener("input",function(){ E.title.style.borderColor=""; });
    onKey=function(e){ if(e.key==="Escape"){ closeSheet(); closeDetail(); closePurchase(); E.statsOverlay.classList.remove("show"); } };
    document.addEventListener("keydown",onKey);
    [[E.overlay,closeSheet],[E.detailOverlay,closeDetail],[E.purchaseOverlay,closePurchase],[E.statsOverlay,function(){ E.statsOverlay.classList.remove("show"); }]].forEach(function(p){
      var ov=p[0],close=p[1],sheet=ov&&ov.querySelector(".sheet"); if(!sheet) return;
      var grip=sheet.querySelector(".grip"); if(grip) grip.addEventListener("click",close); sdk.ui.enableDrag(sheet,close);
    });
  }

  /* ----- boot ----- */
  function demoBoot(msg){ demo=true; var s=normalize(load()||seed()); state.items=s.items; state.events=s.events||[]; save(); render(); if(msg) sdk.ui.toast(msg); }
  function boot(){
    if(sdk.isDemo()){ demoBoot(); return; }
    sdk.api.get("state.php").then(function(res){ demo=false; state.items=(res&&res.items)||[]; state.events=[]; render(); track("opened_app",null,null); })
      .catch(function(){ if(window.RobTop&&window.RobTop._shell&&window.RobTop._shell.setDemo) window.RobTop._shell.setDemo(true); demoBoot("Демо-режим: сервер недоступен"); });
  }

  function mount(rootEl, theSdk){
    sdk=theSdk; root=rootEl;
    currentTab="want"; editingId=null; formPhoto=null; pendingPurchaseId=null; detailId=null; undoFn=null; state={items:[],events:[]};
    root.innerHTML=rootHTML();
    ovWrap=document.createElement("div"); ovWrap.className="wl-overlays"; ovWrap.innerHTML=overlaysHTML(); document.body.appendChild(ovWrap);
    grab(); wire();
    fabCtl=sdk.ui.fab("Хочу!", openAdd);
    boot();
  }
  function unmount(){
    if(onKey){ document.removeEventListener("keydown",onKey); onKey=null; }
    if(ovWrap&&ovWrap.parentNode){ ovWrap.parentNode.removeChild(ovWrap); } ovWrap=null;
    E={}; state={items:[],events:[]};
  }

  RobTop.register({ id:"wishlist", mount:mount, unmount:unmount });
})();
