/* RobTop — генератор пулов смешных имён для модуля «names».
   4 пула × 10000 уникальных имён: ru / en / lv / de. Имя = корень (кончается согласной) +
   суффикс (начинается гласной) → произносимо. Фильтры: blacklist подстрок по ГОТОВОМУ
   имени (ловит и стыки), длина 4..13, без двойной буквы на стыке, уникальность.
   Seed фиксирован → результат воспроизводим. Запуск: node gen_names.js
   Пополнение пула в будущем: добавить корней/суффиксов, НЕ меняя старые списки и seed —
   первые 10000 позиций должны остаться прежними (указатели детей!); новые имена брать
   срезом pool.slice(10000, 20000) и ДОБАВЛЯТЬ в конец строки пула в module.js. */
"use strict";
const fs = require("fs");

function mulberry32(a){ return function(){ a|=0; a=(a+0x6D2B79F5)|0; let t=Math.imul(a^(a>>>15),1|a); t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; }; }
function shuffle(arr, rnd){ for(let i=arr.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); const t=arr[i]; arr[i]=arr[j]; arr[j]=t; } return arr; }

/* ============================ RU ============================ */
const RU_ROOTS = [
/* звуки и движения */
"Пуп","Бубл","Шмяк","Кряк","Хрюм","Жуж","Мурз","Тюф","Пыхт","Шлёп",
"Чмок","Бурк","Фырк","Чих","Пшик","Бульк","Шурш","Квак","Хрум","Чавк",
"Сопелк","Бряк","Дрыг","Кувырк","Топот","Шмыг","Цок","Бум","Бах","Плюх",
"Тарахт","Громыхт","Звяк","Тыдыщ","Шарах","Бабах","Свистул","Грох","Скрип","Шорох",
/* еда */
"Карапуз","Барабул","Кукурум","Мармелад","Бутерброд","Пельмеш","Компот","Кисел","Багет","Понч",
"Огурч","Помидор","Картош","Макарон","Сосис","Зефир","Ватруш","Оладуш","Сырн","Блинч",
"Котлет","Борщ","Укроп","Лимон","Кабач","Тыкв","Редис","Горох","Фасол","Кефир",
"Йогурт","Творог","Сметан","Пломбир","Ирис","Леденч","Карамел","Шоколад","Печенюх","Лапш",
"Вермишел","Сухар","Крендел","Прян","Кекс","Маффин","Батон","Плюшк","Вафел","Изюм",
/* зverюшки и козявки */
"Бегемош","Крокозябр","Тушканч","Хомяч","Шушпанч","Кузнеч","Светляч","Мотыл","Гусениц","Барбос",
"Мурлык","Тявк","Цыпл","Утёнк","Карас","Окунёк","Бобр","Сурок","Хорёк","Ёжup",
/* штуки */
"Шкварк","Плюш","Подуш","Помпон","Бант","Пугов","Тапк","Носк","Калош","Валенк",
"Чемодан","Самовар","Абажур","Будильник","Пылесос","Карандаш","Ластик","Циркул","Глобус","Рюкзак"
];
const RU_SUF = [
"ик","ика","ыш","ышка","уля","улька","уня","унька","ончик","ёнок",
"астик","озавр","ундель","ундра","япа","япка","ушка","юшка","ёша","оша",
"евич","ович","евна","овна","оид","ямба","юмба","омба","имба","улечка",
"енция","авр","озябр","юк","юка","ёжик","атор","изатор","якля","юкля",
"ямс","умс","эль","юэль","офель","ампус","импус","омпус","яша","юша",
"ентий","антий","ольд","ильд","юпель","япель","арий","иус","умус","инго",
"анго","онго","утти","етти","отти","юндель","ябка","авка","явка","ушок",
"ишок","ынь","юнь","ясик","юсик","ёночек","арик","ярик","юрик","ыч",
"ычок","альдо","эльдо","уффин","аффин","ябло","ублик","япус","юпус","анчо",
"ончо","умба","ёмба","уй-нет","андр","ондр","авчик","явчик","ютик","ятик"
];

/* ============================ EN ============================ */
const EN_ROOTS = [
"Wobbl","Snork","Bumbl","Floof","Squish","Blob","Noodl","Pickl","Snugg","Wigg",
"Giggl","Bork","Honk","Boop","Zoom","Splat","Munch","Crumb","Fluff","Puff",
"Squeak","Snoot","Dood","Bloop","Zigzag","Wump","Thump","Bonk","Clonk","Dink",
"Flap","Flip","Goob","Gloop","Greeb","Hupp","Jibb","Jumbl","Kerfuff","Knick",
"Lump","Mumbl","Nubb","Plink","Quibb","Rumbl","Scoot","Skedaddl","Slosh","Smudg",
"Sniff","Snor","Splish","Spronk","Squabb","Squirm","Stomp","Swish","Tinker","Toddl",
"Tumbl","Twirl","Twizzl","Waddl","Waffl","Whiff","Whisk","Wiggl","Womp","Yodel",
"Zapp","Zibb","Zonk","Zoodl","Zwiff","Blump","Brizz","Chonk","Chumbl","Clump",
"Crinkl","Dabb","Dimpl","Dribbl","Drizzl","Fidg","Flick","Frizz","Fumbl","Gargl",
"Glimm","Gobbl","Griddl","Hiccup","Hobnob","Jangl","Jiggl","Jingl","Mizzl","Mopp",
"Nibbl","Pebbl","Pluff","Pumpernick","Quigg","Razzl","Scribbl","Shimm","Skipp","Snizz",
"Sprink","Squiggl","Trundl","Twink","Whizz","Wonk","Bibbl","Boggl","Bripp","Chizz"
];
const EN_SUF = [
"ington","opolis","aroo","ums","ikins","ovich","inator","ifer","ozoid","umph",
"izzle","oodle","uffle","obble","eebee","yboo","ypants","ysocks","ynose","erton",
"erson","insky","owitz","enheimer","ledink","ledonk","lebop","lepop","ledoo","abee",
"aboo","adoodle","amajig","amabob","yface","ytoes","erkins","erdoodle","ersnap","ersnoot",
"erpuff","erfluff","ernoodle","erbop","erblat","erzoom","ersquish","ywig","ywag","ledee",
"ledum","obee","oboo","obop","odink","odonk","ofluff","onoodle","opuff","ysnort",
"ygiggle","ywomp","ybonk","yhonk","ydoodle","ysquish","ysplat","ywhirl","ytwirl","aplooza",
"apalooza","eroni","aroni","ipops","ydoo","ydee","ybug","ybear","erbean","ybean",
"obean","abean","ohonk","obonk","owomp","osplat","oswish","erjig","yjig","ojig",
"erwig","owig","erbug","obug","erbee","erboo","erdink","ywink","owink","erwink"
];

/* ============================ LV ============================ */
const LV_ROOTS = [
"Burb","Mur","Ķep","Ņam","Šļup","Plunk","Knab","Pīkst","Čab","Čīkst",
"Grab","Krāc","Šņāc","Urb","Mudž","Ņurd","Burkš","Tarkš","Klab","Klunkur",
"Bimb","Bumb","Dimd","Dund","Žvadz","Šļak","Plek","Plak","Blīkš","Brīkš",
"Knikš","Knakš","Šmiks","Šmaks","Čāp","Tip","Lēkš","Diedel","Vāvul","Burbul",
"Mudžek","Pankūk","Klimper","Knapš","Šļirk","Žvīk","Svilp","Sprauk","Čivul","Vidžin",
"Tirkš","Cilp","Kūleņ","Ķirb","Gurķ","Burkān","Kartupel","Klimp","Cīrul","Zvirbul",
"Bizbiz","Mušel","Vabol","Sienāz","Kamol","Pogel","Bumbul","Virvel","Žagat","Dzeguz",
"Susur","Sermul","Makaron","Cepum","Rasol","Pelmeņ","Šūpol","Sniegpārsl","Varavīksn","Klabiķ",
"Knauķ","Šmurgul","Ķiķin","Smaidiņ","Lampiņ","Podiņ","Spainīt","Slotiņ","Pumpurķ","Zvaniņ",
"Cukurgail","Medenīt","Karamel","Vafel","Biskvīt","Rausīt","Klucīš","Ritul","Spolīš","Mezglīš",
"Pufiņ","Migliņ","Vējiņ","Sniedziņ","Lāsumiņ","Raibul","Strīpul","Punktul","Rullīš","Knopiņ"
];
const LV_SUF = [
"iņš","ītis","elis","ulis","ēns","uks","astiņš","umiņš","ozaurs","ungs",
"ulītis","elītis","ēniņš","uciņš","ainis","onis","ūzis","āzis","umpis","ākslis",
"ēklis","ūklis","amba","umba","imba","onga","unga","inga","ucis","īcis",
"ācis","ēcis","ūcis","apsis","upsis","ipsis","opsis","ausis","ūsis","ālis",
"ūlis","īlis","andis","undis","indis","ondis","atis","utis","itis","otis",
"ankis","unkis","inkis","onkis","āns","ūns","īns","avs","ains","umucis",
"amucis","imucis","omucis","abuks","ubuks","ibuks","obuks","aknis","uknis","iknis",
"oknis","ampis","ules","aste","uste","anda","unda","inda","onda","ūka",
"īka","ēka","apa","upa","ipa","opa","ariņš","uriņš","iriņš","oriņš",
"abullis","ubullis","ibullis","obullis","ēvelis","āvelis","ūvelis","aņķis","uņķis","iņķis"
];

/* ============================ blacklist (по готовому имени, lower) ============================ */
const BAD = {
ru: ["хуй","хуе","хуё","хую","пизд","бля","ёб","еба","ебл","ебу","ебё","говн","жоп","жёп","дерьм","срак","сран","ссан","перд","бзд","дроч","манд","хер","шлюх","залуп","елд","гнид","дебил","идиот","урод","смерт","убий","какаш","сися","писюн","анус","анал","секс","сатан","дьявол","члену","членik"],
en: ["fuck","shit","cunt","dick","cock","puss","piss","fart","boob","butt","tits","sex","porn","nigg","rape","damn","poop","crap","arse","anus","anal","nazi","kill","dead","ass","wank","jerk","barf","puke","pee"],
lv: ["dirs","sūd","sud","pimp","pis","mauk","kuce","stulb","idiot","kaka","bezd","pup","mēsl","mesl","velns","nāve","nave","sūk","suk","direk","urin","urīn"]
};

function isBad(name, lang){ const low = name.toLowerCase(); return BAD[lang].some(b=>low.includes(b)); }
const VOW = { ru:"аеёиоуыэюя", en:"aeiouy", lv:"aāeēiīoōuūy" };
function startsVowel(s, lang){ return VOW[lang].includes(s[0].toLowerCase()); }
function endsVowel(s, lang){ return VOW[lang].includes(s[s.length-1].toLowerCase()); }

function build(lang, roots, sufs, seed){
  roots = Array.from(new Set(roots)); sufs = Array.from(new Set(sufs));
  const out = new Set();
  for(const r of roots){
    if(endsVowel(r, lang) || /[ьъ]$/i.test(r)) continue;   /* корень: согласная на конце, без ь/ъ */
    for(const sf of sufs){
      if(!startsVowel(sf, lang)) continue;
      if(r[r.length-1].toLowerCase() === sf[0].toLowerCase()) continue; /* двойная буква на стыке */
      const name = r + sf;
      if(name.length < 4 || name.length > 13) continue;
      if(/[^а-яёА-ЯЁ]/.test(name) && lang==="ru") continue;
      if(/[^a-zA-Z]/.test(name) && lang==="en") continue;
      if(isBad(name, lang)) continue;
      out.add(name);
    }
  }
  const arr = shuffle(Array.from(out), mulberry32(seed));
  return { roots: roots.length, sufs: sufs.length, total: out.size, pool: arr.slice(0, 10000) };
}

function readEmbeddedDePool(){
  const p = require("path").join(__dirname, "..", "app", "modules", "names", "module.js");
  let s = "";
  try{ s = fs.readFileSync(p, "utf8"); }catch(e){ return { roots: 0, sufs: 0, total: 0, pool: [] }; }
  const m = s.match(/var RAW_DE=\s*([\s\S]*?);\s*var POOLS=/);
  if(!m) return { roots: 0, sufs: 0, total: 0, pool: [] };
  const parts = [];
  const re = /"([^"]*)"/g;
  let x;
  while((x = re.exec(m[1]))) parts.push(x[1]);
  const pool = parts.join("").split("|").filter(Boolean);
  return { roots: 0, sufs: 0, total: pool.length, pool: pool.slice(0, 10000) };
}

const res = {
  ru: build("ru", RU_ROOTS, RU_SUF, 20260607),
  en: build("en", EN_ROOTS, EN_SUF, 20260608),
  lv: build("lv", LV_ROOTS, LV_SUF, 20260609),
  de: readEmbeddedDePool()
};

let ok = true;
for(const lang of ["ru","en","lv","de"]){
  const r = res[lang];
  console.log(lang.toUpperCase(), "roots:", r.roots, "sufs:", r.sufs, "raw unique:", r.total, "pool:", r.pool.length);
  console.log("  samples:", r.pool.slice(0, 22).join(", "));
  const lens = r.pool.map(n=>n.length);
  if(r.pool.length){ console.log("  len min/max/avg:", Math.min(...lens), Math.max(...lens), (lens.reduce((a,b)=>a+b,0)/lens.length).toFixed(1)); }
  if(r.pool.length < 10000){ console.log("  !!! НЕ ХВАТАЕТ:", 10000 - r.pool.length); ok = false; }
  if(new Set(r.pool).size !== r.pool.length){ console.log("  !!! ДУБЛИ"); ok = false; }
  for(const n of r.pool){ if(BAD[lang] && isBad(n, lang)){ console.log("  !!! BAD прошёл:", n); ok = false; break; } }
}
console.log(ok ? "OK" : "FAIL");

function emit(lang){
  const pool = res[lang].pool;
  if(pool.length !== 10000) return;
  const lines = [];
  for(let i=0;i<pool.length;i+=12){
    const chunk = pool.slice(i,i+12).join("|");
    lines.push('"' + chunk + (i+12<pool.length ? "|" : "") + '"');
  }
  fs.writeFileSync(`pool_${lang}.txt`, lines.join("\n+"));
}
if(ok) ["ru","en","lv","de"].forEach(emit);
