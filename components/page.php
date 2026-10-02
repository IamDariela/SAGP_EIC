<?php
/** Shared screen shell. Each entry in pages/ selects a module; JS lives in assets/js/pages/. */
require_once __DIR__ . '/../config/app.php';
$pageTitle = $navigation[$pageKey][0];
require_once __DIR__ . '/head.php';
?>
<div class="app-wrapper">
  <?php require __DIR__ . '/sidebar.php'; ?>
  <div class="app-container">
    <?php require __DIR__ . '/header.php'; ?>
    <main class="app-main" id="main-content">
      <div class="page-header"><div><h1 class="page-title"><?= html($navigation[$pageKey][0]) ?></h1><p class="page-subtitle"><?= html($pageDescription) ?></p></div><div id="page-actions" class="actions"></div></div>
      <p id="page-status" role="status">Cargando datos…</p>
      <section id="module-content" aria-label="<?= html($navigation[$pageKey][0]) ?>"></section>
    </main>
  </div>
</div>
<?php require __DIR__ . '/footer.php'; ?>
