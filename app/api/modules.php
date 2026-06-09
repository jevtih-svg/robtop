<?php
/** GET /api/modules.php?all=1 — все модули (включая выключенные) для админ-экрана магазина. */

require __DIR__ . '/_bootstrap.php';
rt_guard();
rt_require_login(rt_db()); // SEC 2026-06-09: вход обязателен (single_user-фолбэк убран)

$db = rt_db();
$out = [];
try {
    foreach (rt_modules_all($db) as $r) {
        $meta = rt_module_meta($r);
        $meta['enabled'] = (int)$r['enabled'];
        $meta['sort']    = (int)$r['sort_order'];
        $out[] = $meta;
    }
} catch (Throwable $e) {
    $out = [];
}
rt_json(['modules' => $out]);
