-- 027: галочки доставки/прочтения чата (read receipts, 2026-06-08).
-- last_read_at — момент последнего продвижения last_read_id (время прочтения для long-press).
-- seen_at      — последняя активность участника (sync.php обновляет на каждый поллинг) →
--                статус «доставлено» = у адресата seen_at >= времени сообщения.
-- Обе колонки NULL по умолчанию (старые строки = «ещё не читал/не в сети»). Один ALTER
-- (атомарно для раннера: если упадёт — ничего не добавлено, повтор чистый). Читатели
-- (api.php messages, sync.php) защищены try/catch до применения миграции.
ALTER TABLE chat_members ADD COLUMN last_read_at DATETIME NULL, ADD COLUMN seen_at DATETIME NULL;
