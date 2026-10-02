# Avances del proyecto SAGP

Actualizar este archivo **antes de comenzar cada solicitud de mejora** y durante su ejecución. Al retomar, contrastar el registro con el código y las verificaciones. No marcar una solicitud como completada mientras falte trabajo necesario de su alcance.

## 2026-10-01 — Diseño de administrador según las 16 referencias

**Estado: COMPLETADO — adaptación visual y funcional del administrador.**

### Solicitud y alcance

Adaptar estrictamente la presentación del administrador a las 16 imágenes: azul institucional y amarillo, cabecera con módulo/perfil/usuario/reloj, menú con iconos, resumen institucional, entrada de inventario con navegación por plantas, planos y lista filtrada, ubicaciones, dormitorios con literas, planificación, armas, vehículos/conductores, proyectos/ingresos, personas, bitácora, reportes y notificaciones. Mantener PHP/HTML/CSS/JS, arquitectura por responsabilidades, datos calculados y las reglas ya comprobadas. Conservar acceso a los módulos adicionales sin sobrecargar el menú principal. El usuario autorizó comparar por nuestra cuenta y completar las adaptaciones coherentes con las referencias. No conectar BDD ni activar integraciones externas por imitar un botón de una imagen.

### Alcance terminado

- [x] Contrastar referencias con componentes, pantallas, planos y datos existentes.
- [x] Adaptar marco, navegación, iconos, colores, tipografía, tarjetas y tablas.
- [x] Implementar entrada de inventario, planos por planta y filtros relacionados.
- [x] Ajustar panel, ubicaciones, dormitorios y planificación a sus distribuciones de referencia.
- [x] Ajustar armas, vehículos/conductores, proyectos/ingresos, personas y bitácora.
- [x] Ajustar centro de reportes y notificaciones con acciones reales y límites claros.
- [x] Mantener permisos, persistencia, historial y compatibilidad de datos; documentar cambios de lógica autorizados.
- [x] Ejecutar pruebas, revisar escritorio/móvil y guardar evidencia visual comparada.
- [x] Registrar archivos, resultados y límites antes de marcar COMPLETADO.

### Análisis inicial

Se leyeron `AVANCES.md` y `AGENTS.md` antes de cambiar fuentes. La base anterior tiene 20 módulos y 52 pruebas; el marco usa tonos gris oscuro/ámbar, letras como iconos y layouts genéricos. Las referencias piden azul/amarillo, iconos trazados y composiciones específicas. Sus cifras no se copiarán como datos oficiales: se mostrarán totales calculados del estado disponible. Los planos y literas se construirán como interfaz interactiva, conservando identificadores y operaciones.

### Seguimiento de esta mejora

Implementados el marco institucional, los iconos SVG locales y el menú principal con herramientas adicionales. El inventario incorpora entrada por plantas, planos con ubicaciones vinculadas, filtros y vista universal para administrador (las operaciones conservan el tipo real de cada bien). Se incorporaron 20 ubicaciones únicamente en semillas de demo nueva; no se insertan en estados locales existentes ni en API. Panel y ubicaciones muestran conteos calculados. Dormitorios cuentan con pestañas, literas y configuración atómica de sus dos camas; la planificación conserva capacidad real y demanda confirmada/proyectada. Vehículos incorpora pestaña de conductores y mantiene salidas/regresos/incidencias. Proyectos integra ingresos, compromisos, gastos y formularios compartidos con Finanzas.

Verificación intermedia: sintaxis de 35 PHP y 60 JS/MJS correcta, 52 pruebas anteriores correctas. El chequeo HTTP se interrumpió por una aserción interna de la biblioteca HTTP de Node. Posteriormente se completaron personas, bitácora, reportes y notificaciones, y se añadieron siete pruebas. La aserción HTTP se resolvió consumiendo el cuerpo de cada recurso: quedaban respuestas SVG sin leer y el parser HTTP de Node en Windows se interrumpía. Al retomar se contrastaron las tareas registradas con los archivos y el navegador; se terminaron móvil, evidencia y documentación del comando de literas. La comprobación final siguiente corresponde al código terminado.

### Archivos y áreas cambiadas

- `components/head.php`, `header.php`, `sidebar.php`, `config/navigation.php`: cabecera, menú, identidad y carga del diseño compartido. `assets/css/admin.css`, `assets/img/icons.svg`, `core/icons.js` y `core/presentation.js`: estilos e iconos locales y componentes de presentación reutilizables.
- `assets/js/app.js`, `core/ui.js`: montaje, identidad, filtros que se limpian al cambiar de usuario y tablas con desplazamiento interno. Se conserva la interfaz asíncrona de datos.
- `assets/js/pages/inventory.js`, `assets.js`, `asset-presentation.js`, `core/floorplans.js`, `data/mock/ubicaciones.js`: entrada por plantas, planos vinculados y lista universal autorizada, sin cambiar los tipos reales ni inyectar semillas en estados existentes.
- `assets/js/pages/dashboard-admin.js`, `dashboard.js`, `locations.js`, `dormitories.js`, `planning.js`, `vehicles.js`, `projects.js`, `finance.js`, `catalogs.js`, `history.js`, `reports.js`, `notifications.js`: composiciones de las referencias y flujos conectados. Las pantallas adicionales siguen accesibles.
- `core/commands.js`, `policy.js`, `reporting.js`: creación atómica de litera, rechazo de posición duplicada, permisos y reportes de inventario completo/informática. `core/export.js`, `spreadsheet.js`: documentos DOCX/XLSX reales e impresión aislada para PDF.
- `tests/admin-redesign.test.mjs`, `tests/run.mjs`: siete pruebas específicas y consumo completo de recursos HTTP. `README.md`, `docs/ARQUITECTURA.md`, `DATOS_Y_API.md`, `DEMO_INSTITUCIONAL.md`, `DISENO_ADMINISTRADOR.md`: mapa del código, decisiones comparadas y contrato futuro.

### Verificaciones finales y resultados

Comando final: `node tests/run.mjs`, después de los últimos ajustes funcionales y visuales.

```text
Sintaxis: 35 PHP y 61 JS/MJS válidos.
Reglas, persistencia y proveedores: 59 pruebas correctas.
HTTP: 21 pantallas y recursos correctos en demo/API; subcarpeta, métodos y errores verificados. Sin TypeScript.
```

- `git diff --check` correcto. No se instalaron dependencias. La revisión de sintaxis incluye `components/head.php`.
- Los 20 módulos del administrador cargaron sin errores de consola. Se recorrieron filtros/planos, edición de un arma desde inventario, pestaña de conductores y formatos de reportes.
- Configurar una litera con número duplicado mostró el error; la operación completa válida persistió tras recargar y permitió asignación. Las pruebas verifican que un fallo en la segunda cama no guarda la primera y que Consulta no puede crear literas.
- Consulta conserva sus seis bienes generales, carece de escritura y tiene bloqueado el acceso directo a Armas. Cambiar de identidad limpia los filtros del usuario anterior.
- Comparación visual de escritorio a 1920 × 980 y revisión móvil a 390 × 844: panel, inventario, planos, dormitorios, reportes y proyectos. También se comprobó el ancho de planificación y vehículos. No hubo desbordamiento horizontal de página; tablas y planos conservan desplazamiento interno. Menú móvil y cambio de formato del reporte comprobados. Se retiró el ajuste temporal de tamaño del navegador.
- Se restableció exclusivamente la demo QA de `127.0.0.1:8770` tras las operaciones de prueba. No se tocaron los datos del origen del usuario. La demo QA queda con 11 bienes, 8 camas y 39 ubicaciones, sin registros temporales de esta revisión.
- Evidencia guardada y revisada en `docs/pruebas/`: `admin-panel.jpg`, `admin-inventario.jpg`, `admin-segunda-planta.jpg`, `admin-dormitorios.jpg`, `admin-reportes.jpg`, `admin-proyectos.jpg`, `admin-movil.jpg`. Panel, segunda planta y reportes se actualizaron después de sus ajustes finales.

### Límites y continuación

- Las cantidades proceden del estado disponible. Los planos son esquemáticos; un catálogo oficial con otros nombres requerirá ajustar su correspondencia. Las posiciones vacías de litera no cuentan como capacidad.
- DOCX/XLSX se comprobaron automáticamente como paquetes Office reales. El navegador integrado creó el enlace DOCX sin errores, pero no entregó el evento de descarga. La descarga final y la impresión deben verificarse en el navegador habitual de la institución. PDF usa «Guardar como PDF» del navegador, sin generador de servidor.
- Los avisos de dispositivo requieren permiso y soporte del navegador y funcionan con Notificaciones abierta. No se implementó Web Push en segundo plano ni se concedieron permisos del dispositivo durante las pruebas.
- No se conectó ni modificó una BDD ni se ejecutó SQL. Se mantiene la separación demo/API y el fallo explícito del backend pendiente. La documentación del diseño explica decisiones y puntos de adaptación; antes de una nueva mejora, agregar otra entrada EN CURSO y verificar lo registrado contra el código.

## 2026-10-01 — Demo institucional y recorridos conectados

**Estado: COMPLETADO — experiencia institucional y recorridos de demostración.**

El alcance completado corresponde a la demo local. La BDD, autenticación institucional y procesos externos siguen pendientes para el sistema definitivo.

### Solicitud y alcance

Aplicar el concepto institucional del texto adjunto (67 apartados): presentar qué controla SAGP, quién lo utiliza y cómo se conectan los módulos, sin explicaciones técnicas en las pantallas. Ampliar la demostración existente, conservando PHP, HTML, CSS, JavaScript y la separación de proveedores. La demo debe permitir recorrer personas/participaciones en cursos, camas/armas, espacios, vehículos, mantenimiento, proyectos/fondos/gastos e historial. No conectar una BDD ni ejecutar el borrador SQL. Los procesos externos y la autenticación definitiva quedan fuera de esta demostración.

### Alcance terminado

- [x] Contrastar los 67 apartados con el código y documentar alcance y límites de la demo.
- [x] Adaptar navegación, panel y fichas al lenguaje institucional y a cada perfil.
- [x] Conectar cursos y participaciones independientes con alojamiento, armas y devoluciones verificadas por una persona.
- [x] Incorporar navegación visual de instalaciones/dormitorios, uso temporal de espacios y acceso mediante QR.
- [x] Incorporar conductores, salidas/regresos vehiculares e incidencias con seguimiento.
- [x] Ampliar mantenimiento y evidencias vinculadas a sus registros.
- [x] Conectar fondos, proyectos y gastos, con resumen de planificación y ejecución.
- [x] Incorporar búsqueda, importación con revisión previa, alertas y reportes relacionados e históricos.
- [x] Mantener compatibilidad con los datos de demo existentes y actualizar contratos/documentación.
- [x] Ejecutar pruebas funcionales/HTTP y revisar en navegador los recorridos; registrar resultados y limitaciones.

### Seguimiento de implementación

Se añadieron los módulos de cursos/participaciones, conductores, fondos/gastos, importación, búsqueda y recorridos. Se ampliaron fichas, espacios, dormitorios, vehículos, mantenimiento, panel por perfil, avisos y reportes por período. El modelo pasa a versión 3 conservando la clave local anterior y convirtiendo sus relaciones sin reponer ejemplos. Las semillas nuevas incluyen 11 bienes, 8 camas, 4 cursos, 6 participaciones y financiación de ejemplo.

Primera verificación durante la implementación: sintaxis correcta de 35 PHP y 52 JS/MJS. Las pruebas anteriores detectaron seis expectativas que cambiaron con el alcance (cantidad de ejemplos, versión, matrícula obligatoria y selección de identidad por perfil). Se actualizaron esas expectativas y se añadieron pruebas de los recorridos nuevos. La comprobación final se registra abajo.

Retoma y contraste: se confirmó en el código la separación de proveedores y la actualización del modelo. En el navegador se cargaron los 20 módulos sin errores de consola. Se recorrieron asignación/devolución de cama y arma, entrada/salida de docente, salida/regreso vehicular, incidencia con mantenimiento y evidencia, importación XLSX con duplicado y gasto con control de saldo. También se comprobó búsqueda con acceso a ficha y el rechazo de acceso directo a Armas para Consulta. Los pendientes de cierre identificados al retomar quedaron terminados: verificador completo, restablecimiento exclusivo del origen QA, evidencia visual y límites documentados.

### Evidencia inicial

Se leyó `AVANCES.md`, `AGENTS.md`, `README.md` y el texto adjunto antes de modificar fuentes. La base anterior tenía asignaciones, camas, cursos sin matrículas individuales, mantenimiento de bienes, proyectos sin financiación, bitácora y reportes básicos. Ese análisis inicial definió los recorridos que después se implementaron y comprobaron.

### Archivos y áreas modificadas

- `config/navigation.php`, `components/`, `login.php`, `assets/css/app.css` y `assets/js/app.js`: navegación de 20 módulos, presentación institucional, perfiles, fichas y estilos de mapas/literas/documentos.
- `pages/`: nuevas entradas de recorridos, búsqueda, cursos, conductores, finanzas e importación; se conserva el marco PHP compartido.
- `assets/js/pages/`: controladores de esos módulos y ampliación de inventario/armas/vehículos, espacios, dormitorios, mantenimiento, planificación, proyectos, panel, avisos, auditoría y reportes.
- `assets/js/core/`: comandos institucionales y validadores compartidos, conversión v2→v3, participaciones, consultas/reportes, importación/XLSX/CSV, QR, fichas y documentos. `model.js`, `policy.js` y `session.js` conservan reglas y permisos centralizados.
- `assets/js/data/local.js`, `data/mock/index.js`: conversión y persistencia coherente, ejemplos completos exclusivos de demo. El proveedor API continúa independiente y falla explícitamente mientras no exista backend.
- `database/schema.sql`: propuesta de 23 tablas y relaciones para los procesos nuevos; editada como documento, sin ejecutar SQL.
- `README.md`, `docs/ARQUITECTURA.md`, `docs/DATOS_Y_API.md`, `docs/DEMO_INSTITUCIONAL.md`: mapa del código, contratos y preparación de la BDD; guía de presentación y correspondencia con los 67 apartados.
- `tests/domain.test.mjs`, `tests/institutional.test.mjs`, `tests/fixtures/`: reglas, importación, QR y referencias artificiales reproducibles. No se instalaron dependencias.

### Verificaciones finales y resultados

Comando final: `node tests/run.mjs`, con Node 24.18.0 y PHP 8.2.12 de `C:\xampp\php\php.exe`.

```text
Sintaxis: 35 PHP y 53 JS/MJS válidos.
Reglas, persistencia y proveedores: 52 pruebas correctas.
HTTP: 21 pantallas y recursos correctos en demo/API; subcarpeta, métodos y errores verificados. Sin TypeScript.
```

- Pruebas nuevas: participaciones independientes, cupos, cama/matrícula coincidentes, arma única por participación y devolución humana, bloqueo del cierre de curso, uso de espacio, traslados, licencia/recorrido/kilometraje, incidencias, reparación de cama, evidencias/permisos, saldos/facturas/centavos, períodos de reportes, actualización de demo e importación atómica. Se conservan las pruebas anteriores de persistencia, concurrencia, errores y proveedores.
- XLSX real comprimido: lectura de la hoja y detección de identidad duplicada; escritura/lectura propia conserva acentos y ceros. Fórmulas y XML externo se rechazan. El QR coincide celda por celda con una matriz de referencia independiente.
- En navegador: los 20 módulos cargaron completamente sin errores de consola después de las correcciones. Se corrigió la referencia a `window.location` en Instalaciones y el selector de archivos para adjuntar evidencia.
- Se asignó y liberó una cama desde la participación; se asignó y devolvió un arma como Monitor, conservando historial. Docente registró su propia entrada/salida. Conductor abrió/cerró un recorrido y el formulario rechazó un kilometraje decreciente antes de guardar el corregido.
- Una incidencia vehicular se relacionó con mantenimiento, recibió una imagen artificial, se cerró con trabajo/verificación y se marcó atendida. La galería mostró archivo, tipo, descripción y fecha.
- La importación en pantalla mostró dos filas XLSX: una válida y otra con identidad duplicada. La confirmación guardó solo la válida, con persona y participación. Finanzas rechazó un gasto superior al saldo y guardó el importe válido actualizando la ejecución.
- Búsqueda por `MIC-002` abrió la ficha correcta. Consulta no mostró acciones de escritura en Inventario y el acceso directo a Armas fue rechazado. Se verificó la oferta de los 14 reportes; sus períodos y permisos están comprobados automáticamente.
- `git diff --check` pasó. La búsqueda de accesos directos a almacenamiento, mocks o SQL en los controladores no produjo coincidencias; tampoco existen archivos `.ts`/`.tsx`.
- El origen QA `http://127.0.0.1:8766` fue restablecido mediante la aplicación: se retiraron los registros temporales y quedaron los 11 bienes, 8 camas, 4 cursos y 6 participaciones de ejemplo, sin auditoría QA ni adjuntos QA. No se restablecieron otros orígenes del navegador.
- Evidencia visual revisada: [panel institucional](docs/pruebas/panel-institucional.png) y [recorridos institucionales](docs/pruebas/demo-institucional.png). La vista local quedó disponible para revisión; el comando estable para abrir el proyecto está en README.md.

### Límites y continuación

- No se conectó una BDD, no se ejecutó `database/schema.sql` ni se comprobó contra un motor SQL. El backend y la autenticación/autorización oficiales requieren una implementación futura. La selección de perfiles de demo permite probar experiencias; no constituye seguridad institucional.
- Los 67 apartados se representan al nivel de demostración descrito en [DEMO_INSTITUCIONAL.md](docs/DEMO_INSTITUCIONAL.md). Los ejemplos no afirman cantidades reales, la vista de instalaciones es esquemática y Finanzas no procesa pagos ni certifica un PAC.
- El QR real y la consulta por código fueron comprobados; cámara y lector físico requieren validación en el equipo institucional. No se activó una cámara durante las pruebas.
- Adjuntos locales limitados a PNG/JPG/PDF pequeños; no sustituyen almacenamiento documental compartido ni respaldo. La importación trabaja con la primera hoja XLSX o CSV UTF-8, valores y hasta 200 registros; no incorpora macros, fórmulas ni XLS antiguo.
- Los reportes de actividad conservan eventos y responsables. Los reportes de situación actual no reconstruyen todos los atributos de un inventario pasado. CSV e impresión conservan el límite de verificación del navegador indicado en la entrada anterior; no se confirmó una descarga final ni un PDF/Word independiente en esta revisión.
- Se revisaron las vistas disponibles en móvil y escritorio, sin una matriz completa de dispositivos/navegadores. Las alertas dependen de la fecha; no liberan camas ni devuelven armas automáticamente.
- Para continuar, leer esta entrada y los tres documentos de arquitectura/contrato/demo; agregar primero una entrada EN CURSO para la siguiente mejora. Implementar la BDD contra los DTO aprobados y probar el backend antes de activar modo API. Conservar datos de demo existentes: su conversión agrega relaciones/colecciones sin inyectar ejemplos nuevos.

## 2026-09-30 — Limpieza de la migración y simulación preparada para BDD

**Estado: COMPLETADO — limpieza, organización y simulación.**

La conexión a una BDD oficial y la autenticación PHP real corresponden a una solicitud futura; no están implementadas ni se presentan como conectadas.

### Solicitud y registro inicial

Retirar TypeScript/React y sus dependencias, conservar una estructura clara de HTML, CSS, JavaScript y PHP, comprobar las simulaciones y preparar el cambio a datos oficiales sin rehacer las pantallas. Este archivo fue creado antes de modificar el código. El análisis inicial encontró rutas incorrectas bajo `pages/`, módulos estáticos, ausencia de validaciones y permisos de escritura y endpoints sin BDD.

### Alcance terminado

- [x] Retirar `src/`, scripts TypeScript, React, Vite, Firebase, sus configuraciones, lockfile y entrada HTML del original. No quedan archivos `.ts`/`.tsx` ni dependencias npm de ejecución.
- [x] Mantener logos y el plano utilizado en `assets/img/`; conservar el plano alternativo único en `assets/img/referencias/`, sin copias gráficas duplicadas.
- [x] Corregir `base_url()` para raíz y subcarpetas y unificar el marco de las pantallas en `components/page.php`.
- [x] Separar controladores en `assets/js/pages/`, reglas y modelo en `assets/js/core/` y proveedores en `assets/js/data/`. Las pantallas usan una interfaz asíncrona común.
- [x] Hacer funcionales inventario, armería, vehículos, ubicaciones, personas, usuarios, dormitorios, mantenimiento, planificación, proyectos, bitácora, notificaciones, panel y reportes.
- [x] Implementar códigos/series/placas/correos/DNI/camas únicos, permisos de comandos, asignaciones y devoluciones con historial, bajas y desactivación en lugar de eliminación física.
- [x] Coordinar mantenimiento y estado del bien; impedir doble ocupación y órdenes duplicadas; validar fechas y cupos. Las fechas de mantenimiento usan el día local de Honduras y los eventos conservan UTC.
- [x] Generar bitácora y avisos con cada operación; calcular panel, ocupación y reportes a partir de los registros actuales.
- [x] Permitir recuperación explícita de la demo, conservar datos dañados ante errores y convertir colecciones de la anterior versión PHP cuando sus referencias son válidas. No importar automáticamente datos del antiguo React.
- [x] Preparar el proveedor HTTP, los contratos y los endpoints PHP. En modo API no se cargan ejemplos ni se utiliza almacenamiento demo; los endpoints fallan explícitamente mientras falte backend.
- [x] Actualizar la propuesta SQL y documentar ejecución, mapa del código, responsabilidades, contrato y retirada de simulación.
- [x] Agregar `AGENTS.md` para conservar la instrucción de actualizar primero este archivo en cada nueva mejora. Agregar `.gitattributes` para mantener archivos de texto con finales de línea coherentes.

### Verificaciones realizadas

Comando: `node tests/run.mjs`, utilizando PHP 8.2.12 de `C:\xampp\php\php.exe` y Node. Resultado final:

```text
Sintaxis: 29 PHP y 33 JS/MJS válidos.
Reglas, persistencia y proveedores: 25 pruebas correctas.
HTTP: 15 pantallas y recursos correctos en demo/API; subcarpeta, métodos y errores verificados. Sin TypeScript.
```

- Las pruebas cubren permisos, duplicados, asignaciones/devoluciones, bajas, camas, mantenimiento, fechas, cupos, perfiles, proyectos, avisos, consistencia de referencias, errores de almacenamiento, migración, recuperación, concurrencia local, independencia del proveedor API y CSV.
- Se verificaron todos los recursos enlazados por las páginas y el balance del marco HTML. La detección de subcarpeta se verificó mediante renderizado PHP sin servir carpetas fuera del proyecto.
- API demo: 409 `DEMO_MODE`; API sin backend oficial: 503 `BACKEND_NOT_CONFIGURED`; métodos incorrectos: 405. No se fingió una escritura SQL exitosa.
- `git diff --check` terminó sin errores.
- En el navegador integrado se cargaron los 14 módulos sin errores de consola. Se registró un bien, se rechazó un duplicado, se comprobó Consulta General y el acceso directo restringido, se abrió/cerró mantenimiento, se asignó una cama, se recargó para comprobar persistencia y se liberó conservando historial.
- Se corrigieron el cierre móvil del menú y los nombres accesibles al colapsarlo. El diseño utiliza recursos locales, sin CDN de fuentes o iconos.
- Los registros QA creados durante las pruebas se retiraron mediante el restablecimiento de la demo; quedaron los ocho bienes y ocho camas de ejemplo.
- Evidencia visual: [panel de demostración](docs/pruebas/panel-demo.png).

### Límites de la verificación

- No se creó ni conectó una BDD, no se ejecutó `database/schema.sql` y no se verificó ese borrador contra un motor SQL. Debe revisarse contra la BDD definitiva antes de usarlo.
- Los permisos y perfiles de demo sirven para probar flujos; la autenticación oficial, las sesiones PHP y la autorización del servidor siguen pendientes para producción.
- El contenido CSV se verificó automáticamente, incluyendo acentos, comillas, saltos y neutralización de fórmulas. El navegador integrado no entregó el evento de descarga al pulsar Exportar CSV; no se confirmó desde ese navegador un archivo descargado. Revisar esa descarga en el navegador habitual al desplegar. La impresión/guardar PDF utiliza el diálogo del navegador; no se generó un PDF independiente.
- Se comprobó el menú en la vista móvil disponible; no se hizo una matriz completa de dispositivos y navegadores.

### Cómo continuar

1. Leer esta entrada, [README.md](README.md), [ARQUITECTURA.md](docs/ARQUITECTURA.md) y [DATOS_Y_API.md](docs/DATOS_Y_API.md).
2. **Agregar primero una nueva entrada** para la siguiente solicitud, con estado EN CURSO y tareas verificables. No tratar pendientes de producción como defectos ya resueltos.
3. Cuando se disponga de la BDD definitiva, implementar conexión/repositorios PHP, login y sesiones, CSRF, permisos y transacciones; mapear los DTO y probar conflictos reales.
4. Activar `SAGP_DATA_MODE=api` solo después de implementar el backend. El frontend está preparado para cambiar de proveedor; poner esa variable ahora muestra un error explícito de backend pendiente.
5. Retirar las semillas y claves de demo según el procedimiento documentado, sin borrar indiscriminadamente otros datos del navegador.
