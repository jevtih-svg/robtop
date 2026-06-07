<?php
/** POST /api/store/enable.php — вкл/выкл модуля (только родитель). {id,enabled} */

require __DIR__ . '/../_bootstrap.php';
rt_guard();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') rt_json(['error' => 'method'], 405);

$b = rt_body();
if (!rt_admin_gate()) rt_json(['error' => 'unauthorized'], 401); // только родительская сессия (PIN упразднён 2026-06-07)

$id = isset($b['id']) ? (string)$b['id'] : '';
if (!preg_match('/^[a-z0-9_-]{2,40}$/', $id)) rt_json(['error' => 'bad id'], 422);
$enabled = !empty($b['enabled']) ? 1 : 0;

$db = rt_db();
$db->prepare("UPDATE modules SET enabled=?, updated_at=NOW() WHERE id=?")->execute([$enabled, $id]);
rt_log('store', $enabled ? 'module_enabled' : 'module_disabled', null, $id, null, null, ['id' => $id]);
rt_json(['ok' => true]);
