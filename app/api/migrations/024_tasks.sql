-- 024: «Задания» — ОБЩИЙ сервис заданий от родителей (канон — ГАЙД-задания.md).
-- Отдельная таблица tasks вместо generic-стора bank/tasks: один источник правды,
-- два UI (Копилка и модуль «Задания») реплицируют друг друга через api/tasks.php + sdk.tasks.
-- Старые строки из module_data (bank/tasks) переносит ЛЕНИВЫЙ бэкфилл api/tasks.php (PHP,
-- не SQL: без JSON-функций — раннер миграций не рискует упасть на хостинге).
-- Старые строки module_data НЕ трогаем (аддитивность): они становятся неживой историей.

CREATE TABLE IF NOT EXISTS tasks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  title VARCHAR(120) NOT NULL DEFAULT '',
  points INT NOT NULL DEFAULT 10,
  type VARCHAR(10) NOT NULL DEFAULT 'recur',
  status VARCHAR(12) NOT NULL DEFAULT 'active',
  times_done INT UNSIGNED NOT NULL DEFAULT 0,
  last_done_at DATETIME DEFAULT NULL,
  claimed_at DATETIME DEFAULT NULL,
  done_at DATETIME DEFAULT NULL,
  created_by INT UNSIGNED DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_tasks_user (user_id, deleted_at, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO modules (id, name, version, manifest, source, trusted, server, enabled, sort_order) VALUES
 ('tasks','Задания','1.0.0','{"color":"#2bf0c0","status":"active","wide":false,"roles":{"edit":["child","parent"],"read":["child","parent"]}}','native',1,0,1,118)
ON DUPLICATE KEY UPDATE name=VALUES(name), version=VALUES(version), manifest=VALUES(manifest),
 server=VALUES(server), enabled=VALUES(enabled), sort_order=VALUES(sort_order), updated_at=NOW();
