<?php
/**
 * Оппортунистическая проверка расписания ухода за собакой (walk/care). Крона нет, поэтому
 * зовётся из sync.php на каждом поллере, но РАБОТАЕТ не чаще раза в день на семью
 * (гейт walk/meta.lastCareCheck). Для каждого пункта с nextDue <= сегодня и lastNotified != nextDue
 * шлём rt_notify(родителю, 'walk', 'care_due', {type, day}) — это автоматически делает и веб-пуш
 * (rt_push_user), даже когда приложение закрыто, — и ставим lastNotified = nextDue (дедуп по сроку).
 *
 * Подключается из sync.php. Использует rt_db/rt_family_pool_uid/rt_child_parents/rt_notify
 * (из _bootstrap) и rt_points_tz (из _points, по наличию).
 */

/** Прочитать единственную строку walk/meta пула; вернуть [id|null, dataArray]. */
function rt_walk_meta_row($db, $pool) {
    $s = $db->prepare(
        "SELECT id, data FROM module_data WHERE user_id=? AND module='walk' AND collection='meta' AND deleted_at IS NULL ORDER BY id DESC LIMIT 1"
    );
    $s->execute([(int)$pool]);
    $r = $s->fetch();
    if (!$r) return [null, []];
    $d = $r['data'] !== null ? json_decode($r['data'], true) : [];
    return [(int)$r['id'], is_array($d) ? $d : []];
}

function rt_care_check($db, $uid) {
    try {
        $pool = rt_family_pool_uid($db, $uid);
        $tz = function_exists('rt_points_tz') ? rt_points_tz() : new DateTimeZone('Europe/Riga');
        $today = (new DateTime('now', $tz))->format('Y-m-d');

        // гейт: раз в день на семью
        list($metaId, $meta) = rt_walk_meta_row($db, $pool);
        if (isset($meta['lastCareCheck']) && $meta['lastCareCheck'] === $today) return;
        $meta['lastCareCheck'] = $today;
        if ($metaId !== null) {
            $db->prepare("UPDATE module_data SET data=?, updated_at=NOW() WHERE id=?")
               ->execute([json_encode($meta, JSON_UNESCAPED_UNICODE), $metaId]);
        } else {
            $db->prepare("INSERT INTO module_data (user_id,module,collection,status,favorite,sort,data,created_at,updated_at)
                          VALUES (?, 'walk','meta','',0,0,?,NOW(),NOW())")
               ->execute([(int)$pool, json_encode($meta, JSON_UNESCAPED_UNICODE)]);
        }

        // пункты ухода, которые «пора»
        $parents = rt_child_parents($db, $pool);
        if (!$parents) return;
        $s = $db->prepare(
            "SELECT id, data FROM module_data WHERE user_id=? AND module='walk' AND collection='care' AND deleted_at IS NULL"
        );
        $s->execute([(int)$pool]);
        foreach ($s->fetchAll() as $row) {
            $d = $row['data'] !== null ? json_decode($row['data'], true) : null;
            if (!is_array($d) || empty($d['nextDue'])) continue;
            $due = (string)$d['nextDue'];
            if ($due > $today) continue;                          // ещё не пора
            if (isset($d['lastNotified']) && $d['lastNotified'] === $due) continue; // уже уведомляли об этом сроке
            foreach ($parents as $pid) {
                rt_notify($pid, 'walk', 'care_due', ['type' => (string)($d['type'] ?? ''), 'day' => $due]);
            }
            $d['lastNotified'] = $due;
            $db->prepare("UPDATE module_data SET data=?, updated_at=NOW() WHERE id=?")
               ->execute([json_encode($d, JSON_UNESCAPED_UNICODE), (int)$row['id']]);
        }
    } catch (Throwable $e) { /* проверка ухода не должна ломать sync */ }
}
