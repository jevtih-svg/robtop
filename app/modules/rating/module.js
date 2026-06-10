/* RobTop — модуль «Оценка дня». Каждый вечер с 20:00 до 00:00 (время устройства) ребёнок
   оценивает день звёздами 1–5, пишет «потому что…», «мне сегодня понравилось…» и добавляет фото.
   Пропустил окно — день остаётся без оценки. Статистика по звёздам + история дней.
   Данные — generic-стор (sdk.data, коллекция entries), одна запись на день (data.day = YYYY-MM-DD). */
(function(){
  "use strict";

  /* =================== ЛОКАЛИЗАЦИЯ (en/ru/lv) =================== */
  var MESSAGES={
    en:{ rating:{
      subtitle:"How did your day go?",
      hudLeft:"Day <b>rating</b>", hudCLbl:"days rated", hudRLbl:"five-star",
      pickTitle:"How was today?", pickHint:"Tap the stars",
      why:"Because…", whyPh:"e.g. I played outside",
      liked:"What I liked most today…", likedPh:"e.g. watching a movie",
      addPhoto:"Add photo", replacePhoto:"Replace photo",
      editBtn:"Edit", needStars:"Pick the stars first",
      savedToast:"Day rated: {stars}★", saveFailed:"Couldn't save",
      photoFailed:"Couldn't upload photo", loadFailed:"Couldn't load",
      todayDone:"Today is rated!", editUntil:"You can change it until 00:00",
      waitTitle:"Come back tonight!", waitText:"You can rate your day from 20:00 to 00:00.",
      waitIn:"Opens in {time}", unitH:"h", unitM:"min",
      historyTitle:"My days", historyEmpty:"No ratings yet. Come back tonight at 20:00!",
      statsTitle:"Rating stats", statsTimes:{one:"{count} time", other:"{count} times"},
      statsFive:"five-star days",
      parentNote:"Only the child rates the day. You're viewing.",
      noText:"(no description)",
      aria:{ stats:"Stats", stars:"{n} stars", photo:"Photo" }
    }},
    ru:{ rating:{
      subtitle:"Как прошёл твой день?",
      hudLeft:"Оценка <b>дня</b>", hudCLbl:"дней оценено", hudRLbl:"на пять звёзд",
      pickTitle:"Какой был день?", pickHint:"Нажми на звёзды",
      why:"Потому что…", whyPh:"например: я погулял на улице",
      liked:"Мне сегодня понравилось…", likedPh:"например: смотреть фильм",
      addPhoto:"Добавить фото", replacePhoto:"Заменить фото",
      editBtn:"Изменить", needStars:"Сначала выбери звёзды",
      savedToast:"День оценён: {stars}★", saveFailed:"Не удалось сохранить",
      photoFailed:"Не удалось загрузить фото", loadFailed:"Не удалось загрузить",
      todayDone:"Сегодня оценено!", editUntil:"Можно изменить до 00:00",
      waitTitle:"Возвращайся вечером!", waitText:"Оценить день можно с 20:00 до 00:00.",
      waitIn:"Откроется через {time}", unitH:"ч", unitM:"мин",
      historyTitle:"Мои дни", historyEmpty:"Оценок пока нет. Приходи вечером в 20:00!",
      statsTitle:"Статистика оценок", statsTimes:{one:"{count} раз", few:"{count} раза", many:"{count} раз", other:"{count} раза"},
      statsFive:"дней на пять звёзд",
      parentNote:"День оценивает ребёнок. Это просмотр.",
      noText:"(без описания)",
      aria:{ stats:"Статистика", stars:"{n} звёзд", photo:"Фото" }
    }},
    lv:{ rating:{
      subtitle:"Kā pagāja tava diena?",
      hudLeft:"Dienas <b>vērtējums</b>", hudCLbl:"novērtētas dienas", hudRLbl:"piecas zvaigznes",
      pickTitle:"Kāda bija diena?", pickHint:"Pieskaries zvaigznēm",
      why:"Tāpēc ka…", whyPh:"piemēram: es pastaigājos ārā",
      liked:"Šodien man visvairāk patika…", likedPh:"piemēram: skatīties filmu",
      addPhoto:"Pievienot foto", replacePhoto:"Nomainīt foto",
      editBtn:"Mainīt", needStars:"Vispirms izvēlies zvaigznes",
      savedToast:"Diena novērtēta: {stars}★", saveFailed:"Neizdevās saglabāt",
      photoFailed:"Neizdevās augšupielādēt foto", loadFailed:"Neizdevās ielādēt",
      todayDone:"Šodiena ir novērtēta!", editUntil:"Var mainīt līdz 00:00",
      waitTitle:"Atgriezies vakarā!", waitText:"Dienu var novērtēt no 20:00 līdz 00:00.",
      waitIn:"Atvērsies pēc {time}", unitH:"st.", unitM:"min",
      historyTitle:"Manas dienas", historyEmpty:"Vērtējumu vēl nav. Atnāc vakarā 20:00!",
      statsTitle:"Vērtējumu statistika", statsTimes:{zero:"{count} reižu", one:"{count} reize", other:"{count} reizes"},
      statsFive:"piecu zvaigžņu dienas",
      parentNote:"Dienu vērtē bērns. Šis ir skats.",
      noText:"(bez apraksta)",
      aria:{ stats:"Statistika", stars:"{n} zvaigznes", photo:"Foto" }
    }}
  };

  /* Общие иконки шапки (назад/статистика) идут из реестра оболочки (sdk.icons) — здесь только свои. */
  var STAR_PATH='M12 3l2.7 5.7 6.3.8-4.6 4.4 1.2 6.2L12 17.8 6.4 20.1l1.2-6.2L3 9.5l6.3-.8z';
  var STAR_F='<svg viewBox="0 0 24 24" fill="currentColor"><path d="'+STAR_PATH+'"/></svg>';
  var STAR_O='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="'+STAR_PATH+'"/></svg>';
  var CAM_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2L9 4.8h6L16.5 7h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="13" r="3.4"/></svg>';

  var sdk=null, root=null, E={}, items=[], timer=null, lastSig="", loaded=false, loadFailed=false, form=blankForm();
  function blankForm(){ return {open:false, stars:0, photo:null, editingId:null, why:"", liked:""}; }

  function esc(s){ return RobTop.util.esc(s); }
  function t(k,p){ return sdk.t(k,p); }

  /* ----- время: окно 20:00–00:00 по времени устройства ----- */
  function pad2(n){ return RobTop.util.pad2(n); }
  function dayKey(d){ return RobTop.util.dayKey(d); }
  function inWindow(){ return new Date().getHours()>=20; }
  function msToOpen(){ var n=new Date(); return new Date(n.getFullYear(),n.getMonth(),n.getDate(),20,0,0)-n; }
  function countdownStr(){
    var min=Math.max(1, Math.ceil(msToOpen()/60000)), h=Math.floor(min/60), m=min%60;
    return h>0 ? h+" "+t("unitH")+" "+m+" "+t("unitM") : m+" "+t("unitM");
  }
  function sig(){ return dayKey()+":"+(inWindow()?"1":"0"); }

  /* ----- данные ----- */
  function dataOf(it){ return (it&&it.data)||{}; }
  function sortItems(){ items.sort(function(a,b){ var x=dataOf(a).day||"", y=dataOf(b).day||""; return x<y?1:(x>y?-1:0); }); }
  function entryFor(day){ for(var i=0;i<items.length;i++){ if(dataOf(items[i]).day===day) return items[i]; } return null; }
  function counts(){ var c=[0,0,0,0,0,0]; items.forEach(function(it){ var s=dataOf(it).stars; if(s>=1&&s<=5) c[s]++; }); return c; }
  function load(){
    sdk.data.list("entries").then(function(list){
      if(!root) return; // размонтирован, пока грузилось
      items=(list||[]).filter(function(it){ return dataOf(it).day; });
      loaded=true; loadFailed=false;
      sortItems(); renderState(); renderHistory(); hud();
    }).catch(function(){ if(!root) return; items=[]; loaded=true; loadFailed=true; renderState(); renderHistory(); hud(); });
  }

  function hud(){ var c=counts(); sdk.ui.hud({ left:t("hudLeft"), cNum:items.length, cLbl:t("hudCLbl"), rNum:c[5], rLbl:t("hudRLbl") }); }

  /* ----- звёзды ----- */
  function starsHtml(n, interactive, extra){
    var h='<div class="rd-stars '+(extra||"")+(interactive?"":" ro")+'">';
    for(var k=1;k<=5;k++){
      h+='<button type="button" class="rd-star'+(k<=n?" on":"")+'"'+(interactive?' data-star="'+k+'"':' tabindex="-1"')
        +' aria-label="'+esc(t("aria.stars",{n:k}))+'">'+(k<=n?STAR_F:STAR_O)+'</button>';
    }
    return h+'</div>';
  }

  /* ----- состояние (карточка сверху) ----- */
  function renderState(){
    if(!root||!E.state) return;
    lastSig=sig();
    var today=dayKey(), entry=entryFor(today), canEdit=sdk.can("edit");
    if(!canEdit){
      E.state.innerHTML='<div class="rd-card"><p class="rd-note" style="margin:0">'+esc(t("parentNote"))+'</p></div>';
      return;
    }
    if(!inWindow()){
      E.state.innerHTML='<div class="rd-card"><h3 class="rd-card-title">'+esc(t("waitTitle"))+'</h3>'
        +'<p class="rd-hint">'+esc(t("waitText"))+'</p>'
        +'<div class="rd-count" id="rdCount">'+esc(t("waitIn",{time:countdownStr()}))+'</div></div>';
      return;
    }
    if(form.open){ renderForm(); return; }
    if(entry){
      var d=dataOf(entry);
      E.state.innerHTML='<div class="rd-card"><h3 class="rd-card-title">'+esc(t("todayDone"))+'</h3>'
        +starsHtml(d.stars||0,false)
        +(d.why?'<p class="rd-text"><b>'+esc(t("why"))+'</b> '+esc(d.why)+'</p>':"")
        +(d.liked?'<p class="rd-text"><b>'+esc(t("liked"))+'</b> '+esc(d.liked)+'</p>':"")
        +(d.photo?'<div class="rd-bigphoto" style="background-image:url(\''+esc(sdk.media.url(d.photo))+'\')"></div>':"")
        +'<div class="rd-form-actions"><button class="btn" id="rdEdit">'+esc(t("editBtn"))+'</button></div>'
        +'<p class="rd-note">'+esc(t("editUntil"))+'</p></div>';
      return;
    }
    E.state.innerHTML='<div class="rd-card"><h3 class="rd-card-title">'+esc(t("pickTitle"))+'</h3>'
      +'<p class="rd-hint">'+esc(t("pickHint"))+'</p>'+starsHtml(0,true)+'</div>';
  }

  /* ----- форма (звёзды + потому что + понравилось + фото) -----
     Рендерится один раз при открытии; смена звёзд обновляется на месте (updateFormStars),
     чтобы не стирать набранный текст. */
  function renderForm(){
    if(!root||!E.state) return;
    E.state.innerHTML='<div class="rd-card"><h3 class="rd-card-title">'+esc(t("pickTitle"))+'</h3>'
      +starsHtml(form.stars,true)
      +'<label class="rd-lbl" for="rdWhy">'+esc(t("why"))+'</label>'
      +'<textarea class="rd-ta" id="rdWhy" maxlength="400" placeholder="'+esc(t("whyPh"))+'">'+esc(form.why||"")+'</textarea>'
      +'<label class="rd-lbl" for="rdLiked">'+esc(t("liked"))+'</label>'
      +'<textarea class="rd-ta" id="rdLiked" maxlength="400" placeholder="'+esc(t("likedPh"))+'">'+esc(form.liked||"")+'</textarea>'
      +'<div class="rd-photo'+(form.photo?" has":"")+'" id="rdPhotoPick" role="button" aria-label="'+esc(t("aria.photo"))+'"'
        +(form.photo?' style="background-image:url(\''+esc(sdk.media.url(form.photo))+'\')"':"")+'>'
        +(form.photo?'<span>'+esc(t("replacePhoto"))+'</span>':'<span class="pic">'+CAM_IC+'</span><span>'+esc(t("addPhoto"))+'</span>')
      +'</div>'
      +'<div class="rd-form-actions"><button class="btn btn-cancel" id="rdCancel">'+esc(t("common.cancel"))+'</button>'
      +'<button class="btn btn-primary" id="rdSave">'+esc(t("common.save"))+'</button></div></div>';
  }
  function updateFormStars(){
    if(!E.state) return;
    var btns=E.state.querySelectorAll(".rd-stars [data-star]");
    for(var i=0;i<btns.length;i++){ var on=(i+1)<=form.stars; btns[i].classList.toggle("on",on); btns[i].innerHTML=on?STAR_F:STAR_O; }
  }

  /* ----- фото: уменьшение + (демо: dataUrl) / (сервер: upload → путь) ----- */
  function setPhoto(src){
    form.photo=src||null;
    var pick=E.state&&E.state.querySelector("#rdPhotoPick");
    if(pick){ pick.classList.toggle("has",!!src); pick.style.backgroundImage=src?"url('"+src+"')":"";
      pick.innerHTML=src?'<span>'+esc(t("replacePhoto"))+'</span>':'<span class="pic">'+CAM_IC+'</span><span>'+esc(t("addPhoto"))+'</span>'; }
  }
  /* Ф4: единый sdk.media.pick (как в mood). onLocal — мгновенное превью; .then(null) при отмене
     (превью не показывали) или при сбое загрузки (флаг picked отличает). */
  function pickPhoto(){
    var pick=E.state&&E.state.querySelector("#rdPhotoPick"), picked=false;
    sdk.media.pick({ kind:"rating", onLocal:function(dataUrl){ picked=true; setPhoto(dataUrl); if(pick) pick.classList.add("uploading"); } })
      .then(function(r){
        if(pick) pick.classList.remove("uploading");
        if(r && r.path){ form.photo=r.path; }
        else if(picked){ setPhoto(null); sdk.ui.toast(t("photoFailed")); }
      });
  }

  /* ----- сохранение ----- */
  var saving=false; // защита от двойного тапа по «Сохранить»
  function save(){
    if(!sdk.can("edit")||saving) return;
    if(!inWindow()){ form=blankForm(); sdk.ui.toast(t("waitText")); renderState(); return; }
    var st=form.stars;
    if(!(st>=1&&st<=5)){ sdk.ui.toast(t("needStars")); return; }
    var whyEl=E.state.querySelector("#rdWhy"), likedEl=E.state.querySelector("#rdLiked");
    var day=dayKey();
    var payload={ day:day, stars:st, why:(whyEl?whyEl.value:"").trim().slice(0,400),
      liked:(likedEl?likedEl.value:"").trim().slice(0,400), photo:form.photo||null };
    var existing=entryFor(day), edited=!!existing, p;
    if(existing){
      p=sdk.data.update("entries", existing.id, payload).then(function(){ existing.data=Object.assign({},existing.data,payload); });
    }else{
      p=sdk.data.create("entries", payload).then(function(item){ if(item){ items.push(item); } else { load(); } });
    }
    p.then(function(){
      if(!root) return;
      form=blankForm();
      sdk.events.track("day_rated",{day:day, stars:st, hasPhoto:!!payload.photo, edited:edited});
      sdk.ui.haptics(10);
      if(st===5){ sdk.ui.confetti(); sdk.ui.chime(); }
      sdk.ui.toast(t("savedToast",{stars:st}));
      sortItems(); renderState(); renderHistory(); hud();
    }).catch(function(){ sdk.ui.toast(t("saveFailed")); });
  }

  /* ----- история ----- */
  function visibleHistory(){
    var today=dayKey(), canEdit=sdk.can("edit");
    return items.filter(function(it){
      if(canEdit && inWindow() && dataOf(it).day===today) return false; // сегодняшняя уже в карточке сверху
      return true;
    });
  }
  function renderHistory(){
    if(!root||!E.list) return;
    /* первая загрузка ещё идёт — спиннер вместо ложного «пусто» */
    if(!loaded){ E.list.innerHTML='<div class="rt-loading"><div class="rt-spin"></div></div>'; return; }
    var list=visibleHistory();
    if(!list.length){ E.list.innerHTML='<div class="rd-empty">'+esc(t(loadFailed?"loadFailed":"historyEmpty"))+'</div>'; return; }
    E.list.innerHTML=list.map(function(it){
      var d=dataOf(it), snippet=d.why||d.liked||t("noText");
      var thumb=d.photo?'<div class="rd-thumb" style="background-image:url(\''+esc(sdk.media.url(d.photo))+'\')"></div>':'<div class="rd-thumb">'+STAR_F+'</div>';
      return '<div class="rd-row" data-id="'+esc(it.id)+'">'+thumb
        +'<div class="m"><div class="d">'+esc(fmtDay(d.day))+'</div>'+starsHtml(d.stars||0,false,"mini")
        +'<div class="s">'+esc(snippet)+'</div></div></div>';
    }).join("");
  }
  function fmtDay(day){
    var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(day||"")); if(!m) return String(day||"");
    return sdk.formatDate(new Date(+m[1],+m[2]-1,+m[3],12,0,0), {weekday:"short", day:"numeric", month:"long"});
  }

  /* ----- шторки: день и статистика ----- */
  function openDetail(id){
    var it=null; for(var i=0;i<items.length;i++){ if(String(items[i].id)===String(id)){ it=items[i]; break; } }
    if(!it) return;
    var d=dataOf(it), node=document.createElement("div"); node.className="rd-detail";
    node.innerHTML='<h2>'+esc(fmtDay(d.day))+'</h2>'+starsHtml(d.stars||0,false)
      +(d.photo?'<div class="rd-bigphoto" style="background-image:url(\''+esc(sdk.media.url(d.photo))+'\')"></div>':"")
      +(d.why?'<span class="rd-lbl">'+esc(t("why"))+'</span><div class="rd-text">'+esc(d.why)+'</div>':"")
      +(d.liked?'<span class="rd-lbl">'+esc(t("liked"))+'</span><div class="rd-text">'+esc(d.liked)+'</div>':"")
      +((!d.why&&!d.liked)?'<div class="rd-text" style="text-align:center">'+esc(t("noText"))+'</div>':"")
      +'<div class="sheet-actions" style="margin-top:14px"><button class="btn btn-cancel" data-close style="flex:1">'+esc(t("common.close"))+'</button></div>';
    var sh=sdk.ui.sheet(node);
    node.querySelector("[data-close]").addEventListener("click",sh.close);
  }
  function openStats(){
    sdk.events.track("viewed_stats",{});
    var c=counts(), node=document.createElement("div"), rows="";
    for(var n=1;n<=4;n++){
      var stars=""; for(var k=1;k<=5;k++){ stars+='<span'+(k<=n?"":' class="o"')+'>'+(k<=n?STAR_F:STAR_O)+'</span>'; }
      rows+='<div class="rd-stat-row"><div class="st">'+stars+'</div><div class="n">'+esc(t("statsTimes",{count:c[n]}))+'</div></div>';
    }
    var five=""; for(var j=0;j<5;j++) five+="<span>"+STAR_F+"</span>";
    node.innerHTML='<h2>'+esc(t("statsTitle"))+'</h2><div class="rd-stat-rows">'+rows+'</div>'
      +'<div class="rd-stat-five"><div class="st">'+five+'</div><div class="n">'+c[5]+'</div><div class="l">'+esc(t("statsFive"))+'</div></div>'
      +'<div class="sheet-actions" style="margin-top:14px"><button class="btn btn-cancel" data-close style="flex:1">'+esc(t("common.close"))+'</button></div>';
    var sh=sdk.ui.sheet(node);
    node.querySelector("[data-close]").addEventListener("click",sh.close);
  }

  /* ----- тик: обратный отсчёт + смена состояния на границах 20:00 и 00:00 ----- */
  function tick(){
    if(!root||!document.body.contains(root)) return; // корень мог исчезнуть из DOM без unmount — не трогать мёртвые узлы
    if(form.open) return; // не сносить ввод; граница окна проверяется при сохранении
    if(sig()!==lastSig){ renderState(); renderHistory(); return; }
    var cd=E.state&&E.state.querySelector("#rdCount");
    if(cd && !inWindow()) cd.textContent=t("waitIn",{time:countdownStr()});
  }

  /* =================== mount / unmount =================== */
  function mount(rootEl, theSdk){
    sdk=theSdk; root=rootEl; items=[]; loaded=false; loadFailed=false; form=blankForm();
    var title=sdk.i18n.t("tile.rating");
    var body=sdk.ui.frame({
      titleHtml:'<div class="rd-title"><span class="sic">'+STAR_F+'</span> '+esc(title)+'</div><div class="rd-sub">'+esc(t("subtitle"))+'</div>',
      backLabel:t("common.back"),
      actions:[{ icon:"stats", id:"rdStats", label:t("aria.stats"), onClick:openStats }]
    }).body;
    body.innerHTML='<div class="rd">'
      +'<div id="rdState"></div>'
      +'<div class="store-section">'+esc(t("historyTitle"))+'</div><div class="rd-list" id="rdList"></div>'
    +'</div>';
    E.state=root.querySelector("#rdState"); E.list=root.querySelector("#rdList");
    /* делегирование — на внутреннем .rd (пересоздаётся при каждом mount), НЕ на root:
       root живёт между mount'ами, и слушатели на нём наслаивались бы */
    root.querySelector(".rd").addEventListener("click",function(e){
      var star=e.target.closest("[data-star]");
      if(star){ form.stars=parseInt(star.getAttribute("data-star"),10)||0; sdk.ui.haptics(6);
        if(form.open){ updateFormStars(); } else { form.open=true; renderForm(); } return; }
      if(e.target.closest("#rdSave")){ save(); return; }
      if(e.target.closest("#rdCancel")){ form=blankForm(); renderState(); return; }
      if(e.target.closest("#rdEdit")){
        var entry=entryFor(dayKey()); if(!entry) return;
        var d=dataOf(entry);
        form={open:true, stars:d.stars||0, photo:d.photo||null, editingId:entry.id, why:d.why||"", liked:d.liked||""};
        renderForm(); return; }
      if(e.target.closest("#rdPhotoPick")){ pickPhoto(); return; }
      var row=e.target.closest(".rd-row"); if(row) openDetail(row.getAttribute("data-id"));
    });
    renderState(); renderHistory(); hud(); load();
    timer=setInterval(tick, 20000);
  }
  function unmount(){
    if(timer){ clearInterval(timer); timer=null; }
    E={}; items=[]; root=null; lastSig=""; loaded=false; loadFailed=false;
    form=blankForm();
  }

  RobTop.register({ id:"rating", mount:mount, unmount:unmount, messages:MESSAGES });
})();
