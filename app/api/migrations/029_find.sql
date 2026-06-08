-- 029: модуль «Найти предмет» (find) — плановая плитка переводится из soon в active.
-- Данные модуля живут в module_data (generic-стор: subs, meta), своя таблица не нужна.
-- roles.edit включает parent: родитель проверяет фото (✓ верно / ✗ неверно) и меняет статус отправки.
INSERT INTO modules (id, name, version, manifest, source, trusted, server, enabled, sort_order) VALUES
 ('find','Найти предмет','1.0.0','{"color":"#19e3ff","status":"active","wide":false,"roles":{"edit":["child","parent"],"read":["child","parent"]}}','native',1,0,1,80)
ON DUPLICATE KEY UPDATE name=VALUES(name), version=VALUES(version), manifest=VALUES(manifest),
 server=VALUES(server), enabled=VALUES(enabled), sort_order=VALUES(sort_order), updated_at=NOW();
