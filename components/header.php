<header class="app-header">
  <div class="header-left">
    <button id="sidebar-toggle" class="sidebar-toggle-btn" title="Alternar Menú Lateral">
      <i data-lucide="menu"></i>
    </button>
    <div style="display:flex;flex-direction:column;">
      <span style="font-weight:800;font-size:0.95rem;letter-spacing:-0.01em;">EIC - Escuela de Investigación Criminal</span>
      <span style="font-size:0.7rem;color:var(--color-accent);font-weight:700;">Sistema Integrado de Gestión (SAGP)</span>
    </div>
  </div>

  <div class="header-right">
    <!-- Selector de Rol Simulado (DEMO) -->
    <div class="role-selector-box" title="Cambiar rol simulado para demostración">
      <label for="simulated-role-select">ROL SIMULADO:</label>
      <select id="simulated-role-select" class="role-select">
        <option value="admin">Administrador</option>
        <option value="inventory_manager">Gestor Inventario</option>
        <option value="weapon_manager">Gestor Armamento</option>
        <option value="vehicle_manager">Gestor Vehículos</option>
        <option value="maintenance_staff">Mantenimiento</option>
        <option value="viewer">Consulta General</option>
      </select>
    </div>

    <!-- Menú de Usuario -->
    <div class="user-menu-dropdown">
      <button id="user-menu-btn" class="user-menu-btn">
        <div class="user-avatar">A</div>
        <span style="font-size:0.8rem;font-weight:700;" class="hidden-mobile">Administrador</span>
        <i data-lucide="chevron-down" style="width:14px;height:14px;"></i>
      </button>

      <div id="user-menu-dropdown" style="display:none;position:absolute;right:0;top:45px;background:#fff;color:#0f172a;border-radius:12px;padding:12px;box-shadow:0 10px 25px rgba(0,0,0,0.2);min-width:200px;z-index:100;border:1px solid #e2e8f0;">
        <div style="margin-bottom:8px;">
          <p style="font-size:0.65rem;font-weight:900;color:#94a3b8;text-transform:uppercase;">Cuenta Demo</p>
          <p style="font-size:0.85rem;font-weight:800;">demo@sig-eic.gov</p>
        </div>
        <hr style="border:none;border-top:1px solid #f1f5f9;margin:8px 0;">
        <a href="<?php echo base_url('login.php'); ?>" style="display:flex;align-items:center;gap:8px;color:#ef4444;font-size:0.8rem;font-weight:700;text-decoration:none;padding:4px 0;">
          <i data-lucide="log-out" style="width:16px;height:16px;"></i>
          <span>Cerrar Sesión</span>
        </a>
      </div>
    </div>

    <!-- Reloj en tiempo real -->
    <div class="clock-display" id="live-clock">
      <i data-lucide="clock" style="width:14px;height:14px;"></i> --:--:--
    </div>
  </div>
</header>
