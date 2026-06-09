/* RobTop — загрузчик модулей.
   Хранит реестр, регистрирует модули (RobTop.register), открывает/закрывает с mount/unmount,
   инъектит css/js модуля. Родные модули — из modules/<id>/, установленные — из apps/<id>/. */
window.RobTop = window.RobTop || {};
(function(RT){
  "use strict";
  RT.modules  = RT.modules  || {};   // id -> { def, sdk }
  RT._defs    = RT._defs    || {};   // id -> определение из register()
  RT._registry = RT._registry || []; // мета всех видимых модулей
  RT._current = null;

  /* register({id,mount,unmount[,messages]}) — messages:{en,ru,lv} вливаются в i18n */
  RT.register = function(def){ if(def && def.id){ RT._defs[def.id] = def; if(def.messages && RT.i18n) RT.i18n.add(def.messages); } };

  RT.setRegistry = function(list){ RT._registry = list || []; };
  RT.metaFor = function(id){ for(var i=0;i<RT._registry.length;i++){ if(RT._registry[i].id===id) return RT._registry[i]; } return null; };

  function injectCss(href, text){
    if(text!=null){ // демо-установка: стили строкой
      if(document.querySelector('style[data-mod-css="'+href+'"]')) return;
      var st=document.createElement("style"); st.setAttribute("data-mod-css",href); st.textContent=text; document.head.appendChild(st); return;
    }
    if(document.querySelector('link[data-mod-css="'+href+'"]')) return;
    var l=document.createElement("link"); l.rel="stylesheet"; l.href=href; l.setAttribute("data-mod-css",href); document.head.appendChild(l);
  }
  function injectJs(src, text){
    return new Promise(function(res,rej){
      if(document.querySelector('script[data-mod-js="'+src+'"]')){ res(); return; }
      var s=document.createElement("script"); s.setAttribute("data-mod-js",src);
      if(text!=null){ var blob=new Blob([text],{type:"text/javascript"}); s.src=URL.createObjectURL(blob); }
      else s.src=src;
      s.onload=function(){ res(); }; s.onerror=function(){ rej(new Error("load "+src)); };
      document.head.appendChild(s);
    });
  }
  function folder(meta){ return (meta.source==="installed" ? "apps/" : "modules/") + meta.id + "/"; }
  /* cache-busting: добавляет ?v=<версия> к URL ассета, чтобы при смене версии браузер тянул свежий файл, а не кэш */
  function bust(u){ var v=window.RT_VER; return v ? u+(u.indexOf("?")<0?"?":"&")+"v="+encodeURIComponent(v) : u; }

  RT.open = function(id){
    var meta=RT.metaFor(id); if(!meta) return;
    /* ссылка из оповещения (RT._pendingLink, core/notify.js) адресована другому модулю — сброс */
    if(RT._pendingLink && RT._pendingLink.module!==id) RT._pendingLink=null;
    var nm=(RT.i18n?RT.i18n.t("tile."+id,{fallback:meta.name}):meta.name);
    if(meta.status==="soon"){ RT._shell.toast(RT.i18n?RT.i18n.t("tile.soonToast",{name:nm}):(nm+": soon!")); return; }
    /* закрыть ТЕКУЩИЙ модуль перед открытием нового (модуль→модуль из нижнего меню, напр. Чат→Копилка):
       иначе предыдущий не размонтируется и его слой #chApp/оверлеи залипают. */
    if(RT._current && RT._current!==id) closeCurrent();
    var dir=folder(meta);
    var bundle = (meta.source==="installed" && RT.isDemo() && RT._shell.demoBundle) ? RT._shell.demoBundle(id) : null;
    var styles=meta.styles||"module.css", entry=meta.entry||"module.js";
    if(bundle){ if(bundle.files[styles]!=null) injectCss(dir+styles, bundle.files[styles]); }
    else if(meta.styles!==false) injectCss(bust(dir+styles));
    var jsText = bundle ? bundle.files[entry] : null;
    injectJs(jsText!=null ? dir+entry : bust(dir+entry), jsText).then(function(){
      var def=RT._defs[id];
      if(!def){ RT._shell.toast(RT.i18n?RT.i18n.t("err.module_load"):"Module didn't load"); return; }
      var view=RT._shell.moduleView();
      view.innerHTML=""; view.setAttribute("data-mod",id);
      var sdk=RT.createSdk(meta);
      RT.modules[id]={def:def, sdk:sdk};
      RT._current=id;
      RT._shell.showModule();
      try{ def.mount(view, sdk); }catch(e){ RT._shell.toast(RT.i18n?RT.i18n.t("err.module_error"):"Module error"); }
      /* переход из оповещения: ОПЦИОНАЛЬНЫЙ хук link(link, sdk) контракта register —
         модуль может открыть конкретный «предмет» (item). Без хука просто открылись. */
      if(RT._pendingLink && RT._pendingLink.module===id){
        var lk=RT._pendingLink; RT._pendingLink=null;
        if(typeof def.link==="function"){ try{ def.link(lk, sdk); }catch(e){} }
      }
      sdk.events.track("opened_module",{module:id});
    }).catch(function(){ RT._shell.toast(RT.i18n?RT.i18n.t("err.module_open",{name:nm}):("Couldn't open “"+nm+"”")); });
  };

  /* размонтировать ТЕКУЩИЙ модуль БЕЗ навигации: unmount + снять авто-слушатели (sdk.on/_dispose)
     + очистить moduleView. ВАЖНО при переходе модуль→модуль / →оповещения / →настройки: иначе
     таймеры/слушатели текут, а у Чата его слой #chApp в <body> (не в moduleView) ЗАЛИПАЕТ поверх
     экрана (фидбек Джеффа: оповещения у родителя открывались поверх чата и не убирались). */
  function closeCurrent(){
    var id=RT._current;
    if(id){
      var m=RT.modules[id];
      if(m && m.def && m.def.unmount){ try{ m.def.unmount(); }catch(e){} }
      if(m && m.sdk && m.sdk._dispose){ try{ m.sdk._dispose(); }catch(e){} }
      delete RT.modules[id];
    }
    if(RT._shell.fabDestroy) RT._shell.fabDestroy();
    var view=RT._shell.moduleView(); if(view){ view.innerHTML=""; view.removeAttribute("data-mod"); }
    RT._current=null;
  }
  RT.closeCurrent = closeCurrent;
  RT.close = function(){ closeCurrent(); RT._shell.showHome(); };

  RT.current = function(){ return RT._current; };
})(window.RobTop);
