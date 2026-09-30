<?php
/**
 * Configuración Principal - SAGP (Sistema Administrativo de Gestión Policial)
 * EIC - Escuela de Investigación Criminal (Honduras)
 */

define('APP_NAME', 'SAGP - EIC Honduras');
define('APP_SHORT_NAME', 'SAGP');
define('APP_VERSION', '1.0.0');
define('APP_SUBTITLE', 'Escuela de Investigación Criminal');

// Rutas base helpers
function base_url($path = '') {
    $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost:8000';
    
    // Normalizar barra inicial
    $path = ltrim($path, '/');
    
    // Detectar subcarpeta si se ejecuta en Apache/XAMPP
    $scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
    $dir = dirname($scriptName);
    
    if ($dir === '/' || $dir === '\\') {
        $dir = '';
    }
    
    return $protocol . '://' . $host . $dir . '/' . $path;
}
