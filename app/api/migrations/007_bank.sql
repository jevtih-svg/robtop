-- 007: Копилка (bank) — плановая плитка переводится из «Скоро» в активную.
-- Реестр модулей: статус active, явные роли (ребёнок пишет, родитель читает), широкая плитка внизу.
-- Данные модуля живут в generic-сторе module_data (bank/points — леджер, bank/meta — винстрик): таблиц не нужно.
INSERT INTO modules (id, name, version, manifest, source, trusted, server, enabled, sort_order) VALUES
 ('bank','Копилка','1.0.0','{"color":"#ff4d6d","status":"active","wide":true,"roles":{"edit":["child"],"read":["child","parent"]}}','native',1,0,1,120)
ON DUPLICATE KEY UPDATE name=VALUES(name), version=VALUES(version), manifest=VALUES(manifest),
 server=VALUES(server), enabled=VALUES(enabled), sort_order=VALUES(sort_order), updated_at=NOW();
