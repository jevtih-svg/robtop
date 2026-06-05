<?php
/** POST /api/store/reorder.php — переместить модуль выше/ниже (только админ). {pin,id,dir:-1|1} */

require __DIR__ . '/../_bootstrap.php';
rt_guard();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') rt_json(['error' => 'method'], 405);

$b = rt_body();
if (!rt_admin_ok(isset($b['pin']) ? $b['pin'] : '')) rt_json(['error' => 'unauthorized'], 401);

$id  = isset($b['id']) ? (string)$b['id'] : '';
$dir = (isset($b['dir']) && (int)$b['dir'] < 0) ? -1 : 1;
if (!preg_match('/^[a-z0-9_-]{2,40}$/', $id)) rt_json(['error' => 'bad id'], 422);

$db   = rt_db();
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
rt_log('store', 'module_reordered', null, $id, null, null, ['id' => $id, 'dir' => $dir]);
rt_json(['ok' => true]);
