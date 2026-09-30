<?php
$pageTitle = "Gestión de Mantenimiento";
require_once __DIR__ . '/../components/head.php';
require_once __DIR__ . '/../components/sidebar.php';
?>

<div class="app-container">
  <?php require_once __DIR__ . '/../components/header.php'; ?>

  <main class="app-main">
    <div class="page-header">
      <div>
        <h1 class="page-title">Gestión de Mantenimientos</h1>
        <p class="page-subtitle">Reportes de incidencias, reparaciones y órdenes de trabajo</p>
      </div>
      <div>
        <button onclick="openModal('modal-nuevo-mantenimiento')" class="btn btn-primary">
          <i data-lucide="plus"></i> Reportar Incidencia
        </button>
      </div>
    </div>

    <div class="table-container">
      <table class="table-custom">
        <thead>
          <tr>
            <th>Código Bien</th>
            <th>Bien Afectado</th>
            <th>Descripción del Problema</th>
            <th>Fecha Registro</th>
            <th>Diagnóstico Técnico</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody id="tbody-mantenimientos">
          <!-- Carga Dinámica -->
        </tbody>
      </table>
    </div>
  </main>
</div>

<!-- Modal Reportar Mantenimiento -->
<div class="modal-backdrop" id="modal-nuevo-mantenimiento">
  <div class="modal-dialog">
    <div class="modal-header">
      <h3 class="modal-title">Reportar Daño / Mantenimiento</h3>
      <button onclick="closeModal('modal-nuevo-mantenimiento')" class="modal-close-btn">&times;</button>
    </div>
    <form onsubmit="guardarMantenimiento(event)">
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Seleccionar Bien Afectado</label>
          <select id="maint-asset" class="form-select" required>
            <!-- Dinámico -->
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Descripción de la Incidencia</label>
          <textarea id="maint-desc" class="form-control" rows="3" required placeholder="Describa el fallo o mantenimiento requerido..."></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" onclick="closeModal('modal-nuevo-mantenimiento')" class="btn btn-secondary">Cancelar</button>
        <button type="submit" class="btn btn-primary">Abrir Orden de Mantenimiento</button>
      </div>
    </form>
  </div>
</div>

<script>
  function cargarMantenimientos() {
    if (!window.SAGPStorage) return;
    const mantenimientos = SAGPStorage.getCollection('mantenimientos');
    const bienes = SAGPStorage.getCollection('bienes');
    const tbody = document.getElementById('tbody-mantenimientos');
    const selectAsset = document.getElementById('maint-asset');

    selectAsset.innerHTML = bienes.map(b => `<option value="${b.id}">${b.code} - ${b.name}</option>`).join('');

    tbody.innerHTML = mantenimientos.map(m => `
      <tr>
        <td><strong style="color:var(--color-primary);">${m.assetCode || 'N/A'}</strong></td>
        <td>${m.assetName || 'Bien'}</td>
        <td>${m.description}</td>
        <td>${m.startDate}</td>
        <td><em>${m.diagnostico || 'Pendiente de revisión'}</em></td>
        <td><span class="badge ${m.status === 'open' ? 'badge-open' : 'badge-closed'}">${m.status === 'open' ? 'Orden Abierta' : 'Completado'}</span></td>
        <td>
          ${m.status === 'open' ? `
            <button onclick="cerrarOrden('${m.id}')" class="btn btn-sm btn-accent">
              Cerrar Orden
            </button>
          ` : '<span class="text-muted text-xs">Finalizado</span>'}
        </td>
      </tr>
    `).join('');
  }

  function guardarMantenimiento(e) {
    e.preventDefault();
    const assetId = document.getElementById('maint-asset').value;
    const bienes = SAGPStorage.getCollection('bienes');
    const bien = bienes.find(b => b.id === assetId);

    const nuevo = {
      assetId: assetId,
      assetCode: bien ? bien.code : 'N/A',
      assetName: bien ? bien.name : 'Bien',
      description: document.getElementById('maint-desc').value,
      startDate: new Date().toISOString().split('T')[0],
      status: 'open',
      diagnostico: 'Inspección técnica inicial en proceso.'
    };

    SAGPStorage.addItem('mantenimientos', nuevo);
    closeModal('modal-nuevo-mantenimiento');
    cargarMantenimientos();
  }

  function cerrarOrden(id) {
    if (confirm('¿Desea cerrar la orden de trabajo de mantenimiento?')) {
      SAGPStorage.updateItem('mantenimientos', id, {
        status: 'closed',
        endDate: new Date().toISOString().split('T')[0]
      });
      cargarMantenimientos();
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    cargarMantenimientos();
  });
</script>

<?php require_once __DIR__ . '/../components/footer.php'; ?>
