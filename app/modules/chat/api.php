<?php
/**
 * RobTop — серверный обработчик модуля «Чат» (dedicated: chat_threads / chat_members / chat_messages).
 * Подключается диспетчером api/action.php (module=chat). Контракт: rt_chat_action($db,$uid,$type,$itemId,$data)
 * отвечает rt_json() и завершает процесс; false = неизвестный тип (диспетчер отдаст 400).
 *
 * Правила доступа (решения Джеффа 2026-06-07):
 *  - чат ТОЛЬКО внутри семьи (family_members, status=active); нет семьи — пустое состояние;
 *  - участник видит свои треды; РОДИТЕЛЬ семьи (role owner/parent) видит ВСЕ треды семьи,
 *    но в чужих — только чтение (ro:1, композер не рисуется, send отдаёт 403);
 *  - писать может только участник треда; удалять — только СВОИ сообщения (мягко, файл фото стирается);
 *  - каждое сообщение → rt_notify() каждому другому участнику (src=chat, link {module,item});
 *    открытие переписки гасит её оповещения у читателя (точное совпадение link) и unread.
 */

if (!function_exists('rt_chat_thread')) {
    function rt_chat_thread($db, $tid) {
        $s = $db->prepare("SELECT * FROM chat_threads WHERE id = ?");
        $s->execute([(int)$tid]);
        return $s->fetch();
    }
    /** Строка членства (last_read_id) или null. */
    function rt_chat_member($db, $tid, $uid) {
        $s = $db->prepare("SELECT * FROM chat_members WHERE thread_id = ? AND user_id = ?");
        $s->execute([(int)$tid, (int)$uid]);
        $r = $s->fetch();
        return $r ?: null;
    }
    /** Родитель ли семьи (owner/parent, active). */
    function rt_chat_is_parent($db, $fid, $uid) {
        if (!$fid) return false;
        $s = $db->prepare("SELECT 1 FROM family_members WHERE family_id = ? AND user_id = ? AND role IN ('owner','parent') AND status = 'active'");
        $s->execute([(int)$fid, (int)$uid]);
        return (bool)$s->fetch();
    }
    /** Доступ на чтение: участник ИЛИ родитель семьи треда. ['m'=>member|null,'ro'=>bool] либо null. */
    function rt_chat_access($db, $uid, $fid, $thread) {
        if (!$thread) return null;
        $m = rt_chat_member($db, $thread['id'], $uid);
        if ($m) return ['m' => $m, 'ro' => false];
        if ($fid && (int)$thread['family_id'] === (int)$fid && rt_chat_is_parent($db, $fid, $uid)) return ['m' => null, 'ro' => true];
        return null;
    }
    /** Карта имён пользователей по id. */
    function rt_chat_names($db, $ids) {
        $ids = array_values(array_unique(array_filter(array_map('intval', $ids))));
        if (!$ids) return [];
        $in = implode(',', $ids);
        $out = [];
        foreach ($db->query("SELECT id, name FROM users WHERE id IN ($in)")->fetchAll() as $r) $out[(int)$r['id']] = $r['name'];
        return $out;
    }
    /** Активные члены семьи: [{id,name,kind}] (kind по роли в семье). */
    function rt_chat_roster($db, $fid) {
        $s = $db->prepare(
            "SELECT u.id, u.name, fm.role FROM family_members fm JOIN users u ON u.id = fm.user_id
             WHERE fm.family_id = ? AND fm.status = 'active'
             ORDER BY (fm.role='owner') DESC, (fm.role='parent') DESC, u.id"
        );
        $s->execute([(int)$fid]);
        $out = [];
        foreach ($s->fetchAll() as $r) {
            $out[] = ['id' => (int)$r['id'], 'name' => $r['name'], 'kind' => ($r['role'] === 'child' ? 'child' : 'parent')];
        }
        return $out;
    }
    function rt_chat_msg_out($r, $names) {
        $del = $r['deleted_at'] !== null;
        return [
            'id'    => (int)$r['id'],
            'uid'   => (int)$r['user_id'],
            'name'  => isset($names[(int)$r['user_id']]) ? $names[(int)$r['user_id']] : '',
            'body'  => $del ? '' : (string)$r['body'],
            'photo' => $del ? null : ($r['photo'] !== null ? (string)$r['photo'] : null),
            'at'    => strtotime($r['created_at']) * 1000,
            'del'   => $del ? 1 : 0,
        ];
    }
}

function rt_chat_action($db, $uid, $type, $itemId, $data) {
    $uid = (int)$uid;
    $fid = null;
    try { $fid = rt_user_family_id($db, $uid); } catch (Throwable $e) { $fid = null; }

    switch ($type) {

        /* Стартовая загрузка: семья, ростер, мои треды (+ для родителя — все треды семьи, ro). */
        case 'threads': {
            if (!$fid) rt_json(['ok' => true, 'family' => false, 'me' => $uid, 'isParent' => false, 'roster' => [], 'threads' => []]);
            $isParent = rt_chat_is_parent($db, $fid, $uid);
            $roster = rt_chat_roster($db, $fid);

            $s = $db->prepare(
                "SELECT t.*, cm.last_read_id FROM chat_threads t
                 JOIN chat_members cm ON cm.thread_id = t.id AND cm.user_id = ?
                 WHERE t.family_id = ? ORDER BY t.updated_at DESC, t.id DESC"
            );
            $s->execute([$uid, $fid]);
            $mine = $s->fetchAll();
            $rows = [];
            $mineIds = [];
            foreach ($mine as $r) { $mineIds[] = (int)$r['id']; $rows[(int)$r['id']] = ['t' => $r, 'ro' => 0]; }
            if ($isParent) {
                $s = $db->prepare("SELECT t.* FROM chat_threads t WHERE t.family_id = ? ORDER BY t.updated_at DESC, t.id DESC");
                $s->execute([$fid]);
                foreach ($s->fetchAll() as $r) {
                    if (!isset($rows[(int)$r['id']])) { $r['last_read_id'] = null; $rows[(int)$r['id']] = ['t' => $r, 'ro' => 1]; }
                }
            }
            if (!$rows) rt_json(['ok' => true, 'family' => true, 'me' => $uid, 'isParent' => $isParent, 'roster' => $roster, 'threads' => []]);

            $tin = implode(',', array_map('intval', array_keys($rows)));
            $membersBy = []; $allUids = [];
            foreach ($db->query("SELECT thread_id, user_id FROM chat_members WHERE thread_id IN ($tin) ORDER BY user_id")->fetchAll() as $r) {
                $membersBy[(int)$r['thread_id']][] = (int)$r['user_id'];
                $allUids[] = (int)$r['user_id'];
            }
            $lastBy = [];
            foreach ($db->query(
                "SELECT m.* FROM chat_messages m
                 JOIN (SELECT thread_id, MAX(id) mid FROM chat_messages WHERE thread_id IN ($tin) AND deleted_at IS NULL GROUP BY thread_id) x
                   ON x.mid = m.id"
            )->fetchAll() as $r) { $lastBy[(int)$r['thread_id']] = $r; $allUids[] = (int)$r['user_id']; }
            $unreadBy = [];
            if ($mineIds) {
                $s = $db->prepare(
                    "SELECT m.thread_id, COUNT(*) n FROM chat_messages m
                     JOIN chat_members cm ON cm.thread_id = m.thread_id AND cm.user_id = ?
                     WHERE m.deleted_at IS NULL AND m.user_id <> ? AND m.id > cm.last_read_id
                     GROUP BY m.thread_id"
                );
                $s->execute([$uid, $uid]);
                foreach ($s->fetchAll() as $r) $unreadBy[(int)$r['thread_id']] = (int)$r['n'];
            }
            $names = rt_chat_names($db, $allUids);

            $out = [];
            foreach ($rows as $tid => $w) {
                $t = $w['t'];
                $mem = [];
                foreach ((isset($membersBy[$tid]) ? $membersBy[$tid] : []) as $mu) {
                    $mem[] = ['id' => $mu, 'name' => isset($names[$mu]) ? $names[$mu] : ''];
                }
                $last = null;
                if (isset($lastBy[$tid])) {
                    $lm = $lastBy[$tid];
                    $last = [
                        'uid'   => (int)$lm['user_id'],
                        'name'  => isset($names[(int)$lm['user_id']]) ? $names[(int)$lm['user_id']] : '',
                        'body'  => mb_substr((string)$lm['body'], 0, 80),
                        'photo' => $lm['photo'] !== null ? 1 : 0,
                        'at'    => strtotime($lm['created_at']) * 1000,
                    ];
                }
                $out[] = [
                    'id'      => $tid,
                    'kind'    => $t['kind'],
                    'title'   => (string)$t['title'],
                    'ro'      => $w['ro'] ? 1 : 0,
                    'members' => $mem,
                    'last'    => $last,
                    'unread'  => isset($unreadBy[$tid]) ? $unreadBy[$tid] : 0,
                    'at'      => strtotime($t['updated_at']) * 1000,
                ];
            }
            usort($out, function ($a, $b) { return ($b['at'] <=> $a['at']) ?: ($b['id'] <=> $a['id']); });
            rt_json(['ok' => true, 'family' => true, 'me' => $uid, 'isParent' => $isParent, 'roster' => $roster, 'threads' => $out]);
        }

        /* Сообщения треда (последние 50, before=id — страница старше). Без before — помечает прочитанным
           и гасит оповещения этого треда у читателя. */
        case 'messages': {
            $tid = (int)$itemId;
            $t = rt_chat_thread($db, $tid);
            $acc = rt_chat_access($db, $uid, $fid, $t);
            if (!$acc) rt_json(['error' => 'forbidden'], 403);
            $before = isset($data['before']) ? (int)$data['before'] : 0;

            if ($before > 0) {
                $s = $db->prepare("SELECT * FROM chat_messages WHERE thread_id = ? AND id < ? ORDER BY id DESC LIMIT 50");
                $s->execute([$tid, $before]);
            } else {
                $s = $db->prepare("SELECT * FROM chat_messages WHERE thread_id = ? ORDER BY id DESC LIMIT 50");
                $s->execute([$tid]);
            }
            $rows = array_reverse($s->fetchAll());
            $names = rt_chat_names($db, array_map(function ($r) { return (int)$r['user_id']; }, $rows));
            $items = [];
            foreach ($rows as $r) $items[] = rt_chat_msg_out($r, $names);

            if ($before === 0 && $acc['m']) {
                $mx = $db->prepare("SELECT COALESCE(MAX(id),0) FROM chat_messages WHERE thread_id = ?");
                $mx->execute([$tid]);
                $maxId = (int)$mx->fetchColumn();
                if ($maxId > 0) {
                    try { /* продвигаем маркер + штампуем время прочтения (для галочек у отправителя) */
                        $db->prepare("UPDATE chat_members SET last_read_id = ?, last_read_at = NOW() WHERE thread_id = ? AND user_id = ? AND last_read_id < ?")
                           ->execute([$maxId, $tid, $uid, $maxId]);
                    } catch (Throwable $e) { /* до миграции 027 нет колонки last_read_at */
                        $db->prepare("UPDATE chat_members SET last_read_id = GREATEST(last_read_id, ?) WHERE thread_id = ? AND user_id = ?")
                           ->execute([$maxId, $tid, $uid]);
                    }
                }
                try {
                    $lk = json_encode(['module' => 'chat', 'item' => (string)$tid], JSON_UNESCAPED_UNICODE);
                    $db->prepare("UPDATE notifications SET read_at = NOW() WHERE user_id = ? AND src = 'chat' AND read_at IS NULL AND link = ?")
                       ->execute([$uid, $lk]);
                } catch (Throwable $e) { /* таблицы оповещений может не быть */ }
            }
            /* читатели треда (кроме меня) с маркерами — клиент по ним рисует галочки на МОИХ
               сообщениях: read = чей-то last_read_id >= id; delivered = чей-то seen_at >= времени.
               Фолбэк без last_read_at/seen_at (до миграции 027) — read всё равно работает по lri. */
            $readers = [];
            try {
                $rs = $db->prepare("SELECT cm.user_id, cm.last_read_id, cm.last_read_at, cm.seen_at, u.name FROM chat_members cm JOIN users u ON u.id = cm.user_id WHERE cm.thread_id = ? AND cm.user_id <> ?");
                $rs->execute([$tid, $uid]);
                foreach ($rs->fetchAll() as $r) $readers[] = ['uid' => (int)$r['user_id'], 'name' => (string)$r['name'], 'lri' => (int)$r['last_read_id'], 'rat' => $r['last_read_at'] ? strtotime($r['last_read_at']) * 1000 : null, 'sat' => $r['seen_at'] ? strtotime($r['seen_at']) * 1000 : null];
            } catch (Throwable $e) {
                try {
                    $rs = $db->prepare("SELECT cm.user_id, cm.last_read_id, u.name FROM chat_members cm JOIN users u ON u.id = cm.user_id WHERE cm.thread_id = ? AND cm.user_id <> ?");
                    $rs->execute([$tid, $uid]);
                    foreach ($rs->fetchAll() as $r) $readers[] = ['uid' => (int)$r['user_id'], 'name' => (string)$r['name'], 'lri' => (int)$r['last_read_id'], 'rat' => null, 'sat' => null];
                } catch (Throwable $e2) { $readers = []; }
            }
            rt_json(['ok' => true, 'items' => $items, 'ro' => $acc['ro'] ? 1 : 0, 'more' => count($rows) === 50 ? 1 : 0, 'readers' => $readers]);
        }

        /* Отправка: текст и/или фото. Только участник. Оповещение каждому другому участнику. */
        case 'send': {
            $tid = (int)$itemId;
            $t = rt_chat_thread($db, $tid);
            if (!$t) rt_json(['error' => 'not found'], 404);
            $m = rt_chat_member($db, $tid, $uid);
            if (!$m) rt_json(['error' => 'forbidden'], 403);

            $body = trim((string)(isset($data['body']) ? $data['body'] : ''));
            if (mb_strlen($body) > 1000) $body = mb_substr($body, 0, 1000);
            $photo = isset($data['photo']) && is_string($data['photo']) && $data['photo'] !== '' ? $data['photo'] : null;
            if ($photo !== null && (strlen($photo) > 255 || strpos($photo, 'uploads/') !== 0)) rt_json(['error' => 'bad photo'], 422);
            if ($body === '' && $photo === null) rt_json(['error' => 'empty'], 422);

            $db->prepare("INSERT INTO chat_messages (thread_id, user_id, body, photo, created_at) VALUES (?, ?, ?, ?, NOW())")
               ->execute([$tid, $uid, $body, $photo]);
            $mid = (int)$db->lastInsertId();
            $db->prepare("UPDATE chat_threads SET updated_at = NOW() WHERE id = ?")->execute([$tid]);
            $db->prepare("UPDATE chat_members SET last_read_id = GREATEST(last_read_id, ?) WHERE thread_id = ? AND user_id = ?")
               ->execute([$mid, $tid, $uid]);
            rt_log('chat', 'message_sent', $mid, null, null, null, ['thread' => $tid, 'photo' => $photo ? 1 : 0]);

            /* оповещения участникам (каждое сообщение — оповещение; web push внутри rt_notify) */
            $names = rt_chat_names($db, [$uid]);
            $from = isset($names[$uid]) ? $names[$uid] : '';
            $params = $body !== ''
                ? ['name' => $from, 'text' => mb_substr($body, 0, 60) . (mb_strlen($body) > 60 ? '…' : '')]
                : ['name' => $from];
            if ($t['kind'] === 'group' && $t['title'] !== '') $params['note'] = (string)$t['title'];
            $ntype = $body !== '' ? 'message' : 'photo';
            $link = ['module' => 'chat', 'item' => (string)$tid];
            $s = $db->prepare("SELECT user_id FROM chat_members WHERE thread_id = ? AND user_id <> ?");
            $s->execute([$tid, $uid]);
            foreach ($s->fetchAll() as $r) rt_notify((int)$r['user_id'], 'chat', $ntype, $params, $link, $uid);

            $now = round(microtime(true) * 1000);
            rt_json(['ok' => true, 'item' => [
                'id' => $mid, 'uid' => $uid, 'name' => $from, 'body' => $body, 'photo' => $photo, 'at' => $now, 'del' => 0,
            ]]);
        }

        /* Новый чат: members=[ids своей семьи]. 1 адресат → direct (dkey, без дублей), 2+ → группа с названием. */
        case 'create': {
            if (!$fid) rt_json(['error' => 'no family'], 403);
            $ids = isset($data['members']) && is_array($data['members']) ? $data['members'] : [];
            $ids = array_values(array_unique(array_filter(array_map('intval', $ids), function ($x) use ($uid) { return $x > 0 && $x !== $uid; })));
            if (!$ids || count($ids) > 20) rt_json(['error' => 'bad members'], 422);
            $okIds = [];
            foreach (rt_chat_roster($db, $fid) as $r) $okIds[$r['id']] = 1;
            foreach ($ids as $x) if (!isset($okIds[$x])) rt_json(['error' => 'not in family'], 422);

            $title = trim((string)(isset($data['title']) ? $data['title'] : ''));
            if (mb_strlen($title) > 60) $title = mb_substr($title, 0, 60);

            if (count($ids) === 1) {
                $a = min($uid, $ids[0]); $b = max($uid, $ids[0]);
                $dkey = 'd:' . $fid . ':' . $a . ':' . $b;
                $s = $db->prepare("SELECT id FROM chat_threads WHERE dkey = ?");
                $s->execute([$dkey]);
                $ex = $s->fetch();
                if ($ex) rt_json(['ok' => true, 'thread' => (int)$ex['id'], 'existing' => 1]);
                try {
                    $db->prepare("INSERT INTO chat_threads (family_id, kind, title, dkey, created_by, created_at, updated_at) VALUES (?, 'direct', '', ?, ?, NOW(), NOW())")
                       ->execute([$fid, $dkey, $uid]);
                } catch (Throwable $e) { /* гонка двух устройств: dkey уникален — берём существующий */
                    $s->execute([$dkey]);
                    $ex = $s->fetch();
                    if ($ex) rt_json(['ok' => true, 'thread' => (int)$ex['id'], 'existing' => 1]);
                    rt_json(['error' => 'create failed'], 500);
                }
                $tid = (int)$db->lastInsertId();
            } else {
                if ($title === '') rt_json(['error' => 'title required'], 422);
                $db->prepare("INSERT INTO chat_threads (family_id, kind, title, dkey, created_by, created_at, updated_at) VALUES (?, 'group', ?, NULL, ?, NOW(), NOW())")
                   ->execute([$fid, $title, $uid]);
                $tid = (int)$db->lastInsertId();
            }
            $ins = $db->prepare("INSERT IGNORE INTO chat_members (thread_id, user_id, last_read_id, joined_at) VALUES (?, ?, 0, NOW())");
            $ins->execute([$tid, $uid]);
            foreach ($ids as $x) $ins->execute([$tid, $x]);
            rt_log('chat', 'thread_created', $tid, $title !== '' ? $title : null, null, null, ['kind' => count($ids) === 1 ? 'direct' : 'group', 'members' => count($ids) + 1]);
            rt_json(['ok' => true, 'thread' => $tid, 'existing' => 0]);
        }

        /* Удаление СВОЕГО сообщения (мягкое); файл фото стирается с диска. */
        case 'msg_delete': {
            $mid = (int)$itemId;
            $s = $db->prepare("SELECT * FROM chat_messages WHERE id = ?");
            $s->execute([$mid]);
            $r = $s->fetch();
            if (!$r || $r['deleted_at'] !== null) rt_json(['error' => 'not found'], 404);
            if ((int)$r['user_id'] !== $uid) rt_json(['error' => 'forbidden'], 403);
            if ($r['photo']) { try { rt_storage()->delete($r['photo']); } catch (Throwable $e) {} }
            $db->prepare("UPDATE chat_messages SET deleted_at = NOW(), photo = NULL WHERE id = ?")->execute([$mid]);
            $db->prepare("UPDATE chat_threads SET updated_at = NOW() WHERE id = ?")->execute([(int)$r['thread_id']]);
            rt_log('chat', 'message_deleted', $mid, null, null, null, ['thread' => (int)$r['thread_id']]);
            rt_json(['ok' => true]);
        }

        default:
            return false;
    }
}
