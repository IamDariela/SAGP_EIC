<?php
$pageTitle = "Notificaciones del Sistema";
require_once __DIR__ . '/../components/head.php';
require_once __DIR__ . '/../components/sidebar.php';
?>

<div class="app-container">
  <?php require_once __DIR__ . '/../components/header.php'; ?>

  <main class="app-main">
    <div class="page-header">
      <div>
        <h1 class="page-title">Notificaciones y Avisos</h1>
        <p class="page-subtitle">Alertas sobre mantenimientos pendientes, licencias y garantías</p>
      </div>
    </div>

    <div style="display:flex;flex-direction:column;gap:1rem;">
      <div class="card" style="border-left:5px solid var(--color-warning);">
        <div style="display:flex;align-items:center;gap:0.75rem;">
          <i data-lucide="alert-triangle" class="text-warning"></i>
          <div>
            <h4 style="font-weight:800;font-size:0.95rem;">Mantenimiento Preventivo Requerido</h4>
            <p style="font-size:0.8rem;color:var(--color-text-muted);">
              La patrulla Toyota Hilux (EIC-VEH-4001) ha superado los 12,000 KM. Programar cambio de aceite.
            </p>
          </div>
        </div>
      </div>

      <div class="card" style="border-left:5px solid var(--color-info);">
        <div style="display:flex;align-items:center;gap:0.75rem;">
          <i data-lucide="info" class="text-info"></i>
          <div>
            <h4 style="font-weight:800;font-size:0.95rem;">Nuevo Curso Programado</h4>
            <p style="font-size:0.8rem;color:var(--color-text-muted);">
              Se ha agregado la planificación para el Curso de Especialización Criminalística III.
            </p>
          </div>
        </div>
      </div>
    </div>
  </main>
</div>

<?php require_once __DIR__ . '/../components/footer.php'; ?>
