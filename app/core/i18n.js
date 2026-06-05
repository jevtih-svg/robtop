/* RobTop — i18n (интернационализация). Ядро локализации без зависимостей.
   Единый источник правды по языку: активная локаль (localStorage), словари,
   перевод t(), множественные числа через Intl.PluralRules (en: one/other,
   ru: one/few/many, lv: zero/one/other), даты через Intl.DateTimeFormat,
   язык озвучки (TTS), перевод статического DOM по data-i18n и подписка onChange.

   Архитектура:
   - core/strings.js добавляет словари оболочки: RobTop.i18n.add({en,ru,lv}).
   - Каждый модуль приносит свои строки через контракт register({...,messages}).
   - Ключи — точечные пути: "home.tagline", "wishlist.tab.want", "err.bad_pin".
   - Множественное число: значение-объект {one,few,many,other,zero} + params.count.

   Чтобы добавить новый язык позже: расширить SUPPORTED/NATIVE/TAG/SPEECH здесь
   и добавить блок локали в core/strings.js и в messages каждого модуля. */
window.RobTop = window.RobTop || {};
(function (RT) {
  "use strict";

  var SUPPORTED = ["en", "ru", "lv"];     // порядок не важен; первый — не дефолт
  var DEFAULT = "en";                      // язык по умолчанию (фолбэк переводов)
  var NATIVE = { en: "English", ru: "Русский", lv: "Latviešu" }; // подписи в выборе языка
  var TAG = { en: "en", ru: "ru-RU", lv: "lv-LV" };     // BCP-47 для Intl (даты, числа)
  var SPEECH = { en: "en-US", ru: "ru-RU", lv: "lv-LV" }; // BCP-47 для Web Speech (TTS)
  var STORE_KEY = "robtop_locale";

  var dict = { en: {}, ru: {}, lv: {} }; // локаль -> вложенный словарь
  var listeners = [];                    // подписчики на смену языка
  var prCache = {};                      // кэш Intl.PluralRules по локали
  var current = null;

  /* ---- определение и хранение локали ---- */
  function detect() {
    try {
      var langs = (navigator.languages && navigator.languages.length)
        ? navigator.languages : [navigator.language || navigator.userLanguage || ""];
      for (var i = 0; i < langs.length; i++) {
        var l = String(langs[i] || "").toLowerCase();
        if (l.indexOf("ru") === 0) return "ru";
        if (l.indexOf("lv") === 0) return "lv";
        if (l.indexOf("en") === 0) return "en";
      }
    } catch (e) {}
    return DEFAULT;
  }
  function load() {
    var saved = null;
    try { saved = localStorage.getItem(STORE_KEY); } catch (e) {}
    if (saved && SUPPORTED.indexOf(saved) >= 0) return saved;
    return detect();
  }
  function persist(c) { try { localStorage.setItem(STORE_KEY, c); } catch (e) {} }

  /* ---- словари ---- */
  function deepMerge(target, src) {
    Object.keys(src || {}).forEach(function (k) {
      var v = src[k];
      if (v && typeof v === "object" && !Array.isArray(v)) {
        // объект с ключами множественного числа (one/few/many/other/zero) — лист, не сливаем глубже
        if (isPluralForms(v)) { target[k] = v; return; }
        target[k] = (target[k] && typeof target[k] === "object") ? target[k] : {};
        deepMerge(target[k], v);
      } else {
        target[k] = v;
      }
    });
  }
  function isPluralForms(o) {
    var keys = Object.keys(o), plu = { zero: 1, one: 1, two: 1, few: 1, many: 1, other: 1 };
    if (!keys.length) return false;
    for (var i = 0; i < keys.length; i++) { if (!plu[keys[i]]) return false; }
    return true;
  }
  // add({ en:{...}, ru:{...}, lv:{...} })
  function add(messages) {
    if (!messages) return;
    SUPPORTED.forEach(function (loc) { if (messages[loc]) deepMerge(dict[loc], messages[loc]); });
  }

  function lookup(loc, key) {
    var node = dict[loc], parts = key.split("."), i;
    for (i = 0; i < parts.length; i++) {
      if (node == null || typeof node !== "object") return undefined;
      node = node[parts[i]];
    }
    return node;
  }
  function resolve(key) {
    var v = lookup(current, key);
    if (v === undefined && current !== DEFAULT) v = lookup(DEFAULT, key);
    return v;
  }

  /* ---- интерполяция {name} ---- */
  function interp(str, params) {
    if (params == null) return str;
    return String(str).replace(/\{(\w+)\}/g, function (m, k) {
      return params[k] != null ? params[k] : m;
    });
  }

  /* ---- множественное число (Intl.PluralRules) ---- */
  function rules(loc) {
    if (prCache[loc] !== undefined) return prCache[loc];
    var r = null;
    try { r = new Intl.PluralRules(TAG[loc]); } catch (e) { r = null; }
    prCache[loc] = r; return r;
  }
  function category(n) {
    var r = rules(current);
    if (r) { try { return r.select(n); } catch (e) {} }
    return (n === 1 ? "one" : "other"); // грубый фолбэк, если Intl.PluralRules недоступен
  }
  function pickForm(forms, n) {
    var cat = category(n);
    var order = [cat, "other", "many", "few", "one", "two", "zero"];
    for (var i = 0; i < order.length; i++) {
      if (forms[order[i]] != null) return forms[order[i]];
    }
    for (var k in forms) { if (Object.prototype.hasOwnProperty.call(forms, k)) return forms[k]; }
    return "";
  }

  /* ---- перевод ---- */
  function t(key, params) {
    var v = resolve(key);
    if (v === undefined || v === null) {
      return (params && params.fallback != null) ? params.fallback : key;
    }
    if (typeof v === "object") {
      var n = params && (params.count != null ? params.count : params.n);
      if (n != null) return interp(pickForm(v, n), params);
      return (params && params.fallback != null) ? params.fallback : key; // объект без count — некорректный вызов
    }
    return interp(v, params);
  }
  // plural(n, key[, params]) — короткий путь для счётных подписей
  function plural(n, key, params) {
    var v = resolve(key);
    var p = {}; if (params) for (var k in params) p[k] = params[k];
    p.count = n; p.n = (p.n != null ? p.n : n);
    if (v == null || typeof v !== "object") return t(key, p);
    return interp(pickForm(v, n), p);
  }

  /* ---- даты ---- */
  function formatDate(value, opts) {
    try {
      var d = (value instanceof Date) ? value : new Date(value);
      return new Intl.DateTimeFormat(TAG[current], opts || { day: "numeric", month: "long" }).format(d);
    } catch (e) { return ""; }
  }

  /* ---- статический DOM (index.html) ---- */
  function each(root, sel, fn) {
    var nodes = (root || document).querySelectorAll(sel);
    Array.prototype.forEach.call(nodes, fn);
  }
  function applyDom(root) {
    each(root, "[data-i18n]", function (el) { el.textContent = t(el.getAttribute("data-i18n")); });
    each(root, "[data-i18n-html]", function (el) { el.innerHTML = t(el.getAttribute("data-i18n-html")); });
    each(root, "[data-i18n-aria]", function (el) { el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria"))); });
    each(root, "[data-i18n-ph]", function (el) { el.setAttribute("placeholder", t(el.getAttribute("data-i18n-ph"))); });
  }

  /* ---- смена языка ---- */
  function setLocale(c) {
    if (SUPPORTED.indexOf(c) < 0 || c === current) return;
    current = c; persist(c);
    try { document.documentElement.lang = c; } catch (e) {}
    listeners.slice().forEach(function (fn) { try { fn(c); } catch (e) {} });
  }

  /* ---- инициализация ---- */
  current = load();
  try { document.documentElement.lang = current; } catch (e) {}

  RT.i18n = {
    supported: SUPPORTED.slice(),
    native: function (c) { return NATIVE[c] || c; },
    add: add,
    t: t,
    plural: plural,
    formatDate: formatDate,
    tag: function () { return TAG[current]; },
    speechLang: function () { return SPEECH[current]; },
    get: function () { return current; },
    set: setLocale,
    onChange: function (fn) { if (typeof fn === "function" && listeners.indexOf(fn) < 0) listeners.push(fn); },
    offChange: function (fn) { var i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); },
    apply: applyDom
  };
})(window.RobTop);
