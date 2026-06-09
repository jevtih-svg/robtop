<?php
/**
 * POST /api/admin.php — мастер-админка RobTop. Тело: { "op": "...", ... }.
 *
 * Гейт: rt_require_admin (родительская сессия + активная запись в admins, миграция 008).
 * Первому админу запись выдаётся одноразовым SQL (см. ПЛАН-мастер-админка.md), дальше — из панели.
 *
 * ПОЛИТИКА КАРТИНОК (§4.7/§8 плана аккаунтов): админ ВИДИТ ФАКТ картинки (имя файла, размер, дату),
 * может её УДАЛИТЬ, но содержимое НИКОГДА не отдаётся — ни байты, ни путь. Попытки логируются.
 *
 * Каждая операция пишется в events (module='admin') с id исполнителя.
 */

require __DIR__ . '/_bootstrap.php';
require __DIR__ . '/_storage.php';
rt_guard();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') rt_json(['error' => 'method'], 405);

$db = rt_db();
$b  = rt_body();
$op = isset($b['op']) ? (string)$b['op'] : '';

/* ---- единственная операция ДО гейта: «я админ?» (для экрана входа панели) ---- */
if ($op === 'me') {
    $uid = rt_session_user_id();
    if (!$uid) rt_json(['ok' => true, 'authenticated' => false]);
    $u = rt_account($db, $uid);
    if (!$u) rt_json(['ok' => true, 'authenticated' => false]);
    rt_json(['ok' => true, 'authenticated' => true,
             'user' => rt_public_user($u, true),
             'isAdmin' => ($u['kind'] === 'parent' && rt_is_admin($db, (int)$u['id']))]);
}

$adm = rt_require_admin($db);
$AID = (int)$adm['id'];
function alog($type, $itemId = null, $title = null, $meta = null) {
    global $AID;
    $meta = is_array($meta) ? $meta : [];
    $meta['admin'] = $AID;
    rt_log('admin', $type, $itemId, $title, null, null, $meta);
}

switch ($op) {

    /* ================= ДАШБОРД ================= */
    case 'overview': {
        $n = function ($sql) use ($db) { return (int)$db->query($sql)->fetch()['n']; };
        $out = [
            'families'       => $n("SELECT COUNT(*) n FROM families WHERE deleted_at IS NULL"),
            'parents'        => $n("SELECT COUNT(*) n FROM accounts WHERE kind='parent'"),
            'children'       => $n("SELECT COUNT(*) n FROM accounts WHERE kind='child'"),
            'blocked'        => $n("SELECT COUNT(*) n FROM accounts WHERE status='disabled'"),
            'admins'         => $n("SELECT COUNT(*) n FROM admins WHERE status='active'"),
            'bans'           => $n("SELECT COUNT(*) n FROM bans WHERE lifted_at IS NULL"),
            'invitesPending' => $n("SELECT COUNT(*) n FROM invitations WHERE status='pending' AND expires_at > NOW()"),
            'sessions'       => $n("SELECT COUNT(*) n FROM sessions WHERE expires_at > NOW()"),
            'wishes'         => $n("SELECT COUNT(*) n FROM wishlist_items WHERE deleted_at IS NULL"),
            'records'        => $n("SELECT COUNT(*) n FROM module_data WHERE deleted_at IS NULL"),
            'images'         => $n("SELECT COUNT(*) n FROM uploaded_files WHERE deleted_at IS NULL"),
            'events7d'       => $n("SELECT COUNT(*) n FROM events WHERE created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)"),
            'ticketsOpen'    => $n("SELECT COUNT(*) n FROM tickets WHERE status='open'"),
            'ticketsNew'     => $n("SELECT COUNT(*) n FROM tickets WHERE status='open' AND admin_unread=1"),
        ];
        $pt = $db->query("SELECT COALESCE(SUM(CAST(JSON_EXTRACT(data,'$.n') AS SIGNED)),0) n
                          FROM module_data WHERE module='bank' AND collection='points' AND deleted_at IS NULL")->fetch();
        $out['pointsTotal'] = (int)$pt['n'];
        $perMod = [];
        foreach ($db->query("SELECT module, COUNT(*) n FROM module_data WHERE deleted_at IS NULL GROUP BY module ORDER BY n DESC") as $r) {
            $perMod[] = ['module' => $r['module'], 'n' => (int)$r['n']];
        }
        $out['recordsByModule'] = $perMod;
        $days = [];
        foreach ($db->query("SELECT DATE(created_at) d, COUNT(*) n FROM events
                             WHERE created_at > DATE_SUB(NOW(), INTERVAL 14 DAY) GROUP BY DATE(created_at) ORDER BY d") as $r) {
            $days[] = ['day' => $r['d'], 'n' => (int)$r['n']];
        }
        $out['activity14d'] = $days;
        rt_json(['ok' => true, 'stats' => $out]);
    }

    /* ================= ПОЛЬЗОВАТЕЛИ ================= */
    case 'users': {
        // Масштаб: без коррелированных подзапросов (агрегаты одним проходом по таблице),
        // серверная пагинация по 50. Картинки = фото живых желаний + фото в данных модулей
        // (mood/rating хранят photo в JSON) — то, что реально видно у пользователя.
        // ОДИН пользователь = ОДНА строка: родитель может состоять в нескольких семьях
        // (вторая семья, «Гость» друга-ребёнка) — без GROUP BY u.id join по family_members
        // давал дубль на каждое членство (баг Джеффа: «two identical users»); семьи
        // склеиваются через GROUP_CONCAT, счётчик — по DISTINCT пользователям.
        // Агрегаты MAX(...) на 1:1-колонках — для совместимости с ONLY_FULL_GROUP_BY.
        $q = isset($b['q']) ? trim((string)$b['q']) : '';
        $page = max(0, (int)($b['page'] ?? 0));
        $per = 50;
        $where = ''; $args = [];
        if ($q !== '') { $where = " WHERE (u.name LIKE ? OR a.email LIKE ? OR f.label LIKE ?)"; $args = ["%$q%", "%$q%", "%$q%"]; }
        $base = "FROM users u
                JOIN accounts a ON a.user_id = u.id
                LEFT JOIN family_members fm ON fm.user_id = u.id AND fm.status='active'
                LEFT JOIN families f ON f.id = fm.family_id";
        $cnt = $db->prepare("SELECT COUNT(DISTINCT u.id) n $base $where"); $cnt->execute($args);
        $total = (int)$cnt->fetch()['n'];
        $sql = "SELECT u.id, MAX(u.name) AS nickname, MAX(a.kind) AS kind, MAX(a.email) AS email,
                       MAX(a.status) AS status, MAX(a.must_change_password) AS must_change_password,
                       MAX(a.last_login_at) AS last_login_at, MAX(a.created_at) AS created_at,
                       MIN(fm.family_id) AS family_id,
                       GROUP_CONCAT(DISTINCT f.label ORDER BY f.label SEPARATOR ' · ') AS family_label,
                       MAX(COALESCE(md.n,0)) AS mdrecs, MAX(COALESCE(w.n,0)) AS wishes,
                       MAX(COALESCE(w.imgs,0)) + MAX(COALESCE(md.imgs,0)) AS images,
                       MAX(ad.user_id IS NOT NULL) AS is_admin
                $base
                LEFT JOIN (SELECT user_id, COUNT(*) n, SUM(JSON_EXTRACT(data,'$.photo') IS NOT NULL) imgs
                           FROM module_data WHERE deleted_at IS NULL GROUP BY user_id) md ON md.user_id = u.id
                LEFT JOIN (SELECT user_id, COUNT(*) n, SUM(photo IS NOT NULL) imgs
                           FROM wishlist_items WHERE deleted_at IS NULL GROUP BY user_id) w ON w.user_id = u.id
                LEFT JOIN admins ad ON ad.user_id = u.id AND ad.status='active'
                $where GROUP BY u.id
                ORDER BY MIN(fm.family_id), MAX(a.kind='parent') DESC, u.id
                LIMIT $per OFFSET " . ($page * $per);
        $s = $db->prepare($sql); $s->execute($args);
        $rows = [];
        foreach ($s->fetchAll() as $r) {
            $rows[] = [
                'id' => (int)$r['id'], 'nickname' => $r['nickname'], 'kind' => $r['kind'],
                'email' => $r['email'], 'status' => $r['status'],
                'mustChange' => (int)$r['must_change_password'] === 1,
                'lastLogin' => $r['last_login_at'], 'created' => $r['created_at'],
                'familyId' => $r['family_id'] ? (int)$r['family_id'] : null,
                'familyLabel' => $r['family_label'],
                'records' => (int)$r['mdrecs'] + (int)$r['wishes'], 'images' => (int)$r['images'],
                'isAdmin' => (int)$r['is_admin'] > 0,
            ];
        }
        rt_json(['ok' => true, 'users' => $rows, 'total' => $total, 'page' => $page, 'per' => $per]);
    }

    case 'eligible_parents': { // родители, которых МОЖНО привязать к семье (ещё не её активные члены)
        $fid = (int)($b['family_id'] ?? 0);
        $q = trim((string)($b['q'] ?? ''));
        if (!$fid) rt_json(['error' => 'bad input'], 422);
        $sql = "SELECT u.id, u.name AS nickname, a.email, f2.label AS own_family
                FROM accounts a JOIN users u ON u.id = a.user_id
                LEFT JOIN family_members fm2 ON fm2.user_id = u.id AND fm2.status='active'
                LEFT JOIN families f2 ON f2.id = fm2.family_id
                WHERE a.kind='parent' AND a.status='active'
                  AND NOT EXISTS (SELECT 1 FROM family_members fm WHERE fm.family_id = ? AND fm.user_id = u.id AND fm.status='active')";
        $args = [$fid];
        if ($q !== '') { $sql .= " AND (u.name LIKE ? OR a.email LIKE ?)"; $args[] = "%$q%"; $args[] = "%$q%"; }
        $sql .= " ORDER BY u.name LIMIT 20";
        $s = $db->prepare($sql); $s->execute($args);
        $rows = [];
        foreach ($s->fetchAll() as $r) {
            $rows[] = ['id' => (int)$r['id'], 'nickname' => $r['nickname'], 'email' => $r['email'], 'family' => $r['own_family']];
        }
        rt_json(['ok' => true, 'parents' => $rows]);
    }

    case 'user_update': { // переименовать (никнейм)
        $uid = (int)($b['user_id'] ?? 0);
        $nick = isset($b['nickname']) ? (string)$b['nickname'] : '';
        if (!$uid || !rt_valid_nickname($nick)) rt_json(['error' => 'bad input'], 422);
        if (rt_nickname_taken($db, $nick)) rt_json(['error' => 'nickname taken'], 409);
        $db->prepare("UPDATE users SET name = ? WHERE id = ?")->execute([trim($nick), $uid]);
        alog('user_renamed', $uid, $nick);
        rt_json(['ok' => true]);
    }

    case 'user_reset_pass': { // и детям, и родителям: одноразовый временный пароль + обязательная смена
        $uid = (int)($b['user_id'] ?? 0);
        if (!$uid) rt_json(['error' => 'bad input'], 422);
        $temp = rt_temp_password(); // SEC 2026-06-09: случайный временный пароль вместо «1234»
        rt_set_password($db, $uid, $temp, 1);
        alog('password_reset_by_admin', $uid);
        rt_json(['ok' => true, 'temp_password' => $temp]);
    }

    case 'user_block': case 'user_unblock': {
        $uid = (int)($b['user_id'] ?? 0);
        if (!$uid) rt_json(['error' => 'bad input'], 422);
        if ($uid === $AID) rt_json(['error' => 'cannot block self'], 422);
        $st = ($op === 'user_block') ? 'disabled' : 'active';
        $db->prepare("UPDATE accounts SET status = ? WHERE user_id = ?")->execute([$st, $uid]);
        if ($st === 'disabled') $db->prepare("DELETE FROM sessions WHERE user_id = ?")->execute([$uid]);
        alog($st === 'disabled' ? 'account_blocked' : 'account_unblocked', $uid);
        rt_json(['ok' => true, 'status' => $st]);
    }

    case 'user_delete': {
        // Мягкое удаление: блокировка + выход из семьи + разрыв опекунств. Данные и логи остаются.
        // Родителя с детьми в семье удалить нельзя — сначала перенести детей или забанить семью.
        $uid = (int)($b['user_id'] ?? 0);
        if (!$uid) rt_json(['error' => 'bad input'], 422);
        if ($uid === $AID) rt_json(['error' => 'cannot delete self'], 422);
        $acc = rt_account($db, $uid);
        if (!$acc) rt_json(['error' => 'not found'], 404);
        if ($acc['kind'] === 'parent') {
            $s = $db->prepare("SELECT COUNT(*) n FROM family_members fm1
                JOIN family_members fm2 ON fm2.family_id = fm1.family_id AND fm2.role='child' AND fm2.status='active'
                WHERE fm1.user_id = ? AND fm1.role IN ('owner','parent') AND fm1.status='active'");
            $s->execute([$uid]);
            if ((int)$s->fetch()['n'] > 0) rt_json(['error' => 'у родителя есть дети в семье — сначала перенесите детей, отвяжите его или удалите семью целиком'], 422);
        }
        $db->prepare("UPDATE accounts SET status = 'disabled' WHERE user_id = ?")->execute([$uid]);
        $db->prepare("DELETE FROM sessions WHERE user_id = ?")->execute([$uid]);
        $db->prepare("UPDATE family_members SET status = 'disabled' WHERE user_id = ?")->execute([$uid]);
        $db->prepare("UPDATE guardianships SET status='severed', severed_at=NOW(), sever_reason='admin_delete'
                      WHERE (child_user_id = ? OR guardian_user_id = ?) AND status='active'")->execute([$uid, $uid]);
        $db->prepare("UPDATE admins SET status='revoked', revoked_at=NOW() WHERE user_id = ?")->execute([$uid]);
        alog('account_deleted', $uid, $acc['nickname']);
        rt_json(['ok' => true]);
    }

    /* ================= ПРАВА АДМИНА ================= */
    case 'admins': {
        $rows = [];
        foreach ($db->query("SELECT ad.user_id, ad.status, ad.granted_at, ad.granted_by, u.name AS nickname, a.email
                             FROM admins ad JOIN users u ON u.id = ad.user_id JOIN accounts a ON a.user_id = ad.user_id
                             ORDER BY ad.granted_at") as $r) {
            $rows[] = ['id' => (int)$r['user_id'], 'nickname' => $r['nickname'], 'email' => $r['email'],
                       'status' => $r['status'], 'granted' => $r['granted_at'], 'by' => $r['granted_by'] ? (int)$r['granted_by'] : null];
        }
        rt_json(['ok' => true, 'admins' => $rows]);
    }

    case 'admin_grant': case 'admin_revoke': {
        $uid = (int)($b['user_id'] ?? 0);
        if (!$uid) rt_json(['error' => 'bad input'], 422);
        $acc = rt_account($db, $uid);
        if (!$acc) rt_json(['error' => 'not found'], 404);
        if ($op === 'admin_grant') {
            if ($acc['kind'] !== 'parent') rt_json(['error' => 'parent only'], 422); // флаг только родителям
            $db->prepare("INSERT INTO admins (user_id, status, granted_by) VALUES (?, 'active', ?)
                          ON DUPLICATE KEY UPDATE status='active', granted_by=VALUES(granted_by), granted_at=NOW(), revoked_at=NULL")
               ->execute([$uid, $AID]);
            alog('admin_granted', $uid, $acc['nickname']);
        } else {
            if ($uid === $AID) { // последний активный админ не может снять флаг с себя
                $n = (int)$db->query("SELECT COUNT(*) n FROM admins WHERE status='active'")->fetch()['n'];
                if ($n <= 1) rt_json(['error' => 'last admin'], 422);
            }
            $db->prepare("UPDATE admins SET status='revoked', revoked_at=NOW() WHERE user_id = ?")->execute([$uid]);
            alog('admin_revoked', $uid, $acc['nickname']);
        }
        rt_json(['ok' => true]);
    }

    /* ================= СЕМЬИ ================= */
    case 'families': {
        // Без N+1: семьи одним запросом, члены вторым, склейка в PHP.
        $fams = []; $idx = [];
        foreach ($db->query("SELECT f.id, f.label, f.owner_id, f.created_at,
                                    (bn.id IS NOT NULL) AS banned
                             FROM families f
                             LEFT JOIN bans bn ON bn.kind='family' AND bn.family_id=f.id AND bn.lifted_at IS NULL
                             WHERE f.deleted_at IS NULL ORDER BY f.id") as $f) {
            $idx[(int)$f['id']] = count($fams);
            $fams[] = ['id' => (int)$f['id'], 'label' => $f['label'], 'owner' => (int)$f['owner_id'],
                       'created' => $f['created_at'], 'banned' => (int)$f['banned'] > 0, 'members' => []];
        }
        foreach ($db->query("SELECT fm.family_id, u.id, u.name AS nickname, fm.role, a.kind, a.status, a.email
                             FROM family_members fm JOIN users u ON u.id = fm.user_id JOIN accounts a ON a.user_id = u.id
                             WHERE fm.status='active'
                             ORDER BY fm.family_id, (fm.role='owner') DESC, (fm.role='parent') DESC, u.id") as $r) {
            $fid = (int)$r['family_id'];
            if (!isset($idx[$fid])) continue;
            $fams[$idx[$fid]]['members'][] = ['id' => (int)$r['id'], 'nickname' => $r['nickname'], 'role' => $r['role'],
                                              'kind' => $r['kind'], 'status' => $r['status'], 'email' => $r['email']];
        }
        rt_json(['ok' => true, 'families' => $fams]);
    }

    case 'family_stats': { // экран статистики семьи: агрегаты по каждому члену + последние события
        $fid = (int)($b['family_id'] ?? 0);
        if (!$fid) rt_json(['error' => 'bad input'], 422);
        $f = $db->prepare("SELECT id, label, owner_id, created_at FROM families WHERE id = ? AND deleted_at IS NULL");
        $f->execute([$fid]); $fam = $f->fetch();
        if (!$fam) rt_json(['error' => 'not found'], 404);
        $m = $db->prepare("SELECT u.id, u.name AS nickname, fm.role, a.kind, a.status, a.last_login_at, a.created_at
                           FROM family_members fm JOIN users u ON u.id = fm.user_id JOIN accounts a ON a.user_id = u.id
                           WHERE fm.family_id = ? AND fm.status='active'
                           ORDER BY (fm.role='owner') DESC, (fm.role='parent') DESC, u.id");
        $m->execute([$fid]);
        $members = []; $ids = [];
        foreach ($m->fetchAll() as $r) {
            $ids[] = (int)$r['id'];
            $members[(int)$r['id']] = ['id' => (int)$r['id'], 'nickname' => $r['nickname'], 'role' => $r['role'],
                'kind' => $r['kind'], 'status' => $r['status'], 'lastLogin' => $r['last_login_at'], 'created' => $r['created_at'],
                'records' => 0, 'images' => 0, 'points' => 0, 'events7d' => 0];
        }
        if ($ids) {
            $in = implode(',', $ids);
            foreach ($db->query("SELECT user_id, COUNT(*) n, SUM(JSON_EXTRACT(data,'$.photo') IS NOT NULL) imgs,
                                        COALESCE(SUM(CASE WHEN module='bank' AND collection='points' THEN CAST(JSON_EXTRACT(data,'$.n') AS SIGNED) END),0) pts
                                 FROM module_data WHERE deleted_at IS NULL AND user_id IN ($in) GROUP BY user_id") as $r) {
                $u = (int)$r['user_id'];
                $members[$u]['records'] += (int)$r['n'];
                $members[$u]['images'] += (int)$r['imgs'];
                $members[$u]['points'] = (int)$r['pts'];
            }
            foreach ($db->query("SELECT user_id, COUNT(*) n, SUM(photo IS NOT NULL) imgs
                                 FROM wishlist_items WHERE deleted_at IS NULL AND user_id IN ($in) GROUP BY user_id") as $r) {
                $u = (int)$r['user_id'];
                $members[$u]['records'] += (int)$r['n'];
                $members[$u]['images'] += (int)$r['imgs'];
            }
            foreach ($db->query("SELECT user_id, COUNT(*) n FROM events
                                 WHERE user_id IN ($in) AND created_at > DATE_SUB(NOW(), INTERVAL 7 DAY) GROUP BY user_id") as $r) {
                $members[(int)$r['user_id']]['events7d'] = (int)$r['n'];
            }
        }
        $recent = [];
        if ($ids) {
            foreach ($db->query("SELECT e.id, e.user_id, u.name who, e.module, e.type, e.item_title, e.created_at
                                 FROM events e JOIN users u ON u.id = e.user_id
                                 WHERE e.user_id IN (" . implode(',', $ids) . ") ORDER BY e.id DESC LIMIT 15") as $r) {
                $recent[] = ['who' => $r['who'], 'module' => $r['module'], 'type' => $r['type'],
                             'title' => $r['item_title'], 'created' => $r['created_at']];
            }
        }
        rt_json(['ok' => true, 'family' => ['id' => (int)$fam['id'], 'label' => $fam['label'], 'owner' => (int)$fam['owner_id'], 'created' => $fam['created_at']],
                 'members' => array_values($members), 'recent' => $recent]);
    }

    case 'family_delete': {
        // ПОЛНОЕ удаление семьи для чистки: дети стираются целиком (данные, файлы, события);
        // родитель стирается, если не состоит в других семьях, иначе только отвязывается.
        // Один сводный лог остаётся (module='admin'). Свою семью удалить нельзя.
        $fid = (int)($b['family_id'] ?? 0);
        if (!$fid) rt_json(['error' => 'bad input'], 422);
        $mm = $db->prepare("SELECT DISTINCT fm.user_id, a.kind, u.name AS nickname FROM family_members fm
                            JOIN accounts a ON a.user_id = fm.user_id JOIN users u ON u.id = fm.user_id
                            WHERE fm.family_id = ?");
        $mm->execute([$fid]);
        $members = $mm->fetchAll();
        foreach ($members as $m) if ((int)$m['user_id'] === $AID) rt_json(['error' => 'cannot delete own family'], 422);
        $wiped = []; $detached = [];
        foreach ($members as $m) {
            $uid = (int)$m['user_id'];
            $full = true;
            if ($m['kind'] === 'parent') {
                $o = $db->prepare("SELECT 1 FROM family_members WHERE user_id = ? AND family_id <> ? AND status='active' LIMIT 1");
                $o->execute([$uid, $fid]);
                if ($o->fetch()) $full = false; // родитель живёт в другой семье — не стираем
            }
            if ($full) { rt_admin_wipe_user($db, $uid); $wiped[] = $m['nickname']; }
            else {
                $db->prepare("DELETE FROM family_members WHERE user_id = ? AND family_id = ?")->execute([$uid, $fid]);
                $db->prepare("DELETE FROM guardianships WHERE family_id = ? AND (child_user_id = ? OR guardian_user_id = ?)")->execute([$fid, $uid, $uid]);
                $detached[] = $m['nickname'];
            }
        }
        $db->prepare("DELETE FROM invitations WHERE family_id = ?")->execute([$fid]);
        $db->prepare("DELETE FROM bans WHERE kind='family' AND family_id = ?")->execute([$fid]);
        $db->prepare("DELETE FROM guardianships WHERE family_id = ?")->execute([$fid]);
        $db->prepare("DELETE FROM family_members WHERE family_id = ?")->execute([$fid]);
        $db->prepare("DELETE FROM families WHERE id = ?")->execute([$fid]);
        alog('family_deleted', $fid, null, ['wiped' => $wiped, 'detached' => $detached]);
        rt_json(['ok' => true, 'wiped' => $wiped, 'detached' => $detached]);
    }

    case 'user_create': {
        // Создать пользователя из админки. Ребёнок: никнейм + семья (временный пароль, смена при входе).
        // Родитель: никнейм + email (+семья или своя новая) + язык письма-приглашения.
        $kind = ($b['kind'] ?? '') === 'parent' ? 'parent' : 'child';
        $nick = trim((string)($b['nickname'] ?? ''));
        if (!rt_valid_nickname($nick)) rt_json(['error' => 'bad nickname'], 422);
        if (rt_nickname_taken($db, $nick)) rt_json(['error' => 'nickname taken'], 409);
        $fid = (int)($b['family_id'] ?? 0);
        if ($kind === 'child') {
            if (!$fid) rt_json(['error' => 'family required'], 422);
            $o = $db->prepare("SELECT owner_id FROM families WHERE id = ? AND deleted_at IS NULL"); $o->execute([$fid]);
            $own = $o->fetch();
            if (!$own) rt_json(['error' => 'family not found'], 404);
            $temp = rt_temp_password(); // SEC 2026-06-09: случайный временный пароль вместо «1234»
            $cid = rt_create_user($db, $nick, 'child', [
                'password_hash' => password_hash($temp, PASSWORD_DEFAULT), 'must_change' => 1, 'invited_by' => $AID,
            ]);
            rt_add_member($db, $fid, $cid, 'child');
            rt_add_guardianship($db, $cid, (int)$own['owner_id'], $fid, 'primary', 'created');
            alog('user_created', $cid, $nick, ['kind' => 'child', 'family' => $fid]);
            rt_json(['ok' => true, 'id' => $cid, 'temp_password' => $temp]);
        }
        $email = (string)($b['email'] ?? '');
        if (!rt_valid_email($email)) rt_json(['error' => 'bad email'], 422);
        if (rt_email_taken($db, $email)) rt_json(['error' => 'email taken'], 409);
        if (rt_email_banned($db, $email)) rt_json(['error' => 'banned'], 403);
        $temp = rt_temp_password(); // SEC 2026-06-09: случайный временный пароль вместо «1234»
        $pid = rt_create_user($db, $nick, 'parent', [
            'email' => rt_norm_email($email), 'password_hash' => password_hash($temp, PASSWORD_DEFAULT),
            'must_change' => 1, 'invited_by' => $AID,
        ]);
        if ($fid) {
            $chk = $db->prepare("SELECT 1 FROM families WHERE id = ? AND deleted_at IS NULL"); $chk->execute([$fid]);
            if (!$chk->fetch()) rt_json(['error' => 'family not found'], 404);
            rt_add_member($db, $fid, $pid, 'parent');
        } else {
            $fid = rt_create_family($db, $pid, 'Семья');
            rt_add_member($db, $fid, $pid, 'owner');
        }
        // письмо-приглашение — по галке админа (по умолчанию шлём), язык выбирает админ
        $notify = !isset($b['notify']) || !empty($b['notify']);
        $mailOk = false;
        if ($notify) {
            $mail = rt_mail_send_tpl(rt_norm_email($email), 'admin_invite_parent', rt_mail_lang($b), [
                'nickname' => $nick, 'link' => rt_app_url(''), 'temp_password' => $temp,
            ]);
            $mailOk = !empty($mail['ok']);
        }
        $c = rt_config();
        $logOnly = $notify && ((isset($c['mail_driver']) ? (string)$c['mail_driver'] : 'log') === 'log');
        alog('user_created', $pid, $nick, ['kind' => 'parent', 'family' => $fid, 'notify' => $notify, 'mail_ok' => $mailOk]);
        rt_json(['ok' => true, 'id' => $pid, 'temp_password' => $temp,
                 'notify' => $notify, 'mailOk' => $mailOk, 'mailLogOnly' => $logOnly]);
    }

    case 'family_rename': {
        $fid = (int)($b['family_id'] ?? 0);
        $label = trim((string)($b['label'] ?? ''));
        if (!$fid || $label === '' || mb_strlen($label) > 40) rt_json(['error' => 'bad input'], 422);
        $db->prepare("UPDATE families SET label = ? WHERE id = ?")->execute([$label, $fid]);
        alog('family_renamed', $fid, $label);
        rt_json(['ok' => true]);
    }

    case 'parent_attach': { // привязать СУЩЕСТВУЮЩЕГО родителя к семье (вторым родителем)
        $fid = (int)($b['family_id'] ?? 0);
        $uid = (int)($b['user_id'] ?? 0);
        if (!$fid || !$uid) rt_json(['error' => 'bad input'], 422);
        $acc = rt_account($db, $uid);
        if (!$acc || $acc['kind'] !== 'parent') rt_json(['error' => 'parent only'], 422);
        $db->prepare("INSERT INTO family_members (family_id, user_id, role, status) VALUES (?, ?, 'parent', 'active')
                      ON DUPLICATE KEY UPDATE status='active', role=IF(role='owner','owner','parent')")->execute([$fid, $uid]);
        // уведомление по желанию админа (галка в модалке): «вас добавили родителем в семью»
        $notify = !empty($b['notify']); $mailOk = false;
        if ($notify && !empty($acc['email'])) {
            $fl = $db->prepare("SELECT label FROM families WHERE id = ?"); $fl->execute([$fid]);
            $frow = $fl->fetch();
            $mail = rt_mail_send_tpl($acc['email'], 'parent_attached', rt_mail_lang($b), [
                'nickname' => $acc['nickname'],
                'family'   => $frow && $frow['label'] !== null ? (string)$frow['label'] : ('#' . $fid),
                'link'     => rt_app_url(''),
            ]);
            $mailOk = !empty($mail['ok']);
        }
        alog('parent_attached', $uid, null, ['family' => $fid, 'notify' => $notify, 'mail_ok' => $mailOk]);
        $c = rt_config();
        rt_json(['ok' => true, 'mailOk' => $mailOk,
                 'mailLogOnly' => $notify && ((isset($c['mail_driver']) ? (string)$c['mail_driver'] : 'log') === 'log')]);
    }

    case 'parent_detach': { // отвязать родителя от семьи (владельца — нельзя; его меняют через transfer_owner)
        $fid = (int)($b['family_id'] ?? 0);
        $uid = (int)($b['user_id'] ?? 0);
        if (!$fid || !$uid) rt_json(['error' => 'bad input'], 422);
        $o = $db->prepare("SELECT owner_id FROM families WHERE id = ?"); $o->execute([$fid]);
        $own = $o->fetch();
        if ($own && (int)$own['owner_id'] === $uid) rt_json(['error' => 'владельца семьи отвязать нельзя — удалите семью целиком или перенесите детей'], 422);
        $db->prepare("UPDATE family_members SET status='disabled' WHERE family_id = ? AND user_id = ? AND role IN ('parent','owner')")->execute([$fid, $uid]);
        $db->prepare("UPDATE guardianships g JOIN family_members fm ON fm.family_id = ? AND fm.role='child' AND fm.user_id = g.child_user_id
                      SET g.status='severed', g.severed_at=NOW(), g.sever_reason='admin_detach'
                      WHERE g.guardian_user_id = ? AND g.status='active'")->execute([$fid, $uid]);
        alog('parent_detached', $uid, null, ['family' => $fid]);
        rt_json(['ok' => true]);
    }

    case 'child_move': { // перенести ребёнка в другую семью: членство + primary-опекунство на владельца
        $cid = (int)($b['child_id'] ?? 0);
        $fid = (int)($b['to_family_id'] ?? 0);
        if (!$cid || !$fid) rt_json(['error' => 'bad input'], 422);
        $acc = rt_account($db, $cid);
        if (!$acc || $acc['kind'] !== 'child') rt_json(['error' => 'not a child'], 422);
        $o = $db->prepare("SELECT owner_id FROM families WHERE id = ? AND deleted_at IS NULL"); $o->execute([$fid]);
        $own = $o->fetch();
        if (!$own) rt_json(['error' => 'family not found'], 404);
        $db->prepare("UPDATE family_members SET status='disabled' WHERE user_id = ? AND role='child'")->execute([$cid]);
        $db->prepare("INSERT INTO family_members (family_id, user_id, role, status) VALUES (?, ?, 'child', 'active')
                      ON DUPLICATE KEY UPDATE status='active'")->execute([$fid, $cid]);
        $db->prepare("UPDATE guardianships SET status='severed', severed_at=NOW(), sever_reason='admin_move'
                      WHERE child_user_id = ? AND status='active'")->execute([$cid]);
        rt_add_guardianship($db, $cid, (int)$own['owner_id'], $fid, 'primary', 'created');
        alog('child_moved', $cid, $acc['nickname'], ['to_family' => $fid]);
        rt_json(['ok' => true]);
    }

    case 'family_ban': case 'family_unban': {
        // Полный бан семьи: блокируются ВСЕ аккаунты, рвутся сессии, email каждого родителя
        // попадает в бан-лист (повторная регистрация невозможна). Данные не удаляются.
        $fid = (int)($b['family_id'] ?? 0);
        if (!$fid) rt_json(['error' => 'bad input'], 422);
        $mm = $db->prepare("SELECT fm.user_id, a.kind, a.email FROM family_members fm JOIN accounts a ON a.user_id = fm.user_id WHERE fm.family_id = ?");
        $mm->execute([$fid]);
        $members = $mm->fetchAll();
        if ($op === 'family_ban') {
            $reason = mb_substr(trim((string)($b['reason'] ?? '')), 0, 200);
            foreach ($members as $m) {
                if ((int)$m['user_id'] === $AID) rt_json(['error' => 'cannot ban own family'], 422);
            }
            $db->prepare("INSERT INTO bans (kind, family_id, reason, created_by) VALUES ('family', ?, ?, ?)")->execute([$fid, $reason, $AID]);
            foreach ($members as $m) {
                $db->prepare("UPDATE accounts SET status='disabled' WHERE user_id = ?")->execute([(int)$m['user_id']]);
                $db->prepare("DELETE FROM sessions WHERE user_id = ?")->execute([(int)$m['user_id']]);
                if ($m['kind'] === 'parent' && $m['email']) {
                    $db->prepare("INSERT INTO bans (kind, email_hash, reason, created_by) VALUES ('email', ?, ?, ?)")
                       ->execute([hash('sha256', rt_norm_email($m['email'])), $reason, $AID]);
                }
            }
            $db->prepare("UPDATE invitations SET status='revoked' WHERE family_id = ? AND status='pending'")->execute([$fid]);
            alog('family_banned', $fid, null, ['reason' => $reason]);
        } else {
            $db->prepare("UPDATE bans SET lifted_at=NOW(), lifted_by=? WHERE kind='family' AND family_id=? AND lifted_at IS NULL")->execute([$AID, $fid]);
            foreach ($members as $m) {
                if ($m['kind'] === 'parent' && $m['email']) {
                    $db->prepare("UPDATE bans SET lifted_at=NOW(), lifted_by=? WHERE kind='email' AND email_hash=? AND lifted_at IS NULL")
                       ->execute([$AID, hash('sha256', rt_norm_email($m['email']))]);
                }
                $db->prepare("UPDATE accounts SET status='active' WHERE user_id = ?")->execute([(int)$m['user_id']]);
            }
            alog('family_unbanned', $fid);
        }
        rt_json(['ok' => true]);
    }

    case 'bans': {
        $rows = [];
        foreach ($db->query("SELECT bn.*, f.label FROM bans bn LEFT JOIN families f ON f.id = bn.family_id ORDER BY bn.id DESC LIMIT 200") as $r) {
            $rows[] = ['id' => (int)$r['id'], 'kind' => $r['kind'],
                       'familyId' => $r['family_id'] ? (int)$r['family_id'] : null, 'familyLabel' => $r['label'],
                       'emailHash' => $r['email_hash'] ? substr($r['email_hash'], 0, 12) . '…' : null,
                       'reason' => $r['reason'], 'created' => $r['created_at'], 'lifted' => $r['lifted_at']];
        }
        rt_json(['ok' => true, 'bans' => $rows]);
    }

    /* ================= ПРИГЛАШЕНИЯ (все по системе) ================= */
    case 'invites': {
        $rows = [];
        foreach ($db->query("SELECT i.*, u.name AS inviter FROM invitations i JOIN users u ON u.id = i.inviter_id ORDER BY i.id DESC LIMIT 200") as $r) {
            $rows[] = ['id' => (int)$r['id'], 'type' => $r['type'], 'inviter' => $r['inviter'],
                       'email' => $r['email'], 'status' => $r['status'],
                       'created' => $r['created_at'], 'expires' => $r['expires_at']];
        }
        rt_json(['ok' => true, 'invites' => $rows]);
    }

    case 'invite_revoke': {
        $id = (int)($b['id'] ?? 0);
        $db->prepare("UPDATE invitations SET status='revoked' WHERE id = ? AND status='pending'")->execute([$id]);
        alog('invite_revoked', $id);
        rt_json(['ok' => true]);
    }

    /* ================= ЗАПИСИ МОДУЛЕЙ (универсальный браузер контента) ================= */
    case 'collections': { // какие данные вообще есть: module → collection → счётчик
        $rows = [];
        foreach ($db->query("SELECT module, collection, COUNT(*) n FROM module_data WHERE deleted_at IS NULL GROUP BY module, collection ORDER BY module, collection") as $r) {
            $rows[] = ['module' => $r['module'], 'collection' => $r['collection'], 'n' => (int)$r['n']];
        }
        $w = $db->query("SELECT COUNT(*) n FROM wishlist_items WHERE deleted_at IS NULL")->fetch();
        rt_json(['ok' => true, 'collections' => $rows, 'wishlist' => (int)$w['n']]);
    }

    case 'records': { // листинг: module_data ИЛИ wishlist (module='wishlist'). Фото — только факт.
        $module = (string)($b['module'] ?? '');
        $col = (string)($b['collection'] ?? '');
        $uid = (int)($b['user_id'] ?? 0);
        $rows = [];
        if ($module === 'wishlist') {
            $sql = "SELECT w.id, w.user_id, u.name AS owner, w.title, w.note, w.status, w.favorite, w.created_at,
                           (w.photo IS NOT NULL) AS has_photo
                    FROM wishlist_items w JOIN users u ON u.id = w.user_id WHERE w.deleted_at IS NULL";
            $args = [];
            if ($uid) { $sql .= " AND w.user_id = ?"; $args[] = $uid; }
            $sql .= " ORDER BY w.id DESC LIMIT 300";
            $s = $db->prepare($sql); $s->execute($args);
            foreach ($s->fetchAll() as $r) {
                $rows[] = ['id' => (int)$r['id'], 'userId' => (int)$r['user_id'], 'owner' => $r['owner'],
                           'title' => $r['title'], 'note' => $r['note'], 'status' => $r['status'],
                           'created' => $r['created_at'], 'hasImage' => (bool)$r['has_photo']];
            }
        } else {
            if (!preg_match('/^[a-z0-9_-]{2,40}$/', $module)) rt_json(['error' => 'bad module'], 422);
            $sql = "SELECT md.id, md.user_id, u.name AS owner, md.collection, md.status, md.data, md.created_at
                    FROM module_data md JOIN users u ON u.id = md.user_id
                    WHERE md.module = ? AND md.deleted_at IS NULL";
            $args = [$module];
            if ($col !== '') { $sql .= " AND md.collection = ?"; $args[] = $col; }
            if ($uid) { $sql .= " AND md.user_id = ?"; $args[] = $uid; }
            $sql .= " ORDER BY md.id DESC LIMIT 300";
            $s = $db->prepare($sql); $s->execute($args);
            foreach ($s->fetchAll() as $r) {
                $d = json_decode((string)$r['data'], true);
                if (is_array($d)) { unset($d['photo'], $d['image'], $d['dataUrl']); } // путей к картинкам админу не отдаём
                $rows[] = ['id' => (int)$r['id'], 'userId' => (int)$r['user_id'], 'owner' => $r['owner'],
                           'collection' => $r['collection'], 'status' => $r['status'],
                           'data' => $d, 'created' => $r['created_at']];
            }
        }
        rt_json(['ok' => true, 'records' => $rows]);
    }

    case 'record_add': { // новая запись в module_data от имени пользователя (data = JSON-объект)
        $module = (string)($b['module'] ?? '');
        $col = (string)($b['collection'] ?? 'default');
        $uid = (int)($b['user_id'] ?? 0);
        $data = isset($b['data']) && is_array($b['data']) ? $b['data'] : null;
        if (!preg_match('/^[a-z0-9_-]{2,40}$/', $module) || !$uid || $data === null) rt_json(['error' => 'bad input'], 422);
        unset($data['photo'], $data['image'], $data['dataUrl']); // картинки через админку не вкладываются
        $db->prepare("INSERT INTO module_data (user_id, module, collection, status, data) VALUES (?, ?, ?, '', ?)")
           ->execute([$uid, $module, $col, json_encode($data, JSON_UNESCAPED_UNICODE)]);
        $id = (int)$db->lastInsertId();
        alog('record_added', $id, $module . '/' . $col, ['user' => $uid]);
        rt_json(['ok' => true, 'id' => $id]);
    }

    case 'record_update': { // правка data (целиком) и/или status
        $id = (int)($b['id'] ?? 0);
        if (!$id) rt_json(['error' => 'bad input'], 422);
        if (isset($b['data']) && is_array($b['data'])) {
            $data = $b['data'];
            unset($data['photo'], $data['image'], $data['dataUrl']);
            $db->prepare("UPDATE module_data SET data = ?, updated_at = NOW() WHERE id = ?")
               ->execute([json_encode($data, JSON_UNESCAPED_UNICODE), $id]);
        }
        if (isset($b['status'])) {
            $db->prepare("UPDATE module_data SET status = ?, updated_at = NOW() WHERE id = ?")->execute([(string)$b['status'], $id]);
        }
        alog('record_updated', $id);
        rt_json(['ok' => true]);
    }

    case 'record_delete': { // мягкое удаление записи module_data или wishlist_items
        $id = (int)($b['id'] ?? 0);
        $module = (string)($b['module'] ?? '');
        if (!$id) rt_json(['error' => 'bad input'], 422);
        if ($module === 'wishlist') {
            $db->prepare("UPDATE wishlist_items SET deleted_at = NOW() WHERE id = ?")->execute([$id]);
        } else {
            $db->prepare("UPDATE module_data SET deleted_at = NOW() WHERE id = ?")->execute([$id]);
        }
        alog('record_deleted', $id, $module);
        rt_json(['ok' => true]);
    }

    case 'image_delete': { // удалить картинку записи виш-листа: файл с диска + очистка пути. Содержимое НЕ читается.
        $id = (int)($b['id'] ?? 0);
        if (!$id) rt_json(['error' => 'bad input'], 422);
        $s = $db->prepare("SELECT photo FROM wishlist_items WHERE id = ?"); $s->execute([$id]);
        $r = $s->fetch();
        if (!$r || !$r['photo']) rt_json(['error' => 'no image'], 404);
        $path = (string)$r['photo'];
        $db->prepare("UPDATE wishlist_items SET photo = NULL, updated_at = NOW() WHERE id = ?")->execute([$id]);
        $db->prepare("UPDATE uploaded_files SET deleted_at = NOW() WHERE path = ?")->execute([$path]);
        $abs = __DIR__ . '/../' . ltrim($path, '/');
        if (strpos(realpath(dirname($abs)) ?: '', realpath(__DIR__ . '/../uploads') ?: '~') === 0 && is_file($abs)) @unlink($abs);
        alog('image_deleted', $id, basename($path));
        rt_json(['ok' => true]);
    }

    /* ================= ОЧКИ (леджер bank/points) ================= */
    case 'points': {
        $uid = (int)($b['user_id'] ?? 0);
        $sql = "SELECT md.id, md.user_id, u.name AS owner, md.data, md.created_at
                FROM module_data md JOIN users u ON u.id = md.user_id
                WHERE md.module='bank' AND md.collection='points' AND md.deleted_at IS NULL";
        $args = [];
        if ($uid) { $sql .= " AND md.user_id = ?"; $args[] = $uid; }
        $sql .= " ORDER BY md.id DESC LIMIT 300";
        $s = $db->prepare($sql); $s->execute($args);
        $rows = []; $balances = [];
        foreach ($s->fetchAll() as $r) {
            $d = json_decode((string)$r['data'], true) ?: [];
            $rows[] = ['id' => (int)$r['id'], 'userId' => (int)$r['user_id'], 'owner' => $r['owner'],
                       'n' => isset($d['n']) ? (int)$d['n'] : 0, 'reason' => $d['reason'] ?? '', 'created' => $r['created_at']];
        }
        foreach ($db->query("SELECT md.user_id, u.name AS owner, COALESCE(SUM(CAST(JSON_EXTRACT(md.data,'$.n') AS SIGNED)),0) bal
                             FROM module_data md JOIN users u ON u.id = md.user_id
                             WHERE md.module='bank' AND md.collection='points' AND md.deleted_at IS NULL
                             GROUP BY md.user_id, u.name ORDER BY bal DESC") as $r) {
            $balances[] = ['userId' => (int)$r['user_id'], 'owner' => $r['owner'], 'balance' => (int)$r['bal']];
        }
        rt_json(['ok' => true, 'txns' => $rows, 'balances' => $balances]);
    }

    case 'points_grant': { // транзакция от админа: n может быть и отрицательным (списание/корректировка)
        $uid = (int)($b['user_id'] ?? 0);
        $n = (int)($b['n'] ?? 0);
        $reason = mb_substr(trim((string)($b['reason'] ?? '')), 0, 120);
        if (!$uid || $n === 0 || $n < -10000 || $n > 10000) rt_json(['error' => 'bad input'], 422);
        $db->prepare("INSERT INTO module_data (user_id, module, collection, status, data) VALUES (?, 'bank', 'points', '', ?)")
           ->execute([$uid, json_encode(['n' => $n, 'reason' => $reason !== '' ? $reason : 'админ', 'by' => 'admin'], JSON_UNESCAPED_UNICODE)]);
        $id = (int)$db->lastInsertId();
        alog('points_granted', $id, null, ['user' => $uid, 'n' => $n, 'reason' => $reason]);
        rt_json(['ok' => true, 'id' => $id]);
    }

    case 'points_update': { // правка суммы/причины транзакции
        $id = (int)($b['id'] ?? 0);
        $n = (int)($b['n'] ?? 0);
        $reason = mb_substr(trim((string)($b['reason'] ?? '')), 0, 120);
        if (!$id || $n === 0) rt_json(['error' => 'bad input'], 422);
        $db->prepare("UPDATE module_data SET data = ?, updated_at = NOW() WHERE id = ? AND module='bank' AND collection='points'")
           ->execute([json_encode(['n' => $n, 'reason' => $reason, 'by' => 'admin_edit'], JSON_UNESCAPED_UNICODE), $id]);
        alog('points_updated', $id, null, ['n' => $n]);
        rt_json(['ok' => true]);
    }

    case 'points_delete': {
        $id = (int)($b['id'] ?? 0);
        if (!$id) rt_json(['error' => 'bad input'], 422);
        $db->prepare("UPDATE module_data SET deleted_at = NOW() WHERE id = ? AND module='bank' AND collection='points'")->execute([$id]);
        alog('points_deleted', $id);
        rt_json(['ok' => true]);
    }

    /* ================= ТИКЕТЫ (обращения «Сообщить о проблеме», миграция 015) =================
       Пользовательская сторона — api/tickets.php (Настройки → Помощь). Здесь — сторона админа:
       список с фильтром, переписка, ответ (у репортёра загорается «новое»), закрыть/переоткрыть. */
    case 'tickets': {
        $st = isset($b['status']) ? (string)$b['status'] : '';
        $where = ''; $args = [];
        if ($st === 'open' || $st === 'closed') { $where = " WHERE t.status = ?"; $args[] = $st; }
        $sql = "SELECT t.id, t.user_id, u.name AS owner, a.kind, t.subject, t.source, t.status,
                       t.admin_unread, t.created_at, t.updated_at,
                       (SELECT COUNT(*) FROM ticket_messages m WHERE m.ticket_id = t.id) AS msgs
                FROM tickets t JOIN users u ON u.id = t.user_id JOIN accounts a ON a.user_id = t.user_id"
               . $where . " ORDER BY (t.status='open') DESC, t.admin_unread DESC, t.updated_at DESC LIMIT 200";
        $s = $db->prepare($sql); $s->execute($args);
        $rows = [];
        foreach ($s->fetchAll() as $r) {
            $rows[] = ['id' => (int)$r['id'], 'userId' => (int)$r['user_id'], 'owner' => $r['owner'],
                       'kind' => $r['kind'], 'subject' => $r['subject'], 'source' => $r['source'],
                       'status' => $r['status'], 'unread' => (int)$r['admin_unread'] === 1,
                       'msgs' => (int)$r['msgs'], 'created' => $r['created_at'], 'updated' => $r['updated_at']];
        }
        rt_json(['ok' => true, 'tickets' => $rows]);
    }

    case 'ticket_view': {
        $id = (int)($b['id'] ?? 0);
        if (!$id) rt_json(['error' => 'bad input'], 422);
        $s = $db->prepare("SELECT t.*, u.name AS owner, a.kind FROM tickets t
                           JOIN users u ON u.id = t.user_id JOIN accounts a ON a.user_id = t.user_id
                           WHERE t.id = ? LIMIT 1");
        $s->execute([$id]);
        $tk = $s->fetch();
        if (!$tk) rt_json(['error' => 'not found'], 404);
        if ((int)$tk['admin_unread'] === 1) {
            $db->prepare("UPDATE tickets SET admin_unread = 0 WHERE id = ?")->execute([$id]);
        }
        $msgs = [];
        $m = $db->prepare("SELECT m.id, m.author_id, m.is_admin, m.body, m.created_at, u.name AS author
                           FROM ticket_messages m LEFT JOIN users u ON u.id = m.author_id
                           WHERE m.ticket_id = ? ORDER BY m.id");
        $m->execute([$id]);
        foreach ($m->fetchAll() as $r) {
            $msgs[] = ['id' => (int)$r['id'], 'admin' => (int)$r['is_admin'] === 1,
                       'author' => $r['author'], 'body' => $r['body'], 'created' => $r['created_at']];
        }
        rt_json(['ok' => true, 'ticket' => ['id' => (int)$tk['id'], 'userId' => (int)$tk['user_id'],
                 'owner' => $tk['owner'], 'kind' => $tk['kind'], 'subject' => $tk['subject'],
                 'source' => $tk['source'], 'status' => $tk['status'], 'created' => $tk['created_at']],
                 'messages' => $msgs]);
    }

    case 'ticket_reply': {
        $id = (int)($b['id'] ?? 0);
        $text = isset($b['text']) ? trim((string)$b['text']) : '';
        if (!$id || $text === '') rt_json(['error' => 'bad input'], 422);
        $text = mb_substr($text, 0, 2000);
        $s = $db->prepare("SELECT id, user_id, subject FROM tickets WHERE id = ? LIMIT 1"); $s->execute([$id]);
        $tk = $s->fetch();
        if (!$tk) rt_json(['error' => 'not found'], 404);
        $db->prepare("INSERT INTO ticket_messages (ticket_id, author_id, is_admin, body) VALUES (?, ?, 1, ?)")
           ->execute([$id, $AID, $text]);
        // ответ админа: репортёру загорается «новое», закрытый тикет переоткрывается
        $db->prepare("UPDATE tickets SET status = 'open', closed_at = NULL, user_unread = 1, admin_unread = 0, updated_at = NOW() WHERE id = ?")
           ->execute([$id]);
        // оповещение автору (ГАЙД-оповещения.md): тап открывает переписку в настройках
        rt_notify((int)$tk['user_id'], 'tickets', 'reply', ['subject' => $tk['subject']], ['view' => 'ticket', 'id' => $id], $AID);
        alog('ticket_replied', $id, $tk['subject']);
        rt_json(['ok' => true]);
    }

    case 'ticket_close': case 'ticket_reopen': {
        $id = (int)($b['id'] ?? 0);
        if (!$id) rt_json(['error' => 'bad input'], 422);
        if ($op === 'ticket_close') {
            // закрытие видно репортёру (user_unread=1 — статус изменился)
            $db->prepare("UPDATE tickets SET status = 'closed', closed_at = NOW(), user_unread = 1, admin_unread = 0, updated_at = NOW() WHERE id = ?")->execute([$id]);
            // оповещение автору о закрытии (тап — в переписку)
            $s = $db->prepare("SELECT user_id, subject FROM tickets WHERE id = ? LIMIT 1"); $s->execute([$id]);
            if ($tk = $s->fetch()) rt_notify((int)$tk['user_id'], 'tickets', 'closed', ['subject' => $tk['subject']], ['view' => 'ticket', 'id' => $id], $AID);
            alog('ticket_closed', $id);
        } else {
            $db->prepare("UPDATE tickets SET status = 'open', closed_at = NULL, updated_at = NOW() WHERE id = ?")->execute([$id]);
            alog('ticket_reopened', $id);
        }
        rt_json(['ok' => true]);
    }

    /* ================= ПИСЬМА ================= */
    case 'mail_templates': { // реестр стандартных триггеров (api/mail/registry.php)
        $reg = rt_mail_registry();
        $rows = [];
        foreach ($reg as $action => $tpl) {
            $rows[] = ['action' => $action, 'desc' => $tpl['desc'] ?? '',
                       'placeholders' => $tpl['placeholders'] ?? [], 'subjects' => $tpl['subject'] ?? []];
        }
        $c = rt_config();
        rt_json(['ok' => true, 'templates' => $rows, 'driver' => $c['mail_driver'] ?? 'log']);
    }

    case 'mail_send': { // произвольное письмо родителю (детям писем нет — у них нет почты)
        $uid = (int)($b['user_id'] ?? 0);
        $subject = mb_substr(trim((string)($b['subject'] ?? '')), 0, 150);
        $text = mb_substr(trim((string)($b['text'] ?? '')), 0, 4000);
        if (!$uid || $subject === '' || $text === '') rt_json(['error' => 'bad input'], 422);
        $acc = rt_account($db, $uid);
        if (!$acc || $acc['kind'] !== 'parent' || !$acc['email']) rt_json(['error' => 'parent with email only'], 422);
        $html = '<p>' . nl2br(htmlspecialchars($text, ENT_QUOTES, 'UTF-8')) . '</p>';
        $res = rt_mail_deliver($acc['email'], $subject, rt_mail_wrap($html));
        rt_log('mail', 'admin_custom_mail', $uid, $subject, null, null,
               ['to' => $acc['email'], 'ok' => !empty($res['ok']), 'log_only' => !empty($res['log_only']), 'admin' => $AID]);
        if (empty($res['ok'])) rt_json(['error' => $res['error'] ?? 'send failed'], 502);
        rt_json(['ok' => true, 'logOnly' => !empty($res['log_only'])]);
    }

    case 'mail_log': {
        $rows = [];
        foreach ($db->query("SELECT id, user_id, item_title, type, meta, created_at FROM events WHERE module='mail' ORDER BY id DESC LIMIT 100") as $r) {
            $rows[] = ['id' => (int)$r['id'], 'userId' => $r['user_id'] ? (int)$r['user_id'] : null,
                       'title' => $r['item_title'], 'type' => $r['type'],
                       'meta' => json_decode((string)$r['meta'], true), 'created' => $r['created_at']];
        }
        rt_json(['ok' => true, 'mails' => $rows]);
    }

    /* ================= ПРИЛОЖЕНИЯ (реестр модулей) ================= */
    case 'modules': {
        $rows = [];
        foreach ($db->query("SELECT id, name, version, manifest, source, enabled, sort_order FROM modules WHERE deleted_at IS NULL ORDER BY sort_order, id") as $r) {
            $man = json_decode((string)$r['manifest'], true) ?: [];
            $rows[] = ['id' => $r['id'], 'name' => $r['name'], 'version' => $r['version'],
                       'source' => $r['source'], 'enabled' => (int)$r['enabled'] === 1,
                       'sort' => (int)$r['sort_order'], 'status' => $man['status'] ?? 'active',
                       'color' => $man['color'] ?? '#19e3ff',
                       'admin' => isset($man['admin']) ? $man['admin'] : null]; // админ-контракт модуля (пайплайн)
        }
        rt_json(['ok' => true, 'modules' => $rows]);
    }

    case 'module_toggle': {
        $id = (string)($b['id'] ?? '');
        if (!preg_match('/^[a-z0-9_-]{2,40}$/', $id)) rt_json(['error' => 'bad id'], 422);
        $en = !empty($b['enabled']) ? 1 : 0;
        $db->prepare("UPDATE modules SET enabled = ?, updated_at = NOW() WHERE id = ?")->execute([$en, $id]);
        alog($en ? 'module_enabled' : 'module_disabled', null, $id);
        rt_json(['ok' => true]);
    }

    case 'module_reorder': { // {order:[id,id,...]} → sort_order 10,20,30…
        $order = isset($b['order']) && is_array($b['order']) ? $b['order'] : [];
        if (!$order) rt_json(['error' => 'bad input'], 422);
        $n = 10;
        foreach ($order as $id) {
            if (!preg_match('/^[a-z0-9_-]{2,40}$/', (string)$id)) continue;
            $db->prepare("UPDATE modules SET sort_order = ?, updated_at = NOW() WHERE id = ?")->execute([$n, (string)$id]);
            $n += 10;
        }
        alog('modules_reordered', null, implode(',', array_map('strval', $order)));
        rt_json(['ok' => true]);
    }

    /* ================= ЖУРНАЛ ================= */
    case 'logs': {
        $module = isset($b['module']) ? (string)$b['module'] : '';
        $uid = (int)($b['user_id'] ?? 0);
        $page = max(0, (int)($b['page'] ?? 0));
        $per = 50;
        $where = " WHERE 1=1"; $args = [];
        if ($module !== '' && preg_match('/^[a-z0-9_-]{2,40}$/', $module)) { $where .= " AND e.module = ?"; $args[] = $module; }
        if ($uid) { $where .= " AND e.user_id = ?"; $args[] = $uid; }
        $cnt = $db->prepare("SELECT COUNT(*) n FROM events e" . $where); $cnt->execute($args);
        $total = (int)$cnt->fetch()['n'];
        $sql = "SELECT e.id, e.user_id, u.name AS who, e.module, e.type, e.item_id, e.item_title, e.meta, e.created_at
                FROM events e LEFT JOIN users u ON u.id = e.user_id" . $where .
               " ORDER BY e.id DESC LIMIT $per OFFSET " . ($page * $per);
        $s = $db->prepare($sql); $s->execute($args);
        $rows = [];
        foreach ($s->fetchAll() as $r) {
            $rows[] = ['id' => (int)$r['id'], 'userId' => $r['user_id'] ? (int)$r['user_id'] : null, 'who' => $r['who'],
                       'module' => $r['module'], 'type' => $r['type'],
                       'itemId' => $r['item_id'] ? (int)$r['item_id'] : null, 'title' => $r['item_title'],
                       'meta' => json_decode((string)$r['meta'], true), 'created' => $r['created_at']];
        }
        $mods = [];
        foreach ($db->query("SELECT DISTINCT module FROM events ORDER BY module") as $r) $mods[] = $r['module'];
        rt_json(['ok' => true, 'logs' => $rows, 'modules' => $mods]);
    }

    default:
        rt_json(['error' => 'unknown op'], 400);
}

/** ПОЛНОЕ стирание пользователя (для family_delete): данные, файлы с диска, события, аккаунт.
 *  Использовать только из удаления семьи — там же остаётся сводный admin-лог. */
function rt_admin_wipe_user($db, $uid) {
    $uid = (int)$uid;
    // файлы с диска (uploads/users/<id>/...), с защитой от выхода за пределы uploads
    $base = realpath(__DIR__ . '/../uploads');
    $dir = $base ? $base . '/users/' . $uid : null;
    if ($dir && is_dir($dir) && strpos(realpath($dir), $base) === 0) {
        $it = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST
        );
        foreach ($it as $f) { $f->isDir() ? @rmdir($f->getPathname()) : @unlink($f->getPathname()); }
        @rmdir($dir);
    }
    foreach ([
        "DELETE FROM sessions WHERE user_id = ?",
        "DELETE FROM password_resets WHERE user_id = ?",
        "DELETE FROM invitations WHERE inviter_id = ? OR invited_user_id = ? OR target_child_id = ?",
        "DELETE FROM admins WHERE user_id = ?",
        "DELETE FROM module_data WHERE user_id = ?",
        "DELETE FROM wishlist_items WHERE user_id = ?",
        "DELETE FROM uploaded_files WHERE user_id = ?",
        "DELETE FROM events WHERE user_id = ?",
        "DELETE FROM guardianships WHERE child_user_id = ? OR guardian_user_id = ?",
        "DELETE FROM family_members WHERE user_id = ?",
        "DELETE FROM accounts WHERE user_id = ?",
        "DELETE FROM users WHERE id = ?",
    ] as $sql) {
        $n = substr_count($sql, '?');
        $db->prepare($sql)->execute(array_fill(0, $n, $uid));
    }
}
