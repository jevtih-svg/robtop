<?php
/** Server actions for Find the Object. */

require_once __DIR__ . '/../../api/_points.php';

function rt_find_action($db, $uid, $type, $itemId, $data) {
    if ($type !== 'review') return false;
    if (rt_user_role() !== 'parent') rt_json(['error' => 'parent_only'], 403);

    $child = isset($data['child']) ? (int)$data['child'] : 0;
    if ($child <= 0) {
        $child = rt_family_child_uid($db, $uid);
    }
    if ($child <= 0 || !rt_can_manage_child($db, $uid, $child)) {
        rt_json(['error' => 'forbidden child'], 403);
    }

    $ok = !empty($data['ok']);
    $rev = isset($data['rev']) ? (int)$data['rev'] : (int)round(microtime(true) * 1000);

    $s = $db->prepare(
        "SELECT id, data FROM module_data
         WHERE id=? AND user_id=? AND module='find' AND collection='subs' AND deleted_at IS NULL
         LIMIT 1"
    );
    $s->execute([(int)$itemId, $child]);
    $row = $s->fetch();
    if (!$row) rt_json(['error' => 'not_found'], 404);

    $sub = $row['data'] !== null ? json_decode($row['data'], true) : [];
    if (!is_array($sub)) $sub = [];
    if (($sub['st'] ?? '') !== 'pending') rt_json(['error' => 'not_pending'], 409);

    $sub['st'] = $ok ? 'correct' : 'wrong';
    $sub['rev'] = $rev;
    $json = json_encode($sub, JSON_UNESCAPED_UNICODE);
    if ($json === false || strlen($json) > 65535) rt_json(['error' => 'bad_data'], 422);

    $db->prepare("UPDATE module_data SET data=?, updated_at=NOW() WHERE id=? AND user_id=?")
       ->execute([$json, (int)$itemId, $child]);

    $note = '';
    if (isset($data['note']) && $data['note'] !== '') $note = mb_substr((string)$data['note'], 0, 80);
    rt_points_write(
        $db,
        $child,
        $ok ? 10 : -5,
        $ok ? 'find_correct' : 'find_wrong',
        'find',
        $ok ? 'win' : 'loss',
        $note
    );

    $bonus = false;
    $runId = isset($sub['runId']) ? (string)$sub['runId'] : '';
    $diff = isset($sub['diff']) ? (string)$sub['diff'] : '';
    if ($ok && $runId !== '' && $diff !== '') {
        $q = $db->prepare(
            "SELECT data FROM module_data
             WHERE user_id=? AND module='find' AND collection='subs' AND deleted_at IS NULL"
        );
        $q->execute([$child]);
        $correct = 0;
        $hasMarker = false;
        foreach ($q->fetchAll() as $r) {
            $d = $r['data'] !== null ? json_decode($r['data'], true) : null;
            if (!is_array($d) || (string)($d['runId'] ?? '') !== $runId || (string)($d['diff'] ?? '') !== $diff) continue;
            if (($d['st'] ?? '') === 'correct') $correct++;
            if (($d['st'] ?? '') === 'bonus') $hasMarker = true;
        }
        if ($correct >= 2 && !$hasMarker) {
            $marker = ['st' => 'bonus', 'runId' => $runId, 'diff' => $diff, 'ts' => $rev];
            $db->prepare(
                "INSERT INTO module_data (user_id, module, collection, status, favorite, sort, data, created_at, updated_at)
                 VALUES (?, 'find', 'subs', '', 0, 0, ?, NOW(), NOW())"
            )->execute([$child, json_encode($marker, JSON_UNESCAPED_UNICODE)]);
            rt_points_write($db, $child, 10, 'find_bonus', 'find', 'win', $diff);
            $bonus = true;
        }
    }

    rt_notify($child, 'find', $ok ? 'correct' : 'wrong', ['n' => $ok ? 10 : 5], ['module' => 'find'], $uid);
    if ($bonus) rt_notify($child, 'find', 'bonus', ['n' => 10], ['module' => 'find'], $uid);

    rt_json(['ok' => true, 'status' => $sub['st'], 'rev' => $rev, 'bonus' => $bonus]);
}
