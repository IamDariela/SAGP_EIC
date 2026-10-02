# Datos artificiales de verificación

- `import-personas.xlsx`: generado con openpyxl, comprimido, con una fila válida y otra de DNI duplicado. Se utiliza para verificar lectura y revisión; no contiene registros oficiales.
- `qr-reference.json`: matriz independiente generada con ReportLab, versión 4-L, modo byte y máscara 0. La prueba compara todos los módulos del QR generado por SAGP.
- `evidence.png`: imagen artificial con texto de prueba para revisar adjuntos sin utilizar documentos institucionales.

Las bibliotecas utilizadas para preparar las referencias ya estaban disponibles en el entorno. Ejecutar las pruebas solo requiere Node y PHP; no importa esas bibliotecas ni instala dependencias.
