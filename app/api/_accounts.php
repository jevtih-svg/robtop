<?php
/**
 * RobTop — помощники системы аккаунтов и приглашений.
 *
 * Приватность: дети без email и без PII — только никнейм (хранится в users.name) + пароль.
 * Email только у родителей. Все разрушающие операции — мягкие (логи сохраняются).
 *
 * Этот файл ТОЛЬКО определяет функции (без вывода). Подключается из _bootstrap.php.
 * Использует rt_db()/rt_config() (из _db.php) и rt_json()/rt_log() (из _bootstrap.php).
 */

define('RT_SESS_COOKIE', 'rt_sess');

/* ---------- нормализация и валидация ---------- */
function rt_norm_email($e) { return strtolower(trim((string)$e)); }
function rt_valid_email($e) { $e = rt_norm_email($e); return $e !== '' && strlen($e) <= 190 && filter_var($e, FILTER_VALIDATE_EMAIL) !== false; }
function rt_valid_nickname($n) {
    $n = trim((string)$n);
    if ($n === '' || mb_strlen($n) < 2 || mb_strlen($n) > 24) return false;
    return preg_match('/^[\p{L}\p{N} _\-]+$/u', $n) === 1;
}
function rt_valid_password($p) { return is_string($p) && strlen($p) >= 4 && strlen($p) <= 200; }

/* ---------- токены ----------
   Короткий код для ссылок (ребёнку легко продиктовать вслух): заглавные без похожих
   символов 0/O/1/I/L. 6 знаков ≈ 0.9 млрд комбинаций — для приглашений (живут 7 дней)
   достаточно; для сброса пароля берём 8 (живёт 1 час, одноразовый). В БД, как и раньше,
   хранится ТОЛЬКО sha256-хэш кода. Старые длинные 64-hex токены остаются валидными. */
function rt_code($len = 6) {
    $a = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
    $out = '';
    for ($i = 0; $i < $len; $i++) $out .= $a[random_int(0, strlen($a) - 1)];
    return $out;
}
function rt_token() { return rt_code(6); } // легаси-имя; новые вызовы используют rt_code напрямую
/** Временный пароль нового/сброшенного детского аккаунта (показывается родителю ОДИН раз,
    меняется при первом входе). Случайный, читаемый — заменил прежний общий «1234» (SEC 2026-06-09). */
function rt_temp_password() { return rt_code(6); }
function rt_token_hash($t) { return hash('sha256', (string)$t); }
function rt_is_token($t) { return is_string($t) && preg_match('/^[A-Za-z0-9]{4,64}$/', $t) === 1; }
/** Нормализация кода из ссылки/с клавиатуры: короткие приводим к ВЕРХНЕМУ регистру
 *  (ребёнок может набрать строчными), легаси 64-hex не трогаем. */
function rt_norm_code($t) {
    $t = trim((string)$t);
    return (strlen($t) <= 12) ? strtoupper($t) : $t;
}

/* ---------- чтение аккаунтов ---------- */
function rt_account($db, $userId) {
    $s = $db->prepare(
        "SELECT u.id, u.name AS nickname, u.role, u.theme, a.kind, a.email, a.password_hash,
                a.must_change_password, a.status, a.invited_by
         FROM users u JOIN accounts a ON a.user_id = u.id WHERE u.id = ? LIMIT 1"
    );
    $s->execute([(int)$userId]);
    $r = $s->fetch();
    return $r ?: null;
}
function rt_account_by_email($db, $email) {
    $s = $db->prepare(
        "SELECT u.id, u.name AS nickname, u.role, u.theme, a.kind, a.email, a.password_hash,
                a.must_change_password, a.status, a.invited_by
         FROM accounts a JOIN users u ON u.id = a.user_id WHERE a.email = ? LIMIT 1"
    );
    $s->execute([rt_norm_email($email)]);
    $r = $s->fetch();
    return $r ?: null;
}
function rt_account_by_nickname($db, $nick) {
    $s = $db->prepare(
        "SELECT u.id, u.name AS nickname, u.role, u.theme, a.kind, a.email, a.password_hash,
                a.must_change_password, a.status, a.invited_by
         FROM users u JOIN accounts a ON a.user_id = u.id WHERE u.name = ? LIMIT 1"
    );
    $s->execute([trim((string)$nick)]);
    $r = $s->fetch();
    return $r ?: null;
}
function rt_nickname_taken($db, $nick) {
    $s = $db->prepare("SELECT 1 FROM users u JOIN accounts a ON a.user_id = u.id WHERE u.name = ? LIMIT 1");
    $s->execute([trim((string)$nick)]);
    return (bool)$s->fetch();
}
function rt_email_taken($db, $email) {
    $s = $db->prepare("SELECT 1 FROM accounts WHERE email = ? LIMIT 1");
    $s->execute([rt_norm_email($email)]);
    return (bool)$s->fetch();
}

/* ---------- создание/изменение ---------- */
function rt_create_user($db, $nickname, $kind, $opts = []) {
    $role = ($kind === 'parent') ? 'parent' : 'child';
    $db->prepare("INSERT INTO users (name, role, created_at) VALUES (?, ?, NOW())")
       ->execute([trim((string)$nickname), $role]);
    $uid = (int)$db->lastInsertId();
    $db->prepare(
        "INSERT INTO accounts (user_id, kind, email, password_hash, must_change_password, status, invited_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())"
    )->execute([
        $uid, $kind,
        isset($opts['email']) ? $opts['email'] : null,
        isset($opts['password_hash']) ? $opts['password_hash'] : null,
        !empty($opts['must_change']) ? 1 : 0,
        isset($opts['status']) ? $opts['status'] : 'active',
        isset($opts['invited_by']) ? $opts['invited_by'] : null,
    ]);
    return $uid;
}
function rt_set_password($db, $userId, $plain, $mustChange = 0) {
    $hash = password_hash((string)$plain, PASSWORD_DEFAULT);
    $db->prepare("UPDATE accounts SET password_hash = ?, must_change_password = ? WHERE user_id = ?")
       ->execute([$hash, $mustChange ? 1 : 0, (int)$userId]);
}

/* ---------- семья / опекунство ---------- */
function rt_user_family_id($db, $userId) {
    $s = $db->prepare(
        "SELECT family_id FROM family_members WHERE user_id = ? AND status = 'active'
         ORDER BY (role='owner') DESC, (role='parent') DESC, id ASC LIMIT 1"
    );
    $s->execute([(int)$userId]);
    $r = $s->fetch();
    return $r ? (int)$r['family_id'] : null;
}
function rt_create_family($db, $ownerId, $label = null) {
    $db->prepare("INSERT INTO families (owner_id, label, created_at) VALUES (?, ?, NOW())")
       ->execute([(int)$ownerId, $label]);
    return (int)$db->lastInsertId();
}
function rt_add_member($db, $familyId, $userId, $role) {
    $db->prepare(
        "INSERT INTO family_members (family_id, user_id, role) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE role = VALUES(role), status = 'active'"
    )->execute([(int)$familyId, (int)$userId, $role]);
}
function rt_primary_guardian($db, $childId) {
    $s = $db->prepare(
        "SELECT guardian_user_id FROM guardianships
         WHERE child_user_id = ? AND type = 'primary' AND status = 'active' ORDER BY id ASC LIMIT 1"
    );
    $s->execute([(int)$childId]);
    $r = $s->fetch();
    return $r ? (int)$r['guardian_user_id'] : null;
}
function rt_is_guardian($db, $guardianId, $childId) {
    $s = $db->prepare(
        "SELECT 1 FROM guardianships WHERE guardian_user_id = ? AND child_user_id = ? AND status = 'active' LIMIT 1"
    );
    $s->execute([(int)$guardianId, (int)$childId]);
    return (bool)$s->fetch();
}
function rt_add_guardianship($db, $childId, $guardianId, $familyId, $type, $source, $invitationId = null) {
    $db->prepare(
        "INSERT INTO guardianships (child_user_id, guardian_user_id, family_id, type, status, source, source_invitation_id, created_at)
         VALUES (?, ?, ?, ?, 'active', ?, ?, NOW())"
    )->execute([(int)$childId, (int)$guardianId, $familyId !== null ? (int)$familyId : null, $type, $source, $invitationId !== null ? (int)$invitationId : null]);
    return (int)$db->lastInsertId();
}
function rt_sever_provisional($db, $childId, $reason) {
    $db->prepare(
        "UPDATE guardianships SET status = 'severed', severed_at = NOW(), sever_reason = ?
         WHERE child_user_id = ? AND type = 'provisional' AND status = 'active'"
    )->execute([substr((string)$reason, 0, 60), (int)$childId]);
}

/** Управление ребёнком (блокировка, §4.9): любой активный опекун (включая provisional) или родитель его семьи. */
function rt_can_manage_child($db, $reqId, $childId) {
    if (rt_is_guardian($db, $reqId, $childId)) return true;
    $s = $db->prepare(
        "SELECT 1 FROM family_members fm1 JOIN family_members fm2 ON fm1.family_id = fm2.family_id
         WHERE fm1.user_id = ? AND fm1.role IN ('owner','parent') AND fm1.status='active'
           AND fm2.user_id = ? AND fm2.role = 'child' AND fm2.status='active' LIMIT 1"
    );
    $s->execute([(int)$reqId, (int)$childId]);
    return (bool)$s->fetch();
}

/** Может ли $reqId читать данные $targetId (себя, своих детей, детей своей семьи). */
function rt_can_read($db, $reqId, $targetId) {
    if ((int)$reqId === (int)$targetId) return true;
    if (rt_is_guardian($db, $reqId, $targetId)) return true;
    $s = $db->prepare(
        "SELECT 1 FROM family_members fm1 JOIN family_members fm2 ON fm1.family_id = fm2.family_id
         WHERE fm1.user_id = ? AND fm1.role IN ('owner','parent') AND fm1.status='active'
           AND fm2.user_id = ? AND fm2.role = 'child' AND fm2.status='active' LIMIT 1"
    );
    $s->execute([(int)$reqId, (int)$targetId]);
    return (bool)$s->fetch();
}

/* ---------- сессии ---------- */
function rt_set_session_cookie($token, $ttlDays = 30) {
    $params = [
        'expires'  => time() + $ttlDays * 86400,
        'path'     => '/',
        'secure'   => true,
        'httponly' => true,
        'samesite' => 'Lax',
    ];
    if (PHP_VERSION_ID >= 70300) {
        setcookie(RT_SESS_COOKIE, $token, $params);
    } else {
        setcookie(RT_SESS_COOKIE, $token, $params['expires'], '/; samesite=Lax', '', true, true);
    }
}
function rt_start_session($db, $userId) {
    // SEC 2026-06-09: сессионный токен — 256 бит (64 hex), а не короткий rt_code(6) (~30 бит,
    // онлайн-брутфорсился по таблице живых сессий). rt_is_token принимает [A-Za-z0-9]{4,64},
    // поэтому старые короткие токены доживают свой 30-дневный срок без разлогина.
    $tok = bin2hex(random_bytes(32));
    $ua  = isset($_SERVER['HTTP_USER_AGENT']) ? substr((string)$_SERVER['HTTP_USER_AGENT'], 0, 200) : null;
    $db->prepare(
        "INSERT INTO sessions (user_id, token_hash, created_at, expires_at, last_seen, user_agent)
         VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), NOW(), ?)"
    )->execute([(int)$userId, rt_token_hash($tok), $ua]);
    rt_set_session_cookie($tok);
    return $tok;
}
function rt_session_user_id() {
    if (empty($_COOKIE[RT_SESS_COOKIE])) return null;
    $tok = (string)$_COOKIE[RT_SESS_COOKIE];
    if (!rt_is_token($tok)) return null;
    $db = rt_db();
    $s = $db->prepare("SELECT id, user_id FROM sessions WHERE token_hash = ? AND expires_at > NOW() LIMIT 1");
    $s->execute([rt_token_hash($tok)]);
    $r = $s->fetch();
    if (!$r) return null;
    $db->prepare("UPDATE sessions SET last_seen = NOW() WHERE id = ?")->execute([(int)$r['id']]);
    return (int)$r['user_id'];
}
function rt_destroy_session($db) {
    if (!empty($_COOKIE[RT_SESS_COOKIE])) {
        $tok = (string)$_COOKIE[RT_SESS_COOKIE];
        if (rt_is_token($tok)) {
            $db->prepare("DELETE FROM sessions WHERE token_hash = ?")->execute([rt_token_hash($tok)]);
        }
    }
    rt_set_session_cookie('', -1);
}

/* ---------- гейты для эндпоинтов ---------- */
function rt_require_login($db) {
    $uid = rt_session_user_id();
    if (!$uid) rt_json(['error' => 'login required', 'authenticated' => false], 401);
    $u = rt_account($db, $uid);
    if (!$u || $u['status'] === 'disabled') rt_json(['error' => 'disabled'], 403);
    return $u;
}
function rt_require_parent($db) {
    $u = rt_require_login($db);
    if ($u['kind'] !== 'parent') rt_json(['error' => 'parent only'], 403);
    return $u;
}
function rt_block_if_must_change($u) {
    if (!empty($u['must_change_password']) && (int)$u['must_change_password'] === 1) {
        rt_json(['error' => 'must_change_password'], 409);
    }
}

/* ---------- мастер-админ (таблица admins, миграция 008) ---------- */
function rt_is_admin($db, $userId) {
    $s = $db->prepare("SELECT 1 FROM admins WHERE user_id = ? AND status = 'active' LIMIT 1");
    $s->execute([(int)$userId]);
    return (bool)$s->fetch();
}
/** Гейт админки: активная РОДИТЕЛЬСКАЯ сессия + активная запись в admins. Всё прочее — 403. */
function rt_require_admin($db) {
    $u = rt_require_parent($db);
    rt_block_if_must_change($u);
    if (!rt_is_admin($db, (int)$u['id'])) rt_json(['error' => 'admin only'], 403);
    return $u;
}

/* ---------- баны (таблица bans, миграция 008) ---------- */
function rt_email_banned($db, $email) {
    $h = hash('sha256', rt_norm_email($email));
    $s = $db->prepare("SELECT 1 FROM bans WHERE kind = 'email' AND email_hash = ? AND lifted_at IS NULL LIMIT 1");
    $s->execute([$h]);
    return (bool)$s->fetch();
}
function rt_family_banned($db, $familyId) {
    if (!$familyId) return false;
    $s = $db->prepare("SELECT 1 FROM bans WHERE kind = 'family' AND family_id = ? AND lifted_at IS NULL LIMIT 1");
    $s->execute([(int)$familyId]);
    return (bool)$s->fetch();
}

/* ---------- мульти-аккаунты на устройстве (switch_tokens, миграция 009) ----------
   Длинный токен выдаётся при входе, живёт в localStorage и обменивается на свежую
   сессию (op switch) — так на семейном планшете переключаются без пароля.
   Блокировка аккаунта закрывает и переключение (switch проверяет status). */
function rt_switch_token_new($db, $userId) {
    $tok = bin2hex(random_bytes(32)); // 64 hex; руками не набирается, в БД только хэш
    // SEC 2026-06-09: токен живёт в localStorage (риск кражи через XSS) — TTL сокращён 180→90 дней,
    // чтобы уменьшить окно. Полное решение (httpOnly-cookie) — отдельной задачей.
    $db->prepare("INSERT INTO switch_tokens (user_id, token_hash, created_at, last_used_at, expires_at)
                  VALUES (?, ?, NOW(), NOW(), DATE_ADD(NOW(), INTERVAL 90 DAY))")
       ->execute([(int)$userId, rt_token_hash($tok)]);
    return $tok;
}
function rt_switch_token_row($db, $tok) {
    if (!is_string($tok) || strlen($tok) !== 64) return null;
    $s = $db->prepare("SELECT id, user_id FROM switch_tokens
                       WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > NOW() LIMIT 1");
    $s->execute([rt_token_hash($tok)]);
    $r = $s->fetch();
    return $r ?: null;
}

/* ---------- безопасный вывод пользователя ---------- */
function rt_public_user($row, $self = false) {
    $out = [
        'id'                 => (int)$row['id'],
        'nickname'           => $row['nickname'],
        'kind'               => $row['kind'],
        'role'               => $row['role'],
        'theme'              => (isset($row['theme']) && $row['theme'] !== '') ? $row['theme'] : 'neon',
        'mustChangePassword' => ((int)$row['must_change_password'] === 1),
    ];
    if ($self && !empty($row['email'])) $out['email'] = $row['email'];
    return $out;
}
