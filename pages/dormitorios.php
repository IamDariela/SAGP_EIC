<?php
$pageTitle = "Control de Dormitorios";
require_once __DIR__ . '/../components/head.php';
require_once __DIR__ . '/../components/sidebar.php';
?>

<div class="app-container">
  <?php require_once __DIR__ . '/../components/header.php'; ?>

  <main class="app-main">
    <div class="page-header">
      <div>
        <h1 class="page-title">Control de Dormitorios</h1>
        <p class="page-subtitle">Asignación de alojamientos y camas para estudiantes e instructores</p>
      </div>
      <div>
        <button onclick="openModal('modal-asignar-cama')" class="btn btn-primary">
          <i data-lucide="user-plus"></i> Asignar Cama
        </button>
      </div>
    </div>

    <!-- Pestañas de Dormitorios -->
    <div class="tabs-container">
      <div class="tab-item active" onclick="filtrarDormitorios('todos', this)">Todos los Dormitorios</div>
      <div class="tab-item" onclick="filtrarDormitorios('Dormitorio de Damas', this)">Dormitorio de Damas</div>
      <div class="tab-item" onclick="filtrarDormitorios('Dormitorio de Caballeros', this)">Dormitorio de Caballeros</div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:1.5rem;" id="grid-dormitorios">
      <!-- Carga Dinámica de Camas -->
    </div>
  </main>
</div>

<!-- Modal Asignar Cama -->
<div class="modal-backdrop" id="modal-asignar-cama">
  <div class="modal-dialog">
    <div class="modal-header">
      <h3 class="modal-title">Asignar Cama a Estudiante</h3>
      <button onclick="closeModal('modal-asignar-cama')" class="modal-close-btn">&times;</button>
    </div>
    <form onsubmit="guardarAsignacionCama(event)">
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Seleccionar Cama Disponible</label>
          <select id="bed-id" class="form-select" required>
            <!-- Dinámico -->
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Nombre Completo del Estudiante / Oficial</label>
          <input type="text" id="student-name" class="form-control" required placeholder="Inspector Mario Bueso">
        </div>
        <div class="form-group">
          <label class="form-label">Curso o Diplomado</label>
          <input type="text" id="course-name" class="form-control" required placeholder="Curso de Inteligencia Policial II">
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" onclick="closeModal('modal-asignar-cama')" class="btn btn-secondary">Cancelar</button>
        <button type="submit" class="btn btn-primary">Confirmar Asignación</button>
      </div>
    </form>
  </div>
</div>

<script>
  let dormFilter = 'todos';

  function cargarDormitorios() {
    if (!window.SAGPStorage) return;
    const camas = SAGPStorage.getCollection('dormitorios');
    const container = document.getElementById('grid-dormitorios');
    const selectCamas = document.getElementById('bed-id');

    let filtradas = camas;
    if (dormFilter !== 'todos') {
      filtradas = filtradas.filter(c => c.dormitory === dormFilter);
    }

    container.innerHTML = filtradas.map(c => `
      <div class="card" style="border-left:5px solid ${c.status === 'occupied' ? 'var(--color-accent)' : 'var(--color-success)'}">
        <div class="card-header" style="margin-bottom:0.5rem;padding-bottom:0.5rem;">
          <h3 class="card-title">Cama ${c.bedNumber}</h3>
          <span class="badge ${c.status === 'occupied' ? 'badge-warning' : 'badge-good'}">
            ${c.status === 'occupied' ? 'Ocupada' : 'Disponible'}
          </span>
        </div>
        <p style="font-size:0.75rem;color:var(--color-text-muted);font-weight:600;margin-bottom:0.75rem;">
          ${c.dormitory} - ${c.floor}ª Planta
        </p>

        ${c.status === 'occupied' ? `
          <div style="background:#f8fafc;padding:0.75rem;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:0.75rem;">
            <p style="font-size:0.85rem;font-weight:800;color:var(--color-primary);">${c.assignedStudent}</p>
            <p style="font-size:0.75rem;color:var(--color-text-muted);">${c.course}</p>
          </div>
          <button onclick="liberarCama('${c.id}')" class="btn btn-sm btn-secondary" style="width:100%;">
            <i data-lucide="log-out" style="width:14px;height:14px;"></i> Liberar Cama
          </button>
        ` : `
          <div style="padding:0.75rem 0;color:var(--color-text-muted);font-size:0.8rem;font-style:italic;">
            Sin ocupante actualmente
          </div>
        `}
      </div>
    `).join('');

    // Rellenar select del modal con camas disponibles
    const disponibles = camas.filter(c => c.status === 'available');
    selectCamas.innerHTML = disponibles.map(c => `<option value="${c.id}">Cama ${c.bedNumber} (${c.dormitory})</option>`).join('');

    if (window.lucide) lucide.createIcons();
  }

  function filtrarDormitorios(dorm, el) {
    dormFilter = dorm;
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    cargarDormitorios();
  }

  function guardarAsignacionCama(e) {
    e.preventDefault();
    const bedId = document.getElementById('bed-id').value;
    const student = document.getElementById('student-name').value;
    const course = document.getElementById('course-name').value;

    SAGPStorage.updateItem('dormitorios', bedId, {
      status: 'occupied',
      assignedStudent: student,
      course: course
    });

    closeModal('modal-asignar-cama');
    cargarDormitorios();
  }

  function liberarCama(id) {
    if (confirm('¿Desea desasignar la cama seleccionada?')) {
      SAGPStorage.updateItem('dormitorios', id, {
        status: 'available',
        assignedStudent: null,
        course: null
      });
      cargarDormitorios();
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    cargarDormitorios();
  });
</script>

<?php require_once __DIR__ . '/../components/footer.php'; ?>
