<?php
/**
 * RobTop — отправка Web Push (VAPID + зашифрованный payload). Канон — ГАЙД-оповещения.md, «Web Push».
 *
 * Пуш НЕСЁТ РЕАЛЬНЫЙ ТЕКСТ (с v2026.06.07.68): сервер рендерит сообщение на языке устройства
 * (_ntf_text.php, push_subs.lang) и шифрует его в payload по RFC 8291 (aes128gcm), sw.js
 * показывает «Копилка / Новое задание „Убрать комнату“ — +15 очков», тап открывает приложение.
 * Шифрование — чистый openssl (ECDH P-256 + HKDF + AES-128-GCM), без composer (Hostinger).
 * Алгоритм сверен с тест-вектором RFC 8291 Appendix A (round-trip-расшифровка вернула plaintext).
 * Если у подписки нет ключей p256dh/auth (редко) — фолбэк на «звонок» без payload, sw.js
 * покажет общий текст.
 *
 * Ключи VAPID (создаются один раз, живут ТОЛЬКО в config.php на сервере, НЕ в Git):
 *   'vapid' => [
 *     'subject'     => 'mailto:jeff@muncly.com',
 *     'private_pem' => "-----BEGIN EC PRIVATE KEY-----\n…\n-----END EC PRIVATE KEY-----",
 *   ]
 * Генерация: openssl ecparam -genkey -name prime256v1 -noout (см. РЕЛИЗ.md).
 * Публичный ключ выводится из приватного на лету (rt_push_pubkey). Нет ключей — тихий no-op.
 */

require_once __DIR__ . '/_ntf_text.php';

/** Конфиг VAPID или null (push выключен). */
function rt_push_cfg() {
    $c = rt_config();
    return (isset($c['vapid']) && is_array($c['vapid']) && !empty($c['vapid']['private_pem']))
        ? $c['vapid'] : null;
}

function rt_b64u($s) { return rtrim(strtr(base64_encode($s), '+/', '-_'), '='); }
function rt_b64u_dec($s) {
    $s = strtr((string)$s, '-_', '+/');
    $pad = strlen($s) % 4; if ($pad) $s .= str_repeat('=', 4 - $pad);
    return base64_decode($s);
}

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

/** Строка заголовка VAPID Authorization для endpoint (audience = origin). null — ошибка/не настроено. */
function rt_push_vapid_auth($endpoint) {
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
    return 'Authorization: vapid t=' . $data . '.' . rt_b64u($raw) . ', k=' . $pub;
}

/** Публичная точка p256dh (65 байт 0x04|x|y) → PEM SubjectPublicKeyInfo (P-256). */
function rt_push_ua_pubpem($raw65) {
    if (strlen($raw65) !== 65 || $raw65[0] !== "\x04") return null;
    // фиксированный DER-префикс SPKI для EC prime256v1 (uncompressed point)
    $der = "\x30\x59\x30\x13\x06\x07\x2a\x86\x48\xce\x3d\x02\x01\x06\x08\x2a\x86\x48\xce\x3d\x03\x01\x07\x03\x42\x00" . $raw65;
    return "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($der), 64, "\n") . "-----END PUBLIC KEY-----\n";
}

/**
 * Зашифровать payload по RFC 8291 (aes128gcm) для одной подписки. Возвращает [тело, заголовки]
 * или null (нет ключей / openssl без нужных функций). Алгоритм сверен с вектором RFC 8291 A.
 * Заголовки шифрования добавляются к VAPID-авторизации вызывающим.
 */
function rt_push_encrypt($plaintext, $p256dh_b64u, $auth_b64u) {
    if (!function_exists('openssl_pkey_derive') || !function_exists('hash_hkdf')) return null;
    $uaPub = rt_b64u_dec($p256dh_b64u);
    $auth  = rt_b64u_dec($auth_b64u);
    if (strlen($uaPub) !== 65 || strlen($auth) !== 16) return null;
    $uaPem = rt_push_ua_pubpem($uaPub); if (!$uaPem) return null;

    // эфемерная серверная пара P-256
    $eph = openssl_pkey_new(['private_key_type' => OPENSSL_KEYTYPE_EC, 'curve_name' => 'prime256v1']);
    if (!$eph) return null;
    $det = openssl_pkey_get_details($eph);
    if (empty($det['ec']['x']) || empty($det['ec']['y'])) return null;
    $asPub = "\x04" . str_pad($det['ec']['x'], 32, "\0", STR_PAD_LEFT) . str_pad($det['ec']['y'], 32, "\0", STR_PAD_LEFT);

    // ECDH общий секрет (X координата) + деривация по RFC 8291 / RFC 8188.
    // openssl изредка отдаёт секрет без левых нулей (<32 байт) — дополняем слева до 32.
    $ecdh = openssl_pkey_derive(openssl_pkey_get_public($uaPem), $eph, 32);
    if ($ecdh === false || strlen($ecdh) > 32) return null;
    $ecdh = str_pad($ecdh, 32, "\0", STR_PAD_LEFT);
    $keyInfo = "WebPush: info\x00" . $uaPub . $asPub;
    $ikm  = hash_hkdf('sha256', $ecdh, 32, $keyInfo, $auth);
    $salt = random_bytes(16);
    $cek   = hash_hkdf('sha256', $ikm, 16, "Content-Encoding: aes128gcm\x00", $salt);
    $nonce = hash_hkdf('sha256', $ikm, 12, "Content-Encoding: nonce\x00", $salt);

    // запись = plaintext || 0x02 (разделитель последней записи) → AES-128-GCM
    $tag = '';
    $ct = openssl_encrypt($plaintext . "\x02", 'aes-128-gcm', $cek, OPENSSL_RAW_DATA, $nonce, $tag, '', 16);
    if ($ct === false) return null;

    // тело aes128gcm (RFC 8188): salt(16) | rs(4=4096) | idlen(1=65) | as_public(65) | ciphertext||tag
    $body = $salt . pack('N', 4096) . chr(65) . $asPub . $ct . $tag;
    return [$body, [
        'Content-Encoding: aes128gcm',
        'Content-Type: application/octet-stream',
        'Content-Length: ' . strlen($body),
    ]];
}

/** Один HTTP-POST в push-сервис; true если подписку надо удалить (404/410). */
function rt_push_post($endpoint, $headers, $body) {
    $ch = curl_init($endpoint);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $body,
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 4,
        CURLOPT_CONNECTTIMEOUT => 2,
        CURLOPT_FOLLOWLOCATION => false, // SEC 2026-06-09 (SSRF): без редиректов
        CURLOPT_PROTOCOLS      => (defined('CURLPROTO_HTTPS') ? CURLPROTO_HTTPS : 2), // только https
    ]);
    curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ($code === 404 || $code === 410);
}

/**
 * Разослать оповещение всем push-подпискам пользователя. Текст рендерится на языке КАЖДОГО
 * устройства (push_subs.lang) и шифруется в payload (rt_push_encrypt) → плашка ОС несёт
 * реальное сообщение. Без ключей подписки — фолбэк «звонок» без тела. Никогда не кидает и не
 * ломает основную операцию; мёртвые подписки (404/410) удаляются. Зовётся из rt_notify().
 */
function rt_push_user($uid, $src = 'system', $type = '', $params = null) {
    try {
        if (!rt_push_cfg() || !function_exists('curl_init')) return;
        $db = rt_db();
        $s = $db->prepare("SELECT id, endpoint, p256dh, auth, lang FROM push_subs WHERE user_id = ?");
        $s->execute([(int)$uid]);
        $rows = $s->fetchAll();
        foreach ($rows as $r) {
            $auth = rt_push_vapid_auth($r['endpoint']);
            if (!$auth) continue;
            $headers = [$auth, 'TTL: 86400', 'Urgency: normal'];
            $body = '';

            // payload: реальный текст на языке устройства, зашифрованный для этой подписки
            if (!empty($r['p256dh']) && !empty($r['auth'])) {
                $msg = rt_ntf_render($src, $type, $params, !empty($r['lang']) ? $r['lang'] : 'en');
                $json = json_encode([
                    'title' => $msg['title'],
                    'body'  => $msg['body'],
                    'url'   => './',
                ], JSON_UNESCAPED_UNICODE);
                $enc = rt_push_encrypt($json, $r['p256dh'], $r['auth']);
                if ($enc) { $body = $enc[0]; $headers = array_merge($headers, $enc[1]); }
            }
            if ($body === '') $headers[] = 'Content-Length: 0'; // фолбэк «звонок»

            if (rt_push_post($r['endpoint'], $headers, $body)) {
                $db->prepare("DELETE FROM push_subs WHERE id = ?")->execute([(int)$r['id']]);
            }
        }
    } catch (Throwable $e) { /* пуш не важнее основной операции */ }
}
