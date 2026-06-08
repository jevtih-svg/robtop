<?php
/* RobTop — отдача пользовательских фото С ПРОВЕРКОЙ ПРАВ (Ф4-приватность, ПЛАН-ОС-архитектура.md, Прил. Б.1).
 * Закрывает разрыв №8 аудита: сейчас uploads/ отдаётся как статика без проверки.
 * ПРАВИЛО: фото видит ТОЛЬКО владелец и его ПРЯМОЙ (primary) родитель; временный (provisional) — НЕТ.
 *
 * ВНИМАНИЕ: эндпоинт НЕ включён в работу автоматически. Чтобы приватность заработала, нужно (Прил. Б.1):
 *   1) модули отдают URL фото как api/image.php?p=<путь>, а не прямой uploads/<путь>;
 *   2) в .htaccess закрыть прямой доступ:  RewriteRule ^uploads/ - [F]
 * До этого файл просто лежит и ничего не меняет. ПЕРЕД включением: php -l image.php + тест на сервере.
 *
 * Запрос: GET api/image.php?p=users/<ownerId>/<kind>/<file>  (префикс uploads/ допускается и срезается).
 */
require __DIR__ . '/_bootstrap.php';
header_remove('Content-Type');           // _bootstrap выставил application/json — здесь отдаём картинку
header('Cache-Control: private, max-age=86400');

$rel = isset($_GET['p']) ? (string)$_GET['p'] : '';
$rel = ltrim($rel, '/');
if (strpos($rel, 'uploads/') === 0) $rel = substr($rel, 8);
// строго users/<id>/<kind>/<file>; никаких обходов каталога
if ($rel === '' || strpos($rel, '..') !== false ||
    !preg_match('#^users/(\d+)/[A-Za-z0-9_]+/[A-Za-z0-9._-]+$#', $rel, $m)) {
    http_response_code(400); exit;
}
$ownerId = (int)$m[1];
$viewer  = (int)rt_user_id();

/** Может ли $viewer видеть фото владельца $ownerId: сам владелец ИЛИ его primary-опекун. */
function rt_img_can_view($db, $viewer, $ownerId) {
    if ($viewer > 0 && $viewer === $ownerId) return true;
    try {
        $s = $db->prepare(
            "SELECT 1 FROM guardianships
             WHERE child_user_id = ? AND guardian_user_id = ? AND type = 'primary' AND status = 'active'
             LIMIT 1"
        );
        $s->execute([$ownerId, $viewer]);
        return (bool)$s->fetchColumn();
    } catch (Throwable $e) { return false; }
}

if ($viewer <= 0 || !rt_img_can_view(rt_db(), $viewer, $ownerId)) { http_response_code(403); exit; }

$base = realpath(__DIR__ . '/../uploads');
$full = $base ? realpath($base . '/' . $rel) : false;
if ($full === false || strpos($full, $base) !== 0 || !is_file($full)) { http_response_code(404); exit; }

$ext  = strtolower(pathinfo($full, PATHINFO_EXTENSION));
$mime = $ext === 'png' ? 'image/png'
      : ($ext === 'webp' ? 'image/webp'
      : ($ext === 'gif' ? 'image/gif' : 'image/jpeg'));
header('Content-Type: ' . $mime);
header('Content-Length: ' . filesize($full));
readfile($full);
