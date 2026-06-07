INSERT INTO modules (id, name, version, manifest, source, trusted, server, enabled, sort_order) VALUES
 ('guess','Угадай число','1.0.0','{"color":"#a64bff","status":"active","wide":false,"roles":{"edit":["child"],"read":["child","parent"]}}','native',1,0,1,50)
ON DUPLICATE KEY UPDATE name=VALUES(name), version=VALUES(version), manifest=VALUES(manifest),
 server=VALUES(server), enabled=VALUES(enabled), sort_order=VALUES(sort_order), updated_at=NOW();
