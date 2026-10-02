# Instrucciones de trabajo del proyecto

- Antes de implementar cada solicitud de mejora, leer `AVANCES.md` y agregar allí una entrada con la solicitud, el alcance, el estado **EN CURSO** y las tareas pendientes.
- Actualizar esa entrada durante el trabajo. Al retomar, contrastar el registro con el código y las pruebas; no asumir que una tarea se completó solo porque estaba prevista.
- Al terminar, registrar archivos o áreas cambiadas, verificaciones ejecutadas, resultados y limitaciones. Marcar **COMPLETADO** únicamente cuando todo el alcance autorizado esté implementado y comprobado.
- Mantener PHP, HTML, CSS y JavaScript sin introducir TypeScript ni un framework de frontend.
- Conservar responsabilidades: pantallas en `pages/`, interfaz en `assets/js/pages/`, reglas de negocio en `assets/js/core/`, proveedores en `assets/js/data/`, ejemplos en `data/mock/`, endpoints en `api/` y documentación en `docs/`.
- Las pantallas usan la interfaz asíncrona de `assets/js/storage.js`; no acceden directamente a `localStorage`, mocks ni SQL.
- Los ejemplos solo se cargan en modo `demo`. El modo `api` debe fallar explícitamente si el backend no está disponible; nunca reemplazar datos oficiales con ejemplos.
- Ejecutar `node tests/run.mjs` para cambios funcionales. No instalar dependencias: las pruebas usan Node y PHP. La configuración de PHP para las pruebas está en README.md.
- No ejecutar `database/schema.sql` contra una base de datos sin autorización explícita. Es un borrador, no una migración de una BDD existente.
