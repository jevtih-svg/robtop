-- 013: «Змейка» (snake) — новая активная плитка: игра Snake II как на Nokia 3310, но цветная.
-- Поле со сквозными краями, скорость 1–9 (очки за еду = уровень), бонус-жучок каждые 5 еды;
-- новый рекорд = +10 в копилку одной транзакцией (reason snake_record, ГАЙД-очки.md §4).
-- Данные — generic-стор module_data (snake/games, snake/meta): собственных таблиц не нужно.
INSERT INTO modules (id, name, version, manifest, source, trusted, server, enabled, sort_order) VALUES
 ('snake','Змейка','1.0.0','{"color":"#19e3ff","status":"active","wide":false,"roles":{"edit":["child"],"read":["child","parent"]}}','native',1,0,1,117)
ON DUPLICATE KEY UPDATE name=VALUES(name), version=VALUES(version), manifest=VALUES(manifest),
 server=VALUES(server), enabled=VALUES(enabled), sort_order=VALUES(sort_order), updated_at=NOW();
