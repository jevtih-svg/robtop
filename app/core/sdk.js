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
  /* ---- выбранный ребёнок родителя: данные модулей скоупятся на НЕГО (фикс v.44) ----
     Родитель выбирает ребёнка на дашборде (parent.js: S.childId + localStorage rt_parent_child).
     Раньше child серверу НЕ передавался, и data.php молча скоупил роль parent на ПЕРВОГО
     ребёнка семьи: при нескольких детях родитель видел «одну копилку на всех» и начислял
     очки не тому ребёнку. Теперь каждый запрос родителя несёт child=<id>, сервер проверяет
     права (rt_can_manage_child) и работает со скоупом ИМЕННО выбранного ребёнка. */
  function parentChild(){
    var sh=RT._shell||{};
    if(!(sh.user && sh.user.role==="parent")) return null;
    var id=null;
    if(RT.Parent && RT.Parent.childId) id=RT.Parent.childId();
    if(!id){ try{ id=parseInt(localStorage.getItem("rt_parent_child")||"",10)||null; }catch(e){ id=null; } }
    return id||null;
  }
  function dataOp(mod, op, coll, payload){
    if(RT.isDemo()) return Promise.resolve(demoData(mod, op, coll, payload));
    var body=Object.assign({op:op, module:mod, collection:coll||"default"}, payload||{});
    var pc=parentChild(); if(pc) body.child=pc;
    return API.post("data.php", body);
  }

  /* ---- движок очков: леджер bank/points + винстрик в bank/meta (политика — ГАЙД-очки.md) ----
     Транзакция: {n, reason, src, kind, note?}. Виды (kind):
       win | loss   — победы/проигрыши в приложениях (винстрик НЕ трогают);
       task_done    — задание родителей выполнено: винстрик +1 (макс 21) и бонус серии
                      (винстрик−1 пунктов) ОТДЕЛЬНОЙ строкой kind=bonus;
       task_fail    — задание родителей не выполнено: винстрик сгорает в 0;
       daily_bonus  — все задания дня выполнены (+5);
       parent       — произвольное начисление/снятие родителем (панель в Копилке);
       manual       — ручные поправки (легаси reason *_manual, напр. teeth_manual);
       bonus        — бонус серии (пишет только сам движок);
       spend        — траты (Магазин, будущее).
     Демо-режим работает через localStorage (dataOp) — паритет с сервером. */
  var BANK_STREAK_MAX = 21;
  function bankKind(n, reason, opts){
    if(opts && opts.kind) return String(opts.kind);
    if(/_manual$/.test(String(reason||""))) return "manual";
    return n >= 0 ? "win" : "loss";
  }
  function bankMeta(){
    return dataOp("bank","list","meta",null).then(function(r){
      var items=(r&&r.items)||[], it=items.length?items[0]:null;
      var s=it&&it.data?parseInt(it.data.streak,10):0;
      return { id: it?it.id:null, streak: Math.min(Math.max(s||0,0), BANK_STREAK_MAX) };
    });
  }
  function bankSetStreak(meta, streak){
    if(meta.id!=null) return dataOp("bank","update","meta",{id:meta.id,patch:{streak:streak}});
    return dataOp("bank","create","meta",{data:{streak:streak}});
  }
  function bankTxn(rec){ return dataOp("bank","create","points",{data:rec}); }
  /* Добавить транзакцию; никогда не reject (модули зовут fire-and-forget).
     → Promise<{ok, n, kind, streak|null, bonus}> */
  function bankAdd(srcMod, n, reason, opts){
    n = parseInt(n,10)||0; opts = opts||{};
    var kind = bankKind(n, reason, opts);
    var rec = { n:n, reason:String(reason||""), src:String(opts.src||srcMod||""), kind:kind };
    if(opts.note) rec.note = String(opts.note).slice(0,80);
    var out = { ok:true, n:n, kind:kind, streak:null, bonus:0 };
    return bankTxn(rec).then(function(){
      if(kind!=="task_done" && kind!=="task_fail") return out;
      return bankMeta().then(function(meta){
        if(kind==="task_fail"){
          out.streak = 0;
          return meta.streak>0 ? bankSetStreak(meta,0).then(function(){ return out; }) : out;
        }
        var s = Math.min(meta.streak+1, BANK_STREAK_MAX);
        out.streak = s; out.bonus = Math.max(0, s-1);
        return bankSetStreak(meta,s).then(function(){
          if(!out.bonus) return out;
          return bankTxn({ n:out.bonus, reason:"streak_bonus", src:"bank", kind:"bonus" }).then(function(){ return out; });
        });
      });
    }).catch(function(){ out.ok=false; return out; });
  }
  /* Сводка копилки: баланс (сумма всех n), винстрик, все транзакции. Может reject (сеть). */
  function bankSummary(){
    return Promise.all([ dataOp("bank","list","points",null), bankMeta() ]).then(function(rr){
      var items=(rr[0]&&rr[0].items)||[], sum=0, i, d;
      for(i=0;i<items.length;i++){ d=items[i].data||{}; sum += parseInt(d.n,10)||0; }
      return { balance:sum, streak:rr[1].streak, count:items.length, items:items };
    });
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
      events: { track:function(type,payload){ if(RT.isDemo()) return Promise.resolve(); var b={op:"track",module:mod,type:type,data:payload||null}; var pc=parentChild(); if(pc) b.child=pc; return API.post("data.php",b).catch(function(){}); } },
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
        /* add(n, reason, opts?) — opts:{kind, src, note}; kind по умолчанию: win (n≥0) / loss / manual (*_manual) */
        add: function(n,reason,opts){ return bankAdd(mod,n,reason,opts); },
        get: function(){ return bankSummary().then(function(s){ return s.balance; }).catch(function(){ return 0; }); },
        summary: function(){ return bankSummary(); },
        /* сжечь винстрик (будущий модуль заданий: «не все задания дня выполнены») */
        streakReset: function(){ return bankMeta().then(function(m){ return m.streak>0 ? bankSetStreak(m,0) : true; }).then(function(){ return true; }).catch(function(){ return false; }); }
      },
      /* sdk.admin.verify (PIN) упразднён 2026-06-07: роль даёт сессия аккаунта — модулям достаточно sdk.role / sdk.isDemo() */
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
