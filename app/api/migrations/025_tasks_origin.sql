-- 025: поле origin у заданий — кто создал задание (канон — ГАЙД-задания.md, рефактор 2026-06-08).
-- 'parent' — родитель назначил задание ребёнку (как было); 'child' — РЕБЁНОК сам «залогировал»
-- сделанное дело с предложенными очками, ждёт ревью родителя (новый поток «предложение»).
-- Различение по origin + status='pending': completion-check (origin=parent) vs предложение
-- (origin=child). approve у предложения может ПОПРАВИТЬ очки; deny у предложения — удаляет.
-- ALTER (как 016_themes / 022_tile_hidden): применяется один раз, фиксируется в schema_migrations.
ALTER TABLE tasks ADD COLUMN origin VARCHAR(10) NOT NULL DEFAULT 'parent';
