-- SAGP relational proposal. NOT a production migration. Review against the definitive BDD before executing.
-- API IDs are strings; the PHP repository maps BIGINT values to strings and DTOs to camelCase.
CREATE DATABASE IF NOT EXISTS sagp_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sagp_db;

CREATE TABLE IF NOT EXISTS personas (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 nombre VARCHAR(150) NOT NULL, identificacion CHAR(13) NOT NULL UNIQUE,
 departamento VARCHAR(150) NOT NULL, telefono VARCHAR(30),
 creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP, actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS usuarios (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 nombre VARCHAR(150) NOT NULL, email VARCHAR(150) NOT NULL UNIQUE,
 password_hash VARCHAR(255) NOT NULL,
 rol ENUM('admin','inventory_manager','weapon_manager','vehicle_manager','maintenance_staff','viewer','supervisor','conductor','buyer','teacher') NOT NULL,
 persona_id BIGINT UNSIGNED NULL,
 estado ENUM('active','inactive') NOT NULL DEFAULT 'active',
 creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP, actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY (persona_id) REFERENCES personas(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ubicaciones (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 nombre VARCHAR(100) NOT NULL UNIQUE, edificio VARCHAR(100) NOT NULL,
 area VARCHAR(100) NOT NULL, planta TINYINT NOT NULL, tipo VARCHAR(50) NOT NULL,
 responsable_id BIGINT UNSIGNED NULL,
 creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP, actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY (responsable_id) REFERENCES personas(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bienes (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 codigo_interno VARCHAR(50) NOT NULL UNIQUE, nombre VARCHAR(150) NOT NULL,
 tipo ENUM('general','weapon','vehicle') NOT NULL, categoria VARCHAR(50) NOT NULL,
 marca VARCHAR(100), modelo VARCHAR(100), serie VARCHAR(100) UNIQUE,
 descripcion TEXT, color VARCHAR(60), ultimo_movimiento_json JSON,
 costo_unitario DECIMAL(14,2) NOT NULL DEFAULT 0,
 ubicacion_id BIGINT UNSIGNED NOT NULL,
 estado ENUM('good','regular','bad','stored','repaired','maintenance','decommissioned') NOT NULL DEFAULT 'good',
 detalles_json JSON, motivo_baja TEXT,
 creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP, actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY (ubicacion_id) REFERENCES ubicaciones(id)
) ENGINE=InnoDB;

-- Typed details have their own constraints; expose them inside asset.details in the API.
CREATE TABLE IF NOT EXISTS armamento (
 bien_id BIGINT UNSIGNED PRIMARY KEY, calibre VARCHAR(50) NOT NULL, tipo_arma VARCHAR(100),
 FOREIGN KEY (bien_id) REFERENCES bienes(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS vehiculos (
 bien_id BIGINT UNSIGNED PRIMARY KEY, placa VARCHAR(30) NOT NULL UNIQUE,
 kilometraje BIGINT UNSIGNED NOT NULL DEFAULT 0, anio SMALLINT UNSIGNED,
 proximo_mantenimiento DATE,
 FOREIGN KEY (bien_id) REFERENCES bienes(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cursos (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 codigo VARCHAR(50) NOT NULL UNIQUE, nombre VARCHAR(150) NOT NULL, descripcion TEXT,
 fecha_inicio DATE NOT NULL, fecha_fin DATE NOT NULL,
 cupos INT UNSIGNED NOT NULL, confirmados INT UNSIGNED NOT NULL DEFAULT 0,
 externos INT UNSIGNED NOT NULL DEFAULT 0,
 estado ENUM('planned','active','completed') NOT NULL DEFAULT 'planned',
 creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP, actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS participaciones (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, persona_id BIGINT UNSIGNED NOT NULL,
 curso_id BIGINT UNSIGNED NOT NULL, requiere_alojamiento BOOLEAN NOT NULL DEFAULT TRUE,
 estado ENUM('active','withdrawn','completed') NOT NULL DEFAULT 'active',
 creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP, actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE (persona_id,curso_id), FOREIGN KEY (persona_id) REFERENCES personas(id),
 FOREIGN KEY (curso_id) REFERENCES cursos(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS usos_espacios (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, ubicacion_id BIGINT UNSIGNED NOT NULL,
 persona_id BIGINT UNSIGNED NOT NULL, curso_id BIGINT UNSIGNED NOT NULL,
 entrada DATETIME NOT NULL, salida DATETIME, notas TEXT, notas_salida TEXT,
 estado ENUM('active','completed') NOT NULL DEFAULT 'active', usuario_id BIGINT UNSIGNED NOT NULL,
 cerrado_por BIGINT UNSIGNED,
 espacio_ocupado BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN estado='active' THEN ubicacion_id ELSE NULL END) STORED UNIQUE,
 FOREIGN KEY (ubicacion_id) REFERENCES ubicaciones(id), FOREIGN KEY (persona_id) REFERENCES personas(id),
 FOREIGN KEY (curso_id) REFERENCES cursos(id), FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
 FOREIGN KEY (cerrado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS dormitorios_camas (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 numero_cama VARCHAR(30) NOT NULL UNIQUE, dormitorio VARCHAR(100) NOT NULL,
 habitacion VARCHAR(30), litera VARCHAR(30), posicion ENUM('upper','lower'),
 planta TINYINT NOT NULL, estado ENUM('available','occupied','maintenance') NOT NULL DEFAULT 'available',
 creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP, actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS asignaciones (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 bien_id BIGINT UNSIGNED NULL, cama_id BIGINT UNSIGNED NULL,
 persona_id BIGINT UNSIGNED NOT NULL, curso_id BIGINT UNSIGNED NULL,
 participacion_id BIGINT UNSIGNED NULL, uso_espacio_id BIGINT UNSIGNED NULL,
 es_arma BOOLEAN NOT NULL DEFAULT FALSE, devuelto_por BIGINT UNSIGNED NULL, motivo TEXT,
 fecha_inicio DATETIME NOT NULL, fecha_fin DATETIME NULL,
 estado ENUM('active','returned') NOT NULL DEFAULT 'active', usuario_id BIGINT UNSIGNED NOT NULL,
 -- UNIQUE generated columns prevent concurrent double assignments while allowing historical records.
 bien_activo BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN estado='active' THEN bien_id ELSE NULL END) STORED UNIQUE,
 cama_activa BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN estado='active' THEN cama_id ELSE NULL END) STORED UNIQUE,
 persona_con_cama BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN estado='active' AND cama_id IS NOT NULL THEN persona_id ELSE NULL END) STORED UNIQUE,
 participacion_con_arma BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN estado='active' AND es_arma THEN participacion_id ELSE NULL END) STORED UNIQUE,
 FOREIGN KEY (bien_id) REFERENCES bienes(id), FOREIGN KEY (cama_id) REFERENCES dormitorios_camas(id),
 FOREIGN KEY (persona_id) REFERENCES personas(id), FOREIGN KEY (curso_id) REFERENCES cursos(id),
 FOREIGN KEY (usuario_id) REFERENCES usuarios(id), FOREIGN KEY (devuelto_por) REFERENCES usuarios(id),
 FOREIGN KEY (participacion_id) REFERENCES participaciones(id), FOREIGN KEY (uso_espacio_id) REFERENCES usos_espacios(id)
) ENGINE=InnoDB;
-- The backend must enforce exactly one of bien_id/cama_id, and require curso_id for a bed.

CREATE TABLE IF NOT EXISTS mantenimientos (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, bien_id BIGINT UNSIGNED NULL, cama_id BIGINT UNSIGNED NULL,
 tipo_trabajo VARCHAR(80), etapa ENUM('diagnosis','repair','verification','verified') NOT NULL DEFAULT 'diagnosis',
 descripcion TEXT NOT NULL, diagnostico TEXT, trabajo TEXT, verificacion TEXT, fecha_inicio DATE NOT NULL, fecha_fin DATE,
 estado ENUM('open','closed') NOT NULL DEFAULT 'open', estado_anterior VARCHAR(30),
 usuario_id BIGINT UNSIGNED NOT NULL, cerrado_por BIGINT UNSIGNED,
 bien_con_orden_abierta BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN estado='open' THEN bien_id ELSE NULL END) STORED UNIQUE,
 cama_con_orden_abierta BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN estado='open' THEN cama_id ELSE NULL END) STORED UNIQUE,
 FOREIGN KEY (bien_id) REFERENCES bienes(id), FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
 FOREIGN KEY (cerrado_por) REFERENCES usuarios(id), FOREIGN KEY (cama_id) REFERENCES dormitorios_camas(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS proyectos (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, nombre VARCHAR(150) NOT NULL,
 descripcion TEXT NOT NULL, presupuesto DECIMAL(14,2) NOT NULL,
 ubicacion_id BIGINT UNSIGNED NULL, anio SMALLINT UNSIGNED, extraordinario BOOLEAN NOT NULL DEFAULT FALSE,
 estado ENUM('draft','approved','rejected') NOT NULL DEFAULT 'draft', resuelto_por BIGINT UNSIGNED,
 creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP, actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY (resuelto_por) REFERENCES usuarios(id), FOREIGN KEY (ubicacion_id) REFERENCES ubicaciones(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bitacora (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, usuario_id BIGINT UNSIGNED NOT NULL,
 usuario_nombre VARCHAR(150) NOT NULL, rol VARCHAR(40) NOT NULL,
 operacion VARCHAR(60) NOT NULL, entidad_id VARCHAR(80) NOT NULL, entidad_nombre VARCHAR(200) NOT NULL,
 antes_json JSON, despues_json JSON, fecha_hora DATETIME NOT NULL,
 INDEX (fecha_hora), FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notificaciones (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, operacion VARCHAR(60), entidad_id VARCHAR(80), mensaje TEXT NOT NULL,
 creado_en DATETIME NOT NULL
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS notificaciones_lecturas (
 notificacion_id BIGINT UNSIGNED NOT NULL, usuario_id BIGINT UNSIGNED NOT NULL,
 PRIMARY KEY (notificacion_id,usuario_id),
 FOREIGN KEY (notificacion_id) REFERENCES notificaciones(id), FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;
-- Rows are archived/deactivated rather than deleted, preserving assignments and audit references.
-- No INSERT of demo records is included. Configure an official administrator separately.

CREATE TABLE IF NOT EXISTS conductores (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, persona_id BIGINT UNSIGNED NOT NULL UNIQUE,
 usuario_id BIGINT UNSIGNED NULL UNIQUE, licencia VARCHAR(80) NOT NULL UNIQUE, categoria VARCHAR(80) NOT NULL,
 emision DATE NOT NULL, vencimiento DATE NOT NULL, estado ENUM('active','inactive') NOT NULL DEFAULT 'active', observaciones TEXT,
 creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP, actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY (persona_id) REFERENCES personas(id), FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS recorridos (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, bien_id BIGINT UNSIGNED NOT NULL, conductor_id BIGINT UNSIGNED NOT NULL,
 destino VARCHAR(200) NOT NULL, motivo TEXT NOT NULL, salida DATETIME NOT NULL, regreso DATETIME,
 kilometraje_inicial BIGINT UNSIGNED NOT NULL, kilometraje_final BIGINT UNSIGNED NULL, observaciones TEXT,
 estado ENUM('active','completed') NOT NULL DEFAULT 'active', usuario_id BIGINT UNSIGNED NOT NULL, cerrado_por BIGINT UNSIGNED,
 vehiculo_en_uso BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN estado='active' THEN bien_id ELSE NULL END) STORED UNIQUE,
 conductor_en_uso BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN estado='active' THEN conductor_id ELSE NULL END) STORED UNIQUE,
 FOREIGN KEY (bien_id) REFERENCES bienes(id), FOREIGN KEY (conductor_id) REFERENCES conductores(id),
 FOREIGN KEY (usuario_id) REFERENCES usuarios(id), FOREIGN KEY (cerrado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS incidencias (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, bien_id BIGINT UNSIGNED NOT NULL, descripcion TEXT NOT NULL,
 estado ENUM('open','resolved') NOT NULL DEFAULT 'open', fecha_hora DATETIME NOT NULL,
 reportado_por BIGINT UNSIGNED NOT NULL, mantenimiento_id BIGINT UNSIGNED NULL,
 resolucion TEXT, resuelto_por BIGINT UNSIGNED NULL, resuelto_en DATETIME,
 FOREIGN KEY (bien_id) REFERENCES bienes(id), FOREIGN KEY (reportado_por) REFERENCES usuarios(id),
 FOREIGN KEY (mantenimiento_id) REFERENCES mantenimientos(id), FOREIGN KEY (resuelto_por) REFERENCES usuarios(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS fondos (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, concepto VARCHAR(200) NOT NULL, monto DECIMAL(14,2) NOT NULL,
 fecha DATE NOT NULL, curso_id BIGINT UNSIGNED NULL, estado ENUM('received') NOT NULL DEFAULT 'received',
 creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (curso_id) REFERENCES cursos(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS financiaciones (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, fondo_id BIGINT UNSIGNED NOT NULL, proyecto_id BIGINT UNSIGNED NOT NULL,
 monto DECIMAL(14,2) NOT NULL, fecha DATE NOT NULL, creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (fondo_id) REFERENCES fondos(id), FOREIGN KEY (proyecto_id) REFERENCES proyectos(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS gastos (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, proyecto_id BIGINT UNSIGNED NOT NULL, proveedor VARCHAR(150) NOT NULL,
 concepto TEXT NOT NULL, factura VARCHAR(100) NOT NULL, monto DECIMAL(14,2) NOT NULL, fecha DATE NOT NULL,
 creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE (proveedor,factura), FOREIGN KEY (proyecto_id) REFERENCES proyectos(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS documentos (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 tipo_objeto ENUM('asset','person','driver','maintenance','project','fund','expense') NOT NULL,
 objeto_id BIGINT UNSIGNED NOT NULL, nombre VARCHAR(255) NOT NULL, mime VARCHAR(80) NOT NULL,
 ruta_privada VARCHAR(500) NOT NULL, fase ENUM('before','after','document') NOT NULL DEFAULT 'document',
 descripcion TEXT, usuario_id BIGINT UNSIGNED NOT NULL, creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 INDEX (tipo_objeto,objeto_id), FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;
-- The backend validates polymorphic document targets and exactly one maintenance resource.
-- Lock funds/projects before allocations/expenses; SQL totals alone do not prevent overspending.
-- Keep document bytes outside the public directory and authorize every download.
-- This proposal has not been executed or validated against a database engine.
