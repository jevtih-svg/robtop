<?php
/**
 * GET /api/parent.php — данные для РОДИТЕЛЬСКОГО ЭКРАНА (только чтение).
 *
 * Гейт: rt_require_parent (родительская сессия, активная). Никаких записей в БД,
 * никаких rt_log — просмотр родителя не засоряет журнал ребёнка.
 *
 * Параметры:
 *   child = id ребёнка (необязательно; по умолчанию первый ребёнок);
 *           доступ проверяется rt_can_read (опекунство ИЛИ родитель семьи ребёнка).
 *   days  = окно событий в днях (7..90, по умолчанию 30).
 *
 * Ответ: { ok, children[], child{id,nickname}, canViewImages, points, days,
 *          items[] (виш-лист ребёнка, как state.php, с history),
 *          events[] (журнал за окно, DESC, лимит 600),
 *          lastActivityAt }
 *
 * Приватность (§4.7 плана аккаунтов): содержимое фото видят только сам ребёнок и его
 * ПРЯМОЙ (primary) родитель / родитель его семьи. Временному (provisional) опекуну
 * пути к фото не отдаются вовсе (photo => null, canViewImages=false).
 */

require __DIR__ . '/_bootstrap.php';
rt_guard();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') rt_json(['error' => 'method'], 405);

$db = rt_db();
$u  = rt_require_parent($db);
rt_block_if_must_change($u);
$pid = (int)$u['id'];

/* ---------- дети родителя: опекунства + дети семьи (без дублей) ---------- */
function rt_parent_children($db, $pid) {
    $out = []; $seen = [];
    // 1) прямые опекунства (primary и provisional)
    $s = $db->prepare(
        "SELECT u.id, u.name AS nickname, g.type, a.status
         FROM guardianships g
         JOIN users u ON u.id = g.child_user_id
         JOIN accounts a ON a.user_id = u.id
         WHERE g.guardian_user_id = ? AND g.status = 'active'
         ORDER BY (g.type='provisional'), u.id"
    );
    $s->execute([$pid]);
    foreach ($s->fetchAll() as $r) {
        $seen[(int)$r['id']] = true;
        $out[] = ['id' => (int)$r['id'], 'nickname' => $r['nickname'], 'type' => $r['type'], 'status' => $r['status']];
    }
    // 2) дети семьи, где запрашивающий — owner/parent
    $s = $db->prepare(
        "SELECT u.id, u.name AS nickname, a.status
         FROM family_members fm1
         JOIN family_members fm2 ON fm1.family_id = fm2.family_id
         JOIN users u ON u.id = fm2.user_id
         JOIN accounts a ON a.user_id = u.id
         WHERE fm1.user_id = ? AND fm1.role IN ('owner','parent') AND fm1.status='active'
           AND fm2.role = 'child' AND fm2.status='active'
         ORDER BY u.id"
    );
    $s->execute([$pid]);
    foreach ($s->fetchAll() as $r) {
        if (!empty($seen[(int)$r['id']])) continue;
        $out[] = ['id' => (int)$r['id'], 'nickname' => $r['nickname'], 'type' => 'family', 'status' => $r['status']];
    }
    return $out;
}

/* фото видят только primary-опекун или родитель семьи ребёнка (НЕ provisional) */
function rt_parent_can_view_images($db, $pid, $childId) {
    $s = $db->prepare(
        "SELECT 1 FROM guardianships
         WHERE guardian_user_id = ? AND child_user_id = ? AND type = 'primary' AND status = 'active' LIMIT 1"
    );
    $s->execute([$pid, $childId]);
    if ($s->fetch()) return true;
    $s = $db->prepare(
        "SELECT 1 FROM family_members fm1 JOIN family_members fm2 ON fm1.family_id = fm2.family_id
         WHERE fm1.user_id = ? AND fm1.role IN ('owner','parent') AND fm1.status='active'
           AND fm2.user_id = ? AND fm2.role = 'child' AND fm2.status='active' LIMIT 1"
    );
    $s->execute([$pid, $childId]);
    return (bool)$s->fetch();
}

$children = rt_parent_children($db, $pid);
if (!$children) {
    rt_json(['ok' => true, 'children' => [], 'child' => null, 'canViewImages' => false,
             'points' => 0, 'days' => 30, 'items' => [], 'events' => [], 'lastActivityAt' => null]);
}

$childId = isset($_GET['child']) ? (int)$_GET['child'] : (int)$children[0]['id'];
if (!rt_can_read($db, $pid, $childId)) rt_json(['error' => 'forbidden'], 403);
$childRow = null;
foreach ($children as $c) { if ($c['id'] === $childId) { $childRow = $c; break; } }
if ($childRow === null) {
    // читаемый по rt_can_read, но вне списка (краевой случай) — добираем имя
    $s = $db->prepare("SELECT id, name AS nickname FROM users WHERE id = ? LIMIT 1");
    $s->execute([$childId]);
    $r = $s->fetch();
    if (!$r) rt_json(['error' => 'not found'], 404);
    $childRow = ['id' => (int)$r['id'], 'nickname' => $r['nickname'], 'type' => 'family', 'status' => 'active'];
}

$canImages = rt_parent_can_view_images($db, $pid, $childId);

$days = isset($_GET['days']) ? (int)$_GET['days'] : 30;
if ($days < 7) $days = 7;
if ($days > 90) $days = 90;

/* ---------- виш-лист ребёнка (как state.php, скоуп = ребёнок) ---------- */
$q = $db->prepare(
    "SELECT id, title, note, link, photo, icon, favorite, status,
            UNIX_TIMESTAMP(created_at) * 1000 AS createdAt,
            UNIX_TIMESTAMP(updated_at) * 1000 AS updatedAt,
            CASE WHEN bought_at IS NULL THEN NULL ELSE UNIX_TIMESTAMP(bought_at) * 1000 END AS boughtAt
     FROM wishlist_items
     WHERE user_id = ? AND deleted_at IS NULL
     ORDER BY id DESC"
);
$q->execute([$childId]);
$rows = $q->fetchAll();

$ev = $db->prepare(
    "SELECT item_id, type, UNIX_TIMESTAMP(created_at) * 1000 AS at
     FROM events
     WHERE user_id = ? AND module = 'wishlist' AND item_id IS NOT NULL
           AND type IN ('created','changed_mind','purchased','back_to_want','edited')
     ORDER BY created_at ASC, id ASC"
);
$ev->execute([$childId]);
$hist = [];
foreach ($ev->fetchAll() as $e) {
    $hist[(int)$e['item_id']][] = ['type' => $e['type'], 'at' => (int)$e['at']];
}

$items = [];
foreach ($rows as $r) {
    $iid = (int)$r['id'];
    $items[] = [
        'id'        => (string)$iid,
        'title'     => $r['title'],
        'note'      => $r['note'],
        'link'      => $r['link'],
        'photo'     => $canImages ? $r['photo'] : null,
        'icon'      => $r['icon'],
        'favorite'  => ((int)$r['favorite'] === 1),
        'status'    => $r['status'],
        'createdAt' => (int)$r['createdAt'],
        'updatedAt' => (int)$r['updatedAt'],
        'boughtAt'  => $r['boughtAt'] !== null ? (int)$r['boughtAt'] : null,
        'history'   => isset($hist[$iid]) ? $hist[$iid] : [],
    ];
}

/* ---------- журнал событий за окно (DESC, страницами) ----------
   Пагинация для бесконечной прокрутки: ?before=<id события> отдаёт следующую
   страницу СТАРШЕ этого id в том же окне дней. eventsHasMore=true — есть ещё. */
$pageSize = 300;
$before   = isset($_GET['before']) ? (int)$_GET['before'] : 0;
$evSql = "SELECT id, module, type, item_id, item_title, from_status, to_status, meta,
            UNIX_TIMESTAMP(created_at) * 1000 AS at
     FROM events
     WHERE user_id = ? AND created_at >= (NOW() - INTERVAL " . (int)$days . " DAY)"
     . ($before > 0 ? " AND id < " . (int)$before : "")
     . " ORDER BY created_at DESC, id DESC
     LIMIT " . ($pageSize + 1);
$evq = $db->prepare($evSql);
$evq->execute([$childId]);
$evRows = $evq->fetchAll();
$evHasMore = count($evRows) > $pageSize;
if ($evHasMore) array_pop($evRows);
$events = [];
foreach ($evRows as $r) {
    $meta = null;
    if ($r['meta'] !== null && $r['meta'] !== '') {
        $meta = json_decode($r['meta'], true);
        if (!is_array($meta)) $meta = null;
    }
    $events[] = [
        'id'     => (int)$r['id'],
        'module' => $r['module'],
        'type'   => $r['type'],
        'itemId' => $r['item_id'] !== null ? (int)$r['item_id'] : null,
        'title'  => $r['item_title'],
        'from'   => $r['from_status'],
        'to'     => $r['to_status'],
        'meta'   => $meta,
        'at'     => (int)$r['at'],
    ];
}

/* лёгкий режим пагинации: только следующая страница событий */
if ($before > 0) {
    rt_json(['ok' => true, 'events' => $events, 'eventsHasMore' => $evHasMore]);
}

/* ---------- контент модулей (то, что РЕАЛЬНО создал ребёнок) ----------
   Свежие записи generic-стора по модулям: оценки/настроения с текстами, раунды
   угадайки, слова, чистки. Технические коллекции meta и копилка не отдаются.
   Фото внутри data — по тому же правилу приватности, что и виш-лист. */
$cq = $db->prepare(
    "SELECT id, module, collection, status, favorite, data,
            UNIX_TIMESTAMP(created_at) * 1000 AS createdAt
     FROM module_data
     WHERE user_id = ? AND deleted_at IS NULL
       AND module <> 'bank' AND collection <> 'meta'
     ORDER BY id DESC
     LIMIT 400"
);
$cq->execute([$childId]);
$content = [];
$perModCap = 30;
foreach ($cq->fetchAll() as $r) {
    $m = $r['module'];
    if (!isset($content[$m])) $content[$m] = [];
    if (count($content[$m]) >= $perModCap) continue;
    $d = json_decode($r['data'], true);
    if (!is_array($d)) $d = [];
    if (!$canImages) { unset($d['photo'], $d['image'], $d['dataUrl']); }
    $content[$m][] = [
        'id'        => (string)$r['id'],
        'collection'=> $r['collection'],
        'status'    => $r['status'],
        'favorite'  => ((int)$r['favorite'] === 1),
        'data'      => $d,
        'createdAt' => (int)$r['createdAt'],
    ];
}

/* ---------- очки (копилка): сумма n по module_data bank/points ---------- */
$pq = $db->prepare(
    "SELECT data FROM module_data
     WHERE user_id = ? AND module = 'bank' AND collection = 'points' AND deleted_at IS NULL"
);
$pq->execute([$childId]);
$points = 0;
foreach ($pq->fetchAll() as $r) {
    $d = json_decode($r['data'], true);
    if (is_array($d) && isset($d['n'])) $points += (int)$d['n'];
}

/* ---------- винстрик (копилка): bank/meta {streak} ---------- */
$sq = $db->prepare(
    "SELECT data FROM module_data
     WHERE user_id = ? AND module = 'bank' AND collection = 'meta' AND deleted_at IS NULL
     ORDER BY id ASC LIMIT 1"
);
$sq->execute([$childId]);
$streak = 0;
$sr = $sq->fetch();
if ($sr) {
    $d = json_decode($sr['data'], true);
    if (is_array($d) && isset($d['streak'])) $streak = max(0, (int)$d['streak']);
}

/* ---------- последняя активность (за всё время) ---------- */
$lq = $db->prepare("SELECT UNIX_TIMESTAMP(MAX(created_at)) * 1000 AS t FROM events WHERE user_id = ?");
$lq->execute([$childId]);
$lr = $lq->fetch();
$lastAt = ($lr && $lr['t'] !== null) ? (int)$lr['t'] : null;

rt_json([
    'ok'            => true,
    'children'      => $children,
    'child'         => ['id' => (int)$childRow['id'], 'nickname' => $childRow['nickname']],
    'canViewImages' => $canImages,
    'points'        => $points,
    'streak'        => $streak,
    'days'          => $days,
    'items'         => $items,
    'events'        => $events,
    'eventsHasMore' => $evHasMore,
    'content'       => $content,
    'lastActivityAt'=> $lastAt,
]);
