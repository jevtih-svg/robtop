<?php
/**
 * POST /api/tasks.php — ОБЩИЙ СЕРВИС заданий (канон — ГАЙД-задания.md).
 *
 * Задания — ресурс уровня приложения (как очки и оповещения), НЕ данные одного модуля:
 * отдельная таблица tasks, один источник правды. UI два — модуль «Задания» (главный хаб)
 * и блок «Задания» в Копилке; оба ходят сюда через движок sdk.tasks (core/sdk.js).
 * Сервис НАРОЧНО не гейтится включённостью плиток.
 *
 * origin (миграция 025): 'parent' — родитель назначил; 'child' — ребёнок ЗАЛОГИРОВАЛ
 * сделанное дело с предложенными очками (ждёт ревью). pending различается по origin:
 *   origin=parent → проверка выполнения (decline → назад в active);
 *   origin=child  → предложение ребёнка (approve может ПОПРАВИТЬ очки; deny → удалить).
 *
 * Тело: { op, id?, title?, points?, type?, patch?, child? }
 * op:
 *   list                       — задания скоупа (живые, свежие сверху)
 *   create {title,points,type} — родитель: новое задание (origin=parent, status=active)
 *   propose {title,points}     — РЕБЁНОК: залогировать дело (origin=child, type=once, status=pending)
 *   update {id, patch:{title?,points?,type?}} — родитель: правка
 *   delete {id}                — родитель: мягкое удаление
 *   claim  {id}                — ребёнок «Сделал!»: active → pending (ВСЕГДА, и once, и recur)
 *   approve{id, points?}       — родитель: pending → (once/child: done | recur: active, times_done+1);
 *                                points? — поправленная сумма (для предложений ребёнка)
 *   decline{id}                — родитель: pending(origin=parent) → active, без очков
 *   deny   {id}                — родитель: pending(origin=child) → мягкое удаление (предложение отклонено)
 *
 * ОЧКИ сервис НЕ начисляет: канон ГАЙД-очки.md — только sdk.points (движок винстрика
 * на клиенте). Порядок в движке: сначала очки, потом статус. Переходы здесь УСЛОВНЫЕ
 * (WHERE status/origin=...): гонка двух устройств → 409, клиент перечитывает (live-sync).
 *
 * Скоуп — как в data.php: ребёнок — свои; родитель — выбранного ребёнка (child=<id>, права
 * rt_can_manage_child), без child — первый ребёнок семьи. События — в events под РЕБЁНКОМ.
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
/* валидация (rt_task_clean_*), бэкфилл (rt_tasks_backfill), rt_task_ms_to_dt, $TASK_SELECT,
   rt_task_out, rt_task_row — в _tasks.php (переиспользуются дашбордом parent.php) */

$id = isset($body['id']) && $body['id'] !== null ? (int)$body['id'] : null;

switch ($op) {

    case 'list': {
        rt_tasks_backfill($db, $uid);
        $s = $db->prepare(rt_task_select() . " WHERE user_id = ? AND deleted_at IS NULL ORDER BY id DESC");
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
            "INSERT INTO tasks (user_id, title, points, type, status, origin, created_by, created_at, updated_at)
             VALUES (?, ?, ?, ?, 'active', 'parent', ?, NOW(), NOW())"
        )->execute([$uid, $title, $pts, $type, (int)$me]);
        $newId = (int)$db->lastInsertId();
        rt_log('tasks', 'created', $newId, $title, null, 'active', ['points' => $pts, 'type' => $type], $uid);
        $r = rt_task_row($db, $uid, $newId);
        rt_json(['ok' => true, 'item' => $r ? rt_task_out($r) : null]);
    }

    case 'propose': {
        // РЕБЁНОК логирует сделанное дело с предложенными очками → ждёт ревью родителя.
        rt_task_child_only($role);
        $title = rt_task_clean_title(isset($body['title']) ? $body['title'] : '');
        if ($title === '') rt_json(['error' => 'title required'], 422);
        $pts = rt_task_clean_points(isset($body['points']) ? $body['points'] : 10);
        $db->prepare(
            "INSERT INTO tasks (user_id, title, points, type, status, origin, created_by, claimed_at, created_at, updated_at)
             VALUES (?, ?, ?, 'once', 'pending', 'child', ?, NOW(), NOW(), NOW())"
        )->execute([$uid, $title, $pts, (int)$me]);
        $newId = (int)$db->lastInsertId();
        rt_log('tasks', 'proposed', $newId, $title, null, 'pending', ['points' => $pts, 'origin' => 'child'], $uid);
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
        // Ребёнок отметил выполнение → ВСЕГДА на проверку родителю (универсальное подтверждение,
        // решение Джеффа 2026-06-08): и одноразовые, и повторяющиеся идут в pending.
        rt_task_child_only($role);
        if ($id === null) rt_json(['error' => 'id required'], 422);
        $r = rt_task_row($db, $uid, $id);
        if (!$r) rt_json(['error' => 'not found'], 404);
        $q = $db->prepare("UPDATE tasks SET status='pending', claimed_at=NOW(), updated_at=NOW()
                           WHERE id=? AND user_id=? AND status='active' AND origin='parent'");
        $q->execute([$id, $uid]);
        if ($q->rowCount() < 1) rt_json(['ok' => false, 'error' => 'state'], 409);
        rt_log('tasks', 'claimed', $id, (string)$r['title'], 'active', 'pending',
               ['points' => (int)$r['points']], $uid);
        rt_json(['ok' => true, 'status' => 'pending']);
    }

    case 'approve': {
        rt_task_parent_only($role);
        if ($id === null) rt_json(['error' => 'id required'], 422);
        $r = rt_task_row($db, $uid, $id);
        if (!$r) rt_json(['error' => 'not found'], 404);
        // поправленные очки (для предложений ребёнка — родитель может изменить сумму)
        if (array_key_exists('points', $body)) {
            $pts = rt_task_clean_points($body['points']);
            $db->prepare("UPDATE tasks SET points=? WHERE id=? AND user_id=? AND status='pending'")
               ->execute([$pts, $id, $uid]);
        }
        // recur (origin=parent) — задание остаётся активным, счётчик +1; once и любое предложение — done
        $recur = ($r['type'] !== 'once' && $r['origin'] !== 'child');
        $q = $recur
            ? $db->prepare("UPDATE tasks SET status='active', times_done=times_done+1, last_done_at=NOW(),
                                             claimed_at=NULL, updated_at=NOW()
                            WHERE id=? AND user_id=? AND status='pending'")
            : $db->prepare("UPDATE tasks SET status='done', done_at=NOW(), claimed_at=NULL, updated_at=NOW()
                            WHERE id=? AND user_id=? AND status='pending'");
        $q->execute([$id, $uid]);
        if ($q->rowCount() < 1) rt_json(['ok' => false, 'error' => 'state'], 409);
        $r2 = rt_task_row($db, $uid, $id);
        rt_log('tasks', 'approved', $id, (string)$r['title'], 'pending', $recur ? 'active' : 'done',
               ['points' => $r2 ? (int)$r2['points'] : (int)$r['points'], 'origin' => $r['origin']], $uid);
        rt_json(['ok' => true, 'status' => $recur ? 'active' : 'done',
                 'points' => $r2 ? (int)$r2['points'] : (int)$r['points']]);
    }

    case 'decline': {
        // Проверка выполнения отклонена → назад в active (только задания родителя).
        rt_task_parent_only($role);
        if ($id === null) rt_json(['error' => 'id required'], 422);
        $r = rt_task_row($db, $uid, $id);
        if (!$r) rt_json(['error' => 'not found'], 404);
        $q = $db->prepare("UPDATE tasks SET status='active', claimed_at=NULL, updated_at=NOW()
                           WHERE id=? AND user_id=? AND status='pending' AND origin='parent'");
        $q->execute([$id, $uid]);
        if ($q->rowCount() < 1) rt_json(['ok' => false, 'error' => 'state'], 409);
        rt_log('tasks', 'declined', $id, (string)$r['title'], 'pending', 'active', null, $uid);
        rt_json(['ok' => true, 'status' => 'active']);
    }

    case 'deny': {
        // Предложение ребёнка отклонено → мягкое удаление (исчезает; решение Джеффа).
        rt_task_parent_only($role);
        if ($id === null) rt_json(['error' => 'id required'], 422);
        $r = rt_task_row($db, $uid, $id);
        if (!$r) rt_json(['error' => 'not found'], 404);
        $q = $db->prepare("UPDATE tasks SET deleted_at=NOW(), status='done', claimed_at=NULL, updated_at=NOW()
                           WHERE id=? AND user_id=? AND status='pending' AND origin='child'");
        $q->execute([$id, $uid]);
        if ($q->rowCount() < 1) rt_json(['ok' => false, 'error' => 'state'], 409);
        rt_log('tasks', 'denied', $id, (string)$r['title'], 'pending', null, null, $uid);
        rt_json(['ok' => true, 'status' => 'denied']);
    }

    default:
        rt_json(['error' => 'unknown op'], 400);
}
