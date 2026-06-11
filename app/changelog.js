/* RobTop — ПУБЛИЧНЫЙ журнал изменений. Показывается на лендинге (landing.html).
   ПРАВИЛО: при КАЖДОМ бампе версии добавлять запись СВЕРХУ (новейшая — первая).
   Формат записи: { v:"<версия как в index.html>", d:"ГГГГ-ММ-ДД",
                    t:{ en:"…", ru:"…", lv:"…" } }
   Тексты — одно короткое предложение, понятное родителю/ребёнку. Технические
   фиксы можно пропускать или объединять. Кодировка файла — UTF-8. */
window.RT_CHANGELOG=[
  { v:"2026.06.11.4", d:"2026-06-11", t:{
    en:"Shop purchases now find family prizes correctly even when family data was created in an older account flow.",
    ru:"Покупки в Магазине теперь правильно находят семейные призы, даже если семейные данные были созданы старым путём аккаунтов.",
    lv:"Veikala pirkumi tagad pareizi atrod ģimenes balvas arī tad, ja ģimenes dati izveidoti vecākā kontu plūsmā." } },
  { v:"2026.06.11.3", d:"2026-06-11", t:{
    en:"Shop purchase errors are clearer now, and a completed purchase cannot fail because of analytics logging.",
    ru:"Ошибки покупки в Магазине стали понятнее, а успешная покупка больше не может сорваться из-за записи аналитики.",
    lv:"Veikala pirkumu kļūdas tagad ir skaidrākas, un pabeigts pirkums vairs nevar izgāzties analītikas ieraksta dēļ." } },
  { v:"2026.06.11.2", d:"2026-06-11", t:{
    en:"Shop purchases now work reliably: points are deducted and parents see the purchase waiting to be finalized.",
    ru:"Покупки в Магазине теперь работают надёжно: пункты списываются, а родитель видит покупку на подтверждение.",
    lv:"Pirkumi Veikalā tagad darbojas uzticami: punkti tiek noņemti, un vecāks redz pirkumu apstiprināšanai." } },
  { v:"2026.06.11.1", d:"2026-06-11", t:{
    en:"Photo uploads are restored across the apps, including chat photos from parent accounts.",
    ru:"Загрузка фото снова работает во всех приложениях, включая фото в чате от родительских аккаунтов.",
    lv:"Foto augšupielāde atkal darbojas visās lietotnēs, tostarp čata foto no vecāku kontiem." } },
  { v:"2026.06.10.15", d:"2026-06-10", t:{
    en:"Find the Object: the camera preview now shows live right away (no black screen), photo sending can't get stuck on a weak connection, and the game fits the screen without scrolling.",
    ru:"«Найти предмет»: превью камеры теперь сразу показывает живую картинку (без чёрного экрана), отправка фото не зависает на слабой связи, а игра помещается на экране без прокрутки.",
    lv:"«Atrodi priekšmetu»: kameras priekšskatījums tagad uzreiz rāda dzīvu attēlu (bez melna ekrāna), foto sūtīšana neiestrēgst ar vāju savienojumu, un spēle ietilpst ekrānā bez ritināšanas." } },
  { v:"2026.06.10.14", d:"2026-06-10", t:{
    en:"Find the Object: one game now gives 3 tries (skips are free) and the break can't be dodged by leaving the game; sending a photo shows progress and never gets lost silently; the Alerts screen header no longer overflows.",
    ru:"«Найти предмет»: за игру теперь 3 попытки (пропуски не в счёт), перерыв нельзя обойти выходом из игры; отправка фото показывает прогресс и больше не теряется молча; шапка экрана оповещений не вылезает за край.",
    lv:"«Atrodi priekšmetu»: spēlē tagad 3 mēģinājumi (izlaišanas neskaitās), pauzi nevar apiet izejot no spēles; foto sūtīšana rāda progresu un vairs nepazūd klusi; paziņojumu ekrāna galvene vairs neiziet aiz malas." } },
  { v:"2026.06.10.13", d:"2026-06-10", t:{
    en:"Mood of the Day photo upload now shows progress and waits for the real uploaded photo before saving.",
    ru:"В «Настроении дня» фото теперь показывает загрузку и сохраняется только после настоящей загрузки на сервер.",
    lv:"«Dienas garastāvoklī» foto tagad rāda augšupielādi un saglabājas tikai pēc īstas ielādes serverī." } },
  { v:"2026.06.10.12", d:"2026-06-10", t:{
    en:"Find the Object photos are now tiny (but still clear), so they upload reliably even on weak internet.",
    ru:"Фото в «Найти предмет» теперь совсем лёгкие (но разборчивые) — загружаются надёжно даже на слабом интернете.",
    lv:"«Atrodi priekšmetu» foto tagad ir pavisam viegli (bet skaidri) — augšupielādējas droši pat ar vāju internetu." } },
  { v:"2026.06.10.11", d:"2026-06-10", t:{
    en:"Find the Object is fully fixed: stuck photo reviews are cleared automatically (points were already given), and new photos always upload properly.",
    ru:"«Найти предмет» починен полностью: застрявшие проверки фото расчищены автоматически (очки за них уже начислены), а новые фото всегда загружаются правильно.",
    lv:"«Atrodi priekšmetu» pilnībā salabots: iestrēgušās foto pārbaudes iztīrītas automātiski (punkti jau bija piešķirti), un jaunie foto vienmēr augšupielādējas pareizi." } },
  { v:"2026.06.10.10", d:"2026-06-10", t:{
    en:"Find the Object review: items already reviewed earlier no longer error — the list refreshes itself; save errors now show the exact reason.",
    ru:"Проверка «Найти предмет»: уже проверенные ранее находки больше не дают ошибку — список обновляется сам; ошибки сохранения теперь показывают точную причину.",
    lv:"«Atrodi priekšmetu» pārbaude: jau agrāk pārbaudītie vairs nerāda kļūdu — saraksts atjaunojas pats; saglabāšanas kļūdas tagad rāda precīzu iemeslu." } },
  { v:"2026.06.10.9", d:"2026-06-10", t:{
    en:"Fixed the app tiles ballooning on the home screen and parent dashboard after opening Find the Object.",
    ru:"Починили раздувание плиток на главном экране и родительском дашборде после захода в «Найти предмет».",
    lv:"Salabots flīžu izplešanās sākuma ekrānā un vecāku panelī pēc «Atrodi priekšmetu» atvēršanas." } },
  { v:"2026.06.10.8", d:"2026-06-10", t:{
    en:"Parent dashboard now keeps its own stable scroll frame after leaving review screens.",
    ru:"Родительский экран теперь держит собственную стабильную прокрутку после выхода из экранов проверки.",
    lv:"Vecāku panelim tagad ir sava stabila ritināšana pēc iziešanas no pārbaudes ekrāniem." } },
  { v:"2026.06.10.7", d:"2026-06-10", t:{
    en:"The bottom menu now compensates for the iOS PWA viewport gap after camera and review screens.",
    ru:"Нижнее меню теперь компенсирует зазор iOS PWA после экранов камеры и проверки.",
    lv:"Apakšējā izvēlne tagad kompensē iOS PWA skata atstarpi pēc kameras un pārbaudes ekrāniem." } },
  { v:"2026.06.10.6", d:"2026-06-10", t:{
    en:"Leaving camera and review screens now restores the PWA viewport so the bottom menu stays pinned.",
    ru:"После выхода из экранов камеры и проверки PWA восстанавливает экран, а нижнее меню остаётся внизу.",
    lv:"Izejot no kameras un pārbaudes ekrāniem, PWA atjauno skatu, un apakšējā izvēlne paliek apakšā." } },
  { v:"2026.06.10.5", d:"2026-06-10", t:{
    en:"Piggy Bank now opens as a transaction history for parents; assignments live on a separate screen when you need them.",
    ru:"Копилка у родителя теперь открывается как история операций; назначения живут на отдельном экране, когда они нужны.",
    lv:"Vecākiem Krājkase tagad atveras kā darījumu vēsture; uzdevumi dzīvo atsevišķā ekrānā, kad tie ir vajadzīgi." } },
  { v:"2026.06.10.4", d:"2026-06-10", t:{
    en:"Parent fixes: Bank actions are simpler, task approvals can be handled from notifications, photos save more reliably, and history has filters.",
    ru:"Исправления для родителя: в Копилке меньше лишних кнопок, задания можно одобрять из оповещений, фото сохраняются надёжнее, а история получила фильтры.",
    lv:"Vecāku labojumi: Krājkasē ir mazāk lieku pogu, uzdevumus var apstiprināt no paziņojumiem, foto saglabājas uzticamāk, un vēsturei ir filtri." } },
  { v:"2026.06.10.3", d:"2026-06-10", t:{
    en:"Tilley Live is easier to read now, with stronger contrast and the same app typography as the rest of RobTop.",
    ru:"Tilley Live теперь читается лучше: контраст сильнее, а шрифт такой же, как в остальном RobTop.",
    lv:"Tilley Live tagad ir vieglāk lasāms: kontrasts ir spēcīgāks, un fonts ir tāds pats kā pārējā RobTop lietotnē." } },
  { v:"2026.06.10.2", d:"2026-06-10", t:{
    en:"Chat keyboard is steady now: the message box follows the keyboard smoothly, without stutters, floating gaps or a leftover gap at the bottom.",
    ru:"Клавиатура в чате стала стабильной: поле ввода плавно следует за клавиатурой — без подёргиваний, висящих зазоров и остаточной щели снизу.",
    lv:"Tastatūra čatā tagad ir stabila: ziņas lauks plūstoši seko tastatūrai — bez raustīšanās, peldošām atstarpēm un atlikušas spraugas apakšā." } },
  { v:"2026.06.10.1", d:"2026-06-10", t:{
    en:"Big polish update: app tiles now cascade in, screens glide smoother, loading spinners replace blank screens, and the app drains much less battery.",
    ru:"Большое обновление полировки: плитки приложений появляются каскадом, экраны переключаются мягче, вместо пустых экранов — спиннеры загрузки, и приложение заметно меньше ест батарею.",
    lv:"Liels pulēšanas atjauninājums: lietotņu flīzes parādās kaskādē, ekrāni pārslēdzas maigāk, tukšo ekrānu vietā ir ielādes indikatori, un lietotne tērē daudz mazāk baterijas." } },
  { v:"2026.06.09.18", d:"2026-06-09", t:{
    en:"Settings now sit on a calm background that matches your theme, so everything is much easier to read.",
    ru:"Настройки теперь на спокойном фоне в цвет твоей темы — всё читается гораздо легче.",
    lv:"Iestatījumi tagad ir uz mierīga fona tavas tēmas krāsā — viss lasāms daudz vieglāk." } },
  { v:"2026.06.09.17", d:"2026-06-09", t:{
    en:"After you close the keyboard in a chat, the message box now drops back to the very bottom instead of leaving a gap.",
    ru:"После закрытия клавиатуры в чате поле ввода теперь опускается к самому низу — без щели снизу.",
    lv:"Pēc tastatūras aizvēršanas čatā ziņas lauks tagad nolaižas līdz pašai apakšai — bez atstarpes." } },
  { v:"2026.06.09.16", d:"2026-06-09", t:{
    en:"Bottom menu now truly hides inside a conversation (and during a full-screen game), so it no longer floats over the keyboard on iPhone.",
    ru:"Нижнее меню теперь по-настоящему скрывается в переписке (и в полноэкранной игре) — больше не всплывает над клавиатурой на iPhone.",
    lv:"Apakšējā izvēlne tagad patiešām paslēpjas sarunā (un pilnekrāna spēlē) — vairs neuzpeld virs tastatūras iPhone." } },
  { v:"2026.06.09.15", d:"2026-06-09", t:{
    en:"Updates now reach the home-screen app reliably: tapping 'new version' fully reloads, even on iPhone.",
    ru:"Обновления теперь надёжно доходят до приложения с домашнего экрана: «новая версия» перезагружает полностью, даже на iPhone.",
    lv:"Atjauninājumi tagad uzticami nonāk līdz sākuma ekrāna lietotnei: «jauna versija» pārlādē pilnībā, arī iPhone." } },
  { v:"2026.06.09.14", d:"2026-06-09", t:{
    en:"Chat feels native now: a conversation opens full-screen, the keyboard stays up after you send, and the bottom menu no longer overlaps the message box.",
    ru:"Чат стал как настоящий мессенджер: переписка открывается на весь экран, клавиатура не прячется после отправки, а нижнее меню больше не налезает на поле ввода.",
    lv:"Čats tagad jūtas kā īsts: saruna atveras pa visu ekrānu, tastatūra paliek atvērta pēc nosūtīšanas, un apakšējā izvēlne vairs nepārklājas ar ziņas lauku." } },
  { v:"2026.06.08.77", d:"2026-06-08", t:{
    en:"New app — Find the Object: I name an object, you find it nearby and snap a photo; a grown-up checks it for points.",
    ru:"Новое приложение — Найти предмет: я называю предмет, ты находишь его рядом и фоткаешь; взрослый проверяет и начисляет очки.",
    lv:"Jauna lietotne — Atrodi priekšmetu: es nosaucu priekšmetu, tu atrodi to tuvumā un nofotografē; pieaugušais pārbauda un piešķir punktus." } },
  { v:"2026.06.08.76", d:"2026-06-08", t:{
    en:"Chat shows delivery and read checkmarks; long-press a message to see when it was read.",
    ru:"В чате появились галочки доставки и прочтения; зажми сообщение, чтобы увидеть время прочтения.",
    lv:"Čatā ir piegādes un izlasīšanas atzīmes; turi ziņu, lai redzētu izlasīšanas laiku." } },
  { v:"2026.06.08.75", d:"2026-06-08", t:{
    en:"New app — Friends: describe your friends, rate them, and keep secret ones in a separate tab.",
    ru:"Новое приложение — Друзья: описывай друзей, ставь оценку и прячь секретных в отдельную вкладку.",
    lv:"Jauna lietotne — Draugi: apraksti savus draugus, novērtē tos un slēp slepenos atsevišķā cilnē." } },
  { v:"2026.06.08.75", d:"2026-06-08", t:{
    en:"New app — Day Counter: set a date and a name, and watch the days count down to your big event.",
    ru:"Новое приложение — Счётчик дней: выбери дату и название, и считай дни до важного события.",
    lv:"Jauna lietotne — Dienu skaitītājs: izvēlies datumu un nosaukumu un skaiti dienas līdz lielajam notikumam." } },
  { v:"2026.06.08.74", d:"2026-06-08", t:{
    en:"Toothbrushing Timer now counts once per time of day: brush from 5:00 to 10:00 and from 18:00 to 23:59.",
    ru:"Таймер чистки зубов теперь засчитывает один раз за период: чистим с 5:00 до 10:00 и с 18:00 до 23:59.",
    lv:"Zobu tīrīšanas taimeris tagad ieskaita vienu reizi periodā: tīrām no 5:00 līdz 10:00 un no 18:00 līdz 23:59." } },
  { v:"2026.06.08.70", d:"2026-06-08", t:{
    en:"Chat keyboard stays open after you send, the input sits flush above it, and the form arrows are gone.",
    ru:"Клавиатура в чате остаётся открытой после отправки, поле вплотную над ней, стрелки формы убраны.",
    lv:"Tastatūra čatā paliek atvērta pēc nosūtīšanas, ievades lauks cieši virs tās, formas bultiņas noņemtas." } },
  { v:"2026.06.08.69", d:"2026-06-08", t:{
    en:"Chat now feels like a real messenger: the typing bar sits right above the keyboard, no gap.",
    ru:"Чат стал как настоящий мессенджер: строка ввода — прямо над клавиатурой, без зазора.",
    lv:"Čats tagad kā īsts ziņotājs: ievades josla tieši virs tastatūras, bez atstarpes." } },
  { v:"2026.06.07.68", d:"2026-06-07", t:{
    en:"New app, Tasks: parent chores you complete to earn points, with a win streak.",
    ru:"Новое приложение «Задания»: поручения от родителей за пункты, со своим винстриком.",
    lv:"Jauna lietotne «Uzdevumi»: vecāku uzdevumi, ko izpildi par punktiem, ar sēriju." } },
  { v:"2026.06.07.65", d:"2026-06-07", t:{
    en:"Welcome page for guests with all apps and this changelog.",
    ru:"Страница-знакомство для гостей: все приложения и этот журнал изменений.",
    lv:"Iepazīšanās lapa viesiem: visas lietotnes un šis izmaiņu žurnāls." } },
  { v:"2026.06.07.63", d:"2026-06-07", t:{
    en:"New app — Chat: a family messenger with groups and photos.",
    ru:"Новое приложение — Чат: семейный мессенджер с группами и фото.",
    lv:"Jauna lietotne — Čats: ģimenes ziņotājs ar grupām un foto." } },
  { v:"2026.06.07.63", d:"2026-06-07", t:{
    en:"Piggy Bank: parents can give a named penalty with a reason.",
    ru:"Копилка: родители могут выписать штраф с обязательной причиной.",
    lv:"Krājkase: vecāki var piešķirt sodu ar obligātu iemeslu." } },
  { v:"2026.06.07.61", d:"2026-06-07", t:{
    en:"Tiles can now be hidden: the eye button in reorder mode.",
    ru:"Плитки теперь можно прятать: кнопка-глаз в режиме перестановки.",
    lv:"Flīzes tagad var paslēpt: acs poga pārkārtošanas režīmā." } },
  { v:"2026.06.07.60", d:"2026-06-07", t:{
    en:"New app — Shop: parents put up prizes, kids buy them with points.",
    ru:"Новое приложение — Магазин: родители выставляют призы, дети покупают за пункты.",
    lv:"Jauna lietotne — Veikals: vecāki izliek balvas, bērni pērk tās par punktiem." } },
  { v:"2026.06.07.59", d:"2026-06-07", t:{
    en:"Notifications: the bell in the app and Web Push to your phone.",
    ru:"Оповещения: колокольчик в приложении и Web Push на телефон.",
    lv:"Paziņojumi: zvaniņš lietotnē un Web Push uz tālruni." } },
  { v:"2026.06.07.58", d:"2026-06-07", t:{
    en:"New app — Funny Names: 10,000 silly names, funny or not?",
    ru:"Новое приложение — Смешные имена: 10 000 выдуманных имён, смешно или нет?",
    lv:"Jauna lietotne — Smieklīgi vārdi: 10 000 izdomātu vārdu, smieklīgi vai ne?" } },
  { v:"2026.06.07.52", d:"2026-06-07", t:{
    en:"Live updates: new data appears by itself, no page reload.",
    ru:"Живое обновление: новые данные появляются сами, без перезагрузки страницы.",
    lv:"Tiešie atjauninājumi: jaunie dati parādās paši, bez lapas pārlādes." } },
  { v:"2026.06.07.42", d:"2026-06-07", t:{
    en:"Themes on your account: Neon and Tilley Live on any device.",
    ru:"Темы оформления на аккаунте: «Неон» и «Tilley Live» на любом устройстве.",
    lv:"Noformējuma tēmas kontā: Neon un Tilley Live jebkurā ierīcē." } },
  { v:"2026.06.07.37", d:"2026-06-07", t:{
    en:"Help section: report a problem right from Settings.",
    ru:"Раздел «Помощь»: сообщить о проблеме прямо из настроек.",
    lv:"Sadaļa “Palīdzība”: ziņot par problēmu tieši no iestatījumiem." } },
  { v:"2026.06.07.36", d:"2026-06-07", t:{
    en:"Parent tasks in the Piggy Bank: complete them and earn points.",
    ru:"Задания от родителей в Копилке: выполняй и получай пункты.",
    lv:"Vecāku uzdevumi Krājkasē: izpildi un nopelni punktus." } },
  { v:"2026.06.07.35", d:"2026-06-07", t:{
    en:"New app — Snake: the Nokia classic, records earn points.",
    ru:"Новое приложение — Змейка: классика Nokia, рекорды приносят пункты.",
    lv:"Jauna lietotne — Čūska: Nokia klasika, rekordi pelna punktus." } },
  { v:"2026.06.07.27", d:"2026-06-07", t:{
    en:"Wishlist sharing: a public page and access for friends (with parent's OK).",
    ru:"Шаринг виш-листа: публичная страница и доступы друзьям (с разрешения родителя).",
    lv:"Vēlmju saraksta kopīgošana: publiska lapa un piekļuve draugiem (ar vecāku atļauju)." } },
  { v:"2026.06.07.21", d:"2026-06-07", t:{
    en:"New app — Dog Walk: a family walk journal with photos.",
    ru:"Новое приложение — Прогулка: семейный журнал прогулок с собакой и фото.",
    lv:"Jauna lietotne — Pastaiga: ģimenes pastaigu žurnāls ar foto." } },
  { v:"2026.06.07.6", d:"2026-06-07", t:{
    en:"Parent dashboard: each child's stats and journal in one place.",
    ru:"Родительский дашборд: статистика и журнал каждого ребёнка в одном месте.",
    lv:"Vecāku panelis: katra bērna statistika un žurnāls vienuviet." } },
  { v:"2026.06.07.5", d:"2026-06-07", t:{
    en:"Three new apps: Guess the Number, Mood of the Day, Day Rating.",
    ru:"Три новых приложения: Угадай число, Настроение дня, Оценка дня.",
    lv:"Trīs jaunas lietotnes: Uzmini skaitli, Dienas garastāvoklis, Dienas vērtējums." } },
  { v:"2026.06.05.9", d:"2026-06-05", t:{
    en:"Accounts and family: sign-in for parents and kids, invitations, 3 languages.",
    ru:"Аккаунты и семья: вход для родителей и детей, приглашения, 3 языка.",
    lv:"Konti un ģimene: pieteikšanās vecākiem un bērniem, ielūgumi, 3 valodas." } },
  { v:"2026.06.04.1", d:"2026-06-04", t:{
    en:"First release: Wishlist, neon style, points and the toothbrushing timer.",
    ru:"Первый релиз: Виш-лист, неоновый стиль, очки и таймер чистки зубов.",
    lv:"Pirmais laidiens: Vēlmju saraksts, neona stils, punkti un zobu tīrīšanas taimeris." } }
];
