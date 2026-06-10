/* RobTop — service worker: ТОЛЬКО Web Push (никакого кэширования и перехвата fetch —
   деплой не должен воевать с SW-кэшем; cache-busting остаётся на ?v=RT_VER).
   Регистрируется как sw.js?lang=<язык>&v=<версия>: язык в query (словарей i18n в SW нет),
   смена версии/языка обновляет SW автоматически.
   Пуш НЕСЁТ РЕАЛЬНЫЙ ТЕКСТ (с v2026.06.07.68): сервер (api/_push.php) шифрует payload
   JSON {title, body, url} на языке устройства — показываем его. Общий текст TXT остаётся
   ФОЛБЭКОМ на случай пуша без тела (подписка без ключей шифрования). */
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
  try { url = new URL(url, self.location.href).href; } catch (err) { url = "./"; }
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) {
      if ("focus" in list[i]) {
        if ("navigate" in list[i]) {
          return list[i].navigate(url).then(function (c) { return c ? c.focus() : list[i].focus(); });
        }
        return list[i].focus();
      }
    }
    if (self.clients.openWindow) return self.clients.openWindow(url);
  }));
});
