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
    const data = XLSX.utils.sheet_to_json(sheet);
    // Declare keys before use
    let labelKey = null;
    let valueKey = null;
    let numericCandidates = [];

    if (data && data.length > 0) {
      const keys = Object.keys(data[0]);
      // Detect numeric columns by sampling rows
      numericCandidates = keys.filter(k => {
        // If every row for that key is numeric (or convertible to number), it's numeric
        return data.every(row => {
          const v = row[k];
          if (v === null || v === undefined) return false;
          // number or numeric string
          if (typeof v === 'number') return true;
          if (typeof v === 'string' && v.trim() !== '') return !Number.isNaN(Number(v.replace(/,/g, '')));
          return false;
        });
      });

      // labelKey: prefer first non-numeric key, fallback to first key
      labelKey = keys.find(k => !numericCandidates.includes(k)) || keys[0] || null;
      // valueKey: prefer numeric candidate not equal to labelKey; fallback to first numeric candidate or second key
      valueKey = numericCandidates.find(k => k !== labelKey) || numericCandidates[0] || keys[1] || keys[0] || null;
    }

    const chartType = suggestChartType(data, labelKey, numericCandidates);

    if (data && data.length > 0) {
      const keys = Object.keys(data[0]);
      // Detect numeric columns by sampling rows
      numericCandidates = keys.filter(k => {
        // If every row for that key is numeric (or convertible to number), it's numeric
        return data.every(row => {
          const v = row[k];
          if (v === null || v === undefined) return false;
          // number or numeric string
          if (typeof v === 'number') return true;
          if (typeof v === 'string' && v.trim() !== '') return !Number.isNaN(Number(v.replace(/,/g, '')));
          return false;
        });
      });

      // labelKey: prefer first non-numeric key, fallback to first key
      labelKey = keys.find(k => !numericCandidates.includes(k)) || keys[0] || null;
      // valueKey: prefer numeric candidate not equal to labelKey; fallback to first numeric candidate or second key
      valueKey = numericCandidates.find(k => k !== labelKey) || numericCandidates[0] || keys[1] || keys[0] || null;
    }

    result.push({ sheetName, chartType, data, suggestedLabelKey: labelKey, suggestedValueKey: valueKey, suggestedValueKeys: numericCandidates });
  });
  return result;
}