<?php
/**
 * RobTop — отправка Web Push (VAPID, БЕЗ payload). Канон — ГАЙД-оповещения.md, «Web Push».
 *
 * Пуш — только «звонок»: содержимое не передаётся, sw.js показывает общий локализованный
 * текст, по тапу открывается приложение (центр оповещений). Без payload не нужна
 * aes128gcm-криптография — достаточно VAPID-подписи ES256 на чистом openssl, поэтому
 * никаких composer-зависимостей (shared-хостинг Hostinger).
 *
 * Ключи (создаются один раз, живут ТОЛЬКО в config.php на сервере, НЕ в Git):
 *   'vapid' => [
 *     'subject'     => 'mailto:jeff@muncly.com',
 *     'private_pem' => "-----BEGIN EC PRIVATE KEY-----\n…\n-----END EC PRIVATE KEY-----",
 *   ]
 * Генерация: openssl ecparam -genkey -name prime256v1 -noout (см. РЕЛИЗ.md).
 * Публичный ключ выводится из приватного на лету (rt_push_pubkey). Нет ключей — тихий no-op.
 */

/** Конфиг VAPID или null (push выключен). */
function rt_push_cfg() {
    $c = rt_config();
    return (isset($c['vapid']) && is_array($c['vapid']) && !empty($c['vapid']['private_pem']))
        ? $c['vapid'] : null;
}

function rt_b64u($s) { return rtrim(strtr(base64_encode($s), '+/', '-_'), '='); }

/** Публичный VAPID-ключ (base64url, 65 байт 0x04|x|y) из приватного PEM. null при ошибке. */
function rt_push_pubkey() {
    $v = rt_push_cfg(); if (!$v) return null;
    try {
        $k = openssl_pkey_get_private($v['private_pem']); if (!$k) return null;
        $d = openssl_pkey_get_details($k);
        if (empty($d['ec']['x']) || empty($d['ec']['y'])) return null;
        $x = str_pad($d['ec']['x'], 32, "\0", STR_PAD_LEFT);
        $y = str_pad($d['ec']['y'], 32, "\0", STR_PAD_LEFT);
        return rt_b64u("\x04" . $x . $y);
    } catch (Throwable $e) { return null; }
}

/** DER-подпись ECDSA (openssl_sign) → сырые r||s по 32 байта (формат JWT ES256). */
function rt_push_der2raw($der) {
    if (!is_string($der) || strlen($der) < 8 || ord($der[0]) !== 0x30) return null;
    $i = 1; $l = ord($der[$i]); $i++;
    if ($l & 0x80) $i += ($l & 0x7f);          // длинная форма длины SEQUENCE
    if (ord($der[$i]) !== 0x02) return null;   // INTEGER r
    $i++; $rl = ord($der[$i]); $i++;
    $r = substr($der, $i, $rl); $i += $rl;
    if (ord($der[$i]) !== 0x02) return null;   // INTEGER s
    $i++; $sl = ord($der[$i]); $i++;
    $s = substr($der, $i, $sl);
    $r = ltrim($r, "\0"); $s = ltrim($s, "\0");
    if (strlen($r) > 32 || strlen($s) > 32) return null;
    return str_pad($r, 32, "\0", STR_PAD_LEFT) . str_pad($s, 32, "\0", STR_PAD_LEFT);
}

/** Заголовки VAPID-авторизации для endpoint. null — push не настроен/ошибка подписи. */
function rt_push_vapid_headers($endpoint) {
    $v = rt_push_cfg(); if (!$v) return null;
    $u = parse_url((string)$endpoint);
    if (empty($u['scheme']) || empty($u['host']) || $u['scheme'] !== 'https') return null;
    $aud = $u['scheme'] . '://' . $u['host'];
    $hdr = rt_b64u(json_encode(['typ' => 'JWT', 'alg' => 'ES256']));
    $pld = rt_b64u(json_encode([
        'aud' => $aud,
        'exp' => time() + 43200,
        'sub' => isset($v['subject']) ? (string)$v['subject'] : 'mailto:admin@tilley.live',
    ]));
    $data = $hdr . '.' . $pld;
    $sig = '';
    if (!openssl_sign($data, $sig, $v['private_pem'], OPENSSL_ALGO_SHA256)) return null;
    $raw = rt_push_der2raw($sig); if (!$raw) return null;
    $pub = rt_push_pubkey(); if (!$pub) return null;
    return [
        'Authorization: vapid t=' . $data . '.' . rt_b64u($raw) . ', k=' . $pub,
        'TTL: 86400',
        'Urgency: normal',
        'Content-Length: 0',
    ];
}

/**
 * Разослать «звонок» всем push-подпискам пользователя. Никогда не кидает и не ломает
 * основную операцию; мёртвые подписки (404/410 от push-сервиса) удаляются на месте.
 * Зовётся из rt_notify() после записи оповещения.
 */
function rt_push_user($uid) {
    try {
        if (!rt_push_cfg() || !function_exists('curl_init')) return;
        $db = rt_db();
        $s = $db->prepare("SELECT id, endpoint FROM push_subs WHERE user_id = ?");
        $s->execute([(int)$uid]);
        $rows = $s->fetchAll();
        foreach ($rows as $r) {
            $h = rt_push_vapid_headers($r['endpoint']);
            if (!$h) continue;
            $ch = curl_init($r['endpoint']);
            curl_setopt_array($ch, [
                CURLOPT_POST           => true,
                CURLOPT_POSTFIELDS     => '',
                CURLOPT_HTTPHEADER     => $h,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT        => 3,
                CURLOPT_CONNECTTIMEOUT => 2,
            ]);
            curl_exec($ch);
            $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            if ($code === 404 || $code === 410) {
                $db->prepare("DELETE FROM push_subs WHERE id = ?")->execute([(int)$r['id']]);
            }
        }
    } catch (Throwable $e) { /* пуш не важнее основной операции */ }
}
