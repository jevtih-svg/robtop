-- 011: шаринг Виш-листа + приглашение родителя ребёнком.
-- 1) wishlist_share_settings — флаг «можно делиться» на ребёнка. Включает ТОЛЬКО родитель
--    (primary-опекун или родитель семьи; provisional не может — правило фото §4.7).
--    Пока enabled=0: публичная страница 404, адресные доступы спят, у ребёнка вместо
--    шаринга — просьба родителю.
-- 2) wishlist_share_grants — адресные доступы «ребёнок поделился с пользователем платформы».
--    Уникальная пара владелец+получатель, повторный шаринг после отзыва — снятие revoked_at.
--    Индексы в обе стороны: рассчитано на много пользователей.
-- 3) invitations.type + 'child_invite_parent' — ребёнок без НАСТОЯЩЕГО родителя зовёт своего
--    родителя по email; принятие = новая семья + primary-опека (как transfer_child).

CREATE TABLE IF NOT EXISTS wishlist_share_settings (
  child_user_id INT UNSIGNED NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 0,
  enabled_by INT UNSIGNED DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (child_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS wishlist_share_grants (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_user_id INT UNSIGNED NOT NULL,
  grantee_user_id INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_share_pair (owner_user_id, grantee_user_id),
  KEY idx_share_grantee (grantee_user_id, revoked_at),
  KEY idx_share_owner (owner_user_id, revoked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE invitations MODIFY COLUMN type ENUM('add_child','co_parent','transfer_child','child_to_child','child_invite_parent') NOT NULL;
