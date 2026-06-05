CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(60) NOT NULL,
  role ENUM('child','parent') NOT NULL DEFAULT 'child',
  pin_hash VARCHAR(255) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS wishlist_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  title VARCHAR(120) NOT NULL,
  note VARCHAR(400) NOT NULL DEFAULT '',
  link VARCHAR(500) NOT NULL DEFAULT '',
  photo VARCHAR(255) DEFAULT NULL,
  icon VARCHAR(16) DEFAULT NULL,
  favorite TINYINT(1) NOT NULL DEFAULT 0,
  status ENUM('want','thinking','bought') NOT NULL DEFAULT 'want',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  bought_at DATETIME DEFAULT NULL,
  deleted_at DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_user_status (user_id, status),
  KEY idx_user_deleted (user_id, deleted_at),
  CONSTRAINT fk_items_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED DEFAULT NULL,
  module VARCHAR(40) NOT NULL DEFAULT 'wishlist',
  item_id BIGINT UNSIGNED DEFAULT NULL,
  item_title VARCHAR(160) DEFAULT NULL,
  type VARCHAR(40) NOT NULL,
  from_status VARCHAR(20) DEFAULT NULL,
  to_status VARCHAR(20) DEFAULT NULL,
  meta JSON DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_module_type (module, type),
  KEY idx_created (created_at),
  KEY idx_item (item_id),
  KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS uploaded_files (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  module VARCHAR(40) NOT NULL DEFAULT 'wishlist',
  item_id BIGINT UNSIGNED DEFAULT NULL,
  path VARCHAR(255) NOT NULL,
  mime VARCHAR(60) DEFAULT NULL,
  size INT UNSIGNED DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_user (user_id),
  KEY idx_item (item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO users (id, name, role) VALUES
  (1, 'Артём', 'child'),
  (2, 'Родитель', 'parent')
ON DUPLICATE KEY UPDATE name=VALUES(name), role=VALUES(role);
