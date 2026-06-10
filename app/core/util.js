/* RobTop — общие чистые утилиты ядра (Ф0 ОС-рефакторинга).
   Раньше esc/pad2/dayKey/uid дублировались в КАЖДОМ модуле (esc — 16 копий).
   Теперь один источник правды: RobTop.util.* (и sdk.util.* для нового кода).
   ВАЖНО: только чистые функции, без DOM и без сети — их зовут и модули, и ядро.
   Грузится в index.html ДО core/sdk.js, поэтому RobTop.util готов к моменту монтирования модуля. */
window.RobTop = window.RobTop || {};
(function(RT){
  "use strict";
  var ESC_MAP={ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#39;" };
  /* esc — экранирование HTML (текст и атрибуты в двойных кавычках). Идентично 16 прежним копиям. */
  function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g, function(c){ return ESC_MAP[c]; }); }
  /* escAttr — синоним esc (набор включает кавычки), для читаемости в местах с атрибутами. */
  function escAttr(s){ return esc(s); }
  /* uid — короткий клиентский идентификатор (время+рандом), как в прежних копиях и sdk. */
  function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
  /* pad2 — двузначное число с ведущим нулём. */
  function pad2(n){ return (n<10?"0":"")+n; }
  /* dayKey(d?) — локальная дата устройства YYYY-MM-DD с ведущими нулями (ключ «одна запись на день»). */
  function dayKey(d){ d=d||new Date(); return d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate()); }
  function mediaUrl(s){
    s=String(s==null?"":s);
    return s.indexOf("uploads/")===0 ? ("api/image.php?p="+encodeURIComponent(s)) : s;
  }
  RT.util = { esc:esc, escAttr:escAttr, uid:uid, pad2:pad2, dayKey:dayKey, mediaUrl:mediaUrl };
})(window.RobTop);
