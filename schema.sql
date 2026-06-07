-- ============================================================
-- RobTop — схема базы данных (MySQL / MariaDB, Hostinger)
-- Импортировать ОДИН РАЗ через phpMyAdmin в hPanel.
-- Кодировка utf8mb4 (полная поддержка русского и эмодзи).
-- ============================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- ---------- Пользователи (роли: ребёнок / родитель) ----------
CREATE TABLE IF NOT EXISTS users (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(60)  NOT NULL,
  role       ENUM('child','parent') NOT NULL DEFAULT 'child',
  pin_hash   VARCHAR(255) DEFAULT NULL,            -- для будущего входа по PIN
  theme      VARCHAR(20)  NOT NULL DEFAULT 'neon', -- тема оформления аккаунта (миграция 016)
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Желания (модуль «Виш-лист») ----------
CREATE TABLE IF NOT EXISTS wishlist_items (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED NOT NULL,
  title      VARCHAR(120) NOT NULL,
  note       VARCHAR(400) NOT NULL DEFAULT '',     -- «почему хочу»
  link       VARCHAR(500) NOT NULL DEFAULT '',
  photo      VARCHAR(255) DEFAULT NULL,            -- относительный путь к файлу, напр. uploads/users/1/wishlist/abc.jpg
  icon       VARCHAR(16)  DEFAULT NULL,            -- эмодзи-заглушка
  favorite   TINYINT(1)   NOT NULL DEFAULT 0,      -- «очень хочу»
  status     ENUM('want','thinking','bought') NOT NULL DEFAULT 'want',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  bought_at  DATETIME DEFAULT NULL,                -- последняя покупка
  deleted_at DATETIME DEFAULT NULL,                -- мягкое удаление (статистику не теряем)
  PRIMARY KEY (id),
  KEY idx_user_status  (user_id, status),
  KEY idx_user_deleted (user_id, deleted_at),
  CONSTRAINT fk_items_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Журнал событий (аналитика для ВСЕХ модулей) ----------
-- Это главная таблица для будущих дашбордов. Любое действие в любом
-- модуле пишет сюда строку. Денормализованный item_title сохраняет
-- статистику даже после удаления желания.
CREATE TABLE IF NOT EXISTS events (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED DEFAULT NULL,
  module      VARCHAR(40)  NOT NULL DEFAULT 'wishlist',
  item_id     BIGINT UNSIGNED DEFAULT NULL,
  item_title  VARCHAR(160) DEFAULT NULL,
  type        VARCHAR(40)  NOT NULL,               -- created, changed_mind, purchased, back_to_want, edited, favorite, unfavorite, deleted, restored, undo, opened_module, viewed_detail, viewed_stats ...
  from_status VARCHAR(20)  DEFAULT NULL,
  to_status   VARCHAR(20)  DEFAULT NULL,
  meta        JSON         DEFAULT NULL,           -- любые доп. данные (на MariaDB хранится как LONGTEXT)
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_module_type (module, type),
  KEY idx_created     (created_at),
  KEY idx_item        (item_id),
  KEY idx_user        (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Реестр загруженных файлов (медиа на диске, путь — в БД) ----------
-- Сразу с user_id, чтобы не переделывать при добавлении реальных пользователей.
CREATE TABLE IF NOT EXISTS uploaded_files (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED NOT NULL,
  module     VARCHAR(40)  NOT NULL DEFAULT 'wishlist',
  item_id    BIGINT UNSIGNED DEFAULT NULL,
  path       VARCHAR(255) NOT NULL,               -- напр. uploads/users/1/wishlist/abc.jpg
  mime       VARCHAR(60)  DEFAULT NULL,
  size       INT UNSIGNED DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_user (user_id),
  KEY idx_item (item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Дефолтные пользователи ----------
-- ВРЕМЕННЫЙ однопользовательский режим: всё принадлежит Артёму (id 1).
-- В коде текущий пользователь определяется одной функцией rt_user_id() (см. _bootstrap.php).
-- Артём (ребёнок) — id 1. Родитель — id 2 (пригодится позже).
INSERT INTO users (id, name, role) VALUES
  (1, 'Артём',   'child'),
  (2, 'Родитель','parent')
ON DUPLICATE KEY UPDATE name = VALUES(name), role = VALUES(role);

-- ============================================================
-- Полезные запросы для будущих дашбордов (примеры, выполнять не нужно):
--
-- Воронка желаний:
--   SELECT status, COUNT(*) FROM wishlist_items WHERE deleted_at IS NULL GROUP BY status;
--
-- Сколько раз передумал по каждому желанию:
--   SELECT item_title, COUNT(*) FROM events WHERE type='changed_mind' GROUP BY item_id ORDER BY 2 DESC;
--
-- Активность по дням (для графика):
--   SELECT DATE(created_at) d, COUNT(*) FROM events GROUP BY d ORDER BY d;
--
-- Среднее время от добавления до покупки (дни):
--   SELECT AVG(DATEDIFF(bought_at, created_at)) FROM wishlist_items WHERE bought_at IS NOT NULL;
-- ============================================================

-- ============================================================
-- АРХИТЕКТУРА СУБПРИЛОЖЕНИЙ (добавлено 2026-06): реестр модулей + универсальное хранилище.
-- Аддитивно: существующие таблицы выше НЕ меняются.
-- ============================================================

-- ---------- Реестр модулей (источник главного экрана и магазина) ----------
CREATE TABLE IF NOT EXISTS modules (
  id          VARCHAR(40)  NOT NULL,                 -- slug, напр. 'wishlist'
  name        VARCHAR(80)  NOT NULL,
  version     VARCHAR(20)  NOT NULL DEFAULT '1.0.0',
  manifest    JSON         DEFAULT NULL,             -- копия module.json (color/icon/status/roles/wide…)
  source      ENUM('native','installed') NOT NULL DEFAULT 'native',
  trusted     TINYINT(1)   NOT NULL DEFAULT 0,
  server      TINYINT(1)   NOT NULL DEFAULT 0,       -- есть ли серверный api.php
  enabled     TINYINT(1)   NOT NULL DEFAULT 0,
  sort_order  INT          NOT NULL DEFAULT 100,
  installed_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at  DATETIME     DEFAULT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Универсальное хранилище данных модулей ----------
-- Новому приложению (generic) не нужна отдельная таблица: данные лежат здесь как JSON.
CREATE TABLE IF NOT EXISTS module_data (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NOT NULL,
  module      VARCHAR(40)  NOT NULL,
  collection  VARCHAR(40)  NOT NULL DEFAULT 'default',
  status      VARCHAR(24)  NOT NULL DEFAULT '',
  favorite    TINYINT(1)   NOT NULL DEFAULT 0,
  sort        INT          NOT NULL DEFAULT 0,
  data        JSON         DEFAULT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at  DATETIME     DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_scope  (user_id, module, collection, deleted_at),
  KEY idx_status (user_id, module, status),
  CONSTRAINT fk_md_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Оповещения (ядро; миграция 020, ГАЙД-оповещения.md) ----------
-- Одна строка = одно оповещение одному получателю; текст собирает клиент
-- (ntf.ev.<src>.<type> в core/notify.js), кап 100/получателя держит rt_notify().
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

-- ---------- Подписки Web Push (PWA; миграция 021) ----------
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

-- ---------- Заполнение реестра родными модулями ----------
INSERT INTO modules (id, name, version, manifest, source, trusted, server, enabled, sort_order) VALUES
 ('wishlist','Виш-лист','2.0.0','{"color":"#ff3db0","status":"active","wide":false,"roles":{"edit":["child"],"read":["child","parent"]}}','native',1,1,1,10),
 ('reverse','Слова наоборот','1.0.0','{"color":"#ff7a3d","status":"active","wide":false,"roles":{"edit":["child"],"read":["child","parent"]}}','native',1,0,1,20),
 ('mood','Настроение дня','1.0.0','{"color":"#ffd23b","status":"active","wide":false,"roles":{"edit":["child"],"read":["child","parent"]}}','native',1,0,1,30),
 ('teeth','Таймер чистки зубов','1.0.0','{"color":"#19e3ff","status":"active","roles":{"edit":["child"],"read":["child","parent"]}}','native',1,0,1,40),
 ('guess','Угадай число','1.0.0','{"color":"#a64bff","status":"active","wide":false,"roles":{"edit":["child"],"read":["child","parent"]}}','native',1,0,1,50),
 ('names','Смешные имена','1.0.0','{"color":"#38e8a0","status":"active","wide":false,"roles":{"edit":["child"],"read":["child","parent"]}}','native',1,0,1,60),
 ('days','Счётчик дней','1.0.0','{"color":"#3b6bff","status":"soon"}','native',1,0,1,70),
 ('find','Найти предмет','1.0.0','{"color":"#19e3ff","status":"soon"}','native',1,0,1,80),
 ('museum','Домашний музей','1.0.0','{"color":"#c0a0ff","status":"soon"}','native',1,0,1,90),
 ('rating','Оценка дня','1.0.0','{"color":"#ffd23b","status":"active","wide":false,"roles":{"edit":["child"],"read":["child","parent"]}}','native',1,0,1,100),
 ('lost','Бюро находок','1.0.0','{"color":"#2bf0c0","status":"soon"}','native',1,0,1,110),
 ('walk','Прогулка','1.2.0','{"color":"#38e8a0","status":"active","wide":false,"familyPool":true,"roles":{"edit":["child","parent"],"read":["child","parent"]}}','native',1,0,1,115),
 ('snake','Змейка','1.0.0','{"color":"#19e3ff","status":"active","wide":false,"roles":{"edit":["child"],"read":["child","parent"]}}','native',1,0,1,117),
 ('bank','Копилка','1.0.0','{"color":"#ff4d6d","status":"active","wide":true,"roles":{"edit":["child","parent"],"read":["child","parent"]}}','native',1,0,1,120),
 ('shop','Магазин','1.0.0','{"color":"#ff2bd6","status":"active","wide":false,"roles":{"edit":["child","parent"],"read":["child","parent"]}}','native',1,0,1,130)
ON DUPLICATE KEY UPDATE name=VALUES(name), manifest=VALUES(manifest), server=VALUES(server), updated_at=NOW();
-- ============================================================
