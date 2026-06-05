/* RobTop — SDK, выдаётся каждому модулю в mount(root, sdk).
   Развязывает модули от ядра: данные, события, медиа, UI, роли, очки, тема, локальное хранилище.
   Модуль НИКОГДА не трогает DOM вне своего root и не вызывает fetch напрямую — только через sdk. */
window.RobTop = window.RobTop || {};
(function(RT){
  "use strict";

  var API = {
    base: "api/",
    get: function(p){ return fetch(API.base+p,{headers:{"Accept":"application/json"}}).then(function(r){ if(!r.ok) throw new Error("http "+r.status); return r.json(); }); },
    post: function(p,b){ return fetch(API.base+p,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)}).then(function(r){ if(!r.ok) throw new Error("http "+r.status); return r.json(); }); }
  };
  RT.API = API;

  function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
  RT.uid = uid;
  /* i18n-ключ: "common.*" и "err.*" — общий словарь; остальное — в неймспейсе модуля */
  function absKey(mod,key){ return /^(common|err)\./.test(String(key))?String(key):(mod+"."+key); }
  RT.isDemo = function(){ return !!(RT._shell && RT._shell.demo); };

  /* ---- демо-хранилище универсального стора (localStorage с неймспейсом модуля) ---- */
  function lsKey(mod, coll){ return "robtop_md_"+mod+"_"+(coll||"default"); }
  function lsRead(mod, coll){ try{ var r=localStorage.getItem(lsKey(mod,coll)); return r?JSON.parse(r):[]; }catch(e){ return []; } }
  function lsWrite(mod, coll, arr){ try{ localStorage.setItem(lsKey(mod,coll), JSON.stringify(arr)); }catch(e){} }
  function demoData(mod, op, coll, p){
    var arr=lsRead(mod,coll), now=Date.now(), id=p&&p.id!=null?String(p.id):null, i, it;
    function find(){ for(i=0;i<arr.length;i++){ if(String(arr[i].id)===id) return i; } return -1; }
    if(op==="list"){ return {ok:true, items:arr.filter(function(x){ return !x.deletedAt; })}; }
    if(op==="get"){ var k=find(); return {ok:true, item:k>=0?arr[k]:null}; }
    if(op==="create"){ it={id:uid(), status:(p.data&&p.data.status)||"", favorite:0, data:(p.data||{}), createdAt:now, updatedAt:now, deletedAt:null}; arr.push(it); lsWrite(mod,coll,arr); return {ok:true, item:it}; }
    if(op==="update"){ var u=find(); if(u>=0){ arr[u].data=Object.assign({},arr[u].data,p.patch||{}); arr[u].updatedAt=now; lsWrite(mod,coll,arr); } return {ok:true}; }
    if(op==="move"){ var m=find(); if(m>=0){ arr[m].status=p.status; arr[m].updatedAt=now; lsWrite(mod,coll,arr); } return {ok:true}; }
    if(op==="favorite"){ var f=find(); if(f>=0){ arr[f].favorite=p.on?1:0; arr[f].updatedAt=now; lsWrite(mod,coll,arr); } return {ok:true}; }
    if(op==="delete"){ var d=find(); if(d>=0){ arr[d].deletedAt=now; lsWrite(mod,coll,arr); } return {ok:true}; }
    if(op==="restore"){ var rr=find(); if(rr>=0){ arr[rr].deletedAt=null; lsWrite(mod,coll,arr); } return {ok:true}; }
    return {ok:true};
  }
  function dataOp(mod, op, coll, payload){
    if(RT.isDemo()) return Promise.resolve(demoData(mod, op, coll, payload));
    return API.post("data.php", Object.assign({op:op, module:mod, collection:coll||"default"}, payload||{}));
  }

  RT.createSdk = function(meta){
    var mod = meta.id;
    var shell = RT._shell || {};
    var role = (shell.user && shell.user.role) || "child";
    var sdk = {
      id: mod,
      user: shell.user || {name:"Артём", role:"child"},
      role: role,
      can: function(action){
        var roles=(meta.roles && meta.roles[action]) || (action==="read"?["child","parent"]:["child"]);
        return roles.indexOf(this.role) >= 0;
      },
      api: { get:function(p){ return API.get(p); }, post:function(p,b){ return API.post(p,b); } },
      data: {
        list:    function(coll,query){ return dataOp(mod,"list",coll,{query:query||null}).then(function(r){ return (r&&r.items)||[]; }); },
        get:     function(coll,id){ return dataOp(mod,"get",coll,{id:id}).then(function(r){ return r&&r.item; }); },
        create:  function(coll,data){ return dataOp(mod,"create",coll,{data:data}).then(function(r){ return r&&r.item; }); },
        update:  function(coll,id,patch){ return dataOp(mod,"update",coll,{id:id,patch:patch}); },
        move:    function(coll,id,status){ return dataOp(mod,"move",coll,{id:id,status:status}); },
        favorite:function(coll,id,on){ return dataOp(mod,"favorite",coll,{id:id,on:!!on}); },
        remove:  function(coll,id){ return dataOp(mod,"delete",coll,{id:id}); },
        restore: function(coll,id){ return dataOp(mod,"restore",coll,{id:id}); }
      },
      events: { track:function(type,payload){ if(RT.isDemo()) return Promise.resolve(); return API.post("data.php",{op:"track",module:mod,type:type,data:payload||null}).catch(function(){}); } },
      media:  { upload:function(dataUrl,kind){ return API.post("upload.php",{dataUrl:dataUrl, kind:kind||mod}); } },
      ui: {
        toast:    function(m,a,f){ return shell.toast(m,a,f); },
        undo:     function(label,fn){ return shell.toast(RT.i18n.t("common.done"), label||RT.i18n.t("common.undo"), fn); },
        confirm:  function(opts){ return shell.confirm(opts); },
        sheet:    function(node){ return shell.sheet(node); },
        confetti: function(){ if(window.Confetti) window.Confetti.launch(); },
        haptics:  function(p){ shell.buzz(p); },
        chime:    function(){ shell.chime(); },
        hud:      function(o){ shell.hud(o); },
        fab:      function(label,onClick){ return shell.fab(label,onClick); },
        back:     function(){ RT.close(); },
        enableDrag: function(sheet,close){ shell.enableDrag(sheet,close); }
      },
      points: {
        add: function(n,reason){ if(RT.isDemo()) return Promise.resolve(); return API.post("data.php",{op:"create",module:"bank",collection:"points",data:{n:n,reason:reason||""}}).catch(function(){}); },
        get: function(){ return Promise.resolve(0); }
      },
      admin: {
        // Проверка PIN родителя/администратора. Демо: '1234'. Сервер: сверяет admin_pin.
        verify: function(pin){
          if(RT.isDemo()) return Promise.resolve(pin==="1234");
          return API.post("store/enable.php",{pin:pin,verify:1}).then(function(r){ return !!(r&&r.ok); }).catch(function(){ return false; });
        }
      },
      theme: { tokens: shell.tokens || {} },
      storage: { local:function(key){ var k="robtop_"+mod+"_"+key; return {
        get:function(){ try{ return JSON.parse(localStorage.getItem(k)); }catch(e){ return null; } },
        set:function(v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
      }; } },
      /* ---- i18n: ключ по умолчанию в неймспейсе модуля; "common.*"/"err.*" — общий словарь ---- */
      t: function(key,p){ return RT.i18n.t(absKey(mod,key),p); },
      plural: function(n,key,p){ return RT.i18n.plural(n,absKey(mod,key),p); },
      formatDate: function(v,o){ return RT.i18n.formatDate(v,o); },
      i18n: {
        get: function(){ return RT.i18n.get(); },
        tag: function(){ return RT.i18n.tag(); },
        speechLang: function(){ return RT.i18n.speechLang(); },
        formatDate: function(v,o){ return RT.i18n.formatDate(v,o); },
        t: function(k,p){ return RT.i18n.t(k,p); }
      },
      uid: uid,
      isDemo: function(){ return RT.isDemo(); }
    };
    return sdk;
  };
})(window.RobTop);
