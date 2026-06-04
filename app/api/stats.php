<?php
/**
 * GET /api/stats.php — агрегаты для дашбордов.
 * Готовый источник данных для будущих красивых экранов статистики (родитель).
 */

require __DIR__ . '/_bootstrap.php';
rt_guard();

$uid = rt_user_id();
$db  = rt_db();

function rt_one($db, $sql, $args = []) { $s = $db->prepare($sql); $s->execute($args); return $s->fetch(); }
function rt_all($db, $sql, $args = []) { $s = $db->prepare($sql); $s->execute($args); return $s->fetchAll(); }

// Текущее состояние
$totals = rt_one($db,
    "SELECT
        COUNT(*) AS items,
        SUM(status='want')     AS want,
        SUM(status='thinking') AS thinking,
        SUM(status='bought')   AS bought,
        SUM(favorite=1)        AS favorites
     FROM wishlist_items WHERE user_id=? AND deleted_at IS NULL", [$uid]);

// Покупки и «передумал» (по событиям — считает повторы)
$purchases   = (int)rt_one($db, "SELECT COUNT(*) c FROM events WHERE user_id=? AND type='purchased'", [$uid])['c'];
$changedMind = (int)rt_one($db, "SELECT COUNT(*) c FROM events WHERE user_id=? AND type='changed_mind'", [$uid])['c'];

// Среднее время до покупки (дни)
$avg = rt_one($db, "SELECT AVG(DATEDIFF(bought_at, created_at)) a FROM wishlist_items WHERE user_id=? AND bought_at IS NOT NULL", [$uid]);
$avgDays = ($avg && $avg['a'] !== null) ? round((float)$avg['a'], 1) : null;

// Самое непостоянное желание
$fickle = rt_one($db,
    "SELECT item_title AS title, COUNT(*) AS c
     FROM events WHERE user_id=? AND type='changed_mind' AND item_id IS NOT NULL
     GROUP BY item_id ORDER BY c DESC LIMIT 1", [$uid]);

// Воронка
$funnel = [
    'created'          => (int)rt_one($db, "SELECT COUNT(DISTINCT item_id) c FROM events WHERE user_id=? AND type='created'", [$uid])['c'],
    'reached_thinking' => (int)rt_one($db, "SELECT COUNT(DISTINCT item_id) c FROM events WHERE user_id=? AND type='changed_mind'", [$uid])['c'],
    'reached_bought'   => (int)rt_one($db, "SELECT COUNT(DISTINCT item_id) c FROM events WHERE user_id=? AND type='purchased'", [$uid])['c'],
];

// Активность по дням (30 дней) и по часам — для графиков
$byDay  = rt_all($db, "SELECT DATE(created_at) d, COUNT(*) c FROM events WHERE user_id=? AND created_at >= (CURDATE() - INTERVAL 29 DAY) GROUP BY d ORDER BY d", [$uid]);
$byHour = rt_all($db, "SELECT HOUR(created_at) h, COUNT(*) c FROM events WHERE user_id=? GROUP BY h ORDER BY h", [$uid]);
$byType = rt_all($db, "SELECT type, COUNT(*) c FROM events WHERE user_id=? GROUP BY type ORDER BY c DESC", [$uid]);

rt_json([
    'totals' => [
        'items'     => (int)$totals['items'],
        'want'      => (int)$totals['want'],
        'thinking'  => (int)$totals['thinking'],
        'bought'    => (int)$totals['bought'],
        'favorites' => (int)$totals['favorites'],
    ],
    'purchases_total'    => $purchases,
    'changed_mind_total' => $changedMind,
    'avg_days_to_buy'    => $avgDays,
    'most_fickle'        => $fickle ? ['title' => $fickle['title'], 'count' => (int)$fickle['c']] : null,
    'funnel'             => $funnel,
    'by_day'             => array_map(function ($r) { return ['day' => $r['d'], 'count' => (int)$r['c']]; }, $byDay),
    'by_hour'            => array_map(function ($r) { return ['hour' => (int)$r['h'], 'count' => (int)$r['c']]; }, $byHour),
    'by_type'            => array_map(function ($r) { return ['type' => $r['type'], 'count' => (int)$r['c']]; }, $byType),
]);
