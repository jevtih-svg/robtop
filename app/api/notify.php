<?php
/**
 * POST /api/notify.php — система оповещений (ядро; клиент core/notify.js, канон — ГАЙД-оповещения.md).
 * Тело: { "op": "...", ... }.
 *
 * Опы (живая сессия обязательна, КРОМЕ peek):
 *   list {before?}   — мои оповещения, свежие сверху, по 50 (before=<id> — страница старее)
 *   read {id}        — отметить одно прочитанным
 *   read_all         — отметить все прочитанными
 *   send {to, src, type, params?, link?, child?} — отправка от модуля (sdk.notify.send):
 *        to: "parents" — родители: для ребёнка его опекуны + родители семьи, для родителя
 *            со-родители семьи; "child" — родитель → ребёнок (child=<id> с проверкой прав,
 *            без него первый ребёнок семьи); "family" — все активные члены семьи кроме меня.
 *        Себе оповещение не пишется; антиспам 30 отправок в час → 429.
 *   peek {tokens:[…]} — БЕЗ сессии (lock-экран): по switch-токенам устройства вернуть число
 *        непрочитанных каждого аккаунта (бейджи в переключателе). Токен и есть секрет —
 *        та же модель доверия, что op switch в accounts.php; содержимое не отдаётся.
 *
 * Серверные источники пишут НАПРЯМУЮ через rt_notify() (_bootstrap.php): тикеты (admin.php
 * ticket_reply/ticket_close), шаринг виш-листа (share.php request/grant). Текст оповещения
 * здесь не хранится — только src/type/params/link, локализует клиент.
 */

require __DIR__ . '/_bootstrap.php';
rt_guard();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') rt_json(['error' => 'method'], 405);

$db = rt_db();
$b  = rt_body();
$op = isset($b['op']) ? (string)$b['op'] : '';

/* ---- peek: ДО rt_require_login — работает с lock-экрана без сессии ---- */
if ($op === 'peek') {
    $toks = (isset($b['tokens']) && is_array($b['tokens'])) ? array_slice($b['tokens'], 0, 10) : [];
    $out = [];
    foreach ($toks as $tok) {
        $row = rt_switch_token_row($db, is_string($tok) ? $tok : '');
        if (!$row) continue;
        $acc = rt_account($db, (int)$row['user_id']);
        if (!$acc || $acc['status'] !== 'active') continue;
        try {
            $s = $db->prepare("SELECT COUNT(*) FROM notifications WHERE user_id = ? AND read_at IS NULL");
            $s->execute([(int)$row['user_id']]);
            $out[] = ['user' => (int)$row['user_id'], 'unread' => (int)$s->fetchColumn()];
        } catch (Throwable $e) { /* таблицы может не быть до миграции 020 */ }
    }
    rt_json(['ok' => true, 'accounts' => $out]);
}

$me  = rt_require_login($db);
$UID = (int)$me['id'];

switch ($op) {

    case 'list': {
        $before = isset($b['before']) ? (int)$b['before'] : 0;
        $sql = "SELECT id, src, type, params, link, actor_id, read_at,
                       UNIX_TIMESTAMP(created_at)*1000 AS createdAt
                FROM notifications WHERE user_id = ?" . ($before > 0 ? " AND id < ?" : "")
             . " ORDER BY id DESC LIMIT 50";
        $s = $db->prepare($sql);
        $s->execute($before > 0 ? [$UID, $before] : [$UID]);
        $items = [];
        foreach ($s->fetchAll() as $r) {
            $params = $r['params'] !== null ? json_decode($r['params'], true) : null;
            if (!is_array($params)) $params = null;
            if ($r['src'] === 'find' && $r['type'] === 'pending' && $params && !empty($params['subId']) && !empty($r['actor_id'])) {
                try {
                    $q = $db->prepare(
                        "SELECT JSON_UNQUOTE(JSON_EXTRACT(data, '$.st')) AS st
                           FROM module_data
                          WHERE id=? AND user_id=? AND module='find' AND collection='subs' AND deleted_at IS NULL
                          LIMIT 1"
                    );
                    $q->execute([(int)$params['subId'], (int)$r['actor_id']]);
                    $params['reviewPending'] = ($q->fetchColumn() === 'pending') ? 1 : 0;
                } catch (Throwable $e) { $params['reviewPending'] = 0; }
            }
            $items[] = [
                'id'        => (int)$r['id'],
                'src'       => $r['src'],
                'type'      => $r['type'],
                'params'    => $params,
                'link'      => $r['link'] !== null ? json_decode($r['link'], true) : null,
                'read'      => $r['read_at'] !== null,
                'createdAt' => (int)$r['createdAt'],
            ];
        }
        rt_json(['ok' => true, 'items' => $items]);
    }

    case 'read': {
        $id = isset($b['id']) ? (int)$b['id'] : 0;
        if ($id <= 0) rt_json(['error' => 'id required'], 422);
        $db->prepare("UPDATE notifications SET read_at = NOW() WHERE id = ? AND user_id = ? AND read_at IS NULL")
           ->execute([$id, $UID]);
        rt_json(['ok' => true]);
    }

    case 'read_all': {
        $db->prepare("UPDATE notifications SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL")
           ->execute([$UID]);
        rt_json(['ok' => true]);
    }

    case 'send': {
        $src  = isset($b['src'])  ? (string)$b['src']  : 'system';
        $type = isset($b['type']) ? (string)$b['type'] : '';
        $to   = isset($b['to'])   ? (string)$b['to']   : 'parents';
        if (!preg_match('/^[a-z0-9_-]{2,40}$/', $src))  rt_json(['error' => 'bad src'], 422);
        if (!preg_match('/^[a-z0-9_]{2,40}$/', $type))  rt_json(['error' => 'bad type'], 422);

        $params = (isset($b['params']) && is_array($b['params'])) ? $b['params'] : null;
        if ($params !== null && strlen(json_encode($params, JSON_UNESCAPED_UNICODE)) > 1000) {
            rt_json(['error' => 'params too big'], 422);
        }
        // ссылка перехода: только известные формы (см. ГАЙД-оповещения.md)
        $link = null;
        if (isset($b['link']) && is_array($b['link'])) {
            $l = $b['link'];
            if (isset($l['module']) && preg_match('/^[a-z0-9_-]{2,40}$/', (string)$l['module'])) {
                $link = ['module' => (string)$l['module']];
                if (isset($l['item']) && $l['item'] !== null && $l['item'] !== '') {
                    $link['item'] = mb_substr((string)$l['item'], 0, 40);
                }
            } elseif (isset($l['view']) && in_array((string)$l['view'], ['settings', 'ticket', 'shared'], true)) {
                $link = ['view' => (string)$l['view']];
                if (isset($l['id'])) $link['id'] = (int)$l['id'];
            }
        }

        // антиспам: не больше 30 отправок за час с аккаунта
        try {
            $s = $db->prepare("SELECT COUNT(*) FROM notifications WHERE actor_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)");
            $s->execute([$UID]);
            if ((int)$s->fetchColumn() >= 30) rt_json(['error' => 'too many'], 429);
        } catch (Throwable $e) {}

        $targets = [];
        if ($to === 'parents') {
            if ($me['kind'] === 'child') {
                $targets = rt_child_parents($db, $UID);
            } else {
                // со-родители моей семьи (исключение себя — ниже, общим фильтром)
                try {
                    $s = $db->prepare(
                        "SELECT fm2.user_id AS id
                         FROM family_members fm1
                         JOIN family_members fm2 ON fm1.family_id = fm2.family_id
                         WHERE fm1.user_id = ? AND fm1.status = 'active'
                           AND fm2.role IN ('owner','parent') AND fm2.status = 'active'"
                    );
                    $s->execute([$UID]);
                    foreach ($s->fetchAll() as $r) $targets[] = (int)$r['id'];
                } catch (Throwable $e) {}
            }
        } elseif ($to === 'child') {
            if ($me['kind'] !== 'parent') rt_json(['error' => 'parent only'], 403);
            $cid = isset($b['child']) ? (int)$b['child'] : 0;
            if ($cid > 0) {
                if (!rt_can_manage_child($db, $UID, $cid)) rt_json(['error' => 'forbidden child'], 403);
            } else {
                $cid = (int)rt_family_child_uid($db, $UID);
            }
            if (!$cid) rt_json(['error' => 'no child'], 422);
            $targets = [$cid];
        } elseif ($to === 'family') {
            try {
                $fid = rt_user_family_id($db, $UID);
                if ($fid) {
                    $s = $db->prepare("SELECT user_id FROM family_members WHERE family_id = ? AND status = 'active'");
                    $s->execute([$fid]);
                    foreach ($s->fetchAll() as $r) $targets[] = (int)$r['user_id'];
                }
            } catch (Throwable $e) {}
            if (!$targets) { // вне семьи: опекунские связи в обе стороны
                $targets = ($me['kind'] === 'child')
                    ? rt_child_parents($db, $UID)
                    : rt_family_children_uids($db, $UID);
            }
        } else {
            rt_json(['error' => 'bad to'], 422);
        }

        $sent = 0;
        foreach (array_unique(array_map('intval', $targets)) as $tid) {
            if ($tid === $UID) continue; // себе не шлём
            if (rt_notify($tid, $src, $type, $params, $link, $UID)) $sent++;
        }
        rt_json(['ok' => true, 'sent' => $sent]);
    }

    default:
        rt_json(['error' => 'unknown op'], 400);
}
