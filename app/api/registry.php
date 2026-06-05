<?php
/** GET /api/registry.php — включённые модули для главного экрана (источник плиток). */

require __DIR__ . '/_bootstrap.php';
rt_guard();

$db = rt_db();
$out = [];
try {
    foreach (rt_modules_all($db) as $r) {
        if ((int)$r['enabled'] !== 1) continue;
        $out[] = rt_module_meta($r);
    }
} catch (Throwable $e) {
    // Таблица modules ещё не создана (миграция не применена) — отдаём пустой список,
    // клиент-оболочка использует встроенный набор по умолчанию.
    $out = [];
}
rt_json(['modules' => $out]);
