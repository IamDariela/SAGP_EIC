<?php
// GET: authenticated profile + CSRF token. DELETE: terminate the PHP session.
require __DIR__ . '/bootstrap.php';
require_method(['GET','DELETE']);
require_official_backend();
