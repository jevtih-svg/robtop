<?php
/**
 * GET /api/sync.php — «живое обновление» (v2026.06.07.47): лёгкий отпечаток изменений
 * для поллинга оболочки (core/shell.js, секция SYNC). Никаких данных не отдаёт —
 * только маркеры «что-то поменялось», сравнение на клиенте.
 *
 * Ответ: { ok, data, reg, ver }
 *   data — md5-отпечаток данных в скоупе ЗРИТЕЛЯ: module_data по набору uid
 *          (я + семейный пул + для родителя ВСЕ его дети) + мои тикеты.
 *          Любой create/update/move/favorite/delete/restore бьёт updated_at (data.php),
 *          поэтому COUNT + MAX(id) + MAX(updated_at) ловят всё.
 *   reg  — отпечаток реестра плиток: id/enabled/sort_order всех модулей (точный
 *          GROUP_CONCAT: ловит вкл/выкл и реордер, у которых updated_at не бьётся)
 *          + личный порядок плиток аккаунта (user_prefs.tile_order).
 *   ver  — версия приложения из index.html (window.RT_VER): клиент сравнивает со своей
 *          и предлагает «Обновить» после деплоя. Отдельного файла версии нет нарочно —
 *          источник правды один, новых «мест версии» не добавляем.
 *
 * Почему поллинг, а не SSE/WebSocket: shared-хостинг Hostinger не держит длинные
 * PHP-соединения (лимиты воркеров, буферизация). Запрос ~3 коротких индексных запроса.
 */

require __DIR__ . '/_bootstrap.php';
rt_guard();

$db  = rt_db();
$uid = rt_user_id();

/* ---- набор uid, чьи данные видит текущий пользователь ---- */
$uids = [(int)$uid];
$uids[] = (int)rt_family_pool_uid($db, $uid);           // общесемейный пул (walk и т.п.)
if (rt_user_role() === 'parent') {
    try {
        // все дети родителя: прямые опекунства + дети семьи (по образцу rt_parent_children)
        $s = $db->prepare(
            "SELECT child_user_id AS id FROM guardianships WHERE guardian_user_id = ? AND status = 'active'"
        );
        $s->execute([$uid]);
        foreach ($s->fetchAll() as $r) $uids[] = (int)$r['id'];
        $s = $db->prepare(
            "SELECT fm2.user_id AS id
             FROM family_members fm1
             JOIN family_members fm2 ON fm1.family_id = fm2.family_id
             WHERE fm1.user_id = ? AND fm1.role IN ('owner','parent') AND fm1.status='active'
               AND fm2.role = 'child' AND fm2.status='active'"
        );
        $s->execute([$uid]);
        foreach ($s->fetchAll() as $r) $uids[] = (int)$r['id'];
    } catch (Throwable $e) { /* нет таблиц семьи — остаёмся на своём скоупе */ }
}
$uids = array_values(array_unique(array_map('intval', $uids)));
$in   = implode(',', $uids);

/* ---- отпечаток данных: module_data (скоуп) + мои тикеты ---- */
$d = ['0', '0', '0']; $t = ['0', '0', '0'];
try {
    $q = $db->query(
        "SELECT COUNT(*) c, COALESCE(MAX(id),0) m, COALESCE(MAX(UNIX_TIMESTAMP(updated_at)),0) u
         FROM module_data WHERE user_id IN ($in)"
    )->fetch();
    $d = [$q['c'], $q['m'], $q['u']];
} catch (Throwable $e) {}
try {
    $s = $db->prepare(
        "SELECT COUNT(*) c, COALESCE(MAX(UNIX_TIMESTAMP(updated_at)),0) u, COALESCE(SUM(user_unread),0) n
         FROM tickets WHERE user_id = ?"
    );
    $s->execute([$uid]);
    $q = $s->fetch();
    $t = [$q['c'], $q['u'], $q['n']];
} catch (Throwable $e) { /* таблицы тикетов может не быть (миграция 015) */ }
$data = md5(implode('|', $d) . '#' . implode('|', $t));

/* ---- отпечаток реестра плиток ---- */
$reg = '';
try {
    $q = $db->query(
        "SELECT COALESCE(GROUP_CONCAT(CONCAT_WS(':', id, enabled, sort_order) ORDER BY id SEPARATOR '|'), '')
         FROM modules WHERE deleted_at IS NULL"
    )->fetchColumn();
    $reg = (string)$q;
} catch (Throwable $e) {}
try {
    $s = $db->prepare("SELECT tile_order FROM user_prefs WHERE user_id = ?");
    $s->execute([$uid]);
    $reg .= '#' . (string)($s->fetchColumn() ?: '');
} catch (Throwable $e) {}
$reg = md5($reg);

/* ---- версия приложения (RT_VER из index.html) ---- */
$ver = '';
try {
    $html = @file_get_contents(__DIR__ . '/../index.html', false, null, 0, 65536);
    if ($html && preg_match('/window\.RT_VER\s*=\s*"([^"]+)"/', $html, $m)) $ver = $m[1];
} catch (Throwable $e) {}

/* ---- оповещения ТЕКУЩЕГО аккаунта (core/notify.js): сырые значения, не хэш ----
   n — непрочитанных (бейдж колокольчика без лишнего запроса), m — MAX(id) непрочитанных
   (рост m = пришло новое → клиент тянет list и показывает баннер). Скоуп — строго
   сессионный пользователь: оповещения личные, семейный пул здесь ни при чём. */
$ntf = ['n' => 0, 'm' => 0];
try {
    $s = $db->prepare("SELECT COUNT(*) n, COALESCE(MAX(id),0) m FROM notifications WHERE user_id = ? AND read_at IS NULL");
    $s->execute([$uid]);
    $q = $s->fetch();
    $ntf = ['n' => (int)$q['n'], 'm' => (int)$q['m']];
} catch (Throwable $e) { /* таблицы может не быть до миграции 020 */ }

rt_json(['ok' => true, 'data' => $data, 'reg' => $reg, 'ver' => $ver, 'ntf' => $ntf]);
