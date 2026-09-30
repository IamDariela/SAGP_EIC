<?php
$pageTitle = "Gestión de Ubicaciones";
require_once __DIR__ . '/../components/head.php';
require_once __DIR__ . '/../components/sidebar.php';
?>

<div class="app-container">
  <?php require_once __DIR__ . '/../components/header.php'; ?>

  <main class="app-main">
    <div class="page-header">
      <div>
        <h1 class="page-title">Ubicaciones y Espacios Physical</h1>
        <p class="page-subtitle">Aulas, laboratorios, áreas administrativas y planos de la EIC</p>
      </div>
      <div>
        <button onclick="openModal('modal-nueva-ubicacion')" class="btn btn-primary">
          <i data-lucide="plus"></i> Nueva Ubicación
        </button>
      </div>
    </div>

    <div style="display:grid;grid-template-columns: 2fr 1fr;gap:1.5rem;">
      <div class="table-container">
        <div class="table-filters">
          <div class="table-search-box">
            <i data-lucide="search" style="width:16px;height:16px;color:var(--color-text-muted);"></i>
            <input type="text" id="search-locations" placeholder="Buscar edificio o área...">
          </div>
        </div>

        <table class="table-custom" id="tabla-locations">
          <thead>
            <tr>
              <th>Nombre Espacio</th>
              <th>Edificio / Sector</th>
              <th>Área</th>
              <th>Tipo</th>
              <th>Planta</th>
            </tr>
          </thead>
          <tbody id="tbody-ubicaciones">
            <!-- Dinámico -->
          </tbody>
        </table>
      </div>

      <div class="card">
        <div class="card-header">
          <h2 class="card-title"><i data-lucide="map" class="text-accent"></i> Plano Segunda Planta</h2>
        </div>
        <img src="<?php echo base_url('assets/img/plano_segunda_planta.jpg'); ?>" alt="Plano EIC" style="border-radius:12px;width:100%;border:1px solid #e2e8f0;margin-bottom:1rem;">
        <p style="font-size:0.8rem;color:var(--color-text-muted);">
          Distribución técnica de aulas y departamentos en la segunda planta de la Escuela de Investigación Criminal.
        </p>
      </div>
    </div>
  </main>
</div>

<!-- Modal Nueva Ubicación -->
<div class="modal-backdrop" id="modal-nueva-ubicacion">
  <div class="modal-dialog">
    <div class="modal-header">
      <h3 class="modal-title">Agregar Nueva Ubicación</h3>
      <button onclick="closeModal('modal-nueva-ubicacion')" class="modal-close-btn">&times;</button>
    </div>
    <form onsubmit="guardarNuevaUbicacion(event)">
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Nombre del Espacio</label>
          <input type="text" id="loc-name" class="form-control" required placeholder="Laboratorio Ciberdelito">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Edificio</label>
            <input type="text" id="loc-building" class="form-control" required placeholder="Edificio C">
          </div>
          <div class="form-group">
            <label class="form-label">Área</label>
            <input type="text" id="loc-area" class="form-control" required placeholder="Investigación">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Tipo de Espacio</label>
            <select id="loc-type" class="form-select" required>
              <option value="Aula">Aula</option>
              <option value="Laboratorio">Laboratorio</option>
              <option value="Oficina">Oficina</option>
              <option value="Dormitorio">Dormitorio</option>
              <option value="Especializado">Especializado</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Planta</label>
            <select id="loc-floor" class="form-select" required>
              <option value="1">Primera Planta</option>
              <option value="2">Segunda Planta</option>
            </select>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" onclick="closeModal('modal-nueva-ubicacion')" class="btn btn-secondary">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar Ubicación</button>
      </div>
    </form>
  </div>
</div>

<script>
  function cargarUbicaciones() {
    if (!window.SAGPStorage) return;
    const ubicaciones = SAGPStorage.getCollection('ubicaciones');
    const tbody = document.getElementById('tbody-ubicaciones');

    tbody.innerHTML = ubicaciones.map(u => `
      <tr>
        <td><strong>${u.name}</strong></td>
        <td>${u.building}</td>
        <td>${u.area}</td>
        <td><span class="badge badge-maintenance">${u.type}</span></td>
        <td>${u.floor ? u.floor + 'ª Planta' : 'N/A'}</td>
      </tr>
    `).join('');
  }

  function guardarNuevaUbicacion(e) {
    e.preventDefault();
    const nueva = {
      name: document.getElementById('loc-name').value,
      building: document.getElementById('loc-building').value,
      area: document.getElementById('loc-area').value,
      type: document.getElementById('loc-type').value,
      floor: parseInt(document.getElementById('loc-floor').value)
    };
    SAGPStorage.addItem('ubicaciones', nueva);
    closeModal('modal-nueva-ubicacion');
    cargarUbicaciones();
  }

  document.addEventListener('DOMContentLoaded', () => {
    cargarUbicaciones();
    setupTableSearch('search-locations', 'tabla-locations');
  });
</script>

<?php require_once __DIR__ . '/../components/footer.php'; ?>
