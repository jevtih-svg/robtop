<?php
/** GET /api/registry.php — включённые модули для главного экрана (источник плиток).
 *  Поверх глобального порядка (modules.sort_order) применяется ЛИЧНЫЙ порядок текущего
 *  аккаунта (user_prefs.tile_order, скрытый реордер long-press, миграция 012):
 *  известные id — по нему, остальные (новые/«скоро») — после, в глобальном порядке. */

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
try {
    $s = $db->prepare("SELECT tile_order FROM user_prefs WHERE user_id = ?");
    $s->execute([rt_user_id()]);
    $row  = $s->fetch();
    $pref = ($row && $row['tile_order']) ? json_decode($row['tile_order'], true) : null;
    if (is_array($pref) && count($pref)) {
        $idx = array_flip($pref);          // id → личная позиция
        $n   = count($pref);
        foreach ($out as $i => $m) {       // ключ: личная позиция, иначе после всех (стабильно)
            $out[$i]['_k'] = isset($idx[$m['id']]) ? (int)$idx[$m['id']] : $n + $i;
        }
        usort($out, function ($a, $b) { return $a['_k'] - $b['_k']; });
        foreach ($out as $i => $m) unset($out[$i]['_k']);
    }
} catch (Throwable $e) { /* нет таблицы prefs (миграция не применена) — порядок по умолчанию */ }
rt_json(['modules' => $out]);
