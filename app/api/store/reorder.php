<?php
/** POST /api/store/reorder.php — переместить модуль выше/ниже (только родитель). {id,dir:-1|1} */

require __DIR__ . '/../_bootstrap.php';
rt_guard();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') rt_json(['error' => 'method'], 405);

$b = rt_body();
$db = rt_db();
rt_require_admin($db);

$id  = isset($b['id']) ? (string)$b['id'] : '';
$dir = (isset($b['dir']) && (int)$b['dir'] < 0) ? -1 : 1;
if (!preg_match('/^[a-z0-9_-]{2,40}$/', $id)) rt_json(['error' => 'bad id'], 422);

$rows = rt_modules_all($db); // отсортированы по sort_order, id
$i = -1;
for ($k = 0; $k < count($rows); $k++) { if ($rows[$k]['id'] === $id) { $i = $k; break; } }
if ($i < 0) rt_json(['ok' => true]); // нечего двигать
$j = $i + $dir;
if ($j < 0 || $j >= count($rows)) rt_json(['ok' => true]); // у края

$a = $rows[$i]; $c = $rows[$j];
$sa = (int)$a['sort_order']; $sc = (int)$c['sort_order'];
if ($sa === $sc) { $sa = $i * 10; $sc = $j * 10; } // развести, если равны
$up = $db->prepare("UPDATE modules SET sort_order=?, updated_at=NOW() WHERE id=?");
$up->execute([$sc, $a['id']]);
$up->execute([$sa, $c['id']]);

/* Порядок, заданный родителем здесь, — КАНОН для его семьи (фикс «реордер не сохраняется»,
   2026-06-07): registry.php накрывает глобальный sort_order личным user_prefs.tile_order
   (скрытый long-press реордер), поэтому без сброса родитель и дети продолжали видеть свои
   старые порядки, а ▲▼ выглядел неработающим. Сбрасываем личные порядки родителя и ЕГО детей
   (jiggle остаётся — после ▲▼ каждый может снова персонализировать); чужие семьи не трогаем. */
try {
    $uid = rt_user_id();
    $ids = array_merge([(int)$uid], rt_family_children_uids($db, $uid));
    $in  = implode(',', array_map('intval', $ids));
    $db->exec("UPDATE user_prefs SET tile_order = NULL WHERE user_id IN ($in)");
} catch (Throwable $e) { /* нет таблицы prefs (миграция 012 не применена) — нечего сбрасывать */ }

rt_log('store', 'module_reordered', null, $id, null, null, ['id' => $id, 'dir' => $dir]);
rt_json(['ok' => true]);
