<?php
/**
 * POST /api/data.php — универсальное хранилище данных модулей (таблица module_data).
 * Любому модулю даёт CRUD + статусы + избранное + мягкое удаление + зеркалирование в events,
 * без отдельной таблицы и эндпоинтов.
 *
 * Тело: { op, module, collection?, id?, data?, patch?, status?, on?, type?, query? }
 * op: list | get | create | update | move | favorite | delete | restore | track
 */

require __DIR__ . '/_bootstrap.php';
require __DIR__ . '/_storage.php';
rt_guard();
rt_require_login(rt_db()); // SEC 2026-06-09: вход обязателен (single_user-фолбэк убран)

if ($_SERVER['REQUEST_METHOD'] !== 'POST') rt_json(['error' => 'method'], 405);

$uid  = rt_user_id();
$db   = rt_db();
$body = rt_body();

$op     = isset($body['op']) ? (string)$body['op'] : '';
$module = isset($body['module']) ? (string)$body['module'] : '';
$coll   = isset($body['collection']) && $body['collection'] !== '' ? (string)$body['collection'] : 'default';
$id     = isset($body['id']) && $body['id'] !== null ? (int)$body['id'] : null;

if (!preg_match('/^[a-z0-9_-]{2,40}$/', $module)) rt_json(['error' => 'bad module'], 422);
if (!preg_match('/^[a-z0-9_-]{1,60}$/', $coll)) rt_json(['error' => 'bad collection'], 422);

// Модуль должен быть установлен и включён.
$mod = rt_module_row($db, $module);
if (!$mod || (int)$mod['enabled'] !== 1) rt_json(['error' => 'module not enabled'], 403);

$role  = rt_user_role();
$writes = ['create','update','move','favorite','delete','restore'];
if (in_array($op, $writes, true) && !rt_role_can($mod, 'edit', $role)) {
    rt_json(['error' => 'forbidden'], 403);
}

// SEC 2026-06-09 (SEC-1): запись очков (bank/points) через универсальный data.php ЗАПРЕЩЕНА.
// Раньше ребёнок мог начислить себе любую сумму: fetch data.php {module:'bank',collection:'points',
// data:{n:1000000}}. Теперь леджер пишут ТОЛЬКО api/points.php и api/tasks.php (серверный
// авторитет суммы). Чтение (list/get) остаётся — клиент сам считает баланс/винстрик.
if ($module === 'bank' && $coll === 'points' && in_array($op, $writes, true)) {
    rt_json(['error' => 'points_readonly', 'message' => 'use api/points.php'], 403);
}

// Расписание ухода (walk/care) — пишет ТОЛЬКО родитель; дети видят на календаре (read).
// Манифест walk допускает edit и ребёнку (для прогулок), поэтому гейтим коллекцию отдельно.
if ($module === 'walk' && $coll === 'care' && in_array($op, $writes, true) && $role !== 'parent') {
    rt_json(['error' => 'forbidden', 'message' => 'care is parent-write-only'], 403);
}

// Скоуп данных (2026-06-07, три уровня):
// 1) ОБЩЕСЕМЕЙНЫЙ пул (манифест: "familyPool":true, напр. walk): ЛЮБАЯ роль — и родитель,
//    и КАЖДЫЙ ребёнок семьи — работает с одним пулом канонического владельца (первый ребёнок
//    семьи). Иначе данные фрагментируются по скоупам участников («ребёнок видит только свои
//    прогулки» — фидбек Джеффа). Автор записи — в data.author, события — под каноном.
// 1b) ОБЩЕСЕМЕЙНАЯ КОЛЛЕКЦИЯ (манифест: "familyCollections":["items"], напр. каталог Магазина):
//    ТОЛЬКО перечисленные коллекции — общесемейные (один каталог призов на всех детей,
//    фидбек Джеффа 2026-06-08), а остальные коллекции модуля скоупятся обычным образом
//    (заказы shop/orders — на каждого ребёнка свои, как и очки). Доступность товара
//    конкретному ребёнку — поле data.disabledFor (список user_id) внутри товара.
// 2) Иначе роль parent работает с данными РЕБЁНКА. С v.44 клиент (sdk.js) шлёт С КАЖДЫМ
//    запросом родителя child=<id> — ребёнок, ВЫБРАННЫЙ на дашборде; права проверяются
//    (rt_can_manage_child: активный опекун или родитель семьи), скоуп = именно он.
//    Раньше child не передавался и сервер молча брал ПЕРВОГО ребёнка семьи — при
//    нескольких детях родитель видел «одну копилку на всех» и начислял очки не тому
//    (баг Джеффа 2026-06-07). Фолбэк «первый ребёнок» оставлен для старых клиентов
//    из кэша. Дети — каждый со своим скоупом (личные модули: mood, rating, wishlist…).
$man = (!empty($mod['manifest'])) ? json_decode($mod['manifest'], true) : [];
$familyColls = (is_array($man) && !empty($man['familyCollections']) && is_array($man['familyCollections']))
    ? $man['familyCollections'] : [];
if (is_array($man) && !empty($man['familyPool'])) {
    $uid = rt_family_pool_uid($db, $uid);
} elseif (in_array($coll, $familyColls, true)) {
    $uid = rt_family_pool_uid($db, $uid);   // эта коллекция — общесемейная (каталог), остальные скоупятся ниже
} elseif ($role === 'parent') {
    $cid = isset($body['child']) ? (int)$body['child'] : 0;
    if ($cid > 0) {
        if (!rt_can_manage_child($db, $uid, $cid)) rt_json(['error' => 'forbidden child'], 403);
        $uid = $cid;
    } else {
        $cid = rt_family_child_uid($db, $uid);
        if ($cid) $uid = $cid;
    }
}

$actorUid = rt_user_id();
function rt_md_json($data) {
    $json = json_encode($data, JSON_UNESCAPED_UNICODE);
    if ($json === false) rt_json(['error' => 'bad data'], 422);
    if (strlen($json) > 65535) rt_json(['error' => 'data too big'], 413);
    return $json;
}
function rt_md_validate_payload($db, $data, $allowedUids) {
    rt_media_validate_value($db, $data, $allowedUids);
}

function rt_md_row($db, $uid, $module, $coll, $id) {
    $s = $db->prepare("SELECT * FROM module_data WHERE id=? AND user_id=? AND module=? AND collection=?");
    $s->execute([$id, $uid, $module, $coll]);
    return $s->fetch();
}
function rt_md_out($r) {
    return [
        'id'        => (string)$r['id'],
        'status'    => $r['status'],
        'favorite'  => ((int)$r['favorite'] === 1),
        'data'      => $r['data'] !== null ? json_decode($r['data'], true) : null,
        'createdAt' => isset($r['createdAt']) ? (int)$r['createdAt'] : null,
        'updatedAt' => isset($r['updatedAt']) ? (int)$r['updatedAt'] : null,
    ];
}

switch ($op) {

    case 'list': {
        $limit = isset($body['limit']) ? (int)$body['limit'] : 300;
        if ($limit < 1) $limit = 1;
        if ($limit > 300) $limit = 300;
        $offset = isset($body['offset']) ? (int)$body['offset'] : 0;
        if ($offset < 0) $offset = 0;
        $fetchLimit = $limit + 1;
        $q = $db->prepare(
            "SELECT id, status, favorite, data,
                    UNIX_TIMESTAMP(created_at)*1000 AS createdAt,
                    UNIX_TIMESTAMP(updated_at)*1000 AS updatedAt
             FROM module_data
             WHERE user_id=? AND module=? AND collection=? AND deleted_at IS NULL
             ORDER BY sort ASC, id DESC"
             . " LIMIT " . (int)$fetchLimit . " OFFSET " . (int)$offset
        );
        $q->execute([$uid, $module, $coll]);
        $items = array_map('rt_md_out', $q->fetchAll());
        $hasMore = count($items) > $limit;
        if ($hasMore) array_pop($items);
        rt_json(['ok' => true, 'items' => $items, 'limit' => $limit, 'offset' => $offset, 'hasMore' => $hasMore]);
    }

    case 'get': {
        if ($id === null) rt_json(['error' => 'id required'], 422);
        $r = rt_md_row($db, $uid, $module, $coll, $id);
        if (!$r) rt_json(['ok' => true, 'item' => null]);
        $r['createdAt'] = null; $r['updatedAt'] = null; // выровнять с rt_md_out
        rt_json(['ok' => true, 'item' => rt_md_out($r)]);
    }

    case 'create': {
        $data   = isset($body['data']) && is_array($body['data']) ? $body['data'] : [];
        rt_md_validate_payload($db, $data, [$uid, $actorUid]);
        $status = isset($data['status']) ? (string)$data['status'] : '';
        $st = $db->prepare(
            "INSERT INTO module_data (user_id, module, collection, status, favorite, sort, data, created_at, updated_at)
             VALUES (?, ?, ?, ?, 0, 0, ?, NOW(), NOW())"
        );
        $st->execute([$uid, $module, $coll, $status, rt_md_json($data)]);
        $newId = (int)$db->lastInsertId();
        rt_log($module, 'created', $newId, null, null, $status ?: null, ['collection' => $coll], $uid);
        $now = round(microtime(true) * 1000);
        rt_json(['ok' => true, 'item' => [
            'id' => (string)$newId, 'status' => $status, 'favorite' => false,
            'data' => $data, 'createdAt' => $now, 'updatedAt' => $now,
        ]]);
    }

    case 'update': {
        if ($id === null) rt_json(['error' => 'id required'], 422);
        $r = rt_md_row($db, $uid, $module, $coll, $id); if (!$r) rt_json(['error' => 'not found'], 404);
        $cur = $r['data'] !== null ? json_decode($r['data'], true) : [];
        if (!is_array($cur)) $cur = [];
        $patch = isset($body['patch']) && is_array($body['patch']) ? $body['patch'] : [];
        rt_md_validate_payload($db, $patch, [$uid, $actorUid]);
        $merged = array_merge($cur, $patch);
        $json = rt_md_json($merged);
        $db->prepare("UPDATE module_data SET data=?, updated_at=NOW() WHERE id=? AND user_id=?")
           ->execute([$json, $id, $uid]);
        rt_log($module, 'edited', $id, null, null, null, ['collection' => $coll], $uid);
        rt_json(['ok' => true]);
    }

    case 'move': {
        if ($id === null) rt_json(['error' => 'id required'], 422);
        $r = rt_md_row($db, $uid, $module, $coll, $id); if (!$r) rt_json(['error' => 'not found'], 404);
        $status = isset($body['status']) ? (string)$body['status'] : '';
        $db->prepare("UPDATE module_data SET status=?, updated_at=NOW() WHERE id=? AND user_id=?")
           ->execute([$status, $id, $uid]);
        rt_log($module, 'moved', $id, null, $r['status'], $status, ['collection' => $coll], $uid);
        rt_json(['ok' => true]);
    }

    case 'favorite': {
        if ($id === null) rt_json(['error' => 'id required'], 422);
        $r = rt_md_row($db, $uid, $module, $coll, $id); if (!$r) rt_json(['error' => 'not found'], 404);
        $on = !empty($body['on']) ? 1 : 0;
        $db->prepare("UPDATE module_data SET favorite=?, updated_at=NOW() WHERE id=? AND user_id=?")
           ->execute([$on, $id, $uid]);
        rt_log($module, $on ? 'favorite' : 'unfavorite', $id, null, null, null, ['collection' => $coll], $uid);
        rt_json(['ok' => true]);
    }

    case 'delete': {
        if ($id === null) rt_json(['error' => 'id required'], 422);
        $r = rt_md_row($db, $uid, $module, $coll, $id); if (!$r) rt_json(['error' => 'not found'], 404);
        $db->prepare("UPDATE module_data SET deleted_at=NOW(), updated_at=NOW() WHERE id=? AND user_id=?")->execute([$id, $uid]);
        rt_log($module, 'deleted', $id, null, null, null, ['collection' => $coll], $uid);
        rt_json(['ok' => true]);
    }

    case 'restore': {
        if ($id === null) rt_json(['error' => 'id required'], 422);
        $r = rt_md_row($db, $uid, $module, $coll, $id); if (!$r) rt_json(['error' => 'not found'], 404);
        $db->prepare("UPDATE module_data SET deleted_at=NULL, updated_at=NOW() WHERE id=? AND user_id=?")->execute([$id, $uid]);
        rt_log($module, 'restored', $id, null, null, null, ['collection' => $coll], $uid);
        rt_json(['ok' => true]);
    }

    case 'track': {
        $type = isset($body['type']) ? (string)$body['type'] : 'event';
        $meta = isset($body['data']) ? $body['data'] : null;
        if ($meta !== null && strlen(json_encode($meta, JSON_UNESCAPED_UNICODE)) > 4096) rt_json(['error' => 'data too big'], 413);
        rt_log($module, $type, null, null, null, null, $meta, $uid);
        rt_json(['ok' => true]);
    }

    default:
        rt_json(['error' => 'unknown op'], 400);
}
