<?php
/* RobTop — СЕРВЕРНЫЙ авторитет баланса очков (Ф7, ПЛАН-ОС-архитектура.md, Прил. Б.2).
 * Сейчас баланс считает КЛИЕНТ (core/sdk.js bankSummary) — это «мнение клиента». Этот эндпоинт
 * считает баланс на сервере по тому же леджеру (module='bank', collection='points'): balance = SUM(data.n),
 * earned = сумма ПЛЮСОВ кроме kind='spend' («заработано за всё время»). НИЧЕГО не пишет.
 *
 * ВНИМАНИЕ: НЕ включён автоматически. Клиент продолжает считать сам, пока не переключишь sdk.points.summary
 * на этот эндпоинт (Прил. Б.2, шаг 3) — после сверки балансов на нескольких аккаунтах. Винстрик/пунктстрик
 * пока остаются клиентскими (выводятся из леджера). ПЕРЕД включением: php -l balance.php + тест на сервере.
 *
 * Запрос: GET api/balance.php  (родитель: ?child=<id>) или POST {child}.
 */
require __DIR__ . '/_bootstrap.php';
rt_guard();

$db   = rt_db();
$uid  = rt_user_id();
$role = rt_user_role();

// Скоуп как в data.php: родитель работает с ВЫБРАННЫМ ребёнком (child), иначе первый ребёнок семьи.
if ($role === 'parent') {
    $cid = isset($_GET['child']) ? (int)$_GET['child'] : 0;
    if ($cid <= 0) { $b = rt_body(); $cid = isset($b['child']) ? (int)$b['child'] : 0; }
    if ($cid > 0) {
        if (!rt_can_manage_child($db, $uid, $cid)) rt_json(['error' => 'forbidden child'], 403);
        $uid = $cid;
    } else {
        $c = rt_family_child_uid($db, $uid);
        if ($c) $uid = $c;
    }
}

$balance = 0; $earned = 0; $count = 0;
try {
    $q = $db->prepare(
        "SELECT data FROM module_data
         WHERE user_id = ? AND module = 'bank' AND collection = 'points' AND deleted_at IS NULL"
    );
    $q->execute([$uid]);
    foreach ($q->fetchAll() as $row) {
        $d = ($row['data'] !== null) ? json_decode($row['data'], true) : null;
        if (!is_array($d)) continue;
        $n = isset($d['n']) ? (int)$d['n'] : 0;
        $balance += $n;
        if ($n > 0 && (!isset($d['kind']) || $d['kind'] !== 'spend')) $earned += $n;
        $count++;
    }
} catch (Throwable $e) {
    rt_json(['error' => 'db'], 500);
}

rt_json(['ok' => true, 'balance' => $balance, 'earned' => $earned, 'count' => $count]);
