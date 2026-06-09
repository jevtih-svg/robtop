/* RobTop — SDK, выдаётся каждому модулю в mount(root, sdk).
   Развязывает модули от ядра: данные, события, медиа, UI, роли, очки, тема, локальное хранилище.
   Модуль НИКОГДА не трогает DOM вне своего root и не вызывает fetch напрямую — только через sdk. */
window.RobTop = window.RobTop || {};
(function(RT){
  "use strict";

  var API = {
    base: "api/",
    // SEC 2026-06-09: единая обработка ответа. 401 на защищённом эндпоинте (кроме accounts.php,
    // где 401 = неверный логин/пароль при входе) → шелл возвращает на экран входа (RT._on401),
    // а не молча падает в кэш/DEFAULTS.
    _h: function(r,p){
      if(r.status===401 && String(p).indexOf("accounts.php")!==0 && typeof RT._on401==="function"){ try{ RT._on401(); }catch(e){} }
      if(!r.ok) throw new Error("http "+r.status);
      return r.json();
    },
    get: function(p){ return fetch(API.base+p,{headers:{"Accept":"application/json"}}).then(function(r){ return API._h(r,p); }); },
    post: function(p,b){ return fetch(API.base+p,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)}).then(function(r){ return API._h(r,p); }); }
  };
  RT.API = API;

  function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
  RT.uid = uid;
  /* mediaResize — единый ресайз фото (Ф4): FileReader → Image → canvas (макс. сторона max,
     jpeg quality) → dataUrl; фолбэк на исходник при сбое. Раньше копировался в 7 модулях. */
  function mediaResize(file, max, quality, cb){
    var reader=new FileReader();
    reader.onload=function(ev){
      var img=new Image();
      img.onload=function(){
        var w=img.width, h=img.height;
        if(w>h && w>max){ h=Math.round(h*max/w); w=max; } else if(h>=w && h>max){ w=Math.round(w*max/h); h=max; }
        var dataUrl;
        try{ var cv=document.createElement("canvas"); cv.width=w; cv.height=h; cv.getContext("2d").drawImage(img,0,0,w,h); dataUrl=cv.toDataURL("image/jpeg",quality); }
        catch(e){ dataUrl=ev.target.result; }
        cb(dataUrl);
      };
      img.onerror=function(){ cb(ev.target.result); };
      img.src=ev.target.result;
    };
    reader.readAsDataURL(file);
  }
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
  /* SEC 2026-06-09: запись очков — ТОЛЬКО через серверный авторитет api/points.php (op add);
     data.php (bank/points) на запись закрыт (ребёнок мог начислить себе любую сумму). Сервер
     решает сумму по reason/роли. Демо (file://) пишет в localStorage как раньше (паритета ради). */
  function bankTxn(rec){
    if(RT.isDemo()) return dataOp("bank","create","points",{data:rec});
    var b={op:"add", reason:rec.reason, n:rec.n, kind:rec.kind, src:rec.src, note:rec.note||null};
    if(rec.entry!=null) b.entry=rec.entry;
    var pc=parentChild(); if(pc) b.child=pc;
    return API.post("points.php", b);
  }
  /* Добавить транзакцию; никогда не reject (модули зовут fire-and-forget).
     → Promise<{ok, n, kind, streak|null, bonus}>
     task_done: после записи серия пересчитывается из леджера (включая эту строку),
     бонус = винстрик−1 отдельной строкой streak_bonus. */
  function bankAdd(srcMod, n, reason, opts){
    n = parseInt(n,10)||0; opts = opts||{};
    var kind = bankKind(n, reason, opts);
    var rec = { n:n, reason:String(reason||""), src:String(opts.src||srcMod||""), kind:kind };
    if(opts.note) rec.note = String(opts.note).slice(0,80);
    if(opts.entry!=null) rec.entry = opts.entry;
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
     Задания — ресурс УРОВНЯ ПРИЛОЖЕНИЯ, как очки: отдельная таблица tasks (НЕ generic-стор),
     один источник правды. UI два и они реплицируют друг друга: модуль «Задания» (главный
     хаб) и блок «Задания» в Копилке — оба зовут ТОЛЬКО sdk.tasks, своей логики не держат.
     Контракт задания (плоский): { id, title, points, type "recur"|"once",
       status "active"|"pending"|"done", origin "parent"|"child", timesDone, lastDoneAt,
       claimedAt, doneAt, createdAt, updatedAt } (таймстампы — ms или null).
     ПОТОКИ (рефактор 2026-06-08; порядок «сначала очки, потом статус» — защита награды;
     переходы на сервере условные, гонка → 409):
       create  (родитель): новое задание ребёнку, origin=parent, status=active;
       propose (РЕБЁНОК): «залогировать» сделанное дело с предложенными очками,
               origin=child, type=once, status=pending — ждёт ревью родителя;
       claim   (ребёнок «Сделал!»): active → pending ВСЕГДА (и once, и recur) —
               универсальное подтверждение, очки только после approve родителя;
       approve (родитель, points? — поправленная сумма): очки (kind task_done) +
               recur → active (timesDone+1) | once/предложение → done;
       decline (родитель): проверка отклонена → задание назад в active (без очков);
       deny    (родитель): предложение ребёнка отклонено → исчезает (мягкое удаление).
     Оповещения (ntf.ev.tasks.*: task_new/task_claim/task_approved/task_returned/
       task_proposed/task_proposal_ok/task_proposal_no) шлёт САМ движок — UI не дублирует.
     Демо: localStorage через demoData("tasks","items") — обе плитки видят один список. */
  function taskNorm(x){ /* демо-строка {id,status,data{…}} → плоский контракт сервиса */
    var d=x.data||{}, p=parseInt(d.points,10);
    return { id:String(x.id), title:String(d.title||""), points:p>0?Math.min(p,1000):10,
             type:d.type==="once"?"once":"recur", status:x.status||"active",
             origin:d.origin==="child"?"child":"parent",
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
    /* src:"tasks" — шаблоны текста ntf.ev.tasks.*; deep-link ведёт в Копилку (модуль «Задания» удалён 2026-06-09, UI заданий — вкладка bank) */
    var b={op:"send",to:to,src:"tasks",type:type,params:params||null,link:{module:"bank"}};
    var pc=parentChild(); if(pc) b.child=pc;
    API.post("notify.php",b).catch(function(){});
  }
  function selfName(){ return (RT._shell && RT._shell.user && RT._shell.user.name)||""; }
  function clampPts(v){ var n=parseInt(v,10); return n>0?Math.min(n,1000):10; }
  function tasksList(){
    if(RT.isDemo()){
      var r=demoData("tasks","list","items",null);
      return Promise.resolve(((r&&r.items)||[]).map(taskNorm).filter(function(x){ return x.status!=="denied"; }));
    }
    return tasksPost("list",null).then(function(r){ return (r&&r.items)||[]; });
  }
  function tasksCreate(o){ /* родитель: новое задание */
    o=o||{};
    var rec={ title:String(o.title||"").slice(0,120), points:clampPts(o.points),
              type:o.type==="once"?"once":"recur" };
    function fin(){ tasksNotify("child","task_new",{title:rec.title,n:rec.points}); return {ok:true}; }
    if(RT.isDemo()){
      demoData("tasks","create","items",{data:{title:rec.title,points:rec.points,type:rec.type,origin:"parent",timesDone:0,status:"active"}});
      return Promise.resolve(fin());
    }
    return tasksPost("create",rec).then(function(r){ return (r&&r.ok)?fin():{ok:false}; })
      .catch(function(){ return {ok:false}; });
  }
  function tasksPropose(o){ /* ребёнок: залогировать сделанное дело с предложенными очками */
    o=o||{};
    var rec={ title:String(o.title||"").slice(0,120), points:clampPts(o.points) };
    if(!rec.title) return Promise.resolve({ok:false});
    function fin(){ tasksNotify("parents","task_proposed",{name:selfName(),title:rec.title,n:rec.points}); return {ok:true}; }
    if(RT.isDemo()){
      demoData("tasks","create","items",{data:{title:rec.title,points:rec.points,type:"once",origin:"child",timesDone:0,status:"pending",claimedAt:Date.now()}});
      return Promise.resolve(fin());
    }
    return tasksPost("propose",rec).then(function(r){ return (r&&r.ok)?fin():{ok:false}; })
      .catch(function(){ return {ok:false}; });
  }
  function tasksUpdate(id,patch){ /* родитель: правка названия/очков/типа */
    var p={}, n;
    if(patch && patch.title!=null) p.title=String(patch.title).slice(0,120);
    if(patch && patch.points!=null) p.points=clampPts(patch.points);
    if(patch && patch.type!=null) p.type=patch.type==="once"?"once":"recur";
    if(RT.isDemo()){ demoData("tasks","update","items",{id:id,patch:p}); return Promise.resolve({ok:true}); }
    return tasksPost("update",{id:id,patch:p}).then(function(r){ return {ok:!!(r&&r.ok)}; })
      .catch(function(){ return {ok:false}; });
  }
  function tasksRemove(id){ /* родитель: удалить задание */
    if(RT.isDemo()){ demoData("tasks","delete","items",{id:id}); return Promise.resolve({ok:true}); }
    return tasksPost("delete",{id:id}).then(function(r){ return {ok:!!(r&&r.ok)}; })
      .catch(function(){ return {ok:false}; });
  }
  function demoStatus(id, status, patch){ /* демо: сдвиг статуса + патч полей одной строки */
    demoData("tasks","move","items",{id:id,status:status});
    if(patch) demoData("tasks","update","items",{id:id,patch:patch});
  }
  function tasksClaim(task){ /* ребёнок «Сделал!» → {ok} (всегда на проверку родителю) */
    if(RT.isDemo()){ demoStatus(task.id,"pending",{claimedAt:Date.now()}); return Promise.resolve(claimFin()); }
    function claimFin(){ tasksNotify("parents","task_claim",{name:selfName(),title:String(task.title||""),n:parseInt(task.points,10)||10}); return {ok:true}; }
    return tasksPost("claim",{id:task.id}).then(function(r){ return (r&&r.ok)?claimFin():{ok:false}; })
      .catch(function(){ return {ok:false}; });
  }
  function tasksApprove(task, finalPts){ /* родитель: подтвердить (+поправить очки) → {ok, streak, bonus, points} */
    var pts=(finalPts!=null)?clampPts(finalPts):(parseInt(task.points,10)||10);
    var title=String(task.title||""), isChild=(task.origin==="child");
    var recur=(task.type!=="once" && !isChild);
    if(RT.isDemo()){
      return bankAdd("tasks",pts,"task_done",{kind:"task_done",src:"parent",note:title}).then(function(out){
        if(!out || !out.ok) return {ok:false,streak:null,bonus:0,points:pts};
        if(recur) demoStatus(task.id,"active",{points:pts,timesDone:(parseInt(task.timesDone,10)||0)+1,lastDoneAt:Date.now(),claimedAt:null});
        else demoStatus(task.id,"done",{points:pts,doneAt:Date.now(),claimedAt:null});
        tasksNotify("child", isChild?"task_proposal_ok":"task_approved", {title:title,n:pts});
        return {ok:true,streak:out.streak,bonus:out.bonus,points:pts};
      });
    }
    /* СЕРВЕР (SEC 2026-06-09): очки task_done + бонус серии начисляет api/tasks.php approve
       (порт bankAdd на сервер). Клиент очки больше НЕ пишет; берёт points/streak/bonus из ответа. */
    return tasksPost("approve",finalPts!=null?{id:task.id,points:pts}:{id:task.id}).then(function(r){
      if(!r || !r.ok) return {ok:false,streak:null,bonus:0,points:pts};
      var fp=(r.points!=null)?r.points:pts;
      tasksNotify("child", isChild?"task_proposal_ok":"task_approved", {title:title,n:fp});
      return {ok:true, streak:(r.streak!=null?r.streak:null), bonus:(r.bonus||0), points:fp};
    }).catch(function(){ return {ok:false,streak:null,bonus:0,points:pts}; });
  }
  function tasksDecline(task){ /* родитель: вернуть проверку выполнения в active (без очков) */
    var title=String(task.title||"");
    if(RT.isDemo()){ demoStatus(task.id,"active",{claimedAt:null}); return Promise.resolve(declFin()); }
    function declFin(){ tasksNotify("child","task_returned",{title:title}); return {ok:true}; }
    return tasksPost("decline",{id:task.id}).then(function(r){ return (r&&r.ok)?declFin():{ok:false}; })
      .catch(function(){ return {ok:false}; });
  }
  function tasksDeny(task){ /* родитель: отклонить предложение ребёнка → исчезает */
    var title=String(task.title||"");
    if(RT.isDemo()){ demoStatus(task.id,"denied",{claimedAt:null}); demoData("tasks","delete","items",{id:task.id}); return Promise.resolve(denyFin()); }
    function denyFin(){ tasksNotify("child","task_proposal_no",{title:title}); return {ok:true}; }
    return tasksPost("deny",{id:task.id}).then(function(r){ return (r&&r.ok)?denyFin():{ok:false}; })
      .catch(function(){ return {ok:false}; });
  }

  RT.createSdk = function(meta){
    var mod = meta.id;
    var shell = RT._shell || {};
    var role = (shell.user && shell.user.role) || "child";
    /* ---- авто-снимаемые слушатели (Ф5): sdk.on/sdk.cleanup регистрируют функцию отмены;
       ядро (loader.RT.close → sdk._dispose) снимает ВСЁ при размонтировании модуля.
       Чинит утечку: модуль вешал слушатель на #module-view (он переживает открытия) и не снимал. */
    var _cleanups = [];
    /* hasPerm — объявлена ли возможность в манифесте модуля (поле permissions). Ф6 ОС-рефакторинга:
       системные ресурсы выдаются по заявке. Гейтим начисление/списание очков (points). */
    function hasPerm(p){ var L=(meta && meta.permissions)||[]; return L.indexOf(p)>=0; }
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
      /* on(target, event, handler, opts?) — слушатель с авто-снятием при unmount (Ф5).
         Возвращает handler (для ручного снятия при желании). cleanup(fn) — произвольная отмена. */
      on: function(target,ev,fn,opts){ if(target&&target.addEventListener){ target.addEventListener(ev,fn,opts); _cleanups.push(function(){ try{ target.removeEventListener(ev,fn,opts); }catch(e){} }); } return fn; },
      cleanup: function(fn){ if(typeof fn==="function") _cleanups.push(fn); },
      media:  {
        /* upload(dataUrl,kind) — загрузка готового dataUrl. Ф4: требует permission "camera". */
        upload:function(dataUrl,kind){
          if(!hasPerm("camera")){ if(window.console&&console.warn) console.warn("RobTop: модуль '"+mod+"' без разрешения 'camera' — upload проигнорирован"); return Promise.resolve({ ok:false, denied:true }); }
          return API.post("upload.php",{dataUrl:dataUrl, kind:kind||mod});
        },
        /* pick(opts) — ЕДИНЫЙ выбор фото (Ф4): открыть выбор → ресайз → (демо: dataUrl /
           сервер: upload) → {path, dataUrl} либо null (отмена/ошибка). Заменяет 7 копий пайплайна.
           opts: { source:"camera"|"gallery"(деф), kind:<папка>, max:900, quality:0.82,
                   onLocal:fn(dataUrl) — показать превью сразу до загрузки }. Требует "camera". */
        pick:function(opts){
          opts=opts||{};
          if(!hasPerm("camera")){ if(window.console&&console.warn) console.warn("RobTop: модуль '"+mod+"' без разрешения 'camera' — media.pick проигнорирован"); return Promise.resolve(null); }
          return new Promise(function(resolve){
            var input=document.createElement("input"); input.type="file"; input.accept="image/*";
            if(opts.source==="camera") input.setAttribute("capture","environment");
            input.style.display="none"; document.body.appendChild(input);
            input.addEventListener("change", function(){
              var file=input.files && input.files[0];
              if(input.parentNode) input.parentNode.removeChild(input);
              if(!file){ resolve(null); return; }
              mediaResize(file, opts.max||900, opts.quality||0.82, function(dataUrl){
                if(opts.onLocal){ try{ opts.onLocal(dataUrl); }catch(e){} }
                if(RT.isDemo()){ resolve({ path:dataUrl, dataUrl:dataUrl, demo:true }); return; }
                API.post("upload.php",{dataUrl:dataUrl, kind:opts.kind||mod}).then(function(res){
                  resolve(res && res.path ? { path:res.path, dataUrl:dataUrl } : null);
                }).catch(function(){ resolve(null); });
              });
            });
            input.click();
          });
        }
      },
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
        /* frame(opts) — ЕДИНАЯ рамка экрана модуля (guardrails): строит шапку (‹ назад ·
           заголовок · действия) и возвращает { body } для контента. Канон — ГАЙД-UI-guardrails.md. */
        frame:    function(opts){ return shell.frame(opts); },
        back:     function(){ RT.close(); },
        enableDrag: function(sheet,close){ shell.enableDrag(sheet,close); },
        /* fixViewport() — заново развернуть layout-вьюпорт на полную высоту (iOS-PWA). Модуль зовёт
           при размонтировании, если блокировал прокрутку тела / гонял клавиатуру (chat), иначе
           нижний бар застревает выше реального низа экрана — «щель» снизу. */
        fixViewport: function(cb){ if(shell.fixViewport) shell.fixViewport(cb); }
      },
      points: {
        /* add(n, reason, opts?) — opts:{kind, src, note}; kind по умолчанию: win (n≥0) / loss / manual (*_manual).
           Ф6: требует разрешение "points" в манифесте (permissions). Без него — no-op + предупреждение
           (защита экономики: установленное приложение не может само себе начислять/списывать очки). */
        add: function(n,reason,opts){
          if(!hasPerm("points")){
            if(window.console && console.warn) console.warn("RobTop: модуль '"+mod+"' без разрешения 'points' — points.add проигнорирован");
            return Promise.resolve({ ok:false, n:0, kind:"", streak:null, bonus:0, denied:true });
          }
          return bankAdd(mod,n,reason,opts);
        },
        /* reverse(entryId) — откат начисления за прогулку (родитель удалил запись). Серверно,
           только роль parent, идемпотентно. Демо (file://) — no-op (баланс локальный). */
        reverse: function(entryId){
          if(!hasPerm("points")) return Promise.resolve({ ok:false, denied:true });
          if(RT.isDemo()) return Promise.resolve({ ok:true, n:0 });
          var b={op:"reverse", entry:entryId}; var pc=parentChild(); if(pc) b.child=pc;
          return API.post("points.php", b);
        },
        /* SEC 2026-06-09: Магазин — цену решает СЕРВЕР (каталог), не клиент. spend(itemId): списать
           цену товара; refund(orderId): родитель вернул цену заказа (идемпотентно). Демо — локально. */
        spend: function(itemId){
          if(!hasPerm("points")) return Promise.resolve({ ok:false, denied:true });
          if(RT.isDemo()){
            var its=(demoData("shop","list","items",null).items)||[], it=null, i;
            for(i=0;i<its.length;i++){ if(String(its[i].id)===String(itemId)){ it=its[i]; break; } }
            var pr=it?(parseInt(it.data&&it.data.price,10)||0):0;
            if(pr<=0) return Promise.resolve({ ok:false });
            return bankTxn({n:-pr,reason:"spend",src:"shop",kind:"spend",note:(it.data&&it.data.title)||""}).then(function(){ return {ok:true,price:pr}; });
          }
          var bs={op:"spend", item:itemId}; var pcs=parentChild(); if(pcs) bs.child=pcs;
          return API.post("points.php", bs);
        },
        refund: function(orderId){
          if(!hasPerm("points")) return Promise.resolve({ ok:false, denied:true });
          if(RT.isDemo()){
            var os=(demoData("shop","list","orders",null).items)||[], o=null, j;
            for(j=0;j<os.length;j++){ if(String(os[j].id)===String(orderId)){ o=os[j]; break; } }
            if(!o || o.status==="declined") return Promise.resolve({ ok:true, already:true });
            var rp=parseInt(o.data&&o.data.price,10)||0;
            if(rp<=0) return Promise.resolve({ ok:true, n:0 });
            return bankTxn({n:rp,reason:"spend_refund",src:"shop",kind:"spend",note:(o.data&&o.data.title)||""}).then(function(){ return {ok:true,price:rp}; });
          }
          var br={op:"refund", order:orderId}; var pcr=parentChild(); if(pcr) br.child=pcr;
          return API.post("points.php", br);
        },
        get: function(){ return bankSummary().then(function(s){ return s.balance; }).catch(function(){ return 0; }); },
        summary: function(){ return bankSummary(); }
        /* streakReset упразднён 2026-06-07: винстрик выводится из леджера и гаснет сам
           (день без задания); хранимого счётчика больше нет. */
      },
      /* ---- задания: ОБЩИЙ движок (api/tasks.php, канон — ГАЙД-задания.md).
         Модуль «Задания» и блок Копилки — только эти вызовы, своей логики не держат.
         claim/approve/propose/deny сами начисляют очки (sdk.points) и шлют оповещения. */
      tasks: {
        list:    function(){ return tasksList(); },
        create:  function(o){ return tasksCreate(o); },           // родитель: новое задание
        propose: function(o){ return tasksPropose(o); },          // ребёнок: залогировать дело с предложенными очками
        update:  function(id,patch){ return tasksUpdate(id,patch); },
        remove:  function(id){ return tasksRemove(id); },
        claim:   function(task){ return tasksClaim(task); },      // ребёнок: «Сделал!» → на проверку
        approve: function(task,points){ return tasksApprove(task,points); }, // родитель: подтвердить (+поправить очки)
        decline: function(task){ return tasksDecline(task); },    // родитель: вернуть проверку в active
        deny:    function(task){ return tasksDeny(task); }        // родитель: отклонить предложение (исчезает)
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
      /* util — общие чистые хелперы ядра (core/util.js): esc/escAttr/uid/pad2/dayKey.
         Новый код модулей берёт их отсюда; старый — через глобальный RobTop.util-алиас. */
      util: RT.util || {},
      isDemo: function(){ return RT.isDemo(); }
    };
    /* _dispose — ядро зовёт при размонтировании (loader.RT.close), снимает все sdk.on/cleanup. */
    sdk._dispose = function(){ for(var i=0;i<_cleanups.length;i++){ try{ _cleanups[i](); }catch(e){} } _cleanups.length=0; };
    return sdk;
  };
})(window.RobTop);
