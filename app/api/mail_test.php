<?php
/**
 * RobTop — тест отправки почты (только с admin_pin из config.php).
 *
 * Пример:
 *   https://apps.tilley.live/robtop/api/mail_test.php?pin=ВАШ_PIN&to=adres@example.com&lang=ru
 *
 * Параметры:
 *   pin  — admin_pin из config.php (обязателен; пустой admin_pin = тест запрещён);
 *   to   — куда отправить (валидный email);
 *   lang — язык письма: en | ru | lv (необязателен; фолбэк mail_default_lang → en).
 *
 * Ответ JSON: {"ok":true,"lang":"ru","driver":"brevo"} или {"ok":false,"error":"..."}.
 */
require __DIR__ . '/_bootstrap.php';

$pin = isset($_GET['pin']) ? (string)$_GET['pin'] : '';
if (!rt_admin_ok($pin)) rt_json(['error' => 'forbidden: нужен admin_pin из config.php'], 403);

$to   = isset($_GET['to']) ? trim((string)$_GET['to']) : '';
$lang = isset($_GET['lang']) ? strtolower(trim((string)$_GET['lang'])) : null;
if (!filter_var($to, FILTER_VALIDATE_EMAIL)) rt_json(['error' => 'нужен параметр to с валидным email'], 422);

$c = rt_config();
$driver = isset($c['mail_driver']) ? (string)$c['mail_driver'] : 'log';

$res = rt_mail_send_tpl($to, 'test', $lang, ['driver' => $driver]);
$res['driver'] = $driver;
rt_json($res);
