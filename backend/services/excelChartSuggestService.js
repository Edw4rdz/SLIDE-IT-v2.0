import XLSX from 'xlsx';

function suggestChartType(data, labelKey, numericCandidates) {
  if (data.length < 2) return 'table';
  // Only suggest chart if labelKey is valid and at least one numeric value column exists
  if (!labelKey || labelKey === '__EMPTY' || !numericCandidates || numericCandidates.length === 0) {
    return 'table';
  }
  // If only one numeric column, bar or pie is best
  if (numericCandidates.length === 1) {
    return 'bar';
  }
  // If multiple numeric columns, line chart is best
  if (numericCandidates.length > 1) {
    return 'line';
  }
  return 'table';
}

export function parseExcelAndSuggestCharts(fileOrBuffer) {
  // Accept either a file system path (string) or a Buffer (from multer uploads)
  let workbook;
  if (typeof fileOrBuffer === 'string') {
    workbook = XLSX.readFile(fileOrBuffer);
  } else {
    // Assume buffer-like
    workbook = XLSX.read(fileOrBuffer, { type: 'buffer' });
  }
  const result = [];
  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    let data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    // Remove empty rows and rows with only formatting (no numeric or string data)
    data = data.filter(row => {
      const values = Object.values(row);
      // At least one cell must be non-empty and not just formatting
      return values.some(v => (typeof v === 'number' && !Number.isNaN(v)) || (typeof v === 'string' && v.trim() !== ''));
    });

    // If the first row is a header/title (all strings, no numbers), skip it
    if (data.length > 1) {
      const firstRow = data[0];
      const hasNumeric = Object.values(firstRow).some(v => typeof v === 'number' && !Number.isNaN(v));
      const allStrings = Object.values(firstRow).every(v => typeof v === 'string');
      if (!hasNumeric && allStrings) {
        data = data.slice(1);
      }
    }

    // Declare keys before use
    let labelKey = null;
    let valueKey = null;
    let numericCandidates = [];

    if (data && data.length > 0) {
      const keys = Object.keys(data[0]);
      // Detect numeric columns by sampling rows
      numericCandidates = keys.filter(k => {
        // If at least one row for that key is numeric (or convertible to number), it's numeric
        return data.some(row => {
          const v = row[k];
          if (v === null || v === undefined || v === '') return false;
          if (typeof v === 'number') return !Number.isNaN(v);
          if (typeof v === 'string' && v.trim() !== '') return !Number.isNaN(Number(v.replace(/[^0-9.\-]/g, '')));
          return false;
        });
      });

      // labelKey: prefer first non-numeric key, fallback to first key
      labelKey = keys.find(k => !numericCandidates.includes(k)) || keys[0] || null;
      // valueKey: prefer numeric candidate not equal to labelKey; fallback to first numeric candidate or second key
      valueKey = numericCandidates.find(k => k !== labelKey) || numericCandidates[0] || keys[1] || keys[0] || null;
      // If no valueKey found, fallback to first key with numeric data
      if (!valueKey && numericCandidates.length > 0) valueKey = numericCandidates[0];
    }

    const chartType = suggestChartType(data, labelKey, numericCandidates);

    result.push({ sheetName, chartType, data, suggestedLabelKey: labelKey, suggestedValueKey: valueKey, suggestedValueKeys: numericCandidates });
  });
  return result;
}