export interface InventoryTemplateColumn {
  campoPropuesto: string;
  etiqueta: string;
  tipo: 'calculado' | 'texto' | 'texto_opcional' | 'decimal_opcional' | 'seleccion';
}

export interface InventoryTemplate {
  templateId: string;
  columnas: InventoryTemplateColumn[];
  estados: string[];
}

export const INVENTORY_TEMPLATES: InventoryTemplate[] = [
  {
    templateId: 'aulas',
    estados: ['BUENO', 'REGULAR', 'MALO'],
    columnas: [
      { campoPropuesto: 'numeroFila', etiqueta: 'N.º', tipo: 'calculado' },
      { campoPropuesto: 'code', etiqueta: 'Control interno', tipo: 'texto' },
      { campoPropuesto: 'description', etiqueta: 'Descripción según factura', tipo: 'texto' },
      { campoPropuesto: 'color', etiqueta: 'Color', tipo: 'texto_opcional' },
      { campoPropuesto: 'costoUnitario', etiqueta: 'Costo unitario (L)', tipo: 'decimal_opcional' },
      { campoPropuesto: 'status', etiqueta: 'Estado', tipo: 'seleccion' },
      { campoPropuesto: 'observations', etiqueta: 'Observaciones', tipo: 'texto_opcional' }
    ]
  },
  {
    templateId: 'laboratorios',
    estados: ['BUENO', 'REGULAR', 'MALO'],
    columnas: [
      { campoPropuesto: 'numeroFila', etiqueta: 'N.º', tipo: 'calculado' },
      { campoPropuesto: 'code', etiqueta: 'Control interno', tipo: 'texto' },
      { campoPropuesto: 'description', etiqueta: 'Descripción según factura', tipo: 'texto' },
      { campoPropuesto: 'color', etiqueta: 'Color', tipo: 'texto_opcional' },
      { campoPropuesto: 'costoUnitario', etiqueta: 'Costo unitario (L)', tipo: 'decimal_opcional' },
      { campoPropuesto: 'status', etiqueta: 'Estado', tipo: 'seleccion' },
      { campoPropuesto: 'observations', etiqueta: 'Observaciones', tipo: 'texto_opcional' }
    ]
  },
  {
    templateId: 'dormitorios',
    estados: ['BUENO', 'REGULAR', 'MALO'],
    columnas: [
      { campoPropuesto: 'numeroFila', etiqueta: 'N.º', tipo: 'calculado' },
      { campoPropuesto: 'code', etiqueta: 'Control interno', tipo: 'texto' },
      { campoPropuesto: 'description', etiqueta: 'Descripción según factura', tipo: 'texto' },
      { campoPropuesto: 'color', etiqueta: 'Color', tipo: 'texto_opcional' },
      { campoPropuesto: 'costoUnitario', etiqueta: 'Costo unitario (L)', tipo: 'decimal_opcional' },
      { campoPropuesto: 'status', etiqueta: 'Estado', tipo: 'seleccion' },
      { campoPropuesto: 'observations', etiqueta: 'Observaciones', tipo: 'texto_opcional' }
    ]
  },
  {
    templateId: 'oficinas',
    estados: ['BUENO', 'REGULAR', 'MALO'],
    columnas: [
      { campoPropuesto: 'numeroFila', etiqueta: 'N.º', tipo: 'calculado' },
      { campoPropuesto: 'code', etiqueta: 'Control interno', tipo: 'texto' },
      { campoPropuesto: 'description', etiqueta: 'Descripción según factura', tipo: 'texto' },
      { campoPropuesto: 'serial', etiqueta: 'Serie', tipo: 'texto_opcional' },
      { campoPropuesto: 'color', etiqueta: 'Color', tipo: 'texto_opcional' },
      { campoPropuesto: 'costoUnitario', etiqueta: 'Costo unitario (L)', tipo: 'decimal_opcional' },
      { campoPropuesto: 'status', etiqueta: 'Estado', tipo: 'seleccion' },
      { campoPropuesto: 'tipoDocumentoValuacion', etiqueta: 'Tipo de documento (valuación)', tipo: 'texto_opcional' },
      { campoPropuesto: 'observations', etiqueta: 'Observaciones', tipo: 'texto_opcional' }
    ]
  },
  {
    templateId: 'areas_comunes',
    estados: ['BUENO', 'REGULAR', 'MALO'],
    columnas: [
      { campoPropuesto: 'numeroFila', etiqueta: 'N.º', tipo: 'calculado' },
      { campoPropuesto: 'code', etiqueta: 'Control interno', tipo: 'texto' },
      { campoPropuesto: 'description', etiqueta: 'Descripción según factura', tipo: 'texto' },
      { campoPropuesto: 'serial', etiqueta: 'Serie', tipo: 'texto_opcional' },
      { campoPropuesto: 'color', etiqueta: 'Color', tipo: 'texto_opcional' },
      { campoPropuesto: 'costoUnitario', etiqueta: 'Costo unitario (L)', tipo: 'decimal_opcional' },
      { campoPropuesto: 'status', etiqueta: 'Estado', tipo: 'seleccion' },
      { campoPropuesto: 'observations', etiqueta: 'Observaciones', tipo: 'texto_opcional' }
    ]
  }
];

export const TEMPLATE_MAPPINGS: Record<string, string> = {
  'aula_1': 'aulas',
  'aula_2': 'aulas',
  'aula_3': 'aulas',
  'balistica': 'laboratorios',
  'documentologia': 'laboratorios',
  'dactiloscopia': 'laboratorios',
  'dorm_1': 'dormitorios',
  'dorm_2': 'dormitorios',
  'dorm_3': 'dormitorios',
  'dorm_4': 'dormitorios',
  'dorm_muj': 'dormitorios',
  'dorm_damas': 'dormitorios',
  'dorm_inst': 'dormitorios',
  'auditorio': 'areas_comunes',
  'biblioteca': 'areas_comunes',
  'logistica': 'oficinas',
  'generador': 'areas_comunes',
  'gimnasio': 'areas_comunes',
  'parqueo': 'areas_comunes',
  'ciudadela': 'areas_comunes',
  'sig': 'oficinas',
  'ext_dept_acad': 'oficinas',
  'ga': 'oficinas',
  'gc': 'oficinas',
  'gt': 'oficinas',
  'admin_est': 'oficinas',
  'rh': 'oficinas',
  'dept_acad': 'oficinas',
  'direccion': 'oficinas',
  'subdirector': 'oficinas',
  'sala': 'areas_comunes',
  'cocineta': 'areas_comunes', // "Cocina EIC"
};

export const DECLARACION_RESPONSABILIDAD = "Yo {{encargado}}, con Tarjeta de Identidad No. {{numeroIdentidad}}, por este medio HAGO CONSTAR, ante las autoridades competentes que los Bienes Patrimoniales descritos en este formulario, están bajo mi uso, por lo cual soy responsable de su cuido y conservación, los presentaré al ser requeridos por la autoridad competente. En caso que resulte responsable de bienes faltantes o dañados y no haber respondido en valor metálico de los mismos, autorizo que se deduzca de mi sueldo la cantidad correspondiente al bien dañado y perdido.";

export const ENCABEZADO_PATRIMONIAL = [
  "REPÚBLICA DE HONDURAS",
  "SECRETARÍA DE FINANZAS",
  "Contaduría General de la República",
  "Formulario para el Ingreso de los Bienes al Nuevo Sistema de Bienes Patrimoniales"
];
