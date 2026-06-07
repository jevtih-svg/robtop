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
rt_guard();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') rt_json(['error' => 'method'], 405);

$uid  = rt_user_id();
$db   = rt_db();
$body = rt_body();

$op     = isset($body['op']) ? (string)$body['op'] : '';
$module = isset($body['module']) ? (string)$body['module'] : '';
$coll   = isset($body['collection']) && $body['collection'] !== '' ? (string)$body['collection'] : 'default';
$id     = isset($body['id']) && $body['id'] !== null ? (int)$body['id'] : null;

if (!preg_match('/^[a-z0-9_-]{2,40}$/', $module)) rt_json(['error' => 'bad module'], 422);

// Модуль должен быть установлен и включён.
$mod = rt_module_row($db, $module);
if (!$mod || (int)$mod['enabled'] !== 1) rt_json(['error' => 'module not enabled'], 403);

$role  = rt_user_role();
$writes = ['create','update','move','favorite','delete','restore'];
if (in_array($op, $writes, true) && !rt_role_can($mod, 'edit', $role)) {
    rt_json(['error' => 'forbidden'], 403);
}

// Семейный пул (2026-06-07): роль parent работает с данными РЕБЁНКА своей семьи, а не со своим
// пустым скоупом. Так родитель пишет прогулки (walk) и очки (bank) в общий пул; писать можно
// только в модули, чей манифест разрешает edit роли parent (проверка выше). События ниже тоже
// зеркалятся под ребёнком ($uid передаётся в rt_log), автор фиксируется модулем в data.author.
if ($role === 'parent') {
    $cid = rt_family_child_uid($db, $uid);
    if ($cid) $uid = $cid;
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
        $q = $db->prepare(
            "SELECT id, status, favorite, data,
                    UNIX_TIMESTAMP(created_at)*1000 AS createdAt,
                    UNIX_TIMESTAMP(updated_at)*1000 AS updatedAt
             FROM module_data
             WHERE user_id=? AND module=? AND collection=? AND deleted_at IS NULL
             ORDER BY sort ASC, id DESC"
        );
        $q->execute([$uid, $module, $coll]);
        $items = array_map('rt_md_out', $q->fetchAll());
        rt_json(['ok' => true, 'items' => $items]);
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
        $status = isset($data['status']) ? (string)$data['status'] : '';
        $st = $db->prepare(
            "INSERT INTO module_data (user_id, module, collection, status, favorite, sort, data, created_at, updated_at)
             VALUES (?, ?, ?, ?, 0, 0, ?, NOW(), NOW())"
        );
        $st->execute([$uid, $module, $coll, $status, json_encode($data, JSON_UNESCAPED_UNICODE)]);
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
        $merged = array_merge($cur, $patch);
        $db->prepare("UPDATE module_data SET data=?, updated_at=NOW() WHERE id=? AND user_id=?")
           ->execute([json_encode($merged, JSON_UNESCAPED_UNICODE), $id, $uid]);
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
        rt_log($module, $type, null, null, null, null, $meta, $uid);
        rt_json(['ok' => true]);
    }

    default:
        rt_json(['error' => 'unknown op'], 400);
}
