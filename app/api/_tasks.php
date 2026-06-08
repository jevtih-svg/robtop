<?php
/**
 * RobTop — ОБЩИЙ сервис заданий (переиспользуемая часть; канон — ГАЙД-задания.md).
 *
 * Задания родителей — ресурс УРОВНЯ ПРИЛОЖЕНИЯ (как очки и оповещения): отдельная таблица
 * tasks, один источник правды. Эндпоинт api/tasks.php даёт CRUD + потоки claim/approve/decline;
 * этот файл — переиспользуемые помощники, нужные нескольким местам сервера:
 *   - валидация/нормализация полей задания;
 *   - ленивый бэкфилл старого generic-стора bank/tasks → таблица tasks;
 *   - счётчик «ждут проверки» для родительского дашборда (api/parent.php).
 *
 * Подключается из api/tasks.php и api/parent.php (require_once — без дублей).
 */

if (!function_exists('rt_task_clean_title')) {

    /** title 1..120 символов (обрезка). */
    function rt_task_clean_title($v) { return mb_substr(trim((string)$v), 0, 120); }

    /** points 1..1000, дефолт 10. */
    function rt_task_clean_points($v) {
        $n = (int)$v;
        if ($n < 1) $n = 10;
        if ($n > 1000) $n = 1000;
        return $n;
    }

    /** type recur|once. */
    function rt_task_clean_type($v) { return ((string)$v === 'once') ? 'once' : 'recur'; }

    /** ms-таймстамп (старый JSON стора) → DATETIME строкой; 0/пусто → null. */
    function rt_task_ms_to_dt($v) {
        $n = (int)$v;
        return $n > 0 ? date('Y-m-d H:i:s', (int)($n / 1000)) : null;
    }

    /** SELECT всех полей задания в формате контракта (ms-таймстампы). Общий для tasks.php и parent.php. */
    function rt_task_select() {
        return "SELECT id, user_id, title, points, type, status, origin, times_done,
                UNIX_TIMESTAMP(last_done_at)*1000 AS lastDoneAt,
                UNIX_TIMESTAMP(claimed_at)*1000  AS claimedAt,
                UNIX_TIMESTAMP(done_at)*1000     AS doneAt,
                UNIX_TIMESTAMP(created_at)*1000  AS createdAt,
                UNIX_TIMESTAMP(updated_at)*1000  AS updatedAt
           FROM tasks";
    }

    /** Строка задания → плоский контракт клиента (sdk.tasks). */
    function rt_task_out($r) {
        return [
            'id'         => (string)$r['id'],
            'title'      => (string)$r['title'],
            'points'     => (int)$r['points'],
            'type'       => ($r['type'] === 'once') ? 'once' : 'recur',
            'status'     => (string)$r['status'],
            'origin'     => (isset($r['origin']) && $r['origin'] === 'child') ? 'child' : 'parent',
            'timesDone'  => (int)$r['times_done'],
            'lastDoneAt' => $r['lastDoneAt'] !== null ? (int)$r['lastDoneAt'] : null,
            'claimedAt'  => $r['claimedAt'] !== null ? (int)$r['claimedAt'] : null,
            'doneAt'     => $r['doneAt'] !== null ? (int)$r['doneAt'] : null,
            'createdAt'  => $r['createdAt'] !== null ? (int)$r['createdAt'] : null,
            'updatedAt'  => $r['updatedAt'] !== null ? (int)$r['updatedAt'] : null,
        ];
    }

    /** Одно задание скоупа по id (живое). */
    function rt_task_row($db, $uid, $id) {
        $s = $db->prepare(rt_task_select() . " WHERE id = ? AND user_id = ? AND deleted_at IS NULL");
        $s->execute([(int)$id, (int)$uid]);
        return $s->fetch();
    }

    /**
     * Ленивый бэкфилл: один раз на скоуп переносит живые строки generic-стора
     * bank/tasks (module_data) в таблицу tasks. Старые строки module_data НЕ трогаются
     * (аддитивность) — становятся неживой историей. Идемпотентно: если в tasks уже есть
     * хоть одна строка этого пользователя — выходим. Никогда не бросает (таблиц может не быть).
     */
    function rt_tasks_backfill($db, $uid) {
        try {
            $s = $db->prepare("SELECT COUNT(*) FROM tasks WHERE user_id = ?");
            $s->execute([(int)$uid]);
            if ((int)$s->fetchColumn() > 0) return;
            $s = $db->prepare(
                "SELECT status, data, created_at, updated_at FROM module_data
                 WHERE user_id = ? AND module = 'bank' AND collection = 'tasks' AND deleted_at IS NULL
                 ORDER BY id ASC"
            );
            $s->execute([(int)$uid]);
            $rows = $s->fetchAll();
            if (!$rows) return;
            $ins = $db->prepare(
                "INSERT INTO tasks (user_id, title, points, type, status, times_done,
                                    last_done_at, claimed_at, done_at, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            );
            foreach ($rows as $r) {
                $d = $r['data'] !== null ? json_decode($r['data'], true) : [];
                if (!is_array($d)) $d = [];
                $st = in_array($r['status'], ['active', 'pending', 'done'], true) ? $r['status'] : 'active';
                $ins->execute([
                    (int)$uid,
                    rt_task_clean_title(isset($d['title']) ? $d['title'] : ''),
                    rt_task_clean_points(isset($d['points']) ? $d['points'] : 10),
                    rt_task_clean_type(isset($d['type']) ? $d['type'] : 'recur'),
                    $st,
                    isset($d['timesDone']) ? max(0, (int)$d['timesDone']) : 0,
                    rt_task_ms_to_dt(isset($d['lastDoneAt']) ? $d['lastDoneAt'] : 0),
                    rt_task_ms_to_dt(isset($d['claimedAt']) ? $d['claimedAt'] : 0),
                    rt_task_ms_to_dt(isset($d['doneAt']) ? $d['doneAt'] : 0),
                    $r['created_at'],
                    $r['updated_at'],
                ]);
            }
            if (function_exists('rt_log')) {
                rt_log('tasks', 'backfilled', null, null, null, null, ['n' => count($rows)], $uid);
            }
        } catch (Throwable $e) { /* бэкфилл не должен ничего ломать */ }
    }

    /**
     * Сколько заданий ребёнка ждут проверки родителя (status='pending'). Для бейджа
     * дашборда. Сначала бэкфилл (на случай, если ребёнок ещё не открывал задания после
     * деплоя — иначе таблица пуста и счётчик соврёт). 0 при любой ошибке/отсутствии таблиц.
     */
    function rt_tasks_pending_count($db, $uid) {
        try {
            rt_tasks_backfill($db, $uid);
            $s = $db->prepare("SELECT COUNT(*) FROM tasks WHERE user_id = ? AND status = 'pending' AND deleted_at IS NULL");
            $s->execute([(int)$uid]);
            return (int)$s->fetchColumn();
        } catch (Throwable $e) { return 0; }
    }
}
