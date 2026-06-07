<?php
/** RobTop — общие помощники API. */

require __DIR__ . '/_db.php';
require_once __DIR__ . '/_mail.php';
require_once __DIR__ . '/_accounts.php';

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
 * Текущий пользователь — ЕДИНСТВЕННОЕ место определения личности.
 * Приоритет: валидная сессия (кто-то вошёл) → её user_id.
 * Иначе, если single_user=true (по умолчанию) — Артём (id 1), как раньше (ничего не ломается).
 * Иначе (single_user=false и нет сессии) — 0 (аноним); защищённые эндпоинты требуют вход сами.
 */
if (!defined('RT_DEFAULT_USER_ID')) define('RT_DEFAULT_USER_ID', 1);

function rt_user_id() {
    static $uid = null;
    if ($uid !== null) return $uid;
    try {
        $sid = rt_session_user_id();
        if ($sid) { $uid = (int)$sid; return $uid; }
    } catch (Throwable $e) { /* нет таблиц/сессии — падаем в фолбэк ниже */ }
    $c = rt_config();
    $single = !array_key_exists('single_user', $c) || !empty($c['single_user']);
    $uid = $single ? RT_DEFAULT_USER_ID : 0;
    return $uid;
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
 * Админ-гейт управления приложениями (§4.10 плана аккаунтов, реализован полностью 2026-06-07):
 * доступно ТОЛЬКО активной РОДИТЕЛЬСКОЙ СЕССИИ. PIN-система (admin_pin / rt_admin_ok)
 * полностью упразднена. Используется эндпоинтами store/*.
 */
function rt_admin_gate() {
    try {
        $uid = rt_session_user_id();
        if ($uid) {
            $a = rt_account(rt_db(), $uid);
            if ($a && $a['kind'] === 'parent' && $a['status'] === 'active') return true;
        }
    } catch (Throwable $e) { /* нет таблиц/сессии — доступ закрыт */ }
    return false;
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
