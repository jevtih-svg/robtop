/* RobTop — модуль «Настроение дня». Днём с 6:00 до 22:00 (время устройства) ребёнок отмечает
   настроение одним из трёх смайликов (весёлый/средний/грустный), пишет «потому что…»,
   «мне сегодня понравилось…» и добавляет фото. Подтверждение — двойной тап по смайлику
   (1-й тап подсвечивает, 2-й подтверждает), выбранный смайлик моргает. Пропустил окно —
   день остаётся без отметки, очков нет (просто развлекаловка). Статистика — счётчики смайликов.
   Данные — generic-стор (sdk.data, коллекция entries), одна запись на день (data.day = YYYY-MM-DD). */
(function(){
  "use strict";

  /* =================== ЛОКАЛИЗАЦИЯ (en/ru/lv) =================== */
  var MESSAGES={
    en:{ mood:{
      subtitle:"How are you feeling today?",
      hudLeft:"Mood of <b>the day</b>", hudCLbl:"days marked", hudRLbl:"happy days",
      pickTitle:"What's your mood today?", pickHint:"Tap a smiley",
      confirmHint:"Tap again to confirm",
      names:{ happy:"Happy", mid:"So-so", sad:"Sad" },
      why:"Because…", whyPh:"e.g. I was kind today",
      liked:"What I liked most today…", likedPh:"e.g. watching a movie",
      addPhoto:"Add photo", replacePhoto:"Replace photo", uploadingPhoto:"Uploading photo…", photoWait:"Wait for the photo to finish uploading",
      editBtn:"Edit",
      savedToast:"Mood saved: {name}", saveFailed:"Couldn't save",
      photoFailed:"Couldn't upload photo", loadFailed:"Couldn't load entries",
      todayDone:"Mood is marked!", editUntil:"You can change it until 22:00",
      waitTitle:"See you in the morning!", waitText:"You can mark your mood from 6:00 to 22:00.",
      waitIn:"Opens in {time}", unitH:"h", unitM:"min",
      historyTitle:"My days", historyEmpty:"Nothing here yet. Mark your first mood!",
      statsTitle:"Mood stats", statsTimes:{one:"{count} time", other:"{count} times"},
      parentNote:"Only the child marks the mood. You're viewing.",
      noText:"(no description)",
      aria:{ stats:"Stats", photo:"Photo" }
    }},
    ru:{ mood:{
      subtitle:"Какое у тебя сегодня настроение?",
      hudLeft:"Настроение <b>дня</b>", hudCLbl:"дней отмечено", hudRLbl:"весёлых дней",
      pickTitle:"Какое сегодня настроение?", pickHint:"Нажми на смайлик",
      confirmHint:"Нажми ещё раз, чтобы подтвердить",
      names:{ happy:"Весёлое", mid:"Среднее", sad:"Грустное" },
      why:"Потому что…", whyPh:"например: я сегодня добрый",
      liked:"Мне сегодня понравилось…", likedPh:"например: смотреть кино",
      addPhoto:"Добавить фото", replacePhoto:"Заменить фото", uploadingPhoto:"Фото загружается…", photoWait:"Подожди, пока фото загрузится",
      editBtn:"Изменить",
      savedToast:"Настроение отмечено: {name}", saveFailed:"Не удалось сохранить",
      photoFailed:"Не удалось загрузить фото", loadFailed:"Не удалось загрузить записи",
      todayDone:"Настроение отмечено!", editUntil:"Можно изменить до 22:00",
      waitTitle:"Возвращайся утром!", waitText:"Отметить настроение можно с 6:00 до 22:00.",
      waitIn:"Откроется через {time}", unitH:"ч", unitM:"мин",
      historyTitle:"Мои дни", historyEmpty:"Записей пока нет. Отметь первое настроение!",
      statsTitle:"Статистика настроений", statsTimes:{one:"{count} раз", few:"{count} раза", many:"{count} раз", other:"{count} раза"},
      parentNote:"Настроение отмечает ребёнок. Это просмотр.",
      noText:"(без описания)",
      aria:{ stats:"Статистика", photo:"Фото" }
    }},
    lv:{ mood:{
      subtitle:"Kāds šodien ir tavs garastāvoklis?",
      hudLeft:"Dienas <b>garastāvoklis</b>", hudCLbl:"atzīmētas dienas", hudRLbl:"priecīgas dienas",
      pickTitle:"Kāds šodien garastāvoklis?", pickHint:"Pieskaries smaidiņam",
      confirmHint:"Pieskaries vēlreiz, lai apstiprinātu",
      names:{ happy:"Priecīgs", mid:"Vidējs", sad:"Skumjš" },
      why:"Tāpēc ka…", whyPh:"piemēram: es šodien biju labs",
      liked:"Šodien man visvairāk patika…", likedPh:"piemēram: skatīties filmu",
      addPhoto:"Pievienot foto", replacePhoto:"Nomainīt foto", uploadingPhoto:"Foto augšupielādējas…", photoWait:"Pagaidi, līdz foto augšupielādējas",
      editBtn:"Mainīt",
      savedToast:"Garastāvoklis atzīmēts: {name}", saveFailed:"Neizdevās saglabāt",
      photoFailed:"Neizdevās augšupielādēt foto", loadFailed:"Neizdevās ielādēt ierakstus",
      todayDone:"Garastāvoklis ir atzīmēts!", editUntil:"Var mainīt līdz 22:00",
      waitTitle:"Atnāc no rīta!", waitText:"Garastāvokli var atzīmēt no 6:00 līdz 22:00.",
      waitIn:"Atvērsies pēc {time}", unitH:"st.", unitM:"min",
      historyTitle:"Manas dienas", historyEmpty:"Ierakstu vēl nav. Atzīmē savu pirmo garastāvokli!",
      statsTitle:"Garastāvokļu statistika", statsTimes:{zero:"{count} reižu", one:"{count} reize", other:"{count} reizes"},
      parentNote:"Garastāvokli atzīmē bērns. Šis ir skats.",
      noText:"(bez apraksta)",
      aria:{ stats:"Statistika", photo:"Foto" }
    }},
    de:{ mood:{
      subtitle:"Wie fuehlst du dich heute?",
      hudLeft:"Stimmung <b>des Tages</b>", hudCLbl:"Tage markiert", hudRLbl:"frohe Tage",
      pickTitle:"Wie ist deine Stimmung heute?", pickHint:"Tippe auf ein Smiley",
      confirmHint:"Noch einmal tippen zum Bestaetigen",
      names:{ happy:"Froh", mid:"So lala", sad:"Traurig" },
      why:"Weil…", whyPh:"z.B. ich heute nett war",
      liked:"Heute hat mir am besten gefallen…", likedPh:"z.B. einen Film schauen",
      addPhoto:"Foto hinzufuegen", replacePhoto:"Foto ersetzen", uploadingPhoto:"Foto wird hochgeladen…", photoWait:"Warte, bis das Foto hochgeladen ist",
      editBtn:"Bearbeiten",
      savedToast:"Stimmung gespeichert: {name}", saveFailed:"Konnte nicht gespeichert werden",
      photoFailed:"Foto konnte nicht hochgeladen werden", loadFailed:"Eintraege konnten nicht geladen werden",
      todayDone:"Stimmung ist markiert!", editUntil:"Du kannst sie bis 22:00 aendern",
      waitTitle:"Bis morgen frueh!", waitText:"Du kannst deine Stimmung von 6:00 bis 22:00 markieren.",
      waitIn:"Oeffnet in {time}", unitH:"Std.", unitM:"Min.",
      historyTitle:"Meine Tage", historyEmpty:"Noch nichts hier. Markiere deine erste Stimmung!",
      statsTitle:"Stimmungsstatistik", statsTimes:{one:"{count} Mal", other:"{count} Mal"},
      parentNote:"Nur das Kind markiert die Stimmung. Du siehst nur zu.",
      noText:"(keine Beschreibung)",
      aria:{ stats:"Statistik", photo:"Foto" }
    }}
  };

  /* шапочные иконки (назад/статистика) даёт общий реестр sdk.icons — локально только камера */
  var CAM_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2L9 4.8h6L16.5 7h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="13" r="3.4"/></svg>';

  /* три смайлика: весёлый (зелёный), средний (жёлтый), грустный (красный); цвет — в CSS по классу f-<key> */
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
    sad:   faceSvg('<path d="M8.4 16.8a4.4 4.4 0 0 1 7.2 0" stroke-linecap="round"/>')
  };
  var MOOD_KEYS=["happy","mid","sad"];

  var sdk=null, root=null, E={}, items=[], timer=null, lastSig="", sel=null, form=blankForm(), loaded=false, uploadSeq=0;
  function blankForm(){ return {open:false, mood:null, photo:null, photoPreview:null, uploading:false, why:"", liked:""}; }

  function esc(s){ return RobTop.util.esc(s); }
  function t(k,p){ return sdk.t(k,p); }

  /* ----- время: окно 6:00–22:00 по времени устройства ----- */
  function pad2(n){ return RobTop.util.pad2(n); }
  function dayKey(d){ return RobTop.util.dayKey(d); }
  function inWindow(){ var h=new Date().getHours(); return h>=6 && h<22; }
  function msToOpen(){ // только когда окно закрыто: до 6:00 сегодня (ночью) или завтра (вечером)
    var n=new Date(), open=new Date(n.getFullYear(),n.getMonth(),n.getDate(),6,0,0);
    if(n.getHours()>=6) open.setDate(open.getDate()+1);
    return open-n;
  }
  function countdownStr(){
    var min=Math.max(1, Math.ceil(msToOpen()/60000)), h=Math.floor(min/60), m=min%60;
    return h>0 ? h+" "+t("unitH")+" "+m+" "+t("unitM") : m+" "+t("unitM");
  }
  function sig(){ return dayKey()+":"+(inWindow()?"1":"0"); }

  /* ----- данные ----- */
  function dataOf(it){ return (it&&it.data)||{}; }
  function moodOf(it){ var m=dataOf(it).mood; return MOOD_KEYS.indexOf(m)>=0?m:null; }
  function sortItems(){ items.sort(function(a,b){ var x=dataOf(a).day||"", y=dataOf(b).day||""; return x<y?1:(x>y?-1:0); }); }
  function entryFor(day){ for(var i=0;i<items.length;i++){ if(dataOf(items[i]).day===day) return items[i]; } return null; }
  function counts(){ var c={happy:0,mid:0,sad:0}; items.forEach(function(it){ var m=moodOf(it); if(m) c[m]++; }); return c; }
  function load(){
    sdk.data.list("entries").then(function(list){
      if(!root) return; // размонтирован, пока грузилось
      items=(list||[]).filter(function(it){ return dataOf(it).day && moodOf(it); });
      loaded=true;
      sortItems(); renderState(); renderHistory(); hud();
    }).catch(function(){ if(!root) return; items=[]; loaded=true; sdk.ui.toast(t("loadFailed")); renderState(); renderHistory(); hud(); });
  }

  function hud(){ var c=counts(); sdk.ui.hud({ left:t("hudLeft"), cNum:items.length, cLbl:t("hudCLbl"), rNum:c.happy, rLbl:t("hudRLbl") }); }

  /* ----- смайлики ----- */
  function facesHtml(chosen, interactive, extra){
    var blink=/\bform\b/.test(extra||""); // в форме подтверждённый смайлик моргает
    var h='<div class="md-faces '+(extra||"")+(interactive?"":" ro")+'">';
    MOOD_KEYS.forEach(function(key){
      var on=chosen===key;
      h+='<button type="button" class="md-face f-'+key+(on?" on":"")+(on&&blink?" blink":"")+'"'
        +(interactive?' data-face="'+key+'"':' tabindex="-1"')
        +' aria-label="'+esc(t("names."+key))+'">'+FACE[key]+'</button>';
    });
    return h+'</div>';
  }
  function soloFace(mood){ // один выбранный смайлик, моргает (карточка «сегодня»)
    return '<div class="md-faces solo"><span class="md-face f-'+esc(mood)+' on blink">'+(FACE[mood]||"")+'</span></div>';
  }

  /* ----- состояние (карточка сверху) ----- */
  function renderState(){
    if(!root||!E.state) return;
    lastSig=sig();
    /* первая загрузка: не угадываем состояние дня (выбор/уже отмечено), пока записи не пришли */
    if(!loaded){ E.state.innerHTML='<div class="rt-loading"><div class="rt-spin"></div></div>'; return; }
    var today=dayKey(), entry=entryFor(today), canEdit=sdk.can("edit");
    if(!canEdit){
      E.state.innerHTML='<div class="md-card"><p class="md-note" style="margin:0">'+esc(t("parentNote"))+'</p></div>';
      return;
    }
    if(!inWindow()){
      sel=null;
      E.state.innerHTML='<div class="md-card"><h3 class="md-card-title">'+esc(t("waitTitle"))+'</h3>'
        +'<p class="md-hint">'+esc(t("waitText"))+'</p>'
        +'<div class="md-count" id="mdCount">'+esc(t("waitIn",{time:countdownStr()}))+'</div></div>';
      return;
    }
    if(form.open){ renderForm(); return; }
    if(entry){
      var d=dataOf(entry);
      E.state.innerHTML='<div class="md-card"><h3 class="md-card-title">'+esc(t("todayDone"))+'</h3>'
        +soloFace(moodOf(entry)||"mid")
        +(d.why?'<p class="md-text"><b>'+esc(t("why"))+'</b> '+esc(d.why)+'</p>':"")
        +(d.liked?'<p class="md-text"><b>'+esc(t("liked"))+'</b> '+esc(d.liked)+'</p>':"")
        +(d.photo?'<div class="md-bigphoto" style="background-image:url(\''+esc(sdk.media.url(d.photo))+'\')"></div>':"")
        +'<div class="md-form-actions"><button class="btn" id="mdEdit">'+esc(t("editBtn"))+'</button></div>'
        +'<p class="md-note">'+esc(t("editUntil"))+'</p></div>';
      return;
    }
    E.state.innerHTML='<div class="md-card"><h3 class="md-card-title">'+esc(t("pickTitle"))+'</h3>'
      +'<p class="md-hint">'+esc(sel?t("confirmHint"):t("pickHint"))+'</p>'+facesHtml(sel,true)+'</div>';
  }

  /* ----- форма (смайлик + потому что + понравилось + фото) -----
     Рендерится один раз при открытии; смена смайлика обновляется на месте (updateFormFaces),
     чтобы не стирать набранный текст. */
  function renderForm(){
    if(!root||!E.state) return;
    var photoSrc=form.photoPreview||form.photo||"", photoUrl=photoSrc?sdk.media.url(photoSrc):"";
    E.state.innerHTML='<div class="md-card"><h3 class="md-card-title">'+esc(t("pickTitle"))+'</h3>'
      +facesHtml(form.mood,true,"form")
      +'<label class="md-lbl" for="mdWhy">'+esc(t("why"))+'</label>'
      +'<textarea class="md-ta" id="mdWhy" maxlength="400" placeholder="'+esc(t("whyPh"))+'">'+esc(form.why||"")+'</textarea>'
      +'<label class="md-lbl" for="mdLiked">'+esc(t("liked"))+'</label>'
      +'<textarea class="md-ta" id="mdLiked" maxlength="400" placeholder="'+esc(t("likedPh"))+'">'+esc(form.liked||"")+'</textarea>'
      +'<div class="md-photo'+(photoSrc?" has":"")+(form.uploading?" uploading":"")+'" id="mdPhotoPick" role="button" aria-label="'+esc(t("aria.photo"))+'"'
        +(photoSrc?' style="background-image:url(\''+esc(photoUrl)+'\')"':"")+'>'
        +(form.uploading?'<span>'+esc(t("uploadingPhoto"))+'</span>':(photoSrc?'<span>'+esc(t("replacePhoto"))+'</span>':'<span class="pic">'+CAM_IC+'</span><span>'+esc(t("addPhoto"))+'</span>'))
      +'</div>'
      +'<div class="md-form-actions"><button class="btn btn-cancel" id="mdCancel">'+esc(t("common.cancel"))+'</button>'
      +'<button class="btn btn-primary" id="mdSave"'+(form.uploading?" disabled":"")+'>'+esc(t("common.save"))+'</button></div></div>';
  }
  function updateFormFaces(){
    if(!E.state) return;
    var btns=E.state.querySelectorAll(".md-faces [data-face]");
    for(var i=0;i<btns.length;i++){ var on=btns[i].getAttribute("data-face")===form.mood;
      btns[i].classList.toggle("on",on); btns[i].classList.toggle("blink",on); }
  }

  /* ----- фото: уменьшение + (демо: dataUrl) / (сервер: upload → путь) ----- */
  function updatePhotoPick(){
    var pick=E.state&&E.state.querySelector("#mdPhotoPick");
    if(!pick) return;
    var src=form.photoPreview||form.photo||"", url=src?sdk.media.url(src):"";
    pick.classList.toggle("has",!!src);
    pick.classList.toggle("uploading",!!form.uploading);
    pick.style.backgroundImage=src?"url('"+esc(url)+"')":"";
    pick.innerHTML=form.uploading?'<span>'+esc(t("uploadingPhoto"))+'</span>':(src?'<span>'+esc(t("replacePhoto"))+'</span>':'<span class="pic">'+CAM_IC+'</span><span>'+esc(t("addPhoto"))+'</span>');
    var save=E.state&&E.state.querySelector("#mdSave");
    if(save) save.disabled=!!form.uploading;
  }
  /* Ф4: единый sdk.media.pick (выбор → ресайз → демо:dataUrl/сервер:путь). onLocal даёт
     мгновенное превью; .then(null) при ОТМЕНЕ (превью не показывали) или при сбое загрузки
     (превью показали — флаг picked отличает их). Заменяет прежние handleFile/uploadPhoto. */
  function pickPhoto(){
    if(form.uploading) return;
    var picked=false, token=++uploadSeq;
    sdk.media.pick({ kind:"mood", onLocal:function(dataUrl){
        if(token!==uploadSeq) return;
        if(!dataUrl) return;
        picked=true;
        form.uploading=true;
        form.photoPreview=dataUrl;
        updatePhotoPick();
      } })
      .then(function(r){
        if(token!==uploadSeq) return;
        form.uploading=false;
        if(r && r.path){
          form.photo=r.path;
          form.photoPreview=null;
          updatePhotoPick();
        }else{
          form.photoPreview=null;
          updatePhotoPick();
          if(picked) sdk.ui.toast(t("photoFailed"));
        }
      }).catch(function(){
        if(token!==uploadSeq) return;
        form.uploading=false;
        form.photoPreview=null;
        updatePhotoPick();
        if(picked) sdk.ui.toast(t("photoFailed"));
      });
  }

  /* ----- сохранение ----- */
  function save(){
    if(!sdk.can("edit")) return;
    if(!inWindow()){ form=blankForm(); sel=null; sdk.ui.toast(t("waitText")); renderState(); return; }
    var mood=form.mood;
    if(MOOD_KEYS.indexOf(mood)<0){ sdk.ui.toast(t("pickHint")); return; }
    if(form.uploading){ sdk.ui.toast(t("photoWait")); return; }
    var whyEl=E.state.querySelector("#mdWhy"), likedEl=E.state.querySelector("#mdLiked");
    var day=dayKey();
    var payload={ day:day, mood:mood, why:(whyEl?whyEl.value:"").trim().slice(0,400),
      liked:(likedEl?likedEl.value:"").trim().slice(0,400), photo:form.photo||null };
    var existing=entryFor(day), edited=!!existing, p;
    if(existing){
      p=sdk.data.update("entries", existing.id, payload).then(function(){ existing.data=Object.assign({},existing.data,payload); });
    }else{
      p=sdk.data.create("entries", payload).then(function(item){ if(item){ items.push(item); } else { load(); } });
    }
    p.then(function(){
      if(!root) return;
      form=blankForm(); sel=null;
      sdk.events.track("mood_set",{day:day, mood:mood, hasPhoto:!!payload.photo, edited:edited});
      sdk.ui.haptics(10);
      if(mood==="happy"){ sdk.ui.confetti(); sdk.ui.chime(); }
      sdk.ui.toast(t("savedToast",{name:t("names."+mood)}));
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
    /* спиннер вместо ложного «записей пока нет», пока идёт первая загрузка */
    if(!loaded){ E.list.innerHTML='<div class="rt-loading"><div class="rt-spin"></div></div>'; return; }
    var list=visibleHistory();
    if(!list.length){ E.list.innerHTML='<div class="md-empty">'+esc(t("historyEmpty"))+'</div>'; return; }
    E.list.innerHTML=list.map(function(it){
      var d=dataOf(it), m=moodOf(it)||"mid", snippet=d.why||d.liked||t("noText");
      var thumb=d.photo?'<div class="md-thumb" style="background-image:url(\''+esc(sdk.media.url(d.photo))+'\')"></div>'
        :'<div class="md-thumb f-'+m+'">'+FACE[m]+'</div>';
      return '<div class="md-row" data-id="'+esc(it.id)+'">'+thumb
        +'<div class="m"><div class="d">'+esc(fmtDay(d.day))+'</div>'
        +'<div class="s"><span class="md-mini f-'+m+'">'+FACE[m]+'</span>'+esc(t("names."+m))+' · '+esc(snippet)+'</div></div></div>';
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
    var d=dataOf(it), m=moodOf(it)||"mid", node=document.createElement("div"); node.className="md-detail";
    node.innerHTML='<h2>'+esc(fmtDay(d.day))+'</h2>'
      +'<div class="md-faces solo"><span class="md-face f-'+m+' on">'+FACE[m]+'</span></div>'
      +'<div class="md-mood-name">'+esc(t("names."+m))+'</div>'
      +(d.photo?'<div class="md-bigphoto" style="background-image:url(\''+esc(sdk.media.url(d.photo))+'\')"></div>':"")
      +(d.why?'<span class="md-lbl">'+esc(t("why"))+'</span><div class="md-text">'+esc(d.why)+'</div>':"")
      +(d.liked?'<span class="md-lbl">'+esc(t("liked"))+'</span><div class="md-text">'+esc(d.liked)+'</div>':"")
      +((!d.why&&!d.liked)?'<div class="md-text" style="text-align:center">'+esc(t("noText"))+'</div>':"")
      +'<div class="sheet-actions" style="margin-top:14px"><button class="btn btn-cancel" data-close style="flex:1">'+esc(t("common.close"))+'</button></div>';
    var sh=sdk.ui.sheet(node);
    node.querySelector("[data-close]").addEventListener("click",sh.close);
  }
  function openStats(){
    sdk.events.track("viewed_stats",{});
    var c=counts(), node=document.createElement("div"), rows="";
    MOOD_KEYS.forEach(function(key){
      rows+='<div class="md-stat-row"><span class="md-mini big f-'+key+'">'+FACE[key]+'</span>'
        +'<div class="nm">'+esc(t("names."+key))+'</div>'
        +'<div class="n">'+esc(t("statsTimes",{count:c[key]}))+'</div></div>';
    });
    node.innerHTML='<h2>'+esc(t("statsTitle"))+'</h2><div class="md-stat-rows">'+rows+'</div>'
      +'<div class="sheet-actions" style="margin-top:14px"><button class="btn btn-cancel" data-close style="flex:1">'+esc(t("common.close"))+'</button></div>';
    var sh=sdk.ui.sheet(node);
    node.querySelector("[data-close]").addEventListener("click",sh.close);
  }

  /* ----- тик: обратный отсчёт + смена состояния на границах 6:00 и 22:00 ----- */
  function tick(){
    if(!root||!document.body.contains(root)) return; // страховка к clearInterval: не трогаем мёртвый DOM
    if(form.open) return; // не сносить ввод; граница окна проверяется при сохранении
    if(sig()!==lastSig){ sel=null; renderState(); renderHistory(); return; }
    var cd=E.state&&E.state.querySelector("#mdCount");
    if(cd && !inWindow()) cd.textContent=t("waitIn",{time:countdownStr()});
  }

  /* =================== mount / unmount =================== */
  function mount(rootEl, theSdk){
    sdk=theSdk; root=rootEl; items=[]; sel=null; form=blankForm(); loaded=false; uploadSeq=0;
    var title=sdk.i18n.t("tile.mood");
    /* guardrails: шапку строит общая рамка (sdk.ui.frame); модуль наполняет только body */
    var body=sdk.ui.frame({
      titleHtml:'<div class="md-title"><span class="sic">'+FACE.happy+'</span> '+esc(title)+'</div>'
        +'<div class="md-sub">'+esc(t("subtitle"))+'</div>',
      backLabel:t("common.back"),
      actions:[{ icon:"stats", id:"mdStats", label:t("aria.stats"), onClick:openStats }]
    }).body;
    body.innerHTML='<div class="md">'
      +'<div id="mdState"></div>'
      +'<div class="store-section">'+esc(t("historyTitle"))+'</div><div class="md-list" id="mdList"></div>'
    +'</div>';
    E.state=body.querySelector("#mdState"); E.list=body.querySelector("#mdList");
    sdk.on(root,"click",function(e){
      var face=e.target.closest("[data-face]");
      if(face){
        if(!sdk.can("edit")) return;
        var key=face.getAttribute("data-face");
        if(form.open){ form.mood=key; updateFormFaces(); sdk.ui.haptics(6); return; }
        if(!inWindow() || entryFor(dayKey())) return;
        if(sel===key){ // второй тап по тому же смайлику — подтверждение
          uploadSeq++;
          form=Object.assign(blankForm(), {open:true, mood:key}); sel=null;
          sdk.ui.haptics(10); renderForm();
        } else { sel=key; sdk.ui.haptics(6); renderState(); }
        return;
      }
      if(e.target.closest("#mdSave")){ save(); return; }
      if(e.target.closest("#mdCancel")){ uploadSeq++; form=blankForm(); sel=null; renderState(); return; }
      if(e.target.closest("#mdEdit")){
        var entry=entryFor(dayKey()); if(!entry) return;
        var d=dataOf(entry);
        uploadSeq++;
        form=Object.assign(blankForm(), {open:true, mood:moodOf(entry), photo:d.photo||null, why:d.why||"", liked:d.liked||""});
        renderForm(); return; }
      if(e.target.closest("#mdPhotoPick")){ pickPhoto(); return; }
      var row=e.target.closest(".md-row"); if(row) openDetail(row.getAttribute("data-id"));
    });
    renderState(); renderHistory(); hud(); load();
    timer=setInterval(tick, 20000);
  }
  function unmount(){
    if(timer){ clearInterval(timer); timer=null; }
    E={}; items=[]; root=null; lastSig=""; sel=null; loaded=false;
    uploadSeq++;
    form=blankForm();
  }

  RobTop.register({ id:"mood", mount:mount, unmount:unmount, messages:MESSAGES });
})();
