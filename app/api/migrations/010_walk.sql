-- 010: «Прогулка» (walk) — новая активная плитка: фиксация прогулки с собакой
-- (длительность → оценка → команды/непослушание/фото), очки walk_done (+meta.reward).
-- Данные — generic-стор module_data (walk/entries, walk/commands, walk/issues, walk/meta): таблиц не нужно.
-- edit разрешён и родителю: data.php скоупит роль parent на ребёнка семьи (общий семейный пул).
INSERT INTO modules (id, name, version, manifest, source, trusted, server, enabled, sort_order) VALUES
 ('walk','Прогулка','1.0.0','{"color":"#38e8a0","status":"active","wide":false,"roles":{"edit":["child","parent"],"read":["child","parent"]}}','native',1,0,1,115)
ON DUPLICATE KEY UPDATE name=VALUES(name), version=VALUES(version), manifest=VALUES(manifest),
 server=VALUES(server), enabled=VALUES(enabled), sort_order=VALUES(sort_order), updated_at=NOW();

-- Копилке разрешается запись от родителя: панель родителя и очки за прогулку, записанную родителем,
-- идут в общий леджер ребёнка (раньше роль parent получала 403 на запись в bank/*).
UPDATE modules SET
 manifest='{"color":"#ff4d6d","status":"active","wide":true,"roles":{"edit":["child","parent"],"read":["child","parent"]}}',
 updated_at=NOW()
WHERE id='bank';
