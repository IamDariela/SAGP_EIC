# Contrato de datos y conexión futura a PHP + BDD

## Estado del backend

Los endpoints están preparados como límites de integración, pero la conexión SQL y la autenticación PHP **no están implementadas**. En demo responden 409 DEMO_MODE; en modo API responden 503 BACKEND_NOT_CONFIGURED. No devolver ejemplos ni simular éxito en estos endpoints.

## Interfaz que consumen las pantallas

- `getState(): Promise<State>` obtiene un snapshot coherente y validado.
- `execute({action, id?, data?}): Promise<Record>` ejecuta una operación completa.
- `getSession()` y `signOut()` corresponden a sesiones oficiales.
- `reset()` es exclusivo de la demo; el proveedor API lo rechaza.

`State.version` es `3`. Sus colecciones obligatorias son `assets`, `locations`, `people`, `users`, `beds`, `maintenance`, `courses`, `projects`, `assignments`, `auditLogs`, `notifications`, `enrollments`, `spaceUses`, `drivers`, `trips`, `incidents`, `attachments`, `funds`, `allocations` y `expenses`. Todas contienen arrays, incluso cuando estén vacías. Los IDs y referencias son strings; convertir IDs SQL a strings al serializar. No introducir datos reales en `data/mock/`.

La actualización de un snapshot demo versión 2 pertenece a `core/upgrade.js`, no al proveedor oficial. El backend debe entregar versión 3 directamente; nunca convertir un fallo oficial en un snapshot de ejemplos.

## DTO por colección

| Colección | Campos principales |
|---|---|
| assets | id, code, name, type, category, brand, model, serial, description?, color?, locationId, status, costoUnitario, details, assignedPersonId?, currentAssignmentId?, lastMovement? |
| locations | id, name, building, area, floor, type, responsiblePersonId? |
| people | id, name, identification (13 dígitos), department, phone |
| users | id, name, email, role, status, personId?; nunca password_hash |
| beds | id, bedNumber, dormitory, room?, bunk?, position (upper/lower), floor, status, assignedPersonId?, courseId?, enrollmentId?, currentAssignmentId? |
| maintenance | id, assetId? o bedId?, kind?, description, diagnostico, work?, verification?, stage?, startDate, endDate?, status, previousStatus?, userId, closedBy? |
| courses | id, code, name, description?, startDate, endDate, expectedStudents, confirmedStudents, externalStudents, status |
| projects | id, name, description, budget, locationId?, year?, extraordinary?, status, resolvedBy? |
| assignments | id, resource (asset/bed), itemId, personId, courseId?, enrollmentId?, spaceUseId?, startDate, endDate?, status, actorId, returnedBy?, reason? |
| auditLogs | id, action, entityId, entityName, actorId, actorName, role, timestamp, before, after |
| notifications | id, action?, entityId?, message, createdAt, readBy (array de IDs) |
| enrollments | id, personId, courseId, needsBed (boolean), status (active/withdrawn/completed) |
| spaceUses | id, locationId, personId, courseId, startDate, endDate?, status, actorId, closedBy?, notes?, exitNotes? |
| drivers | id, personId, userId?, license, category, issued, expires, status, notes? |
| trips | id, assetId, driverId, destination, reason, startMileage, endMileage?, startDate, endDate?, status, actorId, closedBy?, notes? |
| incidents | id, assetId, description, date, status, reportedBy, maintenanceId?, resolution?, resolvedBy?, resolvedAt? |
| attachments | id, targetType, targetId, name, mime, content (Data URL validada), phase (before/after/document), description?, uploadedBy, createdAt |
| funds | id, concept, amount, date, courseId?, status (received) |
| allocations | id, fundId, projectId, amount, date |
| expenses | id, projectId, supplier, invoice, concept, amount, date |

`details` es siempre un objeto. Armas: caliber, weaponType. Vehículos: plate, mileage, year?, nextServiceDate?. Los importes y contadores son números, no strings SQL DECIMAL. Las fechas de calendario son `YYYY-MM-DD`; createdAt/updatedAt y los eventos son ISO UTC. Campos opcionales vacíos pueden ser null. `before`/`after` contienen JSON serializado o null; los bytes de adjuntos se excluyen de auditoría.

`lastMovement` contiene fromId, toId, reason, actorId y date. El historial completo del movimiento está en los eventos `asset.move`, no solamente en este último movimiento. `maintenance` exige exactamente un recurso (bien o cama). El estado abierto coincide con mantenimiento del recurso. `stage` usa diagnosis/repair/verification/verified; `status` usa open/closed.

La sesión oficial debe entregar `userId` del usuario y, para Docente, `personId`. El frontend utiliza el ID de usuario para lectura de avisos y comparación con `driver.userId`; no lo confunde con el identificador de sesión PHP. El servidor deriva estas referencias de la cuenta autenticada.

Para el contrato actual, los adjuntos son PNG/JPG/PDF con Data URL validada, tamaño de demo máximo 500 KB por archivo y presupuesto aproximado total de 1,8 MB. La propuesta SQL guarda una ruta privada, no base64 ni rutas públicas: el adaptador deberá autorizar la lectura y devolver los bytes limitados que consume esta interfaz. Una gestión documental de mayor tamaño requerirá extender el proveedor de archivos y `core/documents.js` de manera centralizada.

El backend puede devolver colecciones vacías o filtradas según permisos, siempre con referencias suficientes para los módulos autorizados. No exponer usuarios, DNI o información especializada a perfiles sin acceso; aplicar el filtrado del snapshot en el servidor antes de responder. `users` debe incluir el perfil actual para los flujos de sesión. La demostración no aplica filtrado confidencial de datos.

## HTTP

- `GET api/datos.php` → `{ "ok": true, "data": State }`
- `GET api/sesion.php` → `{ "ok": true, "data": { "id": "…", "userId": "…", "name": "…", "role": "…", "status": "active", "csrfToken": "…" } }`
- `POST api/acciones.php` → cuerpo `{ "action": "asset.save", "id": "opcional", "data": { ... } }`; respuesta `{ "ok": true, "data": Record }`
- `DELETE api/sesion.php` → finaliza la sesión; devolver `{ "ok": true, "data": null }`.

Enviar cookies de la sesión y verificar `X-CSRF-Token` en operaciones mutadoras, incluido el cierre de sesión. Implementar también el formulario PHP de inicio de sesión antes de habilitar producción: validación de contraseña, regeneración del ID de sesión y cookies seguras.

Los errores usan HTTP apropiado y `{ "ok": false, "error": { "code": "…", "message": "Texto legible" } }`: 401 sin sesión, 403 sin permiso/CSRF, 404 registro inexistente, 409 conflicto, 422 validación y 503 servicio sin configurar. El frontend muestra el error y conserva el formulario. No regresar HTML con un 200 ante errores de API.

## Comandos y reglas

Ver el switch de `assets/js/core/commands.js` y la matriz de `core/policy.js` como especificación funcional para el backend:

- `asset.save`, `asset.assign`, `asset.return`, `asset.archive`.
- `location.save`, `person.save`, `user.save`.
- `bed.save`, `bed.assign`, `bed.release`, `bunk.save`.
- `course.save`, `maintenance.open`, `maintenance.close`.
- `project.save`, `project.status`, `notification.read`.
- `asset.move`, `enrollment.save`, `spaceUse.open`, `spaceUse.close`.
- `driver.save`, `trip.open`, `trip.close`, `incident.save`, `incident.resolve`.
- `maintenance.progress`, `attachment.add`, `fund.save`, `allocation.save`, `expense.save`.
- `import.batch`: `{kind: people|inventory|vehicles, rows: array de objetos con encabezados de plantilla}`. Revalidar todo el lote antes de persistir; conservar auditoría individual y abortar completamente si falla una fila. La operación interna `student.import` compone persona + participación y no debe habilitar accesos adicionales en el backend.

Validar códigos, series, placas, correo, DNI y números de cama únicos, importes/fechas y cupos coherentes. El kilometraje no disminuye. Bloquear doble asignación, una segunda cama por persona y una segunda orden abierta por bien/cama. La finalización de un curso requiere liberar camas, devolver armas y cerrar actividades de espacios; las fechas solamente producen avisos. El operador no puede desactivar su cuenta ni retirar su propio rol de administrador.

`bunk.save` recibe `{dormitory, room, bunk, floor, upperNumber, lowerNumber}` y crea las camas superior e inferior en una sola operación. Exige habitación y litera, números distintos y únicos, y que la litera no esté ya configurada. `bed.save` también rechaza ocupar una posición existente en la misma habitación/litera/dormitorio. El backend deberá guardar ambas camas, sus eventos y avisos en una transacción: si falla cualquiera de las dos, no debe persistir ninguna.

Cada persona/curso tiene una participación única; volver en otro curso produce otra participación. Una cama exige participación activa con alojamiento solicitado. Un arma exige participación activa y no debe duplicarse dentro de ella. Los totales de confirmados se derivan de participaciones cuando existen. Una participación cerrada conserva persona/curso e historial.

Una salida vehicular exige vehículo utilizable, licencia vigente y ausencia de otro recorrido activo del vehículo o conductor. Conductor opera únicamente sus propios recorridos. Registrar regreso y kilometraje es una operación atómica; no editar el vehículo mientras esté en recorrido. Validar exactamente una referencia del recurso para mantenimiento.

Financiación exige proyecto aprobado, saldo del fondo y presupuesto suficiente. Gasto exige financiación disponible y factura única por proveedor. Usar importes con dos decimales y bloquear fondos/proyectos durante las operaciones para prevenir sobregiros simultáneos. Las comprobaciones JS no sustituyen las transacciones del servidor.

Cada operación mutadora debe persistir sus cambios, bitácora y aviso en **una transacción**. La lectura de notificaciones no genera otro aviso. No permitir que el cliente escriba directamente bitácora, actor o timestamps. Resolver asignaciones vigentes y proyectarlas en los DTO de bienes/camas.

## Procedimiento de conexión

1. Revisar la BDD definitiva y contrastarla con `database/schema.sql`. Este script es una propuesta; no sustituye migraciones de una BDD existente.
2. Crear la conexión en `config/database.php` con PDO, credenciales del entorno y consultas parametrizadas. Crear repositorios en `api/repositories/` y servicios transaccionales en `api/services/` cuando se implementen, sin carpetas vacías anticipadas.
3. Implementar sesión, login PHP, CSRF, roles y alcance de lectura; sustituir `require_official_backend()` por estos servicios y sus endpoints.
4. Mapear columnas SQL a los DTO. Validar el snapshot y las reglas en el servidor; las validaciones JS sirven para interacción, no para autorización oficial.
5. Probar primero contra una BDD de pruebas, incluyendo conflictos simultáneos, fallos de transacción y reportes con datos reales de prueba.
6. Activar `SAGP_DATA_MODE=api` y verificar que el navegador no solicita `data/mock/`. Revisar permisos del servidor para que no sirva mocks si ya se retiran del despliegue.
7. Retirar las semillas y el proveedor local del despliegue oficial cuando ya no se necesiten. Adaptar la selección del proveedor para no importar módulos retirados. No es necesario cambiar cada pantalla.

## Retirada de simulación

Los registros oficiales no deben importarse desde los ejemplos. Comenzar desde catálogos aprobados y usuarios oficiales. En el navegador borrar solamente las claves `sagp_demo_*` y `sagp_current_role`, con confirmación si se conservaron datos de demostración. Las antiguas claves React `sig_eic_is_demo`, `sig_eic_data_*` y la IndexedDB `sig_eic_images` pueden retirarse por separado si se confirma que no se necesitan.

En modo API no se inicializa ninguna semilla. Borrar claves de demo no borra SQL. No usar `localStorage.clear()` ni borrar indiscriminadamente IndexedDB. Conservar `AVANCES.md` y documentar las comprobaciones realizadas antes de marcar la conexión como terminada.

## Correspondencia de las áreas nuevas en el borrador SQL

`enrollments` → participaciones; `spaceUses` → usos_espacios; `drivers` → conductores; `trips` → recorridos; `incidents` → incidencias; `funds` → fondos; `allocations` → financiaciones; `expenses` → gastos; `attachments` → documentos.

El borrador contiene 23 tablas, referencias y restricciones de unicidad para recursos activos. Los destinos polimórficos de documentos, el tipo de arma y los saldos requieren validación transaccional del servidor. **El SQL no se ejecutó ni se validó contra un motor.** `CREATE TABLE IF NOT EXISTS` no adapta tablas anteriores: este archivo sigue sin ser una migración de una BDD existente.
