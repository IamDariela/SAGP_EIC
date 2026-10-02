<aside class="app-sidebar" id="app-sidebar" aria-label="Navegación principal">
  <div class="sidebar-header">
    <button type="button" id="sidebar-close" class="sidebar-mobile-close" aria-label="Cerrar menú">×</button>
    <div class="sidebar-brand">
      <img src="<?= html(base_url('assets/img/logo_eic.png')) ?>" alt="EIC Honduras" class="sidebar-logo">
      <div class="sidebar-brand-text"><span class="sidebar-brand-title">SAGP</span><span class="sidebar-brand-sub">EIC Honduras</span></div>
    </div>
  </div>
  <nav class="sidebar-nav">
    <?php $primary = ['dashboard','inventario','ubicaciones','dormitorios','planificacion','armeria','vehiculos','mantenimiento','proyectos','personas','historia','reportes','notificaciones','usuarios']; ?>
    <?php foreach ($primary as $key): $entry = $navigation[$key]; $label = $key === 'reportes' ? 'Reportes' : $entry[0]; ?>
    <a href="<?= html(base_url('pages/' . $entry[1])) ?>" class="nav-link <?= $pageKey === $key ? 'active' : '' ?>" data-page="<?= html($key) ?>" aria-label="<?= html($label) ?>" title="<?= html($entry[0]) ?>">
      <svg class="icon" aria-hidden="true"><use href="<?= html(base_url('assets/img/icons.svg#' . $entry[2])) ?>"></use></svg><span><?= html($label) ?></span>
    </a>
    <?php endforeach; ?>
    <details class="nav-extra" <?= !in_array($pageKey, $primary, true) ? 'open' : '' ?>><summary>Más herramientas <span aria-hidden="true">⌄</span></summary>
    <?php foreach ($navigation as $key => $entry): if (in_array($key, $primary, true)) continue; ?>
    <a href="<?= html(base_url('pages/' . $entry[1])) ?>" class="nav-link <?= $pageKey === $key ? 'active' : '' ?>" data-page="<?= html($key) ?>" title="<?= html($entry[0]) ?>"><svg class="icon" aria-hidden="true"><use href="<?= html(base_url('assets/img/icons.svg#' . $entry[2])) ?>"></use></svg><span><?= html($entry[0]) ?></span></a>
    <?php endforeach; ?></details>
  </nav>
  <div class="sidebar-demo-badge"><div class="demo-pill"><svg class="icon" aria-hidden="true"><use href="<?= html(base_url('assets/img/icons.svg#info')) ?>"></use></svg><?= APP_DATA_MODE === 'demo' ? 'Modo Demostración' : 'SAGP · EIC' ?></div></div>
</aside>
