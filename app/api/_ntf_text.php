<?php
/**
 * RobTop — серверный рендер текста оповещений для Web Push payload. Канон — ГАЙД-оповещения.md.
 *
 * ЗАЧЕМ ЗЕРКАЛО. В приложении тексты оповещений собирает КЛИЕНТ (core/notify.js) по ключу
 * ntf.ev.<src>.<type> + params, на языке пользователя. Но Web Push уходит, когда приложение
 * ЗАКРЫТО — клиента нет, текст должен собрать сервер. Поэтому шаблоны продублированы здесь
 * (en/ru/lv) и рендерятся на языке КОНКРЕТНОГО устройства (push_subs.lang).
 *
 * СИНХРОНИЗАЦИЯ (важно): при добавлении/правке ключа ntf.ev.* в core/notify.js — повтори его
 * здесь, и наоборот. Набор типов держим идентичным. Если ключа тут нет — push покажет общий
 * текст (generic), оповещение в приложении всё равно будет правильным (клиент главный).
 */

/** Локализованные шаблоны: [lang][src][type] = строка с {плейсхолдерами}. Зеркало core/notify.js. */
function rt_ntf_templates() {
    static $T = null;
    if ($T !== null) return $T;
    $T = [
        'en' => [
            '_app' => ['tasks'=>'Tasks','bank'=>'Piggy Bank','wishlist'=>'Wishlist','chat'=>'Chat','tickets'=>'Support'],
            'generic' => 'News from RobTop',
            'tickets'  => ['reply'=>'Support replied: “{subject}”', 'closed'=>'Ticket “{subject}” is closed'],
            'tasks'    => ['task_new'=>'New task “{title}” — +{n} points', 'task_claim'=>'{name} says “{title}” is done — check it', 'task_done'=>'{name} finished “{title}” (+{n})', 'task_approved'=>'“{title}” approved — +{n} points!'],
            'bank'     => ['task_new'=>'New task “{title}” — +{n} points', 'task_claim'=>'{name} says “{title}” is done — check it', 'task_done'=>'{name} finished “{title}” (+{n})', 'task_approved'=>'“{title}” approved — +{n} points!', 'points_given'=>'+{n} points from parents', 'points_taken'=>'−{n} points (parents)', 'penalty'=>'⚠️ Penalty −{n}', 'daily_bonus'=>'+5 — all tasks of the day!'],
            'wishlist' => ['share_request'=>'{child} asks to publish their wishlist', 'share_grant'=>'{child} shared their wishlist with you'],
            'chat'     => ['message'=>'{name}: {text}', 'photo'=>'{name} sent a photo 📷'],
        ],
        'ru' => [
            '_app' => ['tasks'=>'Задания','bank'=>'Копилка','wishlist'=>'Виш-лист','chat'=>'Чат','tickets'=>'Поддержка'],
            'generic' => 'Новость из RobTop',
            'tickets'  => ['reply'=>'Поддержка ответила: «{subject}»', 'closed'=>'Обращение «{subject}» закрыто'],
            'tasks'    => ['task_new'=>'Новое задание «{title}» — +{n} очков', 'task_claim'=>'{name}: «{title}» сделано — проверь!', 'task_done'=>'{name} выполнил(а) задание «{title}» (+{n})', 'task_approved'=>'«{title}» подтверждено — +{n} очков!'],
            'bank'     => ['task_new'=>'Новое задание «{title}» — +{n} очков', 'task_claim'=>'{name}: «{title}» сделано — проверь!', 'task_done'=>'{name} выполнил(а) задание «{title}» (+{n})', 'task_approved'=>'«{title}» подтверждено — +{n} очков!', 'points_given'=>'+{n} очков от родителей', 'points_taken'=>'−{n} очков (родители)', 'penalty'=>'⚠️ Штраф −{n}', 'daily_bonus'=>'+5 — все задания дня!'],
            'wishlist' => ['share_request'=>'{child} просит включить публичный виш-лист', 'share_grant'=>'{child} открыл(а) тебе свой виш-лист'],
            'chat'     => ['message'=>'{name}: {text}', 'photo'=>'{name} прислал(а) фото 📷'],
        ],
        'lv' => [
            '_app' => ['tasks'=>'Uzdevumi','bank'=>'Krājkase','wishlist'=>'Vēlmju saraksts','chat'=>'Čats','tickets'=>'Atbalsts'],
            'generic' => 'Jaunums no RobTop',
            'tickets'  => ['reply'=>'Atbalsts atbildēja: “{subject}”', 'closed'=>'Pieteikums “{subject}” ir slēgts'],
            'tasks'    => ['task_new'=>'Jauns uzdevums “{title}” — +{n} punkti', 'task_claim'=>'{name}: “{title}” izpildīts — pārbaudi!', 'task_done'=>'{name} izpildīja uzdevumu “{title}” (+{n})', 'task_approved'=>'“{title}” apstiprināts — +{n} punkti!'],
            'bank'     => ['task_new'=>'Jauns uzdevums “{title}” — +{n} punkti', 'task_claim'=>'{name}: “{title}” izpildīts — pārbaudi!', 'task_done'=>'{name} izpildīja uzdevumu “{title}” (+{n})', 'task_approved'=>'“{title}” apstiprināts — +{n} punkti!', 'points_given'=>'+{n} punkti no vecākiem', 'points_taken'=>'−{n} punkti (vecāki)', 'penalty'=>'⚠️ Sods −{n}', 'daily_bonus'=>'+5 — visi dienas uzdevumi!'],
            'wishlist' => ['share_request'=>'{child} lūdz publicēt savu vēlmju sarakstu', 'share_grant'=>'{child} padalījās ar savu vēlmju sarakstu'],
            'chat'     => ['message'=>'{name}: {text}', 'photo'=>'{name} atsūtīja foto 📷'],
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
 * Готовый текст пуша на языке устройства: ['title'=>модуль, 'body'=>сообщение].
 * Неизвестный src/type → generic-body с заголовком RobTop. params.note дописывается
 * хвостом « · note» — как text() в core/notify.js (штрафы, начисления показывают причину).
 */
function rt_ntf_render($src, $type, $params, $lang) {
    $T = rt_ntf_templates();
    if (!isset($T[$lang])) $lang = 'en';
    $L = $T[$lang];
    $body = (isset($L[$src][$type])) ? rt_ntf_interp($L[$src][$type], $params) : null;
    if ($body === null) {
        // фолбэк: явный params.text, иначе общий «Новость из RobTop»
        $body = (is_array($params) && isset($params['text']) && $params['text'] !== '')
            ? (string)$params['text'] : $L['generic'];
    }
    if (is_array($params) && isset($params['note']) && $params['note'] !== '') {
        $body .= ' · ' . (string)$params['note'];
    }
    $title = isset($L['_app'][$src]) ? $L['_app'][$src] : 'RobTop';
    return ['title' => $title, 'body' => $body];
}
