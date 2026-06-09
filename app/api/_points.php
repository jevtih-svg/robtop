<?php
/**
 * RobTop — СЕРВЕРНЫЙ авторитет очков (SEC 2026-06-09, закрывает SEC-1 аудита).
 *
 * Очки — это строки леджера в module_data (module='bank', collection='points', data={n,reason,src,kind,note?}).
 * РАНЬШЕ их писал клиент через data.php (create), и ребёнок мог начислить себе ЛЮБУЮ сумму
 * (fetch data.php {module:'bank',collection:'points',data:{n:1000000}}). Теперь:
 *   1) data.php ЗАПРЕЩАЕТ запись в bank/points (только чтение);
 *   2) единственный, кто пишет леджер — функция rt_points_write() здесь;
 *   3) суммы определяет СЕРВЕР: фиксированный тариф игр, настроенная награда прогулки,
 *      цена товара из каталога; родительские начисления — только активной роли parent, с клампом.
 *
 * Подключается из points.php и tasks.php. Использует rt_db()/rt_config()/rt_json (из _bootstrap).
 */

if (!defined('RT_POINTS_GRANT_MAX')) define('RT_POINTS_GRANT_MAX', 10000); // кап родительского начисления |n|
if (!defined('RT_POINTS_STREAK_MAX')) define('RT_POINTS_STREAK_MAX', 21);  // как BANK_STREAK_MAX в core/sdk.js

/** Фиксированный тариф игр: reason => [сумма, kind]. Клиентскую сумму игнорируем — пишем эту. */
function rt_points_tariff() {
    return [
        'guess_win'     => ['n' => 10, 'kind' => 'win'],
        'guess_wrong'   => ['n' => -5, 'kind' => 'loss'],
        'guess_timeout' => ['n' => -5, 'kind' => 'loss'],
        'snake_record'  => ['n' => 10, 'kind' => 'win'],
        'teeth'         => ['n' => 10, 'kind' => 'win'],
        'find_correct'  => ['n' => 10, 'kind' => 'win'],
        'find_wrong'    => ['n' => -5, 'kind' => 'loss'],
        'find_timeout'  => ['n' => -5, 'kind' => 'loss'],
        'find_bonus'    => ['n' => 10, 'kind' => 'win'],
    ];
}

function rt_points_clamp_grant($n) {
    $n = (int)$n;
    if ($n >  RT_POINTS_GRANT_MAX) $n =  RT_POINTS_GRANT_MAX;
    if ($n < -RT_POINTS_GRANT_MAX) $n = -RT_POINTS_GRANT_MAX;
    return $n;
}

/** ЕДИНСТВЕННЫЙ писатель леджера очков. Вставляет строку module_data bank/points. */
function rt_points_write($db, $uid, $n, $reason, $src, $kind, $note = null) {
    $n = (int)$n;
    if ($n >  RT_POINTS_GRANT_MAX) $n =  RT_POINTS_GRANT_MAX; // абсолютный предохранитель
    if ($n < -RT_POINTS_GRANT_MAX) $n = -RT_POINTS_GRANT_MAX;
    $data = ['n' => $n, 'reason' => (string)$reason, 'src' => (string)$src, 'kind' => (string)$kind];
    if ($note !== null && $note !== '') $data['note'] = mb_substr((string)$note, 0, 80);
    $st = $db->prepare(
        "INSERT INTO module_data (user_id, module, collection, status, favorite, sort, data, created_at, updated_at)
         VALUES (?, 'bank', 'points', '', 0, 0, ?, NOW(), NOW())"
    );
    $st->execute([(int)$uid, json_encode($data, JSON_UNESCAPED_UNICODE)]);
    return (int)$db->lastInsertId();
}

/** Текущий баланс пользователя (сумма всех n леджера). */
function rt_points_balance($db, $uid) {
    $s = $db->prepare(
        "SELECT data FROM module_data WHERE user_id=? AND module='bank' AND collection='points' AND deleted_at IS NULL"
    );
    $s->execute([(int)$uid]);
    $sum = 0;
    foreach ($s->fetchAll() as $row) {
        $d = $row['data'] !== null ? json_decode($row['data'], true) : null;
        if (is_array($d) && isset($d['n'])) $sum += (int)$d['n'];
    }
    return $sum;
}

/** Часовой пояс семьи для границ дня винстрика (config app_timezone; деф. Europe/Riga). */
function rt_points_tz() {
    $c = rt_config();
    $tz = isset($c['app_timezone']) ? (string)$c['app_timezone'] : 'Europe/Riga';
    try { return new DateTimeZone($tz); } catch (Throwable $e) { return new DateTimeZone('UTC'); }
}

/**
 * Винстрик: серия календарных дней подряд с хотя бы одной строкой kind='task_done'.
 * Порт bankStreakFrom() из core/sdk.js: от сегодня (или вчера, если сегодня заданий ещё не было)
 * назад, пока дни «с заданиями»; кап RT_POINTS_STREAK_MAX. День считаем в часовом поясе семьи
 * по реальному epoch строки (UNIX_TIMESTAMP не зависит от tz колонки).
 */
function rt_points_streak($db, $uid) {
    $tz = rt_points_tz();
    $s = $db->prepare(
        "SELECT UNIX_TIMESTAMP(created_at) AS ts, data FROM module_data
         WHERE user_id=? AND module='bank' AND collection='points' AND deleted_at IS NULL"
    );
    $s->execute([(int)$uid]);
    $days = [];
    foreach ($s->fetchAll() as $row) {
        $d = $row['data'] !== null ? json_decode($row['data'], true) : null;
        if (!is_array($d) || (isset($d['kind']) ? $d['kind'] : '') !== 'task_done') continue;
        try {
            $dt = new DateTime('@' . (int)$row['ts']); $dt->setTimezone($tz);
            $days[$dt->format('Y-m-d')] = true;
        } catch (Throwable $e) { /* пропустить */ }
    }
    $cur = new DateTime('now', $tz);
    if (!isset($days[$cur->format('Y-m-d')])) {
        $cur->modify('-1 day');
        if (!isset($days[$cur->format('Y-m-d')])) return 0;
    }
    $n = 0;
    while (isset($days[$cur->format('Y-m-d')]) && $n < RT_POINTS_STREAK_MAX) { $n++; $cur->modify('-1 day'); }
    return $n;
}

/**
 * Начислить очки за ВЫПОЛНЕННОЕ задание (kind task_done) + бонус серии отдельной строкой —
 * как делал клиентский bankAdd, но СЕРВЕРНО (зовётся из tasks.php approve). $pts уже выбран
 * родителем (валидируется/клампится 1..1000 в tasks.php). Возвращает [points, streak, bonus].
 */
function rt_points_award_task($db, $uid, $pts, $note = null) {
    $pts = (int)$pts; if ($pts < 1) $pts = 1; if ($pts > 1000) $pts = 1000;
    rt_points_write($db, $uid, $pts, 'task_done', 'parent', 'task_done', $note);
    $streak = rt_points_streak($db, $uid); // включает только что записанную строку
    $bonus  = max(0, min($streak, RT_POINTS_STREAK_MAX) - 1);
    if ($bonus > 0) rt_points_write($db, $uid, $bonus, 'streak_bonus', 'bank', 'bonus', null);
    return ['points' => $pts, 'streak' => $streak, 'bonus' => $bonus];
}

/** Настроенная родителем награда за прогулку (walk/meta, общий пул семьи). Деф. 10, клампим 0..1000. */
function rt_points_walk_reward($db, $uid) {
    try {
        $pool = rt_family_pool_uid($db, $uid);
        $s = $db->prepare(
            "SELECT data FROM module_data WHERE user_id=? AND module='walk' AND collection='meta' AND deleted_at IS NULL ORDER BY id DESC LIMIT 1"
        );
        $s->execute([(int)$pool]);
        $r = $s->fetch();
        if (!$r) return 10;
        $d = $r['data'] !== null ? json_decode($r['data'], true) : null;
        $rw = (is_array($d) && isset($d['reward'])) ? (int)$d['reward'] : 10;
        if ($rw < 0) $rw = 0; if ($rw > 1000) $rw = 1000;
        return $rw;
    } catch (Throwable $e) { return 0; }
}

/** Цена товара из каталога Магазина (familyCollection items — общий пул семьи). 0, если нет/невалидна. */
function rt_points_shop_price($db, $uid, $itemId) {
    try {
        $pool = rt_family_pool_uid($db, $uid);
        $s = $db->prepare(
            "SELECT data FROM module_data WHERE id=? AND user_id=? AND module='shop' AND collection='items' AND deleted_at IS NULL LIMIT 1"
        );
        $s->execute([(int)$itemId, (int)$pool]);
        $r = $s->fetch();
        if (!$r) return 0;
        $d = $r['data'] !== null ? json_decode($r['data'], true) : null;
        $p = (is_array($d) && isset($d['price'])) ? (int)$d['price'] : 0;
        return $p > 0 ? $p : 0;
    } catch (Throwable $e) { return 0; }
}
