/* RobTop — модуль «Бюро находок» (lost). Ребёнок быстро сохраняет найденную вещь: фото (камера),
   название, где нашли, кто нашёл, короткое описание — каждая находка отдельной карточкой.
   Создание — вертикальный мастер из 5 шагов только вперёд (фото обязательно, название обязательно,
   остальное можно пропустить). Данные — generic-стор (sdk.data, коллекция finds), общесемейный пул
   (familyPool, как прогулки): добавляют и видят все члены семьи. Очков нет — просто коллекция. */
(function(){
  "use strict";

  /* =================== ЛОКАЛИЗАЦИЯ (en/ru/lv/de) =================== */
  var MESSAGES={
    en:{ lost:{
      subtitle:"Save what you find",
      emptyTitle:"Lost & Found", emptyText:"Nothing here yet.", emptyAdd:"Add a find",
      fabAdd:"Add a find",
      today:"Today", yesterday:"Yesterday",
      s1q:"Take a photo", openCamera:"Open camera", retake:"Retake photo", photoReq:"Photo is required",
      s2q:"Name", titleReq:"Name is required", titlePh:"e.g. Red ball",
      s3q:"Where did you find it?", s3ph:"e.g. By the swings",
      s4q:"Who found it?", s4ph:"e.g. Max",
      s5q:"Tell us a little", s5ph:"e.g. It was lying near the tree.",
      canSkip:"You can skip this", skip:"Skip", next:"Next",
      savedTitle:"Find saved", view:"View", addMore:"Add another",
      fWho:"Who found it", fWhere:"Where it was found", fDesc:"Description", fAdded:"Added",
      edit:"Edit", del:"Delete", delConfirm:"Delete this find?",
      savedToast:"Find saved", saveFailed:"Couldn't save", deleted:"Find deleted",
      loadFailed:"Couldn't load finds", photoFailed:"Couldn't upload photo", photoWait:"Wait for the photo to finish uploading",
      aria:{ photo:"Photo" }
    }},
    ru:{ lost:{
      subtitle:"Сохрани то, что нашёл",
      emptyTitle:"Бюро находок", emptyText:"Пока здесь ничего нет.", emptyAdd:"Добавить находку",
      fabAdd:"Добавить находку",
      today:"Сегодня", yesterday:"Вчера",
      s1q:"Сделайте фотографию", openCamera:"Открыть камеру", retake:"Переснять", photoReq:"Фото обязательно",
      s2q:"Название", titleReq:"Название обязательно", titlePh:"например: красный мяч",
      s3q:"Где нашли?", s3ph:"например: возле качелей",
      s4q:"Кто нашёл?", s4ph:"например: Максим",
      s5q:"Расскажите немного", s5ph:"например: лежал возле дерева.",
      canSkip:"Можно пропустить", skip:"Пропустить", next:"Далее",
      savedTitle:"Находка сохранена", view:"Посмотреть", addMore:"Добавить ещё",
      fWho:"Кто нашёл", fWhere:"Где нашли", fDesc:"Описание", fAdded:"Добавлено",
      edit:"Редактировать", del:"Удалить", delConfirm:"Удалить находку?",
      savedToast:"Находка сохранена", saveFailed:"Не удалось сохранить", deleted:"Находка удалена",
      loadFailed:"Не удалось загрузить находки", photoFailed:"Не удалось загрузить фото", photoWait:"Подожди, пока фото загрузится",
      aria:{ photo:"Фото" }
    }},
    lv:{ lost:{
      subtitle:"Saglabā to, ko atradi",
      emptyTitle:"Atradumu birojs", emptyText:"Pagaidām šeit nekā nav.", emptyAdd:"Pievienot atradumu",
      fabAdd:"Pievienot atradumu",
      today:"Šodien", yesterday:"Vakar",
      s1q:"Uzņem fotoattēlu", openCamera:"Atvērt kameru", retake:"Uzņemt vēlreiz", photoReq:"Foto ir obligāts",
      s2q:"Nosaukums", titleReq:"Nosaukums ir obligāts", titlePh:"piemēram: sarkana bumba",
      s3q:"Kur atradi?", s3ph:"piemēram: pie šūpolēm",
      s4q:"Kas atrada?", s4ph:"piemēram: Makss",
      s5q:"Pastāsti mazliet", s5ph:"piemēram: gulēja pie koka.",
      canSkip:"Vari izlaist", skip:"Izlaist", next:"Tālāk",
      savedTitle:"Atradums saglabāts", view:"Apskatīt", addMore:"Pievienot vēl",
      fWho:"Kas atrada", fWhere:"Kur atrasts", fDesc:"Apraksts", fAdded:"Pievienots",
      edit:"Rediģēt", del:"Dzēst", delConfirm:"Dzēst šo atradumu?",
      savedToast:"Atradums saglabāts", saveFailed:"Neizdevās saglabāt", deleted:"Atradums dzēsts",
      loadFailed:"Neizdevās ielādēt atradumus", photoFailed:"Neizdevās augšupielādēt foto", photoWait:"Pagaidi, līdz foto augšupielādējas",
      aria:{ photo:"Foto" }
    }},
    de:{ lost:{
      subtitle:"Speichere, was du findest",
      emptyTitle:"Fundbuero", emptyText:"Hier ist noch nichts.", emptyAdd:"Fund hinzufuegen",
      fabAdd:"Fund hinzufuegen",
      today:"Heute", yesterday:"Gestern",
      s1q:"Mach ein Foto", openCamera:"Kamera oeffnen", retake:"Neu aufnehmen", photoReq:"Foto ist erforderlich",
      s2q:"Name", titleReq:"Name ist erforderlich", titlePh:"z.B. Roter Ball",
      s3q:"Wo hast du es gefunden?", s3ph:"z.B. Bei den Schaukeln",
      s4q:"Wer hat es gefunden?", s4ph:"z.B. Max",
      s5q:"Erzaehl ein bisschen", s5ph:"z.B. Es lag neben dem Baum.",
      canSkip:"Du kannst das ueberspringen", skip:"Ueberspringen", next:"Weiter",
      savedTitle:"Fund gespeichert", view:"Ansehen", addMore:"Noch einen hinzufuegen",
      fWho:"Wer es gefunden hat", fWhere:"Wo es gefunden wurde", fDesc:"Beschreibung", fAdded:"Hinzugefuegt",
      edit:"Bearbeiten", del:"Loeschen", delConfirm:"Diesen Fund loeschen?",
      savedToast:"Fund gespeichert", saveFailed:"Konnte nicht gespeichert werden", deleted:"Fund geloescht",
      loadFailed:"Funde konnten nicht geladen werden", photoFailed:"Foto konnte nicht hochgeladen werden", photoWait:"Warte, bis das Foto hochgeladen ist",
      aria:{ photo:"Foto" }
    }},
    /* шаблоны родительского журнала (core/parent.js: ключ parent.ev.<module>.<type>) */
    en2:null
  };
  /* родительский журнал — отдельной веткой, чтобы deepMerge не трогал строки модуля */
  MESSAGES.en.parent={ ev:{ lost:{ find_added:"added a find — {title}" } } };
  MESSAGES.ru.parent={ ev:{ lost:{ find_added:"добавил находку — {title}" } } };
  MESSAGES.lv.parent={ ev:{ lost:{ find_added:"pievienoja atradumu — {title}" } } };
  MESSAGES.de.parent={ ev:{ lost:{ find_added:"hat einen Fund hinzugefuegt — {title}" } } };
  delete MESSAGES.en2;

  /* иконки (шапочные back даёт общая рамка; локально — гем-заголовок, камера, правка, корзина) */
  var GEM_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M6 3.2h12l3 5-9 12.6L3 8.2z"/><path d="M3 8.2h18M9 3.2l-3 5 6 12.6 6-12.6-3-5"/></svg>';
  var CAM_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2L9 4.8h6L16.5 7h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="13" r="3.4"/></svg>';
  var EDIT_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>';
  var DEL_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 7h14M9 7V5h6v2M7 7l1 13h8l1-13"/></svg>';

  var sdk=null, root=null, E={}, items=[], fabH=null, loaded=false, loadErr=false, uploadSeq=0;
  var view="list";            // "list" | "wizard" | "success"
  var form=blankForm(), lastSavedId=null;
  function blankForm(){ return {id:null, step:1, photo:null, photoPreview:null, uploading:false, title:"", location:"", author:"", description:""}; }

  function esc(s){ return RobTop.util.esc(s); }
  function t(k,p){ return sdk.t(k,p); }

  /* ----- данные ----- */
  function dataOf(it){ return (it&&it.data)||{}; }
  function createdOf(it){ var c=dataOf(it).createdAt; return typeof c==="number"?c:0; }
  function byId(id){ for(var i=0;i<items.length;i++){ if(String(items[i].id)===String(id)) return items[i]; } return null; }
  function sortItems(){ items.sort(function(a,b){ return createdOf(b)-createdOf(a); }); } // новые сверху
  function load(){
    sdk.data.list("finds").then(function(list){
      if(!root) return;
      items=(list||[]).filter(function(it){ return it&&it.data&&it.data.title; });
      loaded=true; loadErr=false; sortItems(); render();
    }).catch(function(){ if(!root) return; items=[]; loaded=true; loadErr=true; render(); });
  }

  function fmtAdded(ms){
    var d=new Date(ms||Date.now());
    return sdk.formatDate(d, {day:"numeric", month:"long", year:"numeric"});
  }
  function fmtShort(ms){
    var now=new Date(), d=new Date(ms||Date.now());
    var a=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    var b=new Date(d.getFullYear(),d.getMonth(),d.getDate());
    var diff=Math.round((a-b)/86400000);
    if(diff<=0) return t("today");
    if(diff===1) return t("yesterday");
    return sdk.formatDate(d, {day:"numeric", month:"short"});
  }

  /* =================== РЕНДЕР =================== */
  function render(){
    if(!E.body) return;
    if(view==="wizard"){ renderWizard(); syncFab(); return; }
    if(view==="success"){ renderSuccess(); syncFab(); return; }
    renderList(); syncFab();
  }

  function syncFab(){
    if(!fabH) return;
    if(sdk.can("edit") && view==="list" && loaded && items.length) fabH.show(); else fabH.hide();
  }

  function renderList(){
    if(!loaded){ E.body.innerHTML='<div class="rt-loading"><div class="rt-spin"></div></div>'; return; }
    if(loadErr && !items.length){ E.body.innerHTML='<div class="lf-empty"><div class="lf-empty-emo">📦</div><p class="lf-empty-text">'+esc(t("loadFailed"))+'</p></div>'; return; }
    if(!items.length){
      var addBtn = sdk.can("edit") ? '<button class="lf-btn" id="lfEmptyAdd" style="flex:none;min-width:220px">'+esc(t("emptyAdd"))+'</button>' : "";
      E.body.innerHTML='<div class="lf-empty"><div class="lf-empty-emo">📦</div>'
        +'<h3 class="lf-empty-title">'+esc(t("emptyTitle"))+'</h3>'
        +'<p class="lf-empty-text">'+esc(t("emptyText"))+'</p>'+addBtn+'</div>';
      return;
    }
    E.body.innerHTML='<div class="lf-list">'+items.map(cardHtml).join("")+'</div>';
  }
  function cardHtml(it){
    var d=dataOf(it), photo=d.photo?sdk.media.url(d.photo):"";
    return '<div class="lf-card" data-id="'+esc(it.id)+'">'
      +'<div class="lf-card-photo"'+(photo?' style="background-image:url(\''+esc(photo)+'\')"':"")+'></div>'
      +'<div class="lf-card-body"><h3 class="lf-card-title">'+esc(d.title||"")+'</h3>'
      +'<div class="lf-card-meta">'
        +'<span class="lf-card-author">'+(d.author?esc(d.author):"")+'</span>'
        +'<span class="lf-card-date">'+esc(fmtShort(d.createdAt))+'</span>'
      +'</div></div></div>';
  }

  /* ----- мастер (один вопрос на экран, только вперёд) ----- */
  function renderWizard(){
    var st=form.step, h='<div class="lf-wiz"><div class="lf-progress">';
    for(var i=1;i<=5;i++){ h+='<span class="lf-dot'+(i<=st?" on":"")+'"></span>'; }
    h+='</div>';
    if(st===1){
      var src=form.photoPreview||form.photo||"", url=src?sdk.media.url(src):"";
      h+='<h2 class="lf-step-q">'+esc(t("s1q"))+'</h2><p class="lf-required">'+esc(t("photoReq"))+'</p>'
        +'<div class="lf-photo'+(src?" has":"")+(form.uploading?" uploading":"")+'" id="lfPhoto" role="button" aria-label="'+esc(t("aria.photo"))+'"'
          +(src?' style="background-image:url(\''+esc(url)+'\')"':"")+'>'
          +(src?'<span class="lf-photo-cap">'+esc(t("retake"))+'</span>':'<span class="pic">'+CAM_IC+'</span><span>'+esc(t("openCamera"))+'</span>')
        +'</div>'
        +'<div class="lf-step-actions"><button class="lf-btn" id="lfNext"'+((form.photo&&!form.uploading)?"":" disabled")+'>'+esc(t("next"))+'</button></div>';
    } else if(st===2){
      h+='<h2 class="lf-step-q">'+esc(t("s2q"))+'</h2><p class="lf-required">'+esc(t("titleReq"))+'</p>'
        +'<input class="lf-input" id="lfTitle" type="text" maxlength="80" placeholder="'+esc(t("titlePh"))+'" value="'+esc(form.title||"")+'">'
        +'<div class="lf-step-actions"><button class="lf-btn" id="lfNext">'+esc(t("next"))+'</button></div>';
    } else if(st===3){
      h+='<h2 class="lf-step-q">'+esc(t("s3q"))+'</h2><p class="lf-optional">'+esc(t("canSkip"))+'</p>'
        +'<input class="lf-input" id="lfLoc" type="text" maxlength="120" placeholder="'+esc(t("s3ph"))+'" value="'+esc(form.location||"")+'">'
        +'<div class="lf-step-actions"><button class="lf-btn-skip" id="lfSkip">'+esc(t("skip"))+'</button>'
        +'<button class="lf-btn" id="lfNext">'+esc(t("next"))+'</button></div>';
    } else if(st===4){
      h+='<h2 class="lf-step-q">'+esc(t("s4q"))+'</h2><p class="lf-optional">'+esc(t("canSkip"))+'</p>'
        +'<input class="lf-input" id="lfAuthor" type="text" maxlength="60" placeholder="'+esc(t("s4ph"))+'" value="'+esc(form.author||"")+'">'
        +'<div class="lf-step-actions"><button class="lf-btn-skip" id="lfSkip">'+esc(t("skip"))+'</button>'
        +'<button class="lf-btn" id="lfNext">'+esc(t("next"))+'</button></div>';
    } else {
      h+='<h2 class="lf-step-q">'+esc(t("s5q"))+'</h2><p class="lf-optional">'+esc(t("canSkip"))+'</p>'
        +'<textarea class="lf-ta" id="lfDesc" maxlength="400" placeholder="'+esc(t("s5ph"))+'">'+esc(form.description||"")+'</textarea>'
        +'<div class="lf-step-actions"><button class="lf-btn-skip" id="lfSkip">'+esc(t("skip"))+'</button>'
        +'<button class="lf-btn" id="lfNext"'+(form.uploading?" disabled":"")+'>'+esc(t("next"))+'</button></div>';
    }
    h+='</div>';
    E.body.innerHTML=h;
  }

  /* фиксируем значение текущего шага из DOM в форму (перед переходом) */
  function captureStep(){
    if(!E.body) return;
    var el;
    if(form.step===2 && (el=E.body.querySelector("#lfTitle"))) form.title=el.value.trim().slice(0,80);
    if(form.step===3 && (el=E.body.querySelector("#lfLoc")))   form.location=el.value.trim().slice(0,120);
    if(form.step===4 && (el=E.body.querySelector("#lfAuthor"))) form.author=el.value.trim().slice(0,60);
    if(form.step===5 && (el=E.body.querySelector("#lfDesc")))  form.description=el.value.trim().slice(0,400);
  }
  function nextStep(skip){
    captureStep();
    if(form.step===1){ if(!form.photo||form.uploading) return; }
    if(form.step===2){ if(skip) return; if(!form.title){ sdk.ui.toast(t("titleReq")); var el=E.body&&E.body.querySelector("#lfTitle"); if(el){ try{ el.focus(); }catch(e){} } return; } }
    if(form.step>=5){ save(); return; }
    form.step++; render();
    var f=E.body&&E.body.querySelector(".lf-input, .lf-ta"); if(f && form.step>1){ try{ f.focus(); }catch(e){} }
  }

  /* ----- фото (только камера) ----- */
  function pickPhoto(){
    if(form.uploading) return;
    var picked=false, token=++uploadSeq;
    sdk.media.pick({ kind:"lost", source:"camera", onLocal:function(dataUrl){
        if(token!==uploadSeq||!dataUrl) return;
        picked=true; form.uploading=true; form.photoPreview=dataUrl; render();
      } })
      .then(function(r){
        if(token!==uploadSeq) return;
        form.uploading=false;
        if(r && r.path){ form.photo=r.path; form.photoPreview=null; }
        else { form.photoPreview=null; if(picked) sdk.ui.toast(t("photoFailed")); }
        if(view==="wizard") render();
      }).catch(function(){
        if(token!==uploadSeq) return;
        form.uploading=false; form.photoPreview=null;
        if(picked) sdk.ui.toast(t("photoFailed"));
        if(view==="wizard") render();
      });
  }

  /* ----- сохранение ----- */
  function save(){
    if(!sdk.can("edit")) return;
    captureStep();
    if(!form.photo){ form.step=1; render(); return; }
    if(form.uploading){ sdk.ui.toast(t("photoWait")); return; }
    if(!form.title){ form.step=2; render(); sdk.ui.toast(t("titleReq")); return; }
    var editing=!!form.id, fid=form.id;
    var payload={ photo:form.photo, title:form.title,
      location:form.location||"", author:form.author||"", description:form.description||"",
      createdAt: editing ? (byId(fid)?createdOf(byId(fid)):Date.now()) || Date.now() : Date.now() };
    var p;
    if(editing){
      p=sdk.data.update("finds", fid, payload).then(function(){ var it=byId(fid); if(it) it.data=Object.assign({},it.data,payload); return it; });
    } else {
      p=sdk.data.create("finds", payload).then(function(item){ if(item){ items.push(item); } else { load(); } return item; });
    }
    p.then(function(item){
      if(!root) return;
      lastSavedId = editing ? fid : (item&&item.id) || null;
      if(!editing) sdk.events.track("find_added",{ title:form.title });
      sortItems();
      form=blankForm();
      sdk.ui.haptics(10); sdk.ui.chime();
      view="success"; render();
    }).catch(function(){ sdk.ui.toast(t("saveFailed")); });
  }

  /* ----- экран «сохранено» ----- */
  function renderSuccess(){
    E.body.innerHTML='<div class="lf-success"><div class="lf-success-emo">✅</div>'
      +'<h3 class="lf-success-title">'+esc(t("savedTitle"))+'</h3>'
      +'<div class="lf-success-actions">'
        +'<button class="lf-btn" id="lfView">'+esc(t("view"))+'</button>'
        +'<button class="lf-btn-skip" id="lfMore">'+esc(t("addMore"))+'</button>'
      +'</div></div>';
  }

  /* ----- просмотр карточки (шторка) ----- */
  function field(lbl, val){
    if(!val) return "";
    return '<div class="lf-field"><span class="lf-field-lbl">'+esc(lbl)+'</span><span class="lf-field-val">'+esc(val)+'</span></div>';
  }
  function openDetail(id){
    var it=byId(id); if(!it) return;
    var d=dataOf(it), photo=d.photo?sdk.media.url(d.photo):"";
    var node=document.createElement("div"); node.className="lf-detail";
    node.innerHTML='<h2>'+esc(d.title||"")+'</h2>'
      +(photo?'<div class="lf-bigphoto" style="background-image:url(\''+esc(photo)+'\')"></div>':"")
      +field(t("fWho"), d.author)
      +field(t("fWhere"), d.location)
      +field(t("fDesc"), d.description)
      +field(t("fAdded"), fmtAdded(d.createdAt))
      +(sdk.can("edit")?'<div class="lf-detail-actions">'
        +'<button class="btn" id="lfEdit">'+EDIT_IC+'<span>'+esc(t("edit"))+'</span></button>'
        +'<button class="btn btn-danger" id="lfDel">'+DEL_IC+'<span>'+esc(t("del"))+'</span></button></div>':'')
      +'<div class="sheet-actions" style="margin-top:12px"><button class="btn btn-cancel" data-close style="flex:1">'+esc(t("common.close"))+'</button></div>';
    var sh=sdk.ui.sheet(node);
    node.querySelector("[data-close]").addEventListener("click", sh.close);
    var ed=node.querySelector("#lfEdit"); if(ed) ed.addEventListener("click", function(){ sh.close(); openEdit(id); });
    var dl=node.querySelector("#lfDel"); if(dl) dl.addEventListener("click", function(){ sh.close(); askDelete(id); });
  }

  function openEdit(id){
    var it=byId(id); if(!it||!sdk.can("edit")) return;
    var d=dataOf(it);
    uploadSeq++;
    form={ id:id, step:1, photo:d.photo||null, photoPreview:null, uploading:false,
      title:d.title||"", location:d.location||"", author:d.author||"", description:d.description||"" };
    view="wizard"; render();
  }
  function askDelete(id){
    if(!sdk.can("edit")) return;
    var it=byId(id); if(!it) return; var snapshot=Object.assign({}, dataOf(it));
    sdk.ui.confirm({ title:t("delConfirm"), ok:t("del"), cancel:t("common.no") }).then(function(ok){
      if(!ok||!root) return;
      sdk.data.remove("finds", id);
      items=items.filter(function(x){ return String(x.id)!==String(id); });
      render();
      sdk.ui.toast(t("deleted"), t("common.undo"), function(){
        sdk.data.restore("finds", id).then(function(){ if(!root) return; if(!byId(id)) items.push({id:id, data:snapshot}); sortItems(); render(); });
      });
    });
  }

  /* ----- запуск мастера ----- */
  function openCreate(){
    if(!sdk.can("edit")) return;
    uploadSeq++; form=blankForm(); view="wizard"; render();
  }

  /* =================== mount / unmount =================== */
  function mount(rootEl, theSdk){
    sdk=theSdk; root=rootEl; items=[]; E={}; loaded=false; loadErr=false; uploadSeq=0;
    view="list"; form=blankForm(); lastSavedId=null; fabH=null;
    var title=sdk.i18n.t("tile.lost");
    var body=sdk.ui.frame({
      titleHtml:'<div class="lf-title"><span class="sic">'+GEM_IC+'</span> '+esc(title)+'</div>'
        +'<div class="lf-sub">'+esc(t("subtitle"))+'</div>',
      backLabel:t("common.back")
    }).body;
    body.innerHTML='<div id="lfBody"></div>';
    E.body=body.querySelector("#lfBody");
    if(sdk.can("edit")) fabH=sdk.ui.fab(t("fabAdd"), openCreate);

    sdk.on(root,"click",function(e){
      if(e.target.closest("#lfEmptyAdd")){ openCreate(); return; }
      if(e.target.closest("#lfPhoto")){ pickPhoto(); return; }
      if(e.target.closest("#lfSkip")){ nextStep(true); return; }
      if(e.target.closest("#lfNext")){ nextStep(false); return; }
      if(e.target.closest("#lfView")){ view="list"; render(); if(lastSavedId) openDetail(lastSavedId); return; }
      if(e.target.closest("#lfMore")){ openCreate(); return; }
      var card=e.target.closest(".lf-card"); if(card){ openDetail(card.getAttribute("data-id")); return; }
    });

    render(); load();
  }
  function unmount(){
    if(fabH){ try{ fabH.destroy(); }catch(e){} fabH=null; }
    E={}; items=[]; root=null; loaded=false; loadErr=false; uploadSeq++;
    view="list"; form=blankForm(); lastSavedId=null;
  }

  RobTop.register({ id:"lost", mount:mount, unmount:unmount, messages:MESSAGES });
})();
