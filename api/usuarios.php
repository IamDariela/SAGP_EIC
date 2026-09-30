<?php
/**
 * API Endpoint Borrador: Usuarios y Permisos (Futura conexión MySQL)
 */
header('Content-Type: application/json; charset=utf-8');

$usuariosMock = [
    [
        'id' => 'demo-user-1',
        'email' => 'admin@sig-eic.gov',
        'name' => 'Administrador Sistema',
        'role' => 'admin',
        'status' => 'active'
    ]
];

echo json_encode([
    'status' => 'success',
    'data' => $usuariosMock
]);
