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
      home: { tagline: "Choose an app", soonSep: "Coming soon" },
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
      family: {
        title: "Family",
        empty: "No children yet.",
        addChild: "Add a child", addHint: "Only a nickname. No email for children.",
        nickPh: "Child's nickname", addBtn: "Create",
        created: "{name} created. First sign-in password: 1234",
        nickTaken: "This nickname is taken",
        invite: "Invite second parent", inviteHint: "They get parent rights. Enter their email.",
        inviteBtn: "Create invitation",
        linkHint: "Send this link. It works once and expires in 7 days.",
        copy: "Copy link", copied: "Copied",
        resetPass: "Reset password", resetConfirm: "Reset {name}'s password to the one-time 1234?",
        resetDone: "{name}: password is 1234 again, they will set a new one at sign-in",
        block: "Block account", unblock: "Unblock account",
        blockConfirm: "Block {name}? They won't be able to sign in. Data is kept.",
        unblockConfirm: "Unblock {name}?",
        blockDone: "{name} is blocked", unblockDone: "{name} can sign in again",
        blocked: "blocked"
      },
      friend: {
        title: "Friends",
        hint: "You can invite a friend — they'll get their own RobTop.",
        invite: "Invite a friend",
        sheetHint: "Your friend will pick a nickname (never a real name!) and get their own RobTop. Until their parent joins, your parent looks after their account.",
        makeLink: "Create link",
        sendHint: "Send this link to your friend. It works for 7 days."
      },
      reg: {
        link: "I am a new parent — create a family",
        nickPh: "Your nickname",
        title: "Create your family",
        hint: "Parents sign up with email. You'll add children inside, they need only a nickname.",
        btn: "Create family",
        fail: "Couldn't create: check email and nickname (maybe taken)"
      },
      lock: { hint: "Sign in to continue", title: "Who is signing in?" },
      account: {
        title: "Account",
        loading: "Checking who is signed in…",
        loginHint: "Parents sign in with email, children with a nickname.",
        loginPh: "Email or nickname", passPh: "Password",
        signIn: "Sign in", signOut: "Sign out",
        roleParent: "parent/guardian", roleChild: "child",
        badLogin: "Wrong login or password",
        changeTitle: "Set a new password",
        changeHint: "You signed in with the one-time 1234. Set your own password to continue.",
        newPassPh: "New password (not 1234)", saveCont: "Save and continue",
        weakPass: "At least 4 characters, and not 1234",
        demoNote: "Sign-in works in the server version of the app.",
        welcome: "Welcome, {name}!", signedOut: "Signed out",
        guestNote: "Without sign-in the app runs in family mode."
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
      home: { tagline: "Выбери приложение", soonSep: "Скоро будут" },
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
      family: {
        title: "Семья",
        empty: "Детей пока нет.",
        addChild: "Добавить ребёнка", addHint: "Только никнейм. Email детям не нужен.",
        nickPh: "Никнейм ребёнка", addBtn: "Создать",
        created: "{name}: пароль для первого входа 1234",
        nickTaken: "Этот никнейм занят",
        invite: "Пригласить второго родителя", inviteHint: "Он получит права родителя. Укажите его email.",
        inviteBtn: "Создать приглашение",
        linkHint: "Отправьте эту ссылку. Работает один раз, действует 7 дней.",
        copy: "Копировать ссылку", copied: "Скопировано",
        resetPass: "Сбросить пароль", resetConfirm: "Сбросить пароль {name} на одноразовый 1234?",
        resetDone: "{name}: пароль снова 1234, новый он задаст при входе",
        block: "Заблокировать аккаунт", unblock: "Разблокировать аккаунт",
        blockConfirm: "Заблокировать {name}? Он не сможет войти. Данные сохранятся.",
        unblockConfirm: "Разблокировать {name}?",
        blockDone: "{name} заблокирован", unblockDone: "{name} снова может войти",
        blocked: "заблокирован"
      },
      friend: {
        title: "Друзья",
        hint: "Можно позвать друга — у него появится свой RobTop.",
        invite: "Позвать друга",
        sheetHint: "Друг придумает себе никнейм (не настоящее имя!) и получит свой RobTop. Пока его родитель не присоединился, за его аккаунтом присматривает твой родитель.",
        makeLink: "Создать ссылку",
        sendHint: "Отправь эту ссылку другу. Она работает 7 дней."
      },
      reg: {
        link: "Я новый родитель — создать семью",
        nickPh: "Ваш никнейм",
        title: "Создайте семью",
        hint: "Родители регистрируются по email. Детей добавите внутри, им нужен только никнейм.",
        btn: "Создать семью",
        fail: "Не удалось: проверьте email и никнейм (возможно, заняты)"
      },
      lock: { hint: "Войдите, чтобы продолжить", title: "Кто входит?" },
      account: {
        title: "Аккаунт",
        loading: "Проверяем, кто вошёл…",
        loginHint: "Родители входят по email, дети по никнейму.",
        loginPh: "Email или никнейм", passPh: "Пароль",
        signIn: "Войти", signOut: "Выйти",
        roleParent: "родитель/опекун", roleChild: "ребёнок",
        badLogin: "Неверный логин или пароль",
        changeTitle: "Задай новый пароль",
        changeHint: "Вход был по одноразовому 1234. Придумай свой пароль, чтобы продолжить.",
        newPassPh: "Новый пароль (не 1234)", saveCont: "Сохранить и продолжить",
        weakPass: "Минимум 4 символа, и не 1234",
        demoNote: "Вход работает в серверной версии приложения.",
        welcome: "Привет, {name}!", signedOut: "Вы вышли",
        guestNote: "Без входа приложение работает в семейном режиме."
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
      home: { tagline: "Izvēlies lietotni", soonSep: "Drīz būs" },
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
      family: {
        title: "Ģimene",
        empty: "Bērnu vēl nav.",
        addChild: "Pievienot bērnu", addHint: "Tikai segvārds. Bērniem e-pasts nav vajadzīgs.",
        nickPh: "Bērna segvārds", addBtn: "Izveidot",
        created: "{name}: pirmās pieslēgšanās parole ir 1234",
        nickTaken: "Šis segvārds ir aizņemts",
        invite: "Ielūgt otru vecāku", inviteHint: "Viņš iegūs vecāka tiesības. Norādiet viņa e-pastu.",
        inviteBtn: "Izveidot ielūgumu",
        linkHint: "Nosūtiet šo saiti. Darbojas vienreiz, derīga 7 dienas.",
        copy: "Kopēt saiti", copied: "Nokopēts",
        resetPass: "Atiestatīt paroli", resetConfirm: "Atiestatīt {name} paroli uz vienreizējo 1234?",
        resetDone: "{name}: parole atkal ir 1234, jauno viņš iestatīs pieslēdzoties",
        block: "Bloķēt kontu", unblock: "Atbloķēt kontu",
        blockConfirm: "Bloķēt {name}? Viņš nevarēs pieslēgties. Dati saglabāsies.",
        unblockConfirm: "Atbloķēt {name}?",
        blockDone: "{name} ir bloķēts", unblockDone: "{name} atkal var pieslēgties",
        blocked: "bloķēts"
      },
      friend: {
        title: "Draugi",
        hint: "Vari uzaicināt draugu — viņam būs savs RobTop.",
        invite: "Uzaicināt draugu",
        sheetHint: "Draugs izdomās sev segvārdu (ne īsto vārdu!) un saņems savu RobTop. Kamēr viņa vecāks nav pievienojies, par viņa kontu rūpējas tavs vecāks.",
        makeLink: "Izveidot saiti",
        sendHint: "Nosūti šo saiti draugam. Tā darbojas 7 dienas."
      },
      reg: {
        link: "Esmu jauns vecāks — izveidot ģimeni",
        nickPh: "Jūsu segvārds",
        title: "Izveidojiet ģimeni",
        hint: "Vecāki reģistrējas ar e-pastu. Bērnus pievienosiet iekšā, viņiem vajag tikai segvārdu.",
        btn: "Izveidot ģimeni",
        fail: "Neizdevās: pārbaudiet e-pastu un segvārdu (iespējams, aizņemti)"
      },
      lock: { hint: "Pieslēdzies, lai turpinātu", title: "Kurš pieslēdzas?" },
      account: {
        title: "Konts",
        loading: "Pārbaudām, kurš ir pieslēdzies…",
        loginHint: "Vecāki pieslēdzas ar e-pastu, bērni ar segvārdu.",
        loginPh: "E-pasts vai segvārds", passPh: "Parole",
        signIn: "Pieslēgties", signOut: "Iziet",
        roleParent: "vecāks/aizbildnis", roleChild: "bērns",
        badLogin: "Nepareizs lietotājvārds vai parole",
        changeTitle: "Iestati jaunu paroli",
        changeHint: "Pieslēgšanās notika ar vienreizējo 1234. Iestati savu paroli, lai turpinātu.",
        newPassPh: "Jauna parole (ne 1234)", saveCont: "Saglabāt un turpināt",
        weakPass: "Vismaz 4 rakstzīmes, un ne 1234",
        demoNote: "Pieslēgšanās darbojas lietotnes servera versijā.",
        welcome: "Sveiks, {name}!", signedOut: "Jūs izgājāt",
        guestNote: "Bez pieslēgšanās lietotne darbojas ģimenes režīmā."
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
