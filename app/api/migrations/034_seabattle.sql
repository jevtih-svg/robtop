-- 034: модуль «Морской бой» (seabattle) — новая плитка-игра для ребёнка И родителя.
-- Данные в module_data (generic-стор: matches, fleets, history), своя таблица не нужна.
-- familyPool: семейный матч на два устройства — записи видят и пишут все члены семьи.
-- roles.edit включает parent: родитель полноценно играет (бот, hot-seat, семейный матч).
INSERT INTO modules (id, name, version, manifest, source, trusted, server, enabled, sort_order) VALUES
 ('seabattle','Морской бой','1.0.0','{"color":"#3b6bff","status":"active","wide":false,"familyPool":true,"roles":{"edit":["child","parent"],"read":["child","parent"]},"permissions":["points"]}','native',1,0,1,140)
ON DUPLICATE KEY UPDATE name=VALUES(name), version=VALUES(version), manifest=VALUES(manifest),
 server=VALUES(server), enabled=VALUES(enabled), sort_order=VALUES(sort_order), updated_at=NOW();
