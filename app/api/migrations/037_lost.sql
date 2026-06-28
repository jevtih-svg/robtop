-- 037: «Бюро находок» (lost) — плановая плитка из 002_subapps.sql переводится из status:"soon" в active.
-- Находка = карточка (фото камерой → название → где → кто → описание), generic-стор module_data
-- (коллекция lost/finds), общесемейный пул (familyPool: добавляют и видят все члены семьи, как walk).
-- Очков нет, сервер не нужен. Идемпотентно: повторный прогон лишь переустановит те же значения.
INSERT INTO modules (id, name, version, manifest, source, trusted, server, enabled, sort_order) VALUES
 ('lost','Бюро находок','1.0.0','{"color":"#2bf0c0","status":"active","wide":false,"familyPool":true,"roles":{"edit":["child","parent"],"read":["child","parent"]},"permissions":["camera"]}','native',1,0,1,110)
ON DUPLICATE KEY UPDATE name=VALUES(name), version=VALUES(version), manifest=VALUES(manifest),
 server=VALUES(server), enabled=VALUES(enabled), sort_order=VALUES(sort_order), updated_at=NOW();
