/* RobTop — модуль «Чат». Семейный мессенджер: переписки 1:1 и группы из членов семьи,
   текст + фото, оповещения на каждое сообщение (серверный rt_notify в modules/chat/api.php).
   Поверхности: список чатов → переписка (пузыри, день-разделители, композер с фото) → шторка
   «Новый чат» (выбор членов семьи, ≥2 — группа с названием). Родитель видит ВСЕ чаты семьи
   (чужие — read-only, секция «Все чаты семьи»). Живое обновление — хук refresh() (sync 4с). */
(function(){
  "use strict";
  var MESSAGES={
    en:{ chat:{
      subtitle:"Family messenger",
      newChat:"New chat", familySec:"All family chats", you:"You",
      noMsgs:"No messages yet", first:"Write the first message!",
      noFamily:"Chat is for your family. Invite them in Settings → Family.",
      demo:"Chat needs a real account — it is off in demo mode.",
      deleted:"Message deleted", photoWord:"Photo",
      write:"Write a message…", send:"Send", addPhoto:"Add a photo",
      delTitle:"Delete this message?", delText:"Everyone will see “message deleted” instead.",
      delYes:"Delete", group:"Group", groupPh:"Group name",
      pickTitle:"Chat with whom?", startChat:"Start chat", createGroup:"Create group",
      needTitle:"Give the group a name", ro:"View only — you are not in this chat",
      members:"In chat: {names}", errSend:"Couldn't send, try again", errLoad:"Couldn't load, pull to retry",
      older:"Show earlier messages", uploadFail:"Photo didn't upload, try again"
    }},
    ru:{ chat:{
      subtitle:"Семейный мессенджер",
      newChat:"Новый чат", familySec:"Все чаты семьи", you:"Ты",
      noMsgs:"Пока нет сообщений", first:"Напиши первым!",
      noFamily:"Чат — для семьи. Пригласи её в Настройках → Семья.",
      demo:"Чату нужен настоящий аккаунт — в демо он выключен.",
      deleted:"Сообщение удалено", photoWord:"Фото",
      write:"Напиши сообщение…", send:"Отправить", addPhoto:"Добавить фото",
      delTitle:"Удалить сообщение?", delText:"Вместо него все увидят «сообщение удалено».",
      delYes:"Удалить", group:"Группа", groupPh:"Название группы",
      pickTitle:"С кем чат?", startChat:"Начать чат", createGroup:"Создать группу",
      needTitle:"Дай группе название", ro:"Только просмотр — ты не в этом чате",
      members:"В чате: {names}", errSend:"Не отправилось, попробуй ещё раз", errLoad:"Не загрузилось, попробуй ещё раз",
      older:"Показать сообщения раньше", uploadFail:"Фото не загрузилось, попробуй ещё раз"
    }},
    lv:{ chat:{
      subtitle:"Ģimenes ziņotājs",
      newChat:"Jauns čats", familySec:"Visi ģimenes čati", you:"Tu",
      noMsgs:"Vēl nav ziņu", first:"Uzraksti pirmais!",
      noFamily:"Čats ir ģimenei. Uzaicini to Iestatījumos → Ģimene.",
      demo:"Čatam vajag īstu kontu — demo režīmā tas ir izslēgts.",
      deleted:"Ziņa izdzēsta", photoWord:"Foto",
      write:"Raksti ziņu…", send:"Sūtīt", addPhoto:"Pievienot foto",
      delTitle:"Dzēst šo ziņu?", delText:"Visi tās vietā redzēs “ziņa izdzēsta”.",
      delYes:"Dzēst", group:"Grupa", groupPh:"Grupas nosaukums",
      pickTitle:"Ar ko čatot?", startChat:"Sākt čatu", createGroup:"Izveidot grupu",
      needTitle:"Dod grupai nosaukumu", ro:"Tikai skatīšanās — tu neesi šajā čatā",
      members:"Čatā: {names}", errSend:"Neizdevās nosūtīt, mēģini vēlreiz", errLoad:"Neizdevās ielādēt, mēģini vēlreiz",
      older:"Rādīt agrākās ziņas", uploadFail:"Foto neielādējās, mēģini vēlreiz"
    }}
  };
  var BACK_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
  var PLUS_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
  var CAM_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8.5a2 2 0 0 1 2-2h2l1.4-2h5.2L16 6.5h2a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.4"/></svg>';
  var SEND_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l16-7-5 16-3.4-6.2z"/><path d="M20 5L11.6 14.8"/></svg>';
  var BUBBLE_E='💬';

  var sdk=null, root=null, E={}, S=null;
  /* персональный оттенок имени в группах — токены тем (без жёстких цветов) */
  var NAME_VARS=["--cyan","--magenta","--gold","--green","--purple","--orange"];

  function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];}); }
  function t(k,p){ return sdk.t(k,p); }
  function api(type,payload){ return sdk.api.post("action.php", Object.assign({module:"chat", type:type}, payload||{})); }
  function alive(){ return !!(S && S.alive); }
  function nameVar(uid){ return "var("+NAME_VARS[Math.abs(parseInt(uid,10)||0)%NAME_VARS.length]+")"; }
  function kindEmoji(k){ return k==="parent"?"🧑":"🧒"; }
  function hhmm(ms){ var d=new Date(ms); function z(n){ return (n<10?"0":"")+n; } return z(d.getHours())+":"+z(d.getMinutes()); }
  function dayKey(ms){ var d=new Date(ms); return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate(); }
  function dayLabel(ms){ return sdk.formatDate(ms,{day:"numeric",month:"long"}); }
  function rowTime(ms){
    if(!ms) return "";
    return dayKey(ms)===dayKey(Date.now()) ? hhmm(ms) : sdk.formatDate(ms,{day:"numeric",month:"short"});
  }
  function threadById(id){ var i; for(i=0;i<S.threads.length;i++){ if(S.threads[i].id===id) return S.threads[i]; } return null; }
  function others(th){ return (th.members||[]).filter(function(m){ return m.id!==S.me; }); }
  function threadName(th){
    if(th.kind==="group") return th.title||t("group");
    var o=others(th); return o.length?o[0].name:t("group");
  }
  function threadEmoji(th){
    if(th.kind==="group") return "👥";
    var o=others(th)[0], r=o&&rosterById(o.id);
    return r?kindEmoji(r.kind):BUBBLE_E;
  }
  function rosterById(id){ var i; for(i=0;i<S.roster.length;i++){ if(S.roster[i].id===id) return S.roster[i]; } return null; }

  /* =================== ЗАГРУЗКА =================== */
  function loadThreads(){
    return api("threads").then(function(r){
      if(!alive() || !r || !r.ok) return r;
      S.family=!!r.family; S.me=r.me; S.isParent=!!r.isParent;
      S.roster=r.roster||[]; S.threads=r.threads||[]; S.loaded=true;
      return r;
    });
  }
  function loadMsgs(tid, before){
    var p=before?{itemId:tid, data:{before:before}}:{itemId:tid};
    return api("messages", p);
  }

  /* =================== СПИСОК ЧАТОВ =================== */
  function renderList(){
    if(!alive()) return;
    S.view="list"; S.tid=null;
    var h='<div class="ch-head"><button class="back" id="chBack" aria-label="'+esc(sdk.i18n.t("common.back"))+'">'+BACK_IC+'</button>'
      +'<div class="ch-head-main"><div class="ch-title">'+BUBBLE_E+' '+esc(sdk.i18n.t("tile.chat"))+'</div>'
      +'<div class="ch-sub">'+esc(t("subtitle"))+'</div></div>'
      +(S.family&&sdk.can("edit")?'<button class="hbtn" id="chNew" aria-label="'+esc(t("newChat"))+'">'+PLUS_IC+'</button>':'')
      +'</div>';
    if(!S.loaded){ h+='<div class="ch-empty"><div class="e">⏳</div></div>'; }
    else if(!S.family){
      h+='<div class="ch-empty"><div class="e">👨‍👩‍👧</div><p>'+esc(t("noFamily"))+'</p></div>';
    } else {
      var mineRows=S.threads.filter(function(x){ return !x.ro; });
      var roRows=S.threads.filter(function(x){ return !!x.ro; });
      if(!mineRows.length && !roRows.length){
        h+='<div class="ch-empty"><div class="e">'+BUBBLE_E+'</div><p>'+esc(t("first"))+'</p>'
          +(sdk.can("edit")?'<button class="btn btn-primary" id="chNew2">'+esc(t("newChat"))+'</button>':'')+'</div>';
      } else {
        h+='<div class="ch-list">'+mineRows.map(rowHtml).join("")+'</div>';
        if(roRows.length){
          h+='<div class="ch-sec">👁 '+esc(t("familySec"))+'</div>'
            +'<div class="ch-list">'+roRows.map(rowHtml).join("")+'</div>';
        }
      }
    }
    E.wrap.innerHTML=h;
  }
  function rowHtml(th){
    var last=th.last, prev;
    if(!last) prev='<span class="dim">'+esc(t("noMsgs"))+'</span>';
    else{
      var who=last.uid===S.me?t("you"):last.name;
      var txt=(last.photo?"📷 ":"")+(last.body||(last.photo?t("photoWord"):""));
      prev=esc(who)+": "+esc(txt);
    }
    return '<button class="ch-row" data-tid="'+th.id+'">'
      +'<span class="ava">'+threadEmoji(th)+'</span>'
      +'<span class="tx"><span class="t1">'+esc(threadName(th))+(th.ro?' <span class="ro-ic">👁</span>':'')+'</span>'
      +'<span class="t2">'+prev+'</span></span>'
      +'<span class="meta"><span class="tm">'+esc(rowTime(last?last.at:th.at))+'</span>'
      +(th.unread>0?'<span class="ch-badge">'+(th.unread>99?"99+":th.unread)+'</span>':'')
      +'</span></button>';
  }

  /* =================== ПЕРЕПИСКА =================== */
  function openThread(tid){
    var th=threadById(tid); if(!th){ renderList(); return; }
    S.view="thread"; S.tid=tid; S.msgs=[]; S.more=false; S.msgsLoaded=false;
    th.unread=0;
    renderThread();
    loadMsgs(tid).then(function(r){
      if(!alive() || S.tid!==tid) return;
      if(r&&r.ok){ S.msgs=r.items||[]; S.more=!!r.more; S.msgsLoaded=true; renderMsgs(); scrollBottom(); }
      else sdk.ui.toast(t("errLoad"));
    }).catch(function(){ if(alive()) sdk.ui.toast(t("errLoad")); });
  }
  function renderThread(){
    var th=threadById(S.tid); if(!th) return;
    var names=(th.members||[]).map(function(m){ return m.id===S.me?t("you"):m.name; });
    var sub=th.kind==="group" ? t("members",{names:names.join(", ")}) : t("subtitle");
    var h='<div class="ch-head"><button class="back" id="chToList" aria-label="'+esc(sdk.i18n.t("common.back"))+'">'+BACK_IC+'</button>'
      +'<span class="ava">'+threadEmoji(th)+'</span>'
      +'<div class="ch-head-main"><div class="ch-title">'+esc(threadName(th))+'</div>'
      +'<div class="ch-sub">'+esc(sub)+'</div></div></div>';
    if(th.ro) h+='<div class="ch-ro">👁 '+esc(t("ro"))+'</div>';
    h+='<div class="ch-msgs" id="chMsgs"></div>';
    if(!th.ro && sdk.can("edit")){
      h+='<div class="ch-comp" id="chComp">'
        +'<div class="ch-prev" id="chPrev" style="display:none"><img id="chPrevImg" alt=""><button class="px" id="chPrevX" aria-label="✕">✕</button></div>'
        +'<div class="ch-comp-row">'
        +'<button class="cbtn" id="chPhotoPick" aria-label="'+esc(t("addPhoto"))+'">'+CAM_IC+'</button>'
        +'<textarea id="chInput" rows="1" maxlength="1000" placeholder="'+esc(t("write"))+'"></textarea>'
        +'<button class="cbtn send" id="chSend" aria-label="'+esc(t("send"))+'">'+SEND_IC+'</button>'
        +'</div>'
        +'<input type="file" id="chFile" accept="image/*" style="display:none">'
        +'</div>';
    }
    E.wrap.innerHTML=h;
    E.msgs=E.wrap.querySelector("#chMsgs");
    E.input=E.wrap.querySelector("#chInput");
    E.file=E.wrap.querySelector("#chFile");
    if(E.input) E.input.addEventListener("input",autoGrow);
    renderMsgs();
  }
  function autoGrow(){ if(!E.input) return; E.input.style.height="auto"; E.input.style.height=Math.min(E.input.scrollHeight,110)+"px"; }
  function msgHtml(m, group){
    var mine=m.uid===S.me;
    if(m.del) return '<div class="msg sys'+(mine?" me":"")+'">🚫 '+esc(t("deleted"))+'</div>';
    var h='<div class="msg'+(mine?" me":"")+(m.photo?" ph":"")+'" data-mid="'+m.id+'"'+(mine?' data-mine="1"':'')+'>';
    if(!mine && group) h+='<div class="nm" style="color:'+nameVar(m.uid)+'">'+esc(m.name)+'</div>';
    if(m.photo) h+='<img src="'+esc(m.photo)+'" alt="'+esc(t("photoWord"))+'" loading="lazy" data-full="'+esc(m.photo)+'">';
    if(m.body) h+='<div class="bd">'+esc(m.body)+'</div>';
    h+='<div class="mt">'+esc(hhmm(m.at))+'</div></div>';
    return h;
  }
  function renderMsgs(){
    if(!E.msgs) return;
    var th=threadById(S.tid), group=th&&th.kind==="group";
    var h="", lastDay="", i, m;
    if(S.more) h+='<button class="ch-older" id="chOlder">'+esc(t("older"))+'</button>';
    if(S.msgsLoaded && !S.msgs.length) h+='<div class="ch-empty in"><div class="e">'+BUBBLE_E+'</div><p>'+esc(t("first"))+'</p></div>';
    for(i=0;i<S.msgs.length;i++){
      m=S.msgs[i];
      var dk=dayKey(m.at);
      if(dk!==lastDay){ lastDay=dk; h+='<div class="ch-day">'+esc(dayLabel(m.at))+'</div>'; }
      h+=msgHtml(m, group);
    }
    E.msgs.innerHTML=h;
  }
  function scrollBottom(){ try{ window.scrollTo(0, document.body.scrollHeight); }catch(e){} }
  function nearBottom(){
    try{ return (window.innerHeight+window.scrollY) >= (document.body.scrollHeight-220); }catch(e){ return true; }
  }

  /* ---- отправка ---- */
  function doSend(){
    if(S.sending) return;
    var body=(E.input?E.input.value:"").trim();
    var ph=S.photo;
    if(!body && !ph) return;
    S.sending=true; setSending(true);
    var p=ph ? sdk.media.upload(ph.dataUrl,"chat").then(function(r){
      if(!r || !r.path) throw new Error("upload");
      return r.path;
    }) : Promise.resolve(null);
    p.then(function(path){
      return api("send",{itemId:S.tid, data:{body:body, photo:path||undefined}});
    }).then(function(r){
      S.sending=false; if(!alive()) return;
      setSending(false);
      if(!(r&&r.ok&&r.item)){ sdk.ui.toast(t("errSend")); return; }
      if(E.input){ E.input.value=""; autoGrow(); }
      clearPhoto();
      S.msgs.push(r.item);
      var th=threadById(S.tid);
      if(th){ th.last={uid:r.item.uid,name:r.item.name,body:r.item.body,photo:r.item.photo?1:0,at:r.item.at}; th.at=r.item.at; }
      renderMsgs(); scrollBottom();
      sdk.ui.haptics(6);
      sdk.events.track("message_sent_ui",{thread:S.tid, photo:r.item.photo?1:0});
    }).catch(function(e){
      S.sending=false; if(!alive()) return;
      setSending(false);
      sdk.ui.toast(t(String(e&&e.message)==="upload"?"uploadFail":"errSend"));
    });
  }
  function setSending(on){
    var b=E.wrap.querySelector("#chSend");
    if(b){ b.disabled=!!on; b.classList.toggle("busy",!!on); }
  }
  function pickPhoto(file){
    if(!file) return;
    var reader=new FileReader();
    reader.onload=function(ev){
      var img=new Image();
      img.onload=function(){
        var max=900,w=img.width,h=img.height;
        if(w>h&&w>max){ h=Math.round(h*max/w); w=max; } else if(h>=w&&h>max){ w=Math.round(w*max/h); h=max; }
        var dataUrl;
        try{ var cv=document.createElement("canvas"); cv.width=w; cv.height=h; cv.getContext("2d").drawImage(img,0,0,w,h); dataUrl=cv.toDataURL("image/jpeg",0.82); }
        catch(e){ dataUrl=ev.target.result; }
        if(!alive()) return;
        S.photo={dataUrl:dataUrl};
        var pv=E.wrap.querySelector("#chPrev"), pi=E.wrap.querySelector("#chPrevImg");
        if(pv&&pi){ pi.src=dataUrl; pv.style.display="flex"; }
      };
      img.src=ev.target.result;
    };
    reader.readAsDataURL(file);
  }
  function clearPhoto(){
    S.photo=null;
    var pv=E.wrap.querySelector("#chPrev"); if(pv) pv.style.display="none";
    if(E.file) E.file.value="";
  }

  /* ---- лайтбокс фото: шторка оболочки (свой fixed внутри .view ломается transform-анимацией) ---- */
  function openLightbox(src){
    if(S.sheet) return;
    var node=document.createElement("div");
    node.innerHTML='<img class="ch-lbimg" src="'+esc(src)+'" alt="">';
    var sh=sdk.ui.sheet(node);
    S.sheet=sh; /* refresh() ждёт закрытия и сам видит снятый overlay */
    node.querySelector("img").addEventListener("click",function(){ S.sheet=null; try{ sh.close(); }catch(e){} });
  }

  /* ---- клавиатура (iOS/Android): композер поверх клавиатуры + свайп по переписке прячет её ----
     sticky-композер прижат к НИЗУ layout-вьюпорта; клавиатура его не двигает. visualViewport
     говорит, сколько низа перекрыто — поднимаем композер transform'ом и дополняем msgs снизу. */
  function kbApply(){
    if(!S || !S.alive || !window.visualViewport) return;
    var c=E.wrap?E.wrap.querySelector("#chComp"):null;
    var vv=window.visualViewport;
    var kb=Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
    if(c) c.style.transform = kb>2 ? "translateY(-"+kb+"px)" : "";
    if(E.msgs) E.msgs.style.paddingBottom = kb>2 ? (kb+14)+"px" : "";
    if(kb>2) scrollBottom();
  }
  function kbSetup(){
    if(!window.visualViewport || S.vv) return;
    S.vv=kbApply;
    window.visualViewport.addEventListener("resize",S.vv);
    window.visualViewport.addEventListener("scroll",S.vv);
  }
  function kbTeardown(){
    if(S && S.vv && window.visualViewport){
      window.visualViewport.removeEventListener("resize",S.vv);
      window.visualViewport.removeEventListener("scroll",S.vv);
      S.vv=null;
    }
  }

  /* ---- удаление своего сообщения ---- */
  function askDelete(mid){
    sdk.ui.confirm({title:t("delTitle"), text:t("delText"), ok:t("delYes")}).then(function(yes){
      if(!yes || !alive()) return;
      api("msg_delete",{itemId:mid}).then(function(r){
        if(!alive()) return;
        if(r&&r.ok){
          var i; for(i=0;i<S.msgs.length;i++){ if(S.msgs[i].id===mid){ S.msgs[i].del=1; S.msgs[i].body=""; S.msgs[i].photo=null; } }
          renderMsgs();
        }
      }).catch(function(){});
    });
  }

  /* =================== НОВЫЙ ЧАТ =================== */
  function openNewChat(){
    if(S.sheet) return;
    var sel={};
    var node=document.createElement("div");
    function listHtml(){
      return S.roster.filter(function(r){ return r.id!==S.me; }).map(function(r){
        return '<button class="ch-pick'+(sel[r.id]?" on":"")+'" data-uid="'+r.id+'">'
          +'<span class="ava">'+kindEmoji(r.kind)+'</span><span class="nm">'+esc(r.name)+'</span>'
          +'<span class="ck">'+(sel[r.id]?"✓":"")+'</span></button>';
      }).join("");
    }
    function selCount(){ return Object.keys(sel).length; }
    function sync(){
      node.querySelector(".ch-picks").innerHTML=listHtml();
      var n=selCount();
      var ti=node.querySelector("#chGroupTitle");
      ti.style.display=n>=2?"block":"none";
      var b=node.querySelector("#chCreate");
      b.disabled=n===0;
      b.textContent=n>=2?t("createGroup"):t("startChat");
    }
    node.innerHTML='<h2>'+esc(t("pickTitle"))+'</h2>'
      +'<div class="ch-picks"></div>'
      +'<input type="text" id="chGroupTitle" class="ch-ginput" maxlength="60" placeholder="'+esc(t("groupPh"))+'" style="display:none">'
      +'<div class="sheet-actions"><button class="btn btn-cancel" id="chCancel">'+esc(sdk.i18n.t("common.cancel"))+'</button>'
      +'<button class="btn btn-primary" id="chCreate" disabled>'+esc(t("startChat"))+'</button></div>';
    node.addEventListener("click",function(e){
      var p=e.target.closest(".ch-pick");
      if(p){ var id=parseInt(p.getAttribute("data-uid"),10); if(sel[id]) delete sel[id]; else sel[id]=1; sync(); }
    });
    var sh=sdk.ui.sheet(node);
    S.sheet=sh; /* grip/оверлей закрывают шторку мимо нас — refresh() сам видит снятый из DOM overlay */
    function closeSheet(){ S.sheet=null; try{ sh.close(); }catch(e){} }
    node.querySelector("#chCancel").addEventListener("click",closeSheet);
    node.querySelector("#chCreate").addEventListener("click",function(){
      var ids=Object.keys(sel).map(Number);
      if(!ids.length) return;
      var title="";
      if(ids.length>=2){
        title=(node.querySelector("#chGroupTitle").value||"").trim();
        if(!title){ sdk.ui.toast(t("needTitle")); return; }
      }
      var b=node.querySelector("#chCreate"); b.disabled=true;
      api("create",{data:{members:ids, title:title}}).then(function(r){
        closeSheet();
        if(!alive()) return;
        if(r&&r.ok&&r.thread){
          loadThreads().then(function(){ if(alive()) openThread(r.thread); });
        } else sdk.ui.toast(t("errSend"));
      }).catch(function(){ closeSheet(); if(alive()) sdk.ui.toast(t("errSend")); });
    });
    sync();
  }

  /* =================== ЖИВОЕ ОБНОВЛЕНИЕ =================== */
  function refresh(){
    if(!alive()) return true;
    if(S.sheet && !(S.sheet.overlay && S.sheet.overlay.parentNode)) S.sheet=null; /* шторку закрыли grip'ом/оверлеем */
    if(S.sending || S.sheet || S.photo) return false;
    if(E.input && E.input.value.trim()!=="") return false;
    if(S.view==="thread"){
      var tid=S.tid, stick=nearBottom();
      loadMsgs(tid).then(function(r){
        if(!alive() || S.tid!==tid || !(r&&r.ok)) return;
        var items=r.items||[];
        var oldLast=S.msgs.length?S.msgs[S.msgs.length-1].id:0;
        var newLast=items.length?items[items.length-1].id:0;
        var changed = items.length!==S.msgs.length || newLast!==oldLast || delCount(items)!==delCount(S.msgs);
        if(changed){
          S.msgs=items; S.more=!!r.more; S.msgsLoaded=true;
          renderMsgs();
          if(newLast>oldLast && stick) scrollBottom();
        }
      }).catch(function(){});
      loadThreads().catch(function(){});
    } else {
      loadThreads().then(function(){ if(alive() && S.view==="list") renderList(); }).catch(function(){});
    }
    return true;
  }
  function delCount(arr){ var n=0,i; for(i=0;i<arr.length;i++) if(arr[i].del) n++; return n; }

  /* =================== MOUNT / UNMOUNT =================== */
  function mount(rootEl, theSdk){
    sdk=theSdk; root=rootEl;
    S={ alive:true, view:"list", tid:null, threads:[], roster:[], me:0, isParent:false,
        family:true, loaded:false, msgs:[], more:false, msgsLoaded:false,
        sending:false, photo:null, sheet:null, pendingTid:null, vv:null, ty:null };
    E={};
    sdk.ui.hud({hidden:true});
    root.innerHTML='<div class="ch" id="chWrap"></div>';
    E.wrap=root.querySelector("#chWrap");

    /* делегирование всех кликов — на внутренний wrap (умирает вместе с innerHTML, root-листенер не копится) */
    E.wrap.addEventListener("click",function(e){
      if(e.target.closest("#chBack")){ sdk.ui.back(); return; }
      if(e.target.closest("#chToList")){ S.view="list"; S.tid=null; renderList(); loadThreads().then(function(){ if(alive()&&S.view==="list") renderList(); }).catch(function(){}); window.scrollTo(0,0); return; }
      if(e.target.closest("#chNew")||e.target.closest("#chNew2")){ openNewChat(); return; }
      var row=e.target.closest(".ch-row");
      if(row){ openThread(parseInt(row.getAttribute("data-tid"),10)); window.scrollTo(0,0); return; }
      if(e.target.closest("#chOlder")){
        var first=S.msgs.length?S.msgs[0].id:0;
        if(first) loadMsgs(S.tid,first).then(function(r){
          if(!alive()||!(r&&r.ok)) return;
          S.msgs=(r.items||[]).concat(S.msgs); S.more=!!r.more; renderMsgs();
        }).catch(function(){});
        return;
      }
      if(e.target.closest("#chPhotoPick")){ if(E.file) E.file.click(); return; }
      if(e.target.closest("#chPrevX")){ clearPhoto(); return; }
      if(e.target.closest("#chSend")){ doSend(); return; }
      var img=e.target.closest(".msg img");
      if(img){ openLightbox(img.getAttribute("data-full")||img.src); return; }
      var msg=e.target.closest(".msg[data-mine]");
      if(msg && !msg.classList.contains("sys")){ askDelete(parseInt(msg.getAttribute("data-mid"),10)); return; }
    });
    E.wrap.addEventListener("change",function(e){
      if(e.target && e.target.id==="chFile" && e.target.files && e.target.files[0]) pickPhoto(e.target.files[0]);
    });
    /* свайп по переписке прячет клавиатуру (blur); свайп по самому композеру не считается */
    E.wrap.addEventListener("touchstart",function(e){ S.ty=e.touches&&e.touches[0]?e.touches[0].clientY:null; },{passive:true});
    E.wrap.addEventListener("touchmove",function(e){
      if(S.ty==null || !e.touches || !e.touches[0]) return;
      var ae=document.activeElement;
      if(!ae || ae.id!=="chInput") return;
      if(e.target && e.target.closest && e.target.closest("#chComp")) return;
      if(Math.abs(e.touches[0].clientY-S.ty)>28){ try{ ae.blur(); }catch(x){} S.ty=null; }
    },{passive:true});
    /* фокус в поле → доскроллить к последним сообщениям после выезда клавиатуры */
    E.wrap.addEventListener("focusin",function(e){
      if(e.target && e.target.id==="chInput"){ setTimeout(function(){ if(alive()) scrollBottom(); },300); }
    });
    kbSetup();

    if(sdk.isDemo()){
      E.wrap.innerHTML='<div class="ch-head"><button class="back" id="chBack" aria-label="'+esc(sdk.i18n.t("common.back"))+'">'+BACK_IC+'</button>'
        +'<div class="ch-head-main"><div class="ch-title">'+BUBBLE_E+' '+esc(sdk.i18n.t("tile.chat"))+'</div>'
        +'<div class="ch-sub">'+esc(t("subtitle"))+'</div></div></div>'
        +'<div class="ch-empty"><div class="e">'+BUBBLE_E+'</div><p>'+esc(t("demo"))+'</p></div>';
      return;
    }
    renderList();
    loadThreads().then(function(){
      if(!alive()) return;
      if(S.pendingTid && threadById(S.pendingTid)){ var x=S.pendingTid; S.pendingTid=null; openThread(x); }
      else if(S.view==="list") renderList();
    }).catch(function(){ if(alive()){ S.loaded=true; renderList(); sdk.ui.toast(t("errLoad")); } });
  }
  function unmount(){
    if(S) S.alive=false;
    kbTeardown(); /* visualViewport — глобальные слушатели, снять обязательно */
    if(S && S.sheet){ try{ S.sheet.close(); }catch(e){} S.sheet=null; }
    S=null; E={};
  }
  /* тап по оповещению: открыть конкретную переписку (link {module:"chat", item:"<tid>"}) */
  function link(lk){
    if(!lk || !lk.item || !S) return;
    var tid=parseInt(lk.item,10); if(!tid) return;
    if(!S.loaded){ S.pendingTid=tid; return; }
    if(threadById(tid)) openThread(tid);
    else loadThreads().then(function(){ if(alive() && threadById(tid)) openThread(tid); }).catch(function(){});
  }

  RobTop.register({ id:"chat", mount:mount, unmount:unmount, refresh:refresh, link:link, messages:MESSAGES });
})();
