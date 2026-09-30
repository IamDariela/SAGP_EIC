<?php
$pageTitle = "Proyectos de Compra";
require_once __DIR__ . '/../components/head.php';
require_once __DIR__ . '/../components/sidebar.php';
?>

<div class="app-container">
  <?php require_once __DIR__ . '/../components/header.php'; ?>

  <main class="app-main">
    <div class="page-header">
      <div>
        <h1 class="page-title">Proyectos de Compra y Adquisiciones</h1>
        <p class="page-subtitle">Solicitudes de equipamiento e inversión en infraestructura EIC</p>
      </div>
      <div>
        <button onclick="alert('Solicitud registrada en modo demostración')" class="btn btn-primary">
          <i data-lucide="plus"></i> Nueva Solicitud
        </button>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(300px, 1fr));gap:1.5rem;">
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Renovación Servidores SIG</h3>
          <span class="badge badge-warning">En Revisión</span>
        </div>
        <p style="font-size:0.85rem;color:var(--color-text-muted);margin-bottom:1rem;">
          Adquisición de 2 servidores rackables para virtualización del sistema académico.
        </p>
        <div style="display:flex;justify-content:space-between;font-weight:700;font-size:0.85rem;">
          <span>Presupuesto Proyectado:</span>
          <span class="text-accent">L. 350,000.00</span>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Mobiliario Aula 102</h3>
          <span class="badge badge-good">Aprobado</span>
        </div>
        <p style="font-size:0.85rem;color:var(--color-text-muted);margin-bottom:1rem;">
          Lote de 30 sillas ergonómicas y 15 escritorios dobles para aula de posgrado.
        </p>
        <div style="display:flex;justify-content:space-between;font-weight:700;font-size:0.85rem;">
          <span>Presupuesto Proyectado:</span>
          <span class="text-success">L. 120,000.00</span>
        </div>
      </div>
    </div>
  </main>
</div>

<?php require_once __DIR__ . '/../components/footer.php'; ?>
