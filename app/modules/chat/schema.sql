-- RobTop — схема модуля «Чат» (родной, dedicated-таблицы).
-- Источник DDL — авто-миграция api/migrations/023_chat.sql (применяется сама);
-- здесь зеркало для самодостаточности модуля. Кодировка utf8mb4.
--
-- chat_threads  — тред (direct 1:1 с уникальным dkey "d:<family>:<min>:<max>" или group с названием),
--                 family_id скоупит чат на семью, updated_at двигает сортировку списка.
-- chat_members  — участники треда + last_read_id (личный маркер прочитанности).
-- chat_messages — сообщения: текст (≤1000) и/или фото (путь uploads/...); мягкое удаление
--                 deleted_at (плейсхолдер «удалено» у всех, файл фото стирается).

CREATE TABLE IF NOT EXISTS chat_threads (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  family_id INT UNSIGNED NOT NULL,
  kind ENUM('direct','group') NOT NULL DEFAULT 'direct',
  title VARCHAR(60) NOT NULL DEFAULT '',
  dkey VARCHAR(40) DEFAULT NULL,
  created_by INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_chat_dkey (dkey),
  KEY idx_chat_family (family_id, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_members (
  thread_id BIGINT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  last_read_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
  joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (thread_id, user_id),
  KEY idx_chat_member_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  thread_id BIGINT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  body VARCHAR(1000) NOT NULL DEFAULT '',
  photo VARCHAR(255) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_chat_msg_thread (thread_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
