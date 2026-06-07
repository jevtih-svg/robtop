-- RobTop — схема модуля «Виш-лист» (родной, dedicated-таблица).
-- Уже входит в корневой schema.sql; дублируется здесь для самодостаточности модуля.
-- Кодировка utf8mb4.
--
-- Шаринг (2026-06-07): таблицы wishlist_share_settings (флаг «можно делиться», включает
-- только родитель) и wishlist_share_grants (адресные доступы пользователям платформы)
-- создаёт авто-миграция api/migrations/011_wishlist_share.sql — единственный источник DDL.

CREATE TABLE IF NOT EXISTS wishlist_items (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED NOT NULL,
  title      VARCHAR(120) NOT NULL,
  note       VARCHAR(400) NOT NULL DEFAULT '',
  link       VARCHAR(500) NOT NULL DEFAULT '',
  photo      VARCHAR(255) DEFAULT NULL,
  icon       VARCHAR(16)  DEFAULT NULL,
  favorite   TINYINT(1)   NOT NULL DEFAULT 0,
  status     ENUM('want','thinking','bought') NOT NULL DEFAULT 'want',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  bought_at  DATETIME DEFAULT NULL,
  deleted_at DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_user_status  (user_id, status),
  KEY idx_user_deleted (user_id, deleted_at),
  CONSTRAINT fk_items_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
