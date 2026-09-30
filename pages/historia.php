<?php
$pageTitle = "Bitácora de Auditoría";
require_once __DIR__ . '/../components/head.php';
require_once __DIR__ . '/../components/sidebar.php';
?>

<div class="app-container">
  <?php require_once __DIR__ . '/../components/header.php'; ?>

  <main class="app-main">
    <div class="page-header">
      <div>
        <h1 class="page-title">Bitácora de Auditoría e Historial</h1>
        <p class="page-subtitle">Registro cronológico de movimientos, asignaciones y cambios en el sistema</p>
      </div>
    </div>

    <div class="table-container">
      <table class="table-custom">
        <thead>
          <tr>
            <th>Fecha / Hora</th>
            <th>Usuario Operador</th>
            <th>Operación</th>
            <th>Bien / Objeto Afectado</th>
            <th>Detalles de Cambio</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><small>2026-09-30 14:15</small></td>
            <td><strong>Comisario Principal</strong></td>
            <td><span class="badge badge-good">Alta de Bien</span></td>
            <td>EIC-MOB-1004 (Escritorio)</td>
            <td>Creación inicial de registro en módulo de inventario general.</td>
          </tr>
          <tr>
            <td><small>2026-09-30 11:20</small></td>
            <td><strong>Técnico Mantenimiento</strong></td>
            <td><span class="badge badge-warning">Apertura Incidencia</span></td>
            <td>EIC-MOB-1003 (Pizarra)</td>
            <td>Cambio de estado a "Mal Estado" por falla en panel táctil.</td>
          </tr>
          <tr>
            <td><small>2026-09-29 09:00</small></td>
            <td><strong>Inspector Gestor</strong></td>
            <td><span class="badge badge-maintenance">Asignación</span></td>
            <td>EIC-ARM-3001 (Pistola Glock)</td>
            <td>Asignación temporal a Comisario Juan Pérez.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </main>
</div>

<?php require_once __DIR__ . '/../components/footer.php'; ?>
