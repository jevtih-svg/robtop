-- 030_auth_throttle.sql — троттлинг авторизации (брутфорс логина/сброса/приглашений).
-- Идемпотентно (CREATE TABLE IF NOT EXISTS). Применяется авто-миграцией (_migrate.php).

CREATE TABLE IF NOT EXISTS auth_attempts (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  scope        VARCHAR(24)  NOT NULL,            -- login_ip | login_acc | reset_ip | token_ip
  key_hash     CHAR(64)     NOT NULL,            -- sha256(scope|значение): IP или логин/аккаунт
  fails        INT          NOT NULL DEFAULT 0,
  first_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  locked_until DATETIME     NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_scope_key (scope, key_hash),
  KEY idx_locked (locked_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
