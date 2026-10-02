<?php
// POST accepts {action, id?, data?}. Author, role and CSRF must be checked on the server.
require __DIR__ . '/bootstrap.php';
require_method(['POST']);
require_official_backend();
