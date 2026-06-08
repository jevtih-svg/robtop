/* RobTop — модуль «Змейка». Snake II как на Nokia 3310, но цветная (неон).
   Поле 16×20 на canvas, края СКВОЗНЫЕ (вышел справа — появился слева), смерть
   только о собственное тело. Перед игрой выбирается скорость 1–9 (запоминается):
   еда даёт столько очков, каков уровень — как в Nokia. Каждая 5-я еда вызывает
   бонус-жучка на 30 ходов (+уровень×3, змейку не растит). Рекорд — в snake/meta;
   новый рекорд в конце игры = ровно одна транзакция +10 в копилку
   (sdk.points.add(10,"snake_record"), тариф — ГАЙД-очки.md §4). История игр —
   snake/games. Управление: свайп по полю, экранные стрелки, клавиатура.
   Тексты — sdk.t/sdk.formatDate (en/ru/lv); словарь — MESSAGES ниже. */
(function(){
  "use strict";

  /* =================== ЛОКАЛИЗАЦИЯ (en/ru/lv) =================== */
  var MESSAGES={
    en:{ snake:{
      subtitle:"Like on the Nokia 3310 — but in neon",
      hudLeft:"🐍 <b>snake</b>", hudCLbl:"record", hudRLbl:"games",
      startTitle:"Snake!",
      startHint:"Eat food to grow — food gives as many points as the speed level. Every 5th food calls a bonus bug! Don't crash into yourself.",
      speedLbl:"Speed", recordLine:"Record: {n}", startBtn:"Play",
      scoreLbl:"score", speedChip:"speed {s}",
      paused:"Paused", resumeBtn:"Continue",
      overTitle:"Game over!", newRecord:"🏆 New record! +10 to the Piggy Bank",
      againBtn:"Play again",
      historyTitle:"My games", historyEmpty:"No games yet. Tap “Play”!",
      histMeta:"speed {s} · length {l}", badgeRecord:"★ Record",
      statsTitle:"Snake stats", statTotal:"games total", statBest:"record",
      statRecords:"records beaten", statLen:"longest snake",
      parentNote:"The child plays. You're viewing.",
      saveFailed:"Couldn't save",
      aria:{ stats:"Stats", pause:"Pause", up:"Up", down:"Down", left:"Left", right:"Right" }
    }, bank:{ r_snake_record:"Snake — new record" }},
    ru:{ snake:{
      subtitle:"Как на Nokia 3310 — только в неоне",
      hudLeft:"🐍 <b>змейка</b>", hudCLbl:"рекорд", hudRLbl:"игр",
      startTitle:"Змейка!",
      startHint:"Ешь еду и расти — еда даёт столько очков, какая скорость. Каждая 5-я еда зовёт бонус-жучка! Не врезайся в себя.",
      speedLbl:"Скорость", recordLine:"Рекорд: {n}", startBtn:"Играть",
      scoreLbl:"очки", speedChip:"скорость {s}",
      paused:"Пауза", resumeBtn:"Продолжить",
      overTitle:"Игра окончена!", newRecord:"🏆 Новый рекорд! +10 в копилку",
      againBtn:"Ещё раз",
      historyTitle:"Мои игры", historyEmpty:"Игр пока нет. Нажми «Играть»!",
      histMeta:"скорость {s} · длина {l}", badgeRecord:"★ Рекорд",
      statsTitle:"Статистика змейки", statTotal:"всего игр", statBest:"рекорд",
      statRecords:"рекордов побито", statLen:"самая длинная змейка",
      parentNote:"Играет ребёнок. Это просмотр.",
      saveFailed:"Не удалось сохранить",
      aria:{ stats:"Статистика", pause:"Пауза", up:"Вверх", down:"Вниз", left:"Влево", right:"Вправо" }
    }, bank:{ r_snake_record:"Змейка — новый рекорд" }},
    lv:{ snake:{
      subtitle:"Kā uz Nokia 3310 — tikai neonā",
      hudLeft:"🐍 <b>čūska</b>", hudCLbl:"rekords", hudRLbl:"spēles",
      startTitle:"Čūska!",
      startHint:"Ēd barību un audz — barība dod tik punktus, kāds ir ātruma līmenis. Katra 5. barība atsauc bonusa vaboli! Nesaduries pats ar sevi.",
      speedLbl:"Ātrums", recordLine:"Rekords: {n}", startBtn:"Spēlēt",
      scoreLbl:"punkti", speedChip:"ātrums {s}",
      paused:"Pauze", resumeBtn:"Turpināt",
      overTitle:"Spēle beigusies!", newRecord:"🏆 Jauns rekords! +10 krājkasē",
      againBtn:"Vēlreiz",
      historyTitle:"Manas spēles", historyEmpty:"Spēļu vēl nav. Nospied “Spēlēt”!",
      histMeta:"ātrums {s} · garums {l}", badgeRecord:"★ Rekords",
      statsTitle:"Čūskas statistika", statTotal:"spēles kopā", statBest:"rekords",
      statRecords:"pārspēti rekordi", statLen:"garākā čūska",
      parentNote:"Spēlē bērns. Šis ir skats.",
      saveFailed:"Neizdevās saglabāt",
      aria:{ stats:"Statistika", pause:"Pauze", up:"Uz augšu", down:"Uz leju", left:"Pa kreisi", right:"Pa labi" }
    }, bank:{ r_snake_record:"Čūska — jauns rekords" }}
  };

  /* =================== КОНСТАНТЫ =================== */
  var COLS=16, ROWS=20, START_LEN=4;
  /* интервал хода по уровню скорости 1–9 (мс); индекс 0 не используется */
  var SPEED_MS=[0,600,540,480,420,360,300,250,200,155];
  var BONUS_EVERY=5, BONUS_TICKS=30, BONUS_MULT=3;
  var DIRS={ up:{x:0,y:-1}, down:{x:0,y:1}, left:{x:-1,y:0}, right:{x:1,y:0} };
  var BACK_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
  var STATS_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 20v-6M12 20V8M19 20V4"/></svg>';
  var ARROW_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg>';

  /* =================== СОСТОЯНИЕ =================== */
  var sdk=null, root=null, E={}, games=[], best=0, metaId=null, metaLoaded=false;
  var mode="idle";          // idle | play | over
  var g=null;               // {snake[],dir,queue[],food,bonus,score,foods,level,paused}
  var timerId=null, speedSel=3, curSheet=null, saving=false, recJust=false, touchPt=null;

  function esc(s){ return RobTop.util.esc(s); }
  function t(k,p){ return sdk.t(k,p); }
  function pad2(n){ return RobTop.util.pad2(n); }
  function todayStr(){ var d=new Date(); return d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate()); }
  function nowHM(){ var d=new Date(); return pad2(d.getHours())+":"+pad2(d.getMinutes()); }
  function humanDate(s){ try{ var p=String(s).split("-"); return sdk.formatDate(new Date(+p[0],+p[1]-1,+p[2])); }catch(e){ return s||""; } }
  function dataOf(it){ return (it&&it.data)||{}; }

  /* ----- данные ----- */
  function reloadGames(){ return sdk.data.list("games").then(function(list){ games=(list||[]).slice().sort(function(a,b){ return (b.createdAt||0)-(a.createdAt||0); }); }); }
  function loadMeta(){
    return sdk.data.list("meta").then(function(list){
      if(list&&list.length){ metaId=list[0].id; best=parseInt((list[0].data||{}).best,10)||0; return; }
      return sdk.data.create("meta",{best:0}).then(function(it){ metaId=it&&it.id; best=0; });
    });
  }
  function saveBest(){
    if(metaId) return sdk.data.update("meta",metaId,{best:best});
    return sdk.data.create("meta",{best:best}).then(function(it){ metaId=it&&it.id; });
  }

  /* ----- статистика ----- */
  function stats(){
    var s={total:0,records:0,maxLen:0};
    games.forEach(function(it){
      var d=dataOf(it); s.total++;
      if(d.record) s.records++;
      if((parseInt(d.len,10)||0)>s.maxLen) s.maxLen=parseInt(d.len,10)||0;
    });
    return s;
  }
  function hud(){ sdk.ui.hud({ left:t("hudLeft"), cNum:best, cLbl:t("hudCLbl"), rNum:games.length, rLbl:t("hudRLbl") }); }

  /* =================== ИГРОВАЯ МЕХАНИКА =================== */
  function freeCell(){
    var busy={}, i;
    if(g){ for(i=0;i<g.snake.length;i++) busy[g.snake[i].x+"_"+g.snake[i].y]=1;
      if(g.food) busy[g.food.x+"_"+g.food.y]=1;
      if(g.bonus) busy[g.bonus.x+"_"+g.bonus.y]=1; }
    for(i=0;i<200;i++){
      var x=Math.floor(Math.random()*COLS), y=Math.floor(Math.random()*ROWS);
      if(!busy[x+"_"+y]) return {x:x,y:y};
    }
    for(var yy=0;yy<ROWS;yy++) for(var xx=0;xx<COLS;xx++){ if(!busy[xx+"_"+yy]) return {x:xx,y:yy}; }
    return null; /* поле заполнено целиком — победа */
  }
  function setDir(name){
    if(mode!=="play"||!g) return;
    var d=DIRS[name]; if(!d) return;
    var last=g.queue.length?g.queue[g.queue.length-1]:g.dir;
    if(d.x===-last.x&&d.y===-last.y) return; /* разворот на 180° запрещён, как в Nokia */
    if(d.x===last.x&&d.y===last.y) return;
    if(g.queue.length<2) g.queue.push(d);
  }
  function stopLoop(){ if(timerId){ clearInterval(timerId); timerId=null; } }
  function step(){
    if(!root||mode!=="play"||!g||g.paused) return;
    if(g.queue.length) g.dir=g.queue.shift();
    var nh={ x:(g.snake[0].x+g.dir.x+COLS)%COLS, y:(g.snake[0].y+g.dir.y+ROWS)%ROWS };
    var ate=!!(g.food && nh.x===g.food.x && nh.y===g.food.y);
    var ateB=!!(g.bonus && nh.x===g.bonus.x && nh.y===g.bonus.y);
    if(!ate) g.snake.pop(); /* хвост уходит раньше головы — в его клетку входить можно */
    for(var i=0;i<g.snake.length;i++){
      if(g.snake[i].x===nh.x&&g.snake[i].y===nh.y){ g.snake.unshift(nh); finish(); return; }
    }
    g.snake.unshift(nh);
    if(ate){
      g.score+=g.level; g.foods++;
      sdk.ui.haptics(6);
      g.food=freeCell();
      if(g.foods%BONUS_EVERY===0 && !g.bonus){
        var b=freeCell();
        if(b){ b.t=BONUS_TICKS; g.bonus=b; }
      }
      if(!g.food){ finish(); return; } /* заполнил всё поле */
    }
    if(g.bonus){
      if(ateB){ g.score+=g.level*BONUS_MULT; g.bonus=null; sdk.ui.haptics([8,20,8]); }
      else if(--g.bonus.t<=0) g.bonus=null;
    }
    updatePlayInfo(); draw();
  }
  function start(){
    if(!sdk.can("edit")||!metaLoaded||mode==="play") return;
    g={ snake:[], dir:DIRS.right, queue:[], food:null, bonus:null, score:0, foods:0, level:speedSel, paused:false };
    var cy=Math.floor(ROWS/2), cx=Math.floor(COLS/2)+1;
    for(var i=0;i<START_LEN;i++) g.snake.push({x:cx-i,y:cy});
    g.food=freeCell();
    mode="play"; saving=false; recJust=false;
    renderStage();
    stopLoop(); timerId=setInterval(step, SPEED_MS[g.level]||300);
    sdk.ui.haptics(8);
  }
  function setPaused(p){
    if(mode!=="play"||!g) return;
    g.paused=!!p;
    if(E.pauseOv) E.pauseOv.classList.toggle("on",g.paused);
    if(E.pauseBtn) E.pauseBtn.textContent=g.paused?"▶":"⏸";
  }
  function finish(){
    if(mode!=="play"||!g||saving) return;
    saving=true; stopLoop(); mode="over";
    var rec=g.score>best;
    recJust=rec;
    if(rec){
      best=g.score; saveBest();
      sdk.points.add(10,"snake_record"); /* ровно одна транзакция за рекорд (ГАЙД-очки §4) */
      sdk.ui.confetti(); sdk.ui.chime(); sdk.ui.haptics([20,30,60]);
    } else {
      sdk.ui.haptics([10,30,10]);
    }
    sdk.events.track("snake_played",{score:g.score, speed:g.level, len:g.snake.length, record:rec?1:0});
    var payload={score:g.score, speed:g.level, len:g.snake.length, record:rec?1:0, date:todayStr(), time:nowHM()};
    renderStage();
    sdk.data.create("games",payload).then(function(it){
      if(!root) return;
      if(it) games.unshift(it); else return reloadGames();
    }).then(function(){ if(!root) return; hud(); renderHistory(); })
      .catch(function(){ if(root) sdk.ui.toast(t("saveFailed")); });
  }

  /* =================== ОТРИСОВКА ПОЛЯ (canvas) =================== */
  function fitCanvas(){
    if(!E.canvas) return;
    var w=E.canvas.clientWidth||352, dpr=Math.min(window.devicePixelRatio||1,2);
    var cs=Math.max(8,Math.floor(w*dpr/COLS));
    E.canvas.width=cs*COLS; E.canvas.height=cs*ROWS;
  }
  function rrect(ctx,x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
  }
  /* ---- цвета канваса из ТОКЕНОВ ТЕМЫ (правило тем, КОНТЕКСТ §8): canvas не умеет
     var(), поэтому читаем токены из computed style на mount (смена темы — только в
     Настройках, модуль при этом размонтирован). Фолбэк — исходный неон. ---- */
  var TH={cyan:[25,227,255],gold:"#ffd23b",magenta:[255,43,214],head:"#bff4ff",eyes:"#06303c"};
  function hex2rgb(h){ var m=/^#([0-9a-f]{6})$/i.exec(String(h||"").trim()); if(!m) return null;
    var n=parseInt(m[1],16); return [n>>16&255,n>>8&255,n&255]; }
  function themeColors(){
    try{
      var cs=getComputedStyle(document.body);
      function v(n,fb){ var x=(cs.getPropertyValue(n)||"").trim(); return x||fb; }
      TH={ cyan:hex2rgb(v("--cyan","#19e3ff"))||[25,227,255],
           gold:v("--gold","#ffd23b"),
           magenta:hex2rgb(v("--magenta","#ff2bd6"))||[255,43,214],
           head:v("--cyan-soft","#bff4ff"),
           eyes:v("--on-bright","#06303c") };
    }catch(e){}
  }
  function dot(ctx,cx,cy,r,color,glow){
    ctx.save(); ctx.fillStyle=color; ctx.shadowColor=color; ctx.shadowBlur=glow;
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill(); ctx.restore();
  }
  function draw(){
    if(!E.canvas||!g) return;
    var ctx=E.canvas.getContext&&E.canvas.getContext("2d"); if(!ctx) return;
    var W=E.canvas.width,H=E.canvas.height,cs=W/COLS,i;
    ctx.clearRect(0,0,W,H);
    /* точки «печатной платы» в узлах сетки */
    ctx.fillStyle="rgba("+TH.cyan.join(",")+",.07)";
    for(var gx=1;gx<COLS;gx++) for(var gy=1;gy<ROWS;gy++) ctx.fillRect(gx*cs-1,gy*cs-1,2,2);
    /* еда — золотой орб */
    if(g.food) dot(ctx,(g.food.x+0.5)*cs,(g.food.y+0.5)*cs,cs*0.32,TH.gold,cs*0.5);
    /* бонус-жучок — magenta, мигает на последних ходах */
    if(g.bonus && (g.bonus.t>8 || g.bonus.t%2===0)){
      dot(ctx,(g.bonus.x+0.5)*cs,(g.bonus.y+0.5)*cs,cs*0.4,"rgb("+TH.magenta.join(",")+")",cs*0.65);
      ctx.save(); ctx.strokeStyle="rgba("+TH.magenta.join(",")+",.55)"; ctx.lineWidth=Math.max(1,cs*0.07);
      ctx.beginPath(); ctx.arc((g.bonus.x+0.5)*cs,(g.bonus.y+0.5)*cs,cs*0.52,0,Math.PI*2); ctx.stroke(); ctx.restore();
    }
    /* змейка: от хвоста к голове, хвост бледнее */
    var n=g.snake.length;
    for(i=n-1;i>=0;i--){
      var seg=g.snake[i], f=n>1?i/(n-1):0; /* 0 = голова, 1 = хвост */
      var x=seg.x*cs+1.5, y=seg.y*cs+1.5, s=cs-3;
      ctx.save();
      if(i===0){ ctx.fillStyle=TH.head; ctx.shadowColor="rgb("+TH.cyan.join(",")+")"; ctx.shadowBlur=cs*0.6; }
      else ctx.fillStyle="rgba("+TH.cyan.join(",")+","+(0.95-0.55*f).toFixed(2)+")";
      rrect(ctx,x,y,s,s,cs*0.3); ctx.fill(); ctx.restore();
    }
    /* глаза на голове — перпендикулярно направлению движения */
    var hd=g.snake[0], hx=(hd.x+0.5)*cs, hy=(hd.y+0.5)*cs;
    var px=g.dir.y, py=g.dir.x; /* перпендикуляр */
    ctx.fillStyle=TH.eyes;
    ctx.beginPath(); ctx.arc(hx+g.dir.x*cs*0.16+px*cs*0.18, hy+g.dir.y*cs*0.16+py*cs*0.18, cs*0.085, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(hx+g.dir.x*cs*0.16-px*cs*0.18, hy+g.dir.y*cs*0.16-py*cs*0.18, cs*0.085, 0, Math.PI*2); ctx.fill();
  }

  /* =================== СЦЕНА =================== */
  function speedChipsHtml(){
    var h='<div class="sn-speedlbl">'+esc(t("speedLbl"))+'</div><div class="sn-speeds">';
    for(var n=1;n<=9;n++) h+='<button type="button" class="sn-spd'+(n===speedSel?" active":"")+'" data-spd="'+n+'">'+n+'</button>';
    return h+'</div>';
  }
  function dpadHtml(){
    function b(d,extra){ return '<button type="button" class="sn-dbtn '+d+'" data-dir="'+d+'" aria-label="'+esc(t("aria."+d))+'"'+(extra||"")+'>'+ARROW_IC+'</button>'; }
    return '<div class="sn-dpad">'+'<span></span>'+b("up")+'<span></span>'+b("left")+b("down")+b("right")+'</div>';
  }
  function updatePlayInfo(){
    if(!g) return;
    if(E.score){ E.score.textContent=g.score; E.score.classList.toggle("gold", g.score>best); }
    if(E.best) E.best.textContent=Math.max(best,g.score);
  }
  function renderStage(){
    if(!root||!E.stage) return;
    /* полноэкранная партия: прячем всё лишнее (история, статистика, HUD) — только назад/пауза/поле */
    if(E.sn) E.sn.classList.toggle("playing", mode==="play");
    if(!sdk.can("edit")){
      E.stage.innerHTML='<div class="sn-card"><p class="sn-note">'+esc(t("parentNote"))+'</p></div>';
      return;
    }
    if(mode==="idle"){
      E.stage.innerHTML='<div class="sn-card">'
        +'<div class="sn-circle">🐍</div>'
        +'<h3 class="sn-card-title">'+esc(t("startTitle"))+'</h3>'
        +'<p class="sn-hint">'+esc(t("startHint"))+'</p>'
        +'<div class="sn-record">'+esc(t("recordLine",{n:best}))+'</div>'
        +speedChipsHtml()
        +'<button class="sn-bigbtn" data-act="start">'+esc(t("startBtn"))+'</button>'
        +'</div>';
      return;
    }
    if(mode==="play"){
      E.stage.innerHTML='<div class="sn-card play">'
        +'<div class="sn-info">'
          +'<div class="sn-num"><b id="snScore">0</b><small>'+esc(t("scoreLbl"))+'</small></div>'
          +'<span class="sn-lvl">'+esc(t("speedChip",{s:g.level}))+'</span>'
          +'<div class="sn-num right"><b id="snBest">'+best+'</b><small>'+esc(t("hudCLbl"))+'</small></div>'
          +'<button type="button" class="sn-pause" data-act="pause" aria-label="'+esc(t("aria.pause"))+'">⏸</button>'
        +'</div>'
        +'<div class="sn-wrap"><canvas id="snField"></canvas>'
          +'<div class="sn-ov" id="snOv"><div class="sn-ov-t">'+esc(t("paused"))+'</div>'
          +'<button class="sn-bigbtn sm" data-act="resume">'+esc(t("resumeBtn"))+'</button></div>'
        +'</div>'
        +dpadHtml()
        +'</div>';
      E.canvas=E.stage.querySelector("#snField");
      E.pauseOv=E.stage.querySelector("#snOv");
      E.pauseBtn=E.stage.querySelector(".sn-pause");
      E.score=E.stage.querySelector("#snScore");
      E.best=E.stage.querySelector("#snBest");
      /* свайп по полю: жёсткий перехват прокрутки */
      E.canvas.addEventListener("touchstart",function(e){ var p=e.touches[0]; touchPt={x:p.clientX,y:p.clientY}; },{passive:true});
      E.canvas.addEventListener("touchmove",function(e){
        e.preventDefault();
        if(!touchPt) return;
        var p=e.touches[0], dx=p.clientX-touchPt.x, dy=p.clientY-touchPt.y;
        if(Math.abs(dx)<24&&Math.abs(dy)<24) return;
        setDir(Math.abs(dx)>Math.abs(dy)?(dx>0?"right":"left"):(dy>0?"down":"up"));
        touchPt={x:p.clientX,y:p.clientY};
      },{passive:false});
      fitCanvas(); updatePlayInfo(); draw();
      sdk.ui.hud({hidden:true}); /* цифры HUD не наезжают на игру */
      return;
    }
    /* mode === "over" */
    sdk.ui.hud({hidden:false});
    E.stage.innerHTML='<div class="sn-card">'
      +'<div class="sn-circle'+(recJust?" rec":"")+'">'+(recJust?"🏆":"🐍")+'</div>'
      +'<h3 class="sn-card-title">'+esc(t("overTitle"))+'</h3>'
      +'<div class="sn-final">'+g.score+'<small>'+esc(t("scoreLbl"))+'</small></div>'
      +(recJust?'<div class="sn-recbanner">'+esc(t("newRecord"))+'</div>'
               :'<div class="sn-record">'+esc(t("recordLine",{n:best}))+'</div>')
      +'<p class="sn-hint">'+esc(t("histMeta",{s:g.level,l:g.snake.length}))+'</p>'
      +'<button class="sn-bigbtn" data-act="again">'+esc(t("againBtn"))+'</button>'
      +'</div>';
  }

  /* =================== ИСТОРИЯ =================== */
  function renderHistory(){
    if(!root||!E.list) return;
    if(!games.length){ E.list.innerHTML='<div class="sn-empty">'+esc(t("historyEmpty"))+'</div>'; return; }
    E.list.innerHTML=games.slice(0,60).map(function(it){
      var d=dataOf(it);
      return '<div class="sn-row"><div class="when">'+esc(humanDate(d.date))+'<small>'+esc(d.time||"")+'</small></div>'
        +'<div class="mid"><b>'+esc(String(d.score||0))+'</b><small>'+esc(t("histMeta",{s:d.speed||1,l:d.len||0}))+'</small></div>'
        +(d.record?'<span class="sn-badge">'+esc(t("badgeRecord"))+'</span>':"")
        +'</div>';
    }).join("");
  }

  /* =================== СТАТИСТИКА (шторка) =================== */
  function openStats(){
    sdk.events.track("viewed_stats",{});
    var s=stats(), node=document.createElement("div");
    node.innerHTML='<h2>'+esc(t("statsTitle"))+'</h2>'
      +'<div class="sn-pgrid">'
        +'<div class="sn-pstat total"><div class="n">'+s.total+'</div><div class="l">'+esc(t("statTotal"))+'</div></div>'
        +'<div class="sn-pstat best"><div class="n">'+best+'</div><div class="l">'+esc(t("statBest"))+'</div></div>'
        +'<div class="sn-pstat rec"><div class="n">'+s.records+'</div><div class="l">'+esc(t("statRecords"))+'</div></div>'
        +'<div class="sn-pstat len"><div class="n">'+s.maxLen+'</div><div class="l">'+esc(t("statLen"))+'</div></div>'
      +'</div>'
      +'<div class="sheet-actions" style="margin-top:14px"><button class="btn btn-cancel" data-close style="flex:1">'+esc(t("common.close"))+'</button></div>';
    var sh=sdk.ui.sheet(node); curSheet=sh;
    node.querySelector("[data-close]").addEventListener("click",sh.close);
  }

  /* =================== mount / unmount =================== */
  function mount(rootEl, theSdk){
    themeColors(); // токены темы → цвета канваса (см. блок TH выше)
    sdk=theSdk; root=rootEl; E={}; games=[]; best=0; metaId=null; metaLoaded=false;
    mode="idle"; g=null; curSheet=null; saving=false; recJust=false; touchPt=null;
    var sp=sdk.storage.local("speed").get(); speedSel=(sp>=1&&sp<=9)?Math.floor(sp):3;
    var title=sdk.i18n.t("tile.snake");
    var body=sdk.ui.frame({
      titleHtml:'<div class="sn-title">'+esc(title)+'</div><div class="sn-sub">'+esc(t("subtitle"))+'</div>',
      backLabel:t("common.back"),
      actions:[{ icon:"stats", id:"snStats", label:t("aria.stats"), onClick:openStats }]
    }).body;
    body.innerHTML='<div class="sn">'
      +'<div id="snStage"></div>'
      +'<div class="store-section">'+esc(t("historyTitle"))+'</div>'
      +'<div class="sn-list" id="snList"></div>'
    +'</div>';
    E.stage=root.querySelector("#snStage"); E.list=root.querySelector("#snList"); E.sn=root.querySelector(".sn");
    /* делегирование — на внутреннем .sn (пересоздаётся при каждом mount), НЕ на root:
       root живёт между mount'ами, и слушатели на нём наслаивались бы (урок rating/walk) */
    root.querySelector(".sn").addEventListener("click",function(e){
      var dir=e.target.closest("[data-dir]");
      if(dir){ setDir(dir.getAttribute("data-dir")); return; }
      var spd=e.target.closest(".sn-spd");
      if(spd){ speedSel=parseInt(spd.getAttribute("data-spd"),10)||3; sdk.storage.local("speed").set(speedSel);
        if(E.stage){ var all=E.stage.querySelectorAll(".sn-spd"); Array.prototype.forEach.call(all,function(b){ b.classList.toggle("active", parseInt(b.getAttribute("data-spd"),10)===speedSel); }); }
        sdk.ui.haptics(6); return; }
      var act=e.target.closest("[data-act]");
      if(act){
        var a=act.getAttribute("data-act");
        if(a==="start"||a==="again") start();
        else if(a==="pause") setPaused(!(g&&g.paused));
        else if(a==="resume") setPaused(false);
        return;
      }
    });
    /* клавиатура и автопауза при сворачивании — снимаются в unmount (урок walk) */
    E.onKey=function(e){
      var map={ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right"};
      var d=map[e.key];
      if(d&&mode==="play"&&root){ e.preventDefault(); setDir(d); }
    };
    document.addEventListener("keydown",E.onKey);
    E.onVis=function(){ if(document.hidden&&mode==="play"&&g&&!g.paused) setPaused(true); };
    document.addEventListener("visibilitychange",E.onVis);
    renderStage(); renderHistory(); hud();
    Promise.resolve().then(loadMeta).then(reloadGames).then(function(){
      if(!root) return; metaLoaded=true; renderStage(); renderHistory(); hud();
    }).catch(function(){ if(!root) return; metaLoaded=true; renderStage(); renderHistory(); hud(); });
  }
  function unmount(){
    stopLoop();
    if(sdk){ try{ sdk.ui.hud({hidden:false}); }catch(e){} } /* выход посреди партии не оставляет HUD спрятанным */
    if(E.onKey) document.removeEventListener("keydown",E.onKey);
    if(E.onVis) document.removeEventListener("visibilitychange",E.onVis);
    if(curSheet&&curSheet.close){ try{ curSheet.close(); }catch(e){} } curSheet=null;
    E={}; games=[]; root=null; g=null; mode="idle"; best=0; metaId=null; metaLoaded=false; saving=false; recJust=false; touchPt=null;
  }

  RobTop.register({ id:"snake", mount:mount, unmount:unmount, messages:MESSAGES });
})();
