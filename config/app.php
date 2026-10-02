<?php
/** Configuration shared by PHP pages and the future API. No database credentials here. */
define('APP_ROOT', dirname(__DIR__));
define('APP_NAME', 'SAGP - EIC Honduras');
define('APP_SHORT_NAME', 'SAGP');
define('APP_SUBTITLE', 'Escuela de Investigación Criminal');
define('APP_VERSION', '1.2.0');
$mode = getenv('SAGP_DATA_MODE') ?: 'demo';
if (!in_array($mode, ['demo', 'api'], true)) {
    throw new RuntimeException('SAGP_DATA_MODE debe ser demo o api.');
}
define('APP_DATA_MODE', $mode);

/** Return a path rooted at the application, including an optional Apache subdirectory. */
function base_url($path = '') {
    $base = getenv('SAGP_BASE_PATH');
    if ($base === false) {
        $root = str_replace('\\', '/', APP_ROOT);
        $file = str_replace('\\', '/', $_SERVER['SCRIPT_FILENAME'] ?? '');
        $script = $_SERVER['SCRIPT_NAME'] ?? '/index.php';
        $relative = strpos($file, $root . '/') === 0 ? substr($file, strlen($root)) : '';
        $base = $relative !== '' && substr($script, -strlen($relative)) === $relative
            ? substr($script, 0, -strlen($relative))
            : preg_replace('~/(?:pages/|api/)?[^/]+\.php$~', '', $script);
    }
    return '/' . (trim($base, '/') === '' ? '' : trim($base, '/') . '/') . ltrim($path, '/');
}
function html($value) {
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}
require_once __DIR__ . '/navigation.php';
