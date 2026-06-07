-- 015: тикеты поддержки («Сообщить о проблеме»).
-- Любой вошедший пользователь (ребёнок или родитель) создаёт обращение; админ отвечает
-- из admin.html, репортёр читает и отвечает в Настройки → Помощь. Переписка двусторонняя.
-- 1) tickets — шапка обращения: автор, тема (первые слова первого сообщения), источник
--    (settings или module:<id> — кнопка под «Добавить фото»), статус open|closed,
--    два флага непрочитанного: user_unread (репортёру есть что читать) и admin_unread (админу).
-- 2) ticket_messages — сообщения переписки; is_admin=1 у ответов админа (author_id = админ).
-- Удаления нет: закрытый тикет можно переоткрыть ответом (история не теряется).

CREATE TABLE IF NOT EXISTS tickets (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  subject VARCHAR(120) NOT NULL DEFAULT '',
  source VARCHAR(40) NOT NULL DEFAULT 'settings',
  status ENUM('open','closed') NOT NULL DEFAULT 'open',
  user_unread TINYINT(1) NOT NULL DEFAULT 0,
  admin_unread TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_tickets_user (user_id, status, updated_at),
  KEY idx_tickets_admin (status, admin_unread, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ticket_messages (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_id INT UNSIGNED NOT NULL,
  author_id INT UNSIGNED NOT NULL,
  is_admin TINYINT(1) NOT NULL DEFAULT 0,
  body TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tmsg_ticket (ticket_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
