/**
 * Lógica Principal de Aplicación SAGP
 * Reloj, Cambio de Rol Simulado, Menú Desplegable y Sidebar Toggle
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Reloj en tiempo real
  function updateClock() {
    const clockEl = document.getElementById('live-clock');
    if (clockEl) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('es-HN', { hour12: false });
      const dateStr = now.toLocaleDateString('es-HN', { day: '2-digit', month: 'short' });
      clockEl.innerHTML = `<i data-lucide="clock" style="width:14px;height:14px;"></i> ${dateStr} ${timeStr}`;
      if (window.lucide) lucide.createIcons();
    }
  }
  setInterval(updateClock, 1000);
  updateClock();

  // 2. Control de Sidebar Colapsable & Móvil
  const sidebar = document.getElementById('app-sidebar');
  const sidebarToggleBtn = document.getElementById('sidebar-toggle');
  
  if (sidebarToggleBtn && sidebar) {
    sidebarToggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      if (window.innerWidth <= 1024) {
        sidebar.classList.toggle('mobile-open');
      }
    });
  }

  // 3. Menú Desplegable de Usuario
  const userMenuBtn = document.getElementById('user-menu-btn');
  const userMenuDropdown = document.getElementById('user-menu-dropdown');

  if (userMenuBtn && userMenuDropdown) {
    userMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = userMenuDropdown.style.display === 'block';
      userMenuDropdown.style.display = isVisible ? 'none' : 'block';
    });

    document.addEventListener('click', () => {
      userMenuDropdown.style.display = 'none';
    });
  }

  // 4. Selector de ROL Simulado
  const roleSelect = document.getElementById('simulated-role-select');
  if (roleSelect && window.SAGPStorage) {
    roleSelect.value = SAGPStorage.getCurrentRole();

    roleSelect.addEventListener('change', (e) => {
      const newRole = e.target.value;
      SAGPStorage.setCurrentRole(newRole);
      applyRolePermissions(newRole);
    });

    // Aplicar al cargar
    applyRolePermissions(SAGPStorage.getCurrentRole());
  }

  function applyRolePermissions(role) {
    // Filtrar enlaces del sidebar con atributo data-roles
    document.querySelectorAll('.nav-link[data-roles]').forEach(link => {
      const allowedRoles = link.getAttribute('data-roles').split(',');
      if (allowedRoles.includes(role) || role === 'admin') {
        link.style.display = 'flex';
      } else {
        link.style.display = 'none';
      }
    });

    // Notificar cambios si las páginas escuchan el rol
    window.dispatchEvent(new CustomEvent('role_permission_changed', { detail: { role } }));
  }

  // Renderizar íconos Lucide
  if (window.lucide) {
    lucide.createIcons();
  }
});
