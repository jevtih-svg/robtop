-- 009: мульти-аккаунты на одном устройстве (быстрое переключение без пароля).
-- Длинный токен живёт в localStorage устройства, в БД — только sha256-хэш.
-- Обменивается на свежую сессию (op switch); сам по себе доступа к API не даёт.

CREATE TABLE IF NOT EXISTS switch_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at DATETIME DEFAULT NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_switch_token (token_hash),
  KEY idx_switch_user (user_id)
);
