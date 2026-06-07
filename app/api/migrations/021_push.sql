-- 021: подписки Web Push (PWA). Канон — ГАЙД-оповещения.md, раздел «Web Push».
-- Один endpoint = одно устройство/браузер. endpoint_hash уникален глобально --
-- при смене аккаунта на устройстве подписка переподвязывается на последний
-- включивший аккаунт (upsert в api/push.php). p256dh/auth хранятся на будущее
-- (payload-пуши), сейчас рассылка идёт «звонком» без тела. Идемпотентно.
CREATE TABLE IF NOT EXISTS push_subs (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  endpoint VARCHAR(500) NOT NULL,
  endpoint_hash CHAR(64) NOT NULL,
  p256dh VARCHAR(120) NULL,
  auth VARCHAR(40) NULL,
  lang VARCHAR(5) NOT NULL DEFAULT 'en',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_endpoint (endpoint_hash),
  KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
