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

function rt_img_fail($code) {
    header('Cache-Control: no-store');
    http_response_code($code);
    exit;
}

$rel = isset($_GET['p']) ? (string)$_GET['p'] : '';
$rel = ltrim($rel, '/');
if (strpos($rel, 'uploads/') === 0) $rel = substr($rel, 8);
// строго users/<id>/<kind>/<file>; никаких обходов каталога
if ($rel === '' || strpos($rel, '..') !== false ||
    !preg_match('#^users/(\d+)/([A-Za-z0-9_]+)/[A-Za-z0-9._-]+$#', $rel, $m)) {
    rt_img_fail(400);
}
$ownerId = (int)$m[1];
$kind    = (string)$m[2];
$viewer  = (int)rt_user_id();

/** Может ли $viewer видеть фото владельца $ownerId: сам владелец, primary-опекун или родитель семьи. */
function rt_img_can_view($db, $viewer, $ownerId) {
    if ($viewer > 0 && $viewer === $ownerId) return true;
    try {
        $s = $db->prepare(
            "SELECT 1 FROM guardianships
             WHERE child_user_id = ? AND guardian_user_id = ? AND type = 'primary' AND status = 'active'
             LIMIT 1"
        );
        $s->execute([$ownerId, $viewer]);
        if ($s->fetchColumn()) return true;
        $s = $db->prepare(
            "SELECT 1 FROM family_members fm1 JOIN family_members fm2 ON fm1.family_id = fm2.family_id
             WHERE fm1.user_id = ? AND fm1.role IN ('owner','parent') AND fm1.status='active'
               AND fm2.user_id = ? AND fm2.role = 'child' AND fm2.status='active' LIMIT 1"
        );
        $s->execute([$viewer, $ownerId]);
        return (bool)$s->fetchColumn();
    } catch (Throwable $e) { return false; }
}

function rt_img_public_ok($db, $ownerId, $kind) {
    if ($kind !== 'wishlist') return false;
    try {
        $s = $db->prepare("SELECT enabled FROM wishlist_share_settings WHERE child_user_id = ? LIMIT 1");
        $s->execute([$ownerId]);
        $r = $s->fetch();
        return $r && (int)$r['enabled'] === 1;
    } catch (Throwable $e) { return false; }
}

function rt_img_same_family_or_guardian_scope($db, $viewer, $ownerId) {
    if ($viewer > 0 && $viewer === $ownerId) return true;
    try {
        $fv = rt_user_family_id($db, $viewer);
        $fo = rt_user_family_id($db, $ownerId);
        if ($fv && $fo && (int)$fv === (int)$fo) return true;
    } catch (Throwable $e) { /* continue below */ }
    try {
        $s = $db->prepare(
            "SELECT 1
               FROM guardianships g1
               JOIN guardianships g2 ON g1.guardian_user_id = g2.guardian_user_id
              WHERE g1.child_user_id = ? AND g2.child_user_id = ?
                AND g1.status = 'active' AND g2.status = 'active'
              LIMIT 1"
        );
        $s->execute([$viewer, $ownerId]);
        if ($s->fetchColumn()) return true;
        $s = $db->prepare(
            "SELECT 1 FROM guardianships
              WHERE ((child_user_id = ? AND guardian_user_id = ?)
                  OR (child_user_id = ? AND guardian_user_id = ?))
                AND status = 'active'
              LIMIT 1"
        );
        $s->execute([$viewer, $ownerId, $ownerId, $viewer]);
        return (bool)$s->fetchColumn();
    } catch (Throwable $e) { return false; }
}

function rt_img_can_view_chat($db, $viewer, $path) {
    try {
        $s = $db->prepare(
            "SELECT m.thread_id, t.family_id
               FROM chat_messages m
               JOIN chat_threads t ON t.id = m.thread_id
              WHERE m.photo = ? AND m.deleted_at IS NULL
              LIMIT 1"
        );
        $s->execute([$path]);
        $r = $s->fetch();
        if (!$r) return false;
        $s = $db->prepare("SELECT 1 FROM chat_members WHERE thread_id = ? AND user_id = ? LIMIT 1");
        $s->execute([(int)$r['thread_id'], $viewer]);
        if ($s->fetchColumn()) return true;
        $s = $db->prepare(
            "SELECT 1 FROM family_members
              WHERE family_id = ? AND user_id = ? AND role IN ('owner','parent') AND status = 'active'
              LIMIT 1"
        );
        $s->execute([(int)$r['family_id'], $viewer]);
        return (bool)$s->fetchColumn();
    } catch (Throwable $e) { return false; }
}

function rt_img_can_view_shop($db, $viewer, $ownerId, $path) {
    if (!rt_img_same_family_or_guardian_scope($db, $viewer, $ownerId)) return false;
    try {
        $s = $db->prepare(
            "SELECT 1 FROM module_data
              WHERE module = 'shop' AND collection IN ('items','orders') AND deleted_at IS NULL
                AND JSON_UNQUOTE(JSON_EXTRACT(data, '$.photo')) = ?
              LIMIT 1"
        );
        $s->execute([$path]);
        return (bool)$s->fetchColumn();
    } catch (Throwable $e) { return false; }
}

function rt_img_manifest_shares_collection($manifest, $collection) {
    $man = $manifest ? json_decode((string)$manifest, true) : [];
    if (!is_array($man)) return false;
    if (!empty($man['familyPool'])) return true;
    $cols = (isset($man['familyCollections']) && is_array($man['familyCollections'])) ? $man['familyCollections'] : [];
    return in_array((string)$collection, $cols, true);
}

function rt_img_can_view_module_data($db, $viewer, $ownerId, $path) {
    if ($viewer <= 0 || !rt_img_same_family_or_guardian_scope($db, $viewer, $ownerId)) return false;
    try {
        $s = $db->prepare(
            "SELECT md.user_id, md.collection, m.manifest
               FROM module_data md
               JOIN modules m ON m.id = md.module AND m.deleted_at IS NULL AND m.enabled = 1
              WHERE md.deleted_at IS NULL
                AND JSON_SEARCH(md.data, 'one', ?) IS NOT NULL
              LIMIT 50"
        );
        $s->execute([$path]);
        foreach ($s->fetchAll() as $r) {
            $rowUid = (int)$r['user_id'];
            if ($rowUid === $viewer) return true;
            if (rt_img_same_family_or_guardian_scope($db, $viewer, $rowUid)
                && rt_img_manifest_shares_collection($r['manifest'], $r['collection'])) {
                return true;
            }
        }
        return false;
    } catch (Throwable $e) { return false; }
}

$db = rt_db();
$path = 'uploads/' . $rel;
if (!rt_img_can_view($db, $viewer, $ownerId)
    && !rt_img_public_ok($db, $ownerId, $kind)
    && !($kind === 'chat' && rt_img_can_view_chat($db, $viewer, $path))
    && !($kind === 'shop' && rt_img_can_view_shop($db, $viewer, $ownerId, $path))
    && !rt_img_can_view_module_data($db, $viewer, $ownerId, $path)) {
    rt_img_fail(403);
}

$base = realpath(__DIR__ . '/../uploads');
$full = $base ? realpath($base . '/' . $rel) : false;
if ($full === false || strpos($full, $base) !== 0 || !is_file($full)) { rt_img_fail(404); }

$ext  = strtolower(pathinfo($full, PATHINFO_EXTENSION));
$mime = $ext === 'png' ? 'image/png'
      : ($ext === 'webp' ? 'image/webp'
      : ($ext === 'gif' ? 'image/gif' : 'image/jpeg'));
header('Cache-Control: private, max-age=86400');
header('Content-Type: ' . $mime);
header('Content-Length: ' . filesize($full));
readfile($full);
