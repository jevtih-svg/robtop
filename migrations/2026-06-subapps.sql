-- RobTop — миграция БД: архитектура субприложений (магазин приложений).
-- Применить ОДИН РАЗ на боевой базе через phpMyAdmin (hPanel).
-- Аддитивно и идемпотентно: существующие таблицы не меняются, повторный запуск безопасен.

SET NAMES utf8mb4;

-- Реестр модулей (источник главного экрана и магазина)
CREATE TABLE IF NOT EXISTS modules (
  id          VARCHAR(40)  NOT NULL,
  name        VARCHAR(80)  NOT NULL,
  version     VARCHAR(20)  NOT NULL DEFAULT '1.0.0',
  manifest    JSON         DEFAULT NULL,
  source      ENUM('native','installed') NOT NULL DEFAULT 'native',
  trusted     TINYINT(1)   NOT NULL DEFAULT 0,
  server      TINYINT(1)   NOT NULL DEFAULT 0,
  enabled     TINYINT(1)   NOT NULL DEFAULT 0,
  sort_order  INT          NOT NULL DEFAULT 100,
  installed_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at  DATETIME     DEFAULT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Универсальное хранилище данных модулей
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

-- Заполнение реестра родными модулями (wishlist и reverse активны, прочие «скоро»)
INSERT INTO modules (id, name, version, manifest, source, trusted, server, enabled, sort_order) VALUES
 ('wishlist','Виш-лист','2.0.0','{"color":"#ff3db0","status":"active","wide":false,"roles":{"edit":["child"],"read":["child","parent"]}}','native',1,1,1,10),
 ('reverse','Слова наоборот','1.0.0','{"color":"#ff7a3d","status":"active","wide":false,"roles":{"edit":["child"],"read":["child","parent"]}}','native',1,0,1,20),
 ('mood','Настроение дня','1.0.0','{"color":"#ffd23b","status":"soon"}','native',1,0,1,30),
 ('teeth','Таймер чистки зубов','1.0.0','{"color":"#19e3ff","status":"active","roles":{"edit":["child"],"read":["child","parent"]}}','native',1,0,1,40),
 ('guess','Угадай число','1.0.0','{"color":"#a64bff","status":"soon"}','native',1,0,1,50),
 ('names','Смешные имена','1.0.0','{"color":"#38e8a0","status":"soon"}','native',1,0,1,60),
 ('days','Счётчик дней','1.0.0','{"color":"#3b6bff","status":"soon"}','native',1,0,1,70),
 ('find','Найти предмет','1.0.0','{"color":"#19e3ff","status":"soon"}','native',1,0,1,80),
 ('museum','Домашний музей','1.0.0','{"color":"#c0a0ff","status":"soon"}','native',1,0,1,90),
 ('rating','Оценка дня','1.0.0','{"color":"#ffd23b","status":"soon"}','native',1,0,1,100),
 ('lost','Бюро находок','1.0.0','{"color":"#2bf0c0","status":"soon"}','native',1,0,1,110),
 ('bank','Копилка','1.0.0','{"color":"#ff4d6d","status":"soon","wide":true}','native',1,0,1,120)
ON DUPLICATE KEY UPDATE name=VALUES(name), manifest=VALUES(manifest), server=VALUES(server), updated_at=NOW();
