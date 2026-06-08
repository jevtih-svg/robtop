/* RobTop — модуль «Магазин». Призы от родителей за пункты копилки.
   КАТАЛОГ ОБЩИЙ НА СЕМЬЮ (2026-06-08, фидбек Джеффа): товары shop/items — общесемейная
   коллекция (манифест familyCollections), один набор призов на всех детей; доступность
   конкретному ребёнку — поле data.disabledFor (список user_id, чек-лист «доступно детям»
   в карточке товара). Заказы shop/orders и очки — на КАЖДОГО ребёнка свои.
   Родитель: выставляет/правит товары (название, цена, фото-«картина», доступность детям) и
   подтверждает покупки в блоке «Покупки на подтверждение» вверху (Вручить/Вернуть). Корзинки
   «Мои покупки» у родителя НЕТ (фидбек Джеффа: приложение — для детей, родителю незачем).
   Ребёнок: видит только доступные ему товары, покупает в любой момент — пункты списываются
   СРАЗУ (sdk.points.add(-цена,"spend")), заказ уходит родителю; «Вручить» = получил приз
   (один шаг), «Вернуть» = автовозврат spend_refund. Купить при нехватке нельзя. Покупки
   копятся в карточке-корзинке в правом нижнем углу (бейдж = ждущие). Канон очков — ГАЙД-очки.md.
   «Лайки» сознательно не делаются (валюта не определена, §7 КОНТЕКСТ.md). */
(function(){
  "use strict";

  var MESSAGES={
    en:{ shop:{
      title:"Shop", subtitle:"Prizes from your parents for points",
      hudPts:"points", hudBuys:"purchases",
      emptyChild:"No prizes yet — parents will add some soon!",
      emptyParent:"Add the first prize — kids will see it right away",
      btnAddItem:"+ New prize",
      btnBuy:"Buy", lack:"need {n} more",
      confirmBuy:"Buy “{t}” for {n} points?", btnConfirm:"Buy!",
      sentToast:"Sent to parents! Points are taken",
      ordersTitle:"My purchases", ordersEmpty:"Nothing bought yet",
      ordersA11y:"My purchases",
      approvalsTitle:"Purchases to approve",
      stPending:"waiting for parents ⏳", stApproved:"received 🎁", stDeclined:"returned ↩",
      approveBtn:"✓ Give", declineBtn:"↩ Return points",
      approvedToast:"Given! 🎁", declinedToast:"Returned, points are back",
      giftToast:"Your prize “{t}” is yours! 🎁",
      newItem:"New prize", editItem:"Edit prize",
      itemTitlePh:"Prize name", itemPriceLbl:"Price in points",
      availTitle:"Available to kids", hiddenFor:"hidden for {n}",
      addPhoto:"Add photo", replacePhoto:"Replace photo", photoFailed:"Couldn't upload photo",
      deleteItem:"Delete prize", confirmDelItem:"Delete the prize “{t}”?",
      needTitle:"Write the prize name first", needPrice:"Enter a price first",
      loadFail:"Could not load the shop", retry:"Try again"
    }, bank:{ r_spend_refund:"Shop — points returned" }},
    ru:{ shop:{
      title:"Магазин", subtitle:"Призы от родителей за пункты",
      hudPts:"пунктов", hudBuys:"покупок",
      emptyChild:"Призов пока нет — родители скоро добавят!",
      emptyParent:"Добавь первый приз — дети сразу его увидят",
      btnAddItem:"+ Новый приз",
      btnBuy:"Купить", lack:"не хватает {n}",
      confirmBuy:"Купить «{t}» за {n} пунктов?", btnConfirm:"Покупаю!",
      sentToast:"Отправлено родителям! Пункты списаны",
      ordersTitle:"Мои покупки", ordersEmpty:"Пока ничего не куплено",
      ordersA11y:"Мои покупки",
      approvalsTitle:"Покупки на подтверждение",
      stPending:"ждёт родителей ⏳", stApproved:"получено 🎁", stDeclined:"возврат ↩",
      approveBtn:"✓ Вручить", declineBtn:"↩ Вернуть пункты",
      approvedToast:"Вручено! 🎁", declinedToast:"Возвращено, пункты вернулись",
      giftToast:"Твой приз «{t}» вручён! 🎁",
      newItem:"Новый приз", editItem:"Изменить приз",
      itemTitlePh:"Название приза", itemPriceLbl:"Цена в пунктах",
      availTitle:"Доступно детям", hiddenFor:"скрыт у {n}",
      addPhoto:"Добавить фото", replacePhoto:"Заменить фото", photoFailed:"Не удалось загрузить фото",
      deleteItem:"Удалить приз", confirmDelItem:"Удалить приз «{t}»?",
      needTitle:"Сначала напиши название", needPrice:"Сначала укажи цену",
      loadFail:"Не получилось загрузить магазин", retry:"Попробовать ещё"
    }, bank:{ r_spend_refund:"Магазин — возврат пунктов" }},
    lv:{ shop:{
      title:"Veikals", subtitle:"Vecāku balvas par punktiem",
      hudPts:"punkti", hudBuys:"pirkumi",
      emptyChild:"Balvu vēl nav — vecāki drīz pievienos!",
      emptyParent:"Pievieno pirmo balvu — bērni to uzreiz redzēs",
      btnAddItem:"+ Jauna balva",
      btnBuy:"Pirkt", lack:"pietrūkst {n}",
      confirmBuy:"Pirkt “{t}” par {n} punktiem?", btnConfirm:"Pērku!",
      sentToast:"Nosūtīts vecākiem! Punkti noņemti",
      ordersTitle:"Mani pirkumi", ordersEmpty:"Vēl nekas nav nopirkts",
      ordersA11y:"Mani pirkumi",
      approvalsTitle:"Pirkumi apstiprināšanai",
      stPending:"gaida vecākus ⏳", stApproved:"saņemts 🎁", stDeclined:"atgriezts ↩",
      approveBtn:"✓ Pasniegt", declineBtn:"↩ Atgriezt punktus",
      approvedToast:"Pasniegts! 🎁", declinedToast:"Atgriezts, punkti ir atpakaļ",
      giftToast:"Tava balva “{t}” ir pasniegta! 🎁",
      newItem:"Jauna balva", editItem:"Mainīt balvu",
      itemTitlePh:"Balvas nosaukums", itemPriceLbl:"Cena punktos",
      availTitle:"Pieejams bērniem", hiddenFor:"paslēpts {n}",
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
  var EYE_OFF='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18M10.6 10.7a2 2 0 0 0 2.8 2.8M9.4 5.2A9.6 9.6 0 0 1 12 5c5 0 9 4.5 9 7-.3 1-1.3 2.4-2.8 3.6M6.2 6.7C4.2 8 3 9.8 3 12c0 .8 1.4 2.6 3 3.8 1.8 1.3 3.8 2.2 6 2.2 1 0 2-.2 3-.5"/></svg>';

  var sdk=null, root=null, alive=false, busy=false, curSheet=null;
  var E={};
  var S={ items:[], orders:[], balance:0, loaded:false, err:false };
  var prevSt=null; /* id заказа → статус с прошлой загрузки (тост «вручено» ребёнку) */

  function esc(s){ return RobTop.util.esc(s); }
  function t(k,p){ return sdk.t(k,p); }
  /* родитель/демо управляют каталогом и подтверждают покупки; «детская сторона» (ребёнок или
     демо) покупает и имеет корзинку — у НАСТОЯЩЕГО родителя корзинки нет (фидбек Джеффа). */
  function canManage(){ return sdk.role==="parent" || sdk.isDemo(); }
  function isKidSide(){ return sdk.role!=="parent"; }
  function price(d){ var n=parseInt(d&&d.price,10); return n>0?n:0; }
  function disabledOf(d){ var a=(d&&d.disabledFor); return Array.isArray(a)?a:[]; }
  function fmtWhen(ts){
    if(!ts) return "";
    var d=new Date(ts), hh=d.getHours(), mm=d.getMinutes();
    return sdk.formatDate(ts,{day:"numeric",month:"short"})+" · "+hh+":"+(mm<10?"0":"")+mm;
  }
  /* товары, видимые НА ДЕТСКОЙ стороне: скрытые для этого ребёнка (его id в disabledFor) убраны.
     Менеджер (родитель/демо) видит ВСЕ — для правки доступности. Чистая функция — тестируется. */
  function filterForKid(items, kidId){
    return items.filter(function(it){
      return disabledOf(it.data).map(String).indexOf(String(kidId))<0;
    });
  }
  function gridItems(){
    if(canManage()) return S.items;
    return filterForKid(S.items, sdk.user && sdk.user.id);
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
    if(prevSt && isKidSide() && !canManage()){
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
  function pendingOrders(){
    return S.orders.filter(function(o){ return o.status==="pending"; });
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

  /* ---------- подтверждение покупки (родитель) ---------- */
  function approveOrder(o){
    if(busy) return; busy=true;
    sdk.data.move("orders",o.id,"approved").then(function(){
      return sdk.data.update("orders",o.id,{approvedAt:Date.now()});
    }).then(function(){
      busy=false;
      sdk.events.track("shop_approve",{title:(o.data&&o.data.title)||"",price:price(o.data)});
      sdk.ui.toast(t("approvedToast")); sdk.ui.haptics("light");
      load();
    }).catch(function(){ busy=false; sdk.ui.toast(t("loadFail")); load(); });
  }
  function declineOrder(o){
    if(busy) return; busy=true;
    var d=o.data||{}, p=price(d);
    /* автовозврат отдельной строкой леджера (транзакции не удаляются — канон ГАЙД-очки.md §8.1) */
    sdk.points.add(p,"spend_refund",{kind:"spend",src:"shop",note:d.title||""}).then(function(out){
      if(!out || !out.ok){ busy=false; sdk.ui.toast(t("loadFail")); return; }
      sdk.data.move("orders",o.id,"declined").then(function(){
        return sdk.data.update("orders",o.id,{declinedAt:Date.now()});
      }).catch(function(){}).then(function(){
        busy=false;
        sdk.events.track("shop_decline",{title:d.title||"",price:p});
        sdk.ui.toast(t("declinedToast"));
        load();
      });
    });
  }

  /* ---------- корзинка ребёнка «Мои покупки» (правый нижний угол; у родителя её НЕТ) ---------- */
  function openOrders(){
    var rows=S.orders.slice();
    var h='<h2>'+esc(t("ordersTitle"))+'</h2><div class="sh-orders">';
    if(!rows.length) h+='<p class="sh-empty">'+esc(t("ordersEmpty"))+'</p>';
    for(var i=0;i<rows.length && i<60;i++){
      var o=rows[i], d=o.data||{}, st=o.status||"pending";
      var chip = st==="approved" ? '<span class="sh-chip ok">'+esc(t("stApproved"))+'</span>'
               : st==="declined" ? '<span class="sh-chip no">'+esc(t("stDeclined"))+'</span>'
               : '<span class="sh-chip">'+esc(t("stPending"))+'</span>';
      h+='<div class="sh-order st-'+esc(st)+'">'
        +(d.photo?'<div class="sh-oph" style="background-image:url(\''+esc(d.photo)+'\')"></div>'
                 :'<div class="sh-oph none">'+GIFT_IC+'</div>')
        +'<div class="sh-omain"><div class="sh-ot">'+esc(d.title||"")+'</div>'
        +'<div class="sh-om">−'+price(d)+' · '+esc(fmtWhen(o.createdAt))+'</div>'+chip+'</div></div>';
    }
    h+='</div><div class="sheet-actions"><button class="btn btn-primary" data-close>'+esc(t("common.done"))+'</button></div>';
    var box=document.createElement("div");
    box.innerHTML=h;
    var ctl=sdk.ui.sheet(box); curSheet=ctl;
    box.querySelector("[data-close]").onclick=function(){ ctl.close(); };
  }

  /* ---------- товары (родитель): создание/правка с фото и чек-листом доступности ---------- */
  function openItemSheet(it){
    var d=(it&&it.data)||{}, photo=d.photo||null, uploading=false;
    var kids=sdk.family.children()||[];
    var disabled={}; disabledOf(d).forEach(function(id){ disabled[String(id)]=1; });
    var checklist="";
    if(kids.length){
      checklist='<div class="sh-avail"><div class="sh-avail-h">'+esc(t("availTitle"))+'</div>';
      for(var k=0;k<kids.length;k++){
        var kid=kids[k], on=!disabled[String(kid.id)];
        checklist+='<label class="sh-kid"><input type="checkbox" data-kid="'+esc(kid.id)+'"'+(on?" checked":"")+'>'
          +'<span class="sh-kid-box"></span><span class="sh-kid-nm">'+esc(kid.nickname||"")+'</span></label>';
      }
      checklist+='</div>';
    }
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
        +checklist
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
    function readDisabled(){ /* собрать disabledFor из снятых галочек */
      var off=[];
      box.querySelectorAll(".sh-kid input[data-kid]").forEach(function(cb){
        if(!cb.checked){ var id=cb.getAttribute("data-kid"); var n=parseInt(id,10); off.push(isNaN(n)?id:n); }
      });
      return off;
    }
    box.querySelector("#shSave").onclick=function(){
      if(busy || uploading) return;
      var title=(box.querySelector("#shTitle").value||"").trim();
      if(!title){ sdk.ui.toast(t("needTitle")); return; }
      var p=parseInt(box.querySelector("#shPrice").value,10)||0;
      if(p<=0){ sdk.ui.toast(t("needPrice")); return; }
      if(p>1000000) p=1000000;
      var payload={ title:title, price:p, photo:photo };
      if(kids.length) payload.disabledFor=readDisabled();   /* чек-лист доступности — только если детей знаем */
      busy=true;
      var op = it
        ? sdk.data.update("items",it.id,payload)
        : sdk.data.create("items",Object.assign({status:"active"},payload));
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
    if(E.cart){
      var pn=pendingOrders().length;
      E.cartN.textContent=pn; E.cartN.hidden=!(pn>0);
    }
    renderGrid();
  }
  function approvalsHtml(){
    var pend=pendingOrders();
    if(!pend.length) return "";
    var h='<div class="sh-approvals"><div class="sh-approvals-h">'+esc(t("approvalsTitle"))+'</div>';
    for(var i=0;i<pend.length;i++){
      var o=pend[i], d=o.data||{};
      h+='<div class="sh-order st-pending">'
        +(d.photo?'<div class="sh-oph" style="background-image:url(\''+esc(d.photo)+'\')"></div>'
                 :'<div class="sh-oph none">'+GIFT_IC+'</div>')
        +'<div class="sh-omain"><div class="sh-ot">'+esc(d.title||"")+'</div>'
        +'<div class="sh-om">−'+price(d)+' · '+esc(fmtWhen(o.createdAt))+'</div></div>'
        +'<div class="sh-oact">'
          +'<button class="sh-obtn ok" data-act="ok" data-oid="'+esc(o.id)+'">'+esc(t("approveBtn"))+'</button>'
          +'<button class="sh-obtn no" data-act="no" data-oid="'+esc(o.id)+'">'+esc(t("declineBtn"))+'</button></div>'
        +'</div>';
    }
    return h+'</div>';
  }
  function cardHtml(it){
    var d=it.data||{}, p=price(d), manage=canManage(), kid=isKidSide();
    var can=S.balance>=p && p>0, disN=disabledOf(d).length;
    var h='<div class="sh-card'+(manage?' editable" role="button" tabindex="0" data-act="edit" data-iid="'+esc(it.id)+'"':'"')+'>'
      +'<div class="sh-frame">'
        +(d.photo?'<div class="sh-pic" style="background-image:url(\''+esc(d.photo)+'\')"></div>'
                 :'<div class="sh-pic none">'+GIFT_IC+'</div>')+'</div>'
      +'<div class="sh-name">'+esc(d.title||"")+'</div>'
      +'<div class="sh-price">'+COIN_IC+'<b>'+p+'</b>'
        +(manage && disN ? '<span class="sh-hidden">'+EYE_OFF+esc(t("hiddenFor",{n:disN}))+'</span>' : '')
      +'</div>'
      +(kid ? (can ? '<button class="sh-buy" data-act="buy" data-iid="'+esc(it.id)+'">'+esc(t("btnBuy"))+'</button>'
                   : '<div class="sh-lack">'+esc(t("lack",{n:p-S.balance}))+'</div>') : '')
      +'</div>';
    return h;
  }
  function renderGrid(){
    var box=E.grid;
    if(S.err){
      box.innerHTML='<div class="sh-empty-box"><p>'+esc(t("loadFail"))+'</p>'
        +'<button class="btn btn-cancel" id="shRetry">'+esc(t("retry"))+'</button></div>';
      var rb=box.querySelector("#shRetry"); if(rb) rb.onclick=function(){ S.err=false; load(); };
      return;
    }
    var manage=canManage(), list=gridItems(), h="";
    if(manage) h+=approvalsHtml();
    if(manage) h+='<button class="btn btn-cancel sh-additem" data-act="add">'+esc(t("btnAddItem"))+'</button>';
    if(!list.length){
      h+='<div class="sh-empty-box"><p>'+esc(t(manage?"emptyParent":"emptyChild"))+'</p></div>';
      box.innerHTML=h; return;
    }
    h+='<div class="sh-grid">';
    for(var i=0;i<list.length;i++) h+=cardHtml(list[i]);
    h+='</div>';
    box.innerHTML=h;
  }
  function onGridClick(e){
    if(!alive) return;
    var b=e.target.closest("[data-act]"); if(!b || !E.grid.contains(b)) return;
    var act=b.getAttribute("data-act");
    if(act==="add"){ openItemSheet(null); return; }
    if(act==="ok"){ var oa=orderOf(b.getAttribute("data-oid")); if(oa&&oa.status==="pending") approveOrder(oa); return; }
    if(act==="no"){ var od=orderOf(b.getAttribute("data-oid")); if(od&&od.status==="pending") declineOrder(od); return; }
    var it=itemOf(b.getAttribute("data-iid")); if(!it) return;
    if(act==="buy"){ e.stopPropagation(); buyConfirm(it); }
    else if(act==="edit"){ if(canManage()) openItemSheet(it); }
  }

  /* ---------- каркас ---------- */
  function mount(rootEl, theSdk){
    sdk=theSdk; root=rootEl; alive=true; busy=false; curSheet=null; prevSt=null;
    S={ items:[], orders:[], balance:0, loaded:false, err:false };
    var sc=sdk.scopeChild ? sdk.scopeChild() : null;     /* родитель: в чьём магазине он сейчас */
    var titleTxt=(sc && sc.name) ? (t("title")+" · "+sc.name) : t("title");
    var bag = isKidSide()
      ? '<button class="sh-cart" id="shCart" aria-label="'+esc(t("ordersA11y"))+'">'+BAG_IC
        +'<span class="sh-cart-n" id="shCartN" hidden>0</span></button>'
      : '';
    var body=sdk.ui.frame({
      titleHtml:'<div class="sh-title">'+esc(titleTxt)+'</div><div class="sh-sub">'+esc(t("subtitle"))+'</div>',
      backLabel:t("common.back"),
      rightHtml:'<div class="sh-bal">'+COIN_IC+'<b id="shBal">…</b></div>'
    }).body;
    body.innerHTML='<div class="sh">'
      +'<section class="sh-stage" id="shGrid"></section>'
      +bag
      +'</div>';
    var el=body.querySelector(".sh");
    E={ bal:root.querySelector("#shBal"), grid:el.querySelector("#shGrid"),
        cart:el.querySelector("#shCart"), cartN:el.querySelector("#shCartN") };
    if(E.cart) E.cart.onclick=function(){ if(alive) openOrders(); };
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
