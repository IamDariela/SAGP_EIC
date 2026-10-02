<?php
require_once __DIR__ . '/../config/app.php';
$pageTitle = isset($pageTitle) ? $pageTitle . ' - ' . APP_NAME : APP_NAME;
?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= html($pageTitle) ?></title>
  <link rel="icon" type="image/png" href="<?= html(base_url('assets/img/logo_eic.png')) ?>">
  <?php foreach (['variables','global','layout','components','forms','tables','modals','responsive','app','admin'] as $sheet): ?>
  <link rel="stylesheet" href="<?= html(base_url('assets/css/' . $sheet . '.css')) ?>">
  <?php endforeach; ?>
</head>
<body>
<script type="application/json" id="sagp-config"><?= json_encode([
    'baseUrl' => base_url(), 'dataMode' => APP_DATA_MODE, 'page' => $pageKey ?? 'login',
    'roles' => $roles, 'navigation' => $navigation
], JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE) ?></script>
