<?php
function renderStatusBadge($status) {
    $labels = [
        'good' => 'Buen Estado',
        'regular' => 'Regular',
        'bad' => 'Mal Estado',
        'maintenance' => 'Mantenimiento',
        'decommissioned' => 'Dado de Baja',
        'active' => 'Activo',
        'inactive' => 'Inactivo',
        'open' => 'Abierto',
        'closed' => 'Cerrado'
    ];

    $label = $labels[$status] ?? ucfirst($status);
    $badgeClass = 'badge-' . strtolower($status);

    return sprintf('<span class="badge %s">%s</span>', htmlspecialchars($badgeClass), htmlspecialchars($label));
}
