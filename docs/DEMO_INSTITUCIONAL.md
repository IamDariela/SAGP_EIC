# Demostración institucional SAGP · EIC

## Propósito de la presentación

SAGP centraliza los recursos de la Escuela de Investigación Criminal y conecta sus ubicaciones, responsables, actividades e historial. La presentación debe explicar qué controla la institución y cómo trabaja cada función. Las pantallas evitan explicaciones de programación.

La demostración responde: ¿qué es?, ¿dónde está?, ¿en qué estado está?, ¿quién es responsable?, ¿qué ocurrió antes? y ¿quién realizó cada acción?

## Recorrido recomendado para directivos

1. **Panel Principal:** seleccionar Administrador y revisar inventario, camas, cursos, armas, vehículos, mantenimiento, fondos y alertas. Las cifras representan los ejemplos de la demo, no el inventario completo de la EIC.
2. **Instalaciones y Espacios:** seleccionar Aula 102 o Laboratorio Balística; consultar bienes, responsables, movimientos y QR. Cambiar a Docente, registrar entrada con un curso y luego salida. El recurso prestado puede vincularse a esa actividad desde Inventario.
3. **Cursos y Estudiantes:** consultar una participación anterior y otra actual de la misma persona. Leer el QR del Agente Pedro Martínez, asignarle una cama disponible y revisar cómo cambia Dormitorios. Asignar el arma disponible desde Control de Armas. Como Monitor, verificar físicamente y confirmar su devolución; liberar la cama. El curso solo puede completarse cuando los recursos se han devuelto.
4. **Control Vehículos:** entrar como Conductor, registrar salida con destino/motivo, regresar y actualizar kilometraje. Intentar un kilometraje menor muestra el error y conserva el formulario. Reportar un problema y consultarlo como Personal de Mantenimiento.
5. **Mantenimiento:** abrir una orden sobre un bien o cama, registrar diagnóstico, reparación, evidencia antes/después, verificación y cierre. Revisar su historial y el estado del recurso.
6. **Proyectos y Adquisiciones / Fondos y Gastos:** registrar una necesidad, aprobarla, recibir un aporte, asignar financiación y registrar un gasto con factura. Los saldos y la ejecución cambian en pantalla; un sobregiro se rechaza. La demo no realiza pagos.
7. **Importar Información:** descargar plantilla Excel, conservar los encabezados y subir la primera hoja con valores. Revisar correctos/errores y confirmar los válidos. Curso usa un código existente; Alojamiento usa Sí/No. La inscripción crea una participación independiente.
8. **Búsqueda / Historial y Auditoría / Reportes:** buscar placa, serie, código, persona o espacio; consultar responsables, cambios antes/después y actividad por período. Exportar o imprimir el resultado.

**Recorridos SAGP** presenta estos procesos de forma visual y ofrece enlaces a los módulos disponibles para cada función.

## Contraste con los 67 apartados de la solicitud

| Apartados | Experiencia implementada en demo |
|---|---|
| 1 | Perfiles de Administrador, Inventario, Armas, Vehículos, Conductor, Mantenimiento, Monitor, Responsable Administrativo, Consulta y Docente; navegación y operaciones por función. |
| 2 | Panel adaptado a cada perfil, cifras calculadas, alertas y actividad reciente. |
| 3–4 | Directorio de instalaciones, vista interactiva por planta y fichas de recursos/actividad del espacio; croquis original como referencia. |
| 5–7 | Bienes individuales, ficha con código/serie/marca/modelo/color/descripción/valor, ubicación, responsable, estados, documentos e historial. |
| 8–9 | Traslados con origen/destino/motivo/operador/fecha y asignaciones/devoluciones conservadas. |
| 10–12 | QR del espacio, entrada/salida de docente, curso y responsabilidad temporal; bienes prestados vinculados a la actividad. |
| 13–18 | Dormitorio/habitación/litera/posición, disponibilidad visual, participación con alojamiento, lectura de QR, asignación/liberación e historial. |
| 19–21 | Cursos con fechas/cupos/estado/participantes y participación independiente en cada curso. Un curso cerrado conserva sus registros. |
| 22–28 | Armas relacionadas con estudiantes y cursos, identificación por serie, historial, QR y devolución confirmada por monitor o encargado. SAGP no sustituye el inventario propio del almacén. |
| 29–34 | Ficha por placa, conductor/licencia/documentos, salida/regreso/destino/motivo/kilometraje, incidencias y mantenimiento vinculado. |
| 35–38 | Reparaciones sobre bienes y camas; diagnóstico/trabajo/verificación/cierre; fotos antes/después y documentos vinculados a registros. |
| 39–40 | Plantillas XLSX para estudiantes, inventario y vehículos; lectura XLSX/CSV, revisión por fila, errores y confirmación atómica. |
| 41–46 | Fondos, proyectos, financiación, gastos/facturas/evidencias; año y necesidad planificada/extraordinaria; resumen de presupuesto y ejecución. |
| 47–48 | Avisos por función, alertas de fechas/pendientes y búsqueda de módulos disponibles por código/serie/placa/identidad/nombre. |
| 49–57 | Reportes actuales y por período de inventario, espacios, camas, cursos, armas, vehículos, asignaciones, reparaciones, gastos, movimientos y responsabilidad de espacios. |
| 58–59 | Historial en fichas y auditoría con operador/fecha/operación/cambios antes/después. |
| 60–64 | Recorridos de estudiante, docente, vehículo, bien y administración conectados entre pantallas. |
| 65–67 | Presentación institucional, objetivos compartidos y seis preguntas fundamentales, con información de ejemplo identificada como demostración. |

## Alcance y límites que deben quedar claros

- Es una demostración funcional local. La autenticación institucional, el almacenamiento compartido y las integraciones oficiales se harán cuando la institución valide el alcance y disponga de su BDD.
- Las cifras de ejemplo no afirman que exista esa cantidad de recursos en la institución. Los dos vehículos muestran el recorrido individual de una flota más amplia.
- La vista de instalaciones es esquemática y no administra infraestructura ni asegura una distribución medida del edificio.
- El QR es real y contiene únicamente tipo/ID del registro. La consulta mediante código funciona; la cámara depende del navegador, contexto seguro y permiso. No se verificó con una cámara física.
- Adjuntos de demo: PNG/JPG/PDF, 500 KB por archivo y aproximadamente 1,8 MB total. No se incluyen firmas electrónicas, gestión documental externa ni respaldo institucional.
- La importación admite XLSX (primera hoja, valores) y CSV UTF-8, hasta 200 registros y 10 MB. No admite XLS antiguo, macros ni fórmulas. Los identificadores deben conservarse como texto; un navegador sin descompresión compatible puede utilizar CSV.
- La gestión administrativa representa origen, asignación y ejecución. No certifica cumplimiento de un PAC, no procesa pagos y no es contabilidad completa.
- Los reportes históricos consultan eventos y períodos conservados. No reconstruyen automáticamente todos los atributos de todo el inventario en una fecha pasada.
- CSV, Word DOCX y Excel XLSX se descargan localmente. PDF utiliza un documento de impresión aislado. La entrega de descargas y la impresión final deben comprobarse también en el navegador habitual de la institución; no hay un generador PDF en servidor. Véase [DISENO_ADMINISTRADOR.md](DISENO_ADMINISTRADOR.md).

La aprobación de esta experiencia servirá como base para diseñar el sistema definitivo y confirmar las reglas institucionales.
