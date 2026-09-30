<?php
$pageTitle = "Control de Vehículos";
require_once __DIR__ . '/../components/head.php';
require_once __DIR__ . '/../components/sidebar.php';
?>

<div class="app-container">
  <?php require_once __DIR__ . '/../components/header.php'; ?>

  <main class="app-main">
    <div class="page-header">
      <div>
        <h1 class="page-title">Control de Flota Vehicular</h1>
        <p class="page-subtitle">Patrullas, motocicletas, licencias de conducir y kilometrajes</p>
      </div>
      <div>
        <button onclick="openModal('modal-nuevo-vehiculo')" class="btn btn-primary">
          <i data-lucide="plus"></i> Registrar Vehículo
        </button>
      </div>
    </div>

    <div class="table-container">
      <table class="table-custom" id="tabla-vehiculos">
        <thead>
          <tr>
            <th>Código</th>
            <th>Vehículo</th>
            <th>Placa</th>
            <th>Chasis / VIN</th>
            <th>Kilometraje</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody id="tbody-vehiculos">
          <!-- Carga Dinámica -->
        </tbody>
      </table>
    </div>
  </main>
</div>

<!-- Modal Registrar Vehículo -->
<div class="modal-backdrop" id="modal-nuevo-vehiculo">
  <div class="modal-dialog">
    <div class="modal-header">
      <h3 class="modal-title">Registrar Nuevo Vehículo</h3>
      <button onclick="closeModal('modal-nuevo-vehiculo')" class="modal-close-btn">&times;</button>
    </div>
    <form onsubmit="guardarVehiculo(event)">
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Código Interno</label>
            <input type="text" id="veh-code" class="form-control" required placeholder="EIC-VEH-4003">
          </div>
          <div class="form-group">
            <label class="form-label">Placa Institucional</label>
            <input type="text" id="veh-plate" class="form-control" required placeholder="P-BC-991">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Nombre / Modelo Vehículo</label>
          <input type="text" id="veh-name" class="form-control" required placeholder="Patrulla Toyota Hilux 4x4">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Chasis / Serie</label>
            <input type="text" id="veh-serial" class="form-control" required placeholder="CHASS-990011">
          </div>
          <div class="form-group">
            <label class="form-label">Kilometraje Inicial</label>
            <input type="number" id="veh-km" class="form-control" required placeholder="15000">
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" onclick="closeModal('modal-nuevo-vehiculo')" class="btn btn-secondary">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar Vehículo</button>
      </div>
    </form>
  </div>
</div>

<script>
  function cargarVehiculos() {
    if (!window.SAGPStorage) return;
    const bienes = SAGPStorage.getCollection('bienes');
    const vehiculos = bienes.filter(b => b.category === 'Vehículos');
    const tbody = document.getElementById('tbody-vehiculos');

    tbody.innerHTML = vehiculos.map(v => `
      <tr>
        <td><strong style="color:var(--color-primary);">${v.code}</strong></td>
        <td>${v.name}</td>
        <td><span class="badge badge-warning">${v.details ? v.details.plate || 'P-BC-000' : 'P-BC-000'}</span></td>
        <td><code>${v.serial}</code></td>
        <td>${v.details ? v.details.mileage || 0 : 0} KM</td>
        <td><span class="badge badge-${v.status}">${v.status === 'good' ? 'Operativo' : 'Taller'}</span></td>
      </tr>
    `).join('');
  }

  function guardarVehiculo(e) {
    e.preventDefault();
    const nuevo = {
      code: document.getElementById('veh-code').value,
      name: document.getElementById('veh-name').value,
      category: 'Vehículos',
      serial: document.getElementById('veh-serial').value,
      status: 'good',
      type: 'vehicle',
      details: {
        plate: document.getElementById('veh-plate').value,
        mileage: parseInt(document.getElementById('veh-km').value)
      },
      locationId: 'loc-9'
    };
    SAGPStorage.addItem('bienes', nuevo);
    closeModal('modal-nuevo-vehiculo');
    cargarVehiculos();
  }

  document.addEventListener('DOMContentLoaded', () => {
    cargarVehiculos();
  });
</script>

<?php require_once __DIR__ . '/../components/footer.php'; ?>
