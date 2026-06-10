<?php
/**
 * RobTop — авто-миграции БД из PHP (без phpMyAdmin).
 *
 * При первом обращении к базе применяются все .sql-файлы из api/migrations/,
 * которых ещё нет в таблице schema_migrations. Файлы идемпотентны
 * (CREATE TABLE IF NOT EXISTS + INSERT ... ON DUPLICATE KEY), порядок — по имени (001_, 002_…).
 * Ошибки не валят API (например, если у пользователя БД нет прав CREATE).
 */

/** Разбить SQL-файл на отдельные выражения: убрать строки-комментарии (--) и разделить по ';'. */
function rt_split_sql($sql) {
    $out = [];
    $lines = preg_split('/\r?\n/', $sql);
    $buf = [];
    foreach ($lines as $ln) {
        if (strpos(ltrim($ln), '--') === 0) continue; // строка-комментарий целиком
        $buf[] = $ln;
    }
    foreach (explode(';', implode("\n", $buf)) as $stmt) {
        if (trim($stmt) !== '') $out[] = $stmt;
    }
    return $out;
}

function rt_migrate_ignorable_error($e) {
    if (!($e instanceof PDOException)) return false;
    $code = isset($e->errorInfo[1]) ? (int)$e->errorInfo[1] : 0;
    return in_array($code, [
        1050, // table already exists
        1060, // duplicate column
        1061, // duplicate key name
        1062, // duplicate entry in seed/metadata rows
    ], true);
}

function rt_migrate($db) {
    static $done = false;
    if ($done) return;
    $done = true;

    $dir = __DIR__ . '/migrations';
    if (!is_dir($dir)) return;

    try {
        $db->exec(
            "CREATE TABLE IF NOT EXISTS schema_migrations (
                name VARCHAR(190) NOT NULL,
                applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (name)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );

        $applied = [];
        foreach ($db->query("SELECT name FROM schema_migrations")->fetchAll() as $r) {
            $applied[$r['name']] = true;
        }

        $files = glob($dir . '/*.sql');
        if (!$files) return;
        sort($files);

        $record = $db->prepare(
            "INSERT INTO schema_migrations (name, applied_at) VALUES (?, NOW())
             ON DUPLICATE KEY UPDATE applied_at = NOW()"
        );

        foreach ($files as $file) {
            $name = basename($file);
            if (isset($applied[$name])) continue;
            $sql = file_get_contents($file);
            if ($sql === false) continue;
            foreach (rt_split_sql($sql) as $stmt) {
                try {
                    $db->exec($stmt);
                } catch (Throwable $e) {
                    if (!rt_migrate_ignorable_error($e)) throw $e;
                }
            }
            $record->execute([$name]);
        }
    } catch (Throwable $e) {
        // Тихо: не ломаем API, если миграция не прошла. Эндпоинты сами вернут понятную ошибку.
    }
}
