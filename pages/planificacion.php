<?php
$pageTitle = "Planificación de Cupos";
require_once __DIR__ . '/../components/head.php';
require_once __DIR__ . '/../components/sidebar.php';
?>

<div class="app-container">
  <?php require_once __DIR__ . '/../components/header.php'; ?>

  <main class="app-main">
    <div class="page-header">
      <div>
        <h1 class="page-title">Planificación de Cupos Académicos</h1>
        <p class="page-subtitle">Programación de cursos, proyección de estudiantes y cupos</p>
      </div>
      <div>
        <button onclick="openModal('modal-nuevo-curso')" class="btn btn-primary">
          <i data-lucide="plus"></i> Programar Curso
        </button>
      </div>
    </div>

    <div class="table-container">
      <table class="table-custom">
        <thead>
          <tr>
            <th>Código</th>
            <th>Nombre del Curso / Diplomado</th>
            <th>Fecha Inicio</th>
            <th>Fecha Fin</th>
            <th>Cupos Proyectados</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>CUR-2026-01</strong></td>
            <td>Curso de Especialización Criminalística III</td>
            <td>15-Oct-2026</td>
            <td>15-Dic-2026</td>
            <td><span class="badge badge-maintenance">35 Estudiantes</span></td>
            <td><span class="badge badge-good">Planificado</span></td>
          </tr>
          <tr>
            <td><strong>CUR-2026-02</strong></td>
            <td>Diplomado de Mando y Dirección Policial</td>
            <td>01-Nov-2026</td>
            <td>28-Feb-2027</td>
            <td><span class="badge badge-maintenance">25 Estudiantes</span></td>
            <td><span class="badge badge-good">Planificado</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </main>
</div>

<!-- Modal Programar Curso -->
<div class="modal-backdrop" id="modal-nuevo-curso">
  <div class="modal-dialog">
    <div class="modal-header">
      <h3 class="modal-title">Programar Nuevo Curso</h3>
      <button onclick="closeModal('modal-nuevo-curso')" class="modal-close-btn">&times;</button>
    </div>
    <form onsubmit="alert('Curso programado en la demo visual');closeModal('modal-nuevo-curso');return false;">
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Código del Curso</label>
          <input type="text" class="form-control" required placeholder="CUR-2026-03">
        </div>
        <div class="form-group">
          <label class="form-label">Nombre del Curso</label>
          <input type="text" class="form-control" required placeholder="Taller de Análisis Balístico Avanzado">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Cupos Esperados</label>
            <input type="number" class="form-control" required placeholder="30">
          </div>
          <div class="form-group">
            <label class="form-label">Fecha Inicio</label>
            <input type="date" class="form-control" required>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" onclick="closeModal('modal-nuevo-curso')" class="btn btn-secondary">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar Programación</button>
      </div>
    </form>
  </div>
</div>

<?php require_once __DIR__ . '/../components/footer.php'; ?>
