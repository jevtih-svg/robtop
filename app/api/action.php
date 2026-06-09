<?php
/**
 * POST /api/action.php — ДИСПЕТЧЕР действий.
 *  - Кросс-модульные события вовлечённости (opened_module/viewed_detail/viewed_stats/opened_app)
 *    логируются здесь для любого модуля.
 *  - Действия с данными делегируются серверному модулю (modules/<id>/api.php), если он есть.
 *    Виш-лист (родной, server) — modules/wishlist/api.php. Обратная совместимость: без поля
 *    "module" считаем модулем 'wishlist' (как в прежнем клиенте).
 *  - Универсальные модули (generic) пишут данные напрямую через api/data.php.
 */

require __DIR__ . '/_bootstrap.php';
require __DIR__ . '/_storage.php';
rt_guard();
rt_require_login(rt_db()); // SEC 2026-06-09: вход обязателен (single_user-фолбэк убран)

if ($_SERVER['REQUEST_METHOD'] !== 'POST') rt_json(['error' => 'method'], 405);

$uid  = rt_user_id();
$db   = rt_db();
$body = rt_body();
$type   = isset($body['type']) ? (string)$body['type'] : '';
$itemId = isset($body['itemId']) && $body['itemId'] !== null ? (int)$body['itemId'] : null;
$data   = isset($body['data']) && is_array($body['data']) ? $body['data'] : [];
$module = isset($body['module']) ? (string)$body['module'] : 'wishlist';

// --- кросс-модульные события (только лог) ---
if (in_array($type, ['opened_module', 'viewed_detail', 'viewed_stats', 'opened_app'], true)) {
    $m = isset($data['module']) ? (string)$data['module'] : $module;
    $title = null;
    if ($itemId && $m === 'wishlist') {
        $s = $db->prepare("SELECT title FROM wishlist_items WHERE id=? AND user_id=?");
        $s->execute([$itemId, $uid]);
        $row = $s->fetch(); if ($row) $title = $row['title'];
    }
    rt_log($m, $type, $itemId, $title, null, null, $data ?: null);
    rt_json(['ok' => true]);
}

// --- делегирование серверному модулю ---
if ($module === 'chat') {
    require __DIR__ . '/../modules/chat/api.php';
    if (rt_chat_action($db, $uid, $type, $itemId, $data) === false) {
        rt_json(['error' => 'unknown type'], 400);
    }
}
if ($module === 'wishlist') {
    require __DIR__ . '/../modules/wishlist/api.php';
    if (rt_wishlist_action($db, $uid, $type, $itemId, $data) === false) {
        rt_json(['error' => 'unknown type'], 400);
    }
}

// Другие серверные модули можно подключать здесь по образцу выше.
// Универсальные (generic) модули используют api/data.php напрямую.
rt_json(['error' => 'unknown module/type'], 400);
