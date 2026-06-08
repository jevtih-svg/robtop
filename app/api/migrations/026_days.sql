INSERT INTO modules (id, name, version, manifest, source, trusted, server, enabled, sort_order) VALUES
 ('days','Счётчик дней','1.0.0','{"color":"#3b6bff","status":"active","wide":false,"roles":{"edit":["child"],"read":["child","parent"]}}','native',1,0,1,70)
ON DUPLICATE KEY UPDATE name=VALUES(name), version=VALUES(version), manifest=VALUES(manifest),
 server=VALUES(server), enabled=VALUES(enabled), sort_order=VALUES(sort_order), updated_at=NOW();
