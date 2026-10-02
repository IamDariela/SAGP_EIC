# SAGP — Escuela de Investigación Criminal

Aplicación en **PHP, HTML, CSS y JavaScript**, sin compilación, framework de frontend ni dependencias npm. Node se usa únicamente para las pruebas. Comenzar por [AVANCES.md](AVANCES.md) para conocer el trabajo terminado y pendiente. La comparación de las 16 capturas del administrador y el mapa de los cambios están en [docs/DISENO_ADMINISTRADOR.md](docs/DISENO_ADMINISTRADOR.md). La guía de presentación y el contraste con los 67 apartados están en [docs/DEMO_INSTITUCIONAL.md](docs/DEMO_INSTITUCIONAL.md).

## Ejecutar

Requiere PHP 7.4 o superior con archivos estáticos y módulos JavaScript servidos por HTTP. Para desarrollo se recomienda la instalación PHP ya disponible en el equipo:

```powershell
& 'C:\xampp\php\php.exe' -S 127.0.0.1:8000 -t .
```

Abrir `http://127.0.0.1:8000/login.php`. Con PHP disponible en PATH también sirve `php -S 127.0.0.1:8000 -t .`. No abrir los archivos con `file://` ni usar un servidor exclusivamente HTML.

El modo predeterminado es **demo**. Seleccionar un perfil activo para entrar y usar el selector superior para comprobar sus permisos. El selector cambia a un usuario activo de esa función, incluyendo su identidad vinculada como docente o conductor. El Usuario de Consulta no puede registrar ni modificar datos. El cierre de sesión conserva los registros de demostración.

## Mapa del código

| Carpeta/archivo | Responsabilidad |
|---|---|
| `pages/*.php` | Entradas de los módulos: clave y descripción de pantalla. |
| `components/page.php` | Marco compartido de las pantallas. |
| `components/head.php`, `sidebar.php`, `header.php`, `footer.php` | HTML común, navegación y carga del módulo principal. |
| `config/app.php`, `navigation.php` | Modo de datos, rutas, títulos, módulos y roles. |
| `assets/css/` | Estilos por responsabilidad; `variables.css` contiene la base, `app.css` estilos funcionales y `admin.css` la presentación institucional por módulos. |
| `assets/js/app.js` | Arranque, sesión, permisos de navegación y carga de pantallas. |
| `assets/js/pages/` | Controladores de interfaz. `assets.js` comparte fichas de bienes; `vehicles.js` añade recorridos/incidencias; `catalogs.js` comparte Personas/Usuarios. Los demás módulos tienen archivos por responsabilidad. |
| `assets/js/core/` | Modelo, permisos, comandos, actualización de versiones, sesión, cupos, consultas/reportes, QR, hojas de cálculo, fichas y documentos. Consultar el mapa detallado de arquitectura. |
| `assets/js/storage.js`, `assets/js/data/` | Interfaz asíncrona y proveedores local/API. |
| `data/mock/` | Ejemplos exclusivos de la demostración. |
| `api/` | Contrato y puntos de conexión PHP, actualmente sin BDD. |
| `database/schema.sql` | Propuesta relacional, sin registros simulados. No es una migración de una BDD existente. |
| `docs/` | Arquitectura, contrato de datos y procedimiento para conectar la BDD. |
| `tests/` | Verificaciones de reglas, persistencia, API y rutas HTTP. |
| `assets/img/referencias/` | Planos únicos conservados del proyecto original; no son datos de la aplicación. |
| `AVANCES.md`, `AGENTS.md` | Registro de solicitudes y reglas para continuar el trabajo. |

## Comportamiento de la demostración

- Inventario, Armería y Vehículos permiten registrar, editar, asignar, devolver y dar de baja según el rol. La baja conserva el registro y su historial.
- Ubicaciones, Personas y Usuarios tienen registro y edición. Desactivar una cuenta conserva sus referencias; no es una cuenta PHP real.
- Las camas se relacionan con personas y cursos; se conserva cada asignación y devolución, y una persona no puede ocupar dos camas.
- Abrir mantenimiento cambia el estado del bien. Cerrarlo exige diagnóstico y estado final. No se permite una segunda orden abierta para el mismo bien.
- Planificación calcula la demanda por día, con fechas inclusivas y períodos de hasta 366 días. La proyección usa cupos esperados; no supone reparaciones ficticias.
- Proyectos permite crear solicitudes, editarlas mientras estén pendientes y resolverlas. No ejecuta pagos ni procesos externos de compra.
- Cada operación genera bitácora y notificación. Las lecturas de avisos se conservan por usuario.
- El panel y los reportes usan los datos actuales. Los reportes permiten CSV, Word DOCX y Excel XLSX reales, además de impresión/guardar PDF desde el navegador. PDF usa un documento aislado; no requiere ni incluye un generador PDF en servidor.
- Cursos conserva una participación por persona/curso. La misma persona puede regresar a otro curso sin modificar el anterior. Camas y armas se asignan a esa participación; el monitor confirma devoluciones, y el curso no se completa mientras queden recursos vigentes.
- Instalaciones ofrece navegación visual por planta, fichas de espacios, entradas/salidas de docentes y bienes vinculados a cada actividad. El croquis original se conserva como referencia; la vista interactiva es esquemática.
- Dormitorios muestra habitaciones, literas y posiciones, además de estudiantes pendientes e historial de cada cama. Configurar una litera guarda sus dos camas de forma atómica; las posiciones vacías no cuentan como capacidad.
- Conductores incluye licencia, vigencia, cuenta vinculada y documentos. Una salida verifica disponibilidad, conductor y kilometraje; el regreso conserva destino, horas y distancia. El conductor puede reportar incidencias de vehículos utilizados.
- Mantenimiento incluye camas y bienes, etapas, trabajo realizado, verificación y evidencia antes/después. Adjuntos de demo: PNG/JPG/PDF hasta 500 KB por archivo y aproximadamente 1,8 MB en total.
- Fondos y Gastos registra aportes, financiación de proyectos aprobados y gastos con comprobantes. Rechaza sobregiros, importes con más de dos decimales y facturas repetidas por proveedor. Representa planificación/ejecución; no realiza pagos ni sustituye contabilidad o un PAC oficial.
- Importar Información descarga plantillas XLSX y lee la primera hoja XLSX o CSV UTF-8 (hasta 200 filas / 10 MB). Revisa duplicados y reglas, muestra errores y confirma solo las filas correctas. El lote vuelve a validarse al guardar y no se guarda parcialmente. Estudiantes admite Curso y Alojamiento para crear la participación junto con la persona.
- Los QR identifican espacios o participaciones sin incluir datos personales. Se descargan como SVG. La consulta permite lector físico/código de ejemplo; cámara opcional con BarcodeDetector y permiso del usuario en un navegador compatible.
- Búsqueda, panel, avisos y reportes presentan los módulos de la función seleccionada. Las alertas se calculan por fechas y recursos pendientes; nunca devuelven armas ni liberan camas automáticamente.
- Los reportes distinguen situación actual y actividad por período. El historial usa eventos/asignaciones, sin inventar un snapshot completo del inventario pasado.

## Persistencia y recuperación

La demostración se guarda en la **clave histórica** `sagp_demo_state_v2`; su contenido ahora es de **versión 3**. La sesión usa `sagp_demo_session`. Los datos pertenecen a un navegador y origen (host y puerto), y no se comparten entre equipos.

La actualización de versión 2 agrega colecciones vacías y enlaza las ocupaciones existentes con participaciones. Conserva IDs, registros e historial; no incorpora nuevos ejemplos en una demo ya utilizada. Las armas antiguas sin curso se conservan como préstamos anteriores hasta su devolución. Para ver todos los nuevos ejemplos, usar un origen de prueba nuevo o el restablecimiento explícito. No restablecer datos que se desee conservar.

Las colecciones de la anterior versión PHP con prefijo `sagp_demo_` se convierten al nuevo modelo en la primera carga. Sus claves se conservan hasta un restablecimiento explícito. Una relación inválida o JSON dañado produce un error; no se descartan los datos automáticamente. Los datos de la antigua versión React no se importan.

El administrador puede **Restablecer demostración** desde el panel. Acceso también incluye recuperación explícita con confirmación. Estas acciones eliminan los cambios de demostración de esta versión y vuelven a los ejemplos. No usar `localStorage.clear()` para limpiar otros datos del navegador.

## Configuración y futura BDD

PHP lee las variables del proceso; `.env.example` es documentación y no se carga automáticamente. Definirlas antes de iniciar el servidor y reiniciarlo al cambiarlas:

```powershell
$env:SAGP_DATA_MODE = 'demo'
# Solo si la detección de subcarpeta no coincide con el despliegue:
# $env:SAGP_BASE_PATH = '/sagp'
```

`SAGP_DATA_MODE=api` selecciona el proveedor HTTP y **no carga los mocks**. Actualmente sus endpoints responden `503 BACKEND_NOT_CONFIGURED`; el modo API no está conectado ni tiene autenticación oficial. Revisar [docs/DATOS_Y_API.md](docs/DATOS_Y_API.md) antes de implementarlo. El frontend no necesita cambiar de proveedor pantalla por pantalla.

## Verificar

PHP y Node 24+ son suficientes; no ejecutar `npm install`. Se comprobó Node 24.18.0 y PHP 8.2.12. Node 24 se utiliza para la prueba del lector XLSX comprimido con DecompressionStream; no se requiere para servir la aplicación.

```powershell
$env:PHP_BIN = 'C:\xampp\php\php.exe'
node tests/run.mjs
```

El verificador revisa sintaxis, reglas y proveedores con almacenamiento aislado, y abre servidores PHP temporales en puertos locales libres para comprobar todas las páginas, sus recursos, subcarpetas y los errores de API. Cierra esos servidores al terminar. No usa registros del navegador ni una BDD.

Para modificar un módulo, seguir [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) y actualizar **primero** `AVANCES.md`.
