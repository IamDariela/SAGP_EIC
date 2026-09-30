<?php
$pageTitle = "Reportes e Impresión";
require_once __DIR__ . '/../components/head.php';
require_once __DIR__ . '/../components/sidebar.php';
?>

<div class="app-container">
  <?php require_once __DIR__ . '/../components/header.php'; ?>

  <main class="app-main">
    <div class="page-header">
      <div>
        <h1 class="page-title">Generador de Reportes Institucionales</h1>
        <p class="page-subtitle">Exportación de datos de inventarios, armamento y flota vehicular</p>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:1.5rem;">
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="package" class="text-accent"></i> Inventario Consolidado</h3>
        </div>
        <p style="font-size:0.85rem;color:var(--color-text-muted);margin-bottom:1rem;">
          Reporte completo de todos los bienes catalogados con su valoración y responsable.
        </p>
        <button onclick="window.print()" class="btn btn-primary" style="width:100%;">
          <i data-lucide="printer"></i> Imprimir Reporte Inventario
        </button>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="shield-alert" class="text-accent"></i> Estado de Armamento</h3>
        </div>
        <p style="font-size:0.85rem;color:var(--color-text-muted);margin-bottom:1rem;">
          Listado de armas de fuego registradas en la armería con número de serie y asignación.
        </p>
        <button onclick="window.print()" class="btn btn-primary" style="width:100%;">
          <i data-lucide="printer"></i> Imprimir Reporte Armería
        </button>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="bed-double" class="text-accent"></i> Alojamiento y Dormitorios</h3>
        </div>
        <p style="font-size:0.85rem;color:var(--color-text-muted);margin-bottom:1rem;">
          Reporte de ocupación de camas por dormitorio para estudiantes de la EIC.
        </p>
        <button onclick="window.print()" class="btn btn-primary" style="width:100%;">
          <i data-lucide="printer"></i> Imprimir Reporte Dormitorios
        </button>
      </div>
    </div>
  </main>
</div>

<?php require_once __DIR__ . '/../components/footer.php'; ?>
