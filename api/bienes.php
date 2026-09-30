<?php
/**
 * API Endpoint Borrador: Bienes e Inventario (Futura conexión MySQL)
 */
header('Content-Type: application/json; charset=utf-8');

// Ejemplo de respuesta estructurada para reemplazar Mock Data en JS
$bienesMock = [
    [
        'id' => 'a-1',
        'code' => 'EIC-MOB-1001',
        'name' => 'Escritorio Metálico',
        'category' => 'Mobiliario',
        'brand' => 'Steelcase',
        'status' => 'good'
    ]
];

echo json_encode([
    'status' => 'success',
    'data' => $bienesMock
]);
