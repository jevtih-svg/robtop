-- 032 (2026-06-10): одноразовая чистка «застрявших» проверок find (фидбек Джеффа).
-- Сабы со старым фолбэком «фото инлайном» (dataUrl >65000 байт в data) не проходили
-- НИ ОДИН путь сохранения проверки (гарды 65535 байт: data.php 413 / find/api.php 422)
-- и навсегда зависали в «На проверке», а очки за них уже начислены (ранние сборки
-- 2026-06-10 списывали очки до записи решения). Помечаем проверенными (st=correct,
-- маркер cleanup=1) БЕЗ начисления очков. Корень исправлен там же: новые сабы хранят
-- фото ТОЛЬКО путём (module.js), серверный гард поднят до 1МБ (modules/find/api.php).
UPDATE module_data
   SET data = JSON_SET(data, '$.st', 'correct', '$.rev', CAST(ROUND(UNIX_TIMESTAMP(NOW(3))*1000) AS UNSIGNED), '$.cleanup', 1),
       updated_at = NOW()
 WHERE module = 'find' AND collection = 'subs' AND deleted_at IS NULL
   AND JSON_UNQUOTE(JSON_EXTRACT(data, '$.st')) = 'pending'
   AND LENGTH(data) > 65000;
