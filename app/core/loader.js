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

  RT.register = function(def){ if(def && def.id) RT._defs[def.id] = def; };

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

  RT.open = function(id){
    var meta=RT.metaFor(id); if(!meta) return;
    if(meta.status==="soon"){ RT._shell.toast(meta.name+": скоро!"); return; }
    var dir=folder(meta);
    var bundle = (meta.source==="installed" && RT.isDemo() && RT._shell.demoBundle) ? RT._shell.demoBundle(id) : null;
    var styles=meta.styles||"module.css", entry=meta.entry||"module.js";
    if(bundle){ if(bundle.files[styles]!=null) injectCss(dir+styles, bundle.files[styles]); }
    else if(meta.styles!==false) injectCss(dir+styles);
    var jsText = bundle ? bundle.files[entry] : null;
    injectJs(dir+entry, jsText).then(function(){
      var def=RT._defs[id];
      if(!def){ RT._shell.toast("Модуль не загрузился"); return; }
      var view=RT._shell.moduleView();
      view.innerHTML=""; view.setAttribute("data-mod",id);
      var sdk=RT.createSdk(meta);
      RT.modules[id]={def:def, sdk:sdk};
      RT._current=id;
      RT._shell.showModule();
      try{ def.mount(view, sdk); }catch(e){ RT._shell.toast("Ошибка модуля"); }
      sdk.events.track("opened_module",{module:id});
    }).catch(function(){ RT._shell.toast("Не удалось открыть «"+meta.name+"»"); });
  };

  RT.close = function(){
    var id=RT._current;
    if(id){
      var m=RT.modules[id];
      if(m && m.def && m.def.unmount){ try{ m.def.unmount(); }catch(e){} }
    }
    if(RT._shell.fabDestroy) RT._shell.fabDestroy();
    var view=RT._shell.moduleView(); view.innerHTML=""; view.removeAttribute("data-mod");
    RT._current=null;
    RT._shell.showHome();
  };

  RT.current = function(){ return RT._current; };
})(window.RobTop);
