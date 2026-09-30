<?php
$pageTitle = "Control de Armamento";
require_once __DIR__ . '/../components/head.php';
require_once __DIR__ . '/../components/sidebar.php';
?>

<div class="app-container">
  <?php require_once __DIR__ . '/../components/header.php'; ?>

  <main class="app-main">
    <div class="page-header">
      <div>
        <h1 class="page-title">Control de Armamento (Armería)</h1>
        <p class="page-subtitle">Inventario especializado de armas, calibres y asignaciones a personal</p>
      </div>
      <div>
        <button onclick="openModal('modal-nueva-arma')" class="btn btn-primary">
          <i data-lucide="plus"></i> Registrar Armamento
        </button>
      </div>
    </div>

    <div class="table-container">
      <div class="table-filters">
        <div class="table-search-box">
          <i data-lucide="search" style="width:16px;height:16px;color:var(--color-text-muted);"></i>
          <input type="text" id="search-armas" placeholder="Buscar por serie o código...">
        </div>
      </div>

      <table class="table-custom" id="tabla-armas">
        <thead>
          <tr>
            <th>Código Interno</th>
            <th>Tipo de Arma</th>
            <th>Marca / Modelo</th>
            <th>Calibre</th>
            <th>Serie de Fábrica</th>
            <th>Ubicación Almacén</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody id="tbody-armas">
          <!-- Carga Dinámica -->
        </tbody>
      </table>
    </div>
  </main>
</div>

<!-- Modal Registrar Arma -->
<div class="modal-backdrop" id="modal-nueva-arma">
  <div class="modal-dialog">
    <div class="modal-header">
      <h3 class="modal-title">Registrar Nuevo Armamento</h3>
      <button onclick="closeModal('modal-nueva-arma')" class="modal-close-btn">&times;</button>
    </div>
    <form onsubmit="guardarArma(event)">
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Código Interno</label>
            <input type="text" id="arm-code" class="form-control" required placeholder="EIC-ARM-3003">
          </div>
          <div class="form-group">
            <label class="form-label">Calibre</label>
            <input type="text" id="arm-caliber" class="form-control" required placeholder="9mm / 5.56mm">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Nombre / Descripción</label>
          <input type="text" id="arm-name" class="form-control" required placeholder="Pistola Glock 17">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Marca</label>
            <input type="text" id="arm-brand" class="form-control" placeholder="Glock">
          </div>
          <div class="form-group">
            <label class="form-label">Serie de Fábrica</label>
            <input type="text" id="arm-serial" class="form-control" required placeholder="G17-889922">
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" onclick="closeModal('modal-nueva-arma')" class="btn btn-secondary">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar Registro</button>
      </div>
    </form>
  </div>
</div>

<script>
  function cargarArmas() {
    if (!window.SAGPStorage) return;
    const bienes = SAGPStorage.getCollection('bienes');
    const armas = bienes.filter(b => b.category === 'Armas');
    const tbody = document.getElementById('tbody-armas');

    tbody.innerHTML = armas.map(a => `
      <tr>
        <td><strong style="color:var(--color-primary);">${a.code}</strong></td>
        <td>${a.name}</td>
        <td>${a.brand || '-'} ${a.model || ''}</td>
        <td><span class="badge badge-maintenance">${a.details ? a.details.caliber || '9mm' : '9mm'}</span></td>
        <td><code>${a.serial}</code></td>
        <td>Armamentismo (Sótano)</td>
        <td><span class="badge badge-${a.status}">${a.status === 'good' ? 'Operativa' : 'Mantenimiento'}</span></td>
      </tr>
    `).join('');
  }

  function guardarArma(e) {
    e.preventDefault();
    const nueva = {
      code: document.getElementById('arm-code').value,
      name: document.getElementById('arm-name').value,
      category: 'Armas',
      brand: document.getElementById('arm-brand').value,
      serial: document.getElementById('arm-serial').value,
      status: 'good',
      type: 'weapon',
      details: { caliber: document.getElementById('arm-caliber').value },
      locationId: 'loc-10'
    };
    SAGPStorage.addItem('bienes', nueva);
    closeModal('modal-nueva-arma');
    cargarArmas();
  }

  document.addEventListener('DOMContentLoaded', () => {
    cargarArmas();
    setupTableSearch('search-armas', 'tabla-armas');
  });
</script>

<?php require_once __DIR__ . '/../components/footer.php'; ?>
