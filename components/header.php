<header class="app-header">
  <div class="header-left">
    <button id="sidebar-toggle" class="sidebar-toggle-btn" aria-label="Abrir o cerrar menú" aria-expanded="true"><svg class="icon" aria-hidden="true"><use href="<?= html(base_url('assets/img/icons.svg#menu')) ?>"></use></svg></button>
    <strong class="header-module"><?= html($navigation[$pageKey][0]) ?></strong>
  </div>
  <div class="header-right">
    <?php if (APP_DATA_MODE === 'demo'): ?>
    <div class="role-selector-box"><label for="simulated-role-select">PERFIL:</label><select id="simulated-role-select" class="role-select" title="Seleccionar perfil de demostración">
      <?php foreach ($roles as $value => $label): ?><option value="<?= html($value) ?>"><?= html($label) ?></option><?php endforeach; ?>
    </select></div>
    <?php endif; ?>
    <details class="account-menu"><summary><span id="user-avatar" class="user-avatar" aria-hidden="true"></span><span id="current-user"></span><span aria-hidden="true">⌄</span></summary><div class="account-options"><button id="logout" class="btn btn-secondary">Cerrar sesión</button></div></details>
    <time id="live-clock" class="clock-display"><span id="clock-date"></span><strong id="clock-time"></strong></time>
  </div>
</header>
