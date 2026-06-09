<?php
/**
 * RobTop — серверный рендер текста оповещений для Web Push payload. Канон — ГАЙД-оповещения.md.
 *
 * ЗАЧЕМ. Web Push уходит, когда приложение ЗАКРЫТО — клиента (core/notify.js) нет, текст
 * собирает сервер на языке КОНКРЕТНОГО устройства (push_subs.lang).
 *
 * ФОРМАТ ПУША (по фидбеку Джеффа 2026-06-08, как у нормальных мессенджеров):
 *   ЗАГОЛОВОК = «<Модуль> · <Кто>»  (например «Чат · Родитель», «Задания · Артём»);
 *               без «кого» — просто «<Модуль>» («Копилка», «Поддержка»).
 *   ТЕЛО      = ТОЛЬКО полезное сообщение, без повтора имени и без «Новость из RobTop».
 * Поэтому у пуша СВОЙ набор шаблонов (title/body раздельно), отличный от словаря ntf.ev.*
 * в core/notify.js: там app-name показывается отдельным чипом, а тело несёт «{name}: …».
 *
 * СИНХРОНИЗАЦИЯ. Набор (src,type) держим идентичным core/notify.js. Добавил тип там —
 * добавь сюда (и наоборот). Нет шаблона тут → пуш покажет нейтральное «Новое оповещение»
 * с заголовком модуля; в приложении (центр/баннер) текст всё равно правильный — клиент главный.
 */

/**
 * Пуш-шаблоны: [lang][src][type] = ['who'=>'<ключ params с именем или пусто>', 'body'=>'<шаблон>'].
 * Заголовок строится как имя модуля (_app[src]) + ' · ' + params[who] (если who задан и есть).
 */
function rt_ntf_push_templates() {
    static $T = null;
    if ($T !== null) return $T;
    $T = [
        'en' => [
            '_app' => ['tasks'=>'Tasks','bank'=>'Piggy Bank','wishlist'=>'Wishlist','chat'=>'Chat','tickets'=>'Support','walk'=>'Dog'],
            'generic' => 'New notification',
            'tickets'  => [
                'reply'  => ['who'=>'', 'body'=>'Reply to “{subject}”'],
                'closed' => ['who'=>'', 'body'=>'“{subject}” is closed'],
            ],
            'tasks' => [
                'task_new'      => ['who'=>'',     'body'=>'New task “{title}” — +{n} points'],
                'task_claim'    => ['who'=>'name', 'body'=>'“{title}” — please check'],
                'task_done'     => ['who'=>'name', 'body'=>'Finished “{title}” (+{n})'],
                'task_approved' => ['who'=>'',     'body'=>'“{title}” approved — +{n} points!'],
            ],
            'bank' => [
                'task_new'      => ['who'=>'',     'body'=>'New task “{title}” — +{n} points'],
                'task_claim'    => ['who'=>'name', 'body'=>'“{title}” — please check'],
                'task_done'     => ['who'=>'name', 'body'=>'Finished “{title}” (+{n})'],
                'task_approved' => ['who'=>'',     'body'=>'“{title}” approved — +{n} points!'],
                'points_given'  => ['who'=>'',     'body'=>'+{n} points from parents'],
                'points_taken'  => ['who'=>'',     'body'=>'−{n} points (parents)'],
                'penalty'       => ['who'=>'',     'body'=>'⚠️ Penalty −{n}'],
                'daily_bonus'   => ['who'=>'',     'body'=>'+5 — all tasks of the day!'],
            ],
            'wishlist' => [
                'share_request' => ['who'=>'child', 'body'=>'Asks to publish their wishlist'],
                'share_grant'   => ['who'=>'child', 'body'=>'Shared their wishlist with you'],
            ],
            'chat' => [
                'message' => ['who'=>'name', 'body'=>'{text}'],
                'photo'   => ['who'=>'name', 'body'=>'📷 Photo'],
            ],
            'walk' => [
                'care_due' => ['who'=>'', 'body'=>'🐶 Time for dog care'],
            ],
        ],
        'ru' => [
            '_app' => ['tasks'=>'Задания','bank'=>'Копилка','wishlist'=>'Виш-лист','chat'=>'Чат','tickets'=>'Поддержка','walk'=>'Собака'],
            'generic' => 'Новое оповещение',
            'tickets'  => [
                'reply'  => ['who'=>'', 'body'=>'Ответ по обращению «{subject}»'],
                'closed' => ['who'=>'', 'body'=>'Обращение «{subject}» закрыто'],
            ],
            'tasks' => [
                'task_new'      => ['who'=>'',     'body'=>'Новое задание «{title}» — +{n} очков'],
                'task_claim'    => ['who'=>'name', 'body'=>'«{title}» — проверь выполнение!'],
                'task_done'     => ['who'=>'name', 'body'=>'Выполнил(а) задание «{title}» (+{n})'],
                'task_approved' => ['who'=>'',     'body'=>'«{title}» подтверждено — +{n} очков!'],
            ],
            'bank' => [
                'task_new'      => ['who'=>'',     'body'=>'Новое задание «{title}» — +{n} очков'],
                'task_claim'    => ['who'=>'name', 'body'=>'«{title}» — проверь выполнение!'],
                'task_done'     => ['who'=>'name', 'body'=>'Выполнил(а) задание «{title}» (+{n})'],
                'task_approved' => ['who'=>'',     'body'=>'«{title}» подтверждено — +{n} очков!'],
                'points_given'  => ['who'=>'',     'body'=>'+{n} очков от родителей'],
                'points_taken'  => ['who'=>'',     'body'=>'−{n} очков (родители)'],
                'penalty'       => ['who'=>'',     'body'=>'⚠️ Штраф −{n}'],
                'daily_bonus'   => ['who'=>'',     'body'=>'+5 — все задания дня!'],
            ],
            'wishlist' => [
                'share_request' => ['who'=>'child', 'body'=>'Просит включить публичный виш-лист'],
                'share_grant'   => ['who'=>'child', 'body'=>'Открыл(а) тебе свой виш-лист'],
            ],
            'chat' => [
                'message' => ['who'=>'name', 'body'=>'{text}'],
                'photo'   => ['who'=>'name', 'body'=>'📷 Фото'],
            ],
            'walk' => [
                'care_due' => ['who'=>'', 'body'=>'🐶 Пора по уходу за собакой'],
            ],
        ],
        'lv' => [
            '_app' => ['tasks'=>'Uzdevumi','bank'=>'Krājkase','wishlist'=>'Vēlmju saraksts','chat'=>'Čats','tickets'=>'Atbalsts','walk'=>'Suns'],
            'generic' => 'Jauns paziņojums',
            'tickets'  => [
                'reply'  => ['who'=>'', 'body'=>'Atbilde uz pieteikumu “{subject}”'],
                'closed' => ['who'=>'', 'body'=>'Pieteikums “{subject}” ir slēgts'],
            ],
            'tasks' => [
                'task_new'      => ['who'=>'',     'body'=>'Jauns uzdevums “{title}” — +{n} punkti'],
                'task_claim'    => ['who'=>'name', 'body'=>'“{title}” — pārbaudi izpildi!'],
                'task_done'     => ['who'=>'name', 'body'=>'Izpildīja uzdevumu “{title}” (+{n})'],
                'task_approved' => ['who'=>'',     'body'=>'“{title}” apstiprināts — +{n} punkti!'],
            ],
            'bank' => [
                'task_new'      => ['who'=>'',     'body'=>'Jauns uzdevums “{title}” — +{n} punkti'],
                'task_claim'    => ['who'=>'name', 'body'=>'“{title}” — pārbaudi izpildi!'],
                'task_done'     => ['who'=>'name', 'body'=>'Izpildīja uzdevumu “{title}” (+{n})'],
                'task_approved' => ['who'=>'',     'body'=>'“{title}” apstiprināts — +{n} punkti!'],
                'points_given'  => ['who'=>'',     'body'=>'+{n} punkti no vecākiem'],
                'points_taken'  => ['who'=>'',     'body'=>'−{n} punkti (vecāki)'],
                'penalty'       => ['who'=>'',     'body'=>'⚠️ Sods −{n}'],
                'daily_bonus'   => ['who'=>'',     'body'=>'+5 — visi dienas uzdevumi!'],
            ],
            'wishlist' => [
                'share_request' => ['who'=>'child', 'body'=>'Lūdz publicēt savu vēlmju sarakstu'],
                'share_grant'   => ['who'=>'child', 'body'=>'Padalījās ar savu vēlmju sarakstu'],
            ],
            'chat' => [
                'message' => ['who'=>'name', 'body'=>'{text}'],
                'photo'   => ['who'=>'name', 'body'=>'📷 Foto'],
            ],
            'walk' => [
                'care_due' => ['who'=>'', 'body'=>'🐶 Laiks suņa aprūpei'],
            ],
        ],
    ];
    return $T;
}

/** Подстановка {ключ} → значение из params (как interp в i18n.js). */
function rt_ntf_interp($tpl, $params) {
    if (!is_array($params)) return $tpl;
    return preg_replace_callback('/\{(\w+)\}/', function ($m) use ($params) {
        return array_key_exists($m[1], $params) ? (string)$params[$m[1]] : $m[0];
    }, $tpl);
}

/**
 * Готовый пуш на языке устройства: ['title'=>«Модуль · Кто», 'body'=>сообщение].
 * Заголовок несёт контекст (модуль + автор), тело — только полезный текст. params.note
 * дописывается хвостом « · note» к телу (причина штрафа/начисления, название группы чата).
 * Неизвестный src/type → нейтральное «Новое оповещение» (НЕ «from RobTop»).
 */
function rt_ntf_render($src, $type, $params, $lang) {
    $T = rt_ntf_push_templates();
    if (!isset($T[$lang])) $lang = 'en';
    $L = $T[$lang];
    $app = isset($L['_app'][$src]) ? $L['_app'][$src] : 'RobTop';
    $def = isset($L[$src][$type]) ? $L[$src][$type] : null;

    if ($def === null) {
        $body = (is_array($params) && isset($params['text']) && $params['text'] !== '')
            ? (string)$params['text'] : $L['generic'];
        return ['title' => $app, 'body' => rt_ntf_note($body, $params)];
    }

    // «кто» в заголовок (имя автора/ребёнка), если шаблон его объявил и параметр есть
    $who = '';
    if (!empty($def['who']) && is_array($params)
        && isset($params[$def['who']]) && $params[$def['who']] !== '') {
        $who = (string)$params[$def['who']];
    }
    $title = ($who !== '') ? ($app . ' · ' . $who) : $app;
    $body  = rt_ntf_note(rt_ntf_interp($def['body'], $params), $params);
    return ['title' => $title, 'body' => $body];
}

/** Дописать « · note» к телу, если есть (как text() в core/notify.js). */
function rt_ntf_note($body, $params) {
    if (is_array($params) && isset($params['note']) && $params['note'] !== '') {
        $body .= ' · ' . (string)$params['note'];
    }
    return $body;
}
