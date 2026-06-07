-- 017: «Прогулка» v1.2.0 — ОБЩЕСЕМЕЙНЫЙ пул + важные события + 15-минутный шаг времени.
-- Манифест получает "familyPool":true: data.php скоупит ЛЮБУЮ роль (родителей И каждого
-- ребёнка семьи) на канонического владельца (первый ребёнок семьи) — все видят все прогулки,
-- события поведения и важные события (вет, день рождения…; новые коллекции walk/events,
-- walk/eventTypes в том же generic-сторе, таблиц не нужно).
UPDATE modules SET version='1.2.0',
 manifest='{"color":"#38e8a0","status":"active","wide":false,"familyPool":true,"roles":{"edit":["child","parent"],"read":["child","parent"]}}',
 updated_at=NOW()
WHERE id='walk';
