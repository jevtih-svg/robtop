-- 020: система оповещений (ядро оболочки). Канон — ГАЙД-оповещения.md.
-- Одна строка = одно оповещение одному получателю. Текст собирает КЛИЕНТ по ключу
-- ntf.ev.<src>.<type> (core/notify.js) из params -- в БД только параметры и ссылка.
-- Кап 100 строк на получателя держит rt_notify() при вставке. Идемпотентно.
CREATE TABLE IF NOT EXISTS notifications (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  actor_id INT UNSIGNED NULL,
  src VARCHAR(40) NOT NULL DEFAULT 'system',
  type VARCHAR(40) NOT NULL,
  params TEXT NULL,
  link VARCHAR(255) NULL,
  read_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user (user_id, id),
  KEY idx_unread (user_id, read_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
