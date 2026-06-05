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
 * ВРЕМЕННЫЙ ОДНОПОЛЬЗОВАТЕЛЬСКИЙ РЕЖИМ.
 * Пока вход по PIN не сделан, все данные принадлежат одному пользователю — Артём (id 1).
 * Это ЕДИНСТВЕННОЕ место, где определяется текущий пользователь.
 * Когда добавим вход по PIN — менять только эту функцию (вернуть id залогиненного),
 * остальное приложение трогать не нужно.
 */
if (!defined('RT_DEFAULT_USER_ID')) define('RT_DEFAULT_USER_ID', 1);

function rt_user_id() {
    return RT_DEFAULT_USER_ID;
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

/** Роль текущего пользователя (для проверки прав модулей). */
function rt_user_role() {
    static $role = null;
    if ($role === null) {
        try {
            $s = rt_db()->prepare("SELECT role FROM users WHERE id = ?");
            $s->execute([rt_user_id()]);
            $r = $s->fetch();
            $role = ($r && isset($r['role'])) ? $r['role'] : 'child';
        } catch (Throwable $e) { $role = 'child'; }
    }
    return $role;
}

/**
 * Проверка PIN администратора (родитель/разработчик).
 * PIN задаётся в config.php (admin_pin). Если не задан — админ-операции запрещены.
 */
function rt_admin_ok($pin) {
    $c = rt_config();
    $set = isset($c['admin_pin']) ? (string)$c['admin_pin'] : '';
    if ($set === '') return false;
    return is_string($pin) && hash_equals($set, (string)$pin);
}

/* ---------- Реестр модулей ---------- */
function rt_modules_all($db) {
    return $db->query(
        "SELECT id,name,version,manifest,source,trusted,server,enabled,sort_order
         FROM modules WHERE deleted_at IS NULL ORDER BY sort_order ASC, id ASC"
    )->fetchAll();
}
function rt_module_row($db, $id) {
    $s = $db->prepare("SELECT * FROM modules WHERE id = ? AND deleted_at IS NULL");
    $s->execute([$id]);
    return $s->fetch();
}
function rt_module_meta($r) {
    $man = (!empty($r['manifest'])) ? json_decode($r['manifest'], true) : [];
    if (!is_array($man)) $man = [];
    return [
        'id'      => $r['id'],
        'name'    => $r['name'],
        'version' => $r['version'],
        'color'   => isset($man['color']) ? $man['color'] : '#19e3ff',
        'icon'    => isset($man['icon']) ? $man['icon'] : null,
        'wide'    => !empty($man['wide']),
        'status'  => isset($man['status']) ? $man['status'] : 'active',
        'source'  => $r['source'],
        'server'  => ((int)$r['server'] === 1),
    ];
}
function rt_role_can($mod, $action, $role) {
    $man = (!empty($mod['manifest'])) ? json_decode($mod['manifest'], true) : [];
    $roles = (is_array($man) && isset($man['roles'][$action]) && is_array($man['roles'][$action]))
        ? $man['roles'][$action]
        : ($action === 'read' ? ['child','parent'] : ['child']);
    return in_array($role, $roles, true);
}
