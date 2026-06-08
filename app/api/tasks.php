<?php
/**
 * POST /api/tasks.php — ОБЩИЙ СЕРВИС заданий от родителей (канон — ГАЙД-задания.md).
 *
 * Задания — ресурс уровня приложения (как очки и оповещения), НЕ данные одного модуля:
 * отдельная таблица tasks, один источник правды. UI два — Копилка (блок на вкладке
 * «Родители») и модуль «Задания»; оба ходят сюда через движок sdk.tasks (core/sdk.js).
 * Сервис НАРОЧНО не гейтится включённостью плиток: выключенная плитка «Задания» или
 * «Копилка» не должна ломать задания в соседнем UI.
 *
 * Тело: { op, id?, title?, points?, type?, patch?, child? }
 * op:
 *   list                  — задания скоупа (живые, свежие сверху)
 *   create {title,points,type}            — родитель: новое задание (status active)
 *   update {id, patch:{title?,points?,type?}} — родитель: правка
 *   delete {id}           — родитель: мягкое удаление
 *   claim  {id}           — ребёнок «Сделал!»: active → (once: done | recur: pending)
 *   approve{id}           — родитель: pending → (once: done | recur: active, times_done+1)
 *   decline{id}           — родитель: pending → active, без очков и штрафа (решение Джеффа)
 *
 * ОЧКИ сервис НЕ начисляет: канон ГАЙД-очки.md — только sdk.points (движок винстрика
 * на клиенте). Порядок в движке: сначала очки, потом статус («нет очков → нет статуса»).
 * Переходы статусов здесь УСЛОВНЫЕ (WHERE status=...): гонка двух устройств отдаёт 409,
 * клиент перечитывает список (live-sync).
 *
 * Скоуп — как в data.php: ребёнок видит свои задания; родитель — выбранного на дашборде
 * ребёнка (child=<id>, права rt_can_manage_child), без child — первый ребёнок семьи.
 * События пишутся в events под РЕБЁНКОМ (module 'tasks'), как у семейного пула.
 *
 * Бэкфилл: при первом list скоупа, если в tasks ещё нет ни одной строки этого ребёнка,
 * живые строки generic-стора bank/tasks (module_data) копируются сюда. Старые строки
 * module_data не трогаются (аддитивность) — остаются неживой историей.
 */

require __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_tasks.php';   // переиспользуемые помощники: валидация, бэкфилл, счётчик
rt_guard();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') rt_json(['error' => 'method'], 405);

$db   = rt_db();
$me   = rt_user_id();
$body = rt_body();
$op   = isset($body['op']) ? (string)$body['op'] : '';
$role = rt_user_role();

/* ---- скоуп: чьи задания (по образцу data.php) ---- */
$uid = (int)$me;
if ($role === 'parent') {
    $cid = isset($body['child']) ? (int)$body['child'] : 0;
    if ($cid > 0) {
        if (!rt_can_manage_child($db, $me, $cid)) rt_json(['error' => 'forbidden child'], 403);
        $uid = $cid;
    } else {
        $cid = rt_family_child_uid($db, $me);
        if ($cid) $uid = $cid;
    }
}

function rt_task_parent_only($role) { if ($role !== 'parent') rt_json(['error' => 'forbidden'], 403); }
function rt_task_child_only($role)  { if ($role === 'parent') rt_json(['error' => 'forbidden'], 403); }
/* валидация (rt_task_clean_*), бэкфилл (rt_tasks_backfill) и rt_task_ms_to_dt — в _tasks.php */

$TASK_SELECT = "SELECT id, user_id, title, points, type, status, times_done,
        UNIX_TIMESTAMP(last_done_at)*1000 AS lastDoneAt,
        UNIX_TIMESTAMP(claimed_at)*1000  AS claimedAt,
        UNIX_TIMESTAMP(done_at)*1000     AS doneAt,
        UNIX_TIMESTAMP(created_at)*1000  AS createdAt,
        UNIX_TIMESTAMP(updated_at)*1000  AS updatedAt
   FROM tasks";

function rt_task_out($r) {
    return [
        'id'         => (string)$r['id'],
        'title'      => (string)$r['title'],
        'points'     => (int)$r['points'],
        'type'       => ($r['type'] === 'once') ? 'once' : 'recur',
        'status'     => (string)$r['status'],
        'timesDone'  => (int)$r['times_done'],
        'lastDoneAt' => $r['lastDoneAt'] !== null ? (int)$r['lastDoneAt'] : null,
        'claimedAt'  => $r['claimedAt'] !== null ? (int)$r['claimedAt'] : null,
        'doneAt'     => $r['doneAt'] !== null ? (int)$r['doneAt'] : null,
        'createdAt'  => $r['createdAt'] !== null ? (int)$r['createdAt'] : null,
        'updatedAt'  => $r['updatedAt'] !== null ? (int)$r['updatedAt'] : null,
    ];
}

function rt_task_row($db, $uid, $id) {
    global $TASK_SELECT;
    $s = $db->prepare($TASK_SELECT . " WHERE id = ? AND user_id = ? AND deleted_at IS NULL");
    $s->execute([(int)$id, (int)$uid]);
    return $s->fetch();
}

$id = isset($body['id']) && $body['id'] !== null ? (int)$body['id'] : null;

switch ($op) {

    case 'list': {
        rt_tasks_backfill($db, $uid);
        $s = $db->prepare($TASK_SELECT . " WHERE user_id = ? AND deleted_at IS NULL ORDER BY id DESC");
        $s->execute([$uid]);
        rt_json(['ok' => true, 'items' => array_map('rt_task_out', $s->fetchAll())]);
    }

    case 'create': {
        rt_task_parent_only($role);
        $title = rt_task_clean_title(isset($body['title']) ? $body['title'] : '');
        if ($title === '') rt_json(['error' => 'title required'], 422);
        $pts  = rt_task_clean_points(isset($body['points']) ? $body['points'] : 10);
        $type = rt_task_clean_type(isset($body['type']) ? $body['type'] : 'recur');
        $db->prepare(
            "INSERT INTO tasks (user_id, title, points, type, status, created_by, created_at, updated_at)
             VALUES (?, ?, ?, ?, 'active', ?, NOW(), NOW())"
        )->execute([$uid, $title, $pts, $type, (int)$me]);
        $newId = (int)$db->lastInsertId();
        rt_log('tasks', 'created', $newId, $title, null, 'active', ['points' => $pts, 'type' => $type], $uid);
        $r = rt_task_row($db, $uid, $newId);
        rt_json(['ok' => true, 'item' => $r ? rt_task_out($r) : null]);
    }

    case 'update': {
        rt_task_parent_only($role);
        if ($id === null) rt_json(['error' => 'id required'], 422);
        $r = rt_task_row($db, $uid, $id);
        if (!$r) rt_json(['error' => 'not found'], 404);
        $p = isset($body['patch']) && is_array($body['patch']) ? $body['patch'] : [];
        $title = array_key_exists('title', $p)  ? rt_task_clean_title($p['title'])   : (string)$r['title'];
        if ($title === '') $title = (string)$r['title'];
        $pts   = array_key_exists('points', $p) ? rt_task_clean_points($p['points']) : (int)$r['points'];
        $type  = array_key_exists('type', $p)   ? rt_task_clean_type($p['type'])     : $r['type'];
        $db->prepare("UPDATE tasks SET title=?, points=?, type=?, updated_at=NOW() WHERE id=? AND user_id=?")
           ->execute([$title, $pts, $type, $id, $uid]);
        rt_log('tasks', 'edited', $id, $title, null, null, ['points' => $pts, 'type' => $type], $uid);
        rt_json(['ok' => true]);
    }

    case 'delete': {
        rt_task_parent_only($role);
        if ($id === null) rt_json(['error' => 'id required'], 422);
        $r = rt_task_row($db, $uid, $id);
        if (!$r) rt_json(['error' => 'not found'], 404);
        $db->prepare("UPDATE tasks SET deleted_at=NOW(), updated_at=NOW() WHERE id=? AND user_id=?")
           ->execute([$id, $uid]);
        rt_log('tasks', 'deleted', $id, (string)$r['title'], null, null, null, $uid);
        rt_json(['ok' => true]);
    }

    case 'claim': {
        rt_task_child_only($role);
        if ($id === null) rt_json(['error' => 'id required'], 422);
        $r = rt_task_row($db, $uid, $id);
        if (!$r) rt_json(['error' => 'not found'], 404);
        $once = ($r['type'] === 'once');
        $q = $once
            ? $db->prepare("UPDATE tasks SET status='done', done_at=NOW(), updated_at=NOW()
                            WHERE id=? AND user_id=? AND status='active'")
            : $db->prepare("UPDATE tasks SET status='pending', claimed_at=NOW(), updated_at=NOW()
                            WHERE id=? AND user_id=? AND status='active'");
        $q->execute([$id, $uid]);
        if ($q->rowCount() < 1) rt_json(['ok' => false, 'error' => 'state'], 409);
        rt_log('tasks', 'claimed', $id, (string)$r['title'], 'active', $once ? 'done' : 'pending',
               ['points' => (int)$r['points']], $uid);
        rt_json(['ok' => true, 'status' => $once ? 'done' : 'pending']);
    }

    case 'approve': {
        rt_task_parent_only($role);
        if ($id === null) rt_json(['error' => 'id required'], 422);
        $r = rt_task_row($db, $uid, $id);
        if (!$r) rt_json(['error' => 'not found'], 404);
        $once = ($r['type'] === 'once');
        $q = $once
            ? $db->prepare("UPDATE tasks SET status='done', done_at=NOW(), claimed_at=NULL, updated_at=NOW()
                            WHERE id=? AND user_id=? AND status='pending'")
            : $db->prepare("UPDATE tasks SET status='active', times_done=times_done+1, last_done_at=NOW(),
                                             claimed_at=NULL, updated_at=NOW()
                            WHERE id=? AND user_id=? AND status='pending'");
        $q->execute([$id, $uid]);
        if ($q->rowCount() < 1) rt_json(['ok' => false, 'error' => 'state'], 409);
        rt_log('tasks', 'approved', $id, (string)$r['title'], 'pending', $once ? 'done' : 'active',
               ['points' => (int)$r['points']], $uid);
        rt_json(['ok' => true, 'status' => $once ? 'done' : 'active']);
    }

    case 'decline': {
        rt_task_parent_only($role);
        if ($id === null) rt_json(['error' => 'id required'], 422);
        $r = rt_task_row($db, $uid, $id);
        if (!$r) rt_json(['error' => 'not found'], 404);
        $q = $db->prepare("UPDATE tasks SET status='active', claimed_at=NULL, updated_at=NOW()
                           WHERE id=? AND user_id=? AND status='pending'");
        $q->execute([$id, $uid]);
        if ($q->rowCount() < 1) rt_json(['ok' => false, 'error' => 'state'], 409);
        rt_log('tasks', 'declined', $id, (string)$r['title'], 'pending', 'active', null, $uid);
        rt_json(['ok' => true, 'status' => 'active']);
    }

    default:
        rt_json(['error' => 'unknown op'], 400);
}
