<?php
/** Consistent JSON errors. Replace the repository boundary, never these errors with demo records. */
require_once __DIR__ . '/../config/app.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
function api_error($status, $code, $message) {
    http_response_code($status);
    echo json_encode(['ok' => false, 'error' => ['code' => $code, 'message' => $message]], JSON_UNESCAPED_UNICODE);
    exit;
}
function require_method($methods) {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (!in_array($method, $methods, true)) {
        header('Allow: ' . implode(', ', $methods));
        api_error(405, 'METHOD_NOT_ALLOWED', 'Método no permitido.');
    }
}
function require_official_backend() {
    if (APP_DATA_MODE !== 'api') {
        api_error(409, 'DEMO_MODE', 'Este entorno usa datos de demostración del navegador.');
    }
    api_error(503, 'BACKEND_NOT_CONFIGURED', 'La autenticación y la base de datos oficiales aún no están configuradas.');
}
