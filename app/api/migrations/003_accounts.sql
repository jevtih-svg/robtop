CREATE TABLE IF NOT EXISTS accounts (
  user_id INT UNSIGNED NOT NULL,
  kind ENUM('parent','child') NOT NULL DEFAULT 'child',
  email VARCHAR(190) DEFAULT NULL,
  password_hash VARCHAR(255) DEFAULT NULL,
  must_change_password TINYINT(1) NOT NULL DEFAULT 0,
  status ENUM('active','disabled') NOT NULL DEFAULT 'active',
  invited_by INT UNSIGNED DEFAULT NULL,
  last_login_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_account_email (email),
  KEY idx_account_kind (kind),
  CONSTRAINT fk_acc_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS families (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_id INT UNSIGNED NOT NULL,
  label VARCHAR(40) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_family_owner (owner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS family_members (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  family_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  role ENUM('owner','parent','child') NOT NULL DEFAULT 'child',
  joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status ENUM('active','disabled') NOT NULL DEFAULT 'active',
  PRIMARY KEY (id),
  UNIQUE KEY uq_family_user (family_id, user_id),
  KEY idx_fm_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS guardianships (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  child_user_id INT UNSIGNED NOT NULL,
  guardian_user_id INT UNSIGNED NOT NULL,
  family_id INT UNSIGNED DEFAULT NULL,
  type ENUM('primary','provisional') NOT NULL,
  status ENUM('active','severed') NOT NULL DEFAULT 'active',
  source ENUM('created','child_invite','transfer') NOT NULL DEFAULT 'created',
  source_invitation_id BIGINT UNSIGNED DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  severed_at DATETIME DEFAULT NULL,
  sever_reason VARCHAR(60) DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_guard_child (child_user_id, status),
  KEY idx_guard_parent (guardian_user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invitations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  type ENUM('add_child','co_parent','transfer_child','child_to_child') NOT NULL,
  inviter_id INT UNSIGNED NOT NULL,
  family_id INT UNSIGNED DEFAULT NULL,
  target_child_id INT UNSIGNED DEFAULT NULL,
  email VARCHAR(190) DEFAULT NULL,
  token_hash CHAR(64) NOT NULL,
  status ENUM('pending','accepted','declined','revoked','expired') NOT NULL DEFAULT 'pending',
  invited_user_id INT UNSIGNED DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  accepted_at DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_inv_token (token_hash),
  KEY idx_inv_inviter (inviter_id),
  KEY idx_inv_type (type),
  KEY idx_inv_email (email),
  KEY idx_inv_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  last_seen DATETIME DEFAULT NULL,
  user_agent VARCHAR(200) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sess_token (token_hash),
  KEY idx_sess_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_resets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  used_at DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pr_token (token_hash),
  KEY idx_pr_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO accounts (user_id, kind, status, must_change_password) VALUES (1, 'child', 'active', 0), (2, 'parent', 'active', 0)
ON DUPLICATE KEY UPDATE kind = VALUES(kind), status = VALUES(status);

INSERT INTO families (id, owner_id, label) VALUES (1, 2, 'Семья')
ON DUPLICATE KEY UPDATE owner_id = VALUES(owner_id);

INSERT IGNORE INTO family_members (family_id, user_id, role) VALUES (1, 2, 'owner'), (1, 1, 'child');

INSERT INTO guardianships (id, child_user_id, guardian_user_id, family_id, type, status, source) VALUES (1, 1, 2, 1, 'primary', 'active', 'created')
ON DUPLICATE KEY UPDATE child_user_id = VALUES(child_user_id), guardian_user_id = VALUES(guardian_user_id);
