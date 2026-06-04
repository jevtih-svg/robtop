<?php
/** RobTop — общие помощники API. */

require __DIR__ . '/_db.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

function rt_json($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function rt_body() {
    $raw = file_get_contents('php://input');
    $j = json_decode($raw, true);
    return is_array($j) ? $j : [];
}

/** Необязательная проверка токена (если задан в config). */
function rt_guard() {
    $c = rt_config();
    if (!empty($c['api_token'])) {
        $hdr = isset($_SERVER['HTTP_X_API_TOKEN']) ? $_SERVER['HTTP_X_API_TOKEN'] : '';
        if (!hash_equals($c['api_token'], $hdr)) {
            rt_json(['error' => 'unauthorized'], 401);
        }
    }
}

/**
 * Текущий пользователь. Пока вход по PIN не сделан — это Артём (id 1).
 * Позже здесь будет определение роли по PIN/сессии.
 */
function rt_user_id() {
    return 1;
}

/** Запись события в общий аналитический журнал. */
function rt_log($module, $type, $itemId = null, $itemTitle = null, $from = null, $to = null, $meta = null) {
    $st = rt_db()->prepare(
        "INSERT INTO events (user_id, module, item_id, item_title, type, from_status, to_status, meta, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())"
    );
    $st->execute([
        rt_user_id(), $module, $itemId, $itemTitle, $type, $from, $to,
        $meta !== null ? json_encode($meta, JSON_UNESCAPED_UNICODE) : null,
    ]);
}
