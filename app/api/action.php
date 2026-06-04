<?php
/**
 * POST /api/action.php — единая точка изменения данных + запись событий.
 * Тело: { "type": "...", "itemId": "123"?, "data": {...}? }
 *
 * Типы:
 *   create, edited, changed_mind, back_to_want, purchased,
 *   favorite, delete, restore, undo,
 *   opened_module, viewed_detail, viewed_stats  (только лог события)
 */

require __DIR__ . '/_bootstrap.php';
rt_guard();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') rt_json(['error' => 'method'], 405);

$uid  = rt_user_id();
$db   = rt_db();
$body = rt_body();
$type = isset($body['type']) ? (string)$body['type'] : '';
$itemId = isset($body['itemId']) && $body['itemId'] !== null ? (int)$body['itemId'] : null;
$data = isset($body['data']) && is_array($body['data']) ? $body['data'] : [];

function rt_item($db, $uid, $id) {
    $s = $db->prepare("SELECT * FROM wishlist_items WHERE id = ? AND user_id = ?");
    $s->execute([$id, $uid]);
    return $s->fetch();
}
function rt_status_ok($s) { return in_array($s, ['want', 'thinking', 'bought'], true); }

switch ($type) {

    case 'create': {
        $title = trim((string)(isset($data['title']) ? $data['title'] : ''));
        if ($title === '') rt_json(['error' => 'title required'], 422);
        $note  = trim((string)(isset($data['note']) ? $data['note'] : ''));
        $link  = trim((string)(isset($data['link']) ? $data['link'] : ''));
        $photo = isset($data['photo']) && $data['photo'] !== '' ? (string)$data['photo'] : null;
        $icon  = isset($data['icon']) && $data['icon'] !== '' ? (string)$data['icon'] : null;

        $st = $db->prepare(
            "INSERT INTO wishlist_items (user_id, title, note, link, photo, icon, favorite, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, 0, 'want', NOW(), NOW())"
        );
        $st->execute([$uid, $title, $note, $link, $photo, $icon]);
        $id = (int)$db->lastInsertId();
        rt_log('wishlist', 'created', $id, $title, null, 'want');

        $now = round(microtime(true) * 1000);
        rt_json(['ok' => true, 'item' => [
            'id' => (string)$id, 'title' => $title, 'note' => $note, 'link' => $link,
            'photo' => $photo, 'icon' => $icon, 'favorite' => false, 'status' => 'want',
            'createdAt' => $now, 'updatedAt' => $now, 'boughtAt' => null,
            'history' => [['type' => 'created', 'at' => $now]],
        ]]);
    }

    case 'edited': {
        $it = rt_item($db, $uid, $itemId); if (!$it) rt_json(['error' => 'not found'], 404);
        $title = trim((string)(isset($data['title']) ? $data['title'] : $it['title']));
        if ($title === '') rt_json(['error' => 'title required'], 422);
        $note  = trim((string)(isset($data['note']) ? $data['note'] : $it['note']));
        $link  = trim((string)(isset($data['link']) ? $data['link'] : $it['link']));
        $photo = array_key_exists('photo', $data) ? ($data['photo'] !== '' ? $data['photo'] : null) : $it['photo'];
        $icon  = array_key_exists('icon', $data) ? ($data['icon'] !== '' ? $data['icon'] : null) : $it['icon'];

        $st = $db->prepare("UPDATE wishlist_items SET title=?, note=?, link=?, photo=?, icon=?, updated_at=NOW() WHERE id=? AND user_id=?");
        $st->execute([$title, $note, $link, $photo, $icon, $itemId, $uid]);
        rt_log('wishlist', 'edited', $itemId, $title);
        rt_json(['ok' => true]);
    }

    case 'changed_mind':
    case 'back_to_want':
    case 'purchased': {
        $it = rt_item($db, $uid, $itemId); if (!$it) rt_json(['error' => 'not found'], 404);
        $from = $it['status'];
        if ($type === 'changed_mind') {
            $to = 'thinking';
            $db->prepare("UPDATE wishlist_items SET status='thinking', updated_at=NOW() WHERE id=? AND user_id=?")->execute([$itemId, $uid]);
        } elseif ($type === 'back_to_want') {
            $to = 'want';
            $db->prepare("UPDATE wishlist_items SET status='want', bought_at=NULL, updated_at=NOW() WHERE id=? AND user_id=?")->execute([$itemId, $uid]);
        } else { // purchased
            $to = 'bought';
            $db->prepare("UPDATE wishlist_items SET status='bought', bought_at=NOW(), updated_at=NOW() WHERE id=? AND user_id=?")->execute([$itemId, $uid]);
        }
        rt_log('wishlist', $type, $itemId, $it['title'], $from, $to);
        rt_json(['ok' => true]);
    }

    case 'favorite': {
        $it = rt_item($db, $uid, $itemId); if (!$it) rt_json(['error' => 'not found'], 404);
        $on = !empty($data['on']) ? 1 : 0;
        $db->prepare("UPDATE wishlist_items SET favorite=?, updated_at=NOW() WHERE id=? AND user_id=?")->execute([$on, $itemId, $uid]);
        rt_log('wishlist', $on ? 'favorite' : 'unfavorite', $itemId, $it['title']);
        rt_json(['ok' => true]);
    }

    case 'delete': {
        $it = rt_item($db, $uid, $itemId); if (!$it) rt_json(['error' => 'not found'], 404);
        $db->prepare("UPDATE wishlist_items SET deleted_at=NOW(), updated_at=NOW() WHERE id=? AND user_id=?")->execute([$itemId, $uid]);
        rt_log('wishlist', 'deleted', $itemId, $it['title']);
        rt_json(['ok' => true]);
    }

    case 'restore': {
        $it = rt_item($db, $uid, $itemId); if (!$it) rt_json(['error' => 'not found'], 404);
        $db->prepare("UPDATE wishlist_items SET deleted_at=NULL, updated_at=NOW() WHERE id=? AND user_id=?")->execute([$itemId, $uid]);
        rt_log('wishlist', 'restored', $itemId, $it['title']);
        rt_json(['ok' => true]);
    }

    // Полноценная отмена: вернуть поля и УДАЛИТЬ соответствующее событие,
    // чтобы счётчики статистики оставались точными.
    case 'undo': {
        $it = rt_item($db, $uid, $itemId); if (!$it) rt_json(['error' => 'not found'], 404);
        $undoType = isset($data['undoType']) ? (string)$data['undoType'] : '';
        $status   = isset($data['status']) && rt_status_ok($data['status']) ? $data['status'] : $it['status'];
        $fav      = !empty($data['favorite']) ? 1 : 0;
        $deleted  = !empty($data['deleted']);
        $boughtAt = (isset($data['boughtAt']) && $data['boughtAt']) ? date('Y-m-d H:i:s', (int)($data['boughtAt'] / 1000)) : null;

        $st = $db->prepare(
            "UPDATE wishlist_items
             SET status=?, favorite=?, bought_at=?, deleted_at=" . ($deleted ? "NOW()" : "NULL") . ", updated_at=NOW()
             WHERE id=? AND user_id=?"
        );
        $st->execute([$status, $fav, $boughtAt, $itemId, $uid]);

        if ($undoType !== '') {
            $del = $db->prepare("DELETE FROM events WHERE user_id=? AND item_id=? AND type=? ORDER BY id DESC LIMIT 1");
            $del->execute([$uid, $itemId, $undoType]);
        }
        rt_log('wishlist', 'undo', $itemId, $it['title'], null, null, ['undoType' => $undoType]);
        rt_json(['ok' => true]);
    }

    // Только событие (аналитика вовлечённости)
    case 'opened_module':
    case 'viewed_detail':
    case 'viewed_stats':
    case 'opened_app': {
        $title = null;
        if ($itemId) { $it = rt_item($db, $uid, $itemId); if ($it) $title = $it['title']; }
        $module = isset($data['module']) ? (string)$data['module'] : 'wishlist';
        rt_log($module, $type, $itemId, $title, null, null, $data ?: null);
        rt_json(['ok' => true]);
    }

    default:
        rt_json(['error' => 'unknown type'], 400);
}
