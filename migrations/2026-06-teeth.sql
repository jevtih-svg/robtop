-- RobTop — активировать модуль «Таймер чистки зубов» на уже мигрированной базе.
-- Применить один раз через phpMyAdmin (если база уже содержит реестр modules).
UPDATE modules
SET name='Таймер чистки зубов',
    manifest='{"color":"#19e3ff","status":"active","roles":{"edit":["child"],"read":["child","parent"]}}',
    server=0,
    enabled=1,
    updated_at=NOW()
WHERE id='teeth';
