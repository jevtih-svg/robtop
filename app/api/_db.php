<?php
/** RobTop — конфиг и подключение к БД (PDO). */

function rt_config() {
    static $cfg = null;
    if ($cfg === null) {
        $path = __DIR__ . '/../config.php';
        if (!file_exists($path)) {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['error' => 'config.php не найден. Создай его из config.example.php'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        $cfg = require $path;
    }
    return $cfg;
}

function rt_db() {
    static $pdo = null;
    if ($pdo === null) {
        $c = rt_config();
        $dsn = "mysql:host={$c['db_host']};dbname={$c['db_name']};charset={$c['db_charset']}";
        try {
            $pdo = new PDO($dsn, $c['db_user'], $c['db_pass'], [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        } catch (Throwable $e) {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['error' => 'Не удалось подключиться к базе данных'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        // Авто-миграции: при первом подключении создаём/обновляем таблицы из api/migrations/.
        // Идемпотентно и без phpMyAdmin. Не ломает API при ошибке.
        require_once __DIR__ . '/_migrate.php';
        rt_migrate($pdo);
    }
    return $pdo;
}
