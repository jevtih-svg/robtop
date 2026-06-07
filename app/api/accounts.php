<?php
/**
 * POST /api/accounts.php — система аккаунтов и приглашений (единый диспетчер по op).
 * Стиль как у data.php. Тело: { op, ... }.
 *
 * op:
 *   register_parent {nickname,email,password}
 *   login          {login,password}            login = email(родитель) или никнейм(ребёнок)
 *   logout         {}
 *   me             {}
 *   set_password   {new_password}               (обязательная смена 1234)
 *   forgot         {email}                       (родителю; единый ответ)
 *   reset          {token,new_password}
 *   add_child      {nickname}                    (родитель → детский аккаунт, пароль 1234)
 *   reset_child    {child_id}                    (опекун сбрасывает пароль ребёнка → 1234)
 *   invite         {type,email?,target_child_id?}  type: child_to_child|co_parent|transfer_child
 *   invite_info    {token}                       (для посадочной: кто и куда зовёт)
 *   accept         {token,nickname?,password?}
 *   invites        {}                            (мои отправленные)
 *   invite_action  {id,action}                   action: revoke|resend
 *   members        {}                            (семья + дети)
 *
 * Дети без email и PII — только никнейм. Логи в events сохраняются.
 */

require __DIR__ . '/_bootstrap.php';
rt_guard();

$b  = rt_body();
$op = isset($b['op']) ? (string)$b['op'] : (isset($_GET['op']) ? (string)$_GET['op'] : '');
$db = rt_db();

switch ($op) {

    /* ---------------- регистрация родителя ---------------- */
    case 'register_parent': {
        $nick  = isset($b['nickname']) ? (string)$b['nickname'] : '';
        $email = isset($b['email']) ? (string)$b['email'] : '';
        $pass  = isset($b['password']) ? (string)$b['password'] : '';
        if (!rt_valid_nickname($nick)) rt_json(['error' => 'bad nickname'], 422);
        if (!rt_valid_email($email))   rt_json(['error' => 'bad email'], 422);
        if (!rt_valid_password($pass)) rt_json(['error' => 'weak password'], 422);
        if (rt_nickname_taken($db, $nick))  rt_json(['error' => 'nickname taken'], 409);
        if (rt_email_taken($db, $email))    rt_json(['error' => 'email taken'], 409);
        if (rt_email_banned($db, $email))   rt_json(['error' => 'banned'], 403); // забаненные семьи не регистрируются повторно
        $uid = rt_create_user($db, $nick, 'parent', [
            'email' => rt_norm_email($email),
            'password_hash' => password_hash($pass, PASSWORD_DEFAULT),
            'must_change' => 0, 'status' => 'active',
        ]);
        $fid = rt_create_family($db, $uid, 'Семья');
        rt_add_member($db, $fid, $uid, 'owner');
        rt_start_session($db, $uid);
        rt_log('accounts', 'account_created', $uid, 'parent', null, null, ['kind' => 'parent']);
        rt_log('accounts', 'family_created', $fid, null, null, null, ['owner' => $uid]);
        $u = rt_account($db, $uid);
        rt_json(['ok' => true, 'user' => rt_public_user($u, true), 'family_id' => $fid]);
    }

    /* ---------------- вход ---------------- */
    case 'login': {
        $login = isset($b['login']) ? trim((string)$b['login']) : '';
        $pass  = isset($b['password']) ? (string)$b['password'] : '';
        if ($login === '' || $pass === '') rt_json(['error' => 'bad credentials'], 422);
        $acc = (strpos($login, '@') !== false) ? rt_account_by_email($db, $login) : rt_account_by_nickname($db, $login);
        if (!$acc || $acc['status'] === 'disabled' || empty($acc['password_hash']) || !password_verify($pass, $acc['password_hash'])) {
            rt_json(['error' => 'Неверный логин или пароль'], 401);
        }
        rt_start_session($db, (int)$acc['id']);
        $db->prepare("UPDATE accounts SET last_login_at = NOW() WHERE user_id = ?")->execute([(int)$acc['id']]);
        rt_log('accounts', 'login', (int)$acc['id'], null, null, null, ['kind' => $acc['kind']]);
        rt_json(['ok' => true, 'user' => rt_public_user($acc, true)]);
    }

    /* ---------------- выход ---------------- */
    case 'logout': {
        rt_destroy_session($db);
        rt_json(['ok' => true]);
    }

    /* ---------------- кто я ---------------- */
    case 'me': {
        $uid = rt_session_user_id();
        if (!$uid) rt_json(['ok' => true, 'authenticated' => false]);
        $u = rt_account($db, $uid);
        if (!$u) rt_json(['ok' => true, 'authenticated' => false]);
        $fid = rt_user_family_id($db, $uid);
        rt_json([
            'ok' => true, 'authenticated' => true,
            'user' => rt_public_user($u, true),
            'family_id' => $fid,
            'children' => rt_children_of($db, $uid),
        ]);
    }

    /* ---------------- смена пароля (в т.ч. обязательная) ---------------- */
    case 'set_password': {
        $u = rt_require_login($db);
        $np = isset($b['new_password']) ? (string)$b['new_password'] : '';
        if (!rt_valid_password($np)) rt_json(['error' => 'weak password'], 422);
        if ($np === '1234') rt_json(['error' => 'Выбери другой пароль, не 1234'], 422);
        $wasMust = !empty($u['must_change_password']);
        rt_set_password($db, (int)$u['id'], $np, 0);
        rt_log('accounts', $wasMust ? 'first_password_set' : 'password_changed', (int)$u['id']);
        rt_json(['ok' => true]);
    }

    /* ---------------- забыл пароль (родитель, по email) ---------------- */
    case 'forgot': {
        $email = isset($b['email']) ? (string)$b['email'] : '';
        if (rt_valid_email($email)) {
            $acc = rt_account_by_email($db, $email);
            if ($acc && $acc['kind'] === 'parent' && $acc['status'] !== 'disabled') {
                $tok = rt_code(8); // короткий код; сброс живёт 1 час и одноразовый
                $db->prepare("INSERT INTO password_resets (user_id, token_hash, created_at, expires_at) VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 1 HOUR))")
                   ->execute([(int)$acc['id'], rt_token_hash($tok)]);
                rt_mail_send_tpl(rt_norm_email($email), 'password_reset', rt_mail_lang($b), ['link' => rt_short_url('r', $tok)]);
                rt_log('accounts', 'password_reset_requested', (int)$acc['id']);
            }
        }
        rt_json(['ok' => true]); // единый ответ — не раскрываем, есть ли такой email
    }

    /* ---------------- сброс по токену из письма ---------------- */
    case 'reset': {
        $tok = rt_norm_code(isset($b['token']) ? (string)$b['token'] : '');
        $np  = isset($b['new_password']) ? (string)$b['new_password'] : '';
        if (!rt_is_token($tok) || !rt_valid_password($np) || $np === '1234') rt_json(['error' => 'bad input'], 422);
        $s = $db->prepare("SELECT id, user_id FROM password_resets WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW() LIMIT 1");
        $s->execute([rt_token_hash($tok)]);
        $r = $s->fetch();
        if (!$r) rt_json(['error' => 'invalid or expired'], 400);
        rt_set_password($db, (int)$r['user_id'], $np, 0);
        $db->prepare("UPDATE password_resets SET used_at = NOW() WHERE id = ?")->execute([(int)$r['id']]);
        rt_log('accounts', 'password_reset_done', (int)$r['user_id']);
        rt_json(['ok' => true]);
    }

    /* ---------------- родитель создаёт ребёнка ---------------- */
    case 'add_child': {
        $p = rt_require_parent($db); rt_block_if_must_change($p);
        $nick = isset($b['nickname']) ? (string)$b['nickname'] : '';
        if (!rt_valid_nickname($nick)) rt_json(['error' => 'bad nickname'], 422);
        if (rt_nickname_taken($db, $nick)) rt_json(['error' => 'nickname taken'], 409);
        $fid = rt_user_family_id($db, (int)$p['id']);
        if (!$fid) { $fid = rt_create_family($db, (int)$p['id'], 'Семья'); rt_add_member($db, $fid, (int)$p['id'], 'owner'); }
        $cid = rt_create_user($db, $nick, 'child', [
            'password_hash' => password_hash('1234', PASSWORD_DEFAULT),
            'must_change' => 1, 'invited_by' => (int)$p['id'],
        ]);
        rt_add_member($db, $fid, $cid, 'child');
        $gid = rt_add_guardianship($db, $cid, (int)$p['id'], $fid, 'primary', 'created');
        rt_log('accounts', 'account_created', $cid, 'child', null, null, ['by' => (int)$p['id']]);
        rt_log('accounts', 'guardianship_created', $gid, 'primary', null, null, ['child' => $cid, 'guardian' => (int)$p['id']]);
        rt_json(['ok' => true, 'child' => ['id' => $cid, 'nickname' => $nick], 'temp_password' => '1234']);
    }

    /* ---------------- сброс пароля ребёнку (опекун) ---------------- */
    case 'reset_child': {
        $p = rt_require_parent($db); rt_block_if_must_change($p);
        $cid = isset($b['child_id']) ? (int)$b['child_id'] : 0;
        if (!$cid || !rt_is_guardian($db, (int)$p['id'], $cid)) rt_json(['error' => 'forbidden'], 403);
        $acc = rt_account($db, $cid);
        if (!$acc || $acc['kind'] !== 'child') rt_json(['error' => 'not a child'], 422);
        rt_set_password($db, $cid, '1234', 1);
        rt_log('accounts', 'password_reset_by_parent', $cid, null, null, null, ['by' => (int)$p['id']]);
        rt_json(['ok' => true, 'temp_password' => '1234']);
    }

    /* ---------------- блокировка/разблокировка ребёнка (§4.9: любой родитель/опекун) ---------------- */
    case 'set_child_status': {
        $p = rt_require_parent($db); rt_block_if_must_change($p);
        $cid = isset($b['child_id']) ? (int)$b['child_id'] : 0;
        $status = (isset($b['status']) && $b['status'] === 'disabled') ? 'disabled' : 'active';
        if (!$cid || !rt_can_manage_child($db, (int)$p['id'], $cid)) rt_json(['error' => 'forbidden'], 403);
        $acc = rt_account($db, $cid);
        if (!$acc || $acc['kind'] !== 'child') rt_json(['error' => 'not a child'], 422);
        $db->prepare("UPDATE accounts SET status = ? WHERE user_id = ?")->execute([$status, $cid]);
        if ($status === 'disabled') {
            $db->prepare("DELETE FROM sessions WHERE user_id = ?")->execute([$cid]); // выкинуть активные сессии
        }
        rt_log('accounts', $status === 'disabled' ? 'account_blocked' : 'account_unblocked', $cid, null, null, null, ['by' => (int)$p['id']]);
        rt_json(['ok' => true, 'status' => $status]);
    }

    /* ---------------- создать приглашение ---------------- */
    case 'invite': {
        $u = rt_require_login($db); rt_block_if_must_change($u);
        $type = isset($b['type']) ? (string)$b['type'] : '';
        if (!in_array($type, ['child_to_child', 'co_parent', 'transfer_child'], true)) rt_json(['error' => 'bad type'], 422);
        $fid = rt_user_family_id($db, (int)$u['id']);
        $email = null; $targetChild = null;
        if ($type === 'child_to_child') {
            if ($u['kind'] !== 'child') rt_json(['error' => 'child only'], 403);
        } else {
            if ($u['kind'] !== 'parent') rt_json(['error' => 'parent only'], 403);
            $email = isset($b['email']) ? (string)$b['email'] : '';
            if (!rt_valid_email($email)) rt_json(['error' => 'bad email'], 422);
            $email = rt_norm_email($email);
            if ($type === 'transfer_child') {
                $targetChild = isset($b['target_child_id']) ? (int)$b['target_child_id'] : 0;
                if (!$targetChild || !rt_is_guardian($db, (int)$u['id'], $targetChild)) rt_json(['error' => 'not your child'], 403);
            }
        }
        $tok = rt_code(6); // короткий код — ссылку легко продиктовать
        $db->prepare(
            "INSERT INTO invitations (type, inviter_id, family_id, target_child_id, email, token_hash, status, created_at, expires_at)
             VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY))"
        )->execute([$type, (int)$u['id'], $fid, $targetChild, $email, rt_token_hash($tok)]);
        $invId = (int)$db->lastInsertId();
        $link = rt_short_url('i', $tok); // /robtop/i/<КОД> → корневой .htaccess → family.html?invite=
        rt_invite_mail($db, $type, $email, (int)$u['id'], $targetChild, $link, rt_mail_lang($b));
        rt_log('accounts', 'invite_sent', $invId, $type, null, null, ['type' => $type, 'to' => $email]);
        rt_json(['ok' => true, 'invitation_id' => $invId, 'link' => $link, 'type' => $type]);
    }

    /* ---------------- инфо о приглашении (для посадочной) ---------------- */
    case 'invite_info': {
        $tok = rt_norm_code(isset($b['token']) ? (string)$b['token'] : '');
        if (!rt_is_token($tok)) rt_json(['error' => 'bad token'], 422);
        $s = $db->prepare("SELECT i.*, u.name AS inviter_nick FROM invitations i JOIN users u ON u.id = i.inviter_id WHERE i.token_hash = ? LIMIT 1");
        $s->execute([rt_token_hash($tok)]);
        $inv = $s->fetch();
        if (!$inv) rt_json(['ok' => true, 'valid' => false]);
        $valid = ($inv['status'] === 'pending' && strtotime($inv['expires_at']) >= time());
        rt_json(['ok' => true, 'valid' => $valid, 'type' => $inv['type'], 'status' => $inv['status'],
                 'inviter' => $inv['inviter_nick'], 'needs_email' => ($inv['type'] !== 'child_to_child')]);
    }

    /* ---------------- принять приглашение ---------------- */
    case 'accept': {
        $tok = rt_norm_code(isset($b['token']) ? (string)$b['token'] : '');
        if (!rt_is_token($tok)) rt_json(['error' => 'bad token'], 422);
        $s = $db->prepare("SELECT * FROM invitations WHERE token_hash = ? LIMIT 1");
        $s->execute([rt_token_hash($tok)]);
        $inv = $s->fetch();
        if (!$inv) rt_json(['error' => 'not found'], 404);
        if ($inv['status'] !== 'pending') rt_json(['error' => 'already ' . $inv['status']], 409);
        if (strtotime($inv['expires_at']) < time()) {
            $db->prepare("UPDATE invitations SET status = 'expired' WHERE id = ?")->execute([(int)$inv['id']]);
            rt_json(['error' => 'expired'], 410);
        }
        $type = $inv['type'];
        $nick = isset($b['nickname']) ? (string)$b['nickname'] : '';
        $pass = isset($b['password']) ? (string)$b['password'] : '';

        if ($type === 'child_to_child') {
            if (!rt_valid_nickname($nick)) rt_json(['error' => 'bad nickname'], 422);
            if (rt_nickname_taken($db, $nick)) rt_json(['error' => 'nickname taken'], 409);
            $inviter = (int)$inv['inviter_id'];
            $guardian = rt_primary_guardian($db, $inviter);
            if (!$guardian) {
                $fidInv = $inv['family_id'] ? (int)$inv['family_id'] : rt_user_family_id($db, $inviter);
                if ($fidInv) {
                    $o = $db->prepare("SELECT owner_id FROM families WHERE id = ?");
                    $o->execute([$fidInv]); $row = $o->fetch();
                    if ($row) $guardian = (int)$row['owner_id'];
                }
            }
            if (!$guardian) rt_json(['error' => 'no guardian'], 409);
            $cid = rt_create_user($db, $nick, 'child', [
                'password_hash' => password_hash('1234', PASSWORD_DEFAULT),
                'must_change' => 1, 'invited_by' => $inviter,
            ]);
            $fid = rt_create_family($db, $guardian, 'Гость');
            rt_add_member($db, $fid, $cid, 'child');
            $gid = rt_add_guardianship($db, $cid, $guardian, $fid, 'provisional', 'child_invite', (int)$inv['id']);
            $db->prepare("UPDATE invitations SET status = 'accepted', invited_user_id = ?, accepted_at = NOW() WHERE id = ?")->execute([$cid, (int)$inv['id']]);
            rt_start_session($db, $cid);
            rt_log('accounts', 'account_created', $cid, 'child', null, null, ['via' => 'child_invite', 'inviter' => $inviter]);
            rt_log('accounts', 'guardianship_created', $gid, 'provisional', null, null, ['child' => $cid, 'guardian' => $guardian]);
            rt_log('accounts', 'invite_accepted', (int)$inv['id'], $type);
            $u = rt_account($db, $cid);
            rt_json(['ok' => true, 'user' => rt_public_user($u, true), 'mustChangePassword' => true]);
        }

        // co_parent и transfer_child — регистрируется новый РОДИТЕЛЬ (email из приглашения)
        if (!rt_valid_nickname($nick)) rt_json(['error' => 'bad nickname'], 422);
        if (!rt_valid_password($pass)) rt_json(['error' => 'weak password'], 422);
        if (rt_nickname_taken($db, $nick)) rt_json(['error' => 'nickname taken'], 409);
        $email = $inv['email'];
        if ($email && rt_email_taken($db, $email)) rt_json(['error' => 'email taken'], 409);
        if ($email && rt_email_banned($db, $email)) rt_json(['error' => 'banned'], 403); // бан сильнее приглашения
        $pid = rt_create_user($db, $nick, 'parent', [
            'email' => $email, 'password_hash' => password_hash($pass, PASSWORD_DEFAULT),
            'must_change' => 0, 'invited_by' => (int)$inv['inviter_id'],
        ]);

        if ($type === 'co_parent') {
            $fid = $inv['family_id'] ? (int)$inv['family_id'] : rt_user_family_id($db, (int)$inv['inviter_id']);
            if ($fid) rt_add_member($db, $fid, $pid, 'parent');
            $db->prepare("UPDATE invitations SET status = 'accepted', invited_user_id = ?, accepted_at = NOW() WHERE id = ?")->execute([$pid, (int)$inv['id']]);
            rt_start_session($db, $pid);
            rt_log('accounts', 'account_created', $pid, 'parent', null, null, ['via' => 'co_parent']);
            rt_log('accounts', 'invite_accepted', (int)$inv['id'], $type);
            $u = rt_account($db, $pid);
            rt_json(['ok' => true, 'user' => rt_public_user($u, true)]);
        }

        // transfer_child: формируем нормальную семью ребёнка и рвём провизорную связь (с логом)
        $child = (int)$inv['target_child_id'];
        if (!$child) rt_json(['error' => 'no target child'], 422);
        $fid = rt_create_family($db, $pid, 'Семья');
        rt_add_member($db, $fid, $pid, 'owner');
        $db->prepare("UPDATE family_members SET family_id = ?, status = 'active' WHERE user_id = ? AND role = 'child'")->execute([$fid, $child]);
        $chk = $db->prepare("SELECT 1 FROM family_members WHERE family_id = ? AND user_id = ? LIMIT 1");
        $chk->execute([$fid, $child]);
        if (!$chk->fetch()) rt_add_member($db, $fid, $child, 'child');
        $gid = rt_add_guardianship($db, $child, $pid, $fid, 'primary', 'transfer', (int)$inv['id']);
        rt_sever_provisional($db, $child, 'real_parent_attached');
        $db->prepare("UPDATE invitations SET status = 'accepted', invited_user_id = ?, accepted_at = NOW() WHERE id = ?")->execute([$pid, (int)$inv['id']]);
        rt_start_session($db, $pid);
        rt_log('accounts', 'account_created', $pid, 'parent', null, null, ['via' => 'transfer']);
        rt_log('accounts', 'family_created', $fid, null, null, null, ['owner' => $pid, 'for_child' => $child]);
        rt_log('accounts', 'guardianship_created', $gid, 'primary', null, null, ['child' => $child, 'guardian' => $pid]);
        rt_log('accounts', 'guardianship_severed', null, 'provisional', null, null, ['child' => $child, 'reason' => 'real_parent_attached']);
        rt_log('accounts', 'invite_accepted', (int)$inv['id'], $type);
        $u = rt_account($db, $pid);
        rt_json(['ok' => true, 'user' => rt_public_user($u, true)]);
    }

    /* ---------------- мои отправленные приглашения ---------------- */
    case 'invites': {
        $u = rt_require_login($db);
        $s = $db->prepare(
            "SELECT id, type, email, target_child_id, status,
                    UNIX_TIMESTAMP(created_at)*1000 AS created,
                    UNIX_TIMESTAMP(expires_at)*1000 AS expires
             FROM invitations WHERE inviter_id = ? ORDER BY id DESC LIMIT 50"
        );
        $s->execute([(int)$u['id']]);
        rt_json(['ok' => true, 'invites' => $s->fetchAll()]);
    }

    /* ---------------- отозвать / переслать приглашение ---------------- */
    case 'invite_action': {
        $u = rt_require_login($db);
        $id = isset($b['id']) ? (int)$b['id'] : 0;
        $action = isset($b['action']) ? (string)$b['action'] : '';
        $s = $db->prepare("SELECT * FROM invitations WHERE id = ? AND inviter_id = ? LIMIT 1");
        $s->execute([$id, (int)$u['id']]);
        $inv = $s->fetch();
        if (!$inv) rt_json(['error' => 'not found'], 404);
        if ($action === 'revoke') {
            $db->prepare("UPDATE invitations SET status = 'revoked' WHERE id = ?")->execute([$id]);
            rt_log('accounts', 'invite_revoked', $id);
            rt_json(['ok' => true]);
        }
        if ($action === 'resend') {
            $db->prepare("UPDATE invitations SET status = 'revoked' WHERE id = ? AND status = 'pending'")->execute([$id]);
            $tok = rt_code(6);
            $db->prepare(
                "INSERT INTO invitations (type, inviter_id, family_id, target_child_id, email, token_hash, status, created_at, expires_at)
                 VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY))"
            )->execute([$inv['type'], (int)$u['id'], $inv['family_id'], $inv['target_child_id'], $inv['email'], rt_token_hash($tok)]);
            $newId = (int)$db->lastInsertId();
            $link = rt_short_url('i', $tok);
            rt_invite_mail($db, (string)$inv['type'], !empty($inv['email']) ? (string)$inv['email'] : null,
                (int)$u['id'], !empty($inv['target_child_id']) ? (int)$inv['target_child_id'] : null, $link, rt_mail_lang($b));
            rt_log('accounts', 'invite_sent', $newId, $inv['type'], null, null, ['resend_of' => $id]);
            rt_json(['ok' => true, 'invitation_id' => $newId, 'link' => $link]);
        }
        rt_json(['error' => 'bad action'], 422);
    }

    /* ---------------- члены семьи + дети ---------------- */
    case 'members': {
        $u = rt_require_login($db);
        $fid = rt_user_family_id($db, (int)$u['id']);
        $members = [];
        if ($fid) {
            $s = $db->prepare(
                "SELECT u.id, u.name AS nickname, fm.role, a.kind, a.status, a.must_change_password
                 FROM family_members fm JOIN users u ON u.id = fm.user_id JOIN accounts a ON a.user_id = u.id
                 WHERE fm.family_id = ? AND fm.status = 'active' ORDER BY (fm.role='owner') DESC, (fm.role='parent') DESC, u.id"
            );
            $s->execute([$fid]);
            foreach ($s->fetchAll() as $r) {
                $members[] = [
                    'id' => (int)$r['id'], 'nickname' => $r['nickname'], 'role' => $r['role'],
                    'kind' => $r['kind'], 'status' => $r['status'],
                    'mustChangePassword' => ((int)$r['must_change_password'] === 1),
                ];
            }
        }
        rt_json(['ok' => true, 'family_id' => $fid, 'members' => $members, 'children' => rt_children_of($db, (int)$u['id'])]);
    }

    default:
        rt_json(['error' => 'unknown op'], 400);
}

/** Письмо-приглашение по трёхъязычному шаблону (api/mail/registry.php). У child_to_child почты нет — тихо выходим. */
function rt_invite_mail($db, $type, $email, $inviterId, $targetChildId, $link, $lang) {
    if (!$email) return;
    $nick = function ($id) use ($db) {
        if (!$id) return '';
        $s = $db->prepare("SELECT name FROM users WHERE id = ? LIMIT 1");
        $s->execute([(int)$id]);
        $r = $s->fetch();
        return $r ? (string)$r['name'] : '';
    };
    $action = ($type === 'transfer_child') ? 'transfer_child' : 'invite_co_parent';
    $data = ['link' => $link, 'inviter' => $nick($inviterId)];
    if ($type === 'transfer_child') $data['child'] = $nick($targetChildId);
    rt_mail_send_tpl($email, $action, $lang, $data);
}

/** Дети под опекой пользователя (для дашборда родителя). */
function rt_children_of($db, $guardianId) {
    $s = $db->prepare(
        "SELECT u.id, u.name AS nickname, g.type, a.status, a.must_change_password
         FROM guardianships g JOIN users u ON u.id = g.child_user_id JOIN accounts a ON a.user_id = u.id
         WHERE g.guardian_user_id = ? AND g.status = 'active' ORDER BY (g.type='provisional'), u.id"
    );
    $s->execute([(int)$guardianId]);
    $out = [];
    foreach ($s->fetchAll() as $r) {
        $out[] = [
            'id' => (int)$r['id'], 'nickname' => $r['nickname'], 'type' => $r['type'],
            'status' => $r['status'], 'mustChangePassword' => ((int)$r['must_change_password'] === 1),
        ];
    }
    return $out;
}
