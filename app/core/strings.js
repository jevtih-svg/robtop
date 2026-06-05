/* RobTop — словари оболочки (core). Регистрируются в движке i18n.
   Здесь: общие слова, главный экран, HUD, имена плиток, настройки, магазин,
   ошибки (включая коды ошибок PHP-бэкенда). Строки модулей — в их module.js.

   Добавить язык: скопировать блок en и перевести; добавить код локали в core/i18n.js. */
(function (RT) {
  "use strict";
  if (!RT || !RT.i18n) return;

  RT.i18n.add({
    /* =================== ENGLISH (default) =================== */
    en: {
      common: {
        cancel: "Cancel", close: "Close", save: "Save", delete: "Delete",
        yes: "Yes", no: "No", done: "Done", undo: "Undo", enter: "Enter",
        demo: "demo", removed: "Removed", failed: "Couldn't do that",
        back: "Back", confirmTitle: "Confirm?"
      },
      home: { tagline: "Choose an app" },
      hud: { apps: "apps", available: "available" },
      tile: {
        status: { open: "Open", soon: "Soon" },
        soonToast: "{name}: soon!",
        wishlist: "Wishlist", reverse: "Words Backwards", mood: "Mood of the Day",
        teeth: "Toothbrushing Timer", guess: "Guess the Number", names: "Funny Names",
        days: "Day Counter", find: "Find the Object", museum: "Home Museum",
        rating: "Day Rating", lost: "Lost & Found", bank: "Piggy Bank", dice: "Dice"
      },
      settings: {
        open: "Settings", title: "Settings", language: "Language",
        manageApps: "Manage apps"
      },
      store: {
        title: "Apps", adminNote: "App management is for a parent.",
        installed: "Installed", installApp: "Install an app",
        pickBundle: "📦 Pick a bundle (.robtop.json)",
        up: "Up", down: "Down", remove: "Remove", toggle: "On / off",
        srcInstalled: "installed", srcBuiltin: "built-in", soonSuffix: " · soon",
        failPin: "Couldn't (PIN?)", installedToast: "Installed: {name}",
        uninstallTitle: "Remove app?", uninstallText: "Data and events will be kept."
      },
      err: {
        bad_pin: "Wrong PIN",
        install_failed: "Couldn't install", install_error: "Install error",
        bundle_not_json: "Broken bundle (not JSON)",
        bundle_no_manifest: "Bundle has no manifest/files",
        bad_id: "Invalid app id",
        server_code_denied: "Server code in a bundle is not allowed",
        module_load: "Module didn't load", module_error: "Module error",
        module_open: "Couldn't open “{name}”",
        config_missing: "config.php not found",
        db_failed: "Couldn't connect to the database",
        not_image: "This is not an image",
        expected_image: "An image is expected (png/jpg/webp/gif)",
        corrupt_data: "Corrupted data",
        file_too_big: "File is too big",
        save_failed: "Couldn't save the file",
        need_manifest: "manifest and files are required",
        reserved_id: "Reserved id",
        cant_replace_native: "Can't replace a built-in module",
        bad_filename: "Bad file name: {name}",
        bad_type: "Disallowed type: {name}",
        bundle_too_big: "Bundle is too big",
        no_module_js: "Bundle has no module.js",
        no_apps_dir: "No permission for the apps folder",
        write_failed: "Couldn't write {name}",
        cant_uninstall_native: "Can't remove a built-in module"
      }
    },

    /* =================== РУССКИЙ =================== */
    ru: {
      common: {
        cancel: "Отмена", close: "Закрыть", save: "Сохранить", delete: "Удалить",
        yes: "Да", no: "Нет", done: "Готово", undo: "Отменить", enter: "Войти",
        demo: "демо", removed: "Удалено", failed: "Не удалось",
        back: "Назад", confirmTitle: "Подтвердить?"
      },
      home: { tagline: "Выбери приложение" },
      hud: { apps: "приложений", available: "доступно" },
      tile: {
        status: { open: "Открыть", soon: "Скоро" },
        soonToast: "{name}: скоро!",
        wishlist: "Виш-лист", reverse: "Слова наоборот", mood: "Настроение дня",
        teeth: "Таймер чистки зубов", guess: "Угадай число", names: "Смешные имена",
        days: "Счётчик дней", find: "Найти предмет", museum: "Домашний музей",
        rating: "Оценка дня", lost: "Бюро находок", bank: "Копилка", dice: "Кубик"
      },
      settings: {
        open: "Настройки", title: "Настройки", language: "Язык",
        manageApps: "Управление приложениями"
      },
      store: {
        title: "Приложения", adminNote: "Управление приложениями — для родителя.",
        installed: "Установленные", installApp: "Установить приложение",
        pickBundle: "📦 Выбрать бандл (.robtop.json)",
        up: "Выше", down: "Ниже", remove: "Удалить", toggle: "Вкл / выкл",
        srcInstalled: "установлено", srcBuiltin: "встроено", soonSuffix: " · скоро",
        failPin: "Не удалось (PIN?)", installedToast: "Установлено: {name}",
        uninstallTitle: "Удалить приложение?", uninstallText: "Данные и события сохранятся."
      },
      err: {
        bad_pin: "Неверный PIN",
        install_failed: "Не удалось установить", install_error: "Ошибка установки",
        bundle_not_json: "Битый бандл (не JSON)",
        bundle_no_manifest: "В бандле нет manifest/files",
        bad_id: "Неверный id приложения",
        server_code_denied: "Серверный код в бандле запрещён",
        module_load: "Модуль не загрузился", module_error: "Ошибка модуля",
        module_open: "Не удалось открыть «{name}»",
        config_missing: "config.php не найден",
        db_failed: "Не удалось подключиться к базе данных",
        not_image: "Это не изображение",
        expected_image: "Ожидается картинка (png/jpg/webp/gif)",
        corrupt_data: "Повреждённые данные",
        file_too_big: "Файл слишком большой",
        save_failed: "Не удалось сохранить файл",
        need_manifest: "Нужны manifest и files",
        reserved_id: "Зарезервированный id",
        cant_replace_native: "Нельзя заменить встроенный модуль",
        bad_filename: "Плохое имя файла: {name}",
        bad_type: "Недопустимый тип: {name}",
        bundle_too_big: "Бандл слишком большой",
        no_module_js: "В бандле нет module.js",
        no_apps_dir: "Нет прав на папку apps",
        write_failed: "Не удалось записать {name}",
        cant_uninstall_native: "Нельзя удалить встроенный модуль"
      }
    },

    /* =================== LATVIEŠU =================== */
    lv: {
      common: {
        cancel: "Atcelt", close: "Aizvērt", save: "Saglabāt", delete: "Dzēst",
        yes: "Jā", no: "Nē", done: "Gatavs", undo: "Atsaukt", enter: "Ienākt",
        demo: "demo", removed: "Izdzēsts", failed: "Neizdevās",
        back: "Atpakaļ", confirmTitle: "Apstiprināt?"
      },
      home: { tagline: "Izvēlies lietotni" },
      hud: { apps: "lietotnes", available: "pieejamas" },
      tile: {
        status: { open: "Atvērt", soon: "Drīz" },
        soonToast: "{name}: drīz!",
        wishlist: "Vēlmju saraksts", reverse: "Vārdi otrādi", mood: "Dienas garastāvoklis",
        teeth: "Zobu tīrīšanas taimeris", guess: "Uzmini skaitli", names: "Smieklīgi vārdi",
        days: "Dienu skaitītājs", find: "Atrodi priekšmetu", museum: "Mājas muzejs",
        rating: "Dienas vērtējums", lost: "Atradumu birojs", bank: "Krājkase", dice: "Kauliņš"
      },
      settings: {
        open: "Iestatījumi", title: "Iestatījumi", language: "Valoda",
        manageApps: "Pārvaldīt lietotnes"
      },
      store: {
        title: "Lietotnes", adminNote: "Lietotņu pārvaldība ir vecākiem.",
        installed: "Instalētās", installApp: "Instalēt lietotni",
        pickBundle: "📦 Izvēlies pakotni (.robtop.json)",
        up: "Augšup", down: "Lejup", remove: "Noņemt", toggle: "Ieslēgt / izslēgt",
        srcInstalled: "instalēts", srcBuiltin: "iebūvēts", soonSuffix: " · drīz",
        failPin: "Neizdevās (PIN?)", installedToast: "Instalēts: {name}",
        uninstallTitle: "Noņemt lietotni?", uninstallText: "Dati un notikumi tiks saglabāti."
      },
      err: {
        bad_pin: "Nepareizs PIN",
        install_failed: "Neizdevās instalēt", install_error: "Instalēšanas kļūda",
        bundle_not_json: "Bojāta pakotne (nav JSON)",
        bundle_no_manifest: "Pakotnē nav manifest/files",
        bad_id: "Nederīgs lietotnes id",
        server_code_denied: "Servera kods pakotnē nav atļauts",
        module_load: "Modulis neielādējās", module_error: "Moduļa kļūda",
        module_open: "Neizdevās atvērt “{name}”",
        config_missing: "config.php nav atrasts",
        db_failed: "Neizdevās savienoties ar datubāzi",
        not_image: "Šis nav attēls",
        expected_image: "Tiek gaidīts attēls (png/jpg/webp/gif)",
        corrupt_data: "Bojāti dati",
        file_too_big: "Fails ir pārāk liels",
        save_failed: "Neizdevās saglabāt failu",
        need_manifest: "Nepieciešami manifest un files",
        reserved_id: "Rezervēts id",
        cant_replace_native: "Nevar aizstāt iebūvētu moduli",
        bad_filename: "Slikts faila nosaukums: {name}",
        bad_type: "Neatļauts tips: {name}",
        bundle_too_big: "Pakotne ir pārāk liela",
        no_module_js: "Pakotnē nav module.js",
        no_apps_dir: "Nav atļaujas apps mapei",
        write_failed: "Neizdevās ierakstīt {name}",
        cant_uninstall_native: "Nevar noņemt iebūvētu moduli"
      }
    }
  });
})(window.RobTop);
