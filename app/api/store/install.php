<?php
/**
 * POST /api/store/install.php — установка модуля в рантайме (только родитель).
 * Тело: { manifest:{id,name,version,color,icon,status,roles,...}, files:{ "module.js":"...", "module.css":"...", "icon.svg":"..." } }
 *
 * БЕЗОПАСНОСТЬ (жёстко):
 *  - только родительская сессия (rt_admin_gate; PIN упразднён 2026-06-07);
 *  - установленные модули — ТОЛЬКО статика: серверный код запрещён (server=0);
 *  - whitelist расширений файлов; запрет .php/.phtml/.phar/.cgi/.pl/.py/.sh;
 *  - лимиты размера; валидный уникальный id; запрет перезаписи родного модуля.
 */

require __DIR__ . '/../_bootstrap.php';
rt_guard();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') rt_json(['error' => 'method'], 405);

$b = rt_body();
if (!rt_admin_gate()) rt_json(['error' => 'unauthorized'], 401); // только родительская сессия (PIN упразднён 2026-06-07)

$man   = isset($b['manifest']) && is_array($b['manifest']) ? $b['manifest'] : null;
$files = isset($b['files']) && is_array($b['files']) ? $b['files'] : null;
if (!$man || !$files) rt_json(['error' => 'need_manifest', 'message' => 'manifest and files are required'], 422);

$id = isset($man['id']) ? (string)$man['id'] : '';
if (!preg_match('/^[a-z0-9_-]{2,40}$/', $id)) rt_json(['error' => 'bad_id', 'message' => 'Invalid app id'], 422);

$reserved = ['api','core','apps','modules','media','uploads','config','store'];
if (in_array($id, $reserved, true)) rt_json(['error' => 'reserved_id', 'message' => 'Reserved id'], 422);

$db = rt_db();
$existing = rt_module_row($db, $id);
if ($existing && $existing['source'] === 'native') rt_json(['error' => 'cant_replace_native', 'message' => 'Cannot replace a built-in module'], 409);

// --- валидация файлов ---
$allowExt = ['js','css','json','svg','png','jpg','jpeg','webp','gif','woff2'];
$denyExt  = ['php','phtml','phar','php3','php4','php5','php7','cgi','pl','py','sh','fcgi','pht'];
$MAX_FILE = 512 * 1024;     // 512 КБ на файл
$MAX_TOTAL = 2 * 1024 * 1024; // 2 МБ суммарно
$total = 0; $clean = [];
foreach ($files as $name => $content) {
    $name = (string)$name;
    if (!preg_match('/^[a-zA-Z0-9._\-]{1,64}$/', $name) || strpos($name, '..') !== false) rt_json(['error' => 'bad_filename', 'name' => $name, 'message' => 'Bad file name: ' . $name], 422);
    $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    if (in_array($ext, $denyExt, true)) rt_json(['error' => 'server_code_denied', 'name' => $name, 'message' => 'Server code is not allowed: ' . $name], 422);
    if (!in_array($ext, $allowExt, true)) rt_json(['error' => 'bad_type', 'name' => $name, 'message' => 'Disallowed type: ' . $name], 422);
    $bytes = (string)$content;
    if (strlen($bytes) > $MAX_FILE) rt_json(['error' => 'file_too_big', 'name' => $name, 'message' => 'File is too big: ' . $name], 413);
    $total += strlen($bytes);
    if ($total > $MAX_TOTAL) rt_json(['error' => 'bundle_too_big', 'message' => 'Bundle is too big'], 413);
    $clean[$name] = $bytes;
}
if (!isset($clean['module.js'])) rt_json(['error' => 'no_module_js', 'message' => 'Bundle has no module.js'], 422);

// --- запись файлов в apps/<id>/ ---
$appsBase = dirname(dirname(__DIR__)) . '/apps';
if (!is_dir($appsBase)) @mkdir($appsBase, 0775, true);
// гарантировать защиту папки
$ht = $appsBase . '/.htaccess';
if (!file_exists($ht)) @file_put_contents($ht, "Options -Indexes\n<FilesMatch \"\\.(php|phtml|phar|cgi|pl|py|sh|fcgi|pht)$\">\n  Require all denied\n</FilesMatch>\n");
$dir = $appsBase . '/' . $id;
if (!is_dir($dir)) { if (!@mkdir($dir, 0775, true)) rt_json(['error' => 'no_apps_dir', 'message' => 'No permission for the apps folder'], 500); }
foreach ($clean as $name => $bytes) {
    if (@file_put_contents($dir . '/' . $name, $bytes) === false) rt_json(['error' => 'write_failed', 'name' => $name, 'message' => 'Could not write ' . $name], 500);
}

// --- нормализовать манифест и записать в реестр ---
$man['server'] = false;        // установленные модули не имеют серверного кода
$man['source'] = 'installed';
if (!isset($man['status'])) $man['status'] = 'active';
// SEC 2026-06-09 (XSS): color попадает в клиентский style="--c:…"; пускаем только hex/rgb(a),
// иначе значение вида  x" onmouseover="…  ломало бы атрибут. Невалидный — клиент берёт дефолт.
if (isset($man['color']) && !preg_match('/^#[0-9a-fA-F]{3,8}$|^rgba?\([0-9 .,%]+\)$/', (string)$man['color'])) {
    unset($man['color']);
}
$name    = isset($man['name']) ? (string)$man['name'] : $id;
$version = isset($man['version']) ? (string)$man['version'] : '1.0.0';

// следующий sort_order
$maxRow = $db->query("SELECT COALESCE(MAX(sort_order),100) AS m FROM modules")->fetch();
$sort = ((int)$maxRow['m']) + 10;

$st = $db->prepare(
    "INSERT INTO modules (id,name,version,manifest,source,trusted,server,enabled,sort_order,installed_at,updated_at)
     VALUES (?, ?, ?, ?, 'installed', 0, 0, 0, ?, NOW(), NOW())
     ON DUPLICATE KEY UPDATE name=VALUES(name), version=VALUES(version), manifest=VALUES(manifest),
        source='installed', server=0, updated_at=NOW()"
);
$st->execute([$id, $name, $version, json_encode($man, JSON_UNESCAPED_UNICODE), $sort]);
rt_log('store', 'module_installed', null, $id, null, null, ['id' => $id, 'version' => $version]);

rt_json(['ok' => true, 'module' => rt_module_meta(['id' => $id, 'name' => $name, 'version' => $version, 'manifest' => json_encode($man, JSON_UNESCAPED_UNICODE), 'source' => 'installed', 'server' => 0])]);
