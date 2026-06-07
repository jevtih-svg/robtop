-- 016: темы оформления. Тема хранится НА АККАУНТЕ (users.theme) и применяется
-- на любом устройстве после входа. Допустимые значения контролирует accounts.php
-- (op set_theme, allowlist RT_THEMES). 'neon' — исходный неоновый киберпанк.

ALTER TABLE users ADD COLUMN theme VARCHAR(20) NOT NULL DEFAULT 'neon';
