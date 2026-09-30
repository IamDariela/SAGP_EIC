<?php
require_once __DIR__ . '/../config/app.php';
$pageTitle = isset($pageTitle) ? $pageTitle . ' - ' . APP_NAME : APP_NAME;
?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?php echo htmlspecialchars($pageTitle); ?></title>
  
  <!-- CSS del Sistema SAGP -->
  <link rel="stylesheet" href="<?php echo base_url('assets/css/variables.css'); ?>">
  <link rel="stylesheet" href="<?php echo base_url('assets/css/global.css'); ?>">
  <link rel="stylesheet" href="<?php echo base_url('assets/css/layout.css'); ?>">
  <link rel="stylesheet" href="<?php echo base_url('assets/css/components.css'); ?>">
  <link rel="stylesheet" href="<?php echo base_url('assets/css/forms.css'); ?>">
  <link rel="stylesheet" href="<?php echo base_url('assets/css/tables.css'); ?>">
  <link rel="stylesheet" href="<?php echo base_url('assets/css/modals.css'); ?>">
  <link rel="stylesheet" href="<?php echo base_url('assets/css/responsive.css'); ?>">

  <!-- Script de Iconos Lucide -->
  <script src="https://unpkg.com/lucide@latest"></script>
</head>
<body>
<div class="app-wrapper">
