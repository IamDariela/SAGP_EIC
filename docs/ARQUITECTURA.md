# Arquitectura y guía de mantenimiento

## Flujo

```text
pages/*.php → components/page.php → assets/js/app.js → controlador de pantalla
                                                   ↓
                                          servicio asíncrono
                                  ┌────────────────┴───────────────┐
                                  demo                            api
                                  proveedor local                 proveedor HTTP
                                  comandos de negocio             endpoints PHP
                                  almacenamiento navegador        futura BDD
```

No mezclar consultas SQL, almacenamiento o datos de ejemplo con el HTML de una pantalla. Los controladores llaman `await ctx.service.getState()` o `await ctx.perform({action, id, data})`; `perform` guarda, actualiza la pantalla y muestra el resultado. Los errores de formularios permanecen visibles sin cerrar el modal.

## Agregar o modificar una pantalla

1. Registrar la solicitud en `AVANCES.md` como EN CURSO y revisar lo pendiente.
2. Definir el módulo y sus roles en `config/navigation.php`.
3. Crear una entrada pequeña en `pages/` que incluya `components/page.php`.
4. Implementar `export function mount(ctx)` en `assets/js/pages/` y registrar su archivo en el mapa de `app.js`.
5. Utilizar `core/ui.js` para tablas, formularios, mensajes y exportaciones. Escapar cada valor interpolado en HTML; preferir `textContent` para textos.
6. Agregar reglas al comando correspondiente en `core/commands.js` y permisos en `core/policy.js`, nunca solamente ocultar un botón.
7. Mantener alineados `core/model.js`, los ejemplos, el contrato de API y el esquema relacional propuesto.
8. Verificar las operaciones, los casos inválidos y el rol de consulta. Registrar los resultados en `AVANCES.md` antes de marcar COMPLETADO.

## Mapa de responsabilidades ampliado

| Archivo | Responsabilidad |
|---|---|
| `core/commands.js` | Entrada única de transacciones y operaciones básicas; importación atómica. |
| `core/institution-commands.js` | Participaciones, responsabilidad temporal, conductores/recorridos/incidencias, documentos y financiación. |
| `core/command-utils.js` | Validadores y operaciones internas sobre el clon; no accede a persistencia. |
| `core/upgrade.js` | Conversión exclusiva de datos demo v2 a v3 sin introducir ejemplos. |
| `core/queries.js`, `reporting.js` | Alertas, alcance de actividad, sumas y reportes por período. |
| `core/import.js`, `spreadsheet.js` | Plantillas/mapeo y lector/escritor XLSX/CSV sin dependencias. |
| `core/icons.js`, `presentation.js`, `floorplans.js` | Iconos, componentes de presentación y coordenadas de planos, separados del catálogo de datos. |
| `core/export.js` | Paquetes Word DOCX/Excel XLSX y documento de impresión aislado para PDF. |
| `pages/inventory.js`, `asset-presentation.js`, `dashboard-admin.js` | Navegación del inventario y presentación específica de los bienes y panel del administrador. |
| `core/qr.js`, `qr-ui.js` | QR real y consulta del registro; cámara opcional. |
| `core/details.js`, `documents.js` | Fichas/historial y presentación de documentos, usando el servicio. |
| `pages/courses.js`, `locations.js`, `vehicles.js`, `drivers.js`, `finance.js`, `imports.js` | Pantallas de los nuevos recorridos. |
| `pages/institutional.js`, `search.js` | Presentación institucional y búsqueda dentro de módulos disponibles. |

## Reglas y transacciones del proveedor

El proveedor local lee el último estado, clona los datos, aplica un comando, valida y persiste el resultado **una sola vez**. Si falla una regla o el almacenamiento está lleno, no se anuncia éxito ni se guardan parcialmente los cambios. Los comandos se serializan; cuando el navegador dispone de Web Locks también se coordinan escrituras entre pestañas. La BDD deberá usar transacciones y bloqueos del servidor para garantizar concurrencia real.

No eliminar físicamente bienes o usuarios con historial: utilizar baja o desactivación. Una asignación crea historial; una devolución lo finaliza. El estado de mantenimiento y el bien se actualizan juntos. Personas y cursos se enlazan por ID, no por nombres escritos libremente.

Las fechas de calendario usan `YYYY-MM-DD`; los eventos usan ISO 8601 UTC y se muestran en `America/Tegucigalpa`. Las etiquetas visibles están en español, mientras el contrato utiliza identificadores estables.

## Alcance de los permisos

La demo controla navegación, botones y comandos. El selector permite deliberadamente representar cualquier rol. Esto sirve para comprobar flujos, **no constituye autenticación segura**. Los ejemplos completos están disponibles en el navegador.

El selector elige un perfil activo de la función solicitada. Docentes y conductores tienen identidad vinculada y sus comandos comprueban que gestionen sus propias entradas/recorridos. El panel, la búsqueda y las vistas de actividad muestran las áreas disponibles para ese perfil. Esto no oculta el snapshot de demo a herramientas de desarrollo.

Las evidencias se guardan únicamente a través de `attachment.add`. El HTML no lee almacenamiento directo. Los bytes no se duplican en la bitácora. El servidor definitivo debe proteger el destino y el archivo, validar contenido/tamaño y autorizar sus lecturas.

La revisión de importación usa las mismas reglas que el guardado. Confirmar revalida contra el último snapshot; si cambió un código, DNI, saldo o cupo, el lote falla sin persistencia parcial.

La API deberá autenticar con sesiones PHP, comprobar permisos y alcance de lectura en el servidor y derivar la identidad del operador de la sesión. No aceptar `userId` o `role` enviados por el cliente como autorización. El proveedor API jamás debe regresar a ejemplos después de un error.

## Recursos y dependencias

El funcionamiento y el diseño usan archivos locales, sin CDN de fuentes ni iconos. Los símbolos del menú y los botones utilizan el sprite SVG local `assets/img/icons.svg`. Node no forma parte del servidor ni del producto: se usa para pruebas y su `package.json` no tiene dependencias.

No reaparecerán automáticamente datos de ejemplo en modo API. Los pendientes para producción se describen en DATOS_Y_API.md y AVANCES.md.
