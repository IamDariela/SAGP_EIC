<?php
$pageTitle = "Inventario General de Bienes";
require_once __DIR__ . '/../components/head.php';
require_once __DIR__ . '/../components/sidebar.php';
?>

<div class="app-container">
  <?php require_once __DIR__ . '/../components/header.php'; ?>

  <main class="app-main">
    <div class="page-header">
      <div>
        <h1 class="page-title">Inventario General</h1>
        <p class="page-subtitle">Listado y control de bienes activos de la EIC Honduras</p>
      </div>
      <div>
        <button onclick="openModal('modal-nuevo-bien')" class="btn btn-primary">
          <i data-lucide="plus"></i> Registrar Nuevo Bien
        </button>
      </div>
    </div>

    <div class="table-container">
      <div class="table-filters">
        <div class="table-search-box">
          <i data-lucide="search" style="width:16px;height:16px;color:var(--color-text-muted);"></i>
          <input type="text" id="search-bienes" placeholder="Buscar por código, nombre, serie...">
        </div>

        <div style="display:flex;gap:0.5rem;">
          <select id="filter-categoria" class="form-select" style="width:auto;padding:0.4rem 0.75rem;">
            <option value="">Todas las Categorías</option>
            <option value="Mobiliario">Mobiliario</option>
            <option value="Informática">Informática</option>
            <option value="Armas">Armas</option>
            <option value="Vehículos">Vehículos</option>
          </select>

          <select id="filter-estado" class="form-select" style="width:auto;padding:0.4rem 0.75rem;">
            <option value="">Todos los Estados</option>
            <option value="good">Buen Estado</option>
            <option value="regular">Regular</option>
            <option value="bad">Mal Estado</option>
          </select>
        </div>
      </div>

      <table class="table-custom" id="tabla-bienes">
        <thead>
          <tr>
            <th>Código Interno</th>
            <th>Nombre del Bien</th>
            <th>Categoría</th>
            <th>Marca / Modelo</th>
            <th>Serie</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody id="tbody-bienes">
          <!-- Renderizado dinámico vía JS -->
        </tbody>
      </table>
    </div>
  </main>
</div>

<!-- Modal Registrar Bien -->
<div class="modal-backdrop" id="modal-nuevo-bien">
  <div class="modal-dialog">
    <div class="modal-header">
      <h3 class="modal-title">Registrar Nuevo Bien</h3>
      <button onclick="closeModal('modal-nuevo-bien')" class="modal-close-btn">&times;</button>
    </div>
    <form onsubmit="guardarNuevoBien(event)">
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Código Interno</label>
            <input type="text" id="code" class="form-control" required placeholder="EIC-MOB-1004">
          </div>
          <div class="form-group">
            <label class="form-label">Categoría</label>
            <select id="category" class="form-select" required>
              <option value="Mobiliario">Mobiliario</option>
              <option value="Informática">Informática</option>
              <option value="Armas">Armas</option>
              <option value="Vehículos">Vehículos</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Nombre del Bien</label>
          <input type="text" id="name" class="form-control" required placeholder="Escritorio Ejecutivo">
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Marca</label>
            <input type="text" id="brand" class="form-control" placeholder="Steelcase">
          </div>
          <div class="form-group">
            <label class="form-label">Modelo</label>
            <input type="text" id="model" class="form-control" placeholder="Pro 2024">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Número de Serie</label>
            <input type="text" id="serial" class="form-control" placeholder="SN-998811">
          </div>
          <div class="form-group">
            <label class="form-label">Estado Inicial</label>
            <select id="status" class="form-select" required>
              <option value="good">Buen Estado</option>
              <option value="regular">Regular</option>
              <option value="bad">Mal Estado</option>
            </select>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" onclick="closeModal('modal-nuevo-bien')" class="btn btn-secondary">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar Bien</button>
      </div>
    </form>
  </div>
</div>

<script>
  function cargarBienes() {
    if (!window.SAGPStorage) return;
    const bienes = SAGPStorage.getCollection('bienes');
    const tbody = document.getElementById('tbody-bienes');

    const catFilter = document.getElementById('filter-categoria').value;
    const estFilter = document.getElementById('filter-estado').value;

    let filtrados = bienes;
    if (catFilter) filtrados = filtrados.filter(b => b.category === catFilter);
    if (estFilter) filtrados = filtrados.filter(b => b.status === estFilter);

    tbody.innerHTML = filtrados.map(b => `
      <tr>
        <td><strong style="color:var(--color-primary);">${b.code}</strong></td>
        <td>${b.name}</td>
        <td>${b.category}</td>
        <td>${b.brand || '-'} ${b.model || ''}</td>
        <td><code>${b.serial || 'N/A'}</code></td>
        <td><span class="badge badge-${b.status}">${b.status === 'good' ? 'Buen Estado' : (b.status === 'bad' ? 'Mal Estado' : 'Regular')}</span></td>
        <td>
          <button onclick="eliminarBien('${b.id}')" class="btn btn-sm btn-danger btn-icon" title="Eliminar Bien">
            <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
          </button>
        </td>
      </tr>
    `).join('');

    if (window.lucide) lucide.createIcons();
  }

  function guardarNuevoBien(e) {
    e.preventDefault();
    const nuevo = {
      code: document.getElementById('code').value,
      name: document.getElementById('name').value,
      category: document.getElementById('category').value,
      brand: document.getElementById('brand').value,
      model: document.getElementById('model').value,
      serial: document.getElementById('serial').value,
      status: document.getElementById('status').value,
      locationId: 'loc-11'
    };

    SAGPStorage.addItem('bienes', nuevo);
    closeModal('modal-nuevo-bien');
    cargarBienes();
  }

  function eliminarBien(id) {
    if (confirm('¿Está seguro de eliminar este bien del inventario?')) {
      SAGPStorage.deleteItem('bienes', id);
      cargarBienes();
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    cargarBienes();
    setupTableSearch('search-bienes', 'tabla-bienes');
    document.getElementById('filter-categoria').addEventListener('change', cargarBienes);
    document.getElementById('filter-estado').addEventListener('change', cargarBienes);
  });
</script>

<?php require_once __DIR__ . '/../components/footer.php'; ?>
