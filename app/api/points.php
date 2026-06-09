<?php
/**
 * POST /api/points.php — СЕРВЕРНЫЙ авторитет очков (SEC 2026-06-09, SEC-1 аудита).
 * Единственный клиентский путь записи в леджер bank/points (data.php на запись закрыт).
 * СУММУ во всех случаях решает СЕРВЕР, а не клиент:
 *
 *   op add  {reason, kind?, note?, child?}
 *     - reason из тарифа игр (guess_*, snake_record, teeth, find_*): пишем ФИКСИРОВАННУЮ сумму
 *       тарифа (клиентский n игнорируется). Любая роль — ребёнок зарабатывает себе.
 *     - reason 'walk_done': пишем настроенную родителем награду прогулки (walk/meta).
 *     - reason parent_give|parent_take|parent_penalty|daily_bonus или *_manual (teeth_manual):
 *       ТОЛЬКО роль parent (rt_can_manage_child для child=<id>); сумма родителя, кламп ±10000.
 *     - task_done / streak_bonus / spend — через add НЕЛЬЗЯ (только tasks.php / op spend|refund).
 *   op spend  {item, child?}    — покупка: цена из каталога Магазина, списываем её (не клиентскую).
 *   op refund {order, child?}   — родитель отклонил заказ: вернуть цену (по каталогу), идемпотентно.
 *
 * Скоуп (чей леджер) — как в data.php: ребёнок → свой; родитель → выбранный child (rt_can_manage_child).
 */

require __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_points.php';
rt_guard();
rt_require_login(rt_db()); // SEC 2026-06-09: вход обязателен

if ($_SERVER['REQUEST_METHOD'] !== 'POST') rt_json(['error' => 'method'], 405);

$db   = rt_db();
$me   = rt_user_id();
$body = rt_body();
$op   = isset($body['op']) ? (string)$body['op'] : '';
$role = rt_user_role();

/* ---- скоуп: чей леджер (по образцу data.php) ---- */
$uid = (int)$me;
if ($role === 'parent') {
    $cid = isset($body['child']) ? (int)$body['child'] : 0;
    if ($cid > 0) {
        if (!rt_can_manage_child($db, $me, $cid)) rt_json(['error' => 'forbidden child'], 403);
        $uid = $cid;
    } else {
        $cid = rt_family_child_uid($db, $me);
        if ($cid) $uid = $cid;
    }
}

$note = isset($body['note']) ? (string)$body['note'] : null;

switch ($op) {

    case 'add': {
        $reason = isset($body['reason']) ? (string)$body['reason'] : '';
        if ($reason === '') rt_json(['error' => 'reason required'], 422);

        // task_done / бонус / траты — через add запрещены (отдельные пути)
        if (in_array($reason, ['task_done', 'streak_bonus', 'spend', 'spend_refund'], true)) {
            rt_json(['error' => 'use_dedicated_op'], 422);
        }

        // 1) фиксированный тариф игр — сумма серверная, роль любая (ребёнок зарабатывает себе)
        $tariff = rt_points_tariff();
        if (isset($tariff[$reason])) {
            rt_points_write($db, $uid, $tariff[$reason]['n'], $reason, 'game', $tariff[$reason]['kind'], $note);
            rt_json(['ok' => true]);
        }

        // 2) награда за прогулку — floor(duration/2), серверно, только ребёнку-автору, один раз
        if ($reason === 'walk_done') {
            $entry = isset($body['entry']) ? (int)$body['entry'] : 0;
            $res = rt_points_walk_claim($db, $uid, (int)$me, $role, $entry);
            rt_json(['ok' => true, 'n' => $res['n']]);
        }

        // 3) родительские начисления: сумма родителя (кламп), ТОЛЬКО роль parent
        $parentReasons = ['parent_give', 'parent_take', 'parent_penalty', 'daily_bonus'];
        $isManual = (substr($reason, -7) === '_manual');
        if (in_array($reason, $parentReasons, true) || $isManual) {
            if ($role !== 'parent') rt_json(['error' => 'parent_only'], 403);
            $n = rt_points_clamp_grant(isset($body['n']) ? (int)$body['n'] : 0);
            if ($n === 0) rt_json(['error' => 'bad_amount'], 422);
            $kind = $isManual ? 'manual' : ($reason === 'daily_bonus' ? 'daily_bonus' : 'parent');
            rt_points_write($db, $uid, $n, $reason, 'parent', $kind, $note);
            rt_json(['ok' => true, 'n' => $n]);
        }

        rt_json(['error' => 'unknown_reason'], 422);
    }

    case 'spend': {
        // покупка товара: цена — из каталога (familyCollection items), баланс проверяем
        $item = isset($body['item']) ? (int)$body['item'] : 0;
        if ($item <= 0) rt_json(['error' => 'item required'], 422);
        $price = rt_points_shop_price($db, $uid, $item);
        if ($price <= 0) rt_json(['error' => 'bad_price'], 422);
        // баланс может уйти в минус — как в прежней клиентской логике (sdk.points.add(-p,'spend')).
        rt_points_write($db, $uid, -$price, 'spend', 'shop', 'spend', $note);
        rt_json(['ok' => true, 'price' => $price]);
    }

    case 'refund': {
        // родитель отклонил заказ → вернуть цену. Идемпотентно: уже declined → нечего возвращать.
        if ($role !== 'parent') rt_json(['error' => 'parent_only'], 403);
        $order = isset($body['order']) ? (int)$body['order'] : 0;
        if ($order <= 0) rt_json(['error' => 'order required'], 422);
        $s = $db->prepare(
            "SELECT id, status, data FROM module_data
             WHERE id=? AND user_id=? AND module='shop' AND collection='orders' AND deleted_at IS NULL LIMIT 1"
        );
        $s->execute([$order, $uid]);
        $row = $s->fetch();
        if (!$row) rt_json(['error' => 'not_found'], 404);
        if ($row['status'] === 'declined') rt_json(['ok' => true, 'already' => true]); // уже возвращено
        $od = $row['data'] !== null ? json_decode($row['data'], true) : [];
        if (!is_array($od)) $od = [];
        $itemId = isset($od['itemId']) ? (int)$od['itemId'] : 0;
        $price = $itemId > 0 ? rt_points_shop_price($db, $uid, $itemId) : 0;
        if ($price <= 0) $price = isset($od['price']) ? rt_points_clamp_grant((int)$od['price']) : 0; // фолбэк: цена из заказа
        if ($price <= 0) rt_json(['ok' => true, 'n' => 0]);
        rt_points_write($db, $uid, $price, 'spend_refund', 'shop', 'spend', isset($od['title']) ? (string)$od['title'] : null);
        // идемпотентность: помечаем заказ declined здесь же — повторный refund увидит status=declined
        $db->prepare("UPDATE module_data SET status='declined', updated_at=NOW()
                      WHERE id=? AND user_id=? AND module='shop' AND collection='orders'")->execute([$order, $uid]);
        rt_json(['ok' => true, 'price' => $price]);
    }

    case 'reverse': {
        // родитель удалил прогулку → откат начисленных за неё очков (идемпотентно)
        if ($role !== 'parent') rt_json(['error' => 'parent_only'], 403);
        $entry = isset($body['entry']) ? (int)$body['entry'] : 0;
        if ($entry <= 0) rt_json(['error' => 'entry required'], 422);
        $res = rt_points_walk_reverse($db, $uid, $entry);
        rt_json(['ok' => true, 'n' => $res['n']]);
    }

    default:
        rt_json(['error' => 'unknown op'], 400);
}
