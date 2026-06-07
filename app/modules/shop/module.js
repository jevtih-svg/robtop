/* RobTop — модуль «Магазин». Призы от родителей за пункты копилки.
   Родитель выставляет товары (название, цена, фото-«картина»); ребёнок покупает в любой момент:
   пункты списываются СРАЗУ (sdk.points.add(-цена,"spend"), канон ГАЙД-очки.md), заказ уходит
   родителю на подтверждение. Родитель «✓ Вручить» = ребёнок получил приз (один шаг, решение
   Джеффа 2026-06-07) или «↩ Вернуть» = автовозврат пунктов отдельной строкой spend_refund.
   Купить при нехватке пунктов нельзя (кнопка неактивна, видно сколько не хватает).
   Покупки копятся в карточке-корзинке в правом нижнем углу (бейдж = ждущие заказы).
   Только пункты — «лайки» сознательно не делаются (валюта не определена, §7 КОНТЕКСТ.md). */
(function(){
  "use strict";

  var MESSAGES={
    en:{ shop:{
      title:"Shop", subtitle:"Prizes from your parents for points",
      hudPts:"points", hudBuys:"purchases",
      emptyChild:"No prizes yet — parents will add some soon!",
      emptyParent:"Add the first prize — the child will see it right away",
      btnAddItem:"+ New prize",
      btnBuy:"Buy", lack:"need {n} more",
      confirmBuy:"Buy “{t}” for {n} points?", btnConfirm:"Buy!",
      sentToast:"Sent to parents! Points are taken",
      ordersTitle:"My purchases", ordersEmpty:"Nothing bought yet",
      ordersA11y:"My purchases",
      stPending:"waiting for parents ⏳", stApproved:"received 🎁", stDeclined:"returned ↩",
      approveBtn:"✓ Give", declineBtn:"↩ Return points",
      approvedToast:"Given! 🎁", declinedToast:"Returned, points are back",
      giftToast:"Your prize “{t}” is yours! 🎁",
      newItem:"New prize", editItem:"Edit prize",
      itemTitlePh:"Prize name", itemPriceLbl:"Price in points",
      addPhoto:"Add photo", replacePhoto:"Replace photo", photoFailed:"Couldn't upload photo",
      deleteItem:"Delete prize", confirmDelItem:"Delete the prize “{t}”?",
      needTitle:"Write the prize name first", needPrice:"Enter a price first",
      loadFail:"Could not load the shop", retry:"Try again"
    }, bank:{ r_spend_refund:"Shop — points returned" }},
    ru:{ shop:{
      title:"Магазин", subtitle:"Призы от родителей за пункты",
      hudPts:"пунктов", hudBuys:"покупок",
      emptyChild:"Призов пока нет — родители скоро добавят!",
      emptyParent:"Добавь первый приз — ребёнок сразу его увидит",
      btnAddItem:"+ Новый приз",
      btnBuy:"Купить", lack:"не хватает {n}",
      confirmBuy:"Купить «{t}» за {n} пунктов?", btnConfirm:"Покупаю!",
      sentToast:"Отправлено родителям! Пункты списаны",
      ordersTitle:"Мои покупки", ordersEmpty:"Пока ничего не куплено",
      ordersA11y:"Мои покупки",
      stPending:"ждёт родителей ⏳", stApproved:"получено 🎁", stDeclined:"возврат ↩",
      approveBtn:"✓ Вручить", declineBtn:"↩ Вернуть пункты",
      approvedToast:"Вручено! 🎁", declinedToast:"Возвращено, пункты вернулись",
      giftToast:"Твой приз «{t}» вручён! 🎁",
      newItem:"Новый приз", editItem:"Изменить приз",
      itemTitlePh:"Название приза", itemPriceLbl:"Цена в пунктах",
      addPhoto:"Добавить фото", replacePhoto:"Заменить фото", photoFailed:"Не удалось загрузить фото",
      deleteItem:"Удалить приз", confirmDelItem:"Удалить приз «{t}»?",
      needTitle:"Сначала напиши название", needPrice:"Сначала укажи цену",
      loadFail:"Не получилось загрузить магазин", retry:"Попробовать ещё"
    }, bank:{ r_spend_refund:"Магазин — возврат пунктов" }},
    lv:{ shop:{
      title:"Veikals", subtitle:"Vecāku balvas par punktiem",
      hudPts:"punkti", hudBuys:"pirkumi",
      emptyChild:"Balvu vēl nav — vecāki drīz pievienos!",
      emptyParent:"Pievieno pirmo balvu — bērns to uzreiz redzēs",
      btnAddItem:"+ Jauna balva",
      btnBuy:"Pirkt", lack:"pietrūkst {n}",
      confirmBuy:"Pirkt “{t}” par {n} punktiem?", btnConfirm:"Pērku!",
      sentToast:"Nosūtīts vecākiem! Punkti noņemti",
      ordersTitle:"Mani pirkumi", ordersEmpty:"Vēl nekas nav nopirkts",
      ordersA11y:"Mani pirkumi",
      stPending:"gaida vecākus ⏳", stApproved:"saņemts 🎁", stDeclined:"atgriezts ↩",
      approveBtn:"✓ Pasniegt", declineBtn:"↩ Atgriezt punktus",
      approvedToast:"Pasniegts! 🎁", declinedToast:"Atgriezts, punkti ir atpakaļ",
      giftToast:"Tava balva “{t}” ir pasniegta! 🎁",
      newItem:"Jauna balva", editItem:"Mainīt balvu",
      itemTitlePh:"Balvas nosaukums", itemPriceLbl:"Cena punktos",
      addPhoto:"Pievienot foto", replacePhoto:"Mainīt foto", photoFailed:"Neizdevās augšupielādēt foto",
      deleteItem:"Dzēst balvu", confirmDelItem:"Dzēst balvu “{t}”?",
      needTitle:"Vispirms uzraksti nosaukumu", needPrice:"Vispirms norādi cenu",
      loadFail:"Neizdevās ielādēt veikalu", retry:"Mēģināt vēlreiz"
    }, bank:{ r_spend_refund:"Veikals — punkti atgriezti" }}
  };

  var BACK_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
  var BAG_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h12l-1 12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 8z"/><path d="M9 10V6a3 3 0 0 1 6 0v4"/></svg>';
  var COIN_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 8v8M8.8 12h6.4"/></svg>';
  var GIFT_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M4 12.5h16M12 9v11"/><path d="M12 9c-4 0-5.4-2-4.6-3.6C8.2 3.8 11 4.6 12 9zM12 9c4 0 5.4-2 4.6-3.6C15.8 3.8 13 4.6 12 9z"/></svg>';

  var sdk=null, root=null, alive=false, busy=false, curSheet=null;
  var E={};
  var S={ items:[], orders:[], balance:0, loaded:false, err:false };
  var prevSt=null; /* id заказа → статус с прошлой загрузки (тост «вручено» ребёнку) */

  function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]; }); }
  function t(k,p){ return sdk.t(k,p); }
  function isParent(){ return sdk.role==="parent" || sdk.isDemo(); }
  function isKid(){ return sdk.role!=="parent" || sdk.isDemo(); }
  function price(d){ var n=parseInt(d&&d.price,10); return n>0?n:0; }
  function fmtWhen(ts){
    if(!ts) return "";
    var d=new Date(ts), hh=d.getHours(), mm=d.getMinutes();
    return sdk.formatDate(ts,{day:"numeric",month:"short"})+" · "+hh+":"+(mm<10?"0":"")+mm;
  }

  /* ---------- данные ---------- */
  function load(){
    Promise.all([ sdk.data.list("items"), sdk.data.list("orders"), sdk.points.get() ]).then(function(rr){
      if(!alive) return;
      S.items=(rr[0]||[]).slice().sort(function(a,b){ return (b.createdAt||0)-(a.createdAt||0); });
      S.orders=(rr[1]||[]).slice().sort(function(a,b){ return (b.createdAt||0)-(a.createdAt||0); });
      S.balance=rr[2]||0; S.loaded=true; S.err=false;
      celebrate(); render();
    }).catch(function(){
      if(!alive) return;
      S.err=true; S.loaded=true; render();
    });
  }
  /* ребёнку — праздник, когда родитель вручил его заказ (pending → approved между загрузками) */
  function celebrate(){
    var cur={}, i, o;
    for(i=0;i<S.orders.length;i++){ o=S.orders[i]; cur[String(o.id)]=o.status; }
    if(prevSt && isKid() && !isParent()){
      for(i=0;i<S.orders.length;i++){
        o=S.orders[i];
        if(o.status==="approved" && prevSt[String(o.id)]==="pending"){
          sdk.ui.toast(t("giftToast",{t:(o.data&&o.data.title)||""}));
          sdk.ui.confetti(); sdk.ui.haptics("light"); sdk.ui.chime();
          break;
        }
      }
    }
    prevSt=cur;
  }
  function orderOf(id){
    for(var i=0;i<S.orders.length;i++) if(String(S.orders[i].id)===String(id)) return S.orders[i];
    return null;
  }
  function itemOf(id){
    for(var i=0;i<S.items.length;i++) if(String(S.items[i].id)===String(id)) return S.items[i];
    return null;
  }
  function pendingN(){
    var n=0, i;
    for(i=0;i<S.orders.length;i++) if(S.orders[i].status==="pending") n++;
    return n;
  }

  /* ---------- покупка (ребёнок) ---------- */
  function buyConfirm(it){
    var d=it.data||{}, p=price(d);
    if(busy || p<=0 || S.balance<p) return;
    var box=document.createElement("div");
    box.innerHTML='<h2>'+esc(t("confirmBuy",{t:d.title||"",n:p}))+'</h2>'
      +(d.photo?'<div class="sh-confirm-ph" style="background-image:url(\''+esc(d.photo)+'\')"></div>':"")
      +'<div class="sheet-actions"><button class="btn btn-cancel" data-close>'+esc(t("common.cancel"))+'</button>'
      +'<button class="btn btn-primary" id="shBuyGo">'+esc(t("btnConfirm"))+'</button></div>';
    var ctl=sdk.ui.sheet(box); curSheet=ctl;
    box.querySelector("[data-close]").onclick=function(){ ctl.close(); };
    box.querySelector("#shBuyGo").onclick=function(){ ctl.close(); buy(it); };
  }
  function buy(it){
    if(busy) return; busy=true;
    var d=it.data||{}, p=price(d);
    /* списание СРАЗУ (решение Джеффа): минус в леджер, затем заказ на подтверждение */
    sdk.points.add(-p,"spend",{kind:"spend",note:d.title||""}).then(function(out){
      if(!out || !out.ok){ busy=false; sdk.ui.toast(t("loadFail")); return; }
      sdk.data.create("orders",{ itemId:String(it.id), title:d.title||"", price:p,
        photo:d.photo||null, status:"pending" }).catch(function(){}).then(function(){
        busy=false;
        sdk.events.track("shop_buy",{title:d.title||"",price:p});
        sdk.ui.toast(t("sentToast")); sdk.ui.haptics("light"); sdk.ui.chime();
        load();
      });
    });
  }

  /* ---------- подтверждение (родитель) ---------- */
  function approveOrder(o){
    if(busy) return; busy=true;
    sdk.data.move("orders",o.id,"approved").then(function(){
      return sdk.data.update("orders",o.id,{approvedAt:Date.now()});
    }).then(function(){
      busy=false;
      sdk.events.track("shop_approve",{title:(o.data&&o.data.title)||"",price:price(o.data)});
      sdk.ui.toast(t("approvedToast")); sdk.ui.haptics("light");
      reopenOrders();
    }).catch(function(){ busy=false; sdk.ui.toast(t("loadFail")); load(); });
  }
  function declineOrder(o){
    if(busy) return; busy=true;
    var d=o.data||{}, p=price(d);
    /* автовозврат отдельной строкой леджера (транзакции не удаляются — канон) */
    sdk.points.add(p,"spend_refund",{kind:"spend",src:"shop",note:d.title||""}).then(function(out){
      if(!out || !out.ok){ busy=false; sdk.ui.toast(t("loadFail")); return; }
      sdk.data.move("orders",o.id,"declined").then(function(){
        return sdk.data.update("orders",o.id,{declinedAt:Date.now()});
      }).catch(function(){}).then(function(){
        busy=false;
        sdk.events.track("shop_decline",{title:d.title||"",price:p});
        sdk.ui.toast(t("declinedToast"));
        reopenOrders();
      });
    });
  }
  function reopenOrders(){ /* перерисовать открытую шторку покупок свежими данными */
    if(curSheet && curSheet.close){ try{ curSheet.close(); }catch(e){} curSheet=null; }
    Promise.all([ sdk.data.list("orders"), sdk.points.get() ]).then(function(rr){
      if(!alive) return;
      S.orders=(rr[0]||[]).slice().sort(function(a,b){ return (b.createdAt||0)-(a.createdAt||0); });
      S.balance=rr[1]||0;
      render(); openOrders();
    }).catch(function(){ if(alive) load(); });
  }

  /* ---------- шторка «Мои покупки» (карточка в правом нижнем углу) ---------- */
  function openOrders(){
    var isP=isParent();
    var rows=S.orders.slice();
    if(isP) rows.sort(function(a,b){ /* родителю ждущие — наверх */
      var wa=a.status==="pending"?0:1, wb=b.status==="pending"?0:1;
      return (wa-wb) || ((b.createdAt||0)-(a.createdAt||0));
    });
    var h='<h2>'+esc(t("ordersTitle"))+'</h2><div class="sh-orders">';
    if(!rows.length) h+='<p class="sh-empty">'+esc(t("ordersEmpty"))+'</p>';
    for(var i=0;i<rows.length && i<60;i++){
      var o=rows[i], d=o.data||{}, st=o.status||"pending";
      var chip = st==="approved" ? '<span class="sh-chip ok">'+esc(t("stApproved"))+'</span>'
               : st==="declined" ? '<span class="sh-chip no">'+esc(t("stDeclined"))+'</span>'
               : '<span class="sh-chip">'+esc(t("stPending"))+'</span>';
      var act="";
      if(isP && st==="pending"){
        act='<div class="sh-oact">'
          +'<button class="sh-obtn ok" data-act="ok" data-oid="'+esc(o.id)+'">'+esc(t("approveBtn"))+'</button>'
          +'<button class="sh-obtn no" data-act="no" data-oid="'+esc(o.id)+'">'+esc(t("declineBtn"))+'</button></div>';
      }
      h+='<div class="sh-order st-'+esc(st)+'">'
        +(d.photo?'<div class="sh-oph" style="background-image:url(\''+esc(d.photo)+'\')"></div>'
                 :'<div class="sh-oph none">'+GIFT_IC+'</div>')
        +'<div class="sh-omain"><div class="sh-ot">'+esc(d.title||"")+'</div>'
        +'<div class="sh-om">−'+price(d)+' · '+esc(fmtWhen(o.createdAt))+'</div>'+chip+'</div>'
        +act+'</div>';
    }
    h+='</div><div class="sheet-actions"><button class="btn btn-primary" data-close>'+esc(t("common.done"))+'</button></div>';
    var box=document.createElement("div");
    box.innerHTML=h;
    var ctl=sdk.ui.sheet(box); curSheet=ctl;
    box.querySelector("[data-close]").onclick=function(){ ctl.close(); };
    box.addEventListener("click",function(e){
      var b=e.target.closest("[data-act]"); if(!b) return;
      var o=orderOf(b.getAttribute("data-oid")); if(!o || o.status!=="pending") return;
      if(b.getAttribute("data-act")==="ok") approveOrder(o); else declineOrder(o);
    });
  }

  /* ---------- товары (родитель): создание/правка с фото ---------- */
  function openItemSheet(it){
    var d=(it&&it.data)||{}, photo=d.photo||null, uploading=false;
    var box=document.createElement("div");
    box.innerHTML='<h2>'+esc(t(it?"editItem":"newItem"))+'</h2>'
      +'<div class="sh-form">'
        +'<div class="sh-photo'+(photo?" has":"")+'" id="shPhotoPick" role="button" tabindex="0"'
          +(photo?' style="background-image:url(\''+esc(photo)+'\')"':'')+'>'
          +'<span class="sh-photo-l">'+esc(t(photo?"replacePhoto":"addPhoto"))+'</span></div>'
        +'<input type="file" id="shFile" accept="image/*" hidden>'
        +'<input type="text" id="shTitle" maxlength="60" placeholder="'+esc(t("itemTitlePh"))+'" value="'+esc(d.title||"")+'">'
        +'<label class="sh-lbl" for="shPrice">'+esc(t("itemPriceLbl"))+'</label>'
        +'<input type="number" id="shPrice" inputmode="numeric" min="1" max="1000000" value="'+(price(d)||"")+'">'
      +'</div>'
      +'<div class="sheet-actions">'
        +(it?'<button class="btn btn-cancel" id="shDel">'+esc(t("deleteItem"))+'</button>'
            :'<button class="btn btn-cancel" data-close>'+esc(t("common.cancel"))+'</button>')
        +'<button class="btn btn-primary" id="shSave">'+esc(t("common.save"))+'</button>'
      +'</div>';
    var ctl=sdk.ui.sheet(box); curSheet=ctl;
    var cls=box.querySelector("[data-close]"); if(cls) cls.onclick=function(){ ctl.close(); };
    var pick=box.querySelector("#shPhotoPick"), file=box.querySelector("#shFile");
    function setPhoto(url){
      photo=url;
      pick.classList.toggle("has",!!url);
      pick.style.backgroundImage=url?'url("'+url+'")':"";
      pick.querySelector(".sh-photo-l").textContent=t(url?"replacePhoto":"addPhoto");
    }
    pick.onclick=function(){ file.click(); };
    file.onchange=function(){ handleFile(file.files && file.files[0]); file.value=""; };
    function handleFile(f){
      if(!f) return;
      var reader=new FileReader();
      reader.onload=function(ev){
        var img=new Image();
        img.onload=function(){
          var max=900,w=img.width,h=img.height;
          if(w>h&&w>max){ h=Math.round(h*max/w); w=max; } else if(h>=w&&h>max){ w=Math.round(w*max/h); h=max; }
          var dataUrl;
          try{ var cv=document.createElement("canvas"); cv.width=w; cv.height=h;
               cv.getContext("2d").drawImage(img,0,0,w,h); dataUrl=cv.toDataURL("image/jpeg",0.82); }
          catch(e){ dataUrl=ev.target.result; }
          setPhoto(dataUrl);
          if(!sdk.isDemo()){
            uploading=true; pick.classList.add("uploading");
            sdk.media.upload(dataUrl,"shop").then(function(res){
              uploading=false; pick.classList.remove("uploading");
              if(res&&res.path) setPhoto(res.path);
              else { setPhoto(null); sdk.ui.toast(t("photoFailed")); }
            }).catch(function(){ uploading=false; pick.classList.remove("uploading"); setPhoto(null); sdk.ui.toast(t("photoFailed")); });
          }
        };
        img.onerror=function(){ setPhoto(ev.target.result); };
        img.src=ev.target.result;
      };
      reader.readAsDataURL(f);
    }
    box.querySelector("#shSave").onclick=function(){
      if(busy || uploading) return;
      var title=(box.querySelector("#shTitle").value||"").trim();
      if(!title){ sdk.ui.toast(t("needTitle")); return; }
      var p=parseInt(box.querySelector("#shPrice").value,10)||0;
      if(p<=0){ sdk.ui.toast(t("needPrice")); return; }
      if(p>1000000) p=1000000;
      busy=true;
      var op = it
        ? sdk.data.update("items",it.id,{title:title,price:p,photo:photo})
        : sdk.data.create("items",{title:title,price:p,photo:photo,status:"active"});
      op.then(function(){
        busy=false; ctl.close();
        if(!it) sdk.events.track("shop_item_add",{title:title,price:p});
        sdk.ui.toast(t("common.done")); load();
      }).catch(function(){ busy=false; sdk.ui.toast(t("loadFail")); });
    };
    var del=box.querySelector("#shDel");
    if(del) del.onclick=function(){
      ctl.close();
      sdk.ui.confirm({ title:t("confirmDelItem",{t:d.title||""}),
                       ok:t("common.delete"), cancel:t("common.cancel") }).then(function(yes){
        if(!yes || busy) return; busy=true;
        sdk.data.remove("items",it.id).then(function(){ busy=false; load(); })
          .catch(function(){ busy=false; sdk.ui.toast(t("loadFail")); });
      });
    };
  }

  /* ---------- рендер ---------- */
  function render(){
    if(!alive) return;
    E.bal.textContent=S.err?"…":S.balance;
    sdk.ui.hud({ left:t("title"), cNum:(S.err?0:S.balance), cLbl:t("hudPts"),
                 rNum:S.orders.length, rLbl:t("hudBuys") });
    var pn=pendingN();
    E.cartN.textContent=pn; E.cartN.hidden=!(pn>0);
    renderGrid();
  }
  function renderGrid(){
    var box=E.grid;
    if(S.err){
      box.innerHTML='<div class="sh-empty-box"><p>'+esc(t("loadFail"))+'</p>'
        +'<button class="btn btn-cancel" id="shRetry">'+esc(t("retry"))+'</button></div>';
      var rb=box.querySelector("#shRetry"); if(rb) rb.onclick=function(){ S.err=false; load(); };
      return;
    }
    var isP=isParent(), isK=isKid();
    var h="";
    if(isP) h+='<button class="btn btn-cancel sh-additem" data-act="add">'+esc(t("btnAddItem"))+'</button>';
    if(!S.items.length){
      h+='<div class="sh-empty-box"><p>'+esc(t(isP?"emptyParent":"emptyChild"))+'</p></div>';
      box.innerHTML=h; return;
    }
    h+='<div class="sh-grid">';
    for(var i=0;i<S.items.length;i++){
      var it=S.items[i], d=it.data||{}, p=price(d), can=S.balance>=p && p>0;
      h+='<div class="sh-card'+(isP?' editable" role="button" tabindex="0" data-act="edit" data-iid="'+esc(it.id)+'"':'"')+'>'
        +'<div class="sh-frame">'
          +(d.photo?'<div class="sh-pic" style="background-image:url(\''+esc(d.photo)+'\')"></div>'
                   :'<div class="sh-pic none">'+GIFT_IC+'</div>')+'</div>'
        +'<div class="sh-name">'+esc(d.title||"")+'</div>'
        +'<div class="sh-price">'+COIN_IC+'<b>'+p+'</b></div>'
        +(isK && !isP
          ? (can ? '<button class="sh-buy" data-act="buy" data-iid="'+esc(it.id)+'">'+esc(t("btnBuy"))+'</button>'
                 : '<div class="sh-lack">'+esc(t("lack",{n:p-S.balance}))+'</div>')
          : (sdk.isDemo() && can ? '<button class="sh-buy" data-act="buy" data-iid="'+esc(it.id)+'">'+esc(t("btnBuy"))+'</button>' : ''))
        +'</div>';
    }
    h+='</div>';
    box.innerHTML=h;
  }
  function onGridClick(e){
    if(!alive) return;
    var b=e.target.closest("[data-act]"); if(!b || !E.grid.contains(b)) return;
    var act=b.getAttribute("data-act");
    if(act==="add"){ openItemSheet(null); return; }
    var it=itemOf(b.getAttribute("data-iid")); if(!it) return;
    if(act==="buy"){ e.stopPropagation(); buyConfirm(it); }
    else if(act==="edit"){ if(isParent()) openItemSheet(it); }
  }

  /* ---------- каркас ---------- */
  function mount(rootEl, theSdk){
    sdk=theSdk; root=rootEl; alive=true; busy=false; curSheet=null; prevSt=null;
    S={ items:[], orders:[], balance:0, loaded:false, err:false };
    root.innerHTML='<div class="sh">'
      +'<div class="sh-header"><button class="back" id="shBack" aria-label="'+esc(t("common.back"))+'">'+BACK_IC+'</button>'
        +'<div class="sh-head-main"><div class="sh-title">'+esc(t("title"))+'</div>'
        +'<div class="sh-sub">'+esc(t("subtitle"))+'</div></div>'
        +'<div class="sh-bal">'+COIN_IC+'<b id="shBal">…</b></div></div>'
      +'<section class="sh-stage" id="shGrid"></section>'
      +'<button class="sh-cart" id="shCart" aria-label="'+esc(t("ordersA11y"))+'">'+BAG_IC
        +'<span class="sh-cart-n" id="shCartN" hidden>0</span></button>'
      +'</div>';
    var el=root.querySelector(".sh");
    E={ bal:el.querySelector("#shBal"), grid:el.querySelector("#shGrid"),
        cart:el.querySelector("#shCart"), cartN:el.querySelector("#shCartN") };
    el.querySelector("#shBack").onclick=function(){ sdk.ui.back(); };
    E.cart.onclick=function(){ if(alive) openOrders(); };
    /* делегат на пересоздаваемом узле — листенер не копится между mount */
    E.grid.addEventListener("click", onGridClick);
    load();
  }
  function unmount(){
    alive=false; busy=false;
    if(curSheet && curSheet.close){ try{ curSheet.close(); }catch(e){} }
    curSheet=null; E={}; prevSt=null;
  }
  /* живое обновление (sync-поллер): новые призы и решения родителя приходят без перезахода.
     Модуль показывает чужие данные — хук обязателен. Контракт v.55: return false = «занят,
     отложи» (shell не сдвигает отпечаток и повторит тиком), демонтированный — true («не для нас»). */
  function refresh(){
    if(!alive) return true;
    if(busy || curSheet) return false;
    load(); return true;
  }

  RobTop.register({ id:"shop", mount:mount, unmount:unmount, refresh:refresh, messages:MESSAGES });
})();
