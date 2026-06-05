<?php
/**
 * RobTop — слой хранения файлов (абстракция).
 *
 * Сейчас драйвер один — локальная файловая система сервера.
 * В будущем без переписывания приложения можно добавить драйверы
 * S3 / Cloudflare R2 / Supabase Storage / DigitalOcean Spaces:
 * достаточно реализовать тот же интерфейс (put/delete) и переключить
 * 'storage_driver' в config.php.
 *
 * В БД хранятся ТОЛЬКО относительные пути (напр. uploads/users/1/wishlist/abc.jpg),
 * сами файлы лежат на диске и не попадают в Git.
 */

require_once __DIR__ . '/_db.php';

function rt_storage() {
    static $s = null;
    if ($s === null) {
        $c = rt_config();
        $driver = isset($c['storage_driver']) ? $c['storage_driver'] : 'local';
        // Пока поддержан только 'local'. Точка расширения для S3/R2/Spaces.
        $s = new RtLocalStorage($c);
    }
    return $s;
}

class RtLocalStorage {
    private $base; // абсолютный путь к корню загрузок на диске
    private $url;  // относительный URL-префикс для <img src>

    public function __construct($c) {
        $this->base = !empty($c['upload_dir']) ? rtrim($c['upload_dir'], '/') : (dirname(__DIR__) . '/uploads');
        $this->url  = !empty($c['upload_url']) ? trim($c['upload_url'], '/') : 'uploads';
    }

    private function ensureBase() {
        if (!is_dir($this->base)) @mkdir($this->base, 0775, true);
        $ht = $this->base . '/.htaccess';
        if (!file_exists($ht)) {
            // Запрет листинга и выполнения скриптов в папке загрузок (применяется и к подпапкам)
            @file_put_contents($ht, "Options -Indexes\n<FilesMatch \"\\.(php|phtml|phar|cgi|pl|py|sh)$\">\n  Require all denied\n</FilesMatch>\n");
        }
    }

    /** Сохранить файл. $subdir вида "users/1/wishlist". Возвращает относительный путь или null. */
    public function put($bytes, $ext, $subdir) {
        $subdir = trim(preg_replace('#[^a-z0-9_/\-]#i', '', $subdir), '/');
        $ext = preg_replace('#[^a-z0-9]#i', '', $ext);
        $this->ensureBase();
        $dir = $this->base . '/' . $subdir;
        if (!is_dir($dir)) @mkdir($dir, 0775, true);
        $name = bin2hex(random_bytes(8)) . '.' . $ext;
        if (@file_put_contents($dir . '/' . $name, $bytes) === false) return null;
        return $this->url . '/' . $subdir . '/' . $name;
    }

    /** Удалить файл по относительному пути (только внутри папки загрузок). */
    public function delete($relPath) {
        if (!$relPath || strpos($relPath, '..') !== false) return;
        if (strpos($relPath, $this->url . '/') !== 0) return;
        $rest = substr($relPath, strlen($this->url . '/'));
        $full = $this->base . '/' . $rest;
        $real = realpath($full);
        $baseReal = realpath($this->base);
        if ($real && $baseReal && strpos($real, $baseReal) === 0 && is_file($real)) {
            @unlink($real);
        }
    }
}
