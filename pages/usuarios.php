<?php
$pageTitle = "Gestión de Usuarios";
require_once __DIR__ . '/../components/head.php';
require_once __DIR__ . '/../components/sidebar.php';
?>

<div class="app-container">
  <?php require_once __DIR__ . '/../components/header.php'; ?>

  <main class="app-main">
    <div class="page-header">
      <div>
        <h1 class="page-title">Administración de Usuarios y Roles</h1>
        <p class="page-subtitle">Control de acceso y asignación de permisos de usuarios en SAGP</p>
      </div>
      <div>
        <button onclick="openModal('modal-nuevo-usuario')" class="btn btn-primary">
          <i data-lucide="user-plus"></i> Crear Usuario
        </button>
      </div>
    </div>

    <div class="table-container">
      <table class="table-custom" id="tabla-usuarios">
        <thead>
          <tr>
            <th>Nombre Completo</th>
            <th>Correo Electrónico</th>
            <th>Rol Asignado</th>
            <th>Estado Cuenta</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody id="tbody-usuarios">
          <!-- Carga Dinámica -->
        </tbody>
      </table>
    </div>
  </main>
</div>

<!-- Modal Crear Usuario -->
<div class="modal-backdrop" id="modal-nuevo-usuario">
  <div class="modal-dialog">
    <div class="modal-header">
      <h3 class="modal-title">Crear Nuevo Usuario</h3>
      <button onclick="closeModal('modal-nuevo-usuario')" class="modal-close-btn">&times;</button>
    </div>
    <form onsubmit="guardarUsuario(event)">
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Nombre Completo</label>
          <input type="text" id="usr-name" class="form-control" required placeholder="Subinspector Javier Bueso">
        </div>
        <div class="form-group">
          <label class="form-label">Correo Electrónico Institucional</label>
          <input type="email" id="usr-email" class="form-control" required placeholder="jbueso@sig-eic.gov">
        </div>
        <div class="form-group">
          <label class="form-label">Rol de Sistema</label>
          <select id="usr-role" class="form-select" required>
            <option value="admin">Administrador</option>
            <option value="inventory_manager">Encargado Inventario</option>
            <option value="weapon_manager">Encargado Armamento</option>
            <option value="vehicle_manager">Encargado Vehículos</option>
            <option value="maintenance_staff">Técnico Mantenimiento</option>
            <option value="viewer">Consulta General</option>
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" onclick="closeModal('modal-nuevo-usuario')" class="btn btn-secondary">Cancelar</button>
        <button type="submit" class="btn btn-primary">Crear Cuenta</button>
      </div>
    </form>
  </div>
</div>

<script>
  function cargarUsuarios() {
    if (!window.SAGPStorage) return;
    const usuarios = SAGPStorage.getCollection('usuarios');
    const tbody = document.getElementById('tbody-usuarios');

    const roleMap = {
      'admin': 'Administrador',
      'inventory_manager': 'Encargado Inventario',
      'weapon_manager': 'Encargado Armamento',
      'vehicle_manager': 'Encargado Vehículos',
      'maintenance_staff': 'Mantenimiento',
      'viewer': 'Consulta General'
    };

    tbody.innerHTML = usuarios.map(u => `
      <tr>
        <td><strong>${u.name}</strong></td>
        <td>${u.email}</td>
        <td><span class="badge badge-maintenance">${roleMap[u.role] || u.role}</span></td>
        <td><span class="badge badge-${u.status}">${u.status === 'active' ? 'Activo' : 'Inactivo'}</span></td>
        <td>
          <button onclick="eliminarUsuario('${u.id}')" class="btn btn-sm btn-danger btn-icon">
            <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
          </button>
        </td>
      </tr>
    `).join('');

    if (window.lucide) lucide.createIcons();
  }

  function guardarUsuario(e) {
    e.preventDefault();
    const nuevo = {
      name: document.getElementById('usr-name').value,
      email: document.getElementById('usr-email').value,
      role: document.getElementById('usr-role').value,
      status: 'active'
    };
    SAGPStorage.addItem('usuarios', nuevo);
    closeModal('modal-nuevo-usuario');
    cargarUsuarios();
  }

  function eliminarUsuario(id) {
    if (confirm('¿Desea desactivar la cuenta del usuario?')) {
      SAGPStorage.deleteItem('usuarios', id);
      cargarUsuarios();
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    cargarUsuarios();
  });
</script>

<?php require_once __DIR__ . '/../components/footer.php'; ?>
