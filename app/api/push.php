<?php
/**
 * POST /api/push.php — подписки Web Push (PWA). Канон — ГАЙД-оповещения.md, «Web Push».
 * Тело: { "op": "...", ... }. Гейт: живая сессия (rt_require_login).
 *
 * Опы:
 *   key                      — публичный VAPID-ключ ({key:null} = push на сервере не настроен)
 *   subscribe {endpoint, keys{p256dh,auth}?, lang?} — сохранить подписку устройства;
 *       endpoint уникален глобально: повторная подписка с другого аккаунта на том же
 *       устройстве переподвязывает её на этот аккаунт (семейный планшет)
 *   unsubscribe {endpoint}   — удалить подписку
 *   status {endpoint}        — {mine:true|false}: записан ли endpoint за ТЕКУЩИМ аккаунтом
 *
 * Рассылку делает rt_push_user() (_push.php) из rt_notify() — здесь только учёт подписок.
 */

require __DIR__ . '/_bootstrap.php';
rt_guard();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') rt_json(['error' => 'method'], 405);

$db  = rt_db();
$me  = rt_require_login($db);
$UID = (int)$me['id'];

$b  = rt_body();
$op = isset($b['op']) ? (string)$b['op'] : '';

/** endpoint из тела: https, разумная длина; иначе 422. */
function rt_push_endpoint($b) {
    $e = isset($b['endpoint']) ? trim((string)$b['endpoint']) : '';
    if ($e === '' || strlen($e) > 500 || strpos($e, 'https://') !== 0) rt_json(['error' => 'bad endpoint'], 422);
    return $e;
}

switch ($op) {

    case 'key': {
        rt_json(['ok' => true, 'key' => rt_push_pubkey()]);
    }

    case 'subscribe': {
        $e    = rt_push_endpoint($b);
        $keys = (isset($b['keys']) && is_array($b['keys'])) ? $b['keys'] : [];
        $p256 = isset($keys['p256dh']) ? mb_substr((string)$keys['p256dh'], 0, 120) : null;
        $auth = isset($keys['auth'])   ? mb_substr((string)$keys['auth'], 0, 40)    : null;
        $lang = isset($b['lang']) && preg_match('/^[a-z]{2}$/', (string)$b['lang']) ? (string)$b['lang'] : 'en';
        $db->prepare(
            "INSERT INTO push_subs (user_id, endpoint, endpoint_hash, p256dh, auth, lang, created_at)
             VALUES (?, ?, ?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), endpoint = VALUES(endpoint),
               p256dh = VALUES(p256dh), auth = VALUES(auth), lang = VALUES(lang), updated_at = NOW()"
        )->execute([$UID, $e, hash('sha256', $e), $p256, $auth, $lang]);
        rt_json(['ok' => true]);
    }

    case 'unsubscribe': {
        $e = rt_push_endpoint($b);
        $db->prepare("DELETE FROM push_subs WHERE endpoint_hash = ?")->execute([hash('sha256', $e)]);
        rt_json(['ok' => true]);
    }

    case 'status': {
        $e = rt_push_endpoint($b);
        $s = $db->prepare("SELECT user_id FROM push_subs WHERE endpoint_hash = ? LIMIT 1");
        $s->execute([hash('sha256', $e)]);
        $r = $s->fetch();
        rt_json(['ok' => true, 'mine' => ($r && (int)$r['user_id'] === $UID)]);
    }

    default:
        rt_json(['error' => 'unknown op'], 400);
}
