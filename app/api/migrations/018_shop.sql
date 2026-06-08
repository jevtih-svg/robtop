INSERT INTO modules (id, name, version, manifest, source, trusted, server, enabled, sort_order) VALUES
 ('shop','Магазин','1.0.0','{"color":"#ff2bd6","status":"active","wide":false,"familyCollections":["items"],"roles":{"edit":["child","parent"],"read":["child","parent"]}}','native',1,0,1,130)
ON DUPLICATE KEY UPDATE name=VALUES(name), version=VALUES(version), manifest=VALUES(manifest),
 server=VALUES(server), enabled=VALUES(enabled), sort_order=VALUES(sort_order), updated_at=NOW();
