<?php
/**
 * POST /api/upload.php — загрузка картинки.
 * Тело: { "dataUrl": "data:image/...;base64,...", "kind": "wishlist" }
 *
 * Кладёт файл в uploads/users/{userId}/{kind}/, пишет запись в uploaded_files,
 * возвращает относительный путь { "path": "uploads/users/1/wishlist/abc.jpg" }.
 * В БД (wishlist_items.photo) сохраняется ИМЕННО этот путь, а не бинарь.
 */

require __DIR__ . '/_bootstrap.php';
require __DIR__ . '/_storage.php';
rt_guard();
rt_require_login(rt_db()); // SEC 2026-06-09: вход обязателен (single_user-фолбэк убран)

if ($_SERVER['REQUEST_METHOD'] !== 'POST') rt_json(['error' => 'method'], 405);

$body = rt_body();
$kindAllowed = ['wishlist', 'avatars', 'documents', 'events', 'rating', 'mood', 'chat', 'find'];
$kind = (isset($body['kind']) && in_array($body['kind'], $kindAllowed, true)) ? $body['kind'] : 'wishlist';
$dataUrl = isset($body['dataUrl']) ? (string)$body['dataUrl'] : '';

if (!preg_match('#^data:image/(png|jpe?g|webp|gif);base64,#i', $dataUrl, $m)) {
    rt_json(['error' => 'expected_image', 'message' => 'An image is expected (png/jpg/webp/gif)'], 422);
}
$ext = strtolower($m[1]);
if ($ext === 'jpeg') $ext = 'jpg';

$bytes = base64_decode(substr($dataUrl, strpos($dataUrl, ',') + 1), true);
if ($bytes === false) rt_json(['error' => 'corrupt_data', 'message' => 'Corrupted data'], 422);
if (strlen($bytes) > 4 * 1024 * 1024) rt_json(['error' => 'file_too_big', 'message' => 'File is too big (>4MB)'], 413);

$info = @getimagesizefromstring($bytes);
if ($info === false) rt_json(['error' => 'not_image', 'message' => 'This is not an image'], 422);

$uid = rt_user_id();
$actorUid = $uid;
if (rt_user_role() === 'parent') {
    $cid = isset($body['child']) ? (int)$body['child'] : 0;
    if ($cid > 0) {
        if (!rt_can_manage_child(rt_db(), $actorUid, $cid)) rt_json(['error' => 'forbidden child'], 403);
        $uid = $cid;
    }
}
// SEC 2026-06-09: кап загрузок — не больше 120 файлов в час на пользователя (анти-абуз диска).
try {
    $cu = rt_db()->prepare("SELECT COUNT(*) FROM uploaded_files WHERE user_id=? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)");
    $cu->execute([$uid]);
    if ((int)$cu->fetchColumn() >= 120) rt_json(['error' => 'rate_limited', 'message' => 'Too many uploads, try later'], 429);
} catch (Throwable $e) { /* нет таблицы — без капа */ }
$subdir = 'users/' . $uid . '/' . $kind;          // папка по пользователю (Rule: user-ready)
$path = rt_storage()->put($bytes, $ext, $subdir);
if (!$path) rt_json(['error' => 'save_failed', 'message' => 'Could not save the file (check uploads folder permissions)'], 500);

// Реестр загруженных файлов (уже привязан к user_id на будущее)
try {
    $st = rt_db()->prepare("INSERT INTO uploaded_files (user_id, module, path, mime, size, created_at) VALUES (?, ?, ?, ?, ?, NOW())");
    $st->execute([$uid, $kind, $path, isset($info['mime']) ? $info['mime'] : null, strlen($bytes)]);
} catch (Throwable $e) { /* реестр не критичен для отдачи файла */ }

rt_log($kind, 'photo_uploaded', null, null, null, null, ['path' => $path]);
rt_json(['ok' => true, 'path' => $path]);
