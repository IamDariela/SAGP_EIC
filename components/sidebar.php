<?php
$currentScript = basename($_SERVER['SCRIPT_NAME']);
function isActiveNav($pageName, $currentScript) {
    return ($currentScript === $pageName) ? 'active' : '';
}
?>
<aside class="app-sidebar" id="app-sidebar">
  <div class="sidebar-header">
    <div class="sidebar-brand">
      <img src="<?php echo base_url('assets/img/logo_eic.png'); ?>" alt="EIC Honduras" class="sidebar-logo">
      <div class="sidebar-brand-text">
        <span class="sidebar-brand-title">SAGP</span>
        <span class="sidebar-brand-sub">EIC Honduras</span>
      </div>
    </div>
  </div>

  <nav class="sidebar-nav">
    <a href="<?php echo base_url('pages/dashboard.php'); ?>" 
       class="nav-link <?php echo isActiveNav('dashboard.php', $currentScript); ?>" 
       data-roles="admin,inventory_manager,weapon_manager,vehicle_manager,viewer,supervisor,conductor,maintenance_staff,buyer">
      <i data-lucide="layout-dashboard"></i>
      <span>Panel Principal</span>
    </a>

    <a href="<?php echo base_url('pages/inventario.php'); ?>" 
       class="nav-link <?php echo isActiveNav('inventario.php', $currentScript); ?>" 
       data-roles="admin,inventory_manager,viewer">
      <i data-lucide="package"></i>
      <span>Inventario General</span>
    </a>

    <a href="<?php echo base_url('pages/ubicaciones.php'); ?>" 
       class="nav-link <?php echo isActiveNav('ubicaciones.php', $currentScript); ?>" 
       data-roles="admin,inventory_manager,viewer">
      <i data-lucide="map-pin"></i>
      <span>Ubicaciones</span>
    </a>

    <a href="<?php echo base_url('pages/dormitorios.php'); ?>" 
       class="nav-link <?php echo isActiveNav('dormitorios.php', $currentScript); ?>" 
       data-roles="admin,inventory_manager,supervisor,viewer">
      <i data-lucide="bed-double"></i>
      <span>Control Dormitorios</span>
    </a>

    <a href="<?php echo base_url('pages/planificacion.php'); ?>" 
       class="nav-link <?php echo isActiveNav('planificacion.php', $currentScript); ?>" 
       data-roles="admin,inventory_manager,supervisor,viewer">
      <i data-lucide="file-text"></i>
      <span>Planificación Cupos</span>
    </a>

    <a href="<?php echo base_url('pages/armeria.php'); ?>" 
       class="nav-link <?php echo isActiveNav('armeria.php', $currentScript); ?>" 
       data-roles="admin,weapon_manager,supervisor">
      <i data-lucide="shield-alert"></i>
      <span>Control de Armas</span>
    </a>

    <a href="<?php echo base_url('pages/vehiculos.php'); ?>" 
       class="nav-link <?php echo isActiveNav('vehiculos.php', $currentScript); ?>" 
       data-roles="admin,vehicle_manager,conductor">
      <i data-lucide="car"></i>
      <span>Control Vehículos</span>
    </a>

    <a href="<?php echo base_url('pages/mantenimiento.php'); ?>" 
       class="nav-link <?php echo isActiveNav('mantenimiento.php', $currentScript); ?>" 
       data-roles="admin,inventory_manager,maintenance_staff">
      <i data-lucide="wrench"></i>
      <span>Mantenimiento</span>
    </a>

    <a href="<?php echo base_url('pages/proyectos.php'); ?>" 
       class="nav-link <?php echo isActiveNav('proyectos.php', $currentScript); ?>" 
       data-roles="admin,buyer,viewer">
      <i data-lucide="shopping-bag"></i>
      <span>Proyectos Compra</span>
    </a>

    <a href="<?php echo base_url('pages/personas.php'); ?>" 
       class="nav-link <?php echo isActiveNav('personas.php', $currentScript); ?>" 
       data-roles="admin,inventory_manager">
      <i data-lucide="users"></i>
      <span>Personas</span>
    </a>

    <a href="<?php echo base_url('pages/historia.php'); ?>" 
       class="nav-link <?php echo isActiveNav('historia.php', $currentScript); ?>" 
       data-roles="admin,inventory_manager,viewer">
      <i data-lucide="history"></i>
      <span>Bitácora Auditoría</span>
    </a>

    <a href="<?php echo base_url('pages/reportes.php'); ?>" 
       class="nav-link <?php echo isActiveNav('reportes.php', $currentScript); ?>" 
       data-roles="admin,inventory_manager,viewer">
      <i data-lucide="printer"></i>
      <span>Reportes</span>
    </a>

    <a href="<?php echo base_url('pages/notificaciones.php'); ?>" 
       class="nav-link <?php echo isActiveNav('notificaciones.php', $currentScript); ?>" 
       data-roles="admin,inventory_manager,weapon_manager,vehicle_manager,supervisor,conductor,maintenance_staff,buyer,viewer">
      <i data-lucide="bell"></i>
      <span>Notificaciones</span>
    </a>

    <a href="<?php echo base_url('pages/usuarios.php'); ?>" 
       class="nav-link <?php echo isActiveNav('usuarios.php', $currentScript); ?>" 
       data-roles="admin">
      <i data-lucide="user-check"></i>
      <span>Usuarios</span>
    </a>
  </nav>

  <div class="sidebar-demo-badge">
    <div class="demo-pill">
      <i data-lucide="info" class="text-accent"></i>
      <span>Modo Demostración</span>
    </div>
  </div>
</aside>
