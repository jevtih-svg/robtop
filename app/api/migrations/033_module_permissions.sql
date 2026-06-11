-- 033 (2026-06-11): persist runtime permissions added by the OS refactor.
-- Existing installations may have modules.manifest rows from older migrations without
-- "permissions"; without this field sdk.media.upload()/pick() denies image uploads.

UPDATE modules
   SET manifest = JSON_SET(COALESCE(manifest, JSON_OBJECT()), '$.permissions', JSON_ARRAY('camera')),
       updated_at = NOW()
 WHERE id IN ('wishlist','mood','rating','chat');

UPDATE modules
   SET manifest = JSON_SET(COALESCE(manifest, JSON_OBJECT()), '$.permissions', JSON_ARRAY('points','camera')),
       updated_at = NOW()
 WHERE id IN ('find','walk','shop');

UPDATE modules
   SET manifest = JSON_SET(COALESCE(manifest, JSON_OBJECT()), '$.permissions', JSON_ARRAY('points')),
       updated_at = NOW()
 WHERE id IN ('bank','guess','snake');

UPDATE modules
   SET manifest = JSON_SET(COALESCE(manifest, JSON_OBJECT()), '$.permissions', JSON_ARRAY('notifications','points')),
       updated_at = NOW()
 WHERE id = 'teeth';
