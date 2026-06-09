<?php
/**
 * RobTop — троттлинг авторизационных эндпоинтов (защита от перебора паролей, кодов сброса
 * и токенов приглашений). Считает НЕУДАЧНЫЕ попытки по ключу (scope,value); после порога —
 * растущая временная блокировка. Всё в try/catch: если таблицы ещё нет (миграция 030 не
 * применена) — троттлинг просто выключен, а API не падает.
 *
 * Подключается из _bootstrap.php. Использует rt_json() (из _bootstrap) и rt_db().
 */

/** IP вызывающего. REMOTE_ADDR (реальный TCP-пир, НЕ подделывается клиентом) — нарочно не
 *  X-Forwarded-For, чтобы перебор нельзя было обойти ротацией заголовка. */
function rt_throttle_ip() {
    $ip = isset($_SERVER['REMOTE_ADDR']) ? (string)$_SERVER['REMOTE_ADDR'] : '';
    return $ip !== '' ? $ip : 'unknown';
}

function rt_throttle_key($scope, $value) {
    return hash('sha256', $scope . '|' . strtolower(trim((string)$value)));
}

/** Если (scope,value) сейчас под блокировкой — отвечает 429 и завершает запрос. Иначе ничего. */
function rt_throttle_check($db, $scope, $value) {
    try {
        $s = $db->prepare("SELECT locked_until FROM auth_attempts WHERE scope = ? AND key_hash = ? LIMIT 1");
        $s->execute([$scope, rt_throttle_key($scope, $value)]);
        $r = $s->fetch();
        if ($r && $r['locked_until'] !== null && strtotime($r['locked_until']) > time()) {
            rt_json(['error' => 'too_many_attempts', 'retry_after' => strtotime($r['locked_until']) - time()], 429);
        }
    } catch (Throwable $e) { /* нет таблицы (миграция 030 не применена) — троттлинг выключен */ }
}

/** Зафиксировать неудачу. Порог 5 подряд → блок 1 мин, далее ×2 (2,4,8,…), кап 60 минут. */
function rt_throttle_fail($db, $scope, $value) {
    try {
        $key = rt_throttle_key($scope, $value);
        $db->prepare(
            "INSERT INTO auth_attempts (scope, key_hash, fails, first_at, last_at)
             VALUES (?, ?, 1, NOW(), NOW())
             ON DUPLICATE KEY UPDATE fails = fails + 1, last_at = NOW()"
        )->execute([$scope, $key]);
        $s = $db->prepare("SELECT fails FROM auth_attempts WHERE scope = ? AND key_hash = ? LIMIT 1");
        $s->execute([$scope, $key]);
        $fails = (int)$s->fetchColumn();
        if ($fails >= 5) {
            $over = $fails - 5;                 // 0,1,2,…
            $mins = min(60, 1 << min($over, 6)); // 1,2,4,8,16,32,64→кап 60
            $db->prepare("UPDATE auth_attempts SET locked_until = DATE_ADD(NOW(), INTERVAL ? MINUTE) WHERE scope = ? AND key_hash = ?")
               ->execute([$mins, $scope, $key]);
        }
    } catch (Throwable $e) { /* нет таблицы — пропускаем */ }
}

/** Успешная авторизация — сбросить счётчик для ключа. */
function rt_throttle_ok($db, $scope, $value) {
    try {
        $db->prepare("DELETE FROM auth_attempts WHERE scope = ? AND key_hash = ?")
           ->execute([$scope, rt_throttle_key($scope, $value)]);
    } catch (Throwable $e) { /* нет таблицы — ничего */ }
}
