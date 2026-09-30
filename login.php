<?php
require_once __DIR__ . '/config/app.php';
?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Iniciar Sesión - <?php echo APP_NAME; ?></title>
  <link rel="stylesheet" href="<?php echo base_url('assets/css/variables.css'); ?>">
  <link rel="stylesheet" href="<?php echo base_url('assets/css/global.css'); ?>">
  <link rel="stylesheet" href="<?php echo base_url('assets/css/components.css'); ?>">
  <link rel="stylesheet" href="<?php echo base_url('assets/css/forms.css'); ?>">
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    body {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 1rem;
    }
    .login-card {
      background: #ffffff;
      width: 100%;
      max-width: 420px;
      border-radius: 24px;
      padding: 2.5rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
  </style>
</head>
<body>

<div class="login-card">
  <div style="text-align:center;margin-bottom:2rem;">
    <img src="<?php echo base_url('assets/img/logo_eic.png'); ?>" alt="EIC Honduras" style="height:80px;margin:0 auto 1rem auto;">
    <h1 style="font-size:1.5rem;font-weight:900;color:#0f172a;letter-spacing:-0.025em;margin-bottom:0.25rem;">SAGP EIC</h1>
    <p style="font-size:0.85rem;color:#64748b;font-weight:600;">Sistema Administrativo de Gestión Policial</p>
  </div>

  <form onsubmit="handleLogin(event)">
    <div class="form-group">
      <label class="form-label" for="email">Correo Electrónico</label>
      <input type="email" id="email" class="form-control" placeholder="usuario@sig-eic.gov" required value="demo@sig-eic.gov">
    </div>

    <div class="form-group" style="margin-bottom:1.5rem;">
      <label class="form-label" for="password">Contraseña</label>
      <input type="password" id="password" class="form-control" placeholder="••••••••" required value="12345678">
    </div>

    <button type="submit" class="btn btn-primary" style="width:100%;padding:0.8rem;border-radius:12px;font-size:1rem;margin-bottom:1rem;">
      <i data-lucide="log-in"></i> Iniciar Sesión
    </button>
  </form>

  <div style="text-align:center;margin-top:1.5rem;padding-top:1.5rem;border-top:1px solid #e2e8f0;">
    <p style="font-size:0.75rem;color:#64748b;margin-bottom:0.75rem;font-weight:600;">¿Quieres probar la aplicación de inmediato?</p>
    <button onclick="enterDemoMode()" class="btn btn-accent" style="width:100%;padding:0.75rem;border-radius:12px;font-weight:700;">
      <i data-lucide="sparkles"></i> Ingresar a Demostración Sistema
    </button>
  </div>
</div>

<script>
  function handleLogin(e) {
    e.preventDefault();
    enterDemoMode();
  }

  function enterDemoMode() {
    window.location.href = '<?php echo base_url("pages/dashboard.php"); ?>';
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) lucide.createIcons();
  });
</script>

</body>
</html>
