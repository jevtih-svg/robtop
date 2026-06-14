<?php
/**
 * RobTop — тест отправки почты (только мастер-админ; PIN упразднён 2026-06-07).
 *
 * Использование: войти в приложение аккаунтом родителя-админа (таблица admins),
 * затем В ТОМ ЖЕ браузере открыть:
 *   https://apps.tilley.live/robtop/api/mail_test.php?to=adres@example.com&lang=ru
 *
 * Параметры:
 *   to   — куда отправить (валидный email);
 *   lang — язык письма: en | ru | lv | de (необязателен; фолбэк mail_default_lang → en).
 *
 * Ответ JSON: {"ok":true,"lang":"ru","driver":"brevo"} или {"ok":false,"error":"..."}.
 */
require __DIR__ . '/_bootstrap.php';

rt_guard();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') rt_json(['error' => 'method'], 405);
rt_require_admin(rt_db()); // активная родительская сессия + флаг в admins; иначе 401/403

$b = rt_body();
$to   = isset($b['to']) ? trim((string)$b['to']) : '';
$lang = isset($b['lang']) ? strtolower(trim((string)$b['lang'])) : null;
if (!filter_var($to, FILTER_VALIDATE_EMAIL)) rt_json(['error' => 'нужен параметр to с валидным email'], 422);

$c = rt_config();
$driver = isset($c['mail_driver']) ? (string)$c['mail_driver'] : 'log';

$res = rt_mail_send_tpl($to, 'test', $lang, ['driver' => $driver]);
$res['driver'] = $driver;
rt_json($res);
