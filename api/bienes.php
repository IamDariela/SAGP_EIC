<?php
// Reserved compatibility endpoint. The new client uses datos.php and acciones.php.
require __DIR__ . '/bootstrap.php';
require_method(['GET']);
require_official_backend();
