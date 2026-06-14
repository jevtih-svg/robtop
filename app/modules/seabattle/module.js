/* RobTop — модуль «Морской бой». Классика 10×10: против робота (3 уровня), вдвоём на одном
   устройстве (hot-seat) и семейный матч на двух устройствах (familyPool: записи matches/fleets,
   ходы доезжают хуком refresh ~4с). БЕЗ очков (решение Джеффа 2026-06-12); вместо мотивации —
   родительский перерыв между локальными играми (meta.cooldownMin, деф. 1 мин, как в find). */
(function(){
  "use strict";

  /* =================== i18n =================== */
  var MESSAGES={
  en:{ seabattle:{
    subtitle:"Hit or miss?",
    cols:"ABCDEFGHIJ",
    mBot:"Play vs Robot", mBotSub:"the robot hides a secret fleet",
    mHot:"Two players, one device", mHotSub:"pass the phone to each other",
    mFam:"Family match", mFamSub:"each player on their own device",
    famDemo:"The family match works in the server version",
    contTitle:"Current game", cont:"Continue",
    mdBot:"Robot · {d}", mdHot:"Two players", mdFam:"Family match",
    vsLine:"{a} vs {b}",
    diffTitle:"Choose your opponent",
    dEasy:"Cabin Boy", dEasySub:"shoots almost at random",
    dNorm:"Sailor", dNormSub:"hunts in a pattern",
    dHard:"Captain", dHardSub:"calculates every shot",
    placeTitle:"Place your ships", placeFor:"{name}, place your ships",
    random:"🎲 Random", rotate:"↻ Rotate", clear:"Clear", ready:"To battle!",
    left:{one:"{n} ship left",other:"{n} ships left"},
    badSpot:"Ships can't touch", pickShip:"Pick a ship below",
    p1:"Player 1", p2:"Player 2",
    passTo:"Pass the device to {name}", passHint:"No peeking! 🙈", passBtn:"I'm ready!",
    oppWaters:"Enemy waters", myFleet:"Your fleet",
    yourTurn:"Your turn — fire!", oppTurn:"{name} is aiming…", botThinks:"The robot is thinking…",
    fire:"Fire!",
    hit:"Hit! Shoot again", miss:"Miss", sunk:"Sunk! 💥",
    giveUp:"Surrender",
    giveUpBot:"Surrender? It counts as a defeat.",
    giveUpFam:"Surrender? {name} wins.",
    giveUpHot:"End the game without a result?",
    moveHint:"Drag the ship, or tap Rotate",
    setTitle:"Game settings",
    coolTitle:"Break between games",
    coolHint:"How long a child waits before the next robot or two-player game. Family matches are never limited.",
    coolOff:"Off", coolMin:"{n} min",
    coolWait:"Break! Next game in {t}",
    winTitle:"Victory! 🏆", loseTitle:"Defeat", winBy:"{name} wins! 🏆",
    surrTitle:"Surrendered 🏳", oppGaveUp:"The opponent surrendered 🏳",
    encourage:"You almost had it — try again!",
    rScore:"hits", rShots:"shots", rAcc:"accuracy",
    again:"Rematch",
    famWait:"Waiting for an opponent…", famCancel:"Cancel the challenge",
    challenge:"⚔️ {name} challenges you to a sea battle!",
    famAccept:"Accept the challenge", famTaken:"The challenge is already taken",
    famPlaceWait:"{name} is placing ships…", famBusy:"{a} vs {b} — a match is on",
    famYourTurn:"Your turn!", famOppTurn:"{name}'s turn",
    stGames:"games", stWins:"wins",
    histTitle:"Game history", histEmpty:"No battles yet — start one!",
    bWin:"win", bLoss:"loss", bSurr:"gave up",
    loadFailed:"Couldn't load", saveFailed:"Couldn't save, try again"
  }, bank:{ r_seabattle_win:"Sea Battle — victory!", r_seabattle_loss:"Sea Battle — defeat" }},
  ru:{ seabattle:{
    subtitle:"Попал или мимо?",
    cols:"АБВГДЕЖЗИК",
    mBot:"Игра с роботом", mBotSub:"робот прячет секретный флот",
    mHot:"Вдвоём на одном устройстве", mHotSub:"передавайте телефон друг другу",
    mFam:"Семейный матч", mFamSub:"каждый на своём устройстве",
    famDemo:"Семейный матч работает в серверной версии",
    contTitle:"Текущая игра", cont:"Продолжить",
    mdBot:"Робот · {d}", mdHot:"Вдвоём", mdFam:"Семейный матч",
    vsLine:"{a} против {b}",
    diffTitle:"Выбери противника",
    dEasy:"Юнга", dEasySub:"стреляет почти наугад",
    dNorm:"Матрос", dNormSub:"охотится по схеме",
    dHard:"Капитан", dHardSub:"просчитывает каждый выстрел",
    placeTitle:"Расставь свои корабли", placeFor:"{name}, расставь корабли",
    random:"🎲 Случайно", rotate:"↻ Повернуть", clear:"Очистить", ready:"В бой!",
    left:{one:"остался {n} корабль",few:"осталось {n} корабля",many:"осталось {n} кораблей",other:"осталось {n} корабля"},
    badSpot:"Корабли не могут касаться", pickShip:"Выбери корабль внизу",
    p1:"Игрок 1", p2:"Игрок 2",
    passTo:"Передай устройство: {name}", passHint:"Не подглядывать! 🙈", passBtn:"Я готов!",
    oppWaters:"Воды противника", myFleet:"Твой флот",
    yourTurn:"Твой ход — огонь!", oppTurn:"{name} целится…", botThinks:"Робот думает…",
    fire:"Огонь!",
    hit:"Попал! Стреляй ещё", miss:"Мимо", sunk:"Потопил! 💥",
    giveUp:"Сдаться",
    giveUpBot:"Сдаться? Засчитается поражение.",
    giveUpFam:"Сдаться? Победит {name}.",
    giveUpHot:"Закончить игру без результата?",
    moveHint:"Перетащи корабль или жми «Повернуть»",
    setTitle:"Настройки игры",
    coolTitle:"Перерыв между играми",
    coolHint:"Сколько ребёнок ждёт до следующей игры с роботом или вдвоём. Семейные матчи без ограничений.",
    coolOff:"Выкл", coolMin:"{n} мин",
    coolWait:"Перерыв! Следующая игра через {t}",
    winTitle:"Победа! 🏆", loseTitle:"Поражение", winBy:"{name} побеждает! 🏆",
    surrTitle:"Сдался 🏳", oppGaveUp:"Соперник сдался 🏳",
    encourage:"Почти получилось — попробуй ещё раз!",
    rScore:"попаданий", rShots:"выстрелов", rAcc:"точность",
    again:"Реванш",
    famWait:"Ждём соперника…", famCancel:"Отменить вызов",
    challenge:"⚔️ {name} вызывает на морской бой!",
    famAccept:"Принять вызов", famTaken:"Вызов уже принят",
    famPlaceWait:"{name} расставляет корабли…", famBusy:"{a} против {b} — матч уже идёт",
    famYourTurn:"Твой ход!", famOppTurn:"Ход: {name}",
    stGames:"игр", stWins:"побед",
    histTitle:"История игр", histEmpty:"Боёв ещё не было — начни первый!",
    bWin:"победа", bLoss:"поражение", bSurr:"сдался",
    loadFailed:"Не удалось загрузить", saveFailed:"Не получилось сохранить, попробуй ещё раз"
  }, bank:{ r_seabattle_win:"Морской бой — победа!", r_seabattle_loss:"Морской бой — поражение" }},
  lv:{ seabattle:{
    subtitle:"Trāpīji vai garām?",
    cols:"ABCDEFGHIJ",
    mBot:"Spēle pret robotu", mBotSub:"robots paslēpj slepenu floti",
    mHot:"Divatā uz vienas ierīces", mHotSub:"padodiet tālruni viens otram",
    mFam:"Ģimenes mačs", mFamSub:"katrs uz savas ierīces",
    famDemo:"Ģimenes mačs darbojas servera versijā",
    contTitle:"Pašreizējā spēle", cont:"Turpināt",
    mdBot:"Robots · {d}", mdHot:"Divatā", mdFam:"Ģimenes mačs",
    vsLine:"{a} pret {b}",
    diffTitle:"Izvēlies pretinieku",
    dEasy:"Junga", dEasySub:"šauj gandrīz uz labu laimi",
    dNorm:"Matrozis", dNormSub:"medī pēc shēmas",
    dHard:"Kapteinis", dHardSub:"aprēķina katru šāvienu",
    placeTitle:"Izvieto savus kuģus", placeFor:"{name}, izvieto kuģus",
    random:"🎲 Nejauši", rotate:"↻ Pagriezt", clear:"Notīrīt", ready:"Kaujā!",
    left:{zero:"atlikuši {n} kuģi",one:"atlicis {n} kuģis",other:"atlikuši {n} kuģi"},
    badSpot:"Kuģi nedrīkst saskarties", pickShip:"Izvēlies kuģi zemāk",
    p1:"1. spēlētājs", p2:"2. spēlētājs",
    passTo:"Padod ierīci: {name}", passHint:"Nelūrēt! 🙈", passBtn:"Esmu gatavs!",
    oppWaters:"Pretinieka ūdeņi", myFleet:"Tava flote",
    yourTurn:"Tavs gājiens — uguni!", oppTurn:"{name} mērķē…", botThinks:"Robots domā…",
    fire:"Uguni!",
    hit:"Trāpīts! Šauj vēlreiz", miss:"Garām", sunk:"Nogremdēts! 💥",
    giveUp:"Padoties",
    giveUpBot:"Padoties? Tiks ieskaitīts zaudējums.",
    giveUpFam:"Padoties? Uzvarēs {name}.",
    giveUpHot:"Beigt spēli bez rezultāta?",
    moveHint:"Velc kuģi vai spied “Pagriezt”",
    setTitle:"Spēles iestatījumi",
    coolTitle:"Pauze starp spēlēm",
    coolHint:"Cik ilgi bērns gaida līdz nākamajai spēlei ar robotu vai divatā. Ģimenes mačiem ierobežojuma nav.",
    coolOff:"Izslēgts", coolMin:"{n} min",
    coolWait:"Pauze! Nākamā spēle pēc {t}",
    winTitle:"Uzvara! 🏆", loseTitle:"Zaudējums", winBy:"{name} uzvar! 🏆",
    surrTitle:"Padevās 🏳", oppGaveUp:"Pretinieks padevās 🏳",
    encourage:"Gandrīz izdevās — mēģini vēlreiz!",
    rScore:"trāpījumi", rShots:"šāvieni", rAcc:"precizitāte",
    again:"Revanšs",
    famWait:"Gaidām pretinieku…", famCancel:"Atcelt izaicinājumu",
    challenge:"⚔️ {name} izaicina uz jūras kauju!",
    famAccept:"Pieņemt izaicinājumu", famTaken:"Izaicinājums jau pieņemts",
    famPlaceWait:"{name} izvieto kuģus…", famBusy:"{a} pret {b} — mačs jau notiek",
    famYourTurn:"Tavs gājiens!", famOppTurn:"Gājiens: {name}",
    stGames:"spēles", stWins:"uzvaras",
    histTitle:"Spēļu vēsture", histEmpty:"Kauju vēl nav — sāc pirmo!",
    bWin:"uzvara", bLoss:"zaudējums", bSurr:"padevās",
    loadFailed:"Neizdevās ielādēt", saveFailed:"Neizdevās saglabāt, mēģini vēlreiz"
  }, bank:{ r_seabattle_win:"Jūras kauja — uzvara!", r_seabattle_loss:"Jūras kauja — zaudējums" }},
  de:{ seabattle:{
    subtitle:"Treffer oder daneben?",
    cols:"ABCDEFGHIJ",
    mBot:"Gegen Roboter spielen", mBotSub:"der Roboter versteckt eine geheime Flotte",
    mHot:"Zwei Spieler, ein Geraet", mHotSub:"gebt das Handy weiter",
    mFam:"Familienmatch", mFamSub:"jeder auf dem eigenen Geraet",
    famDemo:"Das Familienmatch funktioniert in der Server-Version",
    contTitle:"Aktuelles Spiel", cont:"Fortsetzen",
    mdBot:"Roboter · {d}", mdHot:"Zwei Spieler", mdFam:"Familienmatch",
    vsLine:"{a} gegen {b}",
    diffTitle:"Waehle deinen Gegner",
    dEasy:"Schiffsjunge", dEasySub:"schiesst fast zufaellig",
    dNorm:"Matrose", dNormSub:"jagt nach Muster",
    dHard:"Kapitän", dHardSub:"berechnet jeden Schuss",
    placeTitle:"Platziere deine Schiffe", placeFor:"{name}, platziere deine Schiffe",
    random:"🎲 Zufall", rotate:"↻ Drehen", clear:"Leeren", ready:"In die Schlacht!",
    left:{one:"{n} Schiff uebrig",other:"{n} Schiffe uebrig"},
    badSpot:"Schiffe duerfen sich nicht beruehren", pickShip:"Waehle unten ein Schiff",
    p1:"Spieler 1", p2:"Spieler 2",
    passTo:"Gib das Geraet an {name}", passHint:"Nicht schummeln! 🙈", passBtn:"Ich bin bereit!",
    oppWaters:"Feindliche Gewaesser", myFleet:"Deine Flotte",
    yourTurn:"Du bist dran — Feuer!", oppTurn:"{name} zielt…", botThinks:"Der Roboter denkt nach…",
    fire:"Feuer!", aimHint:"Tippe ein Feld, dann — Feuer!",
    hit:"Treffer! Nochmal schiessen", miss:"Daneben", sunk:"Versenkt! 💥",
    giveUp:"Aufgeben",
    giveUpBot:"Aufgeben? Das zaehlt als Niederlage (−5).",
    giveUpFam:"Aufgeben? {name} gewinnt.",
    giveUpHot:"Spiel ohne Ergebnis beenden?",
    winTitle:"Sieg! 🏆", loseTitle:"Niederlage", winBy:"{name} gewinnt! 🏆",
    encourage:"Fast geschafft — versuch es nochmal!",
    rScore:"Treffer", rShots:"Schuesse", rAcc:"Genauigkeit",
    again:"Revanche",
    famWait:"Warte auf Gegner…", famCancel:"Herausforderung abbrechen",
    challenge:"⚔️ {name} fordert dich zu Schiffe versenken heraus!",
    famAccept:"Herausforderung annehmen", famTaken:"Die Herausforderung ist schon angenommen",
    famPlaceWait:"{name} platziert Schiffe…", famBusy:"{a} gegen {b} — Match laeuft",
    famYourTurn:"Du bist dran!", famOppTurn:"{name} ist dran",
    statsTitle:"Meine Statistik", stGames:"Spiele", stWins:"Siege", stAcc:"Genauigkeit",
    histTitle:"Spielverlauf", histEmpty:"Noch keine Gefechte — starte eins!",
    bWin:"Sieg", bLoss:"Niederlage",
    loadFailed:"Konnte nicht geladen werden", saveFailed:"Konnte nicht gespeichert werden, versuch es nochmal"
  }, bank:{ r_seabattle_win:"Schiffe versenken — Sieg!", r_seabattle_loss:"Schiffe versenken — Niederlage" }}
  };

  /* =================== движок (чистые функции, без DOM) =================== */
  var N=10, CELLS=N*N, FLEET=[4,3,3,2,2,2,1,1,1,1], DECKS=20;
  var SIZES=[4,3,2,1], FLEET_CNT={};
  (function(){ for(var i=0;i<FLEET.length;i++) FLEET_CNT[FLEET[i]]=(FLEET_CNT[FLEET[i]]||0)+1; })();

  function xOf(i){ return i%N; }
  function yOf(i){ return Math.floor(i/N); }
  function inB(x,y){ return x>=0&&x<N&&y>=0&&y<N; }
  function cellsAt(x,y,len,h){
    var c=[],k,xx,yy;
    for(k=0;k<len;k++){ xx=x+(h?k:0); yy=y+(h?0:k); if(!inB(xx,yy)) return null; c.push(yy*N+xx); }
    return c;
  }
  function gridOf(ships){
    var g=[],i,s,c; for(i=0;i<CELLS;i++) g.push(-1);
    for(s=0;s<ships.length;s++) for(c=0;c<ships[s].cells.length;c++) g[ships[s].cells[c]]=s;
    return g;
  }
  /* можно ли поставить cells на доску grid (бортики 1 клетку, включая диагонали) */
  function canPlace(grid,cells){
    var k,i,x,y,dx,dy,nx,ny;
    for(k=0;k<cells.length;k++){
      i=cells[k]; x=xOf(i); y=yOf(i);
      for(dx=-1;dx<=1;dx++) for(dy=-1;dy<=1;dy++){
        nx=x+dx; ny=y+dy;
        if(inB(nx,ny)&&grid[ny*N+nx]>=0) return false;
      }
    }
    return true;
  }
  function randomFleet(){
    var tries,ships,grid,f,len,ok,att,h,x,y,c,k;
    for(tries=0;tries<60;tries++){
      ships=[]; grid=gridOf([]); ok=true;
      for(f=0;f<FLEET.length&&ok;f++){
        len=FLEET[f]; ok=false;
        for(att=0;att<200;att++){
          h=Math.random()<0.5;
          x=Math.floor(Math.random()*(h?(N-len+1):N));
          y=Math.floor(Math.random()*(h?N:(N-len+1)));
          c=cellsAt(x,y,len,h);
          if(c&&canPlace(grid,c)){
            ships.push({cells:c});
            for(k=0;k<c.length;k++) grid[c[k]]=ships.length-1;
            ok=true; break;
          }
        }
      }
      if(ok) return ships;
    }
    return null; /* практически недостижимо */
  }
  function validFleet(ships){
    if(!ships||ships.length!==FLEET.length) return false;
    var sizes=[],i,s,c,grid=gridOf([]),x,y,hor,ver;
    for(i=0;i<ships.length;i++){
      s=ships[i]; if(!s||!s.cells||!s.cells.length) return false;
      var cs=s.cells.slice().sort(function(a,b){return a-b;});
      hor=true; ver=true;
      for(c=0;c<cs.length;c++){
        if(typeof cs[c]!=="number"||cs[c]<0||cs[c]>=CELLS||cs[c]!==Math.floor(cs[c])) return false;
        if(c>0){
          if(cs[c]!==cs[c-1]+1||yOf(cs[c])!==yOf(cs[0])) hor=false;
          if(cs[c]!==cs[c-1]+N) ver=false;
        }
      }
      if(cs.length>1&&!hor&&!ver) return false;
      if(!canPlace(grid,cs)) return false;
      for(c=0;c<cs.length;c++) grid[cs[c]]=i;
      sizes.push(cs.length);
    }
    sizes.sort(function(a,b){return b-a;});
    for(i=0;i<FLEET.length;i++) if(sizes[i]!==FLEET[i]) return false;
    return true;
  }
  /* выстрел по клетке i. shots — Set уже обстрелянных. Возврат {r, cells[, ship]}:
     cells — что добавить в обстрел (при потоплении — корабль обведён «промахами» автоматически) */
  function shoot(ships,grid,shots,i){
    if(i<0||i>=CELLS||shots.has(i)) return null;
    var s=grid[i];
    if(s<0) return { r:"miss", cells:[i] };
    var sc=ships[s].cells, sunk=true, k;
    for(k=0;k<sc.length;k++) if(sc[k]!==i&&!shots.has(sc[k])) sunk=false;
    if(!sunk) return { r:"hit", cells:[i], ship:s };
    var out=[i], seen={}, x,y,dx,dy,nx,ny,ni;
    seen[i]=1;
    for(k=0;k<sc.length;k++){
      x=xOf(sc[k]); y=yOf(sc[k]);
      for(dx=-1;dx<=1;dx++) for(dy=-1;dy<=1;dy++){
        nx=x+dx; ny=y+dy; if(!inB(nx,ny)) continue;
        ni=ny*N+nx;
        if(!seen[ni]&&!shots.has(ni)&&grid[ni]<0){ seen[ni]=1; out.push(ni); }
      }
    }
    return { r:"sunk", cells:out, ship:s };
  }
  function hitCount(grid,shots){
    var n=0; shots.forEach(function(i){ if(grid[i]>=0) n++; }); return n;
  }
  function shipAlive(ship,shots){
    for(var k=0;k<ship.cells.length;k++) if(!shots.has(ship.cells[k])) return true;
    return false;
  }
  function aliveSizes(ships,shots){
    var out=[],i; for(i=0;i<ships.length;i++) if(shipAlive(ships[i],shots)) out.push(ships[i].cells.length);
    return out;
  }
  /* ---- ИИ робота. level: easy|normal|hard ---- */
  function botShot(level,ships,grid,shots){
    var i,k,wounded=null;
    for(i=0;i<ships.length;i++){
      var hitC=[],all=true;
      for(k=0;k<ships[i].cells.length;k++){
        if(shots.has(ships[i].cells[k])) hitC.push(ships[i].cells[k]); else all=false;
      }
      if(hitC.length&&!all){ wounded=hitC; break; }
    }
    if(wounded&&!(level==="easy"&&Math.random()<0.35)){
      var cand=[];
      if(wounded.length>=2){
        wounded.sort(function(a,b){return a-b;});
        var horiz=yOf(wounded[0])===yOf(wounded[wounded.length-1]);
        var lo=wounded[0],hi=wounded[wounded.length-1],step=horiz?1:N;
        var before=lo-step, after=hi+step;
        if(before>=0&&(!horiz||yOf(before)===yOf(lo))&&!shots.has(before)) cand.push(before);
        if(after<CELLS&&(!horiz||yOf(after)===yOf(hi))&&!shots.has(after)) cand.push(after);
      } else {
        var x=xOf(wounded[0]),y=yOf(wounded[0]);
        if(x>0&&!shots.has(wounded[0]-1)) cand.push(wounded[0]-1);
        if(x<N-1&&!shots.has(wounded[0]+1)) cand.push(wounded[0]+1);
        if(y>0&&!shots.has(wounded[0]-N)) cand.push(wounded[0]-N);
        if(y<N-1&&!shots.has(wounded[0]+N)) cand.push(wounded[0]+N);
      }
      if(cand.length) return cand[Math.floor(Math.random()*cand.length)];
    }
    var open=[],sizes=aliveSizes(ships,shots),hasBig=false;
    for(k=0;k<sizes.length;k++) if(sizes[k]>=2) hasBig=true;
    for(i=0;i<CELLS;i++) if(!shots.has(i)) open.push(i);
    if(!open.length) return -1;
    if(level==="easy") return open[Math.floor(Math.random()*open.length)];
    if(level==="normal"){
      var par=[];
      for(k=0;k<open.length;k++) if((xOf(open[k])+yOf(open[k]))%2===0) par.push(open[k]);
      var pool=(hasBig&&par.length)?par:open;
      return pool[Math.floor(Math.random()*pool.length)];
    }
    /* hard: плотность размещений живых кораблей */
    var score=[],best=-1,bi=[];
    for(i=0;i<CELLS;i++) score.push(0);
    for(k=0;k<sizes.length;k++){
      var L=sizes[k],x0,y0,c,j,fit;
      for(y0=0;y0<N;y0++) for(x0=0;x0<=N-L;x0++){
        fit=true; for(j=0;j<L;j++) if(shots.has(y0*N+x0+j)){ fit=false; break; }
        if(fit) for(j=0;j<L;j++) score[y0*N+x0+j]++;
      }
      if(L>1) for(x0=0;x0<N;x0++) for(y0=0;y0<=N-L;y0++){
        fit=true; for(j=0;j<L;j++) if(shots.has((y0+j)*N+x0)){ fit=false; break; }
        if(fit) for(j=0;j<L;j++) score[(y0+j)*N+x0]++;
      }
    }
    for(k=0;k<open.length;k++){
      i=open[k];
      if(score[i]>best){ best=score[i]; bi=[i]; }
      else if(score[i]===best) bi.push(i);
    }
    return bi[Math.floor(Math.random()*bi.length)];
  }
  var Eng={ N:N, FLEET:FLEET, DECKS:DECKS, cellsAt:cellsAt, gridOf:gridOf, canPlace:canPlace,
    randomFleet:randomFleet, validFleet:validFleet, shoot:shoot, hitCount:hitCount,
    aliveSizes:aliveSizes, botShot:botShot };

  /* =================== звук (ленивый WebAudio-синглтон, как chime ядра) =================== */
  var actx=null;
  function tone(freq,freq2,dur,type,vol,at){
    var o=actx.createOscillator(),gn=actx.createGain(),t0=actx.currentTime+(at||0);
    o.type=type; o.frequency.setValueAtTime(freq,t0);
    if(freq2) o.frequency.exponentialRampToValueAtTime(freq2,t0+dur);
    gn.gain.setValueAtTime(0,t0);
    gn.gain.linearRampToValueAtTime(vol,t0+0.015);
    gn.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    o.connect(gn); gn.connect(actx.destination); o.start(t0); o.stop(t0+dur+0.05);
  }
  function sfx(kind){
    try{
      var AC=window.AudioContext||window.webkitAudioContext; if(!AC) return;
      actx=actx||new AC(); if(actx.state==="suspended") actx.resume();
      if(kind==="fire") tone(620,180,0.1,"square",0.05);
      else if(kind==="miss") tone(290,120,0.18,"sine",0.07);
      else if(kind==="hit") tone(130,55,0.26,"sawtooth",0.12);
      else if(kind==="sunk"){ tone(220,90,0.22,"sawtooth",0.12); tone(165,70,0.22,"sawtooth",0.1,0.12); tone(110,50,0.3,"sawtooth",0.09,0.24); }
    }catch(e){}
  }

  /* =================== состояние =================== */
  var sdk=null, root=null, alive=false;
  var view="home";        /* home | diff | place | pass | battle | result */
  var ctx="local";        /* local (бот/hot-seat) | fam */
  var g=null;             /* локальная игра {mode,diff,phase,pf,ships,shots,turn,...} */
  var P=null;             /* расстановка {ships,sel,horiz,forSlot} */
  var F={ rec:null, st:null, my:-1, fleets:[null,null], finished:[] };
  var hist=[], histLoaded=false;
  var aim=-1, botTimer=null, saving=false, curSheet=null, lastRes=null;
  var famPrev=null;       /* {id,status,turn} для детекта переходов на refresh */
  var lastFp=null;        /* отпечаток последнего рендера: refresh не перерисовывает без изменений */
  var statsCache=null;
  var META={ id:null, cooldownMin:null }; /* настройка родителя: перерыв между локальными играми */
  var PD=null;            /* drag-состояние расстановки {idx,grabK,x,y,moved} */
  var OPP_FLASH=null;     /* {cells,ts} — куда только что выстрелил соперник (кольцо на моей доске) */
  var oppSeen={ id:null, n:0 }; /* сколько выстрелов соперника уже показано (семейный матч) */

  function esc(s){ return RobTop.util.esc(s); }
  function t(k,p){ return sdk.t(k,p); }
  function pad2(n){ return RobTop.util.pad2(n); }
  function todayStr(){ var d=new Date(); return d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate()); }
  function nowHM(){ var d=new Date(); return pad2(d.getHours())+":"+pad2(d.getMinutes()); }
  function humanDate(s){ try{ var p=String(s).split("-"); return sdk.formatDate(new Date(+p[0],+p[1]-1,+p[2])); }catch(e){ return s||""; } }
  function myUid(){ return String((sdk.user&&sdk.user.id)||""); }
  function myName(){ return (sdk.user&&sdk.user.name)||""; }
  function diffLabel(d){ return t(d==="easy"?"dEasy":(d==="hard"?"dHard":"dNorm")); }
  function isChild(){ return sdk.role==="child"; }
  function track(type,payload){ if(isChild()) sdk.events.track(type,payload||{}); }
  function setToSet(arr){ var s=new Set(); (arr||[]).forEach(function(i){ s.add(i); }); return s; }

  /* локальное сохранение игры с ботом/hot-seat (резюме после закрытия) */
  function saveLocal(){
    try{ sdk.storage.local("game").set(g&&g.phase!=="over"?g:null); }catch(e){}
  }
  function loadLocal(){
    var v=sdk.storage.local("game").get();
    if(v&&v.mode&&v.phase&&v.phase!=="over"&&v.ships&&v.shots) return v;
    return null;
  }

  /* =================== данные =================== */
  function loadFam(){
    return Promise.all([sdk.data.list("matches"), sdk.data.list("fleets")]).then(function(rs){
      var ms=rs[0]||[], fs=rs[1]||[];
      var prevId=F.rec?String(F.rec.id):null;
      F.rec=null; F.st=null; F.my=-1; F.fleets=[null,null]; F.finished=[];
      var i,d,doneRec=null;
      for(i=0;i<ms.length;i++){
        d=ms[i].data||{};
        if(d.mode!=="family"||!d.st) continue;
        if(d.st.status==="finished"){
          F.finished.push(ms[i]);
          if(!doneRec) doneRec=ms[i]; /* list отдаёт новые сверху: первый = свежайший */
        }
        else if(!F.rec&&(d.st.status==="open"||d.st.status==="placing"||d.st.status==="battle")) F.rec=ms[i];
      }
      /* активного нет — держим свежайший завершённый: на нём живут клейм победы по сдаче
         соперника (famClaimIfNeeded) и экран поражения (переход ловит famApply) */
      if(!F.rec&&doneRec) F.rec=doneRec;
      if(F.rec){
        d=F.rec.data;
        if(d.p0&&String(d.p0.uid)===myUid()) F.my=0;
        else if(d.p1&&String(d.p1.uid)===myUid()) F.my=1;
        F.st=d.st;
        for(i=0;i<fs.length;i++){
          var fd=fs[i].data||{};
          if(String(fd.matchId)!==String(F.rec.id)||(fd.slot!==0&&fd.slot!==1)) continue;
          /* гонка двойного принятия может оставить «призрачный» флот чужого участника —
             берём только флот, чей uid совпадает с игроком матча в этом слоте */
          var pp=fd.slot===0?d.p0:d.p1;
          if(!pp||String(pp.uid)!==String(fd.uid)) continue;
          if(!F.fleets[fd.slot]) F.fleets[fd.slot]=fs[i];
        }
      }
      if(!F.rec||String(F.rec.id)!==prevId) F.lastR=null;
    }).catch(function(){});
  }
  function loadHist(){
    return sdk.data.list("history").then(function(items){
      hist=(items||[]).slice().sort(function(a,b){ return (b.createdAt||0)-(a.createdAt||0); });
      histLoaded=true;
    }).catch(function(){ histLoaded=true; });
  }
  function loadMeta(){
    return sdk.data.list("meta").then(function(items){
      if(items&&items.length){ META.id=items[0].id; META.cooldownMin=(items[0].data||{}).cooldownMin; }
    }).catch(function(){});
  }
  /* перерыв между локальными играми (бот/hot-seat): только для ребёнка, семья не ограничена */
  function coolMs(){ var m=META.cooldownMin; if(m==null) m=1; return Math.max(0,+m||0)*60000; }
  function coolLeft(){
    if(!isChild()||!coolMs()) return 0;
    var le=+(sdk.storage.local("lastEnd").get()||0);
    var r=le+coolMs()-Date.now();
    return r>0?r:0;
  }
  function coolFmt(ms){
    var s=Math.ceil(ms/1000), m=Math.floor(s/60);
    return (m>0?m+":":"0:")+pad2(s%60);
  }
  function coolGate(){
    var r=coolLeft();
    if(!r) return false;
    sdk.ui.haptics(10);
    sdk.ui.toast(t("coolWait",{t:coolFmt(r)}));
    return true;
  }

  /* =================== очки/итоги =================== */
  function accOf(shots,hits){ return shots?Math.round(hits*100/shots):0; }
  function saveHistory(rec){
    sdk.data.create("history",rec).then(function(it){
      if(!alive) return;
      if(it) hist.unshift(it); else return loadHist();
    }).then(function(){ if(alive&&view==="home") render(); })
      .catch(function(){ if(alive) sdk.ui.toast(t("saveFailed")); });
  }
  function flashOpp(cells){ OPP_FLASH={ cells:(cells||[]).slice(), ts:Date.now() }; }
  function celebrate(won){
    if(won){ sdk.ui.confetti(); sdk.ui.chime(); sdk.ui.haptics([20,30,60]); }
    else sdk.ui.haptics([10,30,10]);
  }

  /* =================== локальная игра (бот / hot-seat) =================== */
  function newLocal(mode,diff){
    g={ mode:mode, diff:diff||null, phase:"place", pf:0,
        ships:[null,null], shots:[[],[]], turn:0,
        msg:"", startMs:Date.now(), shotN:[0,0], winner:null, result:null, passNext:null };
    P={ ships:[], sel:null, horiz:true };
    ctx="local"; view="place"; aim=-1;
    track("battle_started",{mode:mode==="hot"?"hotseat":mode,diff:diff||""});
    saveLocal(); render();
  }
  function placeDone(){
    if(P.ships.length!==FLEET.length) return;
    g.ships[g.pf]=P.ships;
    if(g.mode==="bot"){
      g.ships[1]=randomFleet();
      g.phase="battle"; g.turn=0; view="battle";
    } else if(g.pf===0){
      g.pf=1; g.phase="pass"; g.passNext="place"; view="pass";
    } else {
      g.phase="pass"; g.passNext="battle"; g.turn=0; view="pass";
    }
    P=null; saveLocal(); render();
  }
  function passReady(){
    if(g.passNext==="place"){ P={ships:[],sel:null,horiz:true}; g.phase="place"; view="place"; }
    else { g.phase="battle"; view="battle"; }
    g.passNext=null; aim=-1; saveLocal(); render();
  }
  function viewerIdx(){ return g.mode==="hot"?g.turn:0; }
  function localName(idx){
    if(g.mode==="bot") return idx===0?(myName()||t("p1")):diffLabel(g.diff);
    return t(idx===0?"p1":"p2");
  }
  function localFire(i){
    if(!g||g.phase!=="battle") return;
    var v=viewerIdx();
    if(g.mode==="bot"&&g.turn!==0) return;
    var grid=gridOf(g.ships[1-v]), shots=setToSet(g.shots[v]);
    var res=shoot(g.ships[1-v],grid,shots,i);
    if(!res) return;
    g.shots[v]=g.shots[v].concat(res.cells);
    g.shotN[v]++;
    aim=-1; sfx(res.r); sdk.ui.haptics(res.r==="miss"?8:(res.r==="hit"?[15,20]:[20,30,40]));
    g.msg=res.r;
    var hits=hitCount(grid,setToSet(g.shots[v]));
    if(hits>=DECKS){ finishLocal(v); return; }
    if(res.r==="miss"){
      if(g.mode==="bot"){ g.turn=1; saveLocal(); render(); botPlay(); return; }
      g.turn=1-v; g.phase="pass"; g.passNext="battle"; saveLocal(); render(); return;
    }
    saveLocal(); render();
  }
  function botPlay(){
    if(!alive||!g||g.phase!=="battle"||g.turn!==1) return;
    botTimer=setTimeout(function(){
      botTimer=null;
      if(!alive||!g||g.phase!=="battle"||g.turn!==1) return;
      /* игрок ушёл с экрана боя — бот ждёт; resumeLocal перезапустит цепочку */
      if(view!=="battle"||ctx!=="local") return;
      var grid=gridOf(g.ships[0]), shots=setToSet(g.shots[1]);
      var i=botShot(g.diff||"normal",g.ships[0],grid,shots);
      if(i<0){ g.turn=0; saveLocal(); render(); return; }
      var res=shoot(g.ships[0],grid,shots,i);
      if(!res){ g.turn=0; saveLocal(); render(); return; }
      g.shots[1]=g.shots[1].concat(res.cells);
      g.shotN[1]++;
      flashOpp([i]); /* показать, КУДА выстрелил робот (фидбек Джеффа 2026-06-12) */
      sfx(res.r);
      var hits=hitCount(grid,setToSet(g.shots[1]));
      if(hits>=DECKS){ finishLocal(1); return; }
      if(res.r==="miss"){ g.turn=0; saveLocal(); render(); return; }
      saveLocal(); render(); botPlay();
    },700+Math.floor(Math.random()*500));
  }
  function finishLocal(winnerIdx,surrender){
    if(botTimer){ clearTimeout(botTimer); botTimer=null; }
    g.phase="over"; g.winner=winnerIdx; g.result=surrender?"surrender":"win";
    var grid0=gridOf(g.ships[0]), grid1=gridOf(g.ships[1]);
    var myHits=hitCount(grid1,setToSet(g.shots[0]));
    var oppHits=hitCount(grid0,setToSet(g.shots[1]));
    var durSec=Math.round((Date.now()-g.startMs)/1000);
    lastRes={ mode:g.mode, diff:g.diff, winner:winnerIdx, surr:!!surrender,
      score:[myHits,oppHits], shots:g.shotN.slice(), names:[localName(0),localName(1)] };
    try{ sdk.storage.local("lastEnd").set(Date.now()); }catch(e){} /* старт перерыва */
    if(g.mode==="bot"){
      var won=winnerIdx===0;
      lastRes.acc=accOf(g.shotN[0],myHits);
      track("battle_finished",{mode:"bot",diff:g.diff||"",result:won?"win":"loss",
        shots:g.shotN[0],acc:lastRes.acc,durSec:durSec,by:myName()});
      saveHistory({ mode:"bot", diff:g.diff||"", result:won?"win":"loss", surr:surrender?1:0,
        score:[myHits,oppHits], shots:g.shotN[0], acc:lastRes.acc,
        author:myName(), authorUid:sdk.user&&sdk.user.id, date:todayStr(), time:nowHM() });
      celebrate(won);
    } else {
      /* без result: стороны hot-seat не проверяемы, в статистику побед родителя не считается */
      track("battle_finished",{mode:"hotseat",shots:g.shotN[0]+g.shotN[1],durSec:durSec,by:myName()});
      saveHistory({ mode:"hot", winnerNo:winnerIdx+1,
        score:winnerIdx===0?[myHits,oppHits]:[oppHits,myHits], shots:g.shotN[0]+g.shotN[1],
        author:myName(), authorUid:sdk.user&&sdk.user.id, date:todayStr(), time:nowHM() });
      celebrate(true);
    }
    g=null; saveLocal();
    ctx="local"; view="result"; render();
  }
  function localSurrender(){
    if(!g) return;
    if(g.mode==="bot"){
      sdk.ui.confirm({title:t("giveUp"),text:t("giveUpBot"),ok:t("common.yes")}).then(function(ok){
        if(ok&&g) finishLocal(1,true);
      });
    } else {
      sdk.ui.confirm({title:t("giveUp"),text:t("giveUpHot"),ok:t("common.yes")}).then(function(ok){
        if(!ok||!g) return;
        if(botTimer){ clearTimeout(botTimer); botTimer=null; }
        g=null; P=null; saveLocal(); goHome();
      });
    }
  }

  /* =================== семейный матч =================== */
  function famNames(){
    var d=F.rec?F.rec.data:{};
    return [ d.p0?d.p0.name:"", d.p1?d.p1.name:"" ];
  }
  function famScore(){
    if(!F.st||!F.fleets[0]||!F.fleets[1]) return [0,0];
    var g0=gridOf(F.fleets[0].data.ships), g1=gridOf(F.fleets[1].data.ships);
    return [ hitCount(g1,setToSet(F.st.shots&&F.st.shots[0])), hitCount(g0,setToSet(F.st.shots&&F.st.shots[1])) ];
  }
  function famCreate(){
    if(sdk.isDemo()){ sdk.ui.toast(t("famDemo")); return; }
    if(F.rec&&F.st&&F.st.status!=="finished"){ openFam(); return; }
    if(saving) return; saving=true;
    sdk.data.create("matches",{ mode:"family", v:1,
      author:myName(), authorUid:sdk.user&&sdk.user.id,
      p0:{uid:sdk.user&&sdk.user.id,name:myName()}, p1:null,
      st:{status:"open"}, date:todayStr(), time:nowHM()
    }).then(function(it){
      saving=false; if(!alive) return;
      if(!it){ sdk.ui.toast(t("saveFailed")); return; }
      sdk.notify.send("family","challenge",{ params:{name:myName()}, link:{module:"seabattle"} });
      track("battle_challenge",{action:"sent"});
      return loadFam().then(function(){ if(alive) render(); });
    }).catch(function(){ saving=false; if(alive) sdk.ui.toast(t("saveFailed")); });
  }
  /* отмена: открытый вызов — только создатель; зависшая расстановка — любой участник
     (иначе пропавший соперник навсегда блокирует «один матч на семью») */
  function famCancel(){
    if(!F.rec) return;
    var st=F.st&&F.st.status;
    if(!((st==="open"&&F.my===0)||(st==="placing"&&F.my>=0))) return;
    sdk.ui.confirm({title:t("famCancel"),text:""}).then(function(ok){
      if(!ok||!F.rec) return;
      sdk.data.remove("matches",F.rec.id).then(function(){
        track("battle_challenge",{action:"cancelled"});
        return loadFam();
      }).then(function(){ if(alive) render(); }).catch(function(){ if(alive) sdk.ui.toast(t("saveFailed")); });
    });
  }
  function famAccept(){
    if(!F.rec||saving) return; saving=true;
    /* перечитать перед записью: вызов мог уже принять другой член семьи */
    loadFam().then(function(){
      if(!F.rec||F.st.status!=="open"||F.rec.data.p1){ saving=false; sdk.ui.toast(t("famTaken")); if(alive) render(); return; }
      if(F.my===0){ saving=false; return; }
      return sdk.data.update("matches",F.rec.id,{
        p1:{uid:sdk.user&&sdk.user.id,name:myName()}, st:{status:"placing"}
      }).then(function(){
        saving=false; if(!alive) return;
        sdk.notify.send("family","accepted",{ params:{name:myName()}, link:{module:"seabattle"} });
        track("battle_challenge",{action:"accepted"});
        return loadFam().then(function(){ if(alive) openFam(); });
      });
    }).catch(function(){ saving=false; if(alive) sdk.ui.toast(t("saveFailed")); });
  }
  /* открыть активный семейный матч на нужном экране */
  function openFam(){
    if(!F.rec){ goHome(); return; }
    ctx="fam"; aim=-1;
    var st=F.st.status;
    if(st==="open"){ view="home"; render(); return; }
    if(st==="placing"){
      /* не затирать незавершённую расстановку (deep-link из оповещения зовёт openFam повторно) */
      if(F.my>=0&&!F.fleets[F.my]){ if(!P||!P.fam) P={ships:[],sel:null,horiz:true,fam:true}; view="place"; }
      else view="home";
      render(); return;
    }
    if(st==="battle"){
      view=F.my>=0?"battle":"home";
      if(F.my>=0){ oppSeen={ id:String(F.rec.id), n:((F.st.shots&&F.st.shots[1-F.my])||[]).length }; }
      render(); return;
    }
    view="home"; render();
  }
  function famPlaceDone(){
    if(!F.rec||F.my<0||!F.st||F.st.status!=="placing"||P.ships.length!==FLEET.length||saving) return;
    saving=true;
    var ships=P.ships;
    sdk.data.create("fleets",{ matchId:F.rec.id, slot:F.my,
      uid:sdk.user&&sdk.user.id, name:myName(), ships:ships
    }).then(function(it){
      saving=false; if(!alive) return;
      if(!it){ sdk.ui.toast(t("saveFailed")); return; }
      F.fleets[F.my]=it; P=null;
      return famMaybeStart().then(function(){ if(alive) openFam(); });
    }).catch(function(){ saving=false; if(alive) sdk.ui.toast(t("saveFailed")); });
  }
  /* Инварианты протокола (LWW-стор без блокировок, см. журнал КОНТЕКСТ.md):
     1) первым всегда ходит p0 (turn:0) — p1 не выстрелит раньше, чем увидит battle;
     2) st патчится ТОЛЬКО целиком верхним ключом и только тем, чей ход;
     3) одновременную сдачу флотов чинит фолбэк в famApply, пишет его только p0. */
  function famMaybeStart(){
    if(!F.rec||!F.fleets[0]||!F.fleets[1]||!F.st||F.st.status!=="placing") return Promise.resolve();
    var prevSt=F.st;
    var st={status:"battle",turn:0,shots:[[],[]],n:[0,0]};
    F.st=st; famPrev={id:String(F.rec.id),status:"battle",turn:0};
    if(isChild()) track("battle_started",{mode:"family"});
    return sdk.data.update("matches",F.rec.id,{st:st}).catch(function(){
      /* запись не прошла — откатить локальный статус, иначе игрок зависнет в «бою» без хода */
      F.st=prevSt; famPrev={id:String(F.rec.id),status:prevSt.status,turn:prevSt.turn||0};
      if(alive){ sdk.ui.toast(t("saveFailed")); renderIfChanged(); }
    });
  }
  function famFire(i){
    if(!F.rec||F.my<0||!F.st||F.st.status!=="battle"||F.st.turn!==F.my||saving) return;
    if(!F.fleets[0]||!F.fleets[1]) return;
    var opp=F.fleets[1-F.my].data.ships;
    var grid=gridOf(opp), shots=setToSet(F.st.shots[F.my]);
    var res=shoot(opp,grid,shots,i);
    if(!res) return;
    var st={ status:"battle", turn:F.st.turn,
      shots:[(F.st.shots[0]||[]).slice(),(F.st.shots[1]||[]).slice()],
      n:[(F.st.n||[0,0])[0],(F.st.n||[0,0])[1]] };
    st.shots[F.my]=st.shots[F.my].concat(res.cells);
    st.n[F.my]++;
    aim=-1; sfx(res.r); sdk.ui.haptics(res.r==="miss"?8:(res.r==="hit"?[15,20]:[20,30,40]));
    var hits=hitCount(grid,setToSet(st.shots[F.my]));
    var won=hits>=DECKS;
    if(won){ st.status="finished"; st.winner=F.my; st.result="win"; }
    else if(res.r==="miss") st.turn=1-F.my;
    F.st=st; F.lastR=res.r; render();
    saving=true;
    var patch=won?{st:st,claimed:1,fdate:todayStr(),ftime:nowHM()}:{st:st};
    sdk.data.update("matches",F.rec.id,patch).then(function(){
      saving=false; if(!alive) return;
      if(won) famWon(true);
    }).catch(function(){
      saving=false;
      if(alive){ sdk.ui.toast(t("saveFailed")); loadFam().then(function(){ if(alive) render(); }); }
    });
  }
  /* победа в семейном матче: оповещение/событие — на устройстве победителя (очков нет) */
  function famWon(justNow){
    var sc=famScore(), names=famNames(), nn=F.st.n||[0,0];
    lastRes={ mode:"fam", iWon:true, winner:F.st.winner, names:names, oppSurr:F.st.result==="surrender",
      score:[sc[F.my],sc[1-F.my]], shots:[nn[F.my],nn[1-F.my]] };
    track("battle_finished",{mode:"family",result:"win",shots:nn[F.my],by:myName()});
    if(justNow) sdk.notify.send("family","finished",{ params:{name:names[F.st.winner]||myName(),score:sc[F.st.winner]+":"+sc[1-F.st.winner]}, link:{module:"seabattle"} });
    celebrate(true);
    ctx="fam"; view="result"; famPrev=null;
    render();
    loadFam().then(function(){ if(alive) renderIfChanged(); });
  }
  function famLost(){
    var sc=famScore(), names=famNames(), nn=F.st.n||[0,0];
    lastRes={ mode:"fam", iWon:false, winner:F.st.winner, names:names, surr:F.st.result==="surrender",
      score:[sc[F.my],sc[1-F.my]], shots:[nn[F.my],nn[1-F.my]] };
    if(isChild()) track("battle_finished",{mode:"family",result:"loss",shots:nn[F.my]||0,by:myName()});
    celebrate(false);
    ctx="fam"; view="result"; famPrev=null; render();
  }
  function famSurrender(){
    if(!F.rec||F.my<0||!F.st||F.st.status!=="battle") return;
    var names=famNames(), oppName=names[1-F.my]||"";
    sdk.ui.confirm({title:t("giveUp"),text:t("giveUpFam",{name:oppName}),ok:t("common.yes")}).then(function(ok){
      if(!ok||!F.rec||!F.st||F.st.status!=="battle") return;
      var st={ status:"finished", turn:F.st.turn,
        shots:[(F.st.shots[0]||[]).slice(),(F.st.shots[1]||[]).slice()],
        n:[(F.st.n||[0,0])[0],(F.st.n||[0,0])[1]],
        winner:1-F.my, result:"surrender" };
      F.st=st;
      sdk.data.update("matches",F.rec.id,{st:st,fdate:todayStr(),ftime:nowHM()}).then(function(){
        if(!alive) return;
        var sc=famScore();
        sdk.notify.send("family","finished",{ params:{name:oppName,score:sc[1-F.my]+":"+sc[F.my]}, link:{module:"seabattle"} });
        famLost();
      }).catch(function(){ if(alive) sdk.ui.toast(t("saveFailed")); });
    });
  }
  /* победа «по сдаче соперника» приходит через refresh — начислить, если ещё не начислено */
  function famClaimIfNeeded(){
    if(!F.rec||F.my<0||!F.st||F.st.status!=="finished") return;
    if(F.st.winner!==F.my||F.rec.data.claimed) return;
    var rid=F.rec.id;
    F.rec.data.claimed=1;
    sdk.data.update("matches",rid,{claimed:1}).then(function(){
      if(alive) famWon(false);
    }).catch(function(){});
  }
  /* применить изменения семейного состояния после loadFam (переходы для активного экрана) */
  function famApply(){
    var prev=famPrev;
    famPrev=F.rec&&F.st?{id:String(F.rec.id),status:F.st.status,turn:F.st.turn}:null;
    var sameRec=prev&&F.rec&&prev.id===String(F.rec.id);
    if(!F.rec||F.my<0){
      /* матч исчез (отменён) или я зритель — уйти с его экранов */
      if(ctx==="fam"&&(view==="battle"||view==="place")) goHome(); else if(view==="home") renderIfChanged();
      return;
    }
    famClaimIfNeeded();
    /* оба сдали флоты «одновременно» и никто не перевёл матч в бой (каждый при сабмите ещё
       не видел чужой флот) — фолбэк-переход на refresh; пишет ТОЛЬКО создатель p0 (один
       детерминированный писатель, чтобы не клоберить возможный первый ход соперника) */
    if(F.st.status==="placing"&&F.my===0&&F.fleets[0]&&F.fleets[1]){
      famMaybeStart().then(function(){ if(alive&&ctx==="fam") openFam(); else if(alive&&view==="home") renderIfChanged(); });
      return;
    }
    if(F.st.status==="finished"){
      /* живой переход в finished: проигравшему — экран поражения; победителя «по сдаче»
         ведёт famClaimIfNeeded выше (клейм → famWon) */
      var fresh=sameRec&&prev.status!=="finished";
      if(fresh&&F.st.winner!==F.my){ famLost(); return; }
      if(!fresh&&ctx==="fam"&&(view==="battle"||view==="place")){ goHome(); return; }
      if(view==="home") renderIfChanged();
      return;
    }
    if(ctx==="fam"&&view==="battle"){
      /* ходы соперника, прилетевшие этим тиком — подсветить кольцом на моей доске */
      var oshots=(F.st.shots&&F.st.shots[1-F.my])||[];
      if(oppSeen.id!==String(F.rec.id)) oppSeen={ id:String(F.rec.id), n:oshots.length };
      else if(oshots.length>oppSeen.n){
        var fresh=oshots.slice(oppSeen.n);
        oppSeen.n=oshots.length;
        flashOpp(fresh);
        var mg=F.fleets[F.my]?gridOf(F.fleets[F.my].data.ships):null, hitAny=false, k;
        if(mg) for(k=0;k<fresh.length;k++) if(mg[fresh[k]]>=0) hitAny=true;
        sfx(hitAny?"hit":"miss");
        sdk.ui.haptics(hitAny?[15,25]:8);
      }
      if(sameRec&&prev.turn!==F.st.turn&&F.st.turn===F.my) sdk.ui.haptics([10,40,10]);
      renderIfChanged(); return;
    }
    if(ctx==="fam"&&view==="place"&&F.st.status==="battle"){ openFam(); return; }
    if(view==="home") renderIfChanged();
  }

  /* =================== навигация =================== */
  function goHome(){
    ctx="local"; view="home"; aim=-1; render();
    /* во время локальной партии refresh не трогает сеть — догружаем семейный пул при возврате */
    loadFam().then(function(){ if(alive&&view==="home"){ famClaimIfNeeded(); renderIfChanged(); } });
  }

  /* =================== рендер =================== */
  function hudUpdate(){
    if(view==="battle"){ sdk.ui.hud({hidden:true}); return; }
    var s=statsMine();
    /* hidden:false обязателен: детский бар оболочка возвращает только по явному значению */
    sdk.ui.hud({ hidden:false, left:"⚓ <b>"+esc(sdk.i18n.t("tile.seabattle"))+"</b>",
      cNum:s.wins, cLbl:t("stWins"), rNum:s.games, rLbl:t("stGames") });
  }
  function colLetters(){ return String(t("cols")||"ABCDEFGHIJ").split(""); }
  function cellName(i){ return (colLetters()[xOf(i)]||"")+(yOf(i)+1); }

  /* доска. opts: {ships, shots(Set), oppView, mini, dis, aim, main(бой: крупная), act(мой ход),
                   place(расстановка: touch-action none), pick(Set выбранных клеток)} */
  function boardHtml(o){
    var grid=o.ships?gridOf(o.ships):null;
    var shots=o.shots||new Set();
    var sunkMap={};
    if(grid&&o.ships){
      for(var s=0;s<o.ships.length;s++){
        var all=true;
        for(var k=0;k<o.ships[s].cells.length;k++) if(!shots.has(o.ships[s].cells[k])) all=false;
        if(all) sunkMap[s]=1;
      }
    }
    var wrapCls='sb-bwrap'+(o.mini?' mini':'')+(o.main?' main':'')
      +(o.main?(o.act?' act':' wait'):'');
    var cls,letters=colLetters(),h='<div class="'+wrapCls+'">';
    if(!o.mini){
      h+='<span></span><div class="sb-cols">';
      for(var c=0;c<N;c++) h+='<span>'+esc(letters[c]||"")+'</span>';
      h+='</div><div class="sb-rows">';
      for(var r=0;r<N;r++) h+='<span>'+(r+1)+'</span>';
      h+='</div>';
    }
    h+='<div class="sb-grid'+(o.dis?' dis':'')+(o.place?' pl':'')+'" data-board="'+(o.oppView?'opp':'my')+'">';
    for(var i=0;i<CELLS;i++){
      cls="sb-c";
      var shot=shots.has(i), shipIdx=grid?grid[i]:-1;
      if(shot){
        if(shipIdx>=0) cls+=sunkMap[shipIdx]?" sunk":" hit";
        else cls+=" miss";
      } else if(shipIdx>=0&&!o.oppView) cls+=" ship";
      if(o.pick&&o.pick.has(i)) cls+=" pick";
      if(o.flash&&o.flash.has(i)) cls+=" oflash";
      if(o.aim===i) cls+=" aim";
      h+='<button type="button" class="'+cls+'" data-i="'+i+'" aria-label="'+esc((letters[xOf(i)]||"")+(yOf(i)+1))+'"></button>';
    }
    h+='</div></div>';
    return h;
  }
  function fleetBar(ships,shots,label){
    var h='<div class="sb-fleet">';
    for(var s=0;s<ships.length;s++){
      var sunk=!shipAlive(ships[s],shots);
      h+='<span class="sh'+(sunk?' dead':'')+'">';
      for(var k=0;k<ships[s].cells.length;k++) h+='<i></i>';
      h+='</span>';
    }
    h+='<span class="lbl">'+esc(label)+'</span></div>';
    return h;
  }
  function statsMine(){
    /* записи иммутабельны — мемо по длинам списков (рендер зовёт дважды: home + HUD) */
    var key=hist.length+":"+F.finished.length;
    if(statsCache&&statsCache.k===key) return statsCache.v;
    var games=0,wins=0,accS=0,accN=0,i,d;
    for(i=0;i<hist.length;i++){
      d=hist[i].data||{};
      if(d.mode==="bot"&&String(d.authorUid)===myUid()){
        games++; if(d.result==="win") wins++;
        if(typeof d.acc==="number"){ accS+=d.acc; accN++; }
      }
    }
    for(i=0;i<F.finished.length;i++){
      d=F.finished[i].data||{};
      var mine=d.p0&&String(d.p0.uid)===myUid()?0:(d.p1&&String(d.p1.uid)===myUid()?1:-1);
      if(mine<0) continue;
      games++; if(d.st&&d.st.winner===mine) wins++;
    }
    var out={ games:games, wins:wins, acc:accN?Math.round(accS/accN):0 };
    statsCache={k:key,v:out};
    return out;
  }

  function famCardHtml(){
    if(sdk.isDemo()||!F.rec||!F.st||F.st.status==="finished") return "";
    var d=F.rec.data, st=F.st, names=famNames(), h='<div class="sb-card">';
    if(st.status==="open"){
      if(F.my===0)
        h+='<div class="sb-card-title">⚔️ '+esc(t("mdFam"))+'</div><div class="sb-hint sb-status wait">'+esc(t("famWait"))+'</div>'
          +'<div class="sb-ctl"><button type="button" class="sb-btn warn" data-act="famCancel">'+esc(t("famCancel"))+'</button></div>';
      else
        h+='<div class="sb-card-title">'+esc(t("challenge",{name:names[0]}))+'</div>'
          +'<button type="button" class="sb-bigbtn" data-act="famAccept">'+esc(t("famAccept"))+'</button>';
    } else if(F.my<0){
      h+='<div class="sb-card-title">⚔️ '+esc(t("mdFam"))+'</div><div class="sb-hint">'
        +esc(t("famBusy",{a:names[0],b:names[1]||"…"}))+'</div>';
    } else if(st.status==="placing"){
      h+='<div class="sb-card-title">⚔️ '+esc(t("vsLine",{a:names[0],b:names[1]||""}))+'</div>';
      if(!F.fleets[F.my])
        h+='<button type="button" class="sb-bigbtn" data-act="famOpen">'+esc(t("placeTitle"))+'</button>';
      else
        h+='<div class="sb-hint sb-status wait">'+esc(t("famPlaceWait",{name:names[1-F.my]||""}))+'</div>';
      h+='<div class="sb-ctl"><button type="button" class="sb-btn warn" data-act="famCancel">'+esc(t("famCancel"))+'</button></div>';
    } else if(st.status==="battle"){
      var myTurn=st.turn===F.my;
      h+='<div class="sb-card-title">⚔️ '+esc(t("vsLine",{a:names[0],b:names[1]||""}))+'</div>'
        +'<div class="sb-hint">'+esc(myTurn?t("famYourTurn"):t("famOppTurn",{name:names[1-F.my]||""}))+'</div>'
        +'<button type="button" class="sb-bigbtn" data-act="famOpen">'+esc(t("cont"))+(myTurn?" ⚡":"")+'</button>';
    }
    return h+'</div>';
  }

  function homeHtml(){
    var h='', lg=g||loadLocal();
    if(lg&&!g) g=lg;
    if(g&&g.phase!=="over"){
      var label=g.mode==="bot"?t("mdBot",{d:diffLabel(g.diff)}):t("mdHot");
      h+='<div class="sb-card"><div class="sb-card-title">⏳ '+esc(t("contTitle"))+'</div>'
        +'<div class="sb-hint">'+esc(label)+'</div>'
        +'<button type="button" class="sb-bigbtn" data-act="resume">'+esc(t("cont"))+'</button></div>';
    }
    h+=famCardHtml();
    h+='<div class="sb-modes">'
      +'<button type="button" class="sb-mode" data-act="bot"><span class="e">🤖</span><span><span class="t1">'+esc(t("mBot"))+'</span><span class="t2">'+esc(t("mBotSub"))+'</span></span></button>'
      +'<button type="button" class="sb-mode" data-act="hot"><span class="e">🤝</span><span><span class="t1">'+esc(t("mHot"))+'</span><span class="t2">'+esc(t("mHotSub"))+'</span></span></button>'
      +'<button type="button" class="sb-mode'+(sdk.isDemo()?' dis':'')+'" data-act="fam"><span class="e">⚔️</span><span><span class="t1">'+esc(t("mFam"))+'</span><span class="t2">'+esc(sdk.isDemo()?t("famDemo"):t("mFamSub"))+'</span></span></button>'
      +'</div>';
    h+='<div class="store-section">'+esc(t("histTitle"))+'</div>'+histHtml();
    return h;
  }
  function histRows(){
    /* история — ТОЛЬКО СВОЯ (приватность, фидбек Джеффа 2026-06-12): пул familyPool общий,
       поэтому фильтруем на показе — бот/hot-seat по автору, семейные матчи по участию */
    var rows=[],i,d,mine;
    for(i=0;i<hist.length;i++){
      d=hist[i].data||{};
      if(String(d.authorUid)!==myUid()) continue;
      rows.push({ at:hist[i].createdAt||0, d:d, fam:false });
    }
    for(i=0;i<F.finished.length;i++){
      d=F.finished[i].data||{};
      mine=d.p0&&String(d.p0.uid)===myUid()?0:(d.p1&&String(d.p1.uid)===myUid()?1:-1);
      if(mine<0) continue;
      rows.push({ at:F.finished[i].createdAt||0, d:d, fam:true, mine:mine });
    }
    rows.sort(function(a,b){ return b.at-a.at; });
    return rows.slice(0,60);
  }
  function histHtml(){
    if(!histLoaded) return '<div class="rt-loading"><div class="rt-spin"></div></div>';
    var rows=histRows();
    if(!rows.length) return '<div class="rt-empty"><span class="e">⚓</span>'+esc(t("histEmpty"))+'</div>';
    var h='<div class="sb-list">',i,r,d,e,t1,t2,badge;
    for(i=0;i<rows.length;i++){
      r=rows[i]; d=r.d;
      if(r.fam){
        var names=[d.p0?d.p0.name:"",d.p1?d.p1.name:""];
        var winIdx=d.st?d.st.winner:0;
        var surr=d.st&&d.st.result==="surrender";
        e="⚔️"; t1=t("vsLine",{a:names[0],b:names[1]});
        t2=t("mdFam")+" · "+esc(humanDate(d.fdate||d.date||""));
        badge=winIdx===r.mine?'<span class="sb-badge win">'+esc(t("bWin"))+'</span>'
             :(surr?'<span class="sb-badge mid">🏳 '+esc(t("bSurr"))+'</span>'
                   :'<span class="sb-badge loss">'+esc(t("bLoss"))+'</span>');
      } else if(d.mode==="bot"){
        e="🤖"; t1=t("mdBot",{d:diffLabel(d.diff||"normal")});
        t2=(d.score?d.score[0]+":"+d.score[1]+" · ":"")+esc(humanDate(d.date||""))+(d.author?" · "+esc(d.author):"");
        badge=d.result==="win"?'<span class="sb-badge win">'+esc(t("bWin"))+'</span>'
             :(d.surr?'<span class="sb-badge mid">🏳 '+esc(t("bSurr"))+'</span>'
                     :'<span class="sb-badge loss">'+esc(t("bLoss"))+'</span>');
      } else {
        e="🤝"; t1=t("mdHot");
        t2=(d.score?d.score[0]+":"+d.score[1]+" · ":"")+esc(humanDate(d.date||""))+(d.author?" · "+esc(d.author):"");
        badge='<span class="sb-badge mid">'+esc(t(d.winnerNo===2?"p2":"p1"))+' 🏆</span>';
      }
      h+='<div class="sb-row"><span class="e">'+e+'</span><span class="tx"><span class="t1">'+esc(t1)+'</span><span class="t2">'+t2+'</span></span>'+badge+'</div>';
    }
    return h+'</div>';
  }

  function diffHtml(){
    return '<div class="sb-card-title" style="margin-top:14px">'+esc(t("diffTitle"))+'</div>'
      +'<div class="sb-diffs">'
      +'<button type="button" class="sb-diff" data-act="diff" data-d="easy"><span class="e">⛵</span><span><span class="t1">'+esc(t("dEasy"))+'</span><span class="t2">'+esc(t("dEasySub"))+'</span></span></button>'
      +'<button type="button" class="sb-diff" data-act="diff" data-d="normal"><span class="e">🚤</span><span><span class="t1">'+esc(t("dNorm"))+'</span><span class="t2">'+esc(t("dNormSub"))+'</span></span></button>'
      +'<button type="button" class="sb-diff" data-act="diff" data-d="hard"><span class="e">🚢</span><span><span class="t1">'+esc(t("dHard"))+'</span><span class="t2">'+esc(t("dHardSub"))+'</span></span></button>'
      +'</div>';
  }

  function placeHtml(){
    var who=ctx==="fam"?myName():(g&&g.mode==="hot"?localName(g.pf):myName());
    var title=(g&&g.mode==="hot")?t("placeFor",{name:who}):t("placeTitle");
    var left=FLEET.length-P.ships.length,i;
    var pick=P.selPlaced!=null&&P.ships[P.selPlaced]?new Set(P.ships[P.selPlaced].cells):null;
    var h='<div class="sb-card"><div class="sb-card-title">'+esc(title)+'</div>'
      +boardHtml({ships:P.ships,shots:new Set(),oppView:false,aim:-1,place:true,pick:pick})
      +'<div class="sb-dock">';
    for(i=0;i<SIZES.length;i++){
      var L=SIZES[i], cnt=remainOf(L), sel=P.sel===L;
      var chip='<button type="button" class="sb-dchip'+(sel?' sel':'')+(cnt<=0?' done':'')+'" data-act="dock" data-l="'+L+'"><span class="cells">';
      for(var k=0;k<L;k++) chip+='<i></i>';
      chip+='</span><span class="n">×'+Math.max(0,cnt)+'</span></button>';
      h+=chip;
    }
    h+='</div>'
      +'<div class="sb-msg">'+esc(P.selPlaced!=null?t("moveHint"):(left?sdk.plural(left,"left"):""))+'</div>'
      +'<div class="sb-ctl">'
      +'<button type="button" class="sb-btn" data-act="rand">'+esc(t("random"))+'</button>'
      +'<button type="button" class="sb-btn'+(P.selPlaced!=null?" hot":"")+'" data-act="rot">'+esc(t("rotate"))+(P.selPlaced!=null?"":(P.horiz?" ↔":" ↕"))+'</button>'
      +'<button type="button" class="sb-btn warn" data-act="clearB">'+esc(t("clear"))+'</button>'
      +'</div>'
      +'<button type="button" class="sb-bigbtn" data-act="placeDone"'+(left?" disabled":"")+'>'+esc(t("ready"))+'</button>'
      +'</div>';
    return h;
  }

  function passHtml(){
    var name=localName(g.passNext==="place"?g.pf:g.turn);
    return '<div class="sb-pass"><span class="e">📱</span>'
      +'<div class="t1">'+esc(t("passTo",{name:name}))+'</div>'
      +'<div class="t2">'+esc(t("passHint"))+'</div>'
      +'<button type="button" class="sb-bigbtn" style="max-width:280px" data-act="passOk">'+esc(t("passBtn"))+'</button></div>';
  }

  function battleHtml(){
    var myShips,oppShips,myShots,oppShots,statusTxt,mineTurn,oppName,nShots=0,last="";
    if(ctx==="fam"){
      if(!F.rec||F.my<0||!F.fleets[0]||!F.fleets[1]) return "";
      myShips=F.fleets[F.my].data.ships; oppShips=F.fleets[1-F.my].data.ships;
      myShots=setToSet(F.st.shots&&F.st.shots[F.my]); oppShots=setToSet(F.st.shots&&F.st.shots[1-F.my]);
      mineTurn=F.st.turn===F.my; oppName=famNames()[1-F.my]||"";
      nShots=(F.st.n||[0,0])[F.my]||0; last=F.lastR||"";
      statusTxt=mineTurn?((last==="hit"||last==="sunk")?t(last):t("yourTurn")):t("oppTurn",{name:oppName});
    } else {
      var v=viewerIdx();
      myShips=g.ships[v]; oppShips=g.ships[1-v];
      myShots=setToSet(g.shots[v]); oppShots=setToSet(g.shots[1-v]);
      mineTurn=g.mode==="bot"?g.turn===0:true;
      nShots=g.shotN[v]||0; last=g.msg||"";
      statusTxt=mineTurn?((last==="hit"||last==="sunk")?t(last):t("yourTurn")):t("botThinks");
    }
    /* компактный бой в один экран (фидбек Джеффа): статус+статистика раунда+сдаться в одной
       строке, активное поле подсвечено (ход виден по самой доске), флот и своя мини-доска внизу */
    var og=gridOf(oppShips), nHits=hitCount(og,myShots);
    return '<div class="sb-bt">'
      +'<div class="sb-btop">'
      +'<span class="sb-turn'+(mineTurn?" mine":" wait")+'">'+esc(statusTxt)+'</span>'
      +'<span class="sb-rst">🎯 '+nShots+' · 💥 '+nHits+'</span>'
      +'<button type="button" class="sb-flag" data-act="giveUp" aria-label="'+esc(t("giveUp"))+'">🏳</button>'
      +'</div>'
      +boardHtml({ships:oppShips,shots:myShots,oppView:true,dis:!mineTurn,aim:aim,main:true,act:mineTurn})
      +'<button type="button" class="sb-fire" data-act="fire"'+(mineTurn&&aim>=0?"":" disabled")+'>🎯 '+esc(t("fire"))+(aim>=0?" — "+esc(cellName(aim)):"")+'</button>'
      +'<div class="sb-bbot">'
      +boardHtml({ships:myShips,shots:oppShots,oppView:false,mini:true,dis:true,aim:-1,
          flash:(OPP_FLASH&&Date.now()-OPP_FLASH.ts<2500)?setToSet(OPP_FLASH.cells):null})
      +'<div class="sb-fcol">'+fleetBar(oppShips,myShots,t("oppWaters"))+fleetBar(myShips,oppShots,t("myFleet"))+'</div>'
      +'</div>'
      +'</div>';
  }

  function resultHtml(){
    if(!lastRes) return "";
    var r=lastRes,h='<div class="sb-card sb-res">',title,sub="",emoji;
    if(r.mode==="hot"){
      emoji="🏆"; title=t("winBy",{name:r.names[r.winner]});
    } else if(r.mode==="fam"){
      emoji=r.iWon?"🏆":(r.surr?"🏳":"💧");
      title=r.iWon?t("winTitle"):(r.surr?t("surrTitle"):t("loseTitle"));
      sub=r.iWon?(r.oppSurr?t("oppGaveUp"):""):t("encourage");
    } else {
      var won=r.winner===0;
      emoji=won?"🏆":(r.surr?"🏳":"💧");
      title=won?t("winTitle"):(r.surr?t("surrTitle"):t("loseTitle"));
      sub=won?"":t("encourage");
    }
    h+='<span class="e">'+emoji+'</span><div class="t1">'+esc(title)+'</div>';
    if(sub) h+='<div class="t2">'+esc(sub)+'</div>';
    var myShots=r.mode==="hot"?(r.shots[0]+r.shots[1]):r.shots[0];
    h+='<div class="sb-resgrid">'
      +'<div class="s"><div class="n">'+esc(String(r.score[0]))+":"+esc(String(r.score[1]))+'</div><div class="l">'+esc(t("rScore"))+'</div></div>'
      +'<div class="s"><div class="n">'+(typeof myShots==="number"?myShots:0)+'</div><div class="l">'+esc(t("rShots"))+'</div></div>';
    if(typeof r.acc==="number") h+='<div class="s"><div class="n">'+r.acc+'%</div><div class="l">'+esc(t("rAcc"))+'</div></div>';
    h+='</div>';
    if(r.mode==="bot") h+='<button type="button" class="sb-bigbtn" data-act="again">'+esc(t("again"))+'</button>';
    h+='<div class="sb-ctl"><button type="button" class="sb-btn" data-act="home">'+esc(t("common.home"))+'</button></div>'
      +'</div>';
    return h;
  }

  /* отпечаток видимого семейного/исторического состояния: refresh перерисовывает только
     при его смене (полный innerHTML каждые 4с убивал бы тапы и батарею — идиома chat) */
  function famFp(){
    var s=F.st;
    return [view, ctx, F.rec?F.rec.id:"-", s?s.status:"-", s?s.turn:-1,
      s&&s.shots?(s.shots[0]||[]).length+"."+(s.shots[1]||[]).length:"-",
      F.fleets[0]?1:0, F.fleets[1]?1:0, F.rec&&F.rec.data.claimed?1:0,
      hist.length, F.finished.length].join("|");
  }
  function renderIfChanged(){ if(famFp()!==lastFp) render(); }
  function render(){
    if(!alive||!root) return;
    var box=root.querySelector(".sb");
    if(!box) return;
    var h="";
    if(view==="home") h=homeHtml();
    else if(view==="diff") h=diffHtml();
    else if(view==="place") h=placeHtml();
    else if(view==="pass") h=passHtml();
    else if(view==="battle") h=battleHtml();
    else if(view==="result") h=resultHtml();
    box.innerHTML=h;
    lastFp=famFp();
    hudUpdate();
  }

  /* =================== обработчики =================== */
  function onTap(e){
    var btn=e.target.closest("[data-act]");
    var cell=e.target.closest(".sb-c");
    if(btn){
      var act=btn.getAttribute("data-act");
      if(act==="bot"){ if(coolGate()) return; ctx="local"; view="diff"; render(); }
      else if(act==="hot"){ if(coolGate()) return; newLocal("hot",null); }
      else if(act==="fam"){ famCreate(); }
      else if(act==="diff"){ if(coolGate()) return; newLocal("bot",btn.getAttribute("data-d")||"normal"); }
      else if(act==="resume"){ resumeLocal(); }
      else if(act==="famAccept"){ famAccept(); }
      else if(act==="famCancel"){ famCancel(); }
      else if(act==="famOpen"){ openFam(); }
      else if(act==="dock"){ if(P){ var L=+btn.getAttribute("data-l"); if(remainOf(L)>0){ P.sel=L; P.selPlaced=null; sdk.ui.haptics(6); render(); } } }
      else if(act==="rand"){ if(P){ var f=randomFleet(); if(f){ P.ships=f; P.sel=null; P.selPlaced=null; sdk.ui.haptics(8); render(); } } }
      else if(act==="rot"){ if(P) rotateAction(); }
      else if(act==="clearB"){ if(P){ P.ships=[]; P.sel=null; P.selPlaced=null; render(); } }
      else if(act==="placeDone"){ ctx==="fam"?famPlaceDone():placeDone(); }
      else if(act==="passOk"){ passReady(); }
      else if(act==="fire"){ fireAim(); }
      else if(act==="giveUp"){ ctx==="fam"?famSurrender():localSurrender(); }
      else if(act==="again"){ var d=lastRes&&lastRes.diff; ctx="local"; view="diff"; if(d){ newLocal("bot",d); } else render(); }
      else if(act==="home"){ goHome(); }
      return;
    }
    if(cell){
      var i=+cell.getAttribute("data-i");
      var board=cell.parentNode.getAttribute("data-board");
      /* расстановку целиком ведут pointer-обработчики (тап/выбор/перенос) */
      if(view==="battle"&&board==="opp") aimTap(i,cell);
    }
  }
  function remainOf(L){
    var c=FLEET_CNT[L]||0;
    for(var i=0;i<P.ships.length;i++) if(P.ships[i].cells.length===L) c--;
    return c;
  }
  function nextSize(){
    for(var k=0;k<SIZES.length;k++) if(remainOf(SIZES[k])>0) return SIZES[k];
    return null;
  }
  /* ---- расстановка: тап по пустой — поставить из дока, тап по кораблю — выбрать,
          перенос пальцем — передвинуть, перенос на док — вернуть, «Повернуть» — на поле ---- */
  function shipHoriz(s){ return s.cells.length<2||(s.cells[1]-s.cells[0]===1); }
  function gridWithout(idx){
    var ships=[],i; for(i=0;i<P.ships.length;i++) if(i!==idx) ships.push(P.ships[i]);
    return gridOf(ships);
  }
  function shakeCell(i){
    var el=root&&root.querySelector('.sb-grid .sb-c[data-i="'+i+'"]');
    if(el){ el.classList.add("bad"); setTimeout(function(){ el.classList.remove("bad"); },350); }
    sdk.ui.haptics(15);
  }
  function placeNewAt(i){
    var L=P.sel||nextSize();
    if(!L){ sdk.ui.toast(t("pickShip")); return; }
    var grid=gridOf(P.ships);
    var c=cellsAt(xOf(i),yOf(i),L,P.horiz);
    if(!c||!canPlace(grid,c)){ shakeCell(i); sdk.ui.toast(t("badSpot")); return; }
    P.ships.push({cells:c});
    if(remainOf(L)<=0) P.sel=nextSize();
    sdk.ui.haptics(8); render();
  }
  function rotateAction(){
    if(P.selPlaced==null){ P.horiz=!P.horiz; sdk.ui.haptics(6); render(); return; }
    var s=P.ships[P.selPlaced];
    if(!s||s.cells.length<2){ sdk.ui.haptics(6); return; }
    var h=!shipHoriz(s), len=s.cells.length;
    var ax=xOf(s.cells[0]), ay=yOf(s.cells[0]);
    if(h&&ax>N-len) ax=N-len;       /* прижать к краю, чтобы поворот не вылез за поле */
    if(!h&&ay>N-len) ay=N-len;
    var c=cellsAt(ax,ay,len,h);
    if(!c||!canPlace(gridWithout(P.selPlaced),c)){ shakeCell(s.cells[0]); sdk.ui.toast(t("badSpot")); return; }
    s.cells=c; sdk.ui.haptics(8); render();
  }
  function tryMoveShip(idx,grabK,ti){
    var s=P.ships[idx], h=shipHoriz(s), len=s.cells.length;
    var ax=xOf(ti)-(h?grabK:0), ay=yOf(ti)-(h?0:grabK);
    var c=(ax>=0&&ay>=0)?cellsAt(ax,ay,len,h):null;
    if(!c||!canPlace(gridWithout(idx),c)){ shakeCell(ti); render(); return; }
    s.cells=c; P.selPlaced=idx; sdk.ui.haptics(8); render();
  }
  function clearDropPreview(){
    if(!root) return;
    var els=root.querySelectorAll(".sb-c.drop-ok,.sb-c.drop-bad"),k;
    for(k=0;k<els.length;k++){ els[k].classList.remove("drop-ok"); els[k].classList.remove("drop-bad"); }
  }
  function dropPreview(ti){
    clearDropPreview();
    if(ti<0||!PD||!P) return;
    var s=P.ships[PD.idx], h=shipHoriz(s), len=s.cells.length;
    var ax=xOf(ti)-(h?PD.grabK:0), ay=yOf(ti)-(h?0:PD.grabK);
    var c=(ax>=0&&ay>=0)?cellsAt(ax,ay,len,h):null;
    var ok=!!(c&&canPlace(gridWithout(PD.idx),c));
    var list=c||[ti],k;
    for(k=0;k<list.length;k++){
      var el=root.querySelector('.sb-grid .sb-c[data-i="'+list[k]+'"]');
      if(el) el.classList.add(ok?"drop-ok":"drop-bad");
    }
  }
  function plDown(e){
    if(view!=="place"||!P) return;
    var cell=e.target&&e.target.closest?e.target.closest(".sb-c"):null;
    if(!cell) return;
    var i=+cell.getAttribute("data-i");
    var s=gridOf(P.ships)[i];
    PD={ idx:s, cell:i, grabK:s>=0?P.ships[s].cells.indexOf(i):0, x:e.clientX, y:e.clientY, moved:false };
  }
  function plMove(e){
    if(!PD||view!=="place"||!P) return;
    if(PD.idx<0) return; /* потянули с пустой клетки — остаётся тапом */
    if(!PD.moved){
      if(Math.abs(e.clientX-PD.x)+Math.abs(e.clientY-PD.y)<10) return;
      PD.moved=true; P.selPlaced=PD.idx;
    }
    var el=document.elementFromPoint(e.clientX,e.clientY);
    var cell=el&&el.closest?el.closest(".sb-c"):null;
    dropPreview(cell?+cell.getAttribute("data-i"):-1);
  }
  function plUp(e){
    if(!PD) return;
    var pd=PD; PD=null; clearDropPreview();
    if(view!=="place"||!P) return;
    if(!pd.moved){
      if(pd.idx>=0){ /* тап по кораблю: выбрать / снять выбор (НЕ убирать в док) */
        P.selPlaced=(P.selPlaced===pd.idx)?null:pd.idx;
        sdk.ui.haptics(6); render();
      } else if(P.selPlaced!=null){ P.selPlaced=null; render(); }
      else placeNewAt(pd.cell);
      return;
    }
    var el=document.elementFromPoint(e.clientX,e.clientY);
    if(el&&el.closest&&el.closest(".sb-dock")){ /* стащили на док — вернуть корабль */
      var len=P.ships[pd.idx].cells.length;
      P.ships.splice(pd.idx,1); P.selPlaced=null; P.sel=len;
      sdk.ui.haptics(6); render(); return;
    }
    var cell=el&&el.closest?el.closest(".sb-c"):null;
    if(cell) tryMoveShip(pd.idx,pd.grabK,+cell.getAttribute("data-i"));
    else render();
  }
  function plCancel(){ PD=null; clearDropPreview(); }
  function aimTap(i,cell){
    var mineTurn = ctx==="fam" ? (F.st&&F.st.status==="battle"&&F.st.turn===F.my)
                               : (g&&g.phase==="battle"&&(g.mode!=="bot"||g.turn===0));
    if(!mineTurn) return;
    var shots = ctx==="fam" ? setToSet(F.st.shots&&F.st.shots[F.my]) : setToSet(g.shots[viewerIdx()]);
    if(shots.has(i)) return;
    if(aim===i){ fireAim(); return; }
    aim=i; sdk.ui.haptics(6); render(); /* без звука: прицел — тихий (фидбек Джеффа) */
  }
  function fireAim(){
    if(aim<0) return;
    var i=aim;
    if(ctx==="fam") famFire(i); else localFire(i);
  }
  function resumeLocal(){
    if(!g){ g=loadLocal(); }
    if(!g){ render(); return; }
    ctx="local";
    if(g.phase==="place"){ if(!P) P={ships:[],sel:null,horiz:true}; view="place"; }
    else if(g.phase==="pass") view="pass";
    else if(g.phase==="battle"){ view="battle"; if(g.mode==="bot"&&g.turn===1) botPlay(); }
    else { g=null; saveLocal(); view="home"; }
    render();
  }

  /* =================== настройки родителя (перерыв между играми) =================== */
  function parentAllowed(){ return sdk.role==="parent"||sdk.isDemo(); }
  function openSettings(){
    var cur=META.cooldownMin==null?1:+META.cooldownMin;
    var opts=[0,1,5,10,30], node=document.createElement("div"), i;
    var h='<h2>'+esc(t("setTitle"))+'</h2>'
      +'<div class="sb-card-title" style="font-size:15px">'+esc(t("coolTitle"))+'</div>'
      +'<div class="sb-hint">'+esc(t("coolHint"))+'</div>'
      +'<div class="sb-coolrow">';
    for(i=0;i<opts.length;i++){
      h+='<button type="button" class="sb-coolchip'+(opts[i]===cur?" on":"")+'" data-m="'+opts[i]+'">'
        +esc(opts[i]?t("coolMin",{n:opts[i]}):t("coolOff"))+'</button>';
    }
    h+='</div><div class="sheet-actions" style="margin-top:14px"><button class="btn btn-cancel" data-close style="flex:1">'+esc(t("common.close"))+'</button></div>';
    node.innerHTML=h;
    var sh=sdk.ui.sheet(node); curSheet=sh;
    node.addEventListener("click",function(ev){
      var ch=ev.target.closest(".sb-coolchip");
      if(ch){
        var m=+ch.getAttribute("data-m");
        var p=META.id?sdk.data.update("meta",META.id,{cooldownMin:m})
                     :sdk.data.create("meta",{cooldownMin:m}).then(function(it){ if(it) META.id=it.id; });
        Promise.resolve(p).then(function(){
          if(!alive) return;
          META.cooldownMin=m;
          var cs=node.querySelectorAll(".sb-coolchip"),k;
          for(k=0;k<cs.length;k++) cs[k].classList.toggle("on",+cs[k].getAttribute("data-m")===m);
          sdk.ui.haptics(8); sdk.ui.toast(t("common.done"));
        }).catch(function(){ if(alive) sdk.ui.toast(t("saveFailed")); });
        return;
      }
      if(ev.target.closest("[data-close]")){ curSheet=null; sh.close(); }
    });
  }

  /* =================== mount / unmount / refresh / link =================== */
  var GEAR_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.1"/><path d="M19.2 12c0-.4 0-.8-.1-1.2l2-1.5-2-3.4-2.3 1a7.4 7.4 0 0 0-2-1.2L14.4 3h-4l-.4 2.7a7.4 7.4 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5a7.3 7.3 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a7.4 7.4 0 0 0 2 1.2l.4 2.7h4l.4-2.7a7.4 7.4 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z"/></svg>';
  function mount(rootEl,theSdk){
    sdk=theSdk; root=rootEl; alive=true;
    view="home"; ctx="local"; g=null; P=null; aim=-1; saving=false; curSheet=null; lastRes=null;
    F={ rec:null, st:null, my:-1, fleets:[null,null], finished:[] };
    hist=[]; histLoaded=false; famPrev=null; lastFp=null; statsCache=null;
    META={ id:null, cooldownMin:null }; PD=null; OPP_FLASH=null; oppSeen={ id:null, n:0 };
    var title=sdk.i18n.t("tile.seabattle");
    var body=sdk.ui.frame({
      titleHtml:'<div class="sb-title">'+esc(title)+'</div><div class="sb-sub">'+esc(t("subtitle"))+'</div>',
      backLabel:t("common.back"),
      back:function(){ if(view!=="home"){ if(view==="battle"&&ctx==="local") saveLocal(); goHome(); return; } sdk.ui.back(); },
      actions:[ parentAllowed()&&{ icon:GEAR_IC, id:"sbSet", label:t("setTitle"), onClick:openSettings } ]
    }).body;
    body.innerHTML='<div class="sb"></div>';
    /* делегирование — на внутреннем .sb (пересоздаётся при каждом mount), НЕ на root;
       drag-n-drop расстановки — pointer-события (document-слушатели снимает sdk.on при unmount) */
    var sbEl=root.querySelector(".sb");
    sbEl.addEventListener("click",onTap);
    sbEl.addEventListener("pointerdown",plDown);
    sdk.on(document,"pointermove",plMove);
    sdk.on(document,"pointerup",plUp);
    sdk.on(document,"pointercancel",plCancel);
    g=loadLocal();
    render();
    Promise.all([loadFam(),loadHist(),loadMeta()]).then(function(){
      if(!alive) return;
      famPrev=F.rec&&F.st?{id:String(F.rec.id),status:F.st.status,turn:F.st.turn}:null;
      famClaimIfNeeded();
      render();
    }).catch(function(){ if(alive){ histLoaded=true; render(); sdk.ui.toast(t("loadFailed")); } });
  }
  function unmount(){
    alive=false;
    if(botTimer){ clearTimeout(botTimer); botTimer=null; }
    if(g&&g.phase!=="over") saveLocal();
    try{ sdk.ui.hud({hidden:false}); }catch(e){}
    if(curSheet&&curSheet.close){ try{ curSheet.close(); }catch(e){} }
    curSheet=null; root=null; g=null; P=null; F={rec:null,st:null,my:-1,fleets:[null,null],finished:[]};
    hist=[]; lastRes=null; famPrev=null; lastFp=null; statsCache=null; PD=null;
    OPP_FLASH=null; oppSeen={ id:null, n:0 };
  }
  function refresh(){
    try{
      if(!alive) return true;
      if(saving) return false;
      /* шторку могли закрыть мимо нас (грип/оверлей/свайп) — иначе refresh заглохнет навсегда */
      if(curSheet&&!(curSheet.overlay&&curSheet.overlay.parentNode)) curSheet=null;
      if(curSheet) return false;
      /* локальная партия: сеть не трогаем; семейный пул догрузит goHome при возврате
         (клейм семейной победы подождёт — не выдёргиваем ребёнка из партии с ботом) */
      if(ctx==="local"&&(view==="place"||view==="pass"||view==="battle")) return true;
      Promise.all([loadFam(), view==="home"?Promise.all([loadHist(),loadMeta()]):Promise.resolve()])
        .then(function(){ if(alive) famApply(); });
      return true;
    }catch(e){ return true; }
  }
  function link(lk){
    /* оповещение ведёт в семейный матч */
    if(!alive) return;
    loadFam().then(function(){ if(alive) openFam(); });
  }

  RobTop.register({ id:"seabattle", mount:mount, unmount:unmount, refresh:refresh, link:link,
    messages:MESSAGES, _engine:Eng });
})();
