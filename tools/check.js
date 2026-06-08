#!/usr/bin/env node
/* RobTop — линтер гардрейлов (Ф8 ОС-рефакторинга, канон ПЛАН-ОС-архитектура.md).
   Лёгкая текстовая проверка БЕЗ зависимостей: ловит грубые нарушения «конституции» (G0-G10)
   и рассинхрон версии. Запуск из корня репо:  node tools/check.js
   Коды: errors → exit 1 (для CI), только warnings → exit 0. Не понимает семантику — это «сетка
   безопасности», а не доказательство корректности. */
"use strict";
var fs = require("fs"), path = require("path");
var ROOT = path.resolve(__dirname, "..");
var APP = path.join(ROOT, "app"), MODS = path.join(APP, "modules");

var errors = [], warns = [];
function err(m){ errors.push(m); }
function warn(m){ warns.push(m); }
function read(f){ try{ return fs.readFileSync(f, "utf8"); }catch(e){ return ""; } }
function listModules(){
  try{ return fs.readdirSync(MODS).filter(function(d){ return fs.existsSync(path.join(MODS, d, "module.js")); }); }
  catch(e){ return []; }
}

/* ---- G8: версия согласована в index.html и есть в публичном changelog ---- */
function checkVersion(){
  var html = read(path.join(APP, "index.html"));
  var m = html.match(/RT_VER\s*=\s*"([0-9.]+)"/);
  if(!m){ err("version: не найден window.RT_VER в index.html"); return; }
  var ver = m[1];
  var all = html.match(/2026\.\d{2}\.\d{2}\.\d+/g) || [];
  var bad = all.filter(function(v){ return v !== ver; });
  if(bad.length) err("version: в index.html версии расходятся с RT_VER="+ver+": "+Array.from(new Set(bad)).join(", "));
  else console.log("  version: index.html единообразно на "+ver+" ("+all.length+" мест)");
}

/* Известные задокументированные исключения G1 (fixed). Новые модули по-прежнему ловятся как ошибка.
   chat — выделенный слой #chApp в <body> по дизайну (iOS-клавиатура); shop — плавающая корзина,
   TODO перенести на токен/sdk.float в UI-фазе. */
var EXEMPT_FIXED = { chat:"слой #chApp по дизайну", shop:"корзина — TODO на токен/sdk.float" };

/* ---- G1: модуль не использует position:fixed (рамку/плавающее рисует ядро) ---- */
function checkFixed(mods){
  mods.forEach(function(id){
    var css = read(path.join(MODS, id, "module.css"));
    if(!/position\s*:\s*fixed/i.test(css)) return;
    if(EXEMPT_FIXED[id]) warn("G1 ["+id+"]: position:fixed (известное исключение: "+EXEMPT_FIXED[id]+")");
    else err("G1 ["+id+"]: position:fixed в module.css (fixed рисует ядро через sdk)");
  });
}

/* ---- G0: модуль не ходит в сеть напрямую (только через sdk) ---- */
function checkNoDirectNet(mods){
  mods.forEach(function(id){
    var js = read(path.join(MODS, id, "module.js"));
    if(/\bfetch\s*\(/.test(js)) warn("G0 ["+id+"]: прямой fetch( в module.js (ожидается sdk.api/sdk.data)");
    if(/\bXMLHttpRequest\b/.test(js)) warn("G0 ["+id+"]: XMLHttpRequest в module.js");
  });
}

/* ---- Ф0: модуль не держит собственную ЛОГИКУ esc (делегирование в RobTop.util — ок) ---- */
function checkEsc(mods){
  mods.forEach(function(id){
    var js = read(path.join(MODS, id, "module.js"));
    if(/function esc\(s\)\{\s*return String\(/.test(js)) warn("Ф0 ["+id+"]: своя логика esc (ожидается делегирование RobTop.util.esc)");
  });
}

/* ---- G3: модуль, который зовёт points.add, обязан заявить permission "points" ---- */
function checkPointsPerm(mods){
  mods.forEach(function(id){
    var js = read(path.join(MODS, id, "module.js"));
    if(!/\.points\.add\s*\(/.test(js)) return;
    var mf = read(path.join(MODS, id, "module.json")), perms = [];
    try{ perms = (JSON.parse(mf).permissions) || []; }catch(e){}
    if(perms.indexOf("points") < 0) err("G3 ["+id+"]: зовёт points.add, но в манифесте нет permission \"points\"");
  });
}

/* ---- i18n: модуль, использующий sdk.media.upload/pick, должен заявить permission "camera" ---- */
function checkCameraPerm(mods){
  mods.forEach(function(id){
    var js = read(path.join(MODS, id, "module.js"));
    if(!/\.media\.(upload|pick)\s*\(/.test(js) && !/getUserMedia/.test(js)) return;
    var mf = read(path.join(MODS, id, "module.json")), perms = [];
    try{ perms = (JSON.parse(mf).permissions) || []; }catch(e){}
    if(perms.indexOf("camera") < 0) warn("media ["+id+"]: использует камеру/загрузку, но нет permission \"camera\"");
  });
}

console.log("RobTop guardrail check");
var mods = listModules();
console.log("  модулей: "+mods.length);
checkVersion();
checkFixed(mods);
checkNoDirectNet(mods);
checkEsc(mods);
checkPointsPerm(mods);
checkCameraPerm(mods);

console.log("");
if(warns.length){ console.log("WARN ("+warns.length+"):"); warns.forEach(function(w){ console.log("  - "+w); }); }
if(errors.length){ console.log("ERRORS ("+errors.length+"):"); errors.forEach(function(e){ console.log("  ! "+e); }); }
if(!warns.length && !errors.length) console.log("OK: нарушений не найдено");
process.exit(errors.length ? 1 : 0);
