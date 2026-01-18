import XLSX from 'xlsx';

// Robust number sanitizer used server-side (mirrors frontend logic)
const sanitizeNumber = (raw) => {
  if (raw === null || raw === undefined) return null;
  let s = String(raw).trim();
  if (s === '') return null;
  s = s.replace(/[,\s]+/g, '');
  if (/^\(.+\)$/.test(s)) s = '-' + s.replace(/^\(|\)$/g, '');
  s = s.replace(/[$£€¥₩₹%]/g, '');
  s = s.replace(/[^0-9eE+\-\.]/g, '');
  if (s === '' || s === '+' || s === '-') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

// Choose header row
const detectHeaderRow = (rows, maxScan = 5) => {
  const scan = rows.slice(0, Math.min(maxScan, rows.length));
  let bestIdx = 0;
  let bestScore = -1;
  for (let i = 0; i < scan.length; i++) {
    const row = scan[i] || [];
    let score = 0;
    for (const cell of row) {
      if (cell === null || cell === undefined) continue;
      const s = String(cell).trim();
      if (s === '') continue;
      // prefer textual cells
      if (isNaN(Number(s))) score += 2; else score += 0.5;
    }
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return bestIdx;
};

const makeHeaderSafe = (h, idx) => {
  if (!h || String(h).trim() === '') return `Column ${idx+1}`;
  const s = String(h).trim();
  if (/^__EMPTY/i.test(s)) return `Column ${idx+1}`;
  return s;
};

function suggestChartType(data, labelKey, numericCandidates) {
  if (data.length < 2) return 'table';
  // Only suggest chart if labelKey is valid
  if (!labelKey || labelKey === '__EMPTY' || !numericCandidates || numericCandidates.length === 0) {
    return 'table';
  }
  // If only one numeric column, bar or pie
  if (numericCandidates.length === 1) {
    return 'bar';
  }
  // If multiple numeric columns
  if (numericCandidates.length > 1) {
    return 'line';
  }
  return 'table';
}

export function parseExcelAndSuggestCharts(fileOrBuffer) {
  // Accept either a file system path
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
    // Use sheet_to_json header:1 to get raw rows (arrays) so we can detect header row reliably
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });
    // Trim leading empty rows
    let firstNonEmpty = 0;
    while (firstNonEmpty < rows.length && rows[firstNonEmpty].every(c => c === null || c === undefined || String(c).trim() === '')) firstNonEmpty++;
    const trimmed = rows.slice(firstNonEmpty);
    if (trimmed.length === 0) {
      result.push({ sheetName, chartType: 'table', data: [], suggestedLabelKey: null, suggestedValueKey: null, suggestedValueKeys: [] });
      return;
    }

    const headerIdx = detectHeaderRow(trimmed, 5);
    const headerRow = trimmed[headerIdx] || [];
    const headers = headerRow.map((h, i) => makeHeaderSafe(h, i));

    // Build objects mapping header -> cell for rows after headerIdx
    const dataRows = [];
    for (let r = headerIdx + 1; r < trimmed.length; r++) {
      const row = trimmed[r] || [];
      // check if the row is empty
      const hasContent = row.some(c => c !== null && c !== undefined && String(c).trim() !== '');
      if (!hasContent) continue;
      const obj = {};
      for (let c = 0; c < headers.length; c++) {
        const key = headers[c] || `Column ${c+1}`;
        let val = row[c] === undefined ? null : row[c];
        // sanitize numbers
        const num = sanitizeNumber(val);
        if (num !== null) val = num;
        obj[key] = val;
      }
      dataRows.push(obj);
    }

    let finalData = dataRows;
    if (finalData.length === 0) {
      finalData = XLSX.utils.sheet_to_json(sheet, { defval: null });
    }

    // Determines numeric data
    const keys = finalData.length > 0 ? Object.keys(finalData[0]) : headers;
    const numericCandidates = (keys || []).filter(k => {
      return finalData.some(row => {
        const v = row[k];
        if (v === null || v === undefined || v === '') return false;
        if (typeof v === 'number') return !Number.isNaN(v);
        if (typeof v === 'string' && v.trim() !== '') return sanitizeNumber(v) !== null;
        return false;
      });
    });

    // Prefer common label/header names like 'name', 'id', 'label', or 'category' when available
    const preferredLabel = (keys || []).find(k => /\b(name|id|label|category)\b/i.test(String(k)));
    const labelKey = preferredLabel || (keys || []).find(k => !numericCandidates.includes(k)) || (keys && keys[0]) || null;
    const valueKey = numericCandidates.find(k => k !== labelKey) || numericCandidates[0] || (keys && keys[1]) || (keys && keys[0]) || null;

    const chartType = suggestChartType(finalData, labelKey, numericCandidates);

    result.push({ sheetName, chartType, data: finalData, suggestedLabelKey: labelKey, suggestedValueKey: valueKey, suggestedValueKeys: numericCandidates });
  });
  return result;
}