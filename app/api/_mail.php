<?php
/**
 * RobTop — отправка писем (только родительские сценарии; у детей почты нет и письма им не шлются).
 *
 * Драйверы (config.php → mail_driver):
 *   'log'     — по умолчанию. Письма НЕ шлются: факт и ссылка пишутся в журнал events (прототип/отладка).
 *   'brevo'   — реальная отправка через HTTP API Brevo (curl, БЕЗ библиотек и Composer;
 *               бесплатного тарифа 300 писем/день семье хватает навсегда). Ключ — mail_brevo_key.
 *   'phpmail' — встроенная PHP mail() через почтовый сервер Hostinger (совсем без сервисов;
 *               письма чаще попадают в спам, держим как запасной).
 *   Неизвестный драйвер тихо работает как 'log' — ничего не падает.
 *
 * Шаблоны: api/mail/<имя>.<en|ru|lv>.html — простые HTML файлы с плейсхолдерами {{ключ}}.
 * РЕЕСТР всех писем (действие → файл, темы на 3 языках, плейсхолдеры): api/mail/registry.php.
 * Язык письма = язык приложения пользователя: клиент передаёт lang в запросе (rt_mail_lang),
 * фолбэк: mail_default_lang из config → 'en' → первый существующий файл.
 * Отправка немедленная, без очереди и cron: ошибка сразу возвращается вызывающему.
 */

function rt_app_url($path) {
    $c = rt_config();
    $base = isset($c['app_base_url']) ? rtrim($c['app_base_url'], '/') . '/' : '';
    return $base . $path;
}

/* ---------- язык ---------- */

function rt_mail_langs() { return ['en', 'ru', 'lv']; }

/** Язык из тела запроса клиента ($b['lang']); null, если не передан или неизвестен. */
function rt_mail_lang($body) {
    $l = (is_array($body) && isset($body['lang'])) ? strtolower(trim((string)$body['lang'])) : '';
    return in_array($l, rt_mail_langs(), true) ? $l : null;
}

/** Цепочка языков для поиска шаблона: запрошенный → mail_default_lang → en → остальные. */
function rt_mail_lang_chain($lang) {
    $c = rt_config();
    $def = isset($c['mail_default_lang']) ? strtolower((string)$c['mail_default_lang']) : 'en';
    $chain = [];
    foreach ([$lang, $def, 'en', 'ru', 'lv'] as $l) {
        if ($l && in_array($l, rt_mail_langs(), true) && !in_array($l, $chain, true)) $chain[] = $l;
    }
    return $chain;
}

/* ---------- шаблоны ---------- */

function rt_mail_registry() {
    static $reg = null;
    if ($reg === null) {
        $f = __DIR__ . '/mail/registry.php';
        $reg = is_file($f) ? require $f : [];
        if (!is_array($reg)) $reg = [];
    }
    return $reg;
}

/** Обернуть содержимое письма в общую рамку (_wrapper.html). */
function rt_mail_wrap($inner) {
    $wrapFile = __DIR__ . '/mail/_wrapper.html';
    $wrap = is_file($wrapFile) ? file_get_contents($wrapFile) : '{{content}}';
    return str_replace('{{content}}', $inner, $wrap);
}

/**
 * Рендер письма по реестру: действие + язык + данные → ['subject','html','lang'].
 * null, если действие неизвестно или нет ни одного файла шаблона.
 * {{link}} подставляется как есть, остальные значения экранируются.
 */
function rt_mail_render($action, $lang, $data) {
    $reg = rt_mail_registry();
    if (!isset($reg[$action])) return null;
    $tpl = $reg[$action];
    $file = ''; $used = '';
    foreach (rt_mail_lang_chain($lang) as $l) {
        $f = __DIR__ . '/mail/' . $tpl['file'] . '.' . $l . '.html';
        if (is_file($f)) { $file = $f; $used = $l; break; }
    }
    if ($file === '') return null;
    $subject = isset($tpl['subject'][$used]) ? $tpl['subject'][$used] : (string)reset($tpl['subject']);
    $html = file_get_contents($file);
    foreach ((array)$data as $k => $v) {
        $safe = ($k === 'link') ? (string)$v : htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8');
        $html = str_replace('{{' . $k . '}}', $safe, $html);
        $subject = str_replace('{{' . $k . '}}', (string)$v, $subject);
    }
    return ['subject' => $subject, 'html' => rt_mail_wrap($html), 'lang' => $used];
}

/* ---------- лимит частоты (защита от перебора) ---------- */

function rt_mail_rate_ok($to) {
    $c = rt_config();
    $limit = isset($c['mail_rate_per_hour']) ? (int)$c['mail_rate_per_hour'] : 5;
    if ($limit <= 0) return true;
    try {
        $st = rt_db()->prepare(
            "SELECT COUNT(*) AS n FROM events
             WHERE module = 'mail' AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR) AND meta LIKE ?"
        );
        $st->execute(['%' . json_encode((string)$to, JSON_UNESCAPED_UNICODE) . '%']);
        $r = $st->fetch();
        return !$r || (int)$r['n'] < $limit;
    } catch (Throwable $e) { return true; }
}

/* ---------- драйверы ---------- */

function rt_mail_via_brevo($c, $to, $subject, $html) {
    $key = isset($c['mail_brevo_key']) ? trim((string)$c['mail_brevo_key']) : '';
    if ($key === '') return ['ok' => false, 'error' => 'mail_brevo_key пуст в config.php'];
    $payload = json_encode([
        'sender'      => [
            'email' => isset($c['mail_from']) ? (string)$c['mail_from'] : 'noreply@localhost',
            'name'  => isset($c['mail_from_name']) ? (string)$c['mail_from_name'] : 'RobTop',
        ],
        'to'          => [['email' => (string)$to]],
        'subject'     => (string)$subject,
        'htmlContent' => (string)$html,
    ], JSON_UNESCAPED_UNICODE);
    $ch = curl_init('https://api.brevo.com/v3/smtp/email');
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_HTTPHEADER     => ['api-key: ' . $key, 'content-type: application/json', 'accept: application/json'],
        CURLOPT_POSTFIELDS     => $payload,
    ]);
    $resp = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $err  = curl_error($ch);
    curl_close($ch);
    if ($code >= 200 && $code < 300) return ['ok' => true];
    $detail = 'brevo http ' . $code;
    if ($err) $detail .= ' ' . $err;
    if (is_string($resp) && $resp !== '') $detail .= ' ' . substr($resp, 0, 180);
    return ['ok' => false, 'error' => $detail];
}

function rt_mail_via_phpmail($c, $to, $subject, $html) {
    $from = isset($c['mail_from']) ? (string)$c['mail_from'] : 'noreply@localhost';
    $name = isset($c['mail_from_name']) ? (string)$c['mail_from_name'] : 'RobTop';
    $encName = function_exists('mb_encode_mimeheader') ? mb_encode_mimeheader($name, 'UTF-8') : $name;
    $encSubj = function_exists('mb_encode_mimeheader') ? mb_encode_mimeheader((string)$subject, 'UTF-8') : (string)$subject;
    $headers = "MIME-Version: 1.0\r\n"
        . "Content-Type: text/html; charset=UTF-8\r\n"
        . "From: " . $encName . " <" . $from . ">\r\n";
    $ok = @mail((string)$to, $encSubj, (string)$html, $headers, '-f' . $from);
    return ['ok' => (bool)$ok, 'error' => $ok ? null : 'mail() вернула false'];
}

/** Отправить готовый HTML текущим драйвером. В режиме 'log' ничего не шлёт (log_only=true). */
function rt_mail_deliver($to, $subject, $html) {
    $c = rt_config();
    $driver = isset($c['mail_driver']) ? (string)$c['mail_driver'] : 'log';
    if ($driver === 'brevo')   return rt_mail_via_brevo($c, $to, $subject, $html);
    if ($driver === 'phpmail') return rt_mail_via_phpmail($c, $to, $subject, $html);
    return ['ok' => true, 'log_only' => true];
}

/* ---------- публичные функции ---------- */

/**
 * Письмо по шаблону из реестра (api/mail/registry.php).
 * $lang — 'en'|'ru'|'lv'|null (язык приложения пользователя, обычно rt_mail_lang($b)).
 * $data — плейсхолдеры шаблона, например ['link' => ..., 'inviter' => ...].
 * Возвращает ['ok'=>bool, 'lang'=>использованный язык] или ['ok'=>false,'error'=>...].
 */
function rt_mail_send_tpl($to, $action, $lang, $data = []) {
    $r = rt_mail_render($action, $lang, $data);
    if ($r === null) return ['ok' => false, 'error' => 'неизвестное письмо: ' . $action];
    if (!rt_mail_rate_ok($to)) return ['ok' => false, 'error' => 'rate limit: слишком много писем этому адресу'];
    $c = rt_config();
    $driver = isset($c['mail_driver']) ? (string)$c['mail_driver'] : 'log';
    $res = rt_mail_deliver($to, $r['subject'], $r['html']);
    $logOnly = !empty($res['log_only']);
    try {
        rt_log('mail', !empty($res['ok']) ? ($logOnly ? 'queued' : 'sent') : 'failed',
            null, substr($r['subject'], 0, 160), null, null, [
                'to'     => $to,
                'action' => $action,
                'lang'   => $r['lang'],
                'driver' => $driver,
                'link'   => ($logOnly && isset($data['link'])) ? $data['link'] : null,
                'error'  => isset($res['error']) ? $res['error'] : null,
            ]);
    } catch (Throwable $e) {}
    $out = ['ok' => !empty($res['ok']), 'lang' => $r['lang']];
    if (!$out['ok'] && isset($res['error'])) $out['error'] = $res['error'];
    return $out;
}

/**
 * СОВМЕСТИМОСТЬ со старыми вызовами (accounts.php): тема + короткий текст + ссылка.
 * В режиме 'log' — как раньше, только журнал. В реальных драйверах собирает простое
 * письмо в общей рамке: заголовок, текст, кнопка по ссылке.
 * Новому коду лучше звать rt_mail_send_tpl (шаблоны + языки).
 */
function rt_mail_send($to, $subject, $body, $linkForLog = null) {
    $c = rt_config();
    $driver = isset($c['mail_driver']) ? (string)$c['mail_driver'] : 'log';
    if (!rt_mail_rate_ok($to)) return false;

    if ($driver === 'brevo' || $driver === 'phpmail') {
        $inner = '<h2 style="margin:0 0 12px;font-size:20px;color:#1c2230">'
            . htmlspecialchars((string)$subject, ENT_QUOTES, 'UTF-8') . '</h2>'
            . '<p style="margin:0 0 10px;font-size:14px;line-height:1.55;color:#3a4358">'
            . htmlspecialchars((string)$body, ENT_QUOTES, 'UTF-8') . '</p>';
        if ($linkForLog) {
            $inner .= '<p style="text-align:center;margin:22px 0"><a href="' . $linkForLog . '" '
                . 'style="display:inline-block;background:#5b2ea6;color:#ffffff;text-decoration:none;'
                . 'font-weight:bold;font-size:15px;padding:13px 28px;border-radius:12px">RobTop</a></p>'
                . '<p style="margin:0;font-size:12px;color:#8a93a6;word-break:break-all">'
                . htmlspecialchars((string)$linkForLog, ENT_QUOTES, 'UTF-8') . '</p>';
        }
        $res = rt_mail_deliver($to, $subject, rt_mail_wrap($inner));
        try {
            rt_log('mail', !empty($res['ok']) ? 'sent' : 'failed', null, substr((string)$subject, 0, 160), null, null, [
                'to' => $to, 'driver' => $driver,
                'error' => isset($res['error']) ? $res['error'] : null,
            ]);
        } catch (Throwable $e) {}
        return !empty($res['ok']);
    }

    // Режим журнала: фиксируем факт на сервере, ссылку в ответ API НЕ кладём.
    try {
        rt_log('mail', 'queued', null, substr((string)$subject, 0, 160), null, null, [
            'to' => $to, 'link' => $linkForLog, 'driver' => $driver,
        ]);
    } catch (Throwable $e) {}
    return true;
}
