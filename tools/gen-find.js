/* RobTop — генератор пула описаний для модуля «Найти предмет» (find).
 *
 * Описание = «Найди что-нибудь <прилагательные>». Берём ТОЛЬКО прилагательные,
 * описывающие неопределённое «что-то», — так грамматика чистая во всех 3 языках без
 * согласования рода существительного:
 *   en: "Find something red, round and small"
 *   ru: "Найди что-нибудь красное, круглое и маленькое"   (средний род, ед. ч.)
 *   lv: "Atrodi kaut ko sarkanu, apaļu un mazu"            (vīr. dz. akuzatīvs, -u)
 *
 * Сложность = число прилагательных (не больше одного на категорию, чтобы не было
 * противоречий «красное и синее»): легко 1, средне 2, сложно 3, невозможно 4.
 * Чем больше ограничений — тем труднее найти предмет, удовлетворяющий ВСЕМ сразу.
 *
 * Выход:
 *   tools/find-pool.min.json            — { adj:{en,ru,lv}, cats:[...], pool:{easy,medium,hard,impossible} }
 *                                          (встраивается в app/modules/find/module.js на место /*__POOL__*​/)
 *   tools/find-descriptions-10000.txt   — читаемый список всех 10000 на 3 языках (для проверки человеком)
 *   stdout                              — отчёт: счётчики по сложности, всего, уникальность по языкам.
 *
 * Запуск: node tools/gen-find.js
 */
"use strict";
const fs = require("fs");
const path = require("path");

/* ---- 49 прилагательных в 7 категориях. Формы: en | ru (ср. род, ед.ч.) | lv (vīr. akuz., -u) ---- */
const CATS = [
  { key:"color", adj:[
    ["red","красное","sarkanu"],
    ["orange","оранжевое","oranžu"],
    ["yellow","жёлтое","dzeltenu"],
    ["green","зелёное","zaļu"],
    ["blue","синее","zilu"],
    ["light blue","голубое","gaišzilu"],
    ["purple","фиолетовое","violetu"],
    ["pink","розовое","rozā"],
    ["white","белое","baltu"],
    ["black","чёрное","melnu"],
    ["brown","коричневое","brūnu"],
    ["grey","серое","pelēku"],
    ["golden","золотое","zeltainu"],
    ["silver","серебряное","sudrabainu"]
  ]},
  { key:"shape", adj:[
    ["round","круглое","apaļu"],
    ["square","квадратное","kvadrātisku"],
    ["oval","овальное","ovālu"],
    ["long","длинное","garu"],
    ["short","короткое","īsu"],
    ["flat","плоское","plakanu"],
    ["thin","тонкое","plānu"],
    ["thick","толстое","biezu"],
    ["pointy","острое","asu"],
    ["curved","изогнутое","izliektu"]
  ]},
  { key:"size", adj:[
    ["big","большое","lielu"],
    ["small","маленькое","mazu"],
    ["tiny","крошечное","sīku"],
    ["huge","огромное","milzīgu"],
    ["narrow","узкое","šauru"],
    ["wide","широкое","platu"]
  ]},
  { key:"texture", adj:[
    ["soft","мягкое","mīkstu"],
    ["hard","твёрдое","cietu"],
    ["smooth","гладкое","gludu"],
    ["rough","шершавое","raupju"],
    ["fluffy","пушистое","pūkainu"],
    ["sticky","липкое","lipīgu"],
    ["wet","мокрое","slapju"],
    ["dry","сухое","sausu"]
  ]},
  { key:"shine", adj:[
    ["shiny","блестящее","spīdīgu"],
    ["matte","матовое","matētu"],
    ["transparent","прозрачное","caurspīdīgu"],
    ["sparkly","сверкающее","mirdzošu"]
  ]},
  { key:"weight", adj:[
    ["warm","тёплое","siltu"],
    ["cold","холодное","aukstu"],
    ["light","лёгкое","vieglu"],
    ["heavy","тяжёлое","smagu"]
  ]},
  { key:"pattern", adj:[
    ["striped","полосатое","svītrainu"],
    ["spotted","пятнистое","raibu"],
    ["plain","однотонное","vienkrāsainu"]
  ]}
];

/* Плоский список прилагательных + к какой категории относится каждый индекс. */
const ADJ = { en:[], ru:[], lv:[] };
const ADJ_CAT = [];           // ADJ_CAT[i] = индекс категории прилагательного i
CATS.forEach(function(c, ci){
  c.adj.forEach(function(a){
    ADJ.en.push(a[0]); ADJ.ru.push(a[1]); ADJ.lv.push(a[2]); ADJ_CAT.push(ci);
  });
});
const N = ADJ.en.length;      // 49
const CAT_OF = ADJ_CAT;
const NCATS = CATS.length;    // 7
/* индексы прилагательных по категориям */
const BY_CAT = CATS.map(function(_, ci){
  var out=[]; for(var i=0;i<N;i++) if(CAT_OF[i]===ci) out.push(i); return out;
});

/* ---- детерминированный ГПСЧ (mulberry32) для воспроизводимого перемешивания ---- */
function mulberry32(seed){
  return function(){
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(arr, rnd){
  for(var i=arr.length-1;i>0;i--){ var j=Math.floor(rnd()*(i+1)); var t=arr[i]; arr[i]=arr[j]; arr[j]=t; }
  return arr;
}

/* ---- все сочетания категорий по k (комбинации индексов категорий) ---- */
function catCombos(k){
  var res=[];
  (function rec(start, acc){
    if(acc.length===k){ res.push(acc.slice()); return; }
    for(var c=start;c<NCATS;c++){ acc.push(c); rec(c+1, acc); acc.pop(); }
  })(0, []);
  return res;
}

/* ---- все combos сложности (k прилагательных, по одному из k разных категорий) ----
   combo = массив индексов прилагательных, отсортированный по индексу (канонический вид). */
function allCombos(k){
  var combos = catCombos(k), out=[];
  combos.forEach(function(cc){
    // декартово произведение прилагательных выбранных категорий
    (function rec(pos, acc){
      if(pos===cc.length){ out.push(acc.slice().sort(function(a,b){return a-b;})); return; }
      var ids = BY_CAT[cc[pos]];
      for(var i=0;i<ids.length;i++){ acc.push(ids[i]); rec(pos+1, acc); acc.pop(); }
    })(0, []);
  });
  return out;
}

/* ---- собрать пул сложности: все combos → перемешать (фикс. seed) → обрезать до target ---- */
function buildLevel(k, target, seed){
  var all = allCombos(k);
  shuffle(all, mulberry32(seed));
  if(target!=null && target<all.length) all = all.slice(0, target);
  return all;
}

const POOL = {
  easy:       buildLevel(1, null, 0x51EA5),   // все 49
  medium:     buildLevel(2, null, 0x4ED10),   // все 982
  hard:       buildLevel(3, 4000, 0x4A2D1),
  impossible: buildLevel(4, 4969, 0x12B055)
};

/* ---- рендер описания (для экспорта и проверки) ---- */
const LEAD = { en:"Find something ", ru:"Найди что-нибудь ", lv:"Atrodi kaut ko " };
const ANDW = { en:" and ", ru:" и ", lv:" un " };
function joinAdj(words, lang){
  if(words.length===1) return words[0];
  return words.slice(0,-1).join(", ") + ANDW[lang] + words[words.length-1];
}
function render(combo, lang){
  var words = combo.map(function(i){ return ADJ[lang][i]; });
  return LEAD[lang] + joinAdj(words, lang);
}

/* ---- собрать выходной объект и проверить уникальность ---- */
const DIFFS = ["easy","medium","hard","impossible"];
let total = 0;
const seenByLang = { en:new Set(), ru:new Set(), lv:new Set() };
const lines = [];
DIFFS.forEach(function(d){
  POOL[d].forEach(function(combo){
    total++;
    ["en","ru","lv"].forEach(function(lang){
      seenByLang[lang].add(render(combo, lang));
    });
    lines.push(d.toUpperCase().padEnd(11) + " | " +
      render(combo,"en") + "  ||  " + render(combo,"ru") + "  ||  " + render(combo,"lv"));
  });
});

const outDir = __dirname;
const minObj = { v:1, adj:ADJ, cats:CATS.map(function(c){return c.key;}), catOf:CAT_OF, pool:POOL };
fs.writeFileSync(path.join(outDir,"find-pool.min.json"), JSON.stringify(minObj));
fs.writeFileSync(path.join(outDir,"find-descriptions-10000.txt"),
  "RobTop — модуль «Найти предмет»: пул описаний\n" +
  "Всего: " + total + " | easy:" + POOL.easy.length + " medium:" + POOL.medium.length +
  " hard:" + POOL.hard.length + " impossible:" + POOL.impossible.length + "\n" +
  "Формат: СЛОЖНОСТЬ | EN  ||  RU  ||  LV\n" +
  "".padEnd(80,"=") + "\n" + lines.join("\n") + "\n");

console.log("=== gen-find.js ===");
console.log("Прилагательных:", N, "в", NCATS, "категориях");
console.log("Доступно combos:  easy=%d medium=%d hard(all)=%d impossible(all)=%d",
  allCombos(1).length, allCombos(2).length, allCombos(3).length, allCombos(4).length);
console.log("В пуле:           easy=%d medium=%d hard=%d impossible=%d",
  POOL.easy.length, POOL.medium.length, POOL.hard.length, POOL.impossible.length);
console.log("ВСЕГО:", total);
console.log("Уникальных строк: en=%d ru=%d lv=%d",
  seenByLang.en.size, seenByLang.ru.size, seenByLang.lv.size);
console.log("Уникальность по каждому языку == всего ?",
  seenByLang.en.size===total && seenByLang.ru.size===total && seenByLang.lv.size===total);
console.log("min.json:", (fs.statSync(path.join(outDir,"find-pool.min.json")).size/1024).toFixed(1), "KB");
