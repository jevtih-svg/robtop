<?php
/** RobTop — общие помощники API. */

require __DIR__ . '/_db.php';
require_once __DIR__ . '/_mail.php';
require_once __DIR__ . '/_accounts.php';
require_once __DIR__ . '/_push.php';

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

/** Запись события в общий аналитический журнал.
 *  $uidOverride — записать под другим user_id (семейный пул: data.php пишет события
 *  родителя под ребёнком, чтобы дашборд видел общую историю). null = rt_user_id(). */
function rt_log($module, $type, $itemId = null, $itemTitle = null, $from = null, $to = null, $meta = null, $uidOverride = null) {
    $st = rt_db()->prepare(
        "INSERT INTO events (user_id, module, item_id, item_title, type, from_status, to_status, meta, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())"
    );
    $st->execute([
        $uidOverride !== null ? (int)$uidOverride : rt_user_id(), $module, $itemId, $itemTitle, $type, $from, $to,
        $meta !== null ? json_encode($meta, JSON_UNESCAPED_UNICODE) : null,
    ]);
}

/**
 * Семейный пул данных: первый ребёнок родителя (прямое опекунство, затем дети семьи).
 * Используется data.php, чтобы роль parent читала и писала данные РЕБЁНКА (общие прогулки,
 * очки, справочники), а не свой пустой скоуп. null — детей нет. Запросы — по образцу
 * rt_parent_children() из parent.php (без фильтра статуса аккаунта: пул общий всегда).
 */
function rt_family_child_uid($db, $pid) {
    try {
        $s = $db->prepare(
            "SELECT child_user_id AS id FROM guardianships
             WHERE guardian_user_id = ? AND status = 'active'
             ORDER BY (type='provisional'), child_user_id LIMIT 1"
        );
        $s->execute([$pid]);
        $r = $s->fetch();
        if ($r) return (int)$r['id'];
        $s = $db->prepare(
            "SELECT fm2.user_id AS id
             FROM family_members fm1
             JOIN family_members fm2 ON fm1.family_id = fm2.family_id
             WHERE fm1.user_id = ? AND fm1.role IN ('owner','parent') AND fm1.status='active'
               AND fm2.role = 'child' AND fm2.status='active'
             ORDER BY fm2.user_id LIMIT 1"
        );
        $s->execute([$pid]);
        $r = $s->fetch();
        return $r ? (int)$r['id'] : null;
    } catch (Throwable $e) { return null; }
}

/**
 * ВСЕ дети родителя: прямые опекунства + дети его семей (объединение, как в sync.php).
 * Используется реордером магазина (сброс личных tile_order семьи). Пустой массив — детей нет.
 */
function rt_family_children_uids($db, $pid) {
    $ids = [];
    try {
        $s = $db->prepare(
            "SELECT child_user_id AS id FROM guardianships
             WHERE guardian_user_id = ? AND status = 'active'"
        );
        $s->execute([$pid]);
        foreach ($s->fetchAll() as $r) $ids[] = (int)$r['id'];
        $s = $db->prepare(
            "SELECT fm2.user_id AS id
             FROM family_members fm1
             JOIN family_members fm2 ON fm1.family_id = fm2.family_id
             WHERE fm1.user_id = ? AND fm1.role IN ('owner','parent') AND fm1.status='active'
               AND fm2.role = 'child' AND fm2.status='active'"
        );
        $s->execute([$pid]);
        foreach ($s->fetchAll() as $r) $ids[] = (int)$r['id'];
    } catch (Throwable $e) { /* нет таблиц семьи — пусто */ }
    return array_values(array_unique(array_map('intval', $ids)));
}

/**
 * ОБЩЕСЕМЕЙНЫЙ пул (манифест "familyPool":true, напр. walk): канонический владелец данных
 * для ЛЮБОГО участника семьи — первый активный ребёнок СЕМЬИ пользователя (и для детей тоже:
 * второй ребёнок пишет и читает в том же пуле, что и первый). Вне семьи: для родителя —
 * первый ребёнок по опекунству (rt_family_child_uid), иначе сам пользователь.
 */
function rt_family_pool_uid($db, $uid) {
    try {
        $fid = rt_user_family_id($db, $uid);
        if ($fid) {
            $s = $db->prepare(
                "SELECT user_id FROM family_members
                 WHERE family_id = ? AND role = 'child' AND status = 'active'
                 ORDER BY user_id LIMIT 1"
            );
            $s->execute([$fid]);
            $r = $s->fetch();
            if ($r) return (int)$r['user_id'];
        }
        $cid = rt_family_child_uid($db, $uid);
        return $cid !== null ? $cid : (int)$uid;
    } catch (Throwable $e) { return (int)$uid; }
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
        // roles ОБЯЗАТЕЛЬНО отдаются клиенту: sdk.can() модуля читает meta.roles; без них
        // can("edit") падал в дефолт ["child"] и родитель видел пустой мастер walk (фикс v.22)
        'roles'   => (isset($man['roles']) && is_array($man['roles'])) ? $man['roles'] : null,
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

/* ---------- Оповещения (ядро, миграция 020; канон — ГАЙД-оповещения.md) ---------- */
/**
 * Создать оповещение получателю. НИКОГДА не ломает основную операцию (всё в try/catch,
 * при ошибке просто false) — вызывай fire-and-forget после успешного основного действия.
 * $params — массив параметров i18n-шаблона клиента (ключ ntf.ev.<src>.<type> в core/notify.js);
 * $link — переход по тапу: ['module'=>'bank'] | ['module'=>'wishlist','item'=>'12']
 *         | ['view'=>'ticket','id'=>5] | ['view'=>'settings']. null — без перехода.
 * Себе оповещение не пишется ($actorId === $toUid). Кап: у получателя живут только
 * последние 100 строк — старые удаляются прямо здесь, отдельной чистки не нужно.
 */
function rt_notify($toUid, $src, $type, $params = null, $link = null, $actorId = null) {
    try {
        $toUid = (int)$toUid;
        if ($toUid <= 0) return false;
        if ($actorId !== null && (int)$actorId === $toUid) return false;
        $db = rt_db();
        $db->prepare(
            "INSERT INTO notifications (user_id, actor_id, src, type, params, link, created_at)
             VALUES (?, ?, ?, ?, ?, ?, NOW())"
        )->execute([
            $toUid,
            $actorId !== null ? (int)$actorId : null,
            mb_substr((string)$src, 0, 40),
            mb_substr((string)$type, 0, 40),
            $params !== null ? json_encode($params, JSON_UNESCAPED_UNICODE) : null,
            $link !== null ? json_encode($link, JSON_UNESCAPED_UNICODE) : null,
        ]);
        $s = $db->prepare("SELECT id FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 1 OFFSET 99");
        $s->execute([$toUid]);
        $min = $s->fetchColumn();
        if ($min) $db->prepare("DELETE FROM notifications WHERE user_id = ? AND id < ?")->execute([$toUid, (int)$min]);
        // web push «звонком» на устройства получателя (no-op, пока vapid не настроен в config)
        if (function_exists('rt_push_user')) rt_push_user($toUid);
        return true;
    } catch (Throwable $e) { return false; }
}

/**
 * Родители ребёнка (адресат "parents" в notify.php и серверные источники):
 * активные опекуны (guardianships) + родители/владельцы его семьи. Без дублей.
 */
function rt_child_parents($db, $cid) {
    $ids = [];
    try {
        $s = $db->prepare("SELECT guardian_user_id AS id FROM guardianships WHERE child_user_id = ? AND status = 'active'");
        $s->execute([(int)$cid]);
        foreach ($s->fetchAll() as $r) $ids[] = (int)$r['id'];
        $s = $db->prepare(
            "SELECT fm2.user_id AS id
             FROM family_members fm1
             JOIN family_members fm2 ON fm1.family_id = fm2.family_id
             WHERE fm1.user_id = ? AND fm1.role = 'child' AND fm1.status = 'active'
               AND fm2.role IN ('owner','parent') AND fm2.status = 'active'"
        );
        $s->execute([(int)$cid]);
        foreach ($s->fetchAll() as $r) $ids[] = (int)$r['id'];
    } catch (Throwable $e) { /* нет таблиц семьи — пусто */ }
    return array_values(array_unique(array_map('intval', $ids)));
}
