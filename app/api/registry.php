<?php
/** GET /api/registry.php — включённые модули для главного экрана (источник плиток).
 *  Поверх глобального порядка (modules.sort_order) применяется ЛИЧНЫЙ порядок текущего
 *  аккаунта (user_prefs.tile_order, скрытый реордер long-press, миграция 012):
 *  известные id — по нему, остальные (новые/«скоро») — после, в глобальном порядке.
 *  Личные скрытые плитки (user_prefs.hidden_tiles, миграция 022) НЕ выбрасываются из
 *  ответа — модуль получает флаг hidden:1, клиент прячет его сам и показывает в секции
 *  «Скрытые» режима перестановки (иначе нечего было бы возвращать). */

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
    /* SELECT * — переживает отсутствие hidden_tiles до миграции 022 (tile_order работает дальше) */
    $s = $db->prepare("SELECT * FROM user_prefs WHERE user_id = ?");
    $s->execute([rt_user_id()]);
    $row  = $s->fetch();
    $hid = ($row && !empty($row['hidden_tiles'])) ? json_decode($row['hidden_tiles'], true) : null;
    if (is_array($hid) && count($hid)) {
        $hidIdx = array_flip($hid);
        foreach ($out as $i => $m) if (isset($hidIdx[$m['id']])) $out[$i]['hidden'] = 1;
    }
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
