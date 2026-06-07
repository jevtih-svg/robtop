<?php
/**
 * POST /api/tickets.php — обращения «Сообщить о проблеме» (пользовательская сторона).
 * Тело: { "op": "...", ... }. Ответ админа пользователь читает здесь же (Настройки → Помощь).
 *
 * Гейт: ТОЛЬКО живая сессия (rt_require_login) — и дети, и родители. Никакого rt_user_id():
 * у того фолбэк на id 1, аноним писал бы от имени Артёма. Демо-режим не поддерживается
 * (клиент прячет кнопки в демо).
 *
 * Опы:
 *   create {text, source?}  — новое обращение (+первое сообщение); лимит 5 за час → 429
 *   list                    — мои обращения (свежие сверху)
 *   view {id}               — обращение + вся переписка; снимает user_unread
 *   reply {id, text}        — мой ответ; закрытый тикет переоткрывается
 *   close {id}              — «проблема решена» от автора
 *
 * Безопасность: пользователь видит и трогает ТОЛЬКО свои тикеты (WHERE user_id = me).
 * Сторона админа — в api/admin.php (op tickets/ticket_view/ticket_reply/ticket_close/ticket_reopen).
 */

require __DIR__ . '/_bootstrap.php';
rt_guard();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') rt_json(['error' => 'method'], 405);

$db = rt_db();
$me = rt_require_login($db);
$UID = (int)$me['id'];

$b  = rt_body();
$op = isset($b['op']) ? (string)$b['op'] : '';

/** Текст сообщения: trim, длина 3..2000, иначе 422. */
function tk_text($b) {
    $t = isset($b['text']) ? trim((string)$b['text']) : '';
    if (mb_strlen($t) < 3) rt_json(['error' => 'text too short'], 422);
    return mb_substr($t, 0, 2000);
}
/** Мой тикет по id или 404 (чужие не раскрываем — тот же 404). */
function tk_mine($db, $id, $uid) {
    $s = $db->prepare("SELECT * FROM tickets WHERE id = ? AND user_id = ? LIMIT 1");
    $s->execute([(int)$id, $uid]);
    $r = $s->fetch();
    if (!$r) rt_json(['error' => 'not found'], 404);
    return $r;
}

switch ($op) {

    case 'create': {
        $text = tk_text($b);
        // источник: settings (по умолчанию) или module:<id> — кнопка под «Добавить фото»
        $source = isset($b['source']) ? (string)$b['source'] : 'settings';
        if (!preg_match('/^(settings|module:[a-z0-9_-]{2,40})$/', $source)) $source = 'settings';
        // антиспам: не больше 5 обращений за час с пользователя
        $n = $db->prepare("SELECT COUNT(*) n FROM tickets WHERE user_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)");
        $n->execute([$UID]);
        if ((int)$n->fetch()['n'] >= 5) rt_json(['error' => 'too many'], 429);
        $subject = mb_substr($text, 0, 60);
        $db->prepare("INSERT INTO tickets (user_id, subject, source) VALUES (?, ?, ?)")
           ->execute([$UID, $subject, $source]);
        $id = (int)$db->lastInsertId();
        $db->prepare("INSERT INTO ticket_messages (ticket_id, author_id, is_admin, body) VALUES (?, ?, 0, ?)")
           ->execute([$id, $UID, $text]);
        rt_log('tickets', 'ticket_created', $id, $subject, null, null, ['source' => $source]);
        rt_json(['ok' => true, 'id' => $id]);
    }

    case 'list': {
        $rows = [];
        $s = $db->prepare("SELECT t.id, t.subject, t.status, t.user_unread, t.created_at, t.updated_at,
                                  (SELECT COUNT(*) FROM ticket_messages m WHERE m.ticket_id = t.id) AS msgs
                           FROM tickets t WHERE t.user_id = ? ORDER BY t.updated_at DESC, t.id DESC LIMIT 100");
        $s->execute([$UID]);
        foreach ($s->fetchAll() as $r) {
            $rows[] = ['id' => (int)$r['id'], 'subject' => $r['subject'], 'status' => $r['status'],
                       'unread' => (int)$r['user_unread'] === 1, 'msgs' => (int)$r['msgs'],
                       'created' => $r['created_at'], 'updated' => $r['updated_at']];
        }
        rt_json(['ok' => true, 'tickets' => $rows]);
    }

    case 'view': {
        $tk = tk_mine($db, (int)($b['id'] ?? 0), $UID);
        if ((int)$tk['user_unread'] === 1) {
            $db->prepare("UPDATE tickets SET user_unread = 0 WHERE id = ?")->execute([(int)$tk['id']]);
        }
        $msgs = [];
        $s = $db->prepare("SELECT id, is_admin, body, created_at FROM ticket_messages WHERE ticket_id = ? ORDER BY id");
        $s->execute([(int)$tk['id']]);
        foreach ($s->fetchAll() as $m) {
            $msgs[] = ['id' => (int)$m['id'], 'admin' => (int)$m['is_admin'] === 1,
                       'body' => $m['body'], 'created' => $m['created_at']];
        }
        rt_json(['ok' => true, 'ticket' => ['id' => (int)$tk['id'], 'subject' => $tk['subject'],
                 'status' => $tk['status'], 'created' => $tk['created_at']], 'messages' => $msgs]);
    }

    case 'reply': {
        $tk = tk_mine($db, (int)($b['id'] ?? 0), $UID);
        $text = tk_text($b);
        $db->prepare("INSERT INTO ticket_messages (ticket_id, author_id, is_admin, body) VALUES (?, ?, 0, ?)")
           ->execute([(int)$tk['id'], $UID, $text]);
        // ответ автора: тикет снова «open» (если был закрыт), у админа загорается «новое»
        $db->prepare("UPDATE tickets SET status = 'open', closed_at = NULL, admin_unread = 1, updated_at = NOW() WHERE id = ?")
           ->execute([(int)$tk['id']]);
        rt_log('tickets', 'ticket_replied', (int)$tk['id'], $tk['subject']);
        rt_json(['ok' => true]);
    }

    case 'close': {
        $tk = tk_mine($db, (int)($b['id'] ?? 0), $UID);
        $db->prepare("UPDATE tickets SET status = 'closed', closed_at = NOW(), updated_at = NOW(), user_unread = 0 WHERE id = ?")
           ->execute([(int)$tk['id']]);
        rt_log('tickets', 'ticket_closed', (int)$tk['id'], $tk['subject'], null, null, ['by' => 'user']);
        rt_json(['ok' => true]);
    }

    default:
        rt_json(['error' => 'unknown op'], 400);
}
