<?php
/**
 * POST /api/accounts/verify-password
 * Body: { "password": "..." }
 *
 * Повторная проверка пароля текущего авторизованного аккаунта для чувствительных
 * разделов. Пароль не хранится, не логируется, наружу отдаётся только общий результат.
 */

require __DIR__ . '/../_bootstrap.php';
rt_guard();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') rt_json(['ok' => false, 'error' => 'method'], 405);

$db = rt_db();
$u = rt_require_login($db);
$b = rt_body();
$pass = isset($b['password']) ? (string)$b['password'] : '';

if ($pass === '' || empty($u['password_hash']) || !password_verify($pass, (string)$u['password_hash'])) {
    rt_json(['ok' => false, 'error' => 'wrong_password']);
}

rt_json(['ok' => true]);
