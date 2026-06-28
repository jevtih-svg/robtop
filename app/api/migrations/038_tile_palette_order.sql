-- 038: главный экран — новая палитра и порядок плиток по ТЗ 2026-06-28.
-- Цвета: names -> neon orange, guess -> blue, find -> purple, museum -> grey-purple.
-- Порядок плиток (bank/chat остаются вкладками нижнего меню и не участвуют в сетке):
-- wishlist, shop, reverse, names, mood, rating, walk, lost, teeth, snake, days,
-- seabattle, find, guess, friends, museum.

UPDATE modules
   SET manifest = JSON_SET(manifest, '$.color', '#ff3db0'), sort_order = 10, updated_at = NOW()
 WHERE id = 'wishlist';
UPDATE modules
   SET manifest = JSON_SET(manifest, '$.color', '#ff2bd6'), sort_order = 20, updated_at = NOW()
 WHERE id = 'shop';
UPDATE modules
   SET manifest = JSON_SET(manifest, '$.color', '#ff7a3d'), sort_order = 30, updated_at = NOW()
 WHERE id = 'reverse';
UPDATE modules
   SET manifest = JSON_SET(manifest, '$.color', '#ff8a1f'), sort_order = 40, updated_at = NOW()
 WHERE id = 'names';
UPDATE modules
   SET manifest = JSON_SET(manifest, '$.color', '#ffd23b'), sort_order = 50, updated_at = NOW()
 WHERE id = 'mood';
UPDATE modules
   SET manifest = JSON_SET(manifest, '$.color', '#ffd23b'), sort_order = 60, updated_at = NOW()
 WHERE id = 'rating';
UPDATE modules
   SET manifest = JSON_SET(manifest, '$.color', '#38e8a0'), sort_order = 70, updated_at = NOW()
 WHERE id = 'walk';
UPDATE modules
   SET manifest = JSON_SET(manifest, '$.color', '#2bf0c0'), sort_order = 80, updated_at = NOW()
 WHERE id = 'lost';
UPDATE modules
   SET manifest = JSON_SET(manifest, '$.color', '#19e3ff'), sort_order = 90, updated_at = NOW()
 WHERE id = 'teeth';
UPDATE modules
   SET manifest = JSON_SET(manifest, '$.color', '#19e3ff'), sort_order = 100, updated_at = NOW()
 WHERE id = 'snake';
UPDATE modules
   SET manifest = JSON_SET(manifest, '$.color', '#3b6bff'), sort_order = 110, updated_at = NOW()
 WHERE id = 'days';
UPDATE modules
   SET manifest = JSON_SET(manifest, '$.color', '#3b6bff'), sort_order = 120, updated_at = NOW()
 WHERE id = 'seabattle';
UPDATE modules
   SET manifest = JSON_SET(manifest, '$.color', '#a64bff'), sort_order = 130, updated_at = NOW()
 WHERE id = 'find';
UPDATE modules
   SET manifest = JSON_SET(manifest, '$.color', '#3b6bff'), sort_order = 140, updated_at = NOW()
 WHERE id = 'guess';
UPDATE modules
   SET manifest = JSON_SET(manifest, '$.color', '#c08bff'), sort_order = 150, updated_at = NOW()
 WHERE id = 'friends';
UPDATE modules
   SET manifest = JSON_SET(manifest, '$.color', '#8f86b8'), sort_order = 160, updated_at = NOW()
 WHERE id = 'museum';

-- Личный drag-order сильнее глобального sort_order. Сбрасываем только порядок, скрытые плитки не трогаем.
UPDATE user_prefs SET tile_order = NULL WHERE tile_order IS NOT NULL;
