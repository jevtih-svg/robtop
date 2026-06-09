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

/** ЕДИНСТВЕННЫЙ писатель леджера очков. Вставляет строку module_data bank/points.
 *  $ref (необяз.) — id записи-источника (прогулки) для идемпотентности начисления/отката. */
function rt_points_write($db, $uid, $n, $reason, $src, $kind, $note = null, $ref = null) {
    $n = (int)$n;
    if ($n >  RT_POINTS_GRANT_MAX) $n =  RT_POINTS_GRANT_MAX; // абсолютный предохранитель
    if ($n < -RT_POINTS_GRANT_MAX) $n = -RT_POINTS_GRANT_MAX;
    $data = ['n' => $n, 'reason' => (string)$reason, 'src' => (string)$src, 'kind' => (string)$kind];
    if ($note !== null && $note !== '') $data['note'] = mb_substr((string)$note, 0, 80);
    if ($ref !== null) $data['ref'] = (int)$ref;
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

/** Найти строку леджера walk_done/walk_reversed для прогулки $entryId в леджере $uid. Возвращает [id,n] или null. */
function rt_points_walk_ledger_row($db, $uid, $entryId, $reason = 'walk_done') {
    $s = $db->prepare(
        "SELECT id, data FROM module_data
         WHERE user_id=? AND module='bank' AND collection='points' AND deleted_at IS NULL"
    );
    $s->execute([(int)$uid]);
    foreach ($s->fetchAll() as $row) {
        $d = $row['data'] !== null ? json_decode($row['data'], true) : null;
        if (is_array($d) && ($d['reason'] ?? '') === $reason && (int)($d['ref'] ?? 0) === (int)$entryId) {
            return ['id' => (int)$row['id'], 'n' => (int)($d['n'] ?? 0)];
        }
    }
    return null;
}

/**
 * Начислить очки за прогулку = floor(duration/2). СЕРВЕРНО, защита от накрутки:
 *  - платим ТОЛЬКО если роль звонящего child (родительская прогулка очков не даёт);
 *  - сумму берём из ДЛИТЕЛЬНОСТИ сохранённой записи (клиентский n игнорируем);
 *  - запись должна принадлежать семье звонящего и быть им же залогирована (authorUid===caller);
 *  - идемпотентно: одну прогулку оплачиваем один раз (по ref).
 * Возвращает ['n'=>очки].
 */
function rt_points_walk_claim($db, $uid, $callerId, $role, $entryId) {
    try {
        if ($role !== 'child') return ['n' => 0, 'skipped' => 'not_child'];
        $entryId = (int)$entryId;
        if ($entryId <= 0) return ['n' => 0, 'skipped' => 'no_entry'];
        $pool = rt_family_pool_uid($db, $uid); // прогулки лежат в общем пуле семьи
        $s = $db->prepare(
            "SELECT data FROM module_data
             WHERE id=? AND user_id=? AND module='walk' AND collection='entries' AND deleted_at IS NULL LIMIT 1"
        );
        $s->execute([$entryId, (int)$pool]);
        $r = $s->fetch();
        if (!$r) return ['n' => 0, 'skipped' => 'not_found'];
        $d = $r['data'] !== null ? json_decode($r['data'], true) : null;
        if (!is_array($d)) return ['n' => 0, 'skipped' => 'bad_entry'];
        if ((int)($d['authorUid'] ?? 0) !== (int)$callerId) return ['n' => 0, 'skipped' => 'not_author'];
        $existing = rt_points_walk_ledger_row($db, $uid, $entryId, 'walk_done');
        if ($existing) return ['n' => $existing['n']]; // уже оплачено — не дублируем
        $dur = (int)($d['duration'] ?? 0);
        $pts = (int)floor($dur / 2);
        if ($pts < 0) $pts = 0; if ($pts > 1000) $pts = 1000;
        if ($pts > 0) rt_points_write($db, $uid, $pts, 'walk_done', 'walk', 'win', null, $entryId);
        return ['n' => $pts];
    } catch (Throwable $e) { return ['n' => 0, 'skipped' => 'error']; }
}

/**
 * Откатить начисление за прогулку (родитель удалил запись). Пишет компенсирующую строку −n.
 * Идемпотентно: если уже откатано или прогулка ничего не дала — n=0.
 * Скоуп $uid уже разрешён в points.php (родитель → выбранный/первый ребёнок).
 */
function rt_points_walk_reverse($db, $uid, $entryId) {
    try {
        $entryId = (int)$entryId;
        if ($entryId <= 0) return ['n' => 0];
        if (rt_points_walk_ledger_row($db, $uid, $entryId, 'walk_reversed')) return ['n' => 0, 'already' => true];
        $orig = rt_points_walk_ledger_row($db, $uid, $entryId, 'walk_done');
        if (!$orig || $orig['n'] <= 0) return ['n' => 0];
        rt_points_write($db, $uid, -$orig['n'], 'walk_reversed', 'walk', 'loss', null, $entryId);
        return ['n' => -$orig['n']];
    } catch (Throwable $e) { return ['n' => 0]; }
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
