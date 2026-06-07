-- 008: мастер-админка. Флаг админа (отдельная таблица-спутник, без ALTER) и баны.
-- Правила раннера: идемпотентные стейтменты, разделитель ';', комментарии только полной строкой.

CREATE TABLE IF NOT EXISTS admins (
  user_id INT UNSIGNED NOT NULL,
  status ENUM('active','revoked') NOT NULL DEFAULT 'active',
  granted_by INT UNSIGNED DEFAULT NULL,
  granted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at DATETIME DEFAULT NULL,
  PRIMARY KEY (user_id)
);

-- Баны: kind='family' (family_id) и kind='email' (email_hash = sha256 нормализованного email,
-- блокирует ПОВТОРНУЮ регистрацию; сам email не дублируем). lifted_at NULL = бан действует.
CREATE TABLE IF NOT EXISTS bans (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  kind ENUM('family','email') NOT NULL,
  family_id INT UNSIGNED DEFAULT NULL,
  email_hash CHAR(64) DEFAULT NULL,
  reason VARCHAR(200) NOT NULL DEFAULT '',
  created_by INT UNSIGNED DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  lifted_at DATETIME DEFAULT NULL,
  lifted_by INT UNSIGNED DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_bans_email (email_hash),
  KEY idx_bans_family (family_id)
);
