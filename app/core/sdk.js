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

  /* ---- движок очков: леджер bank/points (политика — ГАЙД-очки.md) ----
     Транзакция: {n, reason, src, kind, note?}. Виды (kind):
       win | loss   — победы/проигрыши в приложениях (винстрик НЕ трогают);
       task_done    — задание родителей выполнено: день засчитан в серию, бонус серии
                      (винстрик−1 пунктов) ОТДЕЛЬНОЙ строкой kind=bonus;
       daily_bonus  — бонус «все задания дня» (+5, кнопка панели);
       parent       — произвольное начисление/снятие родителем (панель в Копилке);
       manual       — ручные поправки (легаси reason *_manual, напр. teeth_manual);
       bonus        — бонус серии (пишет только сам движок);
       task_fail    — легаси-штраф старой панели (в UI упразднён, строки в истории живут);
       spend        — траты (Магазин, будущее).
     ВИНСТРИК (2026-06-07, упрощение «как в Duolingo»): серия ДНЕЙ ПОДРЯД, в которых
     выполнено хотя бы одно задание родителей (kind task_done). НЕ хранится — каждый раз
     ВЫВОДИТСЯ из леджера (нечему рассинхронизироваться): идём от сегодня (или вчера,
     если сегодня заданий ещё не было) назад по календарным дням устройства, пока дни
     «с заданиями»; день без заданий гасит огонёк в 0. Кап 21 (бонус максимум 20).
     ПУНКТСТРИК (2026-06-07, поверх винстрика, фича Джеффа «PointsStreak»): сколько
     ПОЛОЖИТЕЛЬНЫХ транзакций подряд (любой kind, n>0; бонусы тоже считаются),
     считая от самой свежей назад; первый же МИНУС (n<0, любой kind) сбрасывает в 0
     по построению. Тоже не хранится — выводится из леджера; без капа, бонусов не даёт.
     Демо-режим работает через localStorage (dataOp) — паритет с сервером. */
  var BANK_STREAK_MAX = 21;
  function bankKind(n, reason, opts){
    if(opts && opts.kind) return String(opts.kind);
    if(/_manual$/.test(String(reason||""))) return "manual";
    return n >= 0 ? "win" : "loss";
  }
  function bankDayKey(d){ /* локальная дата устройства YYYY-MM-DD */
    var m=d.getMonth()+1, day=d.getDate();
    return d.getFullYear()+"-"+(m<10?"0":"")+m+"-"+(day<10?"0":"")+day;
  }
  /* Серия дней по леджеру. items — строки bank/points; now — Date.now(). */
  function bankStreakFrom(items, now){
    var days={}, i, it, d;
    for(i=0;i<items.length;i++){
      it=items[i]; d=it.data||{};
      if(d.kind==="task_done" && it.createdAt) days[bankDayKey(new Date(it.createdAt))]=1;
    }
    var cur=new Date(now);
    if(!days[bankDayKey(cur)]){
      cur.setDate(cur.getDate()-1);                 /* сегодня пусто? серия могла кончиться вчера */
      if(!days[bankDayKey(cur)]) return 0;          /* и вчера пусто — огонёк погас */
    }
    var n=0;
    while(days[bankDayKey(cur)] && n<BANK_STREAK_MAX){ n++; cur.setDate(cur.getDate()-1); }
    return n;
  }
  /* Пунктстрик: плюсы подряд с конца леджера до первого минуса.
     Хронология: createdAt, при равенстве — числовой id (сервер: автоинкремент;
     демо-строки нечисловых id равенство дают редко — берём 0). n==0 не бывает
     (bankAdd пишет только ненулевые), но на всякий случай нули просто пропускаем. */
  function bankPlusStreakFrom(items){
    var arr=items.slice().sort(function(a,b){
      var t=(a.createdAt||0)-(b.createdAt||0); if(t) return t;
      return (parseInt(a.id,10)||0)-(parseInt(b.id,10)||0);
    });
    var n=0, i, v, d;
    for(i=arr.length-1;i>=0;i--){
      d=arr[i].data||{};
      if(d.kind==="spend") continue; /* Магазин (2026-06-07): покупка/возврат — не ошибка и не заслуга, пунктстрик не трогают (ГАЙД-очки.md §3) */
      v=parseInt(d.n,10)||0;
      if(v>0) n++;
      else if(v<0) break;
    }
    return n;
  }
  function bankTxn(rec){ return dataOp("bank","create","points",{data:rec}); }
  /* Добавить транзакцию; никогда не reject (модули зовут fire-and-forget).
     → Promise<{ok, n, kind, streak|null, bonus}>
     task_done: после записи серия пересчитывается из леджера (включая эту строку),
     бонус = винстрик−1 отдельной строкой streak_bonus. */
  function bankAdd(srcMod, n, reason, opts){
    n = parseInt(n,10)||0; opts = opts||{};
    var kind = bankKind(n, reason, opts);
    var rec = { n:n, reason:String(reason||""), src:String(opts.src||srcMod||""), kind:kind };
    if(opts.note) rec.note = String(opts.note).slice(0,80);
    var out = { ok:true, n:n, kind:kind, streak:null, bonus:0 };
    return bankTxn(rec).then(function(){
      if(kind!=="task_done") return out;
      return dataOp("bank","list","points",null).then(function(r){
        var s = bankStreakFrom((r&&r.items)||[], Date.now());
        out.streak = s; out.bonus = Math.max(0, Math.min(s,BANK_STREAK_MAX)-1);
        if(!out.bonus) return out;
        return bankTxn({ n:out.bonus, reason:"streak_bonus", src:"bank", kind:"bonus" }).then(function(){ return out; });
      });
    }).catch(function(){ out.ok=false; return out; });
  }
  /* Сводка копилки: баланс (сумма всех n), винстрик и пунктстрик (из леджера), все транзакции. Может reject (сеть). */
  function bankSummary(){
    return dataOp("bank","list","points",null).then(function(r){
      var items=(r&&r.items)||[], sum=0, i, d;
      for(i=0;i<items.length;i++){ d=items[i].data||{}; sum += parseInt(d.n,10)||0; }
      return { balance:sum, streak:bankStreakFrom(items, Date.now()),
               plusStreak:bankPlusStreakFrom(items), count:items.length, items:items };
    });
  }

  /* ---- движок заданий: общий сервис api/tasks.php (канон — ГАЙД-задания.md) ----
     Задания родителей (2026-06-07) — ресурс УРОВНЯ ПРИЛОЖЕНИЯ, как очки: отдельная
     таблица tasks (НЕ generic-стор), один источник правды. UI два и они реплицируют
     друг друга: Копилка (блок на вкладке «Родители») и модуль «Задания» — оба зовут
     ТОЛЬКО sdk.tasks, своей логики заданий не держат.
     Контракт задания (плоский): { id, title, points, type "recur"|"once",
       status "active"|"pending"|"done", timesDone, lastDoneAt, claimedAt, doneAt,
       createdAt, updatedAt } (таймстампы — ms или null).
     Потоки (порядок СОХРАНЁН из Копилки: сначала очки, потом статус — «нет очков →
     нет статуса», защита награды ребёнка; переходы на сервере условные, гонка → 409):
       claim  (ребёнок «Сделал!»): once — очки сразу (kind task_done) + статус done;
              recur — статус pending, очки после проверки родителем;
       approve(родитель): очки (kind task_done) + (once → done | recur → active,
              timesDone+1); decline(родитель): pending → active, без очков и штрафа.
     Оповещения (task_new/task_claim/task_done/task_approved, ключи ntf.ev.tasks.*)
     шлёт САМ движок — модули их не дублируют. Демо: localStorage через
     demoData("tasks","items") — обе плитки видят один список и там. */
  function taskNorm(x){ /* демо-строка {id,status,data{…}} → плоский контракт сервиса */
    var d=x.data||{}, p=parseInt(d.points,10);
    return { id:String(x.id), title:String(d.title||""), points:p>0?Math.min(p,1000):10,
             type:d.type==="once"?"once":"recur", status:x.status||"active",
             timesDone:parseInt(d.timesDone,10)||0, lastDoneAt:d.lastDoneAt||null,
             claimedAt:d.claimedAt||null, doneAt:d.doneAt||null,
             createdAt:x.createdAt||0, updatedAt:x.updatedAt||0 };
  }
  function tasksPost(op,payload){
    var b=Object.assign({op:op},payload||{});
    var pc=parentChild(); if(pc) b.child=pc;
    return API.post("tasks.php",b);
  }
  function tasksNotify(to,type,params){ /* fire-and-forget; в демо — no-op */
    if(RT.isDemo()) return;
    var b={op:"send",to:to,src:"tasks",type:type,params:params||null,link:{module:"tasks"}};
    var pc=parentChild(); if(pc) b.child=pc;
    API.post("notify.php",b).catch(function(){});
  }
  function tasksList(){
    if(RT.isDemo()){
      var r=demoData("tasks","list","items",null);
      return Promise.resolve(((r&&r.items)||[]).map(taskNorm));
    }
    return tasksPost("list",null).then(function(r){ return (r&&r.items)||[]; });
  }
  function tasksCreate(o){
    o=o||{}; var n=parseInt(o.points,10);
    var rec={ title:String(o.title||"").slice(0,120),
              points:n>0?Math.min(n,1000):10,
              type:o.type==="once"?"once":"recur" };
    function fin(){ tasksNotify("child","task_new",{title:rec.title,n:rec.points}); return {ok:true}; }
    if(RT.isDemo()){
      demoData("tasks","create","items",{data:{title:rec.title,points:rec.points,type:rec.type,timesDone:0,status:"active"}});
      return Promise.resolve(fin());
    }
    return tasksPost("create",rec).then(function(r){ return (r&&r.ok)?fin():{ok:false}; })
      .catch(function(){ return {ok:false}; });
  }
  function tasksUpdate(id,patch){ /* правка названия/очков/типа (статусы двигают только потоки) */
    var p={}, n;
    if(patch && patch.title!=null) p.title=String(patch.title).slice(0,120);
    if(patch && patch.points!=null){ n=parseInt(patch.points,10); p.points=n>0?Math.min(n,1000):10; }
    if(patch && patch.type!=null) p.type=patch.type==="once"?"once":"recur";
    if(RT.isDemo()){ demoData("tasks","update","items",{id:id,patch:p}); return Promise.resolve({ok:true}); }
    return tasksPost("update",{id:id,patch:p}).then(function(r){ return {ok:!!(r&&r.ok)}; })
      .catch(function(){ return {ok:false}; });
  }
  function tasksRemove(id){
    if(RT.isDemo()){ demoData("tasks","delete","items",{id:id}); return Promise.resolve({ok:true}); }
    return tasksPost("delete",{id:id}).then(function(r){ return {ok:!!(r&&r.ok)}; })
      .catch(function(){ return {ok:false}; });
  }
  function tasksSetStatus(task, action){ /* перевод статуса: демо — локально, сервер — условно */
    if(RT.isDemo()){
      if(action==="claim"){
        if(task.type==="once"){ demoData("tasks","move","items",{id:task.id,status:"done"}); demoData("tasks","update","items",{id:task.id,patch:{doneAt:Date.now()}}); }
        else { demoData("tasks","move","items",{id:task.id,status:"pending"}); demoData("tasks","update","items",{id:task.id,patch:{claimedAt:Date.now()}}); }
      } else if(action==="approve"){
        if(task.type==="once"){ demoData("tasks","move","items",{id:task.id,status:"done"}); demoData("tasks","update","items",{id:task.id,patch:{doneAt:Date.now(),claimedAt:null}}); }
        else { demoData("tasks","update","items",{id:task.id,patch:{timesDone:(parseInt(task.timesDone,10)||0)+1,lastDoneAt:Date.now(),claimedAt:null}}); demoData("tasks","move","items",{id:task.id,status:"active"}); }
      } else { demoData("tasks","move","items",{id:task.id,status:"active"}); demoData("tasks","update","items",{id:task.id,patch:{claimedAt:null}}); }
      return Promise.resolve({ok:true});
    }
    return tasksPost(action,{id:task.id}).then(function(r){ return {ok:!!(r&&r.ok)}; })
      .catch(function(){ return {ok:false}; });
  }
  function tasksClaim(task){ /* ребёнок «Сделал!» → {ok, once, streak|null, bonus} */
    var pts=parseInt(task.points,10)||10, title=String(task.title||"");
    var name=(RT._shell && RT._shell.user && RT._shell.user.name)||"";
    if(task.type==="once"){
      /* одноразовое: очки СРАЗУ (решение Джеффа), потом статус */
      return bankAdd("tasks",pts,"task_done",{kind:"task_done",src:"tasks",note:title}).then(function(out){
        if(!out || !out.ok) return {ok:false,once:true,streak:null,bonus:0};
        return tasksSetStatus(task,"claim").then(function(){
          tasksNotify("parents","task_done",{name:name,title:title,n:pts});
          return {ok:true,once:true,streak:out.streak,bonus:out.bonus};
        });
      });
    }
    return tasksSetStatus(task,"claim").then(function(st){
      if(!st.ok) return {ok:false,once:false,streak:null,bonus:0};
      tasksNotify("parents","task_claim",{name:name,title:title,n:pts});
      return {ok:true,once:false,streak:null,bonus:0};
    });
  }
  function tasksApprove(task){ /* родитель: подтвердить → {ok, streak|null, bonus} */
    var pts=parseInt(task.points,10)||10, title=String(task.title||"");
    return bankAdd("tasks",pts,"task_done",{kind:"task_done",src:"parent",note:title}).then(function(out){
      if(!out || !out.ok) return {ok:false,streak:null,bonus:0};
      return tasksSetStatus(task,"approve").then(function(){
        tasksNotify("child","task_approved",{title:title,n:pts});
        return {ok:true,streak:out.streak,bonus:out.bonus};
      });
    });
  }
  function tasksDecline(task){ /* родитель: вернуть без очков и без штрафа (решение Джеффа) */
    return tasksSetStatus(task,"decline");
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
        summary: function(){ return bankSummary(); }
        /* streakReset упразднён 2026-06-07: винстрик выводится из леджера и гаснет сам
           (день без задания); хранимого счётчика больше нет. */
      },
      /* ---- задания родителей: ОБЩИЙ движок (api/tasks.php, канон — ГАЙД-задания.md).
         Копилка и модуль «Задания» — только эти вызовы, своей логики заданий не держат.
         claim/approve сами начисляют очки (sdk.points) и шлют оповещения. */
      tasks: {
        list:    function(){ return tasksList(); },
        create:  function(o){ return tasksCreate(o); },
        update:  function(id,patch){ return tasksUpdate(id,patch); },
        remove:  function(id){ return tasksRemove(id); },
        claim:   function(task){ return tasksClaim(task); },
        approve: function(task){ return tasksApprove(task); },
        decline: function(task){ return tasksDecline(task); }
      },
      /* ---- оповещения (ядро core/notify.js + api/notify.php; канон — ГАЙД-оповещения.md) ----
         send(to, type, opts?) — fire-and-forget, никогда не reject. to: "parents"|"child"|"family"
         (родитель в модуле шлёт "child" ребёнку, выбранному на дашборде — child добавляется сам,
         как в dataOp). opts: { params:{…} для шаблона ntf.ev.<модуль>.<type>, link:{module,item}
         либо {view,id} }. Текст обязан иметь ключ ntf.ev.<модуль>.<type> в core/notify.js
         (en/ru/lv) либо params.text-фолбэк. В демо — no-op. */
      notify: {
        send: function(to,type,opts){
          opts=opts||{};
          if(RT.isDemo()) return Promise.resolve({ok:true,demo:true});
          var b={op:"send",to:String(to||"parents"),src:mod,type:String(type||""),
                 params:opts.params||null,link:opts.link||null};
          var pc=parentChild(); if(pc) b.child=pc;
          return API.post("notify.php",b).catch(function(){ return {ok:false}; });
        }
      },
      /* ---- семья: список детей и выбранный на дашборде ребёнок (для модулей с общесемейными
         данными, напр. каталог Магазина: чек-лист «доступно детям»). Источник — загруженный
         родительский дашборд (core/parent.js). Для роли child или без дашборда — пусто/null. */
      family: {
        children: function(){
          var ch = (RT.Parent && RT.Parent.children) ? RT.Parent.children() : [];
          return Array.isArray(ch) ? ch : [];
        }
      },
      /* выбранный на дашборде ребёнок {id, name} (роль parent); null — иначе. Тот же id,
         что sdk.js шлёт серверу (parentChild) — модуль показывает, в чьём скоупе работает. */
      scopeChild: function(){
        if(role!=="parent") return null;
        var id = parentChild();
        if(!id) return null;
        var name="", ch=(RT.Parent && RT.Parent.children) ? RT.Parent.children() : [];
        for(var i=0;i<(ch||[]).length;i++){ if(String(ch[i].id)===String(id)){ name=ch[i].nickname||""; break; } }
        return { id:id, name:name };
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
