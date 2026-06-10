<?php
/** POST /api/store/uninstall.php — удалить установленный модуль (только родитель). {id}
 *  Удаляет файлы из apps/<id>/ и строку реестра. Данные (module_data) и события сохраняются. */

require __DIR__ . '/../_bootstrap.php';
rt_guard();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') rt_json(['error' => 'method'], 405);

$b = rt_body();
$db = rt_db();
rt_require_admin($db);

$id = isset($b['id']) ? (string)$b['id'] : '';
if (!preg_match('/^[a-z0-9_-]{2,40}$/', $id)) rt_json(['error' => 'bad id'], 422);

$row = rt_module_row($db, $id);
if (!$row) rt_json(['ok' => true]);
if ($row['source'] !== 'installed') rt_json(['error' => 'cant_uninstall_native', 'message' => 'Cannot remove a built-in module'], 400);

// удалить файлы apps/<id>/ (строго внутри папки apps)
$appsBase = realpath(dirname(dirname(__DIR__)) . '/apps');
$dir = $appsBase ? realpath($appsBase . '/' . $id) : false;
if ($dir && $appsBase && strpos($dir, $appsBase) === 0 && is_dir($dir)) {
    $it = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST
    );
    foreach ($it as $f) { $f->isDir() ? @rmdir($f->getPathname()) : @unlink($f->getPathname()); }
    @rmdir($dir);
}

$db->prepare("DELETE FROM modules WHERE id=? AND source='installed'")->execute([$id]);
rt_log('store', 'module_uninstalled', null, $id, null, null, ['id' => $id]);
rt_json(['ok' => true]);
