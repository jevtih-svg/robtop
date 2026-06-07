-- 012: личный порядок плиток (скрытый реордер long-press → jiggle, 2026-06-07).
-- user_prefs — персональные настройки интерфейса НА АККАУНТ (не на семью):
--   ребёнок двигает плитки своего главного экрана, родитель — карточки «По приложениям»
--   в своём дашборде; друг другу не мешают. Глобальный порядок по умолчанию остаётся
--   в modules.sort_order (магазин, ▲▼) и работает для всех, у кого нет своего порядка.
-- tile_order — JSON-массив id модулей в выбранном порядке; NULL = порядок по умолчанию.
-- Отдельная таблица (а не колонка в users) — идемпотентный CREATE и место под будущие
-- персональные настройки.

CREATE TABLE IF NOT EXISTS user_prefs (
  user_id INT UNSIGNED NOT NULL,
  tile_order TEXT DEFAULT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_prefs_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
