-- 018: модуль «Смешные имена» (names) — плановая плитка переводится из soon в active.
-- Данные модуля живут в module_data (generic-стор), своя таблица не нужна.
INSERT INTO modules (id, name, version, manifest, source, trusted, server, enabled, sort_order) VALUES
 ('names','Смешные имена','1.0.0','{"color":"#38e8a0","status":"active","wide":false,"roles":{"edit":["child"],"read":["child","parent"]}}','native',1,0,1,60)
ON DUPLICATE KEY UPDATE name=VALUES(name), version=VALUES(version), manifest=VALUES(manifest),
 server=VALUES(server), enabled=VALUES(enabled), sort_order=VALUES(sort_order), updated_at=NOW();
