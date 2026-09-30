<?php
$pageTitle = "Panel Principal";
require_once __DIR__ . '/../components/head.php';
require_once __DIR__ . '/../components/sidebar.php';
?>

<div class="app-container">
  <?php require_once __DIR__ . '/../components/header.php'; ?>

  <main class="app-main">
    <div class="page-header">
      <div>
        <h1 class="page-title">Panel Principal</h1>
        <p class="page-subtitle">Resumen ejecutivo y control operativo EIC Honduras</p>
      </div>
      <div style="display:flex;gap:0.5rem;">
        <a href="<?php echo base_url('pages/inventario.php'); ?>" class="btn btn-primary">
          <i data-lucide="plus"></i> Nuevo Bien
        </a>
        <a href="<?php echo base_url('pages/reportes.php'); ?>" class="btn btn-secondary">
          <i data-lucide="printer"></i> Generar Reporte
        </a>
      </div>
    </div>

    <!-- Tarjetas de Métricas -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:1rem;margin-bottom:1.5rem;">
      <div class="stat-card">
        <div class="stat-icon primary">
          <i data-lucide="package" style="width:24px;height:24px;"></i>
        </div>
        <div class="stat-info">
          <span class="stat-label">Total Bienes</span>
          <span class="stat-value" id="dash-total-bienes">8</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon danger">
          <i data-lucide="shield-alert" style="width:24px;height:24px;"></i>
        </div>
        <div class="stat-info">
          <span class="stat-label">Armamento</span>
          <span class="stat-value" id="dash-total-armas">2</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon warning">
          <i data-lucide="car" style="width:24px;height:24px;"></i>
        </div>
        <div class="stat-info">
          <span class="stat-label">Vehículos</span>
          <span class="stat-value" id="dash-total-vehiculos">2</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon success">
          <i data-lucide="wrench" style="width:24px;height:24px;"></i>
        </div>
        <div class="stat-info">
          <span class="stat-label">Mantenimientos</span>
          <span class="stat-value" id="dash-total-mantenimiento">1</span>
        </div>
      </div>
    </div>

    <!-- Tablas Rápidas & Estado del Sistema -->
    <div style="display:grid;grid-template-columns: 2fr 1fr;gap:1.5rem;">
      <div class="card">
        <div class="card-header">
          <h2 class="card-title"><i data-lucide="clock" class="text-accent"></i> Últimos Bienes Registrados</h2>
          <a href="<?php echo base_url('pages/inventario.php'); ?>" class="btn btn-sm btn-secondary">Ver Todos</a>
        </div>
        
        <table class="table-custom">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody id="dash-bienes-tbody">
            <tr>
              <td colspan="4" style="text-align:center;padding:1.5rem;" class="text-muted">Cargando datos...</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="card">
        <div class="card-header">
          <h2 class="card-title"><i data-lucide="bed-double" class="text-accent"></i> Ocupación Dormitorios</h2>
        </div>
        <div style="display:flex;flex-direction:column;gap:1rem;">
          <div style="background:#f8fafc;padding:1rem;border-radius:12px;border:1px solid #e2e8f0;">
            <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem;font-weight:700;font-size:0.85rem;">
              <span>Dormitorio de Damas</span>
              <span class="text-accent">2 / 4 Camas</span>
            </div>
            <div style="background:#e2e8f0;height:8px;border-radius:4px;overflow:hidden;">
              <div style="background:var(--color-accent);width:50%;height:100%;"></div>
            </div>
          </div>

          <div style="background:#f8fafc;padding:1rem;border-radius:12px;border:1px solid #e2e8f0;">
            <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem;font-weight:700;font-size:0.85rem;">
              <span>Dormitorio de Caballeros</span>
              <span class="text-success">2 / 4 Camas</span>
            </div>
            <div style="background:#e2e8f0;height:8px;border-radius:4px;overflow:hidden;">
              <div style="background:var(--color-success);width:50%;height:100%;"></div>
            </div>
          </div>

          <a href="<?php echo base_url('pages/dormitorios.php'); ?>" class="btn btn-secondary btn-sm" style="width:100%;margin-top:0.5rem;">
            Ver Mapa Interactivo
          </a>
        </div>
      </div>
    </div>
  </main>
</div>

<script>
  document.addEventListener('DOMContentLoaded', () => {
    if (window.SAGPStorage) {
      const bienes = SAGPStorage.getCollection('bienes');
      const mantenimientos = SAGPStorage.getCollection('mantenimientos');

      document.getElementById('dash-total-bienes').textContent = bienes.length;
      document.getElementById('dash-total-armas').textContent = bienes.filter(b => b.category === 'Armas').length;
      document.getElementById('dash-total-vehiculos').textContent = bienes.filter(b => b.category === 'Vehículos').length;
      document.getElementById('dash-total-mantenimiento').textContent = mantenimientos.filter(m => m.status === 'open').length;

      const tbody = document.getElementById('dash-bienes-tbody');
      tbody.innerHTML = bienes.slice(0, 5).map(b => `
        <tr>
          <td><strong style="color:var(--color-primary);">${b.code}</strong></td>
          <td>${b.name}</td>
          <td>${b.category}</td>
          <td><span class="badge badge-${b.status}">${b.status === 'good' ? 'Buen Estado' : (b.status === 'bad' ? 'Mal Estado' : 'Regular')}</span></td>
        </tr>
      `).join('');
    }
  });
</script>

<?php require_once __DIR__ . '/../components/footer.php'; ?>
