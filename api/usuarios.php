<?php
// Reserved compatibility endpoint. No mock profiles are exposed by the official API.
require __DIR__ . '/bootstrap.php';
require_method(['GET']);
require_official_backend();
