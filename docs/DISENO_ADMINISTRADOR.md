# Diseño de administrador — referencias y continuidad

Se adaptó la interfaz a las 16 capturas recibidas el 1 de octubre de 2026. Las capturas definen la presentación; los nombres, estados, permisos y totales se obtienen del estado de SAGP. La demo nueva contiene 39 ubicaciones, 11 bienes y 8 camas: no se copian las cantidades de las imágenes.

## Comparación y decisiones

| Referencia | Resultado y criterio funcional |
|---|---|
| Marco común | Azul institucional, selección amarilla, iconos SVG locales, cabecera del módulo, perfil, identidad actual y fecha/hora de Honduras. Menú de 14 módulos; herramientas adicionales agrupadas. |
| 1. Panel | Cuatro indicadores, estado físico con barras y acciones rápidas. Incluye todos los tipos de bienes vigentes; reparados se agrupan con buenos. Las alertas y actividad siguen disponibles debajo. |
| 2–5. Inventario | Entrada por primera/segunda planta o listado general. Planos esquemáticos, espacios vinculados, filtros de categoría/ubicación/asignación/estado, fotos adjuntas o marcador accesible, ficha y acciones por registro. El administrador ve todos los tipos; los demás perfiles mantienen su alcance. Editar/asignar siempre usa el tipo real del registro. |
| 6. Ubicaciones | Tarjetas de espacios destacados y directorio completo, con cantidades de los recursos visibles para el perfil. Se conservan fichas, QR, responsables temporales, entradas/salidas e historial. |
| 7–8. Dormitorios | Pestañas, plano con pasillo, camas superior/inferior, estados y posiciones vacías. Solo las camas registradas cuentan como plazas. Crear litera guarda ambas camas de forma atómica; duplicados y posiciones ocupadas se rechazan. Las camas existentes conservan planta, número, habitación y asignaciones. Se admiten más de 25 literas en filas adicionales. |
| 9. Planificación | Intervalo, confirmados/proyección, plazas físicas/no disponibles/utilizables, cursos coincidentes y demanda diaria. Se informa el déficit real. La proyección usa cupos previstos y no supone camas reparadas sin verificación. |
| 10. Armas | Identificación, especificaciones, asignación/devolución, indicadores y bitácora de asignaciones. Se mantienen matrícula activa, permisos y confirmación humana de devolución. |
| 11. Vehículos | Pestañas flota/conductores, indicadores, tabla compacta y formatos de exportación. Se conservan salidas, regresos, kilometraje creciente, incidencias, licencias y evidencias. |
| 12. Proyectos | Cartera y aportes recibidos en una misma vista. Aportes de curso requieren curso; otros fondos siguen disponibles. Incluye formularios de financiación y gasto, fichas/comprobantes y acceso al directorio financiero. Compromisos = asignaciones menos gastos; saldo de compra = fondos menos gastos; saldo sin comprometer = fondos menos asignaciones. No realiza pagos. |
| 13. Personas | Registro de personal con búsqueda por nombre/DNI, teléfono, unidad, edición y ficha. No se eliminan participaciones ni historial. |
| 14. Bitácora | Búsqueda, operaciones, período y comparación de campos antes/después. Exporta los registros visibles, respetando el alcance del perfil. |
| 15. Reportes | Accesos a inventario, vehículos, informática y armas según permisos, formato, orientación, período/presets y vista previa. El catálogo completo y filtros adicionales se agrupan en «Otros reportes y filtros». Se conserva la diferencia entre situación actual y actividad histórica. |
| 16. Notificaciones | Avisos pendientes, alertas de seguimiento y archivo de leídos. La bandeja limpia solo aparece si no hay pendientes ni alertas. Activación voluntaria de avisos locales del navegador; no se simula una suscripción Web Push institucional. |

## Dónde continuar

- Marco PHP: `components/header.php`, `sidebar.php`, `head.php`; títulos y permisos de navegación en `config/navigation.php`.
- Estilos: `assets/css/admin.css`, ordenado por marco compartido y módulos; sin CDN ni framework.
- Iconos: `assets/img/icons.svg` y `assets/js/core/icons.js`.
- Presentación común: `core/presentation.js`; búsqueda/filtros de tablas en `core/ui.js`.
- Inventario: `pages/inventory.js` compone el controlador `pages/assets.js`; `pages/asset-presentation.js` comparte la tabla de bienes/armas/flota.
- Planos: `core/floorplans.js` contiene coordenadas de presentación, no registros. Resuelve el catálogo por identificador o nombre normalizado y planta. Los espacios sin vínculo están desactivados; los no representados siguen en el directorio.
- Literas: comando `bunk.save` en `core/commands.js`, autorizado en `core/policy.js`. Delega en dos `bed.save`; el proveedor persiste solo el resultado completo. El historial conserva un registro por cama.
- Finanzas: `pages/finance.js` exporta `financeForms` para reutilizar formularios y validaciones desde Proyectos.
- Exportación: `core/export.js` genera DOCX y compone impresión, usando el escritor ZIP/XLSX de `core/spreadsheet.js`.
- Pruebas nuevas: `tests/admin-redesign.test.mjs`.

## Datos oficiales y límites

Las pantallas siguen utilizando el contexto cargado por la interfaz asíncrona `storage.js`. No acceden a SQL, mocks ni persistencia directamente. Las nuevas ubicaciones se añadieron únicamente a `data/mock/ubicaciones.js`: se cargan en una demo nueva o un restablecimiento solicitado. No se inyectan en estados locales existentes. Un espacio oficial con identificador diferente puede vincularse al plano mediante su nombre y planta; si el catálogo usa otros nombres, ajustar la correspondencia en los metadatos del plano. No esconder los espacios sin correspondencia.

DOCX y XLSX son paquetes Office reales con texto escapado; Excel trata los valores como texto y no ejecuta fórmulas introducidas como datos. PDF utiliza un documento de impresión aislado: el usuario elige «Guardar como PDF» en su navegador. No hay un servidor generador de PDF. El navegador integrado de la revisión creó el enlace de descarga DOCX sin errores, pero no entregó un evento de descarga al controlador de pruebas; la escritura y estructura del archivo se comprobaron automáticamente. La entrega final de descargas y la impresión deben comprobarse también en el navegador habitual de la institución.

Los avisos de dispositivo dependen del permiso y soporte del navegador y funcionan mientras esté abierta la pantalla de Notificaciones. No hay PWA, suscripción push, envío a teléfonos ni notificaciones con el sistema cerrado. No se concedieron permisos del dispositivo durante la revisión.

No se conectó ni modificó una BDD, no se ejecutó `database/schema.sql`, no se instalaron dependencias y no se introdujo TypeScript.

## Verificación y evidencia

`node tests/run.mjs`: 35 PHP y 61 JS/MJS con sintaxis válida, 59 pruebas correctas, 21 pantallas y recursos HTTP comprobados en demo/API. Los 20 módulos del administrador cargaron sin errores de consola. La revisión visual cubrió escritorio y móvil, incluidos planos, literas y tablas con desplazamiento interno. Los recorridos y límites completos están registrados en `AVANCES.md`.

Evidencia en `docs/pruebas/`: [panel](pruebas/admin-panel.jpg), [entrada de inventario](pruebas/admin-inventario.jpg), [segunda planta](pruebas/admin-segunda-planta.jpg), [dormitorios](pruebas/admin-dormitorios.jpg), [reportes](pruebas/admin-reportes.jpg), [proyectos](pruebas/admin-proyectos.jpg) y [móvil](pruebas/admin-movil.jpg).
