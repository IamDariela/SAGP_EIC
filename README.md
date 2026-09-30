# SAGP - Sistema Administrativo de Gestión Policial
**Escuela de Investigación Criminal (EIC Honduras)**

---

## 📌 Descripcion General

El **Sistema Administrativo de Gestión Policial (SAGP)** es una plataforma integral diseñada para la administración, control de inventarios, armamento, parque vehicular, dormitorios académicos, mantenimientos y logística de la Escuela de Investigación Criminal (EIC).

Esta versión ha sido migrada desde una demo de TypeScript/React hacia una arquitectura limpia y directa basada en **HTML5, CSS3, JavaScript Vanilla y PHP**.

---

## 🚀 Tecnologías Definitivas

* **Frontend:** HTML5, CSS3 Vanilla (Design System con variables CSS), JavaScript Vanilla (ES6+).
* **Backend:** PHP 7.4+ / PHP 8.x (Estructura modular con Includes de componentes).
* **Iconografía:** Lucide Icons.
* **Base de Datos (Futuro):** MySQL / MariaDB (Esquema preliminar incluido en `database/schema.sql`).

---

## 📂 Estructura del Proyecto

```text
sagp/
├── index.php                 # Redirección inicial (hacia login o dashboard)
├── login.php                 # Pantalla de inicio de sesión y acceso a Demostración
├── README.md                 # Guía del proyecto y arquitectura
│
├── config/
│   └── app.php               # Configuración global del sistema y helper base_url()
│
├── components/               # Bloques reutilizables PHP (Includes)
│   ├── head.php              # Meta tags, carga de hojas de estilo e íconos Lucide
│   ├── sidebar.php           # Navegación lateral filtrada por Rol Simulado
│   ├── header.php            # Barra superior (Reloj en vivo, Rol Simulado, Perfil)
│   ├── footer.php            # Scripts JS globales y cierre de documento HTML
│   └── status_badge.php      # Generador de etiquetas de estado
│
├── pages/                    # Pantallas / Módulos de la aplicación
│   ├── dashboard.php         # Panel principal y tarjetas de resumen
│   ├── inventario.php        # Inventario general de bienes
│   ├── ubicaciones.php       # Gestión de áreas, aulas y plano
│   ├── dormitorios.php       # Plano interactivo y asignación de camas
│   ├── planificacion.php     # Proyección de cupos por cursos
│   ├── armeria.php           # Control de armamento y calibres
│   ├── vehiculos.php         # Control de flotas, patrullas y kilometraje
│   ├── mantenimiento.php     # Registro de incidencias y órdenes de trabajo
│   ├── proyectos.php         # Proyectos de compras e inversiones
│   ├── personas.php          # Padrón de personal y oficiales
│   ├── historia.php          # Bitácora de auditoría de cambios
│   ├── reportes.php          # Impresión y generación de reportes
│   ├── notificaciones.php    # Alertas del sistema
│   └── usuarios.php          # Gestión de cuentas y asignación de roles
│
├── assets/
│   ├── css/
│   │   ├── variables.css     # Paleta de colores (Slate/Dorado), sombras y fuentes
│   │   ├── global.css        # Reset tipográfico e instructivo general
│   │   ├── layout.css        # Flexbox/Grid del Sidebar, Header y Main Container
│   │   ├── components.css    # Tarjetas, botones, insignias, pestañas
│   │   ├── forms.css         # Formularios, campos e insumos
│   │   ├── tables.css        # Tablas responsivas y buscadores
│   │   ├── modals.css        # Modales flotantes y overlays
│   │   └── responsive.css    # Ajustes móviles
│   │
│   ├── js/
│   │   ├── app.js            # Reloj en vivo, selector de rol simulado y sidebar toggle
│   │   ├── storage.js        # Gestor de LocalStorage y datos mock
│   │   ├── modal.js          # Control de apertura/cierre de modales
│   │   └── tables.js         # Filtro dinámico en tablas Vanilla JS
│   │
│   └── img/                  # Logos institucionales e imágenes del sistema
│       ├── logo_eic.png
│       ├── logo_eic.svg
│       └── plano_segunda_planta.jpg
│
├── data/
│   └── mock/                 # Archivos de datos simulados en formato JS
│       ├── usuarios.js
│       ├── ubicaciones.js
│       ├── personas.js
│       ├── bienes.js
│       ├── dormitorios.js
│       └── mantenimientos.js
│
├── api/                      # Estructura de endpoints JSON borrador (Preparados para PHP + MySQL)
│   ├── bienes.php
│   └── usuarios.php
│
└── database/                 # Script relacional de base de datos
    └── schema.sql            # Script SQL borrador para MySQL
```

---

## 💻 Requisitos y Ejecución Local

### Requisitos:
* Servidor local con **PHP 7.4 o superior** (XAMPP, WAMP, Laragon, o PHP Server).

### Ejecución rápida con servidor integrado de PHP:
1. Abre una consola de comandos en la carpeta raíz del proyecto:
   ```bash
   cd c:\Users\velas\Downloads\sig-eic_-sistema-integral-de-gestión
   ```
2. Inicia el servidor embebido de PHP:
   ```bash
   php -S localhost:8000
   ```
3. Abre tu navegador e ingresa a:
   [http://localhost:8000/login.php](http://localhost:8000/login.php)

---

## 🎭 Roles Simulados de Demostración

El selector **ROL SIMULADO** ubicado en la barra superior (Header) permite alternar el comportamiento de la interfaz de usuario en tiempo real:

1. **Administrador:** Acceso a todos los módulos y opciones del sistema.
2. **Gestor Inventario:** Acceso a Inventario, Ubicaciones, Dormitorios, Mantenimiento, Personas y Reportes.
3. **Gestor Armamento:** Acceso a Armería y Notificaciones.
4. **Gestor Vehículos:** Acceso a Control de Vehículos y Notificaciones.
5. **Mantenimiento:** Acceso al panel de Incidencias y Órdenes de Mantenimiento.
6. **Consulta General:** Acceso de lectura en vista general.

---

## 🛠️ Modificaciones y Mantenimiento del Proyecto

### ¿Dónde modificar el HTML de una pantalla?
Cada pantalla reside en la carpeta `pages/` (ejemplo: `pages/inventario.php`). Contiene la estructura pura del módulo rodeada por `head.php`, `sidebar.php`, `header.php` y `footer.php`.

### ¿Dónde ajustar los estilos?
Todos los estilos CSS están divididos por funcionalidad dentro de `assets/css/`:
* `variables.css`: Para modificar la paleta de colores corporativos o bordes.
* `components.css`: Para cambiar el aspecto de botones, tarjetas o badges.
* `tables.css`: Para alterar el diseño de las tablas.

### ¿Dónde están los Datos Mock?
En `data/mock/` y `assets/js/storage.js`. Al cargar la página por primera vez, `storage.js` inicializa la sesión en el `localStorage` del navegador.

---

## 🔌 Pasos Futuros para Conectar PHP + MySQL

Actualmente el sistema lee y guarda temporalmente en `localStorage` a través de `assets/js/storage.js`.

Para migrar a una base de datos real en MySQL:
1. Importar el archivo `database/schema.sql` en MySQL.
2. Crear un archivo de conexión `config/database.php` con `PDO` o `mysqli`.
3. Reemplazar en cada archivo dentro de `pages/` las llamadas de JS por consultas directas PHP o peticiones `fetch('/api/bienes.php')`.
