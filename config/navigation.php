<?php
// This catalog controls navigation, titles and the role selector. Permissions for actions live in JS policy.js.
$roles = [
    'admin' => 'Administrador', 'inventory_manager' => 'Encargado de Inventario',
    'weapon_manager' => 'Encargado de Armas', 'vehicle_manager' => 'Encargado de Vehículos',
    'maintenance_staff' => 'Personal de Mantenimiento', 'viewer' => 'Usuario de Consulta',
    'supervisor' => 'Monitor / Supervisor', 'conductor' => 'Conductor', 'buyer' => 'Responsable Administrativo', 'teacher' => 'Docente'
];
$navigation = [
    'dashboard' => ['Panel Principal', 'dashboard.php', 'layout-dashboard', array_keys($roles)],
    'institucional' => ['Recorridos SAGP', 'institucional.php', 'compass', array_keys($roles)],
    'busqueda' => ['Búsqueda General', 'busqueda.php', 'search', array_keys($roles)],
    'inventario' => ['Inventario General', 'inventario.php', 'package', ['admin','inventory_manager','viewer']],
    'ubicaciones' => ['Ubicaciones', 'ubicaciones.php', 'map-pin', ['admin','inventory_manager','supervisor','teacher','viewer']],
    'dormitorios' => ['Control de Dormitorios', 'dormitorios.php', 'bed-double', ['admin','inventory_manager','supervisor','viewer']],
    'planificacion' => ['Planificación de Cupos', 'planificacion.php', 'calendar', ['admin','inventory_manager','supervisor','viewer']],
    'cursos' => ['Cursos y Estudiantes', 'cursos.php', 'graduation-cap', ['admin','inventory_manager','supervisor','weapon_manager','teacher','viewer']],
    'armeria' => ['Control de Armas', 'armeria.php', 'shield-alert', ['admin','weapon_manager','supervisor']],
    'vehiculos' => ['Control de Vehículos', 'vehiculos.php', 'car', ['admin','vehicle_manager','conductor']],
    'conductores' => ['Conductores', 'conductores.php', 'id-card', ['admin','vehicle_manager','conductor']],
    'mantenimiento' => ['Mantenimiento', 'mantenimiento.php', 'wrench', ['admin','inventory_manager','maintenance_staff']],
    'proyectos' => ['Proyectos de Compra', 'proyectos.php', 'shopping-bag', ['admin','buyer','viewer']],
    'finanzas' => ['Fondos y Gastos', 'finanzas.php', 'wallet', ['admin','buyer','viewer']],
    'personas' => ['Personas', 'personas.php', 'users', ['admin','inventory_manager','supervisor']],
    'importacion' => ['Importar Información', 'importacion.php', 'file-spreadsheet', ['admin','inventory_manager','vehicle_manager','supervisor']],
    'historia' => ['Bitácora', 'historia.php', 'history', ['admin','inventory_manager','weapon_manager','vehicle_manager','maintenance_staff','supervisor','buyer','viewer']],
    'reportes' => ['Reportes y Estadísticas', 'reportes.php', 'printer', ['admin','inventory_manager','weapon_manager','vehicle_manager','maintenance_staff','supervisor','buyer','viewer']],
    'notificaciones' => ['Notificaciones', 'notificaciones.php', 'bell', array_keys($roles)],
    'usuarios' => ['Usuarios', 'usuarios.php', 'user-check', ['admin']]
];
