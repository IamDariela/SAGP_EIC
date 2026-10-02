<?php
$pageKey = 'login';
$pageTitle = 'Acceso';
require __DIR__ . '/components/head.php';
?>
<main class="login-page">
  <section class="login-card">
    <img src="<?= html(base_url('assets/img/logo_eic.png')) ?>" alt="EIC Honduras" class="login-logo">
    <h1>SAGP EIC</h1><p>Sistema de Administración y Gestión Patrimonial</p>
    <p id="page-status" role="status">Cargando acceso…</p>
    <?php if (APP_DATA_MODE === 'demo'): ?>
    <p class="notice">Selecciona una función institucional para recorrer la demostración con información de ejemplo.</p>
    <form id="login-form">
      <div class="form-group"><label class="form-label" for="demo-user">Perfil de demostración</label><select id="demo-user" class="form-select" required></select></div>
      <button type="submit" class="btn btn-primary">Entrar a la demostración</button>
    </form>
    <?php else: ?>
    <p class="notice">El acceso institucional aún no está habilitado. Solicita su activación al responsable del sistema.</p>
    <?php endif; ?>
  </section>
</main>
<?php require __DIR__ . '/components/footer.php'; ?>
