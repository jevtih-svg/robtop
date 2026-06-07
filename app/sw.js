/* RobTop — service worker: ТОЛЬКО Web Push (никакого кэширования и перехвата fetch —
   деплой не должен воевать с SW-кэшем; cache-busting остаётся на ?v=RT_VER).
   Регистрирует core/notify.js как sw.js?lang=<язык>&v=<версия>: язык приходит
   в query (словарей i18n в SW нет), смена версии/языка обновляет SW автоматически.
   Пуш приходит «звонком» БЕЗ payload (api/_push.php): показываем общий локализованный
   текст; настоящий список — в центре оповещений приложения. Если когда-нибудь придёт
   payload (JSON {title, body, url}) — покажем его (задел на будущее). */
var LANG = (function () {
  try { return new URL(self.location.href).searchParams.get("lang") || "en"; }
  catch (e) { return "en"; }
})();
var TXT = {
  en: { title: "RobTop", body: "You have a new notification" },
  ru: { title: "RobTop", body: "У тебя новое оповещение" },
  lv: { title: "RobTop", body: "Tev ir jauns paziņojums" }
};

self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener("push", function (e) {
  var t = TXT[LANG] || TXT.en, title = t.title, body = t.body, url = "./";
  if (e.data) {
    try {
      var d = e.data.json();
      if (d && d.title) title = String(d.title);
      if (d && d.body) body = String(d.body);
      if (d && d.url) url = String(d.url);
    } catch (err) { /* не JSON — остаёмся на общем тексте */ }
  }
  e.waitUntil(self.registration.showNotification(title, {
    body: body,
    tag: "rt-ntf",                      /* новые заменяют старую плашку, а не копятся */
    icon: "media/icon/icon-192.png",
    badge: "media/icon/icon-192.png",
    data: { url: url }
  }));
});

self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || "./";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) {
      if ("focus" in list[i]) return list[i].focus();
    }
    if (self.clients.openWindow) return self.clients.openWindow(url);
  }));
});
