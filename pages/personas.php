<?php
$pageTitle = "Directorio de Personas";
require_once __DIR__ . '/../components/head.php';
require_once __DIR__ . '/../components/sidebar.php';
?>

<div class="app-container">
  <?php require_once __DIR__ . '/../components/header.php'; ?>

  <main class="app-main">
    <div class="page-header">
      <div>
        <h1 class="page-title">Directorio de Personal EIC</h1>
        <p class="page-subtitle">Oficiales, instructores, personal administrativo y estudiantes</p>
      </div>
      <div>
        <button onclick="openModal('modal-nueva-persona')" class="btn btn-primary">
          <i data-lucide="user-plus"></i> Registrar Persona
        </button>
      </div>
    </div>

    <div class="table-container">
      <div class="table-filters">
        <div class="table-search-box">
          <i data-lucide="search" style="width:16px;height:16px;color:var(--color-text-muted);"></i>
          <input type="text" id="search-personas" placeholder="Buscar por DNI o nombre...">
        </div>
      </div>

      <table class="table-custom" id="tabla-personas">
        <thead>
          <tr>
            <th>Nombre Completo</th>
            <th>Identificación (DNI)</th>
            <th>Departamento / Asignación</th>
            <th>Teléfono de Contacto</th>
          </tr>
        </thead>
        <tbody id="tbody-personas">
          <!-- Dinámico -->
        </tbody>
      </table>
    </div>
  </main>
</div>

<!-- Modal Registrar Persona -->
<div class="modal-backdrop" id="modal-nueva-persona">
  <div class="modal-dialog">
    <div class="modal-header">
      <h3 class="modal-title">Registrar Nueva Persona</h3>
      <button onclick="closeModal('modal-nueva-persona')" class="modal-close-btn">&times;</button>
    </div>
    <form onsubmit="guardarPersona(event)">
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Nombre Completo y Rango</label>
          <input type="text" id="per-name" class="form-control" required placeholder="Subinspector Manuel Suazo">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Número de Identificación (DNI)</label>
            <input type="text" id="per-dni" class="form-control" required placeholder="0801-1994-11992">
          </div>
          <div class="form-group">
            <label class="form-label">Departamento</label>
            <input type="text" id="per-dept" class="form-control" required placeholder="Inteligencia Policial">
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" onclick="closeModal('modal-nueva-persona')" class="btn btn-secondary">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar Registro</button>
      </div>
    </form>
  </div>
</div>

<script>
  function cargarPersonas() {
    if (!window.SAGPStorage) return;
    const personas = SAGPStorage.getCollection('personas');
    const tbody = document.getElementById('tbody-personas');

    tbody.innerHTML = personas.map(p => `
      <tr>
        <td><strong>${p.name}</strong></td>
        <td><code>${p.identification}</code></td>
        <td>${p.department}</td>
        <td>${p.phone || '+504 9000-0000'}</td>
      </tr>
    `).join('');
  }

  function guardarPersona(e) {
    e.preventDefault();
    const nueva = {
      name: document.getElementById('per-name').value,
      identification: document.getElementById('per-dni').value,
      department: document.getElementById('per-dept').value,
      phone: '+504 9888-7766'
    };
    SAGPStorage.addItem('personas', nueva);
    closeModal('modal-nueva-persona');
    cargarPersonas();
  }

  document.addEventListener('DOMContentLoaded', () => {
    cargarPersonas();
    setupTableSearch('search-personas', 'tabla-personas');
  });
</script>

<?php require_once __DIR__ . '/../components/footer.php'; ?>
