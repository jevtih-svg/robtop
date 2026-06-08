-- 028: реестр модуля «Друзья» (friends). Generic-стор (коллекция friends), без своей таблицы данных.
-- (026/027 заняли параллельные сессии days/chat — номер сверен по ls.)
-- Идемпотентно: новый id вставится, повторный прогон обновит поля (ON DUPLICATE KEY UPDATE).
INSERT INTO modules (id, name, version, manifest, source, trusted, server, enabled, sort_order) VALUES
 ('friends','Друзья','1.0.0','{"color":"#c08bff","status":"active","wide":false,"roles":{"edit":["child"],"read":["child","parent"]}}','native',1,0,1,105)
ON DUPLICATE KEY UPDATE name=VALUES(name), version=VALUES(version), manifest=VALUES(manifest),
 server=VALUES(server), enabled=VALUES(enabled), sort_order=VALUES(sort_order), updated_at=NOW();
