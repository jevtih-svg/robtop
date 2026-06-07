<?php
/**
 * /api/share.php — шаринг Виш-листа (единый диспетчер по op, стиль accounts.php).
 *
 * Правило (решение заказчика 2026-06-07): делиться виш-листом можно ТОЛЬКО если родитель
 * включил флаг ребёнку (wishlist_share_settings.enabled). Включать может primary-опекун или
 * родитель семьи ребёнка — НЕ provisional (то же правило, что приватность фото §4.7):
 * на странице есть фото ребёнка. Пока флаг выключен — публичная страница отвечает 404,
 * адресные доступы спят, у ребёнка вместо шаринга — просьба родителю.
 *
 * GET  ?op=view&u=<ник>      — просмотр виш-листа по нику (ПУБЛИЧНЫЙ при enabled=1).
 *                              ВАЖНО: только rt_session_user_id(), БЕЗ rt_user_id() —
 *                              у rt_user_id есть фолбэк на id 1, аноним им быть не должен.
 * POST {op}:
 *   status                   — ребёнок: состояние шаринга (enabled, родитель, ссылка, доступы)
 *   request                  — ребёнок: письмо primary-родителю «разреши делиться» (+кулдаун 10 мин)
 *   grant   {nickname}       — ребёнок: открыть доступ пользователю платформы (только при enabled)
 *   revoke  {id}             — ребёнок: отозвать доступ
 *   shared_with_me           — любой вошедший: кто поделился со мной (только активные enabled)
 *   get     {child_id}       — родитель: состояние тумблера ребёнка (enabled, canToggle, grants)
 *   set     {child_id,enabled} — родитель: включить/выключить (гейт как у фото)
 *
 * События: share_request/share_grant/share_revoke пишутся от ребёнка (видны в журнале родителя);
 * share_enabled/share_disabled пишутся В ЖУРНАЛ РЕБЁНКА вручную (meta.by = родитель) —
 * прозрачность для второго родителя.
 */

require __DIR__ . '/_bootstrap.php';
rt_guard();

$db = rt_db();
$b  = rt_body();
$op = isset($b['op']) ? (string)$b['op'] : (isset($_GET['op']) ? (string)$_GET['op'] : '');

/* ---------- помощники (локальные для шаринга) ---------- */

/** Настройки шаринга ребёнка (или null). */
function rt_share_settings($db, $childId) {
    $s = $db->prepare("SELECT child_user_id, enabled, enabled_by FROM wishlist_share_settings WHERE child_user_id = ? LIMIT 1");
    $s->execute([(int)$childId]);
    $r = $s->fetch();
    return $r ?: null;
}
function rt_share_enabled($db, $childId) {
    $r = rt_share_settings($db, $childId);
    return $r && (int)$r['enabled'] === 1;
}

/** Право включать шаринг: primary-опекун ИЛИ родитель семьи ребёнка (НЕ provisional) —
 *  зеркало правила приватности фото (parent.php::rt_parent_can_view_images). */
function rt_share_parent_ok($db, $pid, $childId) {
    $s = $db->prepare(
        "SELECT 1 FROM guardianships
         WHERE guardian_user_id = ? AND child_user_id = ? AND type = 'primary' AND status = 'active' LIMIT 1"
    );
    $s->execute([(int)$pid, (int)$childId]);
    if ($s->fetch()) return true;
    $s = $db->prepare(
        "SELECT 1 FROM family_members fm1 JOIN family_members fm2 ON fm1.family_id = fm2.family_id
         WHERE fm1.user_id = ? AND fm1.role IN ('owner','parent') AND fm1.status='active'
           AND fm2.user_id = ? AND fm2.role = 'child' AND fm2.status='active' LIMIT 1"
    );
    $s->execute([(int)$pid, (int)$childId]);
    return (bool)$s->fetch();
}

/** Владелец виш-листа по нику: активный детский аккаунт (или null). */
function rt_share_owner_by_nick($db, $nick) {
    $s = $db->prepare(
        "SELECT u.id, u.name AS nickname, a.status, a.kind
         FROM users u JOIN accounts a ON a.user_id = u.id
         WHERE u.name = ? LIMIT 1"
    );
    $s->execute([trim((string)$nick)]);
    $r = $s->fetch();
    if (!$r || $r['kind'] !== 'child' || $r['status'] !== 'active') return null;
    return $r;
}

/** Активный адресный доступ owner→grantee. */
function rt_share_has_grant($db, $ownerId, $granteeId) {
    $s = $db->prepare(
        "SELECT 1 FROM wishlist_share_grants
         WHERE owner_user_id = ? AND grantee_user_id = ? AND revoked_at IS NULL LIMIT 1"
    );
    $s->execute([(int)$ownerId, (int)$granteeId]);
    return (bool)$s->fetch();
}

/** Публичная ссылка виш-листа: <корень>/w/<ник> (корневой .htaccess → app/w.html?u=). */
function rt_share_url($nick) {
    return rt_root_url() . 'w/' . rawurlencode((string)$nick);
}

/** Желания ребёнка для просмотра (без истории — странице она не нужна). */
function rt_share_items($db, $ownerId) {
    $q = $db->prepare(
        "SELECT id, title, note, link, photo, icon, favorite, status,
                UNIX_TIMESTAMP(created_at) * 1000 AS createdAt,
                CASE WHEN bought_at IS NULL THEN NULL ELSE UNIX_TIMESTAMP(bought_at) * 1000 END AS boughtAt
         FROM wishlist_items
         WHERE user_id = ? AND deleted_at IS NULL
         ORDER BY favorite DESC, id DESC"
    );
    $q->execute([(int)$ownerId]);
    $items = [];
    foreach ($q->fetchAll() as $r) {
        $items[] = [
            'title'     => $r['title'],
            'note'      => $r['note'],
            'link'      => $r['link'],
            'photo'     => $r['photo'],
            'icon'      => $r['icon'],
            'favorite'  => ((int)$r['favorite'] === 1),
            'status'    => $r['status'],
            'createdAt' => (int)$r['createdAt'],
            'boughtAt'  => $r['boughtAt'] !== null ? (int)$r['boughtAt'] : null,
        ];
    }
    return $items;
}

switch ($op) {

    /* ---------------- ПУБЛИЧНЫЙ просмотр по нику ---------------- */
    case 'view': {
        $nick = isset($_GET['u']) ? (string)$_GET['u'] : (isset($b['u']) ? (string)$b['u'] : '');
        $owner = rt_share_owner_by_nick($db, $nick);
        // Единый 404: не раскрываем, существует ли пользователь и закрыт ли список.
        if (!$owner) rt_json(['ok' => false, 'error' => 'not_found'], 404);
        $ownerId = (int)$owner['id'];
        $enabled = rt_share_enabled($db, $ownerId);

        $access = null;
        $sid = null;
        try { $sid = rt_session_user_id(); } catch (Throwable $e) { $sid = null; }
        if ($enabled) {
            $access = 'public';
        } elseif ($sid) {
            if ((int)$sid === $ownerId) $access = 'owner';
            elseif (rt_share_parent_ok($db, (int)$sid, $ownerId)) $access = 'parent';
        }
        if ($access === null) rt_json(['ok' => false, 'error' => 'not_found'], 404);

        rt_json([
            'ok'      => true,
            'owner'   => ['nickname' => $owner['nickname']],
            'access'  => $access,
            'enabled' => $enabled,
            'items'   => rt_share_items($db, $ownerId),
        ]);
    }

    /* ---------------- ребёнок: состояние шаринга ---------------- */
    case 'status': {
        $u = rt_require_login($db);
        if ($u['kind'] !== 'child') rt_json(['error' => 'child only'], 403);
        $cid = (int)$u['id'];
        $gid = rt_primary_guardian($db, $cid);
        $parentNick = null;
        if ($gid) {
            $s = $db->prepare("SELECT name FROM users WHERE id = ? LIMIT 1");
            $s->execute([$gid]);
            $r = $s->fetch();
            if ($r) $parentNick = (string)$r['name'];
        }
        $grants = [];
        $s = $db->prepare(
            "SELECT g.id, u.name AS nickname, UNIX_TIMESTAMP(g.created_at)*1000 AS since
             FROM wishlist_share_grants g JOIN users u ON u.id = g.grantee_user_id
             WHERE g.owner_user_id = ? AND g.revoked_at IS NULL ORDER BY g.id DESC LIMIT 200"
        );
        $s->execute([$cid]);
        foreach ($s->fetchAll() as $r) {
            $grants[] = ['id' => (int)$r['id'], 'nickname' => $r['nickname'], 'since' => (int)$r['since']];
        }
        rt_json([
            'ok'         => true,
            'enabled'    => rt_share_enabled($db, $cid),
            'hasParent'  => (bool)$gid,
            'parentNick' => $parentNick,
            'url'        => rt_share_url($u['nickname']),
            'grants'     => $grants,
        ]);
    }

    /* ---------------- ребёнок: просьба родителю включить ---------------- */
    case 'request': {
        $u = rt_require_login($db);
        if ($u['kind'] !== 'child') rt_json(['error' => 'child only'], 403);
        rt_block_if_must_change($u);
        $cid = (int)$u['id'];
        if (rt_share_enabled($db, $cid)) rt_json(['ok' => true, 'already' => true]); // уже включено
        $gid = rt_primary_guardian($db, $cid);
        if (!$gid) rt_json(['error' => 'no_parent'], 409); // работает ТОЛЬКО при настоящем родителе
        $g = rt_account($db, $gid);
        if (!$g || empty($g['email'])) rt_json(['error' => 'no_parent'], 409);
        // кулдаун: не чаще одного письма в 10 минут от этого ребёнка (плюс общий лимит почты)
        $s = $db->prepare(
            "SELECT COUNT(*) AS n FROM events
             WHERE user_id = ? AND module = 'wishlist' AND type = 'share_request'
               AND created_at > DATE_SUB(NOW(), INTERVAL 10 MINUTE)"
        );
        $s->execute([$cid]);
        $r = $s->fetch();
        if ($r && (int)$r['n'] > 0) rt_json(['error' => 'too_often'], 429);
        $res = rt_mail_send_tpl((string)$g['email'], 'wishlist_share_request', rt_mail_lang($b), [
            'child' => $u['nickname'],
            'link'  => rt_app_url(''),
        ]);
        rt_log('wishlist', 'share_request', null, $u['nickname'], null, null, ['to_parent' => $gid]);
        // оповещение родителю (ГАЙД-оповещения.md): включение — в настройках, в карточке ребёнка
        rt_notify($gid, 'wishlist', 'share_request', ['child' => $u['nickname']], ['view' => 'settings'], $cid);
        rt_json(['ok' => !empty($res['ok']), 'sent' => !empty($res['ok'])]);
    }

    /* ---------------- ребёнок: поделиться с пользователем платформы ---------------- */
    case 'grant': {
        $u = rt_require_login($db);
        if ($u['kind'] !== 'child') rt_json(['error' => 'child only'], 403);
        rt_block_if_must_change($u);
        $cid = (int)$u['id'];
        if (!rt_share_enabled($db, $cid)) rt_json(['error' => 'share_disabled'], 403);
        $nick = isset($b['nickname']) ? trim((string)$b['nickname']) : '';
        if ($nick === '') rt_json(['error' => 'bad nickname'], 422);
        $target = rt_account_by_nickname($db, $nick);
        if (!$target || $target['status'] !== 'active') rt_json(['error' => 'user_not_found'], 404);
        if ((int)$target['id'] === $cid) rt_json(['error' => 'self_share'], 422);
        // потолок активных доступов — защита от случайного спама
        $s = $db->prepare("SELECT COUNT(*) AS n FROM wishlist_share_grants WHERE owner_user_id = ? AND revoked_at IS NULL");
        $s->execute([$cid]);
        $r = $s->fetch();
        if ($r && (int)$r['n'] >= 100) rt_json(['error' => 'too_many'], 422);
        $db->prepare(
            "INSERT INTO wishlist_share_grants (owner_user_id, grantee_user_id, created_at)
             VALUES (?, ?, NOW())
             ON DUPLICATE KEY UPDATE revoked_at = NULL"
        )->execute([$cid, (int)$target['id']]);
        rt_log('wishlist', 'share_grant', null, $target['nickname'], null, null, ['grantee' => (int)$target['id']]);
        // оповещение получателю доступа: ребёнку — в Виш-лист (👥), родителю — в настройки
        rt_notify((int)$target['id'], 'wishlist', 'share_grant', ['child' => $u['nickname']],
                  ($target['kind'] === 'child') ? ['module' => 'wishlist'] : ['view' => 'settings'], $cid);
        rt_json(['ok' => true, 'nickname' => $target['nickname']]);
    }

    /* ---------------- ребёнок: отозвать доступ ---------------- */
    case 'revoke': {
        $u = rt_require_login($db);
        if ($u['kind'] !== 'child') rt_json(['error' => 'child only'], 403);
        rt_block_if_must_change($u);
        $id = isset($b['id']) ? (int)$b['id'] : 0;
        $s = $db->prepare(
            "SELECT g.id, u.name AS nickname FROM wishlist_share_grants g JOIN users u ON u.id = g.grantee_user_id
             WHERE g.id = ? AND g.owner_user_id = ? AND g.revoked_at IS NULL LIMIT 1"
        );
        $s->execute([$id, (int)$u['id']]);
        $g = $s->fetch();
        if (!$g) rt_json(['error' => 'not found'], 404);
        $db->prepare("UPDATE wishlist_share_grants SET revoked_at = NOW() WHERE id = ?")->execute([$id]);
        rt_log('wishlist', 'share_revoke', null, $g['nickname']);
        rt_json(['ok' => true]);
    }

    /* ---------------- любой вошедший: поделились со мной ---------------- */
    case 'shared_with_me': {
        $u = rt_require_login($db);
        // только владельцы с ВКЛЮЧЁННЫМ флагом и активным аккаунтом (выключение прячет лист сразу)
        $s = $db->prepare(
            "SELECT u2.name AS nickname, UNIX_TIMESTAMP(g.created_at)*1000 AS since
             FROM wishlist_share_grants g
             JOIN users u2 ON u2.id = g.owner_user_id
             JOIN accounts a2 ON a2.user_id = g.owner_user_id
             JOIN wishlist_share_settings ws ON ws.child_user_id = g.owner_user_id AND ws.enabled = 1
             WHERE g.grantee_user_id = ? AND g.revoked_at IS NULL AND a2.status = 'active'
             ORDER BY g.id DESC LIMIT 200"
        );
        $s->execute([(int)$u['id']]);
        $lists = [];
        foreach ($s->fetchAll() as $r) {
            $lists[] = ['nickname' => $r['nickname'], 'since' => (int)$r['since'], 'url' => rt_share_url($r['nickname'])];
        }
        rt_json(['ok' => true, 'lists' => $lists]);
    }

    /* ---------------- родитель: состояние тумблера ребёнка ---------------- */
    case 'get': {
        $p = rt_require_parent($db);
        rt_block_if_must_change($p);
        $cid = isset($b['child_id']) ? (int)$b['child_id'] : 0;
        if (!$cid || !rt_can_read($db, (int)$p['id'], $cid)) rt_json(['error' => 'forbidden'], 403);
        $s = $db->prepare("SELECT COUNT(*) AS n FROM wishlist_share_grants WHERE owner_user_id = ? AND revoked_at IS NULL");
        $s->execute([$cid]);
        $r = $s->fetch();
        $nickRow = $db->prepare("SELECT name FROM users WHERE id = ? LIMIT 1");
        $nickRow->execute([$cid]);
        $nr = $nickRow->fetch();
        rt_json([
            'ok'        => true,
            'enabled'   => rt_share_enabled($db, $cid),
            'canToggle' => rt_share_parent_ok($db, (int)$p['id'], $cid),
            'grants'    => $r ? (int)$r['n'] : 0,
            'url'       => $nr ? rt_share_url($nr['name']) : null,
        ]);
    }

    /* ---------------- родитель: включить/выключить ---------------- */
    case 'set': {
        $p = rt_require_parent($db);
        rt_block_if_must_change($p);
        $cid = isset($b['child_id']) ? (int)$b['child_id'] : 0;
        $on  = !empty($b['enabled']) ? 1 : 0;
        if (!$cid) rt_json(['error' => 'bad child'], 422);
        $acc = rt_account($db, $cid);
        if (!$acc || $acc['kind'] !== 'child') rt_json(['error' => 'not a child'], 422);
        if (!rt_share_parent_ok($db, (int)$p['id'], $cid)) rt_json(['error' => 'forbidden'], 403); // provisional не включает
        $db->prepare(
            "INSERT INTO wishlist_share_settings (child_user_id, enabled, enabled_by, created_at, updated_at)
             VALUES (?, ?, ?, NOW(), NOW())
             ON DUPLICATE KEY UPDATE enabled = VALUES(enabled), enabled_by = VALUES(enabled_by), updated_at = NOW()"
        )->execute([$cid, $on, (int)$p['id']]);
        // событие — В ЖУРНАЛ РЕБЁНКА (прозрачность для второго родителя), кто включил — в meta
        $db->prepare(
            "INSERT INTO events (user_id, module, item_id, item_title, type, from_status, to_status, meta, created_at)
             VALUES (?, 'wishlist', NULL, ?, ?, NULL, NULL, ?, NOW())"
        )->execute([
            $cid, $acc['nickname'], $on ? 'share_enabled' : 'share_disabled',
            json_encode(['by' => (int)$p['id'], 'by_nick' => $p['nickname']], JSON_UNESCAPED_UNICODE),
        ]);
        rt_json(['ok' => true, 'enabled' => ($on === 1)]);
    }

    default:
        rt_json(['error' => 'unknown op'], 400);
}
