/** CSV for Spanish Excel: UTF-8 BOM, semicolon delimiter, quoted cells and neutralized formulas. */
export function buildCsv(headers, rows) {
  const cell = value => {
    let result = String(value ?? '');
    if (/^[=+@\-\t\r]/.test(result)) result = "'" + result;
    return '"' + result.replace(/"/g, '""') + '"';
  };
  return '\uFEFF' + [headers, ...rows].map(row => row.map(cell).join(';')).join('\r\n');
}
