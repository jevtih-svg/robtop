-- 035: «Морской бой» v1.1 (фидбек Джеффа 2026-06-12): игра БЕЗ очков — permissions пуст
-- (тарифы seabattle_win/seabattle_loss упразднены в api/_points.php); вместо мотивации —
-- родительский перерыв между локальными играми (module_data seabattle/meta.cooldownMin).
INSERT INTO modules (id, name, version, manifest, source, trusted, server, enabled, sort_order) VALUES
 ('seabattle','Морской бой','1.1.1','{"color":"#3b6bff","status":"active","wide":false,"familyPool":true,"roles":{"edit":["child","parent"],"read":["child","parent"]},"permissions":[]}','native',1,0,1,140)
ON DUPLICATE KEY UPDATE name=VALUES(name), version=VALUES(version), manifest=VALUES(manifest),
 server=VALUES(server), enabled=VALUES(enabled), sort_order=VALUES(sort_order), updated_at=NOW();
