-- ===================================================
-- Esquema de Base de Datos MySQL - Sistema SAGP
-- EIC Honduras (Escuela de Investigación Criminal)
-- ===================================================

CREATE DATABASE IF NOT EXISTS `sagp_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `sagp_db`;

-- Tabla de Usuarios
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `codigo_usuario` VARCHAR(50) NOT NULL UNIQUE,
  `nombre` VARCHAR(150) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `rol` ENUM('admin', 'inventory_manager', 'weapon_manager', 'vehicle_manager', 'maintenance_staff', 'viewer') NOT NULL DEFAULT 'viewer',
  `estado` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `creado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Tabla de Ubicaciones
CREATE TABLE IF NOT EXISTS `ubicaciones` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nombre` VARCHAR(100) NOT NULL,
  `edificio` VARCHAR(100) NOT NULL,
  `area` VARCHAR(100) NOT NULL,
  `planta` INT DEFAULT 1,
  `tipo` VARCHAR(50) NOT NULL
) ENGINE=InnoDB;

-- Tabla de Bienes / Inventario
CREATE TABLE IF NOT EXISTS `bienes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `codigo_interno` VARCHAR(50) NOT NULL UNIQUE,
  `nombre` VARCHAR(150) NOT NULL,
  `categoria` VARCHAR(50) NOT NULL,
  `marca` VARCHAR(100),
  `modelo` VARCHAR(100),
  `serie` VARCHAR(100),
  `costo_unitario` DECIMAL(10,2) DEFAULT 0.00,
  `ubicacion_id` INT,
  `estado` ENUM('good', 'regular', 'bad', 'maintenance', 'decommissioned') NOT NULL DEFAULT 'good',
  `detalles_json` JSON,
  `creado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`ubicacion_id`) REFERENCES `ubicaciones`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Tabla de Mantenimientos
CREATE TABLE IF NOT EXISTS `mantenimientos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `bien_id` INT NOT NULL,
  `descripcion` TEXT NOT NULL,
  `diagnostico` TEXT,
  `fecha_inicio` DATE NOT NULL,
  `fecha_fin` DATE,
  `estado` ENUM('open', 'closed') NOT NULL DEFAULT 'open',
  `usuario_id` INT,
  FOREIGN KEY (`bien_id`) REFERENCES `bienes`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Tabla de Dormitorios y Camas
CREATE TABLE IF NOT EXISTS `dormitorios_camas` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `numero_cama` VARCHAR(20) NOT NULL,
  `dormitorio` VARCHAR(100) NOT NULL,
  `planta` INT NOT NULL DEFAULT 1,
  `estado` ENUM('available', 'occupied') NOT NULL DEFAULT 'available',
  `estudiante_nombre` VARCHAR(150),
  `curso_nombre` VARCHAR(150)
) ENGINE=InnoDB;

-- Tabla de Auditoría / Bitácora
CREATE TABLE IF NOT EXISTS `bitacora` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `usuario_id` INT,
  `usuario_nombre` VARCHAR(150),
  `operacion` VARCHAR(100) NOT NULL,
  `objeto_afectado` VARCHAR(150),
  `detalles` TEXT,
  `fecha_hora` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
