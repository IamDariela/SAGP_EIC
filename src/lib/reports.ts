import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Document, 
  Packer, 
  Paragraph, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  TextRun, 
  ImageRun, 
  AlignmentType, 
  Header as WordHeader, 
  Footer as WordFooter, 
  PageNumber, 
  PageOrientation,
  VerticalAlign,
  BorderStyle,
  TableLayoutType
} from 'docx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export type ReportFormat = 'pdf' | 'docx' | 'xlsx';

interface ReportOptions {
  title: string;
  subtitle?: string;
  filename: string;
  columns: { header: string; dataKey: string }[];
  data: any[];
  userName: string;
  filters?: Record<string, string>;
  hideFilters?: boolean;
  summary?: Record<string, string | number>;
  orientation?: 'auto' | 'p' | 'l';
  format?: ReportFormat;
  isPatrimonial?: boolean;
  patrimonialData?: {
    institucion: string;
    edificio: string;
    planta: string;
    ubicacion: string;
    encargado: string;
    identidad: string;
    telefono: string;
    dependencia: string;
    declaracion: string;
  };
}

/**
 * Helper to get current time in Tegucigalpa
 */
const getTegucigalpaTime = () => {
  return new Intl.DateTimeFormat('es-HN', {
    timeZone: 'America/Tegucigalpa',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(new Date());
};

const getTegucigalpaTimeForFilename = () => {
  const parts = new Intl.DateTimeFormat('es-HN', {
    timeZone: 'America/Tegucigalpa',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(new Date());

  const get = (type: string) => parts.find(p => p.type === type)?.value;
  return `${get('year')}${get('month')}${get('day')}_${get('hour')}${get('minute')}`;
};

/**
 * Helper to get an image as a base64 string
 */
const getLogo = async (path: string): Promise<string | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = path;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } else {
        resolve(null);
      }
    };
    img.onerror = () => {
      console.warn(`[Report] No se pudo cargar el logo: ${path}`);
      resolve(null);
    };
  });
};

/**
 * Main function to generate report in any format
 */
export const generateReport = async (options: ReportOptions) => {
  const format = options.format || 'pdf';
  
  switch (format) {
    case 'pdf':
      return await generatePDF(options);
    case 'docx':
      return await generateWord(options);
    case 'xlsx':
      return await generateExcel(options);
    default:
      throw new Error(`Formato no soportado: ${format}`);
  }
};

/**
 * WORD EXPORT (.docx)
 */
export const generateWord = async (options: ReportOptions) => {
  console.log(`[Word] Iniciando generación: ${options.title}`);

  try {
    const [logoUnph, logoPolicia, logoEic] = await Promise.all([
      getLogo('/assets/logo_unph.png'),
      getLogo('/assets/logo_policia.png'),
      getLogo('/assets/logo_eic.png')
    ]);

    const decodeBase64 = (dataUrl: string | null) => {
      if (!dataUrl) return null;
      const base64 = dataUrl.split(',')[1];
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    };

    const logoUnphData = decodeBase64(logoUnph);
    const logoPoliciaData = decodeBase64(logoPolicia);
    const logoEicData = decodeBase64(logoEic);

    let orientation: any = PageOrientation.PORTRAIT;
    if (options.orientation === 'l' || (options.orientation === 'auto' && options.columns.length > 7)) {
      orientation = PageOrientation.LANDSCAPE;
    }

    const azul = "042B60";

    // Header Content
    const headerChildren = [];
    
    if (options.isPatrimonial && options.patrimonialData) {
      const d = options.patrimonialData;
      headerChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "REPÚBLICA DE HONDURAS", bold: true, size: 20 }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "SECRETARÍA DE FINANZAS", bold: true, size: 20 }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "Contaduría General de la República", bold: true, size: 20 }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "Formulario para el Ingreso de los Bienes al Nuevo Sistema de Bienes Patrimoniales", bold: true, size: 20 }),
          ],
        }),
        new Paragraph({ text: "" }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
            insideHorizontal: { style: BorderStyle.NONE },
            insideVertical: { style: BorderStyle.NONE },
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({ children: [new TextRun({ text: "INSTITUCIÓN: ", bold: true, size: 16 }), new TextRun({ text: d.institucion, size: 16 })] }),
                    new Paragraph({ children: [new TextRun({ text: "EDIFICIO: ", bold: true, size: 16 }), new TextRun({ text: d.edificio, size: 16 })] }),
                    new Paragraph({ children: [new TextRun({ text: "UBICACIÓN: ", bold: true, size: 16 }), new TextRun({ text: d.ubicacion, size: 16 })] }),
                  ],
                }),
                new TableCell({
                  children: [
                    new Paragraph({ children: [new TextRun({ text: "DEPENDENCIA: ", bold: true, size: 16 }), new TextRun({ text: d.dependencia, size: 16 })] }),
                    new Paragraph({ children: [new TextRun({ text: "PLANTA: ", bold: true, size: 16 }), new TextRun({ text: d.planta, size: 16 })] }),
                  ],
                }),
              ],
            }),
          ],
        }),
        new Paragraph({ text: "" }),
        new Paragraph({ children: [new TextRun({ text: "DATOS DEL RESPONSABLE:", bold: true, size: 18 })] }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
            insideHorizontal: { style: BorderStyle.NONE },
            insideVertical: { style: BorderStyle.NONE },
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({ children: [new TextRun({ text: "NOMBRE: ", bold: true, size: 16 }), new TextRun({ text: d.encargado, size: 16 })] }),
                    new Paragraph({ children: [new TextRun({ text: "TELÉFONO: ", bold: true, size: 16 }), new TextRun({ text: d.telefono, size: 16 })] }),
                  ],
                }),
                new TableCell({
                  children: [
                    new Paragraph({ children: [new TextRun({ text: "IDENTIDAD: ", bold: true, size: 16 }), new TextRun({ text: d.identidad, size: 16 })] }),
                  ],
                }),
              ],
            }),
          ],
        })
      );
    } else {
      const logoTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE },
          bottom: { style: BorderStyle.NONE },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE },
          insideHorizontal: { style: BorderStyle.NONE },
          insideVertical: { style: BorderStyle.NONE },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 33, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.LEFT,
                    children: logoUnphData ? [new ImageRun({ data: logoUnphData, transformation: { width: 50, height: 50 }, type: 'png' })] : [],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 34, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: logoPoliciaData ? [new ImageRun({ data: logoPoliciaData, transformation: { width: 43, height: 50 }, type: 'png' })] : [],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 33, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: logoEicData ? [new ImageRun({ data: logoEicData, transformation: { width: 50, height: 50 }, type: 'png' })] : [],
                  }),
                ],
              }),
            ],
          }),
        ],
      });

      headerChildren.push(
        logoTable,
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "República de Honduras", size: 18 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Secretaría de Seguridad", size: 18 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Dirección General de Policía Nacional", size: 18 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Universidad Nacional de la Policía de Honduras", size: 18 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "ESCUELA DE INVESTIGACIÓN CRIMINAL", bold: true, size: 22, color: azul })],
        })
      );
    }

    const docChildren: (Paragraph | Table)[] = [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 400 },
        children: [
          new TextRun({ text: options.title.toUpperCase(), bold: true, size: 24, color: azul }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "FECHA GENERACIÓN: ", bold: true, size: 18 }),
          new TextRun({ text: getTegucigalpaTime(), size: 18 }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "GENERADO POR: ", bold: true, size: 18 }),
          new TextRun({ text: options.userName, size: 18 }),
        ],
      }),
    ];

    if (options.subtitle) {
      docChildren.push(new Paragraph({
        children: [
          new TextRun({ text: "PERÍODO: ", bold: true, size: 18 }),
          new TextRun({ text: options.subtitle.replace('Período: ', '').replace('Corte al ', ''), size: 18 }),
        ],
      }));
    }

    if (options.summary) {
      Object.entries(options.summary).forEach(([key, value]) => {
        docChildren.push(new Paragraph({
          children: [
            new TextRun({ text: `${key}: `, bold: true, size: 18 }),
            new TextRun({ text: String(value), size: 18 }),
          ],
        }));
      });
    }

    // Add Table
    const tableRows = [
      new TableRow({
        tableHeader: true,
        children: options.columns.map(col => new TableCell({
          shading: { fill: azul },
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: col.header.toUpperCase(), bold: true, color: "FFFFFF", size: 16 })],
          })],
        })),
      }),
    ];

    options.data.forEach((row, i) => {
      tableRows.push(new TableRow({
        children: options.columns.map(col => new TableCell({
          shading: { fill: i % 2 === 0 ? "FFFFFF" : "F8FAFC" },
          verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph({
            alignment: col.dataKey === 'costoUnitario' ? AlignmentType.RIGHT : AlignmentType.LEFT,
            children: [new TextRun({ text: String(row[col.dataKey] || ''), size: 16 })],
          })],
        })),
      }));
    });

    docChildren.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      rows: tableRows,
    }));

    if (options.isPatrimonial && options.patrimonialData) {
      const d = options.patrimonialData;
      const declText = d.declaracion
        .replace('{{encargado}}', d.encargado)
        .replace('{{numeroIdentidad}}', d.identidad);

      docChildren.push(
        new Paragraph({ text: "", spacing: { before: 400 } }),
        new Paragraph({
          children: [new TextRun({ text: declText, italics: true, size: 16 })],
        }),
        new Paragraph({ text: "", spacing: { before: 800 } }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
            insideHorizontal: { style: BorderStyle.NONE },
            insideVertical: { style: BorderStyle.NONE },
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      border: { top: { style: BorderStyle.SINGLE, size: 1, color: "000000" } },
                      children: [new TextRun({ text: "FIRMA RESPONSABLE", bold: true, size: 16 })],
                    }),
                  ],
                }),
                new TableCell({ children: [new Paragraph({ text: "" })] }),
                new TableCell({
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      border: { top: { style: BorderStyle.SINGLE, size: 1, color: "000000" } },
                      children: [new TextRun({ text: "CONTROL PATRIMONIAL", bold: true, size: 16 })],
                    }),
                  ],
                }),
              ],
            }),
          ],
        })
      );
    }

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            size: {
              orientation: orientation,
            },
            margin: {
              top: 1134, // 20mm in twips
              right: 1134,
              bottom: 1134,
              left: 1134,
            },
          },
        },
        headers: {
          default: new WordHeader({
            children: headerChildren,
          }),
        },
        footers: {
          default: new WordFooter({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "POLICÍA NACIONAL DE HONDURAS", bold: true, size: 16, color: azul }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "Página ", size: 14 }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 14 }),
                  new TextRun({ text: " de ", size: 14 }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 14 }),
                ],
              }),
            ],
          }),
        },
        children: docChildren,
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${options.filename}_${getTegucigalpaTimeForFilename()}.docx`);
    return true;
  } catch (error) {
    console.error('[Word] Error:', error);
    alert('Error al generar el documento Word');
    throw error;
  }
};

/**
 * EXCEL EXPORT (.xlsx)
 */
export const generateExcel = async (options: ReportOptions) => {
  console.log(`[Excel] Iniciando generación: ${options.title}`);

  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte');

    const azul = '042B60';

    // Load all 3 institutional logos
    const [logoUnph, logoPolicia, logoEic] = await Promise.all([
      getLogo('/assets/logo_unph.png'),
      getLogo('/assets/logo_policia.png'),
      getLogo('/assets/logo_eic.png')
    ]);

    // Set Column Widths
    worksheet.columns = options.columns.map(col => ({
      header: col.header.toUpperCase(),
      key: col.dataKey,
      width: col.header.length > 20 ? col.header.length : 20
    }));

    // Insert 3 institutional logos (UNPH left | Policia center | EIC right)
    if (logoUnph) {
      try {
        const unphId = workbook.addImage({
          base64: logoUnph,
          extension: 'png'
        });
        worksheet.addImage(unphId, {
          tl: { col: 0.15, row: 0.2 },
          ext: { width: 56, height: 56 }
        });
      } catch (e) {
        console.warn('No se pudo insertar logo UNPH en Excel:', e);
      }
    }

    if (logoPolicia) {
      try {
        const policiaId = workbook.addImage({
          base64: logoPolicia,
          extension: 'png'
        });
        const midCol = Math.max(1, Math.floor((options.columns.length - 1) / 2));
        worksheet.addImage(policiaId, {
          tl: { col: midCol + 0.3, row: 0.2 },
          ext: { width: 48, height: 56 }
        });
      } catch (e) {
        console.warn('No se pudo insertar logo Policía en Excel:', e);
      }
    }

    if (logoEic) {
      try {
        const eicId = workbook.addImage({
          base64: logoEic,
          extension: 'png'
        });
        const lastCol = Math.max(2, options.columns.length - 1);
        worksheet.addImage(eicId, {
          tl: { col: lastCol + 0.15, row: 0.2 },
          ext: { width: 56, height: 56 }
        });
      } catch (e) {
        console.warn('No se pudo insertar logo EIC en Excel:', e);
      }
    }

    // Set row heights for visual balance
    worksheet.getRow(1).height = 20;
    worksheet.getRow(2).height = 18;
    worksheet.getRow(3).height = 22;

    const maxColLetter = String.fromCharCode(65 + Math.max(6, options.columns.length - 1));

    // Add Institutional Header (Rows 1-6)
    worksheet.mergeCells(`A1:${maxColLetter}1`);
    worksheet.getCell('A1').value = 'REPÚBLICA DE HONDURAS';
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    worksheet.mergeCells(`A2:${maxColLetter}2`);
    worksheet.getCell('A2').value = 'SECRETARÍA DE SEGURIDAD';
    worksheet.getCell('A2').font = { bold: true, size: 12 };
    worksheet.getCell('A2').alignment = { horizontal: 'center' };

    worksheet.mergeCells(`A3:${maxColLetter}3`);
    worksheet.getCell('A3').value = 'ESCUELA DE INVESTIGACIÓN CRIMINAL';
    worksheet.getCell('A3').font = { bold: true, size: 14, color: { argb: azul } };
    worksheet.getCell('A3').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A5:C5');
    worksheet.getCell('A5').value = `REPORTE: ${options.title.toUpperCase()}`;
    worksheet.getCell('A5').font = { bold: true };

    worksheet.mergeCells('A6:C6');
    worksheet.getCell('A6').value = `GENERADO POR: ${options.userName}`;
    
    worksheet.mergeCells('E6:G6');
    worksheet.getCell('E6').value = `FECHA: ${getTegucigalpaTime()}`;
    worksheet.getCell('E6').alignment = { horizontal: 'right' };

    if (options.subtitle) {
      worksheet.mergeCells('A7:G7');
      worksheet.getCell('A7').value = options.subtitle;
      worksheet.getCell('A7').font = { italic: true };
    }

    // Header Row for Table
    const headerRowNumber = 9;
    const headerRow = worksheet.getRow(headerRowNumber);
    headerRow.values = options.columns.map(c => c.header.toUpperCase());
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: azul },
      };
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.alignment = { horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Add Data
    options.data.forEach((item) => {
      const row = worksheet.addRow(options.columns.map(col => item[col.dataKey]));
      
      row.eachCell((cell, colNumber) => {
        const colDef = options.columns[colNumber - 1];
        
        // Format Lempiras
        if (colDef.dataKey === 'costoUnitario' && cell.value) {
          const val = typeof cell.value === 'string' ? parseFloat(cell.value.replace('L. ', '').replace(',', '')) : cell.value;
          cell.value = val;
          cell.numFmt = '"L." #,##0.00';
          cell.alignment = { horizontal: 'right' };
        }

        // Force text for IDs/Codes to keep leading zeros
        if (['code', 'controlInterno', 'identification', 'serial'].includes(colDef.dataKey)) {
          cell.numFmt = '@';
        }

        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // Auto-filter and Freeze Panes
    worksheet.autoFilter = {
      from: { row: headerRowNumber, column: 1 },
      to: { row: headerRowNumber, column: options.columns.length }
    };
    worksheet.views = [{ state: 'frozen', ySplit: headerRowNumber }];

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `${options.filename}_${getTegucigalpaTimeForFilename()}.xlsx`);
    return true;

  } catch (error) {
    console.error('[Excel] Error:', error);
    alert('Error al generar el archivo Excel');
    throw error;
  }
};

export const generatePDF = async (options: ReportOptions) => {
  console.log(`[PDF] Iniciando generación: ${options.title}`);
  
  try {
    // Determine orientation
    let finalOrientation: 'p' | 'l' = options.orientation === 'l' ? 'l' : 'p';
    if (options.orientation === 'auto') {
      finalOrientation = options.columns.length > 7 ? 'l' : 'p';
    }

    const doc = new jsPDF({
      orientation: finalOrientation,
      unit: 'mm',
      format: 'letter'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20; 
    const azul: [number, number, number] = [4, 43, 96];
    const amarillo = [255, 237, 0];

    // Load all 3 logos once
    const [logoUnph, logoPolicia, logoEic] = await Promise.all([
      getLogo('/assets/logo_unph.png'),
      getLogo('/assets/logo_policia.png'),
      getLogo('/assets/logo_eic.png')
    ]);

    const drawHeader = (pdf: jsPDF) => {
      if (options.isPatrimonial && options.patrimonialData) {
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        
        let textY = 15;
        const pHeader = [
          "REPÚBLICA DE HONDURAS",
          "SECRETARÍA DE FINANZAS",
          "Contaduría General de la República",
          "Formulario para el Ingreso de los Bienes al Nuevo Sistema de Bienes Patrimoniales"
        ];
        
        pHeader.forEach(line => {
          pdf.text(line, pageWidth / 2, textY, { align: 'center' });
          textY += 5;
        });

        textY += 5;
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        
        const { patrimonialData: d } = options;
        const col1X = margin;
        const col2X = pageWidth / 2 + 5;
        
        pdf.setFont('helvetica', 'bold');
        pdf.text('INSTITUCIÓN:', col1X, textY);
        pdf.setFont('helvetica', 'normal');
        pdf.text(d.institucion, col1X + 25, textY);
        
        pdf.setFont('helvetica', 'bold');
        pdf.text('DEPENDENCIA:', col2X, textY);
        pdf.setFont('helvetica', 'normal');
        pdf.text(d.dependencia, col2X + 25, textY);
        
        textY += 4.5;
        pdf.setFont('helvetica', 'bold');
        pdf.text('EDIFICIO:', col1X, textY);
        pdf.setFont('helvetica', 'normal');
        pdf.text(d.edificio, col1X + 25, textY);
        
        pdf.setFont('helvetica', 'bold');
        pdf.text('PLANTA:', col2X, textY);
        pdf.setFont('helvetica', 'normal');
        pdf.text(d.planta, col2X + 25, textY);

        textY += 4.5;
        pdf.setFont('helvetica', 'bold');
        pdf.text('UBICACIÓN:', col1X, textY);
        pdf.setFont('helvetica', 'normal');
        pdf.text(d.ubicacion, col1X + 25, textY);
        
        textY += 6;
        pdf.setFont('helvetica', 'bold');
        pdf.text('DATOS DEL RESPONSABLE:', col1X, textY);
        textY += 4.5;
        
        pdf.text('NOMBRE:', col1X, textY);
        pdf.setFont('helvetica', 'normal');
        pdf.text(d.encargado, col1X + 20, textY);
        
        pdf.setFont('helvetica', 'bold');
        pdf.text('IDENTIDAD:', col2X, textY);
        pdf.setFont('helvetica', 'normal');
        pdf.text(d.identidad, col2X + 20, textY);
        
        textY += 4.5;
        pdf.setFont('helvetica', 'bold');
        pdf.text('TELÉFONO:', col1X, textY);
        pdf.setFont('helvetica', 'normal');
        pdf.text(d.telefono, col1X + 20, textY);

        return textY + 8;
      }

      pdf.setFillColor(azul[0], azul[1], azul[2]);
      pdf.rect(0, 0, pageWidth, 28, 'F');
      pdf.ellipse(pageWidth / 2, 28, pageWidth / 1.5, 8, 'F');
      pdf.setFillColor(amarillo[0], amarillo[1], amarillo[2]);
      pdf.rect(0, 31, pageWidth, 1.5, 'F');

      const logoHeight = 22;
      const logoY = 4.5;
      // UNPH: 1:1, width 22, height 22
      if (logoUnph) pdf.addImage(logoUnph, 'PNG', margin, logoY, 22, logoHeight);
      // Policia: shield ratio ~0.85, width 18.7, height 22, centered
      if (logoPolicia) pdf.addImage(logoPolicia, 'PNG', (pageWidth / 2) - 9.35, logoY, 18.7, logoHeight);
      // EIC: 1:1, width 22, height 22
      if (logoEic) pdf.addImage(logoEic, 'PNG', pageWidth - margin - 22, logoY, 22, logoHeight);

      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      let textY = 40;
      
      const lines = [
        'República de Honduras',
        'Secretaría de Seguridad',
        'Dirección General de Policía Nacional',
        'Universidad Nacional de la Policía de Honduras'
      ];
      
      lines.forEach(line => {
        pdf.text(line, pageWidth / 2, textY, { align: 'center' });
        textY += 4.5;
      });

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text('ESCUELA DE INVESTIGACIÓN CRIMINAL', pageWidth / 2, textY, { align: 'center' });
      
      return textY + 10;
    };

    const drawFooter = (pdf: jsPDF, pageNum: number, totalPages: number) => {
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.setFont('helvetica', 'normal');

      const footerY = pageHeight - 15;
      const lineWidth = (pageWidth - 80) / 2;
      pdf.setDrawColor(azul[0], azul[1], azul[2]);
      pdf.setLineWidth(0.5);
      pdf.line(margin, footerY - 1, margin + lineWidth, footerY - 1);
      pdf.line(pageWidth - margin - lineWidth, footerY - 1, pageWidth - margin, footerY - 1);

      pdf.setFont('helvetica', 'bold');
      pdf.text('POLICÍA NACIONAL DE HONDURAS', pageWidth / 2, footerY, { align: 'center' });
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.text('Comayagua, Comayagua, Colonia San Miguel No.2; Complejo Educativo San Miguel', pageWidth / 2, footerY + 4, { align: 'center' });
      pdf.text('Email: eic@policianacional.gob.hn', pageWidth / 2, footerY + 8, { align: 'center' });
      pdf.text(`Página ${pageNum} de ${totalPages}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
    };

    let currentY = drawHeader(doc);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(azul[0], azul[1], azul[2]);
    doc.text(options.title.toUpperCase(), pageWidth / 2, currentY, { align: 'center' });
    currentY += 8;

    doc.setTextColor(60, 60, 60);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('FECHA GENERACIÓN:', margin, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(getTegucigalpaTime(), margin + 35, currentY);
    currentY += 5;
    
    doc.setFont('helvetica', 'bold');
    doc.text('GENERADO POR:', margin, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(options.userName, margin + 35, currentY);
    currentY += 8;

    if (options.subtitle) {
      doc.setFont('helvetica', 'bold');
      doc.text('PERÍODO:', margin, currentY);
      doc.setFont('helvetica', 'normal');
      doc.text(options.subtitle.replace('Período: ', '').replace('Corte al ', ''), margin + 35, currentY);
      currentY += 8;
    }

    if (options.summary) {
      Object.entries(options.summary).forEach(([key, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(`${key}:`, margin, currentY);
        doc.setFont('helvetica', 'normal');
        doc.text(String(value), margin + 35, currentY);
        currentY += 5;
      });
      currentY += 5;
    }

    autoTable(doc, {
      startY: currentY,
      head: [options.columns.map(col => col.header.toUpperCase())],
      body: options.data.map(row => options.columns.map(col => String(row[col.dataKey] || ''))),
      margin: { top: 75, left: margin, right: margin, bottom: 30 },
      styles: { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' },
      headStyles: { fillColor: azul, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          drawHeader(doc);
        }
      }
    });

    if (options.isPatrimonial && options.patrimonialData) {
      const finalY = (doc as any).lastAutoTable.finalY + 15;
      const declText = options.patrimonialData.declaracion
        .replace('{{encargado}}', options.patrimonialData.encargado)
        .replace('{{numeroIdentidad}}', options.patrimonialData.identidad);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text(doc.splitTextToSize(declText, pageWidth - (margin * 2)), margin, finalY);
      const sigY = finalY + 30;
      doc.setDrawColor(0);
      doc.line(margin, sigY, margin + 60, sigY);
      doc.line(pageWidth - margin - 60, sigY, pageWidth - margin, sigY);
      doc.setFont('helvetica', 'bold');
      doc.text('FIRMA RESPONSABLE', margin + 30, sigY + 5, { align: 'center' });
      doc.text('CONTROL PATRIMONIAL', pageWidth - margin - 30, sigY + 5, { align: 'center' });
    }

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      drawFooter(doc, i, totalPages);
    }

    saveAs(doc.output('blob'), `${options.filename}_${getTegucigalpaTimeForFilename()}.pdf`);
    return true;
  } catch (error) {
    console.error('[PDF] Error:', error);
    alert('Error al generar el PDF');
    throw error;
  }
};
