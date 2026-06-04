<?php
/** GET /api/state.php — текущий пользователь + список желаний с историей. */

require __DIR__ . '/_bootstrap.php';
rt_guard();

$uid = rt_user_id();
$db  = rt_db();

// Желания (не удалённые)
$q = $db->prepare(
    "SELECT id, title, note, link, photo, icon, favorite, status,
            UNIX_TIMESTAMP(created_at) * 1000 AS createdAt,
            UNIX_TIMESTAMP(updated_at) * 1000 AS updatedAt,
            CASE WHEN bought_at IS NULL THEN NULL ELSE UNIX_TIMESTAMP(bought_at) * 1000 END AS boughtAt
     FROM wishlist_items
     WHERE user_id = ? AND deleted_at IS NULL
     ORDER BY id DESC"
);
$q->execute([$uid]);
$rows = $q->fetchAll();

// История действий по каждому желанию (для таймлайна и счётчиков на клиенте)
$ev = $db->prepare(
    "SELECT item_id, type, UNIX_TIMESTAMP(created_at) * 1000 AS at
     FROM events
     WHERE user_id = ? AND module = 'wishlist' AND item_id IS NOT NULL
           AND type IN ('created','changed_mind','purchased','back_to_want','edited')
     ORDER BY created_at ASC, id ASC"
);
$ev->execute([$uid]);
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
        'photo'     => $r['photo'],
        'icon'      => $r['icon'],
        'favorite'  => ((int)$r['favorite'] === 1),
        'status'    => $r['status'],
        'createdAt' => (int)$r['createdAt'],
        'updatedAt' => (int)$r['updatedAt'],
        'boughtAt'  => $r['boughtAt'] !== null ? (int)$r['boughtAt'] : null,
        'history'   => isset($hist[$iid]) ? $hist[$iid] : [],
    ];
}

$u = $db->prepare("SELECT id, name, role FROM users WHERE id = ?");
$u->execute([$uid]);
$user = $u->fetch();

rt_json(['user' => $user, 'items' => $items]);
