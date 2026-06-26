-- 036: «Прогулка» — бэкфилл общесемейного пула (фикс видимости истории).
-- Миграция 017 включила familyPool для walk (манифест), но НЕ перенесла уже
-- существующие записи module_data: они остались под личным user_id каждого участника.
-- Пуловое чтение в data.php смотрит ТОЛЬКО на канонического владельца (первый активный
-- ребёнок семьи), поэтому прежние прогулки не-канонических участников стали невидимы
-- всем: «ребёнок не видит даже свои исторические прогулки», «члены семьи не видят
-- прогулки друг друга». Здесь разово переселяем ВСЕ строки module_data модуля walk на
-- канонического владельца семьи (MIN(user_id) среди активных детей семьи) — ровно как
-- rt_family_pool_uid в _bootstrap.php. Автор каждой записи хранится в data.author и НЕ
-- меняется, поэтому «кто гулял» сохраняется. Покрывает все коллекции walk (entries,
-- behavior, events, eventTypes, care, meta, commands, issues), т.к. familyPool скоупит
-- модуль целиком. module_data не имеет уникальных ключей, FK ссылается на users(id) —
-- перенос user_id безопасен (коллизий нет, новый владелец — реальный активный ребёнок).
-- Идемпотентно: после переноса user_id уже равен каноническому и условие отсева делает
-- повтор no-op. Допущение: дети состоят в family_members (доминирующий путь рантайма);
-- семьи без активных детей пропускаются (как и фолбэк rt_family_pool_uid на свой uid).
UPDATE module_data AS md
JOIN family_members AS fm
  ON fm.user_id = md.user_id AND fm.status = 'active'
SET md.user_id = (
  SELECT MIN(c.user_id) FROM family_members AS c
  WHERE c.family_id = fm.family_id AND c.role = 'child' AND c.status = 'active'
)
WHERE md.module = 'walk'
  AND EXISTS (
    SELECT 1 FROM family_members AS c2
    WHERE c2.family_id = fm.family_id AND c2.role = 'child' AND c2.status = 'active'
  )
  AND md.user_id <> (
    SELECT MIN(c3.user_id) FROM family_members AS c3
    WHERE c3.family_id = fm.family_id AND c3.role = 'child' AND c3.status = 'active'
  );
